import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, LessThan } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { UserEntity } from '@users/entities/user.entity'
import { RefreshTokenEntity } from './entities/refresh-token.entity'
import { Role, getPermissionsForRoles } from '@authorization'
import type { LoginDto, RegisterDto, ChangePasswordDto } from './dtos'
import type {
  JwtPayload,
  RefreshTokenPayload,
  AuthResponse,
  RefreshResponse,
} from './interfaces'

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10
  private readonly ACCESS_TOKEN_EXPIRATION = '15m' // 15 minutos
  private readonly REFRESH_TOKEN_EXPIRATION = '7d' // 7 días

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ==================== REGISTRO ====================

  async register(
    registerDto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    // Verificar que el email no exista
    const existingEmail = await this.userRepository.findOne({
      where: { email: registerDto.email.toLowerCase() },
    })

    if (existingEmail) {
      throw new ConflictException('El email ya está registrado')
    }

    // Verificar que el username no exista
    const existingUsername = await this.userRepository.findOne({
      where: { username: registerDto.username.toLowerCase() },
    })

    if (existingUsername) {
      throw new ConflictException('El username ya está en uso')
    }

    // Verificar que el CI no exista
    const existingCI = await this.userRepository.findOne({
      where: { ci: registerDto.ci },
    })

    if (existingCI) {
      throw new ConflictException('El CI ya está registrado')
    }

    // Hash del password
    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      this.SALT_ROUNDS,
    )

    // Crear usuario con rol de cliente por defecto
    const user = this.userRepository.create({
      names: registerDto.names,
      lastNames: registerDto.lastNames,
      email: registerDto.email.toLowerCase(),
      username: registerDto.username.toLowerCase(),
      ci: registerDto.ci,
      password: hashedPassword,
      organizationId: registerDto.organizationId ?? null,
      roles: [Role.CLIENTE],
    })

    const savedUser = await this.userRepository.save(user)

    // Generar tokens
    return await this.generateAuthResponse(savedUser, ipAddress, userAgent)
  }

  // ==================== LOGIN ====================

  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    // Validar credenciales
    const user = await this.validateUser(loginDto.email, loginDto.password)

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas')
    }

    // Generar tokens
    return await this.generateAuthResponse(user, ipAddress, userAgent)
  }

  // ==================== VALIDACIÓN ====================

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserEntity | null> {
    // Buscar usuario con password (select: false por defecto)
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .addSelect('user.password')
      .where('user.email = :email', { email: email.toLowerCase() })
      .getOne()

    if (!user) {
      return null
    }

    // Verificar password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return null
    }

    // No retornar el password
    delete (user as any).password

    return user
  }

  // ==================== REFRESH TOKEN ====================

  async refreshToken(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RefreshResponse> {
    try {
      // Verificar el refresh token
      const payload = this.jwtService.verify<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
        },
      )

      // Buscar el token en BD
      const storedToken = await this.refreshTokenRepository.findOne({
        where: { id: payload.tokenId },
        relations: ['user', 'user.roles'],
      })

      if (!storedToken || !storedToken.isValid()) {
        throw new UnauthorizedException('Refresh token inválido o expirado')
      }

      // Verificar que el hash coincida (comparación segura)
      const tokenHash = await this.hashToken(refreshToken)
      if (storedToken.token !== tokenHash) {
        // Posible ataque de reutilización de token
        // Revocar todos los tokens del usuario
        await this.revokeAllUserTokens(storedToken.userId)
        throw new UnauthorizedException('Token de actualización inválido')
      }

      // Token rotation: Revocar el token actual
      storedToken.isRevoked = true
      storedToken.revokedAt = new Date()
      await this.refreshTokenRepository.save(storedToken)

      // Generar nuevos tokens
      const authResponse = await this.generateAuthResponse(
        storedToken.user,
        ipAddress,
        userAgent,
      )

      // Registrar el reemplazo
      storedToken.replacedByTokenId = authResponse.refreshToken
      await this.refreshTokenRepository.save(storedToken)

      return {
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        expiresIn: authResponse.expiresIn,
      }
    } catch (_error) {
      throw new UnauthorizedException('Refresh token inválido')
    }
  }

  // ==================== LOGOUT ====================

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Revocar solo el token específico
      const tokenHash = await this.hashToken(refreshToken)
      const storedToken = await this.refreshTokenRepository.findOne({
        where: { token: tokenHash },
      })

      if (storedToken) {
        storedToken.isRevoked = true
        storedToken.revokedAt = new Date()
        await this.refreshTokenRepository.save(storedToken)
      }
    } else {
      // Revocar todos los tokens del usuario
      await this.revokeAllUserTokens(userId)
    }
  }

  // ==================== CAMBIO DE PASSWORD ====================

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    // Buscar usuario con password
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :userId', { userId })
      .getOne()

    if (!user) {
      throw new NotFoundException('Usuario no encontrado')
    }

    // Verificar password actual
    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    )

    if (!isPasswordValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta')
    }

    // Hash del nuevo password
    const hashedPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      this.SALT_ROUNDS,
    )

    // Actualizar password
    user.password = hashedPassword
    await this.userRepository.save(user)

    // Revocar todos los tokens del usuario (por seguridad)
    await this.revokeAllUserTokens(userId)
  }

  // ==================== HELPERS ====================

  /**
   * Genera access token y refresh token para un usuario
   */
  private async generateAuthResponse(
    user: UserEntity,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    // Payload del access token
    // Incluimos permisos pre-calculados para evitar recalcularlos en cada request
    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      roles: user.roles,
      permissions: getPermissionsForRoles(user.roles), // ✅ Calculados en authorization
    }

    // Generar access token
    const accessToken = this.jwtService.sign(jwtPayload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.ACCESS_TOKEN_EXPIRATION,
    })

    // Generar refresh token
    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId: user.id,
      expiresAt: this.getRefreshTokenExpiration(),
      ipAddress,
      userAgent,
    })

    const savedRefreshToken =
      await this.refreshTokenRepository.save(refreshTokenEntity)

    // Payload del refresh token
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      tokenId: savedRefreshToken.id,
    }

    // Generar JWT refresh token
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.REFRESH_TOKEN_EXPIRATION,
    })

    // Hash del refresh token y guardarlo
    savedRefreshToken.token = await this.hashToken(refreshToken)
    await this.refreshTokenRepository.save(savedRefreshToken)

    // Limpiar datos sensibles del usuario
    const userResponse = { ...user }
    delete (userResponse as any).password

    return {
      user: userResponse,
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutos en segundos
    }
  }

  /**
   * Hash de un token para almacenamiento seguro
   */
  private async hashToken(token: string): Promise<string> {
    return await bcrypt.hash(token, 10)
  }

  /**
   * Obtiene la fecha de expiración del refresh token
   */
  private getRefreshTokenExpiration(): Date {
    const expiration = new Date()
    expiration.setDate(expiration.getDate() + 7) // 7 días
    return expiration
  }

  /**
   * Revoca todos los tokens de un usuario
   */
  private async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    )
  }

  /**
   * Limpia tokens expirados (ejecutar periódicamente)
   */
  async cleanupExpiredTokens(): Promise<void> {
    const now = new Date()
    await this.refreshTokenRepository.delete({
      expiresAt: LessThan(now),
    })
  }
}

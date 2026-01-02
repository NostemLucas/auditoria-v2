import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Ip,
  UnauthorizedException,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'
import { LocalAuthGuard } from './guards/local-auth.guard'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { Public } from './decorators/public.decorator'
import { CurrentUser } from './decorators/current-user.decorator'
import { LoginDto, RegisterDto, ChangePasswordDto } from './dtos'
import type { JwtPayload } from './interfaces'
import type { UserEntity } from '@users/entities/user.entity'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * POST /auth/register
   * Registrar un nuevo usuario y setear cookies
   */
  @Public()
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Ip() ipAddress: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: Omit<UserEntity, 'password'> }> {
    const userAgent = req.headers['user-agent']
    const authResponse = await this.authService.register(
      registerDto,
      ipAddress,
      userAgent,
    )

    // Setear cookies HttpOnly
    this.setAuthCookies(
      res,
      authResponse.accessToken,
      authResponse.refreshToken,
    )

    // Devolver solo el usuario (sin tokens)
    return { user: authResponse.user }
  }

  /**
   * POST /auth/login
   * Iniciar sesión con email y password y setear cookies
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() _loginDto: LoginDto, // Solo para validación
    @Ip() ipAddress: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: Omit<UserEntity, 'password'> }> {
    // El usuario ya fue validado por LocalAuthGuard
    // LocalStrategy adjunta UserEntity en req.user (no JwtPayload)
    const user = req.user as UserEntity
    const userAgent = req.headers['user-agent']
    const authResponse = await this.authService.login(
      { email: user.email, password: '' }, // Password ya fue validado
      ipAddress,
      userAgent,
    )

    // Setear cookies HttpOnly
    this.setAuthCookies(
      res,
      authResponse.accessToken,
      authResponse.refreshToken,
    )

    // Devolver solo el usuario (sin tokens)
    return { user: authResponse.user }
  }

  /**
   * POST /auth/refresh
   * Renovar access token usando refresh token de la cookie
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ipAddress: string,
  ): Promise<{ success: boolean }> {
    // Leer refreshToken de la cookie
    const refreshToken = req.cookies?.['refreshToken'] as string | undefined

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token found')
    }

    const userAgent = req.headers['user-agent']
    const authResponse = await this.authService.refreshToken(
      refreshToken,
      ipAddress,
      userAgent,
    )

    // Actualizar cookies con los nuevos tokens
    this.setAuthCookies(
      res,
      authResponse.accessToken,
      authResponse.refreshToken,
    )

    return { success: true }
  }

  /**
   * POST /auth/logout
   * Cerrar sesión (revocar refresh token y limpiar cookies)
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean }> {
    const refreshToken = req.cookies?.['refreshToken'] as string | undefined
    const accessToken = req.cookies?.['accessToken'] as string | undefined

    // Intentar obtener userId del accessToken
    let userId: string | undefined

    if (accessToken) {
      try {
        const payload = this.jwtService.decode(accessToken)
        userId = payload?.sub
      } catch {
        // Ignorar errores de decodificación
      }
    }

    // Revocar tokens en BD
    if (userId) {
      await this.authService.logout(userId, refreshToken)
    }

    // Limpiar cookies
    this.clearAuthCookies(res)

    return { success: true }
  }

  /**
   * GET /auth/me
   * Obtener información del usuario actual desde la cookie
   * Endpoint público para verificar sesión
   */
  @Public()
  @Get('me')
  getProfile(@Req() req: Request): { user: JwtPayload | null } {
    const token = req.cookies?.['accessToken'] as string | undefined

    if (!token) {
      return { user: null }
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      })
      return { user: payload }
    } catch {
      // Token inválido o expirado
      return { user: null }
    }
  }

  /**
   * POST /auth/change-password
   * Cambiar contraseña del usuario actual
   */
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.authService.changePassword(userId, changePasswordDto)

    // Limpiar cookies (el usuario debe volver a loguearse)
    this.clearAuthCookies(res)

    return {
      message:
        'Contraseña cambiada exitosamente. Por favor, inicia sesión nuevamente.',
    }
  }

  // ========== HELPERS ==========

  /**
   * Setear cookies de autenticación
   */
  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const isProduction = this.configService.get('NODE_ENV') === 'production'

    // Access Token (15 minutos)
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutos
      path: '/',
    })

    // Refresh Token (7 días)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      path: '/',
    })
  }

  /**
   * Limpiar cookies de autenticación
   */
  private clearAuthCookies(res: Response): void {
    res.clearCookie('accessToken', { path: '/' })
    res.clearCookie('refreshToken', { path: '/' })
  }
}

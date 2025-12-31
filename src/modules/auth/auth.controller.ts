import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common'
import type { Request } from 'express'
import { AuthService } from './auth.service'
import { LocalAuthGuard } from './guards/local-auth.guard'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { Public } from './decorators/public.decorator'
import { CurrentUser } from './decorators/current-user.decorator'
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ChangePasswordDto,
} from './dtos'
import type { AuthResponse, RefreshResponse, JwtPayload } from './interfaces'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/register
   * Registrar un nuevo usuario
   */
  @Public()
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Ip() ipAddress: string,
    @Req() req: Request,
  ): Promise<AuthResponse> {
    const userAgent = req.headers['user-agent']
    return await this.authService.register(registerDto, ipAddress, userAgent)
  }

  /**
   * POST /auth/login
   * Iniciar sesión con email y password
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() _loginDto: LoginDto, // Solo para validación
    @Ip() ipAddress: string,
    @Req() req: Request,
  ): Promise<AuthResponse> {
    // El usuario ya fue validado por LocalAuthGuard
    // LocalStrategy adjunta UserEntity en req.user (no JwtPayload)
    const user = req.user as any // UserEntity del LocalStrategy
    const userAgent = req.headers['user-agent']
    return await this.authService.login(
      { email: user.email, password: '' }, // Password ya fue validado
      ipAddress,
      userAgent,
    )
  }

  /**
   * POST /auth/refresh
   * Renovar access token usando refresh token
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Ip() ipAddress: string,
    @Req() req: Request,
  ): Promise<RefreshResponse> {
    const userAgent = req.headers['user-agent']
    return await this.authService.refreshToken(
      refreshTokenDto.refreshToken,
      ipAddress,
      userAgent,
    )
  }

  /**
   * POST /auth/logout
   * Cerrar sesión (revocar refresh token)
   */
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @CurrentUser('sub') userId: string,
    @Body() body?: { refreshToken?: string },
  ): Promise<void> {
    await this.authService.logout(userId, body?.refreshToken)
  }

  /**
   * GET /auth/me
   * Obtener información del usuario actual desde el JWT
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: JwtPayload): Promise<JwtPayload> {
    return user
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
  ): Promise<{ message: string }> {
    await this.authService.changePassword(userId, changePasswordDto)
    return { message: 'Contraseña cambiada exitosamente' }
  }
}

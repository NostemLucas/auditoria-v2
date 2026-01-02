import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'
import type { JwtPayload } from '../interfaces/jwt-payload.interface'

/**
 * Strategy para validar JWT tokens
 *
 * STATELESS: No consulta la base de datos en cada request
 * El payload del JWT ya contiene toda la información necesaria:
 * - id del usuario
 * - email, username
 * - roles
 * - permissions (pre-calculados)
 *
 * Extrae el token de:
 * 1. Cookie 'accessToken' (prioritario)
 * 2. Header Authorization (fallback)
 *
 * Para datos completos del usuario, usar UsersService.findById()
 * en endpoints específicos que lo necesiten.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. Intentar desde cookie (prioritario para Next.js)
        (request: Request) => {
          return request?.cookies?.['accessToken'] as string | null
        },
        // 2. Fallback: desde header Authorization
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default-secret',
    })
  }

  /**
   * Valida el JWT y retorna el payload
   *
   * ✅ SIN CONSULTAR DB - Máxima velocidad
   * El JWT ya tiene roles y permisos pre-calculados
   */
  validate(payload: JwtPayload): JwtPayload {
    // Validaciones básicas del payload
    if (!payload.sub || !payload.roles) {
      throw new UnauthorizedException('Token inválido: faltan datos requeridos')
    }

    // Retornar el payload directamente
    // Se adjuntará a request.user
    return payload
  }
}

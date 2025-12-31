import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
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
 * Para datos completos del usuario, usar UsersService.findById()
 * en endpoints específicos que lo necesiten.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Validaciones básicas del payload
    if (!payload.sub || !payload.roles) {
      throw new UnauthorizedException('Token inválido: faltan datos requeridos')
    }

    // Retornar el payload directamente
    // Se adjuntará a request.user
    return payload
  }
}

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { Role } from '../enums/role.enum'
import type { JwtPayload } from '@auth/interfaces/jwt-payload.interface'

/**
 * Guard para verificar roles del usuario
 *
 * STATELESS: Verifica roles directamente desde el JWT
 * No consulta la base de datos
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    // Si no hay roles requeridos, permitir acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user: JwtPayload = request.user // ✅ Del JWT, no de DB

    if (!user || !user.roles || user.roles.length === 0) {
      return false
    }

    // Verificar si el usuario tiene al menos uno de los roles requeridos
    return requiredRoles.some((role) => user.roles.includes(role))
  }
}

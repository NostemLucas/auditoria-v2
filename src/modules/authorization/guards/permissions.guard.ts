import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator'
import { Permission } from '../enums/permission.enum'
import type { JwtPayload } from '@auth/interfaces/jwt-payload.interface'

/**
 * Guard para verificar permisos del usuario
 *
 * STATELESS: Verifica permisos directamente desde el JWT
 * No consulta la base de datos
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtener permisos requeridos del decorador
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    )

    // Obtener permisos alternativos (al menos uno)
    const anyPermissions = this.reflector.getAllAndOverride<Permission[]>(
      'permissions:any',
      [context.getHandler(), context.getClass()],
    )

    // Si no hay permisos requeridos, permitir acceso
    if (
      (!requiredPermissions || requiredPermissions.length === 0) &&
      (!anyPermissions || anyPermissions.length === 0)
    ) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user: JwtPayload = request.user // ✅ Del JWT, no de DB

    if (!user || !user.permissions) {
      return false
    }

    // Verificar que tenga TODOS los permisos requeridos
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every((permission) =>
        user.permissions!.includes(permission),
      )
      if (!hasAllPermissions) {
        return false
      }
    }

    // Verificar que tenga AL MENOS UNO de los permisos alternativos
    if (anyPermissions && anyPermissions.length > 0) {
      const hasAnyPermission = anyPermissions.some((permission) =>
        user.permissions!.includes(permission),
      )
      if (!hasAnyPermission) {
        return false
      }
    }

    return true
  }
}

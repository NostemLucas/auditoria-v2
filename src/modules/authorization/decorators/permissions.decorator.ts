import { SetMetadata } from '@nestjs/common'
import { Permission } from '../enums/permission.enum'

export const PERMISSIONS_KEY = 'permissions'

/**
 * Decorator para proteger rutas por permisos
 *
 * @example
 * @RequirePermissions(Permission.USERS_CREATE, Permission.USERS_UPDATE)
 * @Post('users')
 * async create() { ... }
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions)

/**
 * Decorator para verificar que el usuario tenga AL MENOS UNO de los permisos
 *
 * @example
 * @RequireAnyPermission(Permission.USERS_READ, Permission.USERS_LIST)
 * @Get('users')
 * async findAll() { ... }
 */
export const RequireAnyPermission = (...permissions: Permission[]) =>
  SetMetadata('permissions:any', permissions)

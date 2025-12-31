import { SetMetadata } from '@nestjs/common'
import { Role } from '../enums/role.enum'

export const ROLES_KEY = 'roles'

/**
 * Decorator para proteger rutas por roles
 *
 * @example
 * @Roles(Role.ADMIN, Role.GERENTE)
 * @Get('users')
 * async findAll() { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles)

import { Role } from '../enums/role.enum'
import { Permission } from '../enums/permission.enum'

/**
 * Helpers para verificar roles y permisos
 *
 * Estas funciones trabajan con arrays simples, por lo que pueden usarse:
 * - Con JwtPayload (en guards, controllers)
 * - Con UserEntity (si lo tienes de DB)
 * - En tests
 * - En cualquier lugar donde tengas roles/permisos
 */

// ==================== ROLE CHECKS ====================

/**
 * Verifica si tiene un rol específico
 */
export function hasRole(roles: Role[], role: Role): boolean {
  return roles?.includes(role) ?? false
}

/**
 * Verifica si tiene todos los roles especificados
 */
export function hasAllRoles(userRoles: Role[], requiredRoles: Role[]): boolean {
  return requiredRoles.every((role) => hasRole(userRoles, role))
}

/**
 * Verifica si tiene al menos uno de los roles especificados
 */
export function hasAnyRole(userRoles: Role[], requiredRoles: Role[]): boolean {
  return requiredRoles.some((role) => hasRole(userRoles, role))
}

// ==================== PERMISSION CHECKS ====================

/**
 * Verifica si tiene un permiso específico
 */
export function hasPermission(
  permissions: Permission[],
  permission: Permission,
): boolean {
  return permissions?.includes(permission) ?? false
}

/**
 * Verifica si tiene todos los permisos especificados
 */
export function hasAllPermissions(
  userPermissions: Permission[],
  requiredPermissions: Permission[],
): boolean {
  return requiredPermissions.every((permission) =>
    hasPermission(userPermissions, permission),
  )
}

/**
 * Verifica si tiene al menos uno de los permisos especificados
 */
export function hasAnyPermission(
  userPermissions: Permission[],
  requiredPermissions: Permission[],
): boolean {
  return requiredPermissions.some((permission) =>
    hasPermission(userPermissions, permission),
  )
}

// ==================== COMBINED CHECKS ====================

/**
 * Verifica si el usuario es admin
 */
export function isAdmin(roles: Role[]): boolean {
  return hasRole(roles, Role.ADMIN)
}

/**
 * Verifica si el usuario es admin o gerente
 */
export function isAdminOrManager(roles: Role[]): boolean {
  return hasAnyRole(roles, [Role.ADMIN, Role.GERENTE])
}

/**
 * Verifica si puede crear usuarios
 */
export function canCreateUsers(permissions: Permission[]): boolean {
  return hasPermission(permissions, Permission.USERS_CREATE)
}

/**
 * Verifica si puede gestionar reportes (crear, actualizar, eliminar)
 */
export function canManageReports(permissions: Permission[]): boolean {
  return hasAllPermissions(permissions, [
    Permission.REPORTS_CREATE,
    Permission.REPORTS_UPDATE,
    Permission.REPORTS_DELETE,
  ])
}

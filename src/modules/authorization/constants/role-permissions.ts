import { Role } from '../enums/role.enum'
import { Permission } from '../enums/permission.enum'

/**
 * Mapeo de roles a sus permisos
 *
 * Este es el ÚNICO lugar donde se definen los permisos de cada rol.
 * No hay tabla en BD - los permisos se calculan en runtime desde esta constante.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    // Acceso completo a todo el sistema
    Permission.USERS_CREATE,
    Permission.USERS_READ,
    Permission.USERS_UPDATE,
    Permission.USERS_DELETE,
    Permission.USERS_LIST,
    Permission.ORGANIZATIONS_CREATE,
    Permission.ORGANIZATIONS_READ,
    Permission.ORGANIZATIONS_UPDATE,
    Permission.ORGANIZATIONS_DELETE,
    Permission.ORGANIZATIONS_LIST,
    Permission.REPORTS_CREATE,
    Permission.REPORTS_READ,
    Permission.REPORTS_UPDATE,
    Permission.REPORTS_DELETE,
    Permission.REPORTS_LIST,
    Permission.REPORTS_EXPORT,
    Permission.AUDITS_CREATE,
    Permission.AUDITS_READ,
    Permission.AUDITS_UPDATE,
    Permission.AUDITS_DELETE,
    Permission.AUDITS_LIST,
    Permission.AUDITS_APPROVE,
    Permission.TEMPLATES_CREATE,
    Permission.TEMPLATES_READ,
    Permission.TEMPLATES_UPDATE,
    Permission.TEMPLATES_DELETE,
    Permission.TEMPLATES_LIST,
    Permission.SYSTEM_SETTINGS,
    Permission.SYSTEM_LOGS,
  ],

  [Role.GERENTE]: [
    // Gestión de operaciones y reportes
    Permission.USERS_READ,
    Permission.USERS_LIST,
    Permission.ORGANIZATIONS_READ,
    Permission.ORGANIZATIONS_LIST,
    Permission.REPORTS_CREATE,
    Permission.REPORTS_READ,
    Permission.REPORTS_UPDATE,
    Permission.REPORTS_LIST,
    Permission.REPORTS_EXPORT,
    Permission.AUDITS_CREATE,
    Permission.AUDITS_READ,
    Permission.AUDITS_UPDATE,
    Permission.AUDITS_LIST,
    Permission.AUDITS_APPROVE,
    Permission.TEMPLATES_READ,
    Permission.TEMPLATES_LIST,
  ],

  [Role.AUDITOR]: [
    // Auditoría y lectura
    Permission.USERS_READ,
    Permission.USERS_LIST,
    Permission.ORGANIZATIONS_READ,
    Permission.ORGANIZATIONS_LIST,
    Permission.REPORTS_READ,
    Permission.REPORTS_LIST,
    Permission.AUDITS_CREATE,
    Permission.AUDITS_READ,
    Permission.AUDITS_LIST,
    Permission.TEMPLATES_READ,
    Permission.TEMPLATES_LIST,
  ],

  [Role.CLIENTE]: [
    // Acceso básico de solo lectura
    Permission.REPORTS_READ,
    Permission.REPORTS_LIST,
    Permission.AUDITS_READ,
    Permission.AUDITS_LIST,
  ],
}

/**
 * Obtiene todos los permisos de un rol
 */
export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * Obtiene todos los permisos de múltiples roles (union)
 */
export function getPermissionsForRoles(roles: Role[]): Permission[] {
  const allPermissions = roles.flatMap((role) => getPermissionsForRole(role))
  return [...new Set(allPermissions)] // Eliminar duplicados
}

/**
 * Verifica si un rol tiene un permiso específico
 */
export function roleHasPermission(role: Role, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission)
}

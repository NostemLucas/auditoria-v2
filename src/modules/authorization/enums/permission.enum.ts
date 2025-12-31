/**
 * Permisos granulares del sistema
 * Pueden ser asignados a roles
 */
export enum Permission {
  // Usuarios
  USERS_CREATE = 'users:create',
  USERS_READ = 'users:read',
  USERS_UPDATE = 'users:update',
  USERS_DELETE = 'users:delete',
  USERS_LIST = 'users:list',

  // Organizaciones
  ORGANIZATIONS_CREATE = 'organizations:create',
  ORGANIZATIONS_READ = 'organizations:read',
  ORGANIZATIONS_UPDATE = 'organizations:update',
  ORGANIZATIONS_DELETE = 'organizations:delete',
  ORGANIZATIONS_LIST = 'organizations:list',

  // Reportes
  REPORTS_CREATE = 'reports:create',
  REPORTS_READ = 'reports:read',
  REPORTS_UPDATE = 'reports:update',
  REPORTS_DELETE = 'reports:delete',
  REPORTS_LIST = 'reports:list',
  REPORTS_EXPORT = 'reports:export',

  // Auditorías
  AUDITS_CREATE = 'audits:create',
  AUDITS_READ = 'audits:read',
  AUDITS_UPDATE = 'audits:update',
  AUDITS_DELETE = 'audits:delete',
  AUDITS_LIST = 'audits:list',
  AUDITS_APPROVE = 'audits:approve',

  // Templates
  TEMPLATES_CREATE = 'templates:create',
  TEMPLATES_READ = 'templates:read',
  TEMPLATES_UPDATE = 'templates:update',
  TEMPLATES_DELETE = 'templates:delete',
  TEMPLATES_LIST = 'templates:list',

  // Sistema
  SYSTEM_SETTINGS = 'system:settings',
  SYSTEM_LOGS = 'system:logs',
}

/**
 * Obtiene todos los permisos disponibles
 */
export function getAllPermissions(): Permission[] {
  return Object.values(Permission)
}

/**
 * Agrupa permisos por módulo
 */
export function getPermissionsByModule(): Record<string, Permission[]> {
  const permissions = getAllPermissions()
  const grouped: Record<string, Permission[]> = {}

  for (const permission of permissions) {
    const [module] = permission.split(':')
    if (!grouped[module]) {
      grouped[module] = []
    }
    grouped[module].push(permission)
  }

  return grouped
}

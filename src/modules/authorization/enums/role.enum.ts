/**
 * Roles disponibles en el sistema
 * Estos son los ÚNICOS roles permitidos y no son editables
 */
export enum Role {
  ADMIN = 'admin',
  GERENTE = 'gerente',
  CLIENTE = 'cliente',
  AUDITOR = 'auditor',
}

/**
 * Metadata de cada rol
 */
export const ROLE_METADATA: Record<
  Role,
  {
    name: string
    description: string
    level: number
  }
> = {
  [Role.ADMIN]: {
    name: 'Administrador',
    description: 'Acceso total al sistema',
    level: 100,
  },
  [Role.GERENTE]: {
    name: 'Gerente',
    description: 'Gestión de operaciones y reportes',
    level: 75,
  },
  [Role.AUDITOR]: {
    name: 'Auditor',
    description: 'Revisión y auditoría de procesos',
    level: 50,
  },
  [Role.CLIENTE]: {
    name: 'Cliente',
    description: 'Acceso básico al sistema',
    level: 25,
  },
}

/**
 * Obtiene todos los roles disponibles
 */
export function getAllRoles(): Role[] {
  return Object.values(Role)
}

/**
 * Verifica si un string es un rol válido
 */
export function isValidRole(role: string): role is Role {
  return Object.values(Role).includes(role as Role)
}

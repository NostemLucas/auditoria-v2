# Propuesta: Sistema de Menús Simplificado

## 🎯 Objetivo

Reemplazar la tabla `navigation_items` por una configuración en código, manteniendo flexibilidad.

---

## 📊 Comparación: Actual vs Propuesto

### ❌ Sistema Actual (DB)

```typescript
// Entidad en DB con relaciones complejas
@Entity('modules')
class NavigationItem {
  @ManyToOne(() => Role)
  role: Role

  @ManyToOne(() => NavigationItem)
  module: NavigationItem

  // ... queries, seeders, migraciones
}
```

**Problemas:**

- 🐌 Queries adicionales para cargar menús
- 🔧 Difícil de mantener (seeders, migraciones)
- 🚫 Solo admin puede configurar
- ❌ Usuarios no pueden personalizar

---

### ✅ Sistema Propuesto (Código)

```typescript
// Constante en código
export const ROLE_MENUS: Record<Role, MenuItem[]> = {
  [Role.ADMIN]: [...],
  [Role.GERENTE]: [...],
  // ...
}
```

**Ventajas:**

- ⚡ Sin queries a DB
- 🎨 Type safe
- 📝 Versionado en Git
- 🔄 Fácil de cambiar
- 👤 Permite personalización por usuario

---

## 🏗️ Implementación Propuesta

### 1. Definir estructura de menú

```typescript
// src/modules/navigation/types/menu-item.interface.ts

export interface MenuItem {
  id: string // ID único para referencias
  title: string
  description?: string
  icon?: string
  url?: string
  order: number
  children?: MenuItem[]
  // Opcional: permisos requeridos
  requiredPermissions?: Permission[]
}
```

### 2. Definir menús por rol

```typescript
// src/modules/navigation/constants/role-menus.ts

import { Role, Permission } from '@authorization'
import type { MenuItem } from '../types'

export const ROLE_MENUS: Record<Role, MenuItem[]> = {
  [Role.ADMIN]: [
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Panel principal',
      icon: 'dashboard',
      url: '/dashboard',
      order: 1,
    },
    {
      id: 'users',
      title: 'Usuarios',
      description: 'Gestión de usuarios',
      icon: 'users',
      url: '/users',
      order: 2,
      requiredPermissions: [Permission.USERS_READ],
      children: [
        {
          id: 'users-list',
          title: 'Lista de Usuarios',
          url: '/users/list',
          order: 1,
        },
        {
          id: 'users-create',
          title: 'Crear Usuario',
          url: '/users/create',
          order: 2,
          requiredPermissions: [Permission.USERS_CREATE],
        },
      ],
    },
    {
      id: 'organizations',
      title: 'Organizaciones',
      icon: 'building',
      url: '/organizations',
      order: 3,
    },
    {
      id: 'reports',
      title: 'Reportes',
      icon: 'chart',
      url: '/reports',
      order: 4,
    },
    {
      id: 'settings',
      title: 'Configuración',
      icon: 'settings',
      url: '/settings',
      order: 5,
    },
  ],

  [Role.GERENTE]: [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: 'dashboard',
      url: '/dashboard',
      order: 1,
    },
    {
      id: 'reports',
      title: 'Reportes',
      icon: 'chart',
      url: '/reports',
      order: 2,
      children: [
        {
          id: 'reports-view',
          title: 'Ver Reportes',
          url: '/reports/view',
          order: 1,
        },
        {
          id: 'reports-create',
          title: 'Crear Reporte',
          url: '/reports/create',
          order: 2,
        },
      ],
    },
    {
      id: 'audits',
      title: 'Auditorías',
      icon: 'clipboard',
      url: '/audits',
      order: 3,
    },
  ],

  [Role.AUDITOR]: [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: 'dashboard',
      url: '/dashboard',
      order: 1,
    },
    {
      id: 'audits',
      title: 'Auditorías',
      icon: 'clipboard',
      url: '/audits',
      order: 2,
    },
    {
      id: 'reports',
      title: 'Reportes',
      icon: 'chart',
      url: '/reports',
      order: 3,
    },
  ],

  [Role.CLIENTE]: [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: 'dashboard',
      url: '/dashboard',
      order: 1,
    },
    {
      id: 'reports',
      title: 'Mis Reportes',
      icon: 'chart',
      url: '/reports',
      order: 2,
    },
  ],
}
```

### 3. Helper para obtener menús

```typescript
// src/modules/navigation/utils/menu.utils.ts

import { ROLE_MENUS } from '../constants/role-menus'
import type { Role, Permission } from '@authorization'
import type { MenuItem } from '../types'

/**
 * Obtiene el menú para un rol específico
 */
export function getMenuForRole(role: Role): MenuItem[] {
  return ROLE_MENUS[role] || []
}

/**
 * Obtiene el menú combinado para múltiples roles
 */
export function getMenuForRoles(roles: Role[]): MenuItem[] {
  const allMenus = roles.flatMap((role) => getMenuForRole(role))

  // Eliminar duplicados por ID
  const uniqueMenus = new Map<string, MenuItem>()
  allMenus.forEach((item) => {
    if (!uniqueMenus.has(item.id)) {
      uniqueMenus.set(item.id, item)
    }
  })

  return Array.from(uniqueMenus.values()).sort((a, b) => a.order - b.order)
}

/**
 * Filtra menús según permisos del usuario
 */
export function filterMenuByPermissions(
  menu: MenuItem[],
  userPermissions: Permission[],
): MenuItem[] {
  return menu
    .filter((item) => {
      // Si no requiere permisos, mostrar
      if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
        return true
      }
      // Verificar que tenga al menos uno de los permisos
      return item.requiredPermissions.some((perm) =>
        userPermissions.includes(perm),
      )
    })
    .map((item) => ({
      ...item,
      // Filtrar recursivamente los hijos
      children: item.children
        ? filterMenuByPermissions(item.children, userPermissions)
        : undefined,
    }))
}
```

### 4. Agregar menú al UserEntity

```typescript
// src/modules/users/entities/user.entity.ts

import { getMenuForRoles, filterMenuByPermissions } from '@navigation'

export class UserEntity extends BaseEntity {
  // ... campos existentes

  /**
   * Obtiene el menú personalizado del usuario según sus roles y permisos
   */
  get menu(): MenuItem[] {
    const baseMenu = getMenuForRoles(this.roles)
    return filterMenuByPermissions(baseMenu, this.permissions)
  }
}
```

### 5. Devolver menú en /auth/me

```typescript
// src/modules/auth/auth.controller.ts

@Get('me')
getProfile(@CurrentUser() user: UserEntity) {
  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    roles: user.roles,
    permissions: user.permissions,
    menu: user.menu, // ✨ Menú personalizado
  }
}
```

---

## 🎨 Personalización por Usuario (Opcional)

Si quieres que usuarios puedan personalizar su menú:

### Opción A: Preferencias en DB

```typescript
// src/modules/users/entities/user-preferences.entity.ts

@Entity('user_preferences')
export class UserPreferencesEntity extends BaseEntity {
  @Column({ type: 'uuid' })
  userId: string

  @Column({ type: 'simple-json', default: '{}' })
  menuPreferences: {
    hiddenItems?: string[] // IDs de menús ocultos
    customOrder?: Record<string, number> // Orden personalizado
    pinnedItems?: string[] // Items anclados
  }
}
```

### Opción B: Columna en User

```typescript
export class UserEntity extends BaseEntity {
  @Column({ type: 'simple-json', nullable: true })
  menuPreferences?: {
    hiddenItems?: string[]
    customOrder?: Record<string, number>
  }

  get menu(): MenuItem[] {
    let menu = getMenuForRoles(this.roles)
    menu = filterMenuByPermissions(menu, this.permissions)

    // Aplicar preferencias del usuario
    if (this.menuPreferences) {
      menu = this.applyUserPreferences(menu, this.menuPreferences)
    }

    return menu
  }

  private applyUserPreferences(
    menu: MenuItem[],
    prefs: UserPreferencesType,
  ): MenuItem[] {
    return menu
      .filter((item) => !prefs.hiddenItems?.includes(item.id))
      .map((item) => ({
        ...item,
        order: prefs.customOrder?.[item.id] ?? item.order,
      }))
      .sort((a, b) => a.order - b.order)
  }
}
```

---

## 📊 Migración desde DB a Código

### Paso 1: Exportar menús actuales

```typescript
// Script temporal para exportar
async function exportMenusFromDB() {
  const roles = await roleRepository.find({ relations: ['modules'] })

  const config = {}
  for (const role of roles) {
    config[role.name] = role.modules.map((m) => ({
      id: m.id,
      title: m.title,
      icon: m.icon,
      url: m.url,
      order: m.order,
      // ...
    }))
  }

  console.log(JSON.stringify(config, null, 2))
}
```

### Paso 2: Crear constantes

Copiar el output al archivo `role-menus.ts`

### Paso 3: Deprecar tabla gradualmente

1. Primero usar código (sin borrar tabla)
2. Validar que funciona
3. Crear migración para borrar tabla

---

## ✅ Ventajas del Nuevo Sistema

| Aspecto         | DB (Actual)           | Código (Propuesto) |
| --------------- | --------------------- | ------------------ |
| Performance     | ❌ Queries            | ✅ Instantáneo     |
| Mantenimiento   | ❌ Seeders/Migrations | ✅ Edit & commit   |
| Type Safety     | ⚠️ Parcial            | ✅ Completo        |
| Versionado      | ❌ No                 | ✅ Git             |
| Personalización | ❌ Solo admin         | ✅ Por usuario     |
| Escalabilidad   | ⚠️ Limitada           | ✅ Excelente       |

---

## 🎯 Recomendación Final

### Para tu caso (4 roles fijos):

**✅ Usa configuración en código** con:

- `ROLE_MENUS` constante
- Menús derivados de roles
- Opcional: preferencias por usuario en columna JSON

### Cuándo mantener DB:

Solo si necesitas:

- Menús 100% dinámicos
- Cada cliente tiene menús diferentes
- Admin configure menús desde UI
- Multitenancy con menús personalizados

---

## 📝 Ejemplo de Response

```json
{
  "id": "user-123",
  "name": "John Doe",
  "email": "john@example.com",
  "roles": ["admin"],
  "permissions": ["USERS_CREATE", "USERS_READ", ...],
  "menu": [
    {
      "id": "dashboard",
      "title": "Dashboard",
      "icon": "dashboard",
      "url": "/dashboard",
      "order": 1
    },
    {
      "id": "users",
      "title": "Usuarios",
      "icon": "users",
      "url": "/users",
      "order": 2,
      "children": [
        {
          "id": "users-list",
          "title": "Lista de Usuarios",
          "url": "/users/list",
          "order": 1
        }
      ]
    }
  ]
}
```

---

**¿Qué opinas? ¿Simplificamos a código o prefieres mantener DB?**

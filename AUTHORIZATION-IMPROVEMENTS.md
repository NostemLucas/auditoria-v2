# Sistema de Autorización - Mejoras Implementadas

## 🎯 Filosofía del Sistema

**Principio clave**: Los permisos NO se almacenan en la base de datos. Se derivan automáticamente de los roles en runtime.

```
Usuario → Roles (DB) → Permisos (calculados) → Verificación
```

## ✨ Mejoras Implementadas

### 1. **Type Safety Completo**

**Antes:**

```typescript
hasRole(roleName: string): boolean
hasPermission(permission: string): boolean
```

**Después:**

```typescript
hasRole(role: Role): boolean
hasPermission(permission: Permission): boolean
```

✅ **Beneficio**: El compilador detecta errores de tipos en tiempo de desarrollo.

---

### 2. **Cache de Permisos en Memoria**

**Antes:**

```typescript
getAllPermissions(): string[] {
  return getPermissionsForRoles(this.roles) // Recalcula cada vez
}
```

**Después:**

```typescript
private _permissionsCache?: Permission[]

get permissions(): Permission[] {
  if (!this._permissionsCache) {
    this._permissionsCache = getPermissionsForRoles(this.roles)
  }
  return this._permissionsCache
}
```

✅ **Beneficio**: Los permisos se calculan una vez y se cachean en memoria.

---

### 3. **Permisos Pre-calculados en JWT**

**Antes:**

```typescript
interface JwtPayload {
  sub: string
  roles: string[]
}
```

**Después:**

```typescript
interface JwtPayload {
  sub: string
  roles: Role[]
  permissions?: Permission[] // Pre-calculados
}
```

✅ **Beneficio**: Evita recalcular permisos en cada request. Los permisos ya vienen en el token.

---

### 4. **API más Clara y Organizada**

```typescript
export class UserEntity {
  // ==================== ROLE CHECKS ====================
  hasRole(role: Role): boolean
  hasAllRoles(roles: Role[]): boolean
  hasAnyRole(roles: Role[]): boolean

  // ==================== PERMISSION CHECKS ====================
  hasPermission(permission: Permission): boolean
  hasAllPermissions(permissions: Permission[]): boolean
  hasAnyPermission(permissions: Permission[]): boolean

  // ==================== COMPUTED ====================
  get permissions(): Permission[] // Todos los permisos del usuario
}
```

---

## 📚 Ejemplos de Uso

### Ejemplo 1: Proteger una ruta con roles

```typescript
import { Controller, Get } from '@nestjs/common'
import { RequireRoles, Role } from '@authorization'

@Controller('admin')
export class AdminController {
  @RequireRoles(Role.ADMIN, Role.GERENTE)
  @Get('dashboard')
  getDashboard() {
    return { message: 'Solo admins y gerentes' }
  }
}
```

### Ejemplo 2: Proteger una ruta con permisos

```typescript
import { Controller, Post, Delete } from '@nestjs/common'
import { RequirePermissions, Permission } from '@authorization'

@Controller('users')
export class UsersController {
  @RequirePermissions(Permission.USERS_CREATE)
  @Post()
  create() {
    return { message: 'Usuario creado' }
  }

  @RequirePermissions(Permission.USERS_DELETE)
  @Delete(':id')
  remove() {
    return { message: 'Usuario eliminado' }
  }
}
```

### Ejemplo 3: Verificar permisos en código

```typescript
import { Injectable } from '@nestjs/common'
import { Permission } from '@authorization'
import { CurrentUser } from '@auth'

@Injectable()
export class SomeService {
  someMethod(@CurrentUser() user: UserEntity) {
    // Verificar un permiso
    if (user.hasPermission(Permission.REPORTS_EXPORT)) {
      // Exportar reporte
    }

    // Verificar múltiples permisos (TODOS)
    if (
      user.hasAllPermissions([Permission.USERS_READ, Permission.USERS_UPDATE])
    ) {
      // Operación que requiere ambos permisos
    }

    // Verificar al menos uno
    if (
      user.hasAnyPermission([Permission.REPORTS_READ, Permission.AUDITS_READ])
    ) {
      // Al menos puede ver reportes o auditorías
    }
  }
}
```

### Ejemplo 4: Obtener todos los permisos

```typescript
@Get('me')
getProfile(@CurrentUser() user: UserEntity) {
  return {
    id: user.id,
    name: user.fullName,
    roles: user.roles,
    permissions: user.permissions // Todos los permisos calculados
  }
}
```

---

## 🔍 Flujo de Verificación

### Con Roles:

```
Request → JwtAuthGuard → RolesGuard → user.hasRole(Role.ADMIN) → ✓/✗
```

### Con Permisos:

```
Request → JwtAuthGuard → PermissionsGuard → user.hasPermission(Permission.USERS_CREATE) → ✓/✗
```

---

## 🎨 Ventajas del Diseño Actual

### ✅ Ventajas:

1. **Sin duplicación**: Permisos definidos en un solo lugar (`ROLE_PERMISSIONS`)
2. **Fácil mantenimiento**: Cambiar permisos de un rol = editar una constante
3. **Performance**: Permisos se cachean en memoria y en JWT
4. **Type safety**: Imposible usar roles/permisos inválidos
5. **Consistencia**: Los permisos SIEMPRE derivan de los roles

### ⚠️ Trade-offs:

1. **JWT más grande**: Incluir permisos aumenta el tamaño del token (~200-500 bytes más)
2. **Caché invalida**: Si cambias `ROLE_PERMISSIONS`, usuarios activos no verán el cambio hasta que renueven su token

---

## 🔧 Configuración de Permisos

Los permisos se definen en: `src/modules/authorization/constants/role-permissions.ts`

```typescript
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    Permission.USERS_CREATE,
    Permission.USERS_READ,
    // ... todos los permisos
  ],

  [Role.GERENTE]: [
    Permission.USERS_READ,
    Permission.REPORTS_CREATE,
    // ... permisos limitados
  ],

  [Role.CLIENTE]: [
    Permission.REPORTS_READ,
    // ... solo lectura
  ],
}
```

**Para agregar un nuevo permiso:**

1. Agregar el enum en `enums/permission.enum.ts`
2. Asignarlo a roles en `constants/role-permissions.ts`
3. ¡Listo! No hay migraciones de DB ni seeders

---

## 📊 Comparación: Antes vs Después

| Aspecto        | Antes                | Después                     |
| -------------- | -------------------- | --------------------------- |
| Type safety    | ❌ `string`          | ✅ `Role`, `Permission`     |
| Performance    | ⚠️ Recalcula siempre | ✅ Cache + JWT              |
| API clarity    | ⚠️ Métodos mezclados | ✅ Organizado por secciones |
| Mantenibilidad | ⚠️ Código duplicado  | ✅ DRY                      |

---

## 🚀 Próximos Pasos Opcionales

### Opción 1: Agregar logging de accesos

```typescript
@Injectable()
export class PermissionsGuard {
  canActivate(context: ExecutionContext): boolean {
    // ... verificación
    if (!hasPermission) {
      this.logger.warn(`Access denied: ${user.email} missing ${permission}`)
    }
  }
}
```

### Opción 2: Permisos dinámicos por organización

```typescript
// Permitir que cada organización tenga permisos personalizados
user.hasPermission(Permission.CUSTOM, organizationId)
```

### Opción 3: Rate limiting por rol

```typescript
@Throttle({
  [Role.ADMIN]: { ttl: 60, limit: 1000 },
  [Role.CLIENTE]: { ttl: 60, limit: 100 }
})
```

---

## 💡 Recomendaciones

1. **Usa permisos para acciones específicas** (ej: `USERS_CREATE`)
2. **Usa roles para agrupaciones lógicas** (ej: `@RequireRoles(Role.ADMIN)` en un controller completo)
3. **No mezcles**: Decide si una ruta se protege por rol o permiso, no ambos
4. **Documenta**: Siempre comenta POR QUÉ un permiso es necesario

---

**Última actualización:** Diciembre 2025

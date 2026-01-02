# Guía: Helpers de Permisos

## 🎯 Por qué Helpers en vez de Métodos en Entity

### ❌ Problema con métodos en Entity

```typescript
// Solo funciona si tienes UserEntity de DB
const user = await usersService.findById(userId) // Query a DB
if (user.hasPermission(Permission.USERS_CREATE)) {
  // ...
}
```

**Problemas:**

- Requiere cargar UserEntity completo
- No funciona con JwtPayload
- Lógica duplicada entre entity y guards

### ✅ Solución: Helpers reutilizables

```typescript
import { hasPermission } from '@authorization'

// Funciona con JwtPayload (sin query)
if (hasPermission(jwt.permissions, Permission.USERS_CREATE)) {
  // ...
}

// También funciona con UserEntity si lo tienes
if (hasPermission(user.permissions, Permission.USERS_CREATE)) {
  // ...
}

// Y con arrays simples
const perms: Permission[] = [Permission.USERS_READ]
if (hasPermission(perms, Permission.USERS_CREATE)) {
  // ...
}
```

---

## 📚 API de Helpers

### Importar

```typescript
import {
  // Role checks
  hasRole,
  hasAllRoles,
  hasAnyRole,

  // Permission checks
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,

  // Helpers específicos
  isAdmin,
  isAdminOrManager,
  canCreateUsers,
  canManageReports,
} from '@authorization'
```

---

## 🎨 Ejemplos de Uso

### 1. En Controllers con JWT

```typescript
import { CurrentUser, JwtPayload } from '@auth'
import { hasPermission, Permission } from '@authorization'

@Controller('reports')
export class ReportsController {
  @Get()
  async findAll(@CurrentUser() jwt: JwtPayload) {
    // ✅ Verificación directa sin cargar entity
    if (hasPermission(jwt.permissions, Permission.REPORTS_EXPORT)) {
      // Incluir datos de exportación
    }

    return this.reportsService.findAll()
  }

  @Post()
  async create(@CurrentUser() jwt: JwtPayload, @Body() dto: CreateReportDto) {
    // ✅ Verificar múltiples permisos
    if (
      !hasAllPermissions(jwt.permissions, [
        Permission.REPORTS_CREATE,
        Permission.REPORTS_UPDATE,
      ])
    ) {
      throw new ForbiddenException()
    }

    return this.reportsService.create(dto, jwt.sub)
  }
}
```

### 2. En Services con lógica de negocio

```typescript
import { hasRole, Role } from '@authorization'
import type { JwtPayload } from '@auth'

@Injectable()
export class ReportsService {
  async generateReport(dto: GenerateReportDto, jwt: JwtPayload) {
    // ✅ Admins pueden generar cualquier tipo
    if (hasRole(jwt.roles, Role.ADMIN)) {
      return this.generateAnyReport(dto)
    }

    // ✅ Otros usuarios tienen restricciones
    return this.generateLimitedReport(dto, jwt.sub)
  }

  async deleteReport(reportId: string, jwt: JwtPayload) {
    const report = await this.findOne(reportId)

    // ✅ Verificar ownership o permiso de admin
    const isOwner = report.userId === jwt.sub
    const isAdminOrManager = hasAnyRole(jwt.roles, [Role.ADMIN, Role.GERENTE])

    if (!isOwner && !isAdminOrManager) {
      throw new ForbiddenException()
    }

    return this.remove(reportId)
  }
}
```

### 3. En Guards personalizados

```typescript
import { hasPermission, Permission } from '@authorization'
import type { JwtPayload } from '@auth'

@Injectable()
export class OwnerOrAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const jwt: JwtPayload = request.user
    const resourceId = request.params.id

    // ✅ Admin puede acceder a todo
    if (hasPermission(jwt.permissions, Permission.ADMIN_ACCESS)) {
      return true
    }

    // Verificar ownership
    const resource = await this.getResource(resourceId)
    return resource.userId === jwt.sub
  }
}
```

### 4. Helpers específicos pre-construidos

```typescript
import {
  isAdmin,
  isAdminOrManager,
  canCreateUsers,
  canManageReports,
} from '@authorization'

@Injectable()
export class SomeService {
  async doSomething(jwt: JwtPayload) {
    // ✅ Helpers convenientes
    if (isAdmin(jwt.roles)) {
      // Admin logic
    }

    if (isAdminOrManager(jwt.roles)) {
      // Manager logic
    }

    if (canCreateUsers(jwt.permissions)) {
      // User creation logic
    }

    if (canManageReports(jwt.permissions)) {
      // Report management
    }
  }
}
```

### 5. En validaciones de DTOs

```typescript
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator'
import { hasPermission, Permission } from '@authorization'
import type { JwtPayload } from '@auth'

@ValidatorConstraint({ name: 'canSetRole', async: false })
export class CanSetRoleConstraint implements ValidatorConstraintInterface {
  validate(roleName: string, args: ValidationArguments) {
    const jwt: JwtPayload = args.object['_jwt'] // Inyectado

    // ✅ Solo admins pueden asignar roles de admin
    if (roleName === Role.ADMIN) {
      return hasPermission(jwt.permissions, Permission.USERS_ASSIGN_ADMIN_ROLE)
    }

    return true
  }
}
```

---

## 🆚 Comparación: Entity vs Helpers

### Con Entity (❌ No recomendado)

```typescript
@Get('reports')
async getReports(@CurrentUser('sub') userId: string) {
  // ❌ Query innecesaria solo para verificar permisos
  const user = await this.usersService.findById(userId)

  if (user.hasPermission(Permission.REPORTS_EXPORT)) {
    // ...
  }

  return this.reportsService.findAll()
}
```

### Con Helpers (✅ Recomendado)

```typescript
@Get('reports')
async getReports(@CurrentUser() jwt: JwtPayload) {
  // ✅ Sin query, verificación directa
  if (hasPermission(jwt.permissions, Permission.REPORTS_EXPORT)) {
    // ...
  }

  return this.reportsService.findAll()
}
```

---

## 🔧 Crear tus propios Helpers

Puedes agregar helpers específicos a tu dominio:

```typescript
// src/modules/authorization/utils/permission-helpers.ts

/**
 * Verifica si puede aprobar auditorías
 */
export function canApproveAudits(permissions: Permission[]): boolean {
  return hasAllPermissions(permissions, [
    Permission.AUDITS_READ,
    Permission.AUDITS_UPDATE,
    Permission.AUDITS_APPROVE,
  ])
}

/**
 * Verifica si puede gestionar una organización
 */
export function canManageOrganization(
  jwt: JwtPayload,
  organizationId: string,
): boolean {
  // Admin puede gestionar cualquier organización
  if (isAdmin(jwt.roles)) {
    return true
  }

  // Gerente solo puede gestionar su propia organización
  if (hasRole(jwt.roles, Role.GERENTE)) {
    return jwt.organizationId === organizationId
  }

  return false
}
```

---

## 📊 Ventajas de los Helpers

| Aspecto                 | Métodos en Entity       | Helpers              |
| ----------------------- | ----------------------- | -------------------- |
| **Funciona con JWT**    | ❌ No                   | ✅ Sí                |
| **Funciona con Entity** | ✅ Sí                   | ✅ Sí                |
| **Funciona con arrays** | ❌ No                   | ✅ Sí                |
| **Reutilizable**        | ❌ Solo en entity       | ✅ En todo el código |
| **Testeable**           | ⚠️ Requiere entity mock | ✅ Funciones puras   |
| **Type safe**           | ✅ Sí                   | ✅ Sí                |

---

## 🧪 Testing

Los helpers son funciones puras, fáciles de testear:

```typescript
import { hasRole, hasPermission, isAdmin } from '@authorization'

describe('Permission Helpers', () => {
  it('should check role correctly', () => {
    const roles = [Role.ADMIN, Role.GERENTE]

    expect(hasRole(roles, Role.ADMIN)).toBe(true)
    expect(hasRole(roles, Role.CLIENTE)).toBe(false)
  })

  it('should check if is admin', () => {
    expect(isAdmin([Role.ADMIN])).toBe(true)
    expect(isAdmin([Role.GERENTE])).toBe(false)
  })

  it('should check permissions', () => {
    const permissions = [Permission.USERS_READ, Permission.USERS_CREATE]

    expect(hasPermission(permissions, Permission.USERS_READ)).toBe(true)
    expect(hasPermission(permissions, Permission.USERS_DELETE)).toBe(false)
  })
})
```

---

## 🎯 Recomendaciones

### ✅ DO (Hacer):

1. **Usar helpers con JwtPayload** en controllers y services
2. **Crear helpers específicos** para lógica compleja de negocio
3. **Importar desde @authorization** para tener todo centralizado
4. **Testear helpers** como funciones puras

### ❌ DON'T (No hacer):

1. **No cargar UserEntity** solo para verificar permisos
2. **No usar métodos de entity** (están deprecated)
3. **No duplicar lógica** de verificación en múltiples lugares
4. **No mezclar** verificaciones de entity y helpers

---

## 📝 Migración de Código Existente

### Paso 1: Identificar uso de entity methods

```bash
# Buscar usos de métodos de entity
grep -r "user.hasPermission" src/
grep -r "user.hasRole" src/
```

### Paso 2: Reemplazar

```typescript
// ❌ Antes
if (user.hasPermission(Permission.USERS_CREATE)) {
}

// ✅ Después
if (hasPermission(jwt.permissions, Permission.USERS_CREATE)) {
}
```

### Paso 3: Remover query innecesaria

```typescript
// ❌ Antes
const user = await this.usersService.findById(userId)
if (user.hasRole(Role.ADMIN)) {
}

// ✅ Después
// Usa jwt directamente (ya lo tienes)
if (hasRole(jwt.roles, Role.ADMIN)) {
}
```

---

## 🚀 Resumen

**Los helpers de permisos te permiten:**

- ✅ Verificar permisos sin cargar UserEntity
- ✅ Código más rápido (sin queries)
- ✅ Lógica reutilizable
- ✅ Fácil de testear
- ✅ Type safe

**Usa helpers en:**

- Controllers (con JwtPayload)
- Services (lógica de negocio)
- Guards personalizados
- Validadores
- Testing

---

**¿Necesitas más ejemplos? Revisa `STATELESS-AUTH-GUIDE.md`**

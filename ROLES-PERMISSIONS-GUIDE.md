# Sistema de Roles y Permisos

## Arquitectura: Enum + Tabla (Híbrido)

Este sistema combina lo mejor de dos enfoques:

- **Enum** para type safety y control en código
- **Tabla** para flexibilidad con permisos granulares
- **Seeders** para pre-cargar roles fijos

---

## 🎯 Roles del Sistema

Los roles están definidos como **enum** y **NO son editables** en runtime:

```typescript
enum Role {
  ADMIN = 'admin', // Acceso total
  GERENTE = 'gerente', // Gestión de operaciones
  AUDITOR = 'auditor', // Auditoría y revisión
  CLIENTE = 'cliente', // Acceso básico
}
```

### Jerarquía de roles (por nivel):

| Rol     | Level | Descripción                       |
| ------- | ----- | --------------------------------- |
| ADMIN   | 100   | Acceso completo al sistema        |
| GERENTE | 75    | Gestión de operaciones y reportes |
| AUDITOR | 50    | Revisión y auditoría              |
| CLIENTE | 25    | Acceso básico                     |

---

## 🔐 Permisos Granulares

Los permisos están organizados por módulo:

```typescript
enum Permission {
  // Usuarios
  USERS_CREATE = 'users:create',
  USERS_READ = 'users:read',
  USERS_UPDATE = 'users:update',
  USERS_DELETE = 'users:delete',
  USERS_LIST = 'users:list',

  // Organizaciones
  ORGANIZATIONS_CREATE = 'organizations:create',
  ORGANIZATIONS_READ = 'organizations:read',
  // ... etc
}
```

### Permisos por rol:

| Permiso         | ADMIN | GERENTE | AUDITOR | CLIENTE |
| --------------- | ----- | ------- | ------- | ------- |
| users:create    | ✅    | ❌      | ❌      | ❌      |
| users:read      | ✅    | ✅      | ✅      | ❌      |
| reports:create  | ✅    | ✅      | ❌      | ❌      |
| reports:read    | ✅    | ✅      | ✅      | ✅      |
| audits:approve  | ✅    | ✅      | ❌      | ❌      |
| system:settings | ✅    | ❌      | ❌      | ❌      |

---

## 📦 Estructura de Archivos

```
src/users/
├── enums/
│   ├── role.enum.ts           # Enum de roles + metadata
│   └── permission.enum.ts     # Enum de permisos
├── entities/
│   ├── role.entity.ts         # Entidad con permisos
│   └── user.entity.ts         # Métodos hasRole(), hasPermission()
├── decorators/
│   ├── roles.decorator.ts     # @Roles(...)
│   └── permissions.decorator.ts # @RequirePermissions(...)
├── guards/
│   ├── roles.guard.ts         # Verifica roles
│   └── permissions.guard.ts   # Verifica permisos
└── seeders/
    └── roles.seeder.ts        # Pre-carga roles en DB
```

---

## 🚀 Uso

### 1. Seeder de Roles

Ejecuta el seeder para crear los 4 roles con sus permisos:

```typescript
// En tu script de seeding o command
import { RolesSeeder } from './users/seeders/roles.seeder'

@Injectable()
export class DatabaseSeeder {
  constructor(private readonly rolesSeeder: RolesSeeder) {}

  async seed() {
    await this.rolesSeeder.seed()
  }
}
```

Esto creará en la base de datos:

```sql
INSERT INTO roles (name, displayName, description, permissions, level)
VALUES
  ('admin', 'Administrador', 'Acceso total', ['users:create', 'users:read', ...], 100),
  ('gerente', 'Gerente', 'Gestión', ['users:read', 'reports:create', ...], 75),
  ('auditor', 'Auditor', 'Auditoría', ['users:read', 'audits:create', ...], 50),
  ('cliente', 'Cliente', 'Acceso básico', ['reports:read'], 25);
```

---

### 2. Proteger rutas con decoradores

#### Por Rol:

```typescript
import { Controller, Get, Post } from '@nestjs/common'
import { Roles } from './decorators/roles.decorator'
import { Role } from './enums/role.enum'
import { RolesGuard } from './guards/roles.guard'
import { UseGuards } from '@nestjs/common'

@Controller('users')
@UseGuards(RolesGuard) // Activa el guard
export class UsersController {
  // Solo ADMIN puede crear usuarios
  @Roles(Role.ADMIN)
  @Post()
  async create() {
    return 'Usuario creado'
  }

  // ADMIN o GERENTE pueden listar
  @Roles(Role.ADMIN, Role.GERENTE)
  @Get()
  async findAll() {
    return 'Lista de usuarios'
  }

  // Cualquier usuario autenticado (sin decorator)
  @Get('me')
  async getProfile() {
    return 'Mi perfil'
  }
}
```

#### Por Permisos:

```typescript
import {
  RequirePermissions,
  RequireAnyPermission,
} from './decorators/permissions.decorator'
import { Permission } from './enums/permission.enum'
import { PermissionsGuard } from './guards/permissions.guard'

@Controller('reports')
@UseGuards(PermissionsGuard)
export class ReportsController {
  // Requiere AMBOS permisos
  @RequirePermissions(Permission.REPORTS_CREATE, Permission.REPORTS_UPDATE)
  @Post()
  async create() {
    return 'Reporte creado'
  }

  // Requiere AL MENOS UNO de estos permisos
  @RequireAnyPermission(Permission.REPORTS_READ, Permission.REPORTS_LIST)
  @Get()
  async findAll() {
    return 'Lista de reportes'
  }
}
```

---

### 3. Verificar roles/permisos en código

En servicios o lógica de negocio:

```typescript
import { Injectable } from '@nestjs/common'
import { UserEntity } from './entities/user.entity'
import { Role } from './enums/role.enum'
import { Permission } from './enums/permission.enum'

@Injectable()
export class UsersService {
  async deleteUser(currentUser: UserEntity, targetUserId: string) {
    // Verificar si tiene el rol
    if (!currentUser.hasRole(Role.ADMIN)) {
      throw new ForbiddenException('Solo admin puede eliminar usuarios')
    }

    // Verificar si tiene el permiso
    if (!currentUser.hasPermission(Permission.USERS_DELETE)) {
      throw new ForbiddenException('No tienes permiso para eliminar usuarios')
    }

    // Lógica de eliminación
  }

  async approveAudit(currentUser: UserEntity, auditId: string) {
    // Verificar múltiples roles
    if (!currentUser.hasAnyRole([Role.ADMIN, Role.GERENTE])) {
      throw new ForbiddenException('No puedes aprobar auditorías')
    }

    // O verificar permisos
    if (!currentUser.hasPermission(Permission.AUDITS_APPROVE)) {
      throw new ForbiddenException('No tienes permiso para aprobar')
    }
  }

  async exportReport(currentUser: UserEntity) {
    // Obtener todos los permisos del usuario
    const permissions = currentUser.getAllPermissions()
    console.log('Permisos del usuario:', permissions)

    if (!permissions.includes(Permission.REPORTS_EXPORT)) {
      throw new ForbiddenException('No puedes exportar reportes')
    }
  }
}
```

---

### 4. Asignar roles a usuarios

```typescript
@Injectable()
export class UsersService {
  async createUser(dto: CreateUserDto) {
    // Buscar roles por nombre
    const roles = await this.roleRepository.find({
      where: {
        name: In([Role.GERENTE, Role.AUDITOR]), // Type-safe!
      },
    })

    const user = this.userRepository.create({
      ...dto,
      roles, // Asignar múltiples roles
    })

    return await this.userRepository.save(user)
  }

  async addRoleToUser(userId: string, roleName: Role) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    })

    const role = await this.roleRepository.findOne({
      where: { name: roleName },
    })

    if (!user.roles.some((r) => r.name === roleName)) {
      user.roles.push(role)
      await this.userRepository.save(user)
    }
  }
}
```

---

## 🔧 Configuración

### 1. Registrar Guards globalmente (opcional)

```typescript
// app.module.ts
import { APP_GUARD } from '@nestjs/core'
import { RolesGuard } from './users/guards/roles.guard'
import { PermissionsGuard } from './users/guards/permissions.guard'

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // Activa RolesGuard globalmente
    },
    // O PermissionsGuard
  ],
})
export class AppModule {}
```

### 2. Exportar para otros módulos

```typescript
// users.module.ts
@Module({
  exports: [RolesGuard, PermissionsGuard, RolesSeeder],
})
export class UsersModule {}
```

---

## 📋 Agregar nuevos permisos

### 1. Actualizar el enum

```typescript
// permission.enum.ts
export enum Permission {
  // ... permisos existentes

  // Nuevos permisos
  INVOICES_CREATE = 'invoices:create',
  INVOICES_READ = 'invoices:read',
  INVOICES_EXPORT = 'invoices:export',
}
```

### 2. Actualizar el seeder

```typescript
// roles.seeder.ts
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    // ... permisos existentes
    Permission.INVOICES_CREATE,
    Permission.INVOICES_READ,
    Permission.INVOICES_EXPORT,
  ],

  [Role.GERENTE]: [
    // ... permisos existentes
    Permission.INVOICES_READ,
    Permission.INVOICES_EXPORT,
  ],

  // ... otros roles
}
```

### 3. Ejecutar el seeder

```bash
npm run seed # o tu comando de seeding
```

Los roles se **actualizarán** con los nuevos permisos automáticamente.

---

## ✅ Ventajas de este enfoque

| Característica          | ✅ Ventaja                               |
| ----------------------- | ---------------------------------------- |
| **Type Safety**         | El enum previene errores de typo         |
| **Roles fijos**         | No se pueden crear/editar desde la app   |
| **Múltiples roles**     | Un usuario puede tener varios roles      |
| **Permisos granulares** | Control fino sobre acciones              |
| **Centralizado**        | Un solo lugar para gestionar permisos    |
| **Fácil de usar**       | Decorators simples: `@Roles(Role.ADMIN)` |
| **Testeable**           | Fácil de mockear y probar                |
| **Documentado**         | El código se auto-documenta              |

---

## 🧪 Testing

```typescript
describe('UsersController', () => {
  it('should allow admin to create users', async () => {
    const mockUser = {
      hasRole: jest.fn().mockReturnValue(true),
      hasPermission: jest.fn().mockReturnValue(true),
    } as any

    // Test con usuario admin
    const result = await controller.create(mockUser, createDto)
    expect(result).toBeDefined()
  })

  it('should deny non-admin to create users', async () => {
    const mockUser = {
      hasRole: jest.fn().mockReturnValue(false),
    } as any

    await expect(controller.create(mockUser, createDto)).rejects.toThrow(
      ForbiddenException,
    )
  })
})
```

---

## 📝 Resumen

1. **4 roles fijos**: admin, gerente, auditor, cliente (enum)
2. **Permisos granulares**: Definidos por módulo (enum)
3. **Tabla en DB**: Almacena roles con sus permisos
4. **Seeder**: Pre-carga roles automáticamente
5. **Guards**: Protege rutas con `@Roles()` y `@RequirePermissions()`
6. **Métodos helper**: `user.hasRole()`, `user.hasPermission()`
7. **Type-safe**: Todo con TypeScript, sin strings mágicos

**Conclusión:** Sistema robusto, type-safe y fácil de mantener. Los roles no son editables, pero los permisos se pueden ajustar en el seeder.

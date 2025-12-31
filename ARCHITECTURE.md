# Arquitectura del Sistema

## Visión General

Este documento describe la arquitectura del sistema, organizado en una arquitectura por capas que separa claramente la infraestructura, utilidades compartidas y lógica de negocio.

## Organización por Capas

El proyecto está organizado en tres capas principales:

```
src/
├── @core/                     # 🏗️ Infraestructura y Framework
│   ├── config/               # Configuraciones del sistema
│   ├── database/             # Migrations, seeds, transaction manager
│   ├── logger/               # Sistema de logging
│   ├── entities/             # Entidad base
│   ├── repositories/         # Repositorio base
│   └── core.module.ts        # Módulo global de infraestructura
│
├── @shared/                   # 🔧 Utilidades Compartidas
│   └── testing/              # Mocks y helpers para testing
│
└── modules/                   # 💼 Lógica de Negocio
    ├── auth/                 # Autenticación
    ├── authorization/        # Roles y permisos
    ├── users/                # Gestión de usuarios
    ├── organizations/        # Organizaciones
    ├── templates/            # Plantillas
    ├── audits/               # Auditorías
    ├── maturity-frameworks/  # Frameworks de madurez
    ├── reports/              # Reportes
    └── notifications/        # Notificaciones WebSocket
```

### Path Aliases Configurados

```typescript
"@core"           → "src/@core"
"@shared"         → "src/@shared"
"@modules"        → "src/modules"
"@auth"           → "src/modules/auth"
"@authorization"  → "src/modules/authorization"
"@users"          → "src/modules/users"
"@organizations"  → "src/modules/organizations"
"@templates"      → "src/modules/templates"
"@audits"         → "src/modules/audits"
"@frameworks"     → "src/modules/maturity-frameworks"
"@reports"        → "src/modules/reports"
"@notifications"  → "src/modules/notifications"
```

## Módulos de Negocio

### 1. Authorization Module (`src/modules/authorization/`)

**Responsabilidad:** Gestión de roles y permisos del sistema.

**Componentes:**

- `entities/role.entity.ts` - Entidad de roles con permisos
- `enums/role.enum.ts` - Enumeración de roles fijos (ADMIN, GERENTE, CLIENTE, AUDITOR)
- `enums/permission.enum.ts` - Enumeración de permisos granulares
- `guards/roles.guard.ts` - Guard para verificar roles
- `guards/permissions.guard.ts` - Guard para verificar permisos
- `decorators/roles.decorator.ts` - Decorador `@Roles()`
- `decorators/permissions.decorator.ts` - Decorador `@RequirePermissions()`
- `seeders/roles.seeder.ts` - Seeder para inicializar roles

**Características clave:**

- Los roles son **fijos** y no se pueden crear/editar en runtime
- Usa un enfoque híbrido: Enum + Tabla
- Los roles tienen un `level` para jerarquía
- Los permisos se almacenan como array en cada rol
- Proporciona guards reutilizables para proteger endpoints

**Exports:**

```typescript
// Entities
export { RoleEntity }

// Enums
export { Role, Permission }

// Guards
export { RolesGuard, PermissionsGuard }

// Decorators
export { Roles, RequirePermissions }
```

### 2. Auth Module (`src/modules/auth/`)

**Responsabilidad:** Autenticación de usuarios (login, registro, tokens).

**Componentes:**

- `auth.service.ts` - Lógica de autenticación
- `auth.controller.ts` - Endpoints de autenticación
- `entities/refresh-token.entity.ts` - Tokens de refresco
- `strategies/local.strategy.ts` - Estrategia Passport Local
- `strategies/jwt.strategy.ts` - Estrategia Passport JWT
- `guards/jwt-auth.guard.ts` - Guard global de autenticación
- `guards/local-auth.guard.ts` - Guard para login
- `decorators/public.decorator.ts` - Marca rutas públicas
- `decorators/current-user.decorator.ts` - Obtiene usuario actual
- `dtos/` - DTOs para login, registro, etc.

**Características clave:**

- Implementa OAuth 2.0 con JWT
- Access tokens: 15 minutos
- Refresh tokens: 7 días
- Token rotation para seguridad
- Revocación automática de tokens al cambiar contraseña
- Almacena refresh tokens hasheados en BD
- Tracking de IP y User-Agent

**Endpoints:**

- `POST /auth/register` - Registro de nuevos usuarios
- `POST /auth/login` - Login con email/password
- `POST /auth/refresh` - Renovar access token
- `POST /auth/logout` - Cerrar sesión
- `GET /auth/me` - Obtener usuario actual
- `POST /auth/change-password` - Cambiar contraseña

**Dependencias:**

- Depende de `UsersModule` para crear/buscar usuarios
- Depende de `AuthorizationModule` para asignar roles
- NO tiene lógica de roles/permisos (solo asigna rol CLIENTE por defecto en registro)

### 3. Users Module (`src/modules/users/`)

**Responsabilidad:** Gestión de datos de usuarios (CRUD).

**Componentes:**

- `entities/user.entity.ts` - Entidad de usuario
- `services/users.service.ts` - Lógica de negocio de usuarios
- `controllers/users.controller.ts` - Endpoints CRUD de usuarios
- `repositories/users.repository.ts` - Acceso a datos
- `factories/user.factory.ts` - Factory para crear/actualizar usuarios
- `dtos/` - DTOs para crear/actualizar usuarios

**Características clave:**

- Implementa patrón Repository
- Usa TransactionManager para contexto automático
- Validaciones de unicidad (email, username, CI)
- Relación ManyToMany con roles
- Métodos helper en entidad: `hasRole()`, `hasPermission()`, etc.
- Separado de la lógica de autenticación

**Dependencias:**

- Depende de `AuthorizationModule` para la entidad `RoleEntity`
- NO maneja autenticación (eso es responsabilidad de `AuthModule`)
- NO maneja guards de roles/permisos (eso es responsabilidad de `AuthorizationModule`)

## Flujo de Autenticación y Autorización

### 1. Registro de Usuario

```
Cliente → POST /auth/register
    ↓
AuthService.register()
    ↓
UsersRepository.create() → Crea usuario
    ↓
RoleRepository.findOne({ name: 'cliente' }) → Asigna rol por defecto
    ↓
Hash password con bcrypt
    ↓
AuthService.generateAuthResponse() → Genera tokens
    ↓
Guarda refresh token hasheado en BD
    ↓
Retorna: { accessToken, refreshToken, user }
```

### 2. Login

```
Cliente → POST /auth/login { email, password }
    ↓
LocalAuthGuard → LocalStrategy.validate()
    ↓
AuthService.validateUser() → Verifica password con bcrypt
    ↓
AuthController.login()
    ↓
AuthService.generateAuthResponse() → Genera tokens
    ↓
Retorna: { accessToken, refreshToken, user }
```

### 3. Acceso a Ruta Protegida

```
Cliente → GET /users (con Bearer token en header)
    ↓
JwtAuthGuard (global) → Verifica si ruta tiene @Public()
    ↓
Si no es pública → JwtStrategy.validate()
    ↓
Verifica token JWT y extrae payload
    ↓
Busca usuario en BD con roles
    ↓
Inyecta user en request.user
    ↓
RolesGuard/PermissionsGuard (si aplica)
    ↓
Verifica roles/permisos del usuario
    ↓
UsersController.findAll()
```

### 4. Verificación de Roles

```
@Roles(Role.ADMIN, Role.GERENTE)
@Get('admin-only')
adminOnly() { ... }

↓

RolesGuard.canActivate()
    ↓
Lee metadatos de @Roles()
    ↓
Obtiene user.roles desde request.user
    ↓
Verifica si user.roles incluye alguno de los roles requeridos
    ↓
Permite o deniega acceso
```

### 5. Verificación de Permisos

```
@RequirePermissions(Permission.USERS_DELETE)
@Delete(':id')
remove() { ... }

↓

PermissionsGuard.canActivate()
    ↓
Lee metadatos de @RequirePermissions()
    ↓
Obtiene user.roles desde request.user
    ↓
Extrae todos los permissions de los roles del usuario
    ↓
Verifica si tiene todos los permisos requeridos
    ↓
Permite o deniega acceso
```

## Principios de Diseño

### Separación de Responsabilidades

1. **Authentication (¿Quién eres?)** → `AuthModule`
   - Verifica identidad (email/password)
   - Genera y valida tokens
   - Gestiona sesiones

2. **Authorization (¿Qué puedes hacer?)** → `AuthorizationModule`
   - Define roles y permisos
   - Proporciona guards para verificar acceso
   - Gestiona jerarquía de roles

3. **User Management (¿Quién existe?)** → `UsersModule`
   - CRUD de usuarios
   - Datos personales
   - Relación con organizaciones

### Patrón Repository

```
Controller → Service → Repository → Database
```

- **Interface primero:** `IUsersRepository` define el contrato
- **Inyección de dependencias:** Services dependen de interfaces, no implementaciones
- **BaseRepository genérico:** CRUD común reutilizable
- **Extensiones específicas:** Métodos custom en repositories específicos
- **TransactionManager:** Contexto automático usando AsyncLocalStorage

### Factory Pattern

```typescript
UserFactory.createFromDto(dto, roles) → UserEntity
UserFactory.updateFromDto(entity, dto, roles) → UserEntity
UserFactory.toResponse(entity) → ResponseDto
```

Ventajas:

- Lógica de transformación centralizada
- Validaciones y sanitización consistentes
- Fácil de testear

### Guards y Decorators

```typescript
// Guard global - Protege todas las rutas por defecto
{ provide: APP_GUARD, useClass: JwtAuthGuard }

// Excepciones - Rutas públicas
@Public()
@Post('login')

// Roles específicos
@Roles(Role.ADMIN)
@Get('admin-only')

// Permisos granulares
@RequirePermissions(Permission.USERS_DELETE)
@Delete(':id')
```

## Estructura de Base de Datos

### Tablas Principales

1. **users**
   - Datos personales del usuario
   - Relación con organization (ManyToOne)
   - Password hasheado (select: false)

2. **roles**
   - 4 roles fijos (seeded)
   - Nombre (enum)
   - Permisos (simple-array)
   - Level (jerarquía)

3. **user_roles** (join table)
   - userId
   - roleId
   - Relación ManyToMany

4. **refresh_tokens**
   - Token hasheado (único)
   - userId (FK)
   - expiresAt
   - isRevoked
   - ipAddress, userAgent (tracking)

## Seguridad

### Password Hashing

- Bcrypt con 10 salt rounds
- Password almacenado con `select: false` (no se expone por defecto)

### Token Security

- JWT con secreto configurado en .env
- Access tokens cortos (15 min) para limitar exposición
- Refresh tokens largos (7 días) pero revocables
- Refresh tokens hasheados en BD (no plaintext)
- Token rotation: token viejo se revoca al generar uno nuevo
- Revocación automática de todos los tokens al cambiar password

### Guards Hierarchy

1. `JwtAuthGuard` (global) - Verifica autenticación
2. `RolesGuard` - Verifica roles (si se aplica @Roles)
3. `PermissionsGuard` - Verifica permisos (si se aplica @RequirePermissions)

## Testing

### Mock Factories

```typescript
// Repositorios
createMockRepository<T>() → Mock de IBaseRepository<T>
createExtendedMockRepository<T, R>() → Mock de repository específico
createMockUsersRepository() → Mock de IUsersRepository

// Servicios
createMockTransactionManager() → Mock de TransactionManager
```

Ventajas:

- Código de test más limpio
- Consistencia en mocks
- Fácil mantenimiento

### Test Strategy

1. **Unit tests:** Services y Factories
   - Mock todas las dependencias
   - Usa factories de mocks
   - Verifica lógica de negocio aislada

2. **Integration tests:** Controllers y Guards
   - Mock solo la BD
   - Verifica interacción entre componentes
   - Usa supertest para requests HTTP

3. **E2E tests:** Flujos completos
   - BD de test real
   - Verifica flujos end-to-end
   - Seeds de datos de prueba

## Imports y Exports

### Authorization Module

```typescript
// Import
import { Role, Permission, RoleEntity, RolesGuard, PermissionsGuard } from '@authorization'

// Ubicación
src/modules/authorization/
```

### Auth Module

```typescript
// Import
import { AuthService } from '@auth'
import { Public, CurrentUser } from '@auth'

// Ubicación
src/modules/auth/
```

### Users Module

```typescript
// Import
import { UserEntity, UsersService } from '@users'

// Ubicación
src/modules/users/
```

## Configuración de AppModule

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ ... }),
    CoreModule,            // Primero - infraestructura global (TransactionManager)
    LoggerModule,          // Segundo - logging
    AuthorizationModule,   // Tercero - roles y permisos
    AuthModule,            // Cuarto - autenticación (usa authorization)
    UsersModule,           // Quinto - usuarios (usa authorization)
    // ... otros módulos
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Guard global
    },
  ],
})
```

El orden importa:

1. `CoreModule` - Provee TransactionManager global
2. `LoggerModule` - Sistema de logging
3. `AuthorizationModule` - Define roles/permisos
4. `AuthModule` - Usa roles para asignar al registrar
5. `UsersModule` - Usa roles en relaciones

## Mejores Prácticas

1. **Usar path aliases en lugar de rutas relativas** - `@core`, `@shared`, `@users`, `@auth`, etc.
2. **Nunca importar desde rutas antiguas** - Usar `@authorization` no `../authorization`
3. **Guards específicos antes que genéricos** - @RequirePermissions es más específico que @Roles
4. **Interfaces sobre implementaciones** - Inyectar `IUsersRepository`, no `UsersRepository`
5. **Factory para transformaciones** - No transformar DTOs en controllers
6. **TransactionManager para consistencia** - Usar `runInTransaction()` para operaciones múltiples
7. **@Public() explícito** - Marcar rutas públicas claramente
8. **Validación en DTOs** - class-validator en DTOs, no en services

## Próximos Pasos Sugeridos

1. **Testing completo**
   - Unit tests para todos los services
   - Integration tests para guards
   - E2E tests para flujos de auth

2. **Rate limiting**
   - Throttler para prevenir brute force
   - Específicamente en `/auth/login`

3. **Auditoría**
   - Log de accesos
   - Tracking de cambios en usuarios/roles

4. **Email verification**
   - Verificar email al registrar
   - Reset password por email

5. **2FA (Opcional)**
   - TOTP para usuarios admin
   - SMS para operaciones críticas

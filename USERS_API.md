# API de Usuarios - Documentación

CRUD completo de usuarios con Value Objects (patrón DDD) y TypeORM.

## Características

- ✅ Value Objects para validación de dominio
- ✅ Validación con class-validator
- ✅ Relación muchos a muchos con Roles
- ✅ Relación muchos a uno con Organization
- ✅ Endpoints REST completos
- ✅ Soft delete (desactivación)
- ✅ Búsqueda por email, username, CI
- ✅ Filtrado por organización

## Estructura

```
src/users/
├── domain/
│   ├── entities/
│   │   ├── user.entity.ts          # Entidad principal
│   │   ├── role.entity.ts          # Roles del sistema
│   │   └── organization.entity.ts  # Organizaciones
│   └── value-objects/              # Value Objects para validación
│       ├── user-name.vo.ts
│       ├── user-email.vo.ts
│       ├── user-username.vo.ts
│       ├── user-ci.vo.ts
│       ├── user-phone.vo.ts
│       ├── user-address.vo.ts
│       └── user-image.vo.ts
├── application/
│   ├── dtos/
│   │   ├── create-user.dto.ts
│   │   └── update-user.dto.ts
│   └── services/
│       └── users.service.ts
├── infrastructure/
│   └── controllers/
│       └── users.controller.ts
└── users.module.ts
```

## Modelo de Datos

### User (Usuario)

| Campo          | Tipo      | Descripción                        | Requerido |
| -------------- | --------- | ---------------------------------- | --------- |
| id             | UUID      | Identificador único                | Auto      |
| names          | string    | Nombres del usuario                | Sí        |
| lastNames      | string    | Apellidos del usuario              | Sí        |
| fullName       | string    | Nombre completo (calculado)        | Auto      |
| email          | string    | Email (único)                      | Sí        |
| username       | string    | Username (único)                   | Sí        |
| ci             | string    | Cédula de identidad (único)        | Sí        |
| phone          | string    | Teléfono                           | No        |
| address        | string    | Dirección                          | No        |
| image          | string    | URL de imagen                      | No        |
| status         | enum      | Estado (active/inactive/suspended) | Auto      |
| organizationId | UUID      | ID de organización                 | No        |
| roles          | Role[]    | Roles asignados                    | No        |
| createdAt      | timestamp | Fecha de creación                  | Auto      |
| updatedAt      | timestamp | Fecha de actualización             | Auto      |

### Role (Rol)

| Campo       | Tipo    | Descripción            |
| ----------- | ------- | ---------------------- |
| id          | UUID    | Identificador único    |
| name        | string  | Nombre del rol (único) |
| description | string  | Descripción del rol    |
| isActive    | boolean | Estado activo/inactivo |

### Organization (Organización)

| Campo       | Tipo    | Descripción            |
| ----------- | ------- | ---------------------- |
| id          | UUID    | Identificador único    |
| name        | string  | Nombre (único)         |
| description | string  | Descripción            |
| address     | string  | Dirección              |
| phone       | string  | Teléfono               |
| email       | string  | Email                  |
| isActive    | boolean | Estado activo/inactivo |

## API Endpoints

### Crear Usuario

```http
POST /users
Content-Type: application/json

{
  "names": "Juan Carlos",
  "lastNames": "Pérez Gómez",
  "email": "juan.perez@example.com",
  "username": "juanperez",
  "ci": "12345678",
  "phone": "+591 70123456",          // opcional
  "address": "Av. Principal #123",   // opcional
  "image": "https://...",             // opcional
  "status": "active",                 // opcional (default: active)
  "organizationId": "uuid",           // opcional
  "roleIds": ["uuid1", "uuid2"]       // opcional
}
```

**Respuesta 201 Created:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "names": "Juan Carlos",
  "lastNames": "Pérez Gómez",
  "fullName": "Juan Carlos Pérez Gómez",
  "email": "juan.perez@example.com",
  "username": "juanperez",
  "ci": "12345678",
  "phone": "+591 70123456",
  "address": "Av. Principal #123",
  "image": "https://...",
  "status": "active",
  "organizationId": "uuid",
  "roles": [
    {
      "id": "uuid1",
      "name": "admin",
      "description": "Administrador del sistema"
    }
  ],
  "createdAt": "2025-12-28T10:00:00.000Z",
  "updatedAt": "2025-12-28T10:00:00.000Z"
}
```

### Listar Todos los Usuarios

```http
GET /users
```

**Respuesta 200 OK:**

```json
[
  {
    "id": "...",
    "names": "Juan Carlos",
    "lastNames": "Pérez Gómez",
    "fullName": "Juan Carlos Pérez Gómez",
    "email": "juan.perez@example.com",
    "username": "juanperez",
    "ci": "12345678",
    "phone": "+591 70123456",
    "address": "Av. Principal #123",
    "image": null,
    "status": "active",
    "organizationId": "uuid",
    "roles": [...],
    "createdAt": "2025-12-28T10:00:00.000Z",
    "updatedAt": "2025-12-28T10:00:00.000Z"
  }
]
```

### Filtrar por Organización

```http
GET /users?organizationId=uuid
```

### Obtener Usuario por ID

```http
GET /users/:id
```

### Obtener Usuario por Email

```http
GET /users/email/:email
```

### Obtener Usuario por Username

```http
GET /users/username/:username
```

### Obtener Usuario por CI

```http
GET /users/ci/:ci
```

### Actualizar Usuario

```http
PATCH /users/:id
Content-Type: application/json

{
  "names": "Juan Carlos Actualizado",
  "phone": "+591 70999999",
  "status": "inactive",
  "roleIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Nota:** Todos los campos son opcionales en el UPDATE.

### Eliminar Usuario (Hard Delete)

```http
DELETE /users/:id
```

**Respuesta:** 204 No Content

### Desactivar Usuario (Soft Delete)

```http
PATCH /users/:id/deactivate
```

Cambia el status a `inactive`.

## Validaciones

### Names / LastNames

- Mínimo 2 caracteres
- Máximo 50 caracteres
- Solo letras (incluyendo tildes y ñ)
- No puede estar vacío

### Email

- Formato email válido
- Máximo 100 caracteres
- Único en el sistema
- Se convierte a minúsculas automáticamente

### Username

- Mínimo 3 caracteres
- Máximo 30 caracteres
- Solo minúsculas, números y guiones bajos
- Único en el sistema
- Se convierte a minúsculas automáticamente

### CI (Cédula de Identidad)

- Formato: 7-10 dígitos, opcionalmente seguido de guión y 1-3 caracteres
- Ejemplos válidos: `12345678`, `12345678-1A`, `1234567-SC`
- Único en el sistema

### Phone

- 7-20 caracteres
- Puede contener dígitos, espacios, guiones, +, paréntesis
- Opcional

### Address

- Mínimo 5 caracteres
- Máximo 200 caracteres
- Opcional

### Image

- Debe ser una URL válida
- Opcional

### Status

- Valores permitidos: `active`, `inactive`, `suspended`
- Default: `active`

## Errores Comunes

### 400 Bad Request

**Email duplicado:**

```json
{
  "statusCode": 409,
  "message": "El email ya está registrado"
}
```

**Username duplicado:**

```json
{
  "statusCode": 409,
  "message": "El username ya está en uso"
}
```

**CI duplicado:**

```json
{
  "statusCode": 409,
  "message": "El CI ya está registrado"
}
```

**Validación fallida:**

```json
{
  "statusCode": 400,
  "message": [
    "El nombre debe tener al menos 2 caracteres",
    "El email no es válido"
  ]
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Usuario con ID xxx no encontrado"
}
```

## Ejemplos con cURL

### Crear usuario

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "names": "María Elena",
    "lastNames": "García López",
    "email": "maria.garcia@example.com",
    "username": "mariagarcia",
    "ci": "87654321",
    "phone": "+591 71234567",
    "address": "Calle 10 #456",
    "organizationId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### Listar usuarios

```bash
curl http://localhost:3000/users
```

### Obtener usuario por email

```bash
curl http://localhost:3000/users/email/maria.garcia@example.com
```

### Actualizar usuario

```bash
curl -X PATCH http://localhost:3000/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+591 79999999",
    "address": "Nueva dirección #789"
  }'
```

### Desactivar usuario

```bash
curl -X PATCH http://localhost:3000/users/550e8400-e29b-41d4-a716-446655440000/deactivate
```

### Eliminar usuario

```bash
curl -X DELETE http://localhost:3000/users/550e8400-e29b-41d4-a716-446655440000
```

## Value Objects

Los Value Objects garantizan la validación en el dominio:

```typescript
// Ejemplo de creación con validación
const userName = new UserName('Juan') // ✅ OK
const userName = new UserName('J') // ❌ Error: mínimo 2 caracteres
const userName = new UserName('123') // ❌ Error: solo letras

const email = new UserEmail('user@example.com') // ✅ OK
const email = new UserEmail('invalid') // ❌ Error: email inválido

const username = new UserUsername('john_doe') // ✅ OK
const username = new UserUsername('John_Doe') // ❌ Error: solo minúsculas
```

## Uso Programático

```typescript
import { UsersService } from './users/application/services/users.service';

// Inyectar el servicio
constructor(private readonly usersService: UsersService) {}

// Crear usuario
const user = await this.usersService.create({
  names: 'Pedro',
  lastNames: 'Ramírez',
  email: 'pedro@example.com',
  username: 'pedror',
  ci: '11223344',
});

// Buscar por email
const user = await this.usersService.findByEmail('pedro@example.com');

// Actualizar
await this.usersService.update(userId, {
  phone: '+591 70111222',
});

// Desactivar
await this.usersService.softDelete(userId);

// Eliminar
await this.usersService.remove(userId);
```

## Testing

```bash
# Asegúrate de que PostgreSQL esté corriendo
docker-compose up -d postgres

# Inicia el servidor
npm run start:dev

# El servidor creará las tablas automáticamente
# Ahora puedes probar los endpoints
```

## Base de Datos

Las tablas se crean automáticamente con TypeORM:

- `users` - Tabla de usuarios
- `roles` - Tabla de roles
- `organizations` - Tabla de organizaciones
- `user_roles` - Tabla intermedia para relación muchos a muchos

## Próximos Pasos

1. ✅ CRUD de usuarios completo
2. ⏳ Autenticación y autorización
3. ⏳ Middleware de permisos por rol
4. ⏳ Upload de imágenes
5. ⏳ Paginación y filtros avanzados

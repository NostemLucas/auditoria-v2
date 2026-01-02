# Guía de Excepciones Personalizadas

Sistema de excepciones personalizadas para manejo de errores estandarizado y respuestas HTTP claras.

## 🎯 Objetivo

Reemplazar el uso de `throw new Error()` y excepciones genéricas de NestJS por excepciones personalizadas específicas del dominio.

### Antes vs Después

**❌ ANTES: Excepciones genéricas**

```typescript
// Poco específico
throw new Error('Usuario no encontrado')

// Mensaje no estandarizado
throw new NotFoundException('Usuario con ID 123 no encontrado')

// Sin metadata
throw new ConflictException('El email ya está registrado')
```

**✅ DESPUÉS: Excepciones personalizadas**

```typescript
// Específica y con metadata
throw new UserNotFoundByIdException('123')

// Mensaje estandarizado
throw new EmailAlreadyExistsException('user@example.com')

// Con metadata estructurada
{
  "message": "El email user@example.com ya está registrado",
  "statusCode": 409,
  "error": "CONFLICT",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "errorCode": "EMAIL_ALREADY_EXISTS",
  "field": "email",
  "value": "user@example.com"
}
```

---

## 📋 Excepciones Disponibles

### 1. **UserNotFoundException** - Usuario no encontrado

#### UserNotFoundByIdException

```typescript
throw new UserNotFoundByIdException('user-123')
```

**Response HTTP:**

```json
{
  "message": "Usuario no encontrado con id: user-123",
  "statusCode": 404,
  "error": "NOT_FOUND",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "errorCode": "USER_NOT_FOUND",
  "field": "id",
  "value": "user-123"
}
```

#### UserNotFoundByEmailException

```typescript
throw new UserNotFoundByEmailException('user@example.com')
```

#### UserNotFoundByUsernameException

```typescript
throw new UserNotFoundByUsernameException('johndoe')
```

---

### 2. **EmailAlreadyExistsException** - Email ya registrado

```typescript
// Sin excluir ID (create)
throw new EmailAlreadyExistsException('user@example.com')

// Excluyendo ID (update)
throw new EmailAlreadyExistsException('user@example.com', 'user-123')
```

**Response HTTP:**

```json
{
  "message": "El email user@example.com ya está registrado",
  "statusCode": 409,
  "error": "CONFLICT",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "errorCode": "EMAIL_ALREADY_EXISTS",
  "field": "email",
  "value": "user@example.com",
  "context": {
    "excludeId": "user-123" // Solo si se proporcionó
  }
}
```

---

### 3. **UsernameAlreadyExistsException** - Username en uso

```typescript
throw new UsernameAlreadyExistsException('johndoe')
```

**Response HTTP:**

```json
{
  "message": "El username johndoe ya está en uso",
  "statusCode": 409,
  "error": "CONFLICT",
  "errorCode": "USERNAME_ALREADY_EXISTS",
  "field": "username",
  "value": "johndoe"
}
```

---

### 4. **CiAlreadyExistsException** - CI ya registrado

```typescript
throw new CiAlreadyExistsException('12345678')
```

**Response HTTP:**

```json
{
  "message": "El CI 12345678 ya está registrado",
  "statusCode": 409,
  "error": "CONFLICT",
  "errorCode": "CI_ALREADY_EXISTS",
  "field": "ci",
  "value": "12345678"
}
```

---

### 5. **InvalidUserDataException** - Datos inválidos

```typescript
// Genérico
throw new InvalidUserDataException('Los datos del usuario son inválidos')

// Con campo específico
throw new InvalidUserDataException(
  'El formato del email es inválido',
  'email',
  'invalid-email',
)
```

**Response HTTP:**

```json
{
  "message": "El formato del email es inválido",
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "errorCode": "INVALID_USER_DATA",
  "field": "email",
  "value": "invalid-email"
}
```

---

### 6. **UserInactiveException** - Usuario inactivo

```typescript
throw new UserInactiveException('user-123')
```

**Response HTTP:**

```json
{
  "message": "El usuario con ID user-123 está inactivo",
  "statusCode": 403,
  "error": "FORBIDDEN",
  "errorCode": "USER_INACTIVE",
  "userId": "user-123"
}
```

---

### 7. **UserCannotBeDeletedException** - No se puede eliminar

```typescript
throw new UserCannotBeDeletedException(
  'user-123',
  'El usuario tiene auditorías asociadas',
)
```

**Response HTTP:**

```json
{
  "message": "El usuario con ID user-123 no puede ser eliminado: El usuario tiene auditorías asociadas",
  "statusCode": 403,
  "error": "FORBIDDEN",
  "errorCode": "USER_CANNOT_BE_DELETED",
  "userId": "user-123",
  "context": {
    "reason": "El usuario tiene auditorías asociadas"
  }
}
```

---

### 8. **InvalidUserFileException** - Archivo inválido

```typescript
throw new InvalidUserFileException(
  'El avatar debe ser una imagen JPG, PNG o WebP',
  'avatar',
)
```

**Response HTTP:**

```json
{
  "message": "El avatar debe ser una imagen JPG, PNG o WebP",
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "errorCode": "INVALID_USER_FILE",
  "field": "avatar"
}
```

---

## 🏗️ Arquitectura

### Jerarquía de Excepciones

```
HttpException (NestJS)
    ↓
UserException (Base personalizada)
    ↓
    ├─ UserNotFoundException
    │   ├─ UserNotFoundByIdException
    │   ├─ UserNotFoundByEmailException
    │   └─ UserNotFoundByUsernameException
    ├─ EmailAlreadyExistsException
    ├─ UsernameAlreadyExistsException
    ├─ CiAlreadyExistsException
    ├─ InvalidUserDataException
    ├─ UserInactiveException
    ├─ UserCannotBeDeletedException
    └─ InvalidUserFileException
```

### UserException Base

```typescript
export class UserException extends HttpException {
  public readonly metadata: UserExceptionMetadata

  constructor(
    message: string,
    status: HttpStatus,
    metadata: UserExceptionMetadata = {},
  ) {
    super(
      {
        message,
        statusCode: status,
        error: HttpStatus[status],
        timestamp: new Date().toISOString(),
        ...metadata,
      },
      status,
    )

    this.metadata = metadata
    this.name = this.constructor.name
  }
}
```

### Metadata

```typescript
interface UserExceptionMetadata {
  errorCode?: string // Código interno: "USER_NOT_FOUND"
  userId?: string // ID del usuario relacionado
  field?: string // Campo: "email", "username", "ci"
  value?: string // Valor que causó el error
  context?: Record<string, unknown> // Info adicional
}
```

---

## 📖 Ejemplos de Uso

### Ejemplo 1: Validación de Unicidad

```typescript
// users-validation.service.ts

async validateUniqueness(
  data: { email?: string; username?: string; ci?: string },
  excludeId?: string,
): Promise<void> {
  if (data.email) {
    const exists = await this.usersRepository.existsByEmail(data.email, excludeId)
    if (exists) {
      throw new EmailAlreadyExistsException(data.email, excludeId)
    }
  }

  if (data.username) {
    const exists = await this.usersRepository.existsByUsername(data.username, excludeId)
    if (exists) {
      throw new UsernameAlreadyExistsException(data.username, excludeId)
    }
  }

  if (data.ci) {
    const exists = await this.usersRepository.existsByCI(data.ci, excludeId)
    if (exists) {
      throw new CiAlreadyExistsException(data.ci, excludeId)
    }
  }
}
```

---

### Ejemplo 2: Verificar Existencia de Usuario

```typescript
// users-validation.service.ts

async ensureUserExists(userId: string): Promise<UserEntity> {
  const user = await this.usersRepository.findById(userId)

  if (!user) {
    throw new UserNotFoundByIdException(userId)
  }

  return user
}
```

---

### Ejemplo 3: Handler con Excepciones

```typescript
// upload-avatar.handler.ts

async execute(command: UploadAvatarCommand): Promise<UserEntity> {
  // 1. Verificar que el usuario exista
  const user = await this.usersRepository.findById(command.userId)
  if (!user) {
    throw new UserNotFoundByIdException(command.userId)
  }

  // 2. Subir archivo
  try {
    const uploadResult = await this.filesService.replaceFile(
      user.image,
      {
        file: command.file,
        folder: `avatars/users/${user.id}`,
        validationOptions: FILE_UPLOAD_CONFIGS.USER_AVATAR,
        customFileName: 'avatar',
        overwrite: true,
      },
    )

    user.image = uploadResult.filePath
    await this.usersRepository.save(user)

    return user
  } catch (error) {
    // Convertir error de archivo a excepción de usuario
    const message = error instanceof Error ? error.message : 'Error al subir avatar'
    throw new InvalidUserFileException(message, 'avatar')
  }
}
```

---

### Ejemplo 4: Lógica de Negocio con Validaciones

```typescript
// delete-user.handler.ts

async execute(command: DeleteUserCommand): Promise<void> {
  // 1. Verificar existencia
  const user = await this.usersRepository.findById(command.userId)
  if (!user) {
    throw new UserNotFoundByIdException(command.userId)
  }

  // 2. Validar que se puede eliminar
  const hasAudits = await this.auditsRepository.existsByUserId(user.id)
  if (hasAudits) {
    throw new UserCannotBeDeletedException(
      user.id,
      'El usuario tiene auditorías asociadas'
    )
  }

  // 3. Eliminar
  await this.usersRepository.delete(user.id)
}
```

---

## 🎨 Response Format

Todas las excepciones personalizadas generan respuestas HTTP con este formato:

```typescript
{
  // Campos estándar de NestJS
  message: string           // Mensaje descriptivo
  statusCode: number        // Código HTTP (404, 409, 400, 403)
  error: string            // Nombre del error HTTP ("NOT_FOUND", "CONFLICT", etc.)
  timestamp: string        // ISO 8601 timestamp

  // Campos personalizados (metadata)
  errorCode?: string       // Código interno: "USER_NOT_FOUND", "EMAIL_ALREADY_EXISTS"
  userId?: string          // ID del usuario (si aplica)
  field?: string           // Campo: "email", "username", "ci", "avatar"
  value?: string           // Valor que causó el error
  context?: object         // Información adicional contextual
}
```

---

## 🔧 Códigos de Error

| Código                    | Excepción                      | HTTP Status |
| ------------------------- | ------------------------------ | ----------- |
| `USER_NOT_FOUND`          | UserNotFoundException          | 404         |
| `EMAIL_ALREADY_EXISTS`    | EmailAlreadyExistsException    | 409         |
| `USERNAME_ALREADY_EXISTS` | UsernameAlreadyExistsException | 409         |
| `CI_ALREADY_EXISTS`       | CiAlreadyExistsException       | 409         |
| `INVALID_USER_DATA`       | InvalidUserDataException       | 400         |
| `USER_INACTIVE`           | UserInactiveException          | 403         |
| `USER_CANNOT_BE_DELETED`  | UserCannotBeDeletedException   | 403         |
| `INVALID_USER_FILE`       | InvalidUserFileException       | 400         |

---

## ✅ Ventajas

| Aspecto           | Antes                  | Después                          |
| ----------------- | ---------------------- | -------------------------------- |
| **Especificidad** | `new Error()` genérico | Excepción específica del dominio |
| **HTTP Status**   | Manual o incorrecto    | Automático y correcto            |
| **Mensajes**      | Inconsistentes         | Estandarizados                   |
| **Metadata**      | No disponible          | Estructurada y útil              |
| **Debugging**     | Difícil                | Fácil con errorCode y metadata   |
| **Frontend**      | Debe parsear mensaje   | Lee errorCode y field            |
| **Logging**       | Info limitada          | Metadata completa                |
| **Type-safe**     | No                     | Sí (TypeScript)                  |

---

## 📦 Estructura Creada

```
src/modules/users/exceptions/
├── user.exception.ts                    # Clase base + metadata
├── user-not-found.exception.ts          # 404 - No encontrado
├── user-already-exists.exception.ts     # 409 - Conflicto (email, username, CI)
├── invalid-user-data.exception.ts       # 400/403 - Datos inválidos, inactivo, etc.
└── index.ts
```

---

## 🎯 Cuándo Usar Cada Excepción

### UserNotFoundByIdException

- Al buscar un usuario por ID y no existe
- En handlers que requieren un usuario específico

### EmailAlreadyExistsException

- Al crear usuario con email duplicado
- Al actualizar email a uno ya existente

### UsernameAlreadyExistsException

- Al crear usuario con username duplicado
- Al actualizar username a uno ya existente

### CiAlreadyExistsException

- Al crear usuario con CI duplicado
- Al actualizar CI a uno ya existente

### InvalidUserDataException

- Datos con formato inválido
- Validaciones de negocio fallidas

### UserInactiveException

- Al intentar operar con un usuario desactivado

### UserCannotBeDeletedException

- Al intentar eliminar usuario con restricciones
- Usuario tiene relaciones que lo impiden

### InvalidUserFileException

- Archivo (avatar, etc.) con formato/tamaño inválido

---

## 🚀 Próximos Pasos

1. ✅ **Excepciones de usuario** - Implementadas
2. ⏳ **Aplicar en todos los handlers** - UpdateUser, DeleteUser, etc.
3. ⏳ **Crear excepciones para otros módulos:**
   - `OrganizationException` para organizaciones
   - `AuditException` para auditorías
   - `ReportException` para reportes
4. ⏳ **Global Exception Filter** para logging centralizado
5. ⏳ **Error tracking** con Sentry/similar

---

## 💡 Best Practices

1. **Siempre usar excepciones personalizadas**

   ```typescript
   // ❌ NO
   throw new Error('Usuario no encontrado')

   // ✅ SÍ
   throw new UserNotFoundByIdException(userId)
   ```

2. **Proporcionar metadata útil**

   ```typescript
   // ❌ NO (poca info)
   throw new InvalidUserDataException('Datos inválidos')

   // ✅ SÍ (info completa)
   throw new InvalidUserDataException(
     'El formato del email es inválido',
     'email',
     userInput.email,
   )
   ```

3. **Convertir errores de terceros**

   ```typescript
   try {
     await externalService.call()
   } catch (error) {
     // Convertir a excepción del dominio
     throw new InvalidUserDataException(error.message)
   }
   ```

4. **Documentar en JSDoc**
   ```typescript
   /**
    * @throws UserNotFoundByIdException si el usuario no existe
    * @throws EmailAlreadyExistsException si el email ya está registrado
    */
   async createUser(dto: CreateUserDto): Promise<UserEntity> {
     // ...
   }
   ```

---

**✅ Sistema de excepciones completo y estandarizado!** 🎉

# Guía: Testing de Use Cases

## 🎯 Objetivo

Esta guía explica cómo escribir tests unitarios para la arquitectura de Use Cases (Commands/Queries).

## 📋 Tabla de Contenidos

1. [Estructura de Tests](#estructura-de-tests)
2. [Mocks y Helpers](#mocks-y-helpers)
3. [Testing de Handlers](#testing-de-handlers)
4. [Testing de Services](#testing-de-services)
5. [Patrones y Mejores Prácticas](#patrones-y-mejores-prácticas)
6. [Ejemplos Completos](#ejemplos-completos)

---

## 📁 Estructura de Tests

```
src/modules/users/
├── testing/
│   ├── test-helpers.ts              ← Factory de datos de prueba
│   ├── users-repository.mock.ts     ← Mock del repositorio
│   ├── transaction-manager.mock.ts  ← Mock de transacciones
│   ├── user-factory.mock.ts         ← Mock del factory
│   └── index.ts
├── services/
│   ├── users-validation.service.ts
│   └── users-validation.service.spec.ts  ← Test del service
├── use-cases/
│   ├── commands/
│   │   └── create-user/
│   │       ├── create-user.handler.ts
│   │       └── create-user.handler.spec.ts  ← Test del handler
│   └── queries/
│       └── get-user/
│           ├── get-user.handler.ts
│           └── get-user.handler.spec.ts     ← Test del handler
```

---

## 🛠️ Mocks y Helpers

### 1. Test Helpers (Factory de Datos)

```typescript
// testing/test-helpers.ts
import { UserEntity, UserStatus } from '../entities/user.entity'
import { Role } from '@authorization'

export const createMockUser = (overrides?: Partial<UserEntity>): UserEntity => {
  const user = new UserEntity()
  user.id = overrides?.id || '123e4567-e89b-12d3-a456-426614174000'
  user.names = overrides?.names || 'John'
  user.lastNames = overrides?.lastNames || 'Doe'
  user.email = overrides?.email || 'john.doe@example.com'
  user.username = overrides?.username || 'johndoe'
  user.ci = overrides?.ci || '12345678'
  user.status = overrides?.status || UserStatus.ACTIVE
  user.roles = overrides?.roles || [Role.CLIENTE]
  return user
}

export const createMockUsers = (count: number): UserEntity[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockUser({
      id: `user-${i}`,
      email: `user${i}@example.com`,
    }),
  )
}
```

**Uso:**

```typescript
const user = createMockUser() // Usuario con datos por defecto
const admin = createMockUser({ roles: [Role.ADMIN] }) // Sobrescribir roles
const users = createMockUsers(5) // Array de 5 usuarios
```

### 2. Repository Mock

```typescript
// testing/users-repository.mock.ts
export function createMockUsersRepository() {
  return {
    // Base methods
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
    patch: jest.fn(),
    softDelete: jest.fn(),

    // Custom methods
    findByEmail: jest.fn(),
    findByUsername: jest.fn(),
    findByCI: jest.fn(),
    findByOrganization: jest.fn(),
    existsByEmail: jest.fn(),
    existsByUsername: jest.fn(),
    existsByCI: jest.fn(),
  }
}
```

### 3. Transaction Manager Mock

```typescript
// testing/transaction-manager.mock.ts
export const createMockTransactionManager = () => ({
  runInTransaction: jest.fn((callback) => callback()),
})
```

**Por qué:** El mock ejecuta el callback directamente, simulando la transacción sin complejidad.

### 4. Factory Mock

```typescript
// testing/user-factory.mock.ts
export const createMockUserFactory = () => ({
  createFromDto: jest.fn((dto) => createMockUser(dto)),
  updateFromDto: jest.fn((user, dto) => ({ ...user, ...dto })),
  toResponse: jest.fn((user) => user),
  toResponseList: jest.fn((users) => users),
})
```

---

## 🧪 Testing de Handlers

### Patrón AAA (Arrange-Act-Assert)

Todos los tests siguen este patrón:

1. **Arrange**: Preparar datos y mocks
2. **Act**: Ejecutar el handler
3. **Assert**: Verificar resultados

### Ejemplo: CreateUserHandler

```typescript
import { CreateUserHandler } from './create-user.handler'
import { CreateUserCommand } from './create-user.command'
import {
  createMockUsersRepository,
  createMockUser,
  createMockTransactionManager,
  createMockUserFactory,
} from '../../../testing'

describe('CreateUserHandler', () => {
  let handler: CreateUserHandler
  let repository: ReturnType<typeof createMockUsersRepository>
  let validationService: any
  let userFactory: ReturnType<typeof createMockUserFactory>
  let transactionManager: ReturnType<typeof createMockTransactionManager>

  beforeEach(() => {
    // Crear mocks
    repository = createMockUsersRepository()
    userFactory = createMockUserFactory()
    transactionManager = createMockTransactionManager()
    validationService = { validateUniqueness: jest.fn() }

    // Crear handler con dependencias mockeadas
    handler = new CreateUserHandler(
      repository,
      validationService,
      userFactory,
      transactionManager,
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('execute', () => {
    it('should create a user successfully', async () => {
      // Arrange
      const command = new CreateUserCommand(
        'John',
        'Doe',
        'john@example.com',
        'johndoe',
        '12345678',
        'password',
        [Role.CLIENTE],
      )

      const mockUser = createMockUser()
      validationService.validateUniqueness.mockResolvedValue(undefined)
      repository.save.mockResolvedValue(mockUser)

      // Act
      const result = await handler.execute(command)

      // Assert
      expect(result).toBe(mockUser)
      expect(validationService.validateUniqueness).toHaveBeenCalled()
      expect(repository.save).toHaveBeenCalled()
    })

    it('should fail if email already exists', async () => {
      // Arrange
      const command = new CreateUserCommand(/* ... */)
      validationService.validateUniqueness.mockRejectedValue(
        new ConflictException('El email ya está registrado'),
      )

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(ConflictException)
      expect(repository.save).not.toHaveBeenCalled()
    })
  })
})
```

### Tests Esenciales para Handlers

#### 1. **Caso de Éxito**

```typescript
it('should execute successfully', async () => {
  // Mock todas las dependencias para que pasen
  // Ejecutar
  // Verificar que retorna el resultado esperado
  // Verificar que llamó a las dependencias correctas
})
```

#### 2. **Validaciones Fallidas**

```typescript
it('should fail when validation fails', async () => {
  // Mock validationService para que falle
  // Ejecutar y esperar excepción
  // Verificar que NO llamó a repository
})
```

#### 3. **Errores de Base de Datos**

```typescript
it('should handle database errors', async () => {
  // Mock repository para que falle
  // Ejecutar y esperar error
})
```

#### 4. **Ejecución en Transacción**

```typescript
it('should execute within transaction', async () => {
  // Ejecutar
  // Verificar que transactionManager.runInTransaction fue llamado
})
```

---

## 🧪 Testing de Services

### Ejemplo: UsersValidationService

```typescript
import { UsersValidationService } from './users-validation.service'
import { createMockUsersRepository } from '../testing'

describe('UsersValidationService', () => {
  let service: UsersValidationService
  let repository: ReturnType<typeof createMockUsersRepository>

  beforeEach(() => {
    repository = createMockUsersRepository()
    service = new UsersValidationService(repository)
  })

  describe('validateUniqueness', () => {
    it('should pass when email does not exist', async () => {
      // Arrange
      repository.existsByEmail.mockResolvedValue(false)

      // Act & Assert
      await expect(
        service.validateUniqueness({ email: 'new@example.com' }),
      ).resolves.not.toThrow()

      expect(repository.existsByEmail).toHaveBeenCalledWith(
        'new@example.com',
        undefined,
      )
    })

    it('should throw ConflictException when email exists', async () => {
      // Arrange
      repository.existsByEmail.mockResolvedValue(true)

      // Act & Assert
      await expect(
        service.validateUniqueness({ email: 'existing@example.com' }),
      ).rejects.toThrow('El email ya está registrado')
    })
  })

  describe('ensureUserExists', () => {
    it('should return user when found', async () => {
      // Arrange
      const mockUser = createMockUser()
      repository.findById.mockResolvedValue(mockUser)

      // Act
      const result = await service.ensureUserExists('user-123')

      // Assert
      expect(result).toBe(mockUser)
    })

    it('should throw NotFoundException when not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null)

      // Act & Assert
      await expect(service.ensureUserExists('nonexistent')).rejects.toThrow(
        NotFoundException,
      )
    })
  })
})
```

---

## 📏 Patrones y Mejores Prácticas

### 1. ✅ DO (Hacer)

#### Nombrar tests descriptivamente

```typescript
// ✅ BIEN
it('should create user successfully')
it('should fail if email already exists')
it('should validate uniqueness when updating email')

// ❌ MAL
it('test create')
it('email validation')
```

#### Probar un comportamiento por test

```typescript
// ✅ BIEN - Un test, una responsabilidad
it('should validate email uniqueness', async () => {
  // Solo prueba validación de email
})

it('should validate username uniqueness', async () => {
  // Solo prueba validación de username
})

// ❌ MAL - Múltiples comportamientos
it('should validate email and username', async () => {
  // Prueba múltiples cosas
})
```

#### Usar AAA pattern

```typescript
it('should create user', async () => {
  // Arrange (Preparar)
  const command = new CreateUserCommand(/* ... */)
  repository.save.mockResolvedValue(mockUser)

  // Act (Actuar)
  const result = await handler.execute(command)

  // Assert (Afirmar)
  expect(result).toBe(mockUser)
})
```

#### Mock solo lo necesario

```typescript
// ✅ BIEN - Mock mínimo
const validationService = {
  validateUniqueness: jest.fn(),
}

// ❌ MAL - Mock innecesario
const validationService = {
  validateUniqueness: jest.fn(),
  ensureUserExists: jest.fn(), // No se usa en este test
  validateEmail: jest.fn(), // No se usa en este test
}
```

### 2. ❌ DON'T (No hacer)

#### No testear implementaciones internas

```typescript
// ❌ MAL
expect(handler['privateMethod']).toHaveBeenCalled()

// ✅ BIEN - Testear comportamiento público
expect(result).toBeDefined()
```

#### No usar valores hardcodeados

```typescript
// ❌ MAL
expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000')

// ✅ BIEN
expect(result.id).toBe(mockUser.id)
```

#### No copiar código de producción en tests

```typescript
// ❌ MAL
const expectedEmail = dto.email.toLowerCase().trim()

// ✅ BIEN - Testear resultado, no implementación
expect(result.email).toBe('john@example.com')
```

---

## 🎯 Coverage Goals

| Componente  | Target Coverage |
| ----------- | --------------- |
| Handlers    | 100%            |
| Services    | 100%            |
| Validators  | 100%            |
| Controllers | 80%             |
| DTOs        | 0% (no lógica)  |
| Entities    | 0% (no lógica)  |

---

## 🚀 Ejecutar Tests

```bash
# Todos los tests
npm run test

# Tests específicos
npm run test users-validation.service
npm run test create-user.handler

# Con coverage
npm run test:cov

# Watch mode
npm run test:watch
```

---

## 📊 Ejemplo Completo: UpdateUserHandler

```typescript
describe('UpdateUserHandler', () => {
  let handler: UpdateUserHandler
  let repository, validationService, userFactory, transactionManager

  beforeEach(() => {
    repository = createMockUsersRepository()
    userFactory = createMockUserFactory()
    transactionManager = createMockTransactionManager()
    validationService = {
      ensureUserExists: jest.fn(),
      validateUniqueness: jest.fn(),
    }

    handler = new UpdateUserHandler(
      repository,
      validationService,
      userFactory,
      transactionManager,
    )
  })

  describe('execute', () => {
    it('should update user successfully', async () => {
      const existingUser = createMockUser()
      const command = new UpdateUserCommand('user-123', 'Jane')
      const updatedUser = { ...existingUser, names: 'Jane' }

      validationService.ensureUserExists.mockResolvedValue(existingUser)
      repository.patch.mockResolvedValue(updatedUser)

      const result = await handler.execute(command)

      expect(result).toEqual(updatedUser)
      expect(validationService.ensureUserExists).toHaveBeenCalledWith(
        'user-123',
      )
    })

    it('should fail if user does not exist', async () => {
      validationService.ensureUserExists.mockRejectedValue(
        new NotFoundException(),
      )

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException)
      expect(repository.patch).not.toHaveBeenCalled()
    })

    it('should validate uniqueness when updating email', async () => {
      const existingUser = createMockUser()
      const command = new UpdateUserCommand(
        'user-123',
        null,
        null,
        'new@email.com',
      )

      validationService.ensureUserExists.mockResolvedValue(existingUser)

      await handler.execute(command)

      expect(validationService.validateUniqueness).toHaveBeenCalledWith(
        { email: 'new@email.com', username: undefined, ci: undefined },
        'user-123',
      )
    })
  })
})
```

---

## 🎓 Resumen

| Concepto                 | Acción                             |
| ------------------------ | ---------------------------------- |
| **Mocks**                | Crear factories reutilizables      |
| **AAA Pattern**          | Arrange → Act → Assert             |
| **Un test, un concepto** | Probar solo un comportamiento      |
| **Nombres descriptivos** | `should do X when Y`               |
| **Coverage**             | 100% en handlers y services        |
| **Tests rápidos**        | No acceso a BD real                |
| **Tests independientes** | No dependen del orden de ejecución |

¡Ahora tienes todo para escribir tests de calidad! 🚀

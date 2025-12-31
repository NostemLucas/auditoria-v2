# Guía de Testing - Mock Factories

## Por qué usar Mock Factories

### ❌ Problema: Mocks inline repetitivos

```typescript
// En cada archivo .spec.ts tienes que escribir esto:
describe('UsersService', () => {
  let mockUsersRepository: jest.Mocked<IUsersRepository>

  beforeEach(() => {
    mockUsersRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByCI: jest.fn(),
      findByOrganization: jest.fn(),
      findAll: jest.fn(),
      findByIds: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      saveMany: jest.fn(),
      update: jest.fn(),
      patch: jest.fn(),
      softDelete: jest.fn(),
      recover: jest.fn(),
      existsByEmail: jest.fn(),
      existsByUsername: jest.fn(),
      existsByCI: jest.fn(),
    } // ← 18 líneas de código repetitivo!
  })
})
```

**Problemas:**

- 🔴 Código duplicado en TODOS los archivos de test
- 🔴 Si agregas un método a la interfaz, debes actualizar TODOS los tests
- 🔴 Propenso a errores (olvidar un método)
- 🔴 Difícil de mantener

---

### ✅ Solución: Mock Factories reutilizables

```typescript
import { createMockUsersRepository } from '../testing/users-repository.mock'

describe('UsersService', () => {
  let mockUsersRepository: jest.Mocked<IUsersRepository>

  beforeEach(() => {
    mockUsersRepository = createMockUsersRepository() // ← 1 línea!
  })
})
```

**Ventajas:**

- ✅ Una sola línea por test
- ✅ Si cambias la interfaz, solo actualizas el factory
- ✅ Consistente en todos los tests
- ✅ Fácil de mantener

---

## Estructura de Mock Factories

```
src/
├── shared/
│   └── testing/
│       └── mocks/
│           ├── index.ts                         # Exporta todos los mocks
│           ├── repository.mock.ts               # Factory genérico para repositorios
│           └── transaction-manager.mock.ts      # Mock del TransactionManager
│
└── users/
    └── testing/
        └── users-repository.mock.ts             # Mock específico de UsersRepository
```

---

## Uso de Mock Factories

### 1. Mock del BaseRepository (genérico)

Usa esto cuando tu repositorio NO tiene métodos específicos:

```typescript
import { createMockRepository } from '@shared/testing/mocks'
import type { ProductEntity } from '../entities/product.entity'

describe('ProductsService', () => {
  let mockProductsRepository: jest.Mocked<IBaseRepository<ProductEntity>>

  beforeEach(() => {
    mockProductsRepository = createMockRepository<ProductEntity>()
  })

  it('should save a product', async () => {
    const product = { name: 'Laptop' } as ProductEntity
    mockProductsRepository.save.mockResolvedValue(product)

    const result = await service.create(product)

    expect(mockProductsRepository.save).toHaveBeenCalledWith(product)
    expect(result).toBe(product)
  })
})
```

---

### 2. Mock de Repositorio Específico

Para repositorios con métodos personalizados, crea un factory específico:

#### 2.1 Crear el factory

```typescript
// src/products/testing/products-repository.mock.ts
import type { IProductsRepository } from '../repositories/products-repository.interface'
import type { ProductEntity } from '../entities/product.entity'
import { createExtendedMockRepository } from '@shared/testing/mocks'

export function createMockProductsRepository(): jest.Mocked<IProductsRepository> {
  return createExtendedMockRepository<ProductEntity, IProductsRepository>({
    // Solo agrega los métodos ESPECÍFICOS de tu repositorio
    findByCategory: jest.fn(),
    findByPriceRange: jest.fn(),
    existsBySKU: jest.fn(),
  })
}
```

#### 2.2 Usar el factory

```typescript
import { createMockProductsRepository } from '../testing/products-repository.mock'

describe('ProductsService', () => {
  let mockProductsRepository: jest.Mocked<IProductsRepository>

  beforeEach(() => {
    mockProductsRepository = createMockProductsRepository()
  })

  it('should find products by category', async () => {
    const products = [{ name: 'Product 1' }] as ProductEntity[]
    mockProductsRepository.findByCategory.mockResolvedValue(products)

    const result = await service.findByCategory('electronics')

    expect(mockProductsRepository.findByCategory).toHaveBeenCalledWith(
      'electronics',
    )
    expect(result).toBe(products)
  })
})
```

---

### 3. Mock del TransactionManager

```typescript
import { createMockTransactionManager } from '@shared/testing/mocks'

describe('UsersService', () => {
  let mockTransactionManager: jest.Mocked<TransactionManager>

  beforeEach(() => {
    // Por defecto, ejecuta el callback directamente (sin transacción real)
    mockTransactionManager = createMockTransactionManager()
  })

  it('should create user in transaction', async () => {
    const user = { email: 'test@test.com' }
    mockUsersRepository.save.mockResolvedValue(user as UserEntity)

    await service.create(user)

    // Verifica que se usó la transacción
    expect(mockTransactionManager.runInTransaction).toHaveBeenCalled()
    expect(mockUsersRepository.save).toHaveBeenCalled()
  })
})
```

#### No ejecutar el callback (para tests específicos)

```typescript
// Si quieres verificar QUÉ se pasa a runInTransaction sin ejecutarlo:
mockTransactionManager = createMockTransactionManager(false)

it('should prepare transaction callback', () => {
  service.createUserWithAudit(userData)

  // Verifica que se llamó, pero no ejecuta el callback
  expect(mockTransactionManager.runInTransaction).toHaveBeenCalled()
})
```

---

## Ejemplo Completo

```typescript
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { UsersService } from './users.service'
import type { IUsersRepository } from '../repositories/users-repository.interface'
import { UserFactory } from '../factories/user.factory'
import { TransactionManager } from '@shared/database/transaction-manager.service'
import { RoleEntity } from '../entities/role.entity'
import { UserEntity } from '../entities/user.entity'
import { CreateUserDto } from '../dtos'
import { createMockUsersRepository } from '../testing/users-repository.mock'
import { createMockTransactionManager } from '@shared/testing/mocks'

describe('UsersService', () => {
  let service: UsersService
  let mockUsersRepository: jest.Mocked<IUsersRepository>
  let mockTransactionManager: jest.Mocked<TransactionManager>
  let mockRoleRepository: jest.Mocked<{ find: jest.Mock }>

  beforeEach(async () => {
    // 1. Crear mocks usando factories
    mockUsersRepository = createMockUsersRepository()
    mockTransactionManager = createMockTransactionManager()
    mockRoleRepository = { find: jest.fn() }

    // 2. Configurar el módulo de testing
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        UserFactory,
        {
          provide: 'IUsersRepository',
          useValue: mockUsersRepository,
        },
        {
          provide: TransactionManager,
          useValue: mockTransactionManager,
        },
        {
          provide: getRepositoryToken(RoleEntity),
          useValue: mockRoleRepository,
        },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
  })

  describe('create', () => {
    it('should create a user successfully', async () => {
      const createUserDto: CreateUserDto = {
        names: 'John',
        lastNames: 'Doe',
        email: 'john@example.com',
        username: 'johndoe',
        ci: '12345678',
      }

      const mockUser = { id: 'user-1', ...createUserDto } as UserEntity

      // 3. Configurar el comportamiento del mock
      mockUsersRepository.existsByEmail.mockResolvedValue(false)
      mockUsersRepository.existsByUsername.mockResolvedValue(false)
      mockUsersRepository.existsByCI.mockResolvedValue(false)
      mockUsersRepository.save.mockResolvedValue(mockUser)

      // 4. Ejecutar el método
      const result = await service.create(createUserDto)

      // 5. Verificar resultados
      expect(result).toBe(mockUser)
      expect(mockUsersRepository.existsByEmail).toHaveBeenCalledWith(
        createUserDto.email,
        undefined,
      )
      expect(mockUsersRepository.save).toHaveBeenCalled()
      expect(mockTransactionManager.runInTransaction).toHaveBeenCalled()
    })

    it('should throw ConflictException when email exists', async () => {
      const createUserDto: CreateUserDto = {
        names: 'John',
        lastNames: 'Doe',
        email: 'john@example.com',
        username: 'johndoe',
        ci: '12345678',
      }

      mockUsersRepository.existsByEmail.mockResolvedValue(true)

      await expect(service.create(createUserDto)).rejects.toThrow(
        'El email ya está registrado',
      )
    })
  })
})
```

---

## Patrón para otros Módulos

### Paso 1: Crear el factory del repositorio

```typescript
// src/orders/testing/orders-repository.mock.ts
import type { IOrdersRepository } from '../repositories/orders-repository.interface'
import type { OrderEntity } from '../entities/order.entity'
import { createExtendedMockRepository } from '@shared/testing/mocks'

export function createMockOrdersRepository(): jest.Mocked<IOrdersRepository> {
  return createExtendedMockRepository<OrderEntity, IOrdersRepository>({
    findByCustomer: jest.fn(),
    findByStatus: jest.fn(),
    findByDateRange: jest.fn(),
  })
}
```

### Paso 2: Usar en tus tests

```typescript
import { createMockOrdersRepository } from '../testing/orders-repository.mock'
import { createMockTransactionManager } from '@shared/testing/mocks'

describe('OrdersService', () => {
  let mockOrdersRepository: jest.Mocked<IOrdersRepository>
  let mockTransactionManager: jest.Mocked<TransactionManager>

  beforeEach(() => {
    mockOrdersRepository = createMockOrdersRepository()
    mockTransactionManager = createMockTransactionManager()
  })

  // ... tus tests
})
```

---

## Mejores Prácticas

### ✅ DO

1. **Crear un factory por cada repositorio específico**

   ```typescript
   createMockUsersRepository()
   createMockProductsRepository()
   createMockOrdersRepository()
   ```

2. **Reutilizar factories en todos los tests del módulo**

   ```typescript
   // Todos los tests de users/ usan createMockUsersRepository()
   ```

3. **Mockear solo lo necesario para el test**

   ```typescript
   it('should find user', async () => {
     // Solo mockea findById para este test
     mockUsersRepository.findById.mockResolvedValue(mockUser)

     const result = await service.findOne('user-1')

     expect(result).toBe(mockUser)
   })
   ```

4. **Verificar las llamadas importantes**
   ```typescript
   expect(mockUsersRepository.save).toHaveBeenCalledWith(expectedData)
   expect(mockTransactionManager.runInTransaction).toHaveBeenCalledTimes(1)
   ```

### ❌ DON'T

1. **No crear mocks inline en cada test**

   ```typescript
   // ❌ MAL
   mockUsersRepository = {
     save: jest.fn(),
     findById: jest.fn(),
     // ... 15 métodos más
   }
   ```

2. **No usar implementaciones reales en unit tests**

   ```typescript
   // ❌ MAL - esto es un integration test
   @Module({
     providers: [UsersRepository], // ← NO uses el repositorio real
   })
   ```

3. **No olvidar resetear mocks entre tests** (Jest lo hace automáticamente con `jest.clearAllMocks()`)
   ```typescript
   afterEach(() => {
     jest.clearAllMocks() // Limpia todos los mocks
   })
   ```

---

## Resumen

| Tipo de Mock           | Cuándo usarlo                       | Factory                                     |
| ---------------------- | ----------------------------------- | ------------------------------------------- |
| BaseRepository         | Repositorio sin métodos específicos | `createMockRepository<T>()`                 |
| Repositorio específico | Repositorio con métodos custom      | `createExtendedMockRepository<T, R>({...})` |
| TransactionManager     | Servicios que usan transacciones    | `createMockTransactionManager()`            |

**Resultado:** Tests más limpios, mantenibles y fáciles de escribir.

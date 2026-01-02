# Patrón Repository con Contexto Transaccional

## Resumen

Este proyecto implementa un **patrón Repository genérico** con soporte para **contexto transaccional automático** usando AsyncLocalStorage. Esto permite:

1. ✅ Reutilizar operaciones CRUD básicas (create, update, delete, etc.)
2. ✅ Agregar queries específicas en cada repositorio
3. ✅ Manejo de transacciones sin pasar `entityManager` manualmente
4. ✅ Testing fácil mediante inyección de interfaces
5. ✅ Desacoplamiento de la lógica de negocio

---

## Estructura

```
src/
├── shared/
│   ├── entities/
│   │   └── base.entity.ts                    # Entidad base con campos comunes
│   ├── repositories/
│   │   ├── base.repository.ts                # Repositorio base genérico
│   │   └── base-repository.interface.ts      # Interfaz del repositorio base
│   ├── database/
│   │   └── transaction-manager.service.ts    # Maneja contexto transaccional
│   └── shared.module.ts                      # Módulo global para TransactionManager
│
└── users/
    ├── entities/
    │   └── user.entity.ts
    ├── repositories/
    │   ├── users.repository.ts               # Extiende BaseRepository
    │   └── users-repository.interface.ts     # Interfaz específica
    ├── services/
    │   ├── users.service.ts                  # Usa interfaz + TransactionManager
    │   └── users.service.spec.example.ts     # Ejemplo de testing
    └── users.module.ts                       # Configura providers
```

---

## 1. BaseRepository

El `BaseRepository` provee operaciones CRUD genéricas para cualquier entidad que extienda `BaseEntity`.

### Métodos disponibles:

```typescript
// Creación
create(data: DeepPartial<T>): T
createMany(data: DeepPartial<T>[]): T[]
save(data: DeepPartial<T>): Promise<T>
saveMany(data: DeepPartial<T>[]): Promise<T[]>

// Búsqueda
findById(id: string): Promise<T | null>
findByIds(ids: string[]): Promise<T[]>
findAll(): Promise<T[]>

// Actualización
update(id: string, data: QueryDeepPartialEntity<T>): Promise<boolean>
patch(entity: T, data: DeepPartial<T>): Promise<T>

// Eliminación
softDelete(id: string): Promise<boolean>
recover(id: string): Promise<boolean>
```

### Contexto Transaccional Automático

El método `getRepo()` resuelve automáticamente:

1. `entityManager` pasado explícitamente (opcional)
2. `entityManager` del contexto transaccional (AsyncLocalStorage)
3. Repositorio por defecto

```typescript
protected getRepo(entityManager?: EntityManager): Repository<T> {
  const contextEntityManager =
    entityManager ?? TransactionManager.getCurrentEntityManager()
  return contextEntityManager?.getRepository(this.repository.target) ?? this.repository
}
```

---

## 2. Crear un Repositorio Específico

### 2.1 Crear la interfaz

```typescript
// users-repository.interface.ts
import { IBaseRepository } from '@shared/repositories/base-repository.interface'
import { UserEntity } from '../entities/user.entity'

export interface IUsersRepository extends IBaseRepository<UserEntity> {
  findByEmail(email: string): Promise<UserEntity | null>
  findByUsername(username: string): Promise<UserEntity | null>
  existsByEmail(email: string, excludeId?: string): Promise<boolean>
}
```

### 2.2 Implementar el repositorio

```typescript
// users.repository.ts
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BaseRepository } from '@shared/repositories/base.repository'
import { UserEntity } from '../entities/user.entity'
import { IUsersRepository } from './users-repository.interface'

@Injectable()
export class UsersRepository
  extends BaseRepository<UserEntity>
  implements IUsersRepository
{
  constructor(
    @InjectRepository(UserEntity)
    repository: Repository<UserEntity>,
  ) {
    super(repository)
  }

  // Solo implementa métodos específicos de User
  async findByEmail(email: string): Promise<UserEntity | null> {
    return await this.getRepo().findOne({
      where: { email: email.toLowerCase() },
      relations: ['roles'],
    })
  }

  async existsByEmail(email: string, excludeId?: string): Promise<boolean> {
    const query = this.getRepo()
      .createQueryBuilder('user')
      .where('user.email = :email', { email: email.toLowerCase() })

    if (excludeId) {
      query.andWhere('user.id != :id', { id: excludeId })
    }

    return (await query.getCount()) > 0
  }
}
```

### 2.3 Configurar el módulo

```typescript
// users.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [
    UsersService,
    {
      provide: 'IUsersRepository', // Token de inyección
      useClass: UsersRepository,
    },
  ],
  exports: ['IUsersRepository'],
})
export class UsersModule {}
```

---

## 3. Usar el Repositorio en el Servicio

### 3.1 Inyectar la interfaz

```typescript
// users.service.ts
@Injectable()
export class UsersService {
  constructor(
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
    private readonly transactionManager: TransactionManager,
  ) {}
}
```

### 3.2 Sin transacción (operaciones simples)

```typescript
async findByEmail(email: string): Promise<UserEntity | null> {
  // Usa el repositorio por defecto
  return await this.usersRepository.findByEmail(email)
}

async findAll(): Promise<UserEntity[]> {
  // Los métodos del BaseRepository están disponibles
  return await this.usersRepository.findAll()
}
```

### 3.3 Con transacción (operaciones múltiples)

**VENTAJA CLAVE**: No necesitas pasar `entityManager` a cada método. El contexto se maneja automáticamente.

```typescript
async create(createUserDto: CreateUserDto): Promise<UserEntity> {
  return await this.transactionManager.runInTransaction(async () => {
    // Validar unicidad
    const emailExists = await this.usersRepository.existsByEmail(createUserDto.email)
    if (emailExists) {
      throw new ConflictException('Email ya existe')
    }

    // Crear usuario
    const user = this.usersRepository.create(createUserDto)

    // Guardar - AUTOMÁTICAMENTE usa el EntityManager de la transacción
    return await this.usersRepository.save(user)
  })
}

async transferUserToOrganization(
  userId: string,
  newOrgId: string,
): Promise<UserEntity> {
  return await this.transactionManager.runInTransaction(async () => {
    // Todas estas operaciones usan el MISMO EntityManager
    const user = await this.usersRepository.findById(userId)
    if (!user) throw new NotFoundException('Usuario no encontrado')

    const oldOrgId = user.organizationId

    // Actualizar usuario
    await this.usersRepository.update(userId, { organizationId: newOrgId })

    // Registrar auditoría (otro repositorio)
    await this.auditRepository.save({
      action: 'USER_TRANSFER',
      userId,
      oldOrgId,
      newOrgId,
    })

    // Si cualquier operación falla, TODO se revierte
    return await this.usersRepository.findById(userId)
  })
}
```

---

## 4. Testing

### 4.1 Mockear el repositorio

```typescript
describe('UsersService', () => {
  let service: UsersService
  let mockUsersRepository: jest.Mocked<IUsersRepository>
  let mockTransactionManager: jest.Mocked<TransactionManager>

  beforeEach(async () => {
    // Mock usando la interfaz (no la implementación concreta)
    mockUsersRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      existsByEmail: jest.fn(),
      // ... otros métodos
    } as any

    // Mock del TransactionManager
    // Por defecto, ejecuta el callback directamente (sin transacción real)
    mockTransactionManager = {
      runInTransaction: jest.fn((callback) => callback()),
    } as any

    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: 'IUsersRepository',
          useValue: mockUsersRepository,
        },
        {
          provide: TransactionManager,
          useValue: mockTransactionManager,
        },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
  })

  it('should create a user', async () => {
    const createDto = { email: 'test@test.com', username: 'test' }
    const mockUser = { id: '1', ...createDto }

    mockUsersRepository.existsByEmail.mockResolvedValue(false)
    mockUsersRepository.save.mockResolvedValue(mockUser)

    const result = await service.create(createDto)

    expect(result).toBe(mockUser)
    expect(mockUsersRepository.existsByEmail).toHaveBeenCalledWith(
      'test@test.com',
    )
    expect(mockUsersRepository.save).toHaveBeenCalled()
    expect(mockTransactionManager.runInTransaction).toHaveBeenCalled()
  })
})
```

---

## 5. Ventajas del Patrón

### ✅ DRY (Don't Repeat Yourself)

No duplicas `save()`, `findById()`, etc. en cada repositorio.

### ✅ Transacciones sin boilerplate

```typescript
// ❌ ANTES: Pasar entityManager manualmente
await repo1.save(data, entityManager)
await repo2.update(id, data, entityManager)

// ✅ AHORA: Contexto automático
await this.transactionManager.runInTransaction(async () => {
  await repo1.save(data) // Usa el contexto automáticamente
  await repo2.update(id, data) // Usa el contexto automáticamente
})
```

### ✅ Testeable

Inyectas interfaces, no implementaciones concretas. Mockear es trivial.

### ✅ Desacoplado

Tu servicio no depende de TypeORM directamente, solo de la interfaz del repositorio.

### ✅ Flexible

Cada repositorio puede tener sus propias queries complejas mientras hereda lo básico.

---

## 6. Configuración Inicial

### 6.1 Importar SharedModule en AppModule

```typescript
// app.module.ts
import { SharedModule } from './shared/shared.module'

@Module({
  imports: [
    SharedModule,  // ← Esto hace que TransactionManager esté disponible globalmente
    TypeOrmModule.forRoot({...}),
    UsersModule,
    // ... otros módulos
  ],
})
export class AppModule {}
```

### 6.2 Crear tus entidades extendiendo BaseEntity

```typescript
// user.entity.ts
import { BaseEntity } from '@shared/entities'
import { Entity, Column } from 'typeorm'

@Entity('users')
export class UserEntity extends BaseEntity {
  @Column()
  email: string

  @Column()
  username: string
}
```

---

## 7. FAQ

### ¿Puedo pasar entityManager explícitamente si lo necesito?

Sí, todos los métodos aceptan un `entityManager` opcional que tiene prioridad sobre el contexto.

```typescript
await this.usersRepository.save(user, customEntityManager)
```

### ¿Funciona con transacciones anidadas?

Sí, AsyncLocalStorage preserva el contexto incluso en funciones async anidadas.

### ¿Qué pasa si no uso `runInTransaction`?

Los métodos del repositorio funcionan normalmente sin transacción, usando el repositorio por defecto.

### ¿Puedo usar query builders?

Sí, usa `this.getRepo().createQueryBuilder()` en tus métodos personalizados.

---

## Resumen

Este patrón te da:

- **Repositorio base** con CRUD genérico
- **Contexto transaccional** sin pasar `entityManager` manualmente
- **Testing fácil** con inyección de interfaces
- **Flexibilidad** para queries específicas por módulo

**Resultado**: Código más limpio, menos boilerplate, y fácil de testear.

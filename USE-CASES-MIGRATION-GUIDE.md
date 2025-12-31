# Guía: Migración a Arquitectura de Use Cases

## 🎯 Objetivo

Refactorizar servicios para seguir **Clean Architecture + CQRS**, separando:

- **Use Cases** (Commands/Queries): Lógica de negocio específica
- **Services**: Lógica reutilizable (validaciones, transformaciones)
- **Repositories**: Acceso a datos

## 📊 Arquitectura Anterior vs Nueva

### ❌ Antes: Service con todo mezclado

```
Controller → Service (God Object)
              ├─ Lógica de negocio
              ├─ Validaciones
              ├─ Queries
              └─ Commands
```

**Problemas:**

- Service muy grande (God Object)
- Difícil testear lógica específica
- Validaciones no reutilizables
- Mezcla de Commands (write) con Queries (read)

### ✅ Ahora: Arquitectura limpia con CQRS

```
Controller
    ↓
Use Cases (Casos de Uso)
    ├─ Commands (write): CreateUser, UpdateUser, DeleteUser
    └─ Queries (read): GetUser, GetUsers, GetUsersByOrg
    ↓
Services (Lógica Reutilizable)
    ├─ ValidationService (validaciones)
    └─ DomainService (reglas de negocio)
    ↓
Repositories (Data Access)
    └─ Repository pattern
```

## 📁 Nueva Estructura de Archivos

```
src/modules/users/
├── use-cases/
│   ├── commands/
│   │   ├── create-user/
│   │   │   ├── create-user.command.ts
│   │   │   ├── create-user.handler.ts
│   │   │   └── index.ts
│   │   ├── update-user/
│   │   ├── delete-user/
│   │   ├── deactivate-user/
│   │   └── index.ts
│   ├── queries/
│   │   ├── get-user/
│   │   │   ├── get-user.query.ts
│   │   │   ├── get-user.handler.ts
│   │   │   └── index.ts
│   │   ├── get-users/
│   │   ├── get-users-by-organization/
│   │   └── index.ts
│   └── index.ts
├── services/
│   ├── users-validation.service.ts    ← Validaciones reutilizables
│   ├── users.service.ts                ← (Opcional: mantener compatibilidad)
│   └── index.ts
├── repositories/
├── entities/
├── dtos/
├── controllers/
│   └── users.controller.ts             ← Orquesta use cases
└── users.module.ts
```

## 🔧 Componentes Principales

### 1. Commands (Write Operations)

**Command**: DTO inmutable con datos de la operación

```typescript
// create-user.command.ts
export class CreateUserCommand {
  constructor(
    public readonly names: string,
    public readonly email: string,
    // ... más campos
  ) {}
}
```

**Handler**: Ejecuta la lógica de negocio

```typescript
// create-user.handler.ts
@Injectable()
export class CreateUserHandler {
  constructor(
    @Inject('IUsersRepository')
    private readonly repository: IUsersRepository,
    private readonly validationService: UsersValidationService,
    private readonly transactionManager: TransactionManager,
  ) {}

  async execute(command: CreateUserCommand): Promise<UserEntity> {
    return await this.transactionManager.runInTransaction(async () => {
      // 1. Validar (servicio reutilizable)
      await this.validationService.validateUniqueness({
        email: command.email,
      })

      // 2. Crear entidad
      const user = new UserEntity()
      user.email = command.email
      // ...

      // 3. Persistir
      return await this.repository.save(user)
    })
  }
}
```

### 2. Queries (Read Operations)

**Query**: DTO con parámetros de búsqueda

```typescript
// get-user.query.ts
export class GetUserQuery {
  constructor(public readonly userId: string) {}
}
```

**Handler**: Ejecuta la consulta

```typescript
// get-user.handler.ts
@Injectable()
export class GetUserHandler {
  constructor(private readonly validationService: UsersValidationService) {}

  async execute(query: GetUserQuery): Promise<UserEntity> {
    return await this.validationService.ensureUserExists(query.userId)
  }
}
```

### 3. Validation Service (Lógica Reutilizable)

```typescript
// users-validation.service.ts
@Injectable()
export class UsersValidationService {
  /**
   * Valida unicidad - Reutilizable en create, update, etc.
   */
  async validateUniqueness(
    data: { email?: string; username?: string },
    excludeId?: string,
  ): Promise<void> {
    if (data.email) {
      const exists = await this.repository.existsByEmail(data.email, excludeId)
      if (exists) {
        throw new ConflictException('El email ya está registrado')
      }
    }
  }

  /**
   * Verifica existencia - Reutilizable en múltiples queries
   */
  async ensureUserExists(userId: string): Promise<UserEntity> {
    const user = await this.repository.findById(userId)
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`)
    }
    return user
  }
}
```

### 4. Controller (Orquestador)

```typescript
// users.controller.ts
@Controller('users')
export class UsersController {
  constructor(
    // Handlers inyectados
    private readonly createUserHandler: CreateUserHandler,
    private readonly getUserHandler: GetUserHandler,
    private readonly userFactory: UserFactory,
  ) {}

  @Post()
  async create(@Body() dto: CreateUserDto) {
    // 1. Crear command desde DTO
    const command = new CreateUserCommand(
      dto.names,
      dto.email,
      // ...
    )

    // 2. Ejecutar handler
    const user = await this.createUserHandler.execute(command)

    // 3. Transformar respuesta
    return this.userFactory.toResponse(user)
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const query = new GetUserQuery(id)
    const user = await this.getUserHandler.execute(query)
    return this.userFactory.toResponse(user)
  }
}
```

### 5. Module (Registro de Providers)

```typescript
// users.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [UsersController],
  providers: [
    // Core
    TransactionManager,

    // Services
    UsersValidationService,
    UserFactory,

    // Repository
    { provide: 'IUsersRepository', useClass: UsersRepository },

    // Command Handlers
    CreateUserHandler,
    UpdateUserHandler,
    DeleteUserHandler,

    // Query Handlers
    GetUserHandler,
    GetUsersHandler,
  ],
  exports: [UsersValidationService, CreateUserHandler, GetUserHandler],
})
export class UsersModule {}
```

## 📝 Ejemplos de Uso

### Crear Usuario (Command)

```typescript
// Controller
@Post()
async create(@Body() dto: CreateUserDto) {
  const command = new CreateUserCommand(
    dto.names,
    dto.email,
    dto.username,
    dto.ci,
  )
  return await this.createUserHandler.execute(command)
}

// Handler
async execute(command: CreateUserCommand): Promise<UserEntity> {
  return await this.transactionManager.runInTransaction(async () => {
    await this.validationService.validateUniqueness({
      email: command.email,
      username: command.username,
    })
    const user = this.factory.createFromDto(command)
    return await this.repository.save(user)
  })
}
```

### Obtener Usuario (Query)

```typescript
// Controller
@Get(':id')
async findOne(@Param('id') id: string) {
  const query = new GetUserQuery(id)
  return await this.getUserHandler.execute(query)
}

// Handler
async execute(query: GetUserQuery): Promise<UserEntity> {
  return await this.validationService.ensureUserExists(query.userId)
}
```

## 🧪 Ventajas para Testing

### Testear Handler Aisladamente

```typescript
describe('CreateUserHandler', () => {
  let handler: CreateUserHandler
  let validationService: UsersValidationService
  let repository: IUsersRepository

  beforeEach(() => {
    // Mock solo lo necesario
    validationService = {
      validateUniqueness: jest.fn(),
    } as any

    repository = {
      save: jest.fn(),
    } as any

    handler = new CreateUserHandler(
      repository,
      validationService,
      userFactory,
      transactionManager,
    )
  })

  it('should create user after validation', async () => {
    const command = new CreateUserCommand('John', 'john@example.com')

    await handler.execute(command)

    expect(validationService.validateUniqueness).toHaveBeenCalledWith({
      email: 'john@example.com',
    })
    expect(repository.save).toHaveBeenCalled()
  })

  it('should fail if email exists', async () => {
    validationService.validateUniqueness = jest
      .fn()
      .mockRejectedValue(new ConflictException())

    const command = new CreateUserCommand('John', 'existing@example.com')

    await expect(handler.execute(command)).rejects.toThrow(ConflictException)
  })
})
```

## 🔄 Cómo Migrar un Módulo Existente

### Paso 1: Crear Estructura de Carpetas

```bash
mkdir -p src/modules/tu-modulo/use-cases/commands
mkdir -p src/modules/tu-modulo/use-cases/queries
```

### Paso 2: Extraer Validaciones a Service

```typescript
// tu-modulo-validation.service.ts
@Injectable()
export class TuModuloValidationService {
  // Mover aquí todas las validaciones reutilizables
  async validateSomething() { ... }
}
```

### Paso 3: Crear Commands

Para cada operación de escritura (create, update, delete):

1. Crear carpeta: `commands/operation-name/`
2. Crear `operation-name.command.ts`
3. Crear `operation-name.handler.ts`
4. Crear `index.ts`

### Paso 4: Crear Queries

Para cada operación de lectura (get, list, find):

1. Crear carpeta: `queries/operation-name/`
2. Crear `operation-name.query.ts`
3. Crear `operation-name.handler.ts`
4. Crear `index.ts`

### Paso 5: Actualizar Controller

Reemplazar inyección de Service por Handlers:

```typescript
// Antes
constructor(private readonly service: TuModuloService) {}

// Después
constructor(
  private readonly createHandler: CreateHandler,
  private readonly getHandler: GetHandler,
) {}
```

### Paso 6: Actualizar Module

Registrar todos los handlers:

```typescript
providers: [
  ValidationService,
  CreateHandler,
  UpdateHandler,
  GetHandler,
  // ...
],
```

## 📊 Comparación Final

| Aspecto             | Service Anterior | Use Cases + Services |
| ------------------- | ---------------- | -------------------- |
| **Responsabilidad** | ❌ Múltiples     | ✅ Single            |
| **Testabilidad**    | ⚠️ Difícil       | ✅ Fácil (aislado)   |
| **Reutilización**   | ❌ Limitada      | ✅ Alta              |
| **CQRS**            | ❌ No            | ✅ Sí                |
| **Mantenibilidad**  | ⚠️ God Object    | ✅ Organizado        |
| **Escalabilidad**   | ❌ Crece mucho   | ✅ Modular           |

## 🎯 Principios Aplicados

1. **Single Responsibility**: Cada handler tiene una sola responsabilidad
2. **CQRS**: Commands (write) separados de Queries (read)
3. **Dependency Inversion**: Controllers dependen de abstracciones (handlers)
4. **Open/Closed**: Fácil agregar nuevos use cases sin modificar existentes
5. **DRY**: Validaciones reutilizables en services
6. **Testabilidad**: Cada componente se testea aisladamente

## 🚀 Próximos Pasos

1. ✅ Módulo Users refactorizado
2. ⏳ Aplicar mismo patrón a otros módulos (Organizations, Reports, etc.)
3. ⏳ Agregar tests unitarios para handlers
4. ⏳ Considerar Event Sourcing si es necesario

---

**¿Necesitas ayuda para migrar otro módulo?** Usa esta guía como referencia!

# Patrones de Migración: Stateful → Stateless

## 🎯 Guía Rápida de Cambios

Esta guía te muestra cómo actualizar código existente al nuevo sistema stateless.

---

## 📋 Patrón 1: Controllers con @CurrentUser()

### ❌ Antes (Stateful)

```typescript
import { CurrentUser } from './decorators/current-user.decorator'
import type { UserEntity } from '@users/entities/user.entity'

@Controller('reports')
export class ReportsController {
  @Get()
  async findAll(@CurrentUser() user: UserEntity) {
    // ❌ UserEntity de DB (query innecesaria)
    return this.reportsService.findByUserId(user.id)
  }
}
```

### ✅ Ahora (Stateless)

```typescript
import { CurrentUser, JwtPayload } from '@auth'

@Controller('reports')
export class ReportsController {
  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    // ✅ JwtPayload del token (sin query)
    return this.reportsService.findByUserId(user.sub)
  }

  // ✅ O extraer solo el ID
  @Get('my-reports')
  async getMyReports(@CurrentUser('sub') userId: string) {
    return this.reportsService.findByUserId(userId)
  }
}
```

---

## 📋 Patrón 2: Obtener Datos Completos del Usuario

### ❌ Antes

```typescript
@Get('profile')
async getProfile(@CurrentUser() user: UserEntity) {
  // user ya tiene todo de DB
  return {
    ...user,
    organization: user.organization,
  }
}
```

### ✅ Ahora

```typescript
@Get('profile')
async getProfile(
  @CurrentUser('sub') userId: string
) {
  // Consulta DB solo cuando necesites datos completos
  const fullUser = await this.usersService.findById(userId)

  return {
    ...fullUser,
    organization: fullUser.organization,
  }
}
```

---

## 📋 Patrón 3: Services que Reciben Usuario

### ❌ Antes

```typescript
// Service
async createReport(
  dto: CreateReportDto,
  user: UserEntity  // ❌ Recibe entidad completa
) {
  return this.reportRepository.save({
    ...dto,
    userId: user.id,
    createdBy: user.username,
  })
}

// Controller
@Post()
async create(
  @Body() dto: CreateReportDto,
  @CurrentUser() user: UserEntity
) {
  return this.reportsService.createReport(dto, user)
}
```

### ✅ Ahora (Opción A: Solo ID)

```typescript
// Service
async createReport(
  dto: CreateReportDto,
  userId: string  // ✅ Solo ID
) {
  return this.reportRepository.save({
    ...dto,
    userId,
  })
}

// Controller
@Post()
async create(
  @Body() dto: CreateReportDto,
  @CurrentUser('sub') userId: string
) {
  return this.reportsService.createReport(dto, userId)
}
```

### ✅ Ahora (Opción B: JWT Payload)

```typescript
// Service
async createReport(
  dto: CreateReportDto,
  jwt: JwtPayload  // ✅ Payload del JWT
) {
  return this.reportRepository.save({
    ...dto,
    userId: jwt.sub,
    createdBy: jwt.username,
    // Tienes acceso a roles, permissions, email, etc.
  })
}

// Controller
@Post()
async create(
  @Body() dto: CreateReportDto,
  @CurrentUser() jwt: JwtPayload
) {
  return this.reportsService.createReport(dto, jwt)
}
```

---

## 📋 Patrón 4: Guards Personalizados

### ❌ Antes

```typescript
@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user: UserEntity = request.user // ❌ De DB

    const resourceId = request.params.id

    // Verificar ownership
    return user.id === resourceId
  }
}
```

### ✅ Ahora

```typescript
import type { JwtPayload } from '@auth'

@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const jwt: JwtPayload = request.user // ✅ Del JWT

    const resourceId = request.params.id

    // Verificar ownership
    return jwt.sub === resourceId
  }
}
```

---

## 📋 Patrón 5: Interceptors

### ❌ Antes

```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest()
    const user: UserEntity = request.user // ❌ De DB

    console.log(`Request by: ${user?.email}`)

    return next.handle()
  }
}
```

### ✅ Ahora

```typescript
import type { JwtPayload } from '@auth'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest()
    const jwt: JwtPayload = request.user // ✅ Del JWT

    console.log(`Request by: ${jwt?.email}`)

    return next.handle()
  }
}
```

---

## 📋 Patrón 6: Verificar Roles en Código

### ❌ Antes

```typescript
async doSomething(@CurrentUser() user: UserEntity) {
  if (user.hasRole(Role.ADMIN)) {
    // admin logic
  }

  if (user.hasPermission(Permission.USERS_CREATE)) {
    // create user
  }
}
```

### ✅ Ahora

```typescript
import type { JwtPayload } from '@auth'
import { Role, Permission } from '@authorization'

async doSomething(@CurrentUser() jwt: JwtPayload) {
  // Verificar roles
  if (jwt.roles.includes(Role.ADMIN)) {
    // admin logic
  }

  // Verificar permisos
  if (jwt.permissions?.includes(Permission.USERS_CREATE)) {
    // create user
  }
}
```

---

## 📋 Patrón 7: Endpoints de Autenticación

### ⚠️ Excepción: Login con LocalStrategy

El endpoint de login ES LA EXCEPCIÓN. LocalStrategy valida el password con DB y retorna UserEntity.

```typescript
@Controller('auth')
export class AuthController {
  // ⚠️ Login: SÍ usa UserEntity (validado por LocalStrategy)
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: Request) {
    // LocalStrategy adjunta UserEntity en req.user
    const user = req.user as any // UserEntity
    return this.authService.generateToken(user)
  }

  // ✅ Todos los demás endpoints: usan JwtPayload
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() jwt: JwtPayload) {
    return jwt
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser('sub') userId: string) {
    return this.authService.logout(userId)
  }
}
```

---

## 🔍 Checklist de Migración

Para cada controller/service:

- [ ] ¿Usa `@CurrentUser()`?
  - [ ] Cambiar tipo de `UserEntity` a `JwtPayload`
  - [ ] Cambiar `user.id` a `user.sub`
  - [ ] Cambiar `user.email` a `user.email` (igual)
  - [ ] Cambiar `user.roles` a `user.roles` (igual)
  - [ ] Cambiar `user.hasRole()` a `user.roles.includes()`
  - [ ] Cambiar `user.hasPermission()` a `user.permissions?.includes()`

- [ ] ¿Pasa `UserEntity` a services?
  - [ ] Cambiar a solo pasar `userId: string`
  - [ ] O pasar `JwtPayload` completo

- [ ] ¿Necesita datos completos del usuario?
  - [ ] Agregar `usersService.findById(userId)`
  - [ ] Solo cuando realmente necesites

- [ ] ¿Tiene guards personalizados?
  - [ ] Actualizar tipo de `request.user` a `JwtPayload`

---

## 📚 Imports Necesarios

### En Controllers:

```typescript
import { CurrentUser, JwtPayload } from '@auth'
import { Role, Permission } from '@authorization'
```

### En Guards:

```typescript
import type { JwtPayload } from '@auth/interfaces/jwt-payload.interface'
```

### En Services:

```typescript
import type { JwtPayload } from '@auth'
```

---

## ⚡ Beneficios de la Migración

| Antes                  | Después                |
| ---------------------- | ---------------------- |
| 1 query por request    | 0 queries              |
| ~20ms latencia         | < 1ms latencia         |
| Alta carga en DB       | Cero carga             |
| Limitada escalabilidad | Infinita escalabilidad |

---

## 🎯 Regla de Oro

**Solo consulta DB cuando necesites:**

- Datos completos del usuario (con relaciones)
- Actualizar datos
- Validar datos frescos

**Para autenticación/autorización:**

- JWT tiene TODO lo necesario
- Roles están ahí
- Permisos están ahí
- ID, email, username están ahí

---

**¿Dudas? Revisa `STATELESS-AUTH-GUIDE.md` para ejemplos completos.**

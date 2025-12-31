# JWT Strategy: Stateless vs Stateful

## 🤔 La Pregunta Clave

**¿Es necesario consultar la DB en cada request para obtener el usuario?**

Si el JWT ya tiene roles y permisos, ¿por qué no verificar directamente desde el JWT?

---

## 📊 Comparación

### Enfoque 1: STATEFUL (Query a DB)

```typescript
// jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  async validate(payload: JwtPayload): Promise<UserEntity> {
    // ❌ QUERY EN CADA REQUEST
    const user = await this.userRepository.findOne({
      where: { id: payload.sub }
    })

    if (!user) {
      throw new UnauthorizedException()
    }

    return user // UserEntity completo
  }
}

// permissions.guard.ts
canActivate(context: ExecutionContext): boolean {
  const user: UserEntity = request.user // De DB
  return user.hasPermission(requiredPermission)
}
```

**✅ Ventajas:**

- Datos siempre frescos de DB
- Si suspendes usuario → efecto inmediato
- Si cambias roles → efecto inmediato
- Puedes acceder a relaciones (organization, etc.)

**❌ Desventajas:**

- **Query en CADA request protegido** 🐌
- Menos escalable
- Mayor carga en DB
- Latencia adicional

---

### Enfoque 2: STATELESS (Solo JWT)

```typescript
// jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // ✅ SIN QUERY - Solo valida JWT
    return payload // JwtPayload directo
  }
}

// permissions.guard.ts
canActivate(context: ExecutionContext): boolean {
  const jwtPayload: JwtPayload = request.user // Del JWT
  // Verificar directamente desde JWT
  return jwtPayload.permissions?.includes(requiredPermission) ?? false
}
```

**✅ Ventajas:**

- **CERO queries a DB** ⚡
- Máxima velocidad
- Escalabilidad infinita
- Stateless puro (ideal para microservicios)

**❌ Desventajas:**

- Si suspendes usuario → sigue activo hasta que expire token
- Si cambias roles → no se refleja hasta renovar token
- Token más grande (~500 bytes más)
- Necesitas blacklist para invalidar tokens

---

## 💡 Enfoque 3: HÍBRIDO (Recomendado)

**Lo mejor de ambos mundos:**

```typescript
// jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  async validate(payload: JwtPayload): Promise<JwtUser> {
    // Verificar blacklist (cache rápido)
    const isBlacklisted = await this.tokenBlacklistService.isBlacklisted(
      payload.jti, // Token ID
    )

    if (isBlacklisted) {
      throw new UnauthorizedException('Token invalidado')
    }

    // Retornar payload enriquecido (SIN query a DB)
    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      roles: payload.roles,
      permissions: payload.permissions, // Pre-calculados
    }
  }
}

// Custom user type
export interface JwtUser {
  id: string
  email: string
  username: string
  roles: Role[]
  permissions: Permission[]
}

// permissions.guard.ts
canActivate(context: ExecutionContext): boolean {
  const user: JwtUser = request.user // Del JWT

  // ✅ Verificación directa, sin DB
  return user.permissions.includes(requiredPermission)
}

// roles.guard.ts
canActivate(context: ExecutionContext): boolean {
  const user: JwtUser = request.user
  return requiredRoles.some(role => user.roles.includes(role))
}
```

**Cuando SÍ consultas DB:**

Solo en endpoints que necesitan datos frescos:

```typescript
@Get('profile')
async getProfile(@CurrentUser() jwtUser: JwtUser) {
  // Aquí SÍ consultamos DB porque necesitamos datos completos
  const fullUser = await this.usersService.findById(jwtUser.id)

  return {
    ...fullUser,
    organization: fullUser.organization, // Relación
    // Datos frescos
  }
}

@Put('profile')
async updateProfile(
  @CurrentUser() jwtUser: JwtUser,
  @Body() dto: UpdateProfileDto,
) {
  // Aquí SÍ porque vamos a modificar
  return this.usersService.update(jwtUser.id, dto)
}
```

---

## 🎯 Mi Recomendación: HÍBRIDO

### Implementación

#### 1. Interface para JWT User

```typescript
// src/modules/auth/types/jwt-user.interface.ts

import type { Role, Permission } from '@authorization'

/**
 * Usuario derivado del JWT (sin consultar DB)
 * Contiene toda la info necesaria para guards
 */
export interface JwtUser {
  id: string
  email: string
  username: string
  roles: Role[]
  permissions: Permission[]
}
```

#### 2. Strategy Stateless

```typescript
// src/modules/auth/strategies/jwt.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import type { JwtPayload } from '../interfaces/jwt-payload.interface'
import type { JwtUser } from '../types/jwt-user.interface'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_SECRET'),
      ignoreExpiration: false,
    })
  }

  /**
   * Valida el JWT y retorna el usuario (SIN consultar DB)
   * El usuario viene del payload del token
   */
  async validate(payload: JwtPayload): Promise<JwtUser> {
    // Validaciones básicas
    if (!payload.sub || !payload.roles || !payload.permissions) {
      throw new UnauthorizedException('Token inválido')
    }

    // Opcional: Verificar blacklist (cache rápido, no DB)
    // if (await this.isTokenBlacklisted(payload.jti)) {
    //   throw new UnauthorizedException('Token invalidado')
    // }

    // Retornar usuario del JWT (CERO queries)
    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      roles: payload.roles,
      permissions: payload.permissions,
    }
  }
}
```

#### 3. Guards actualizados

```typescript
// src/modules/authorization/guards/permissions.guard.ts

import type { JwtUser } from '@auth/types/jwt-user.interface'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user: JwtUser = request.user // ✅ Del JWT, no de DB

    if (!user || !user.permissions) {
      return false
    }

    // ✅ Verificación directa desde JWT (instantánea)
    return requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    )
  }
}
```

#### 4. Decorator actualizado

```typescript
// src/modules/auth/decorators/current-user.decorator.ts

import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { JwtUser } from '../types/jwt-user.interface'

/**
 * Obtiene el usuario del JWT (no de DB)
 * Para datos completos, usa UsersService.findById()
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtUser => {
    const request = ctx.switchToHttp().getRequest()
    return request.user
  },
)
```

#### 5. Uso en Controllers

```typescript
@Controller('reports')
export class ReportsController {
  // ✅ RÁPIDO: Solo verifica permisos del JWT
  @RequirePermissions(Permission.REPORTS_READ)
  @Get()
  findAll(@CurrentUser() user: JwtUser) {
    // user viene del JWT, sin query
    return this.reportsService.findAll(user.id)
  }

  // ✅ COMPLETO: Consulta DB solo cuando necesitas
  @Get('my-profile')
  async getFullProfile(@CurrentUser() jwtUser: JwtUser) {
    // Aquí SÍ consultas DB para datos frescos
    const fullUser = await this.usersService.findById(jwtUser.id)
    return fullUser
  }
}
```

---

## 📊 Tabla Comparativa

| Aspecto               | Stateful (DB)    | Stateless (JWT)  | Híbrido             |
| --------------------- | ---------------- | ---------------- | ------------------- |
| **Velocidad**         | ❌ Lento (query) | ✅ Rápido        | ✅ Rápido           |
| **Escalabilidad**     | ⚠️ Limitada      | ✅ Infinita      | ✅ Excelente        |
| **Seguridad**         | ✅ Alta          | ⚠️ Media         | ✅ Alta\*           |
| **Datos frescos**     | ✅ Siempre       | ❌ Hasta expirar | ✅ Cuando necesites |
| **Suspender usuario** | ✅ Inmediato     | ❌ Hasta expirar | ✅ Con blacklist    |
| **Carga DB**          | ❌ Alta          | ✅ Cero          | ✅ Mínima           |

\* Con blacklist para tokens invalidados

---

## 🔐 Manejo de Seguridad en Híbrido

### Token Blacklist (Redis)

```typescript
// src/modules/auth/services/token-blacklist.service.ts

import { Injectable } from '@nestjs/common'
import { InjectRedis } from '@nestjs-modules/ioredis'
import Redis from 'ioredis'

@Injectable()
export class TokenBlacklistService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Invalida un token (ej: al hacer logout o suspender usuario)
   */
  async blacklistToken(tokenId: string, expiresIn: number): Promise<void> {
    await this.redis.setex(`blacklist:${tokenId}`, expiresIn, '1')
  }

  /**
   * Verifica si un token está invalidado
   */
  async isBlacklisted(tokenId: string): Promise<boolean> {
    const result = await this.redis.get(`blacklist:${tokenId}`)
    return result !== null
  }

  /**
   * Invalida todos los tokens de un usuario
   */
  async blacklistUserTokens(userId: string): Promise<void> {
    // Agregar user a lista de invalidados
    await this.redis.sadd('blacklisted-users', userId)
  }
}
```

### Uso en Strategy

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private tokenBlacklist: TokenBlacklistService,
  ) {
    super({...})
  }

  async validate(payload: JwtPayload): Promise<JwtUser> {
    // Verificar blacklist (Redis muy rápido)
    if (await this.tokenBlacklist.isBlacklisted(payload.jti)) {
      throw new UnauthorizedException('Token invalidado')
    }

    return {
      id: payload.sub,
      // ...
    }
  }
}
```

---

## 🎯 Conclusión

### Para tu caso, recomiendo: **HÍBRIDO**

**Razones:**

1. ✅ Máxima velocidad (sin queries en cada request)
2. ✅ Seguridad (blacklist para invalidar tokens)
3. ✅ Escalabilidad (stateless)
4. ✅ Flexibilidad (consulta DB solo cuando necesites)

**Implementación:**

- JWT contiene: `id`, `email`, `username`, `roles`, `permissions`
- Guards verifican JWT directamente (rápido)
- Blacklist en Redis para invalidar tokens (seguro)
- Consulta DB solo en endpoints específicos (eficiente)

---

## 📝 Cambios Necesarios

1. ✅ Crear `JwtUser` interface
2. ✅ Modificar `JwtStrategy` para retornar `JwtUser`
3. ✅ Actualizar guards para usar `JwtUser`
4. ✅ Actualizar `@CurrentUser()` decorator
5. ⚠️ Opcional: Implementar blacklist (Redis)

---

**¿Quieres que implementemos el enfoque híbrido?** 🚀

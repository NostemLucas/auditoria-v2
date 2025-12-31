# Sistema de Autenticación OAuth 2.0 con JWT

## Arquitectura Completa

Este sistema implementa **OAuth 2.0** con **JWT** (JSON Web Tokens) siguiendo las mejores prácticas de seguridad:

✅ **Access Tokens** (15 minutos) - Para autenticación de requests
✅ **Refresh Tokens** (7 días) - Para renovar access tokens
✅ **Token Rotation** - Máxima seguridad
✅ **Password Hashing** con bcrypt
✅ **Refresh Token Storage** en base de datos
✅ **Passport.js** con estrategias Local y JWT
✅ **Guards globales** para protección automática

---

## 📦 Estructura del Módulo

```
src/auth/
├── dtos/
│   ├── login.dto.ts                  # DTO para login
│   ├── register.dto.ts               # DTO para registro
│   ├── refresh-token.dto.ts          # DTO para refresh
│   └── change-password.dto.ts        # DTO para cambio de password
├── entities/
│   └── refresh-token.entity.ts       # Entidad para almacenar tokens
├── interfaces/
│   ├── jwt-payload.interface.ts      # Payload del JWT
│   └── auth-response.interface.ts    # Respuesta de auth
├── strategies/
│   ├── local.strategy.ts             # Passport Local (email/password)
│   └── jwt.strategy.ts               # Passport JWT (Bearer token)
├── guards/
│   ├── local-auth.guard.ts           # Guard para login
│   └── jwt-auth.guard.ts             # Guard para rutas protegidas
├── decorators/
│   ├── public.decorator.ts           # @Public() para rutas públicas
│   └── current-user.decorator.ts     # @CurrentUser() obtener usuario
├── auth.service.ts                   # Lógica de autenticación
├── auth.controller.ts                # Endpoints de auth
└── auth.module.ts                    # Módulo de autenticación
```

---

## 🔐 Flujo de Autenticación

### 1. **Registro** (POST /auth/register)

```
Cliente → Envía datos de registro
      ↓
AuthService → Valida unicidad (email, username, CI)
      ↓
AuthService → Hashea password con bcrypt
      ↓
AuthService → Crea usuario con rol CLIENTE por defecto
      ↓
AuthService → Genera Access Token (15 min) + Refresh Token (7 días)
      ↓
AuthService → Guarda Refresh Token hasheado en BD
      ↓
Cliente ← Recibe { user, accessToken, refreshToken, expiresIn }
```

### 2. **Login** (POST /auth/login)

```
Cliente → Envía { email, password }
      ↓
LocalStrategy → Valida credenciales con bcrypt
      ↓
AuthService → Genera Access Token + Refresh Token
      ↓
AuthService → Guarda Refresh Token en BD (con IP y User-Agent)
      ↓
Cliente ← Recibe { user, accessToken, refreshToken, expiresIn }
```

### 3. **Requests Autenticados** (Con Access Token)

```
Cliente → Envía request con Header: Authorization: Bearer <accessToken>
      ↓
JwtAuthGuard → Extrae token del header
      ↓
JwtStrategy → Verifica firma y expiración
      ↓
JwtStrategy → Busca usuario en BD
      ↓
Request.user ← Usuario completo con roles
      ↓
Controller → Acceso permitido
```

### 4. **Renovación de Token** (POST /auth/refresh)

```
Cliente → Envía { refreshToken }
      ↓
AuthService → Verifica firma del refresh token
      ↓
AuthService → Busca token en BD
      ↓
AuthService → Valida que no esté revocado ni expirado
      ↓
AuthService → Compara hash (previene reuso)
      ↓
AuthService → REVOCA el token actual (rotation)
      ↓
AuthService → Genera NUEVOS Access + Refresh tokens
      ↓
AuthService → Guarda nuevo refresh token
      ↓
AuthService → Marca el anterior como reemplazado
      ↓
Cliente ← Recibe { accessToken, refreshToken, expiresIn }
```

**Seguridad:** Si se detecta reuso de un refresh token revocado, **TODOS** los tokens del usuario son revocados automáticamente.

---

## 🚀 Endpoints

### Rutas Públicas (No requieren autenticación)

| Método | Endpoint         | Descripción             |
| ------ | ---------------- | ----------------------- |
| POST   | `/auth/register` | Registrar nuevo usuario |
| POST   | `/auth/login`    | Iniciar sesión          |
| POST   | `/auth/refresh`  | Renovar access token    |

### Rutas Protegidas (Requieren JWT)

| Método | Endpoint                | Descripción                       |
| ------ | ----------------------- | --------------------------------- |
| GET    | `/auth/me`              | Obtener perfil del usuario actual |
| POST   | `/auth/logout`          | Cerrar sesión (revocar tokens)    |
| POST   | `/auth/change-password` | Cambiar contraseña                |

---

## 💻 Uso del Sistema

### 1. **Registro de Usuario**

```typescript
// POST /auth/register
{
  "names": "John",
  "lastNames": "Doe",
  "email": "john@example.com",
  "username": "johndoe",
  "ci": "12345678",
  "password": "MySecure123!"
}

// Respuesta
{
  "user": {
    "id": "uuid",
    "names": "John",
    "lastNames": "Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "roles": [{ "name": "cliente", "displayName": "Cliente" }]
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

### 2. **Login**

```typescript
// POST /auth/login
{
  "email": "john@example.com",
  "password": "MySecure123!"
}

// Respuesta: Misma estructura que registro
```

### 3. **Acceder a Rutas Protegidas**

```typescript
// Headers
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// GET /auth/me
// Respuesta
{
  "id": "uuid",
  "names": "John",
  "lastNames": "Doe",
  "email": "john@example.com",
  "username": "johndoe",
  "roles": [{ "name": "cliente", ... }]
}
```

### 4. **Renovar Token**

```typescript
// POST /auth/refresh
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Respuesta
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // NUEVO
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // NUEVO
  "expiresIn": 900
}
```

### 5. **Cambiar Contraseña**

```typescript
// POST /auth/change-password
// Headers: Authorization: Bearer <token>
{
  "currentPassword": "MySecure123!",
  "newPassword": "NewSecure456!"
}

// Respuesta
{
  "message": "Contraseña cambiada exitosamente"
}

// IMPORTANTE: Todos los refresh tokens son revocados por seguridad
```

### 6. **Logout**

```typescript
// POST /auth/logout
// Headers: Authorization: Bearer <token>
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Respuesta: 204 No Content
```

---

## 🛡️ Proteger Rutas en Controllers

### Guard Global (Todas las rutas protegidas por defecto)

```typescript
// app.module.ts
providers: [
  {
    provide: APP_GUARD,
    useClass: JwtAuthGuard, // ← Protege TODAS las rutas
  },
]
```

### Marcar Rutas como Públicas

```typescript
import { Controller, Get, Post } from '@nestjs/common'
import { Public } from './auth/decorators/public.decorator'

@Controller('products')
export class ProductsController {
  // Ruta PÚBLICA - No requiere autenticación
  @Public()
  @Get()
  async findAll() {
    return 'Lista pública de productos'
  }

  // Ruta PROTEGIDA - Requiere JWT
  @Post()
  async create() {
    return 'Solo usuarios autenticados'
  }
}
```

### Obtener Usuario Actual

```typescript
import { Controller, Get } from '@nestjs/common'
import { CurrentUser } from './auth/decorators/current-user.decorator'
import type { UserEntity } from './users/entities/user.entity'

@Controller('profile')
export class ProfileController {
  // Obtener el usuario completo
  @Get()
  async getProfile(@CurrentUser() user: UserEntity) {
    return user // Usuario con roles cargados
  }

  // Obtener solo el ID del usuario
  @Get('id')
  async getUserId(@CurrentUser('id') userId: string) {
    return { userId }
  }

  // Obtener solo el email
  @Get('email')
  async getUserEmail(@CurrentUser('email') email: string) {
    return { email }
  }
}
```

### Combinar con Guards de Roles

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common'
import { Roles } from './users/decorators/roles.decorator'
import { RolesGuard } from './users/guards/roles.guard'
import { Role } from './users/enums/role.enum'

@Controller('admin')
@UseGuards(RolesGuard) // Agrega guard de roles
export class AdminController {
  // Solo ADMIN puede acceder
  @Roles(Role.ADMIN)
  @Get('users')
  async listAllUsers() {
    return 'Lista de usuarios (solo admin)'
  }

  // ADMIN o GERENTE pueden acceder
  @Roles(Role.ADMIN, Role.GERENTE)
  @Get('reports')
  async getReports() {
    return 'Reportes'
  }
}
```

---

## 🔒 Seguridad Implementada

### 1. **Password Hashing**

```typescript
// bcrypt con 10 salt rounds
const hashedPassword = await bcrypt.hash(password, 10)
```

### 2. **Refresh Token Rotation**

- Cada vez que se renueva un token, el anterior es **revocado**
- Si se detecta reutilización, **TODOS** los tokens del usuario son revocados

### 3. **Token Storage Seguro**

- Los refresh tokens se guardan **hasheados** en BD
- NO se almacenan en texto plano
- Se registra IP y User-Agent para auditoría

### 4. **Validaciones Estrictas de Password**

```typescript
// Regex de validación
/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/

// Requiere:
- Al menos 8 caracteres
- Una mayúscula
- Una minúscula
- Un número
- Un carácter especial
```

### 5. **Access Token de Corta Duración**

- Access tokens: **15 minutos**
- Refresh tokens: **7 días**
- Si el access token expira, se renueva con refresh token

### 6. **Cleanup Automático**

```typescript
// Limpiar tokens expirados periódicamente
await authService.cleanupExpiredTokens()
```

---

## ⚙️ Configuración

### Variables de Entorno (.env)

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
```

**IMPORTANTE:**

- Usa secrets largos y aleatorios
- NUNCA commits los secrets al repositorio
- Usa secrets diferentes para JWT_SECRET y JWT_REFRESH_SECRET

### Generar Secrets Seguros

```bash
# Opción 1: OpenSSL
openssl rand -base64 32

# Opción 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 📊 Payload del JWT

### Access Token Payload

```json
{
  "sub": "user-uuid",
  "email": "john@example.com",
  "username": "johndoe",
  "roles": ["cliente", "auditor"],
  "iat": 1609459200,
  "exp": 1609460100
}
```

### Refresh Token Payload

```json
{
  "sub": "user-uuid",
  "tokenId": "refresh-token-uuid-in-db",
  "iat": 1609459200,
  "exp": 1609545600
}
```

---

## 🧪 Testing

### Mockear AuthService en Tests

```typescript
import { Test } from '@nestjs/testing'
import { AuthService } from './auth/auth.service'

describe('UsersController', () => {
  let authService: AuthService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn(),
            login: jest.fn(),
            register: jest.fn(),
            // ... otros métodos
          },
        },
      ],
    }).compile()

    authService = module.get<AuthService>(AuthService)
  })

  it('should login user', async () => {
    jest.spyOn(authService, 'login').mockResolvedValue({
      user: mockUser,
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh',
      expiresIn: 900,
    })

    // Test...
  })
})
```

---

## 🔄 Flujo Completo Cliente-Servidor

### Primera Vez (Registro/Login)

```
1. Cliente → POST /auth/register o /auth/login
2. Servidor → Valida credenciales
3. Servidor → Genera Access Token (AT) + Refresh Token (RT)
4. Servidor → Guarda RT en BD
5. Cliente ← Recibe { AT, RT }
6. Cliente → Guarda AT en memoria y RT en localStorage (HttpOnly cookie es mejor)
```

### Requests Normales

```
1. Cliente → GET /api/users (Headers: Authorization: Bearer <AT>)
2. Servidor → JwtAuthGuard valida AT
3. Servidor → Procesa request
4. Cliente ← Recibe datos
```

### Cuando Access Token Expira

```
1. Cliente → GET /api/users (AT expirado)
2. Servidor ← 401 Unauthorized
3. Cliente → POST /auth/refresh { refreshToken: RT }
4. Servidor → Valida RT
5. Servidor → Revoca RT antiguo
6. Servidor → Genera nuevos AT + RT
7. Cliente ← Recibe { AT nuevo, RT nuevo }
8. Cliente → Reintenta request original con AT nuevo
```

---

## 📝 Mejores Prácticas

### ✅ DO

1. **Usar HTTPS** en producción
2. **Rotar tokens** en cada refresh
3. **Guardar RT en HttpOnly cookies** (más seguro que localStorage)
4. **Implementar rate limiting** en login/register
5. **Verificar IP/User-Agent** en requests críticos
6. **Ejecutar cleanup periódico** de tokens expirados
7. **Revocar tokens** al cambiar password

### ❌ DON'T

1. **NO guardar RT en localStorage** si es posible (XSS vulnerable)
2. **NO usar secrets débiles** en producción
3. **NO enviar passwords** en logs o errores
4. **NO permitir tokens de larga duración** sin refresh
5. **NO omitir validación** de datos de entrada
6. **NO commitear secrets** al repositorio

---

## 🚀 Próximos Pasos

### Mejoras Opcionales

1. **OAuth Social (Google, Facebook)**
   - Agregar Google OAuth Strategy
   - Integrar con @nestjs/passport-google

2. **Two-Factor Authentication (2FA)**
   - TOTP con `speakeasy`
   - QR codes con `qrcode`

3. **Email Verification**
   - Tokens de verificación
   - Envío de emails con Nodemailer

4. **Password Reset**
   - Tokens de un solo uso
   - Emails de recuperación

5. **Rate Limiting**
   - `@nestjs/throttler`
   - Prevenir brute force attacks

6. **Account Lockout**
   - Bloquear después de N intentos fallidos
   - Desbloqueo automático después de X minutos

---

## 📚 Recursos

- [JWT.io](https://jwt.io/) - Debugger de JWT
- [Passport.js](http://www.passportjs.org/) - Documentación de Passport
- [OAuth 2.0](https://oauth.net/2/) - Especificación OAuth
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Seguridad web

---

## Resumen

✅ Sistema completo de autenticación OAuth 2.0
✅ JWT con Access Tokens (15 min) + Refresh Tokens (7 días)
✅ Token rotation para máxima seguridad
✅ Password hashing con bcrypt
✅ Guards globales para protección automática
✅ Decorators para rutas públicas y obtener usuario
✅ Validaciones estrictas de contraseñas
✅ Storage seguro de tokens en BD

**El sistema está listo para producción!** 🎉

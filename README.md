# ATR - Audit & Assessment System

Sistema de auditoría y evaluación construido con NestJS, TypeScript, TypeORM y PostgreSQL.

## Descripción

Sistema empresarial para gestión de auditorías, evaluaciones y cumplimiento normativo. Implementa Clean Architecture con patrones CQRS, autenticación stateless JWT, y sistema de roles y permisos granulares.

### Características Principales

- **Autenticación y Autorización**: JWT stateless con refresh tokens, sistema RBAC (Role-Based Access Control)
- **Arquitectura Escalable**: Clean Architecture + CQRS pattern
- **Testing**: Suite completa de tests unitarios con 100% coverage en módulos principales
- **TypeScript**: Tipado estricto con ESLint configurado
- **Base de Datos**: PostgreSQL con TypeORM y migrations

## Documentación

### Arquitectura

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Visión general de la arquitectura del proyecto

### Guías de Desarrollo

Todas las guías están organizadas en [`/docs/guides/`](./docs/guides/):

- **Autenticación y Autorización**
  - [AUTH-SYSTEM-GUIDE.md](./docs/guides/AUTH-SYSTEM-GUIDE.md) - Sistema de autenticación completo
  - [STATELESS-AUTH-GUIDE.md](./docs/guides/STATELESS-AUTH-GUIDE.md) - Autenticación JWT stateless
  - [ROLES-PERMISSIONS-GUIDE.md](./docs/guides/ROLES-PERMISSIONS-GUIDE.md) - Sistema de roles y permisos
  - [PERMISSION-HELPERS-GUIDE.md](./docs/guides/PERMISSION-HELPERS-GUIDE.md) - Helpers de permisos reutilizables
  - [AUTHORIZATION-IMPROVEMENTS.md](./docs/guides/AUTHORIZATION-IMPROVEMENTS.md) - Mejoras de autorización

- **Patrones y Testing**
  - [REPOSITORY-PATTERN.md](./docs/guides/REPOSITORY-PATTERN.md) - Patrón Repository
  - [TESTING-GUIDE.md](./docs/guides/TESTING-GUIDE.md) - Guía general de testing
  - [TESTING-USE-CASES-GUIDE.md](./docs/guides/TESTING-USE-CASES-GUIDE.md) - Testing de use cases

- **Migración y Refactorización**
  - [USE-CASES-MIGRATION-GUIDE.md](./docs/guides/USE-CASES-MIGRATION-GUIDE.md) - Migrar servicios a use cases
  - [MIGRATION-PATTERNS.md](./docs/guides/MIGRATION-PATTERNS.md) - Patrones de migración

### Resumen de Refactorización

- [RESUMEN-REFACTORIZACION.md](./docs/summary/RESUMEN-REFACTORIZACION.md) - Resumen completo de la refactorización del módulo Users

## Configuración del Proyecto

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

Copia el archivo `.env.example` a `.env` y configura las variables:

```bash
cp .env.example .env
```

Edita `.env` con tus configuraciones de base de datos, JWT, etc.

### 3. Iniciar Base de Datos (Docker)

```bash
docker-compose up -d
```

### 4. Ejecutar Migraciones

```bash
npm run migration:run
```

### 5. (Opcional) Ejecutar Seeds

```bash
npm run seed:run
```

## Desarrollo

```bash
# modo desarrollo con hot-reload
npm run start:dev

# compilar proyecto
npm run build

# modo producción
npm run start:prod
```

## Testing

```bash
# tests unitarios
npm test

# tests con watch mode
npm run test:watch

# coverage
npm run test:cov

# tests específicos
npm test users
npm test create-user
```

Consulta [TESTING-GUIDE.md](./docs/guides/TESTING-GUIDE.md) para más información sobre testing.

## Linting y Formato

```bash
# verificar lint
npm run lint

# auto-fix lint
npm run lint --fix

# formatear código
npm run format
```

## Commits

Este proyecto usa **Conventional Commits** con Commitizen. Para hacer commits:

```bash
# agregar cambios
git add .

# commit interactivo (recomendado)
npm run commit
```

Ver [CONTRIBUTING.md](./CONTRIBUTING.md) para más detalles sobre el flujo de trabajo.

## Estructura del Proyecto

```
src/
├── @core/                 # Core compartido (email, config, etc.)
├── @shared/               # Código compartido entre módulos
└── modules/               # Módulos de dominio
    ├── auth/              # Autenticación (login, register, JWT)
    ├── authorization/     # Autorización (roles, permisos)
    └── users/             # Gestión de usuarios (CQRS)
        ├── use-cases/     # Commands y Queries
        ├── services/      # Servicios de validación
        ├── repositories/  # Acceso a datos
        ├── entities/      # Entidades TypeORM
        └── testing/       # Mocks y helpers de testing

docs/
├── guides/                # Guías de desarrollo
└── summary/               # Resúmenes de refactorización
```

## Tecnologías

- **Framework**: NestJS 10
- **Lenguaje**: TypeScript 5
- **Base de Datos**: PostgreSQL + TypeORM
- **Autenticación**: JWT (access + refresh tokens)
- **Testing**: Jest
- **Linting**: ESLint + Prettier
- **Commits**: Conventional Commits + Commitizen + Husky

## Licencia

MIT

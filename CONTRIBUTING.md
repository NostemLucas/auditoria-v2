# Guía de Contribución

## Commits con Conventional Commits

Este proyecto usa **Commitizen** y **Conventional Commits** para mantener un historial de commits limpio y semántico.

### Hacer un commit

En lugar de usar `git commit`, usa:

```bash
npm run commit
```

o

```bash
git cz
```

Esto abrirá un asistente interactivo que te guiará para crear un commit con el formato correcto.

### Formato de Commits

Los commits siguen el formato:

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Types (tipos)

- **feat**: Nueva funcionalidad
- **fix**: Corrección de bug
- **docs**: Cambios en documentación
- **style**: Cambios de formato (espacios, comas, etc)
- **refactor**: Refactorización de código
- **perf**: Mejoras de rendimiento
- **test**: Añadir o modificar tests
- **build**: Cambios en build o dependencias
- **ci**: Cambios en CI/CD
- **chore**: Otras tareas (actualizar deps, etc)
- **revert**: Revertir un commit anterior

#### Ejemplos

```bash
feat(notifications): agregar soporte para notificaciones push
fix(websocket): corregir desconexión de clientes
docs(readme): actualizar instrucciones de instalación
refactor(api): simplificar endpoints de notificaciones
test(e2e): agregar tests para salas dinámicas
```

### Pre-commit Hook

Antes de cada commit, automáticamente se ejecuta:

1. **lint-staged**: Formatea y corrige el código
   - ESLint arregla problemas de código
   - Prettier formatea el código

### Commit-msg Hook

Después de escribir el mensaje de commit, automáticamente se valida:

1. **commitlint**: Verifica que el mensaje cumpla con Conventional Commits

Si el mensaje no cumple el formato, el commit será rechazado.

### Flujo de Trabajo Completo

```bash
# 1. Hacer cambios en el código
vim src/notifications/notifications.service.ts

# 2. Agregar archivos al staging
git add .

# 3. Hacer commit usando commitizen
npm run commit

# El asistente te preguntará:
# - Tipo de commit (feat, fix, etc)
# - Scope (opcional): módulo afectado
# - Descripción corta
# - Descripción larga (opcional)
# - Breaking changes (opcional)
# - Issues relacionados (opcional)

# 4. Push
git push
```

### Bypass de Hooks (NO RECOMENDADO)

Si necesitas hacer un commit sin pasar por los hooks:

```bash
git commit --no-verify -m "mensaje"
```

**Nota**: Esto NO es recomendado ya que puede romper el formato del historial.

## Proceso de Desarrollo

1. **Fork** el repositorio
2. Crea una **rama** para tu feature: `git checkout -b feat/nueva-funcionalidad`
3. Haz tus cambios y **commits** usando `npm run commit`
4. **Push** a tu fork: `git push origin feat/nueva-funcionalidad`
5. Abre un **Pull Request**

## Code Style

- El proyecto usa **ESLint** y **Prettier**
- La configuración está en `eslint.config.mjs` y `.prettierrc`
- Ejecuta `npm run lint` para verificar el código
- Ejecuta `npm run format` para formatear

## Tests

Antes de hacer un PR, asegúrate de que pasen todos los tests:

```bash
# Tests unitarios
npm test

# Tests E2E
npm run test:e2e

# Coverage
npm run test:cov
```

## Estructura de Commits

### Breaking Changes

Si introduces un cambio que rompe compatibilidad:

```bash
feat(api)!: cambiar estructura de respuesta de notificaciones

BREAKING CHANGE: La estructura de respuesta ahora incluye metadata adicional
```

### Referencias a Issues

```bash
fix(websocket): corregir pérdida de conexión

Closes #123
```

## Ejemplo Completo

```bash
# Hacer cambios
vim src/notifications/notifications.service.ts

# Agregar al staging
git add src/notifications/notifications.service.ts

# Commit interactivo
npm run commit

# Seleccionar:
# Type: feat
# Scope: notifications
# Subject: agregar filtro por tipo de notificación
# Body: Permite filtrar notificaciones por tipo (info, warning, error, success)
# Breaking changes: n
# Issues: #45

# Resultado:
# feat(notifications): agregar filtro por tipo de notificación
#
# Permite filtrar notificaciones por tipo (info, warning, error, success)
#
# Closes #45

# Push
git push
```

## Recursos

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Commitizen](https://github.com/commitizen/cz-cli)
- [Commitlint](https://commitlint.js.org/)

# Guía Rápida de Commits

## Uso Simple

```bash
# En lugar de: git commit -m "mensaje"
# Usa:
npm run commit
```

## Tipos de Commit

| Tipo | Cuándo usarlo | Ejemplo |
|------|---------------|---------|
| **feat** | Nueva funcionalidad | `feat(auth): agregar login con Google` |
| **fix** | Corrección de bug | `fix(websocket): resolver desconexión aleatoria` |
| **docs** | Documentación | `docs(readme): actualizar guía de instalación` |
| **style** | Formato (no cambia lógica) | `style(api): formatear código con prettier` |
| **refactor** | Refactorizar código | `refactor(service): simplificar lógica de notificaciones` |
| **perf** | Mejora de rendimiento | `perf(db): optimizar query de notificaciones` |
| **test** | Tests | `test(e2e): agregar tests de salas` |
| **build** | Build/dependencias | `build(deps): actualizar TypeORM a v0.3.28` |
| **ci** | CI/CD | `ci(github): agregar workflow de tests` |
| **chore** | Otras tareas | `chore(git): actualizar .gitignore` |

## Flujo de Trabajo

```bash
# 1. Hacer cambios
vim src/file.ts

# 2. Agregar al staging
git add .

# 3. Commit con asistente
npm run commit
```

El asistente te preguntará:

1. **Type**: Selecciona el tipo (feat, fix, etc)
2. **Scope**: Módulo afectado (opcional): `notifications`, `api`, `websocket`, etc
3. **Subject**: Descripción corta (imperativo): "agregar función X"
4. **Body**: Descripción larga (opcional)
5. **Breaking changes**: ¿Rompe compatibilidad? (generalmente "n")
6. **Issues**: Número de issue relacionado (opcional): `#123`

## Ejemplos Reales

### Nueva Funcionalidad
```
feat(notifications): agregar filtro por tipo

Permite filtrar notificaciones por tipo (info, warning, error, success).
La API ahora acepta el parámetro ?type=info

Closes #45
```

### Corrección de Bug
```
fix(websocket): corregir pérdida de conexión

Los clientes se desconectaban después de 30s de inactividad.
Ahora el heartbeat mantiene la conexión activa.

Fixes #78
```

### Documentación
```
docs(api): agregar ejemplos de uso de WebSocket

Incluye ejemplos en JavaScript, React y Vue
```

### Refactorización
```
refactor(service): extraer lógica de validación

Mueve la validación de notificaciones a un servicio separado
para mejorar la testabilidad
```

## Validaciones Automáticas

### Pre-commit (antes de commit)
- ✅ ESLint corrige problemas de código
- ✅ Prettier formatea el código
- ✅ Solo archivos en staging

### Commit-msg (al hacer commit)
- ✅ Valida formato Conventional Commits
- ✅ Verifica longitud del mensaje (max 100 chars)
- ✅ Verifica que no termine en punto

## Atajos

```bash
# Commit rápido (solo si el código ya está formateado)
npm run commit

# Ver formato de último commit
git log -1 --pretty=format:"%s"

# Editar último commit (solo si no has hecho push)
git commit --amend
```

## Errores Comunes

### ❌ Mensaje muy largo
```
feat(notifications): agregar nueva funcionalidad super completa para enviar notificaciones a usuarios de manera eficiente
```

### ✅ Mensaje correcto
```
feat(notifications): agregar envío eficiente a usuarios
```

---

### ❌ No usar imperativo
```
feat(auth): agregando login
fix(api): corregido el bug
```

### ✅ Usar imperativo
```
feat(auth): agregar login
fix(api): corregir bug
```

---

### ❌ Capitalizar
```
Feat(auth): Agregar Login
```

### ✅ Minúsculas
```
feat(auth): agregar login
```

## Tips

1. **Subject en imperativo**: "agregar", "corregir", "actualizar" (no "agregando", "corregido")
2. **Máximo 100 caracteres** en el header
3. **Sin punto final** en el subject
4. **Scope opcional** pero útil para proyectos grandes
5. **Body explica el QUÉ y el POR QUÉ**, no el cómo

## Más Información

Ver [CONTRIBUTING.md](./CONTRIBUTING.md) para detalles completos.

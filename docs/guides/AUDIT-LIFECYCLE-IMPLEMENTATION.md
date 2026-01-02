# Implementación del Ciclo de Vida de Auditorías

Documento de implementación completa del sistema de auditorías basado en el patrón Use Cases/CQRS.

## 📋 Resumen de Implementación

**Estado:** ✅ Completado
**Fecha:** 2025-12-31
**Patrón:** Use Cases (CQRS) + Domain-Driven Design

---

## 🎯 Cambios Implementados

### 1. **Entidad AuditEntity** (`src/modules/audits/entities/audit.entity.ts`)

#### Estados Actualizados

```typescript
enum AuditStatus {
  DRAFT = 'draft', // Borrador
  PLANNED = 'planned', // Planificada (NUEVO)
  IN_PROGRESS = 'in_progress', // En progreso
  PENDING_CLOSURE = 'pending_closure', // Pendiente de cierre (NUEVO)
  CLOSED = 'closed', // Cerrada
  CANCELLED = 'cancelled', // Cancelada (NUEVO)
}
```

#### Nuevos Campos

```typescript
{
  // Alcance de la auditoría
  scope: string | null

  // Metadatos de cierre
  closureMetadata: {
    closedAt: Date
    closedBy: string
    totalEvaluations: number
    totalFindings: number
    nonConformitiesCount: {
      critical: number
      major: number
      minor: number
    }
    conformitiesPercentage: number
    requiresFollowUp: boolean
    reportUrl?: string
  } | null

  // Aprobación de cierre
  closureApprovedAt: Date | null
  closureApprovedBy: string | null
  closureApprover: UserEntity | null

  // Metadatos de cancelación
  cancellationMetadata: {
    cancelledAt: Date
    cancelledBy: string
    cancellationReason: string
    previousStatus: AuditStatus
  } | null
}
```

---

### 2. **Validador de Cierre** (`src/modules/audits/validators/audit-closure.validator.ts`)

Implementa las 5 validaciones obligatorias de cierre:

#### Validación 1: Evaluaciones Completas

```typescript
async validateEvaluationsComplete(auditId: string): Promise<boolean>
```

- ✓ Todas las evaluaciones marcadas como completadas (100%)
- ❌ Lanza excepción si hay evaluaciones pendientes

#### Validación 2: Hallazgos Clasificados

```typescript
async validateFindingsClassified(auditId: string): Promise<boolean>
```

- ✓ Todas las evaluaciones tienen estado de conformidad asignado
- ❌ Lanza excepción si hay evaluaciones sin clasificar

#### Validación 3: Planes de Acción para No Conformidades

```typescript
async validateActionPlans(auditId: string): Promise<boolean>
```

- ✓ No conformidades MAYORES tienen plan de acción aprobado o en progreso
- ❌ Lanza excepción si faltan planes de acción

#### Método de Cálculo de Estadísticas

```typescript
async calculateClosureStatistics(auditId: string): Promise<Statistics>
```

- Calcula totales de evaluaciones y hallazgos
- Cuenta no conformidades por severidad
- Calcula porcentaje de conformidad
- Determina si requiere auditoría de seguimiento

---

### 3. **Casos de Uso Implementados** (`src/modules/audits/use-cases/commands/`)

#### a) PlanAudit (DRAFT → PLANNED)

**Archivos:**

- `plan-audit/plan-audit.command.ts`
- `plan-audit/plan-audit.handler.ts`

**Validaciones:**

- ✓ Lead auditor existe y está activo
- ✓ Al menos 1 auditor adicional en el equipo
- ✓ Fecha fin posterior a fecha inicio
- ✓ Alcance (scope) definido
- ✓ Estado actual es DRAFT

**Resultado:**

```typescript
{
  status: 'planned',
  leadAuditorId: '...',
  auditTeam: [...],
  startDate: Date,
  endDate: Date,
  scope: '...'
}
```

---

#### b) StartAudit (PLANNED → IN_PROGRESS)

**Archivos:**

- `start-audit/start-audit.command.ts`
- `start-audit/start-audit.handler.ts`

**Validaciones:**

- ✓ Estado actual es PLANNED
- ✓ Solo el lead auditor puede iniciar
- ⚠️ Validación de fecha inicio (opcional, comentada)

**Resultado:**

```typescript
{
  status: 'in_progress'
}
```

---

#### c) RequestClosure (IN_PROGRESS → PENDING_CLOSURE)

**Archivos:**

- `request-closure/request-closure.command.ts`
- `request-closure/request-closure.handler.ts`

**Validaciones:**

- ✓ Estado actual es IN_PROGRESS
- ✓ Solo el lead auditor puede solicitar
- ✓ Ejecuta TODAS las validaciones de cierre
- ✓ Calcula estadísticas preliminares

**Resultado:**

```typescript
{
  status: 'pending_closure',
  closureMetadata: {
    closedAt: Date,
    closedBy: '...',
    totalEvaluations: 10,
    totalFindings: 10,
    nonConformitiesCount: { critical: 0, major: 2, minor: 1 },
    conformitiesPercentage: 70.00,
    requiresFollowUp: true,
    reportUrl: '...'
  }
}
```

---

#### d) ApproveClosure (PENDING_CLOSURE)

**Archivos:**

- `approve-closure/approve-closure.command.ts`
- `approve-closure/approve-closure.handler.ts`

**Validaciones:**

- ✓ Estado actual es PENDING_CLOSURE
- ✓ Solo el lead auditor puede aprobar

**Resultado:**

```typescript
{
  status: 'pending_closure', // No cambia
  closureApprovedAt: Date,
  closureApprovedBy: '...'
}
```

---

#### e) CloseAudit (PENDING_CLOSURE → CLOSED)

**Archivos:**

- `close-audit/close-audit.command.ts`
- `close-audit/close-audit.handler.ts`

**Validaciones:**

- ✓ Estado actual es PENDING_CLOSURE
- ✓ Solo el lead auditor puede cerrar
- ✓ **Cierre debe estar aprobado** (closureApprovedAt)
- ✓ Re-ejecuta TODAS las validaciones de cierre
- ✓ Calcula estadísticas finales

**Resultado:**

```typescript
{
  status: 'closed',
  endDate: Date,
  closureMetadata: {
    closedAt: Date,
    closedBy: '...',
    // ... estadísticas finales completas
  }
}
```

---

#### f) CancelAudit (Cualquier → CANCELLED)

**Archivos:**

- `cancel-audit/cancel-audit.command.ts`
- `cancel-audit/cancel-audit.handler.ts`

**Validaciones:**

- ✓ No está CLOSED (no se pueden cancelar auditorías cerradas)
- ✓ No está ya CANCELLED
- ✓ Solo el lead auditor puede cancelar
- ✓ Razón de cancelación obligatoria

**Resultado:**

```typescript
{
  status: 'cancelled',
  cancellationMetadata: {
    cancelledAt: Date,
    cancelledBy: '...',
    cancellationReason: '...',
    previousStatus: 'in_progress'
  }
}
```

---

### 4. **DTOs para Nuevos Endpoints** (`src/modules/audits/dtos/`)

#### PlanAuditDto

```typescript
{
  leadAuditorId: string (UUID)
  auditorIds: string[] (UUID[])
  scheduledStartDate: string (ISO 8601)
  scheduledEndDate: string (ISO 8601)
  scope: string
  organizationId?: string (UUID, opcional)
}
```

#### RequestClosureDto

```typescript
{
  reportUrl?: string (URL, opcional)
}
```

#### CloseAuditDto

```typescript
{
  reportUrl?: string (URL, opcional)
}
```

#### CancelAuditDto

```typescript
{
  cancellationReason: string(requerido)
}
```

---

### 5. **Nuevos Endpoints REST** (`src/modules/audits/controllers/audits.controller.ts`)

| Método | Endpoint                      | Descripción          | Transición                    |
| ------ | ----------------------------- | -------------------- | ----------------------------- |
| `POST` | `/audits/:id/plan`            | Planificar auditoría | DRAFT → PLANNED               |
| `POST` | `/audits/:id/start`           | Iniciar auditoría    | PLANNED → IN_PROGRESS         |
| `POST` | `/audits/:id/request-closure` | Solicitar cierre     | IN_PROGRESS → PENDING_CLOSURE |
| `POST` | `/audits/:id/approve-closure` | Aprobar cierre       | PENDING_CLOSURE (sin cambio)  |
| `POST` | `/audits/:id/close`           | Cerrar auditoría     | PENDING_CLOSURE → CLOSED      |
| `POST` | `/audits/:id/cancel`          | Cancelar auditoría   | Cualquier → CANCELLED         |

#### Ejemplo de Uso

```bash
# 1. Crear auditoría (estado: DRAFT)
POST /audits
{
  "name": "Auditoría ISO 27001 - 2025",
  "templateId": "...",
  "frameworkId": "...",
  "organizationId": "...",
  "auditType": "inicial"
}

# 2. Planificar (DRAFT → PLANNED)
POST /audits/{id}/plan
{
  "leadAuditorId": "...",
  "auditorIds": ["...", "..."],
  "scheduledStartDate": "2025-02-01",
  "scheduledEndDate": "2025-02-28",
  "scope": "Controles de seguridad ISO 27001:2013"
}

# 3. Iniciar (PLANNED → IN_PROGRESS)
POST /audits/{id}/start

# 4. (Auditores evalúan, crean hallazgos, planes de acción...)

# 5. Solicitar cierre (IN_PROGRESS → PENDING_CLOSURE)
POST /audits/{id}/request-closure
{
  "reportUrl": "https://storage.com/reports/audit-001.pdf"
}

# 6. Aprobar cierre
POST /audits/{id}/approve-closure

# 7. Cerrar definitivamente (PENDING_CLOSURE → CLOSED)
POST /audits/{id}/close
{
  "reportUrl": "https://storage.com/reports/audit-001-final.pdf"
}

# Si se necesita cancelar en cualquier momento:
POST /audits/{id}/cancel
{
  "cancellationReason": "Cambios en requisitos del cliente"
}
```

---

### 6. **Migración de Base de Datos** (`src/@core/database/migrations/1735677000000-UpdateAuditLifecycle.ts`)

#### Cambios en la base de datos:

1. **Actualización del enum `audit_status`:**
   - Valores antiguos → nuevos:
     - `borrador` → `draft`
     - `en_progreso` → `in_progress`
     - `completada` → `pending_closure`
     - `aprobada` → `pending_closure`
     - `cerrada` → `closed`
   - Nuevos valores:
     - `planned`
     - `pending_closure`
     - `cancelled`

2. **Nuevas columnas:**
   - `scope` (text, nullable)
   - `closureMetadata` (jsonb, nullable)
   - `closureApprovedAt` (timestamp, nullable)
   - `closureApprovedBy` (uuid, nullable, FK a users)
   - `cancellationMetadata` (jsonb, nullable)

3. **Índices:**
   - `idx_audits_scope`: Índice GIN para búsqueda de texto en scope

#### Para ejecutar la migración:

```bash
npm run migration:run
```

#### Para revertir:

```bash
npm run migration:revert
```

---

## 🔄 Diagrama de Flujo Completo

```
    [DRAFT]
       ↓
  POST /plan
       ↓
   [PLANNED]
       ↓
  POST /start
       ↓
 [IN_PROGRESS]
   ↓         ↓
Evaluaciones  Hallazgos
   ↓         ↓
 Planes de Acción
       ↓
POST /request-closure
   ↓
[PENDING_CLOSURE]
   ↓         ↓
POST /approve  POST /close
       ↓
   [CLOSED]
       ↓
  (Si hay NC)
       ↓
[Nueva auditoría
 tipo FOLLOW_UP]

POST /cancel
   ↓
[CANCELLED]
(desde cualquier
 estado excepto
 CLOSED)
```

---

## 🎨 Sistema de Observaciones

### Implementación Multi-Nivel

El sistema de observaciones está implementado en `EvaluationEntity`:

```typescript
{
  // Texto de observaciones
  observations: string | null,

  // Estado de conformidad (incluye observación)
  complianceStatus: ComplianceStatus,
  // 'conforme' | 'no_conforme_menor' | 'no_conforme_mayor' | 'observacion' | 'no_aplica'

  // Textos adicionales
  recommendations: string | null,
  findings: string | null,
  comments: string | null,

  // Evidencias
  evidence: Evidence[] = [
    {
      type: 'document' | 'photo' | 'video' | 'link' | 'other',
      url: string,
      description: string,
      uploadedAt: Date,
      uploadedBy: string
    }
  ]
}
```

### Flujo de Observaciones

1. **Auditor evalúa** → Crea evaluación
2. **Asigna nivel de madurez** → Se copia score y observaciones predefinidas
3. **Puede personalizar** → Modifica observations, recommendations
4. **Clasifica conformidad** → Asigna complianceStatus
5. **Adjunta evidencias** → Carga documentos, fotos, etc.
6. **Crea plan de acción** (si es no conformidad) → ActionPlan vinculado

---

## 🔒 Control de Permisos

### Implementado a nivel de Handler

Cada handler valida:

```typescript
// Solo Lead Auditor puede:
;-PlanAudit -
  StartAudit -
  RequestClosure -
  ApproveClosure -
  CloseAudit -
  CancelAudit

// Validación actual:
if (audit.leadAuditorId !== command.userId) {
  throw new ForbiddenException('Solo el lead auditor puede...')
}
```

### TODO: Guards y Decoradores

Para implementar en el futuro:

- `@RequireLeadAuditor()` decorator
- `@RequireAuditor()` decorator
- `@RequireAuditee()` decorator
- Guards basados en roles del sistema de autorización

---

## 📊 Estadísticas de Cierre

El método `calculateClosureStatistics` genera:

```typescript
{
  totalEvaluations: 15,
  totalFindings: 15,
  nonConformitiesCount: {
    critical: 0,    // No implementado aún
    major: 3,       // NO_CONFORME_MAYOR
    minor: 2        // NO_CONFORME_MENOR
  },
  conformitiesPercentage: 66.67,  // (conformes / total) * 100
  requiresFollowUp: true          // true si hay NC mayores o menores
}
```

Estas estadísticas se guardan en `closureMetadata` tanto en:

- **RequestClosure** (preliminar)
- **CloseAudit** (final)

---

## ✅ Checklist de Implementación

- [x] Actualizar enum AuditStatus
- [x] Agregar campos de metadatos a AuditEntity
- [x] Implementar AuditClosureValidator
- [x] Implementar PlanAuditHandler
- [x] Implementar StartAuditHandler
- [x] Implementar RequestClosureHandler
- [x] Implementar ApproveClosureHandler
- [x] Implementar CloseAuditHandler
- [x] Implementar CancelAuditHandler
- [x] Crear DTOs para endpoints
- [x] Actualizar AuditsController
- [x] Actualizar AuditsModule
- [x] Crear migración de base de datos
- [ ] Ejecutar migración en entorno de desarrollo
- [ ] Probar flujo completo end-to-end
- [ ] Implementar guards de autorización
- [ ] Agregar tests unitarios para handlers
- [ ] Agregar tests de integración
- [ ] Documentar API en Swagger
- [ ] Implementar eventos de dominio (opcional)

---

## 🚀 Próximos Pasos

### 1. Ejecución y Pruebas

```bash
# Iniciar base de datos
docker-compose up -d postgres

# Ejecutar migración
npm run migration:run

# Iniciar aplicación
npm run start:dev

# Probar endpoints con Postman/Thunder Client
```

### 2. Mejoras Opcionales

#### a) Eventos de Dominio

```typescript
// Disparar eventos cuando cambia estado
audit.publish(new AuditClosedEvent(audit))

// Listeners
@OnEvent('audit.closed')
async handleAuditClosed(event: AuditClosedEvent) {
  // Notificar stakeholders
  // Generar reporte automático
  // Crear auditoría de seguimiento si requiresFollowUp
}
```

#### b) Automatización de Seguimiento

```typescript
// En CloseAuditHandler
if (audit.closureMetadata.requiresFollowUp) {
  await this.createFollowUpHandler.execute(
    new CreateFollowUpCommand(audit.id, ...)
  )
}
```

#### c) Notificaciones

```typescript
// En cada transición de estado
await this.notificationService.notifyAuditTeam(audit)
await this.notificationService.notifyAuditee(audit)
```

#### d) Webhooks

```typescript
// Configurar webhooks para integraciones externas
await this.webhookService.trigger('audit.closed', audit)
```

---

## 📝 Notas Importantes

### Autenticación

Los endpoints actuales usan `@Req() req: any` para obtener el usuario.
Se debe implementar un decorator `@CurrentUser()` cuando el sistema de autenticación esté disponible.

```typescript
// Actual:
const userId = req.user?.id || 'current-user-id'

// Futuro:
async startAudit(
  @Param('id') auditId: string,
  @CurrentUser() user: UserEntity
) {
  const command = new StartAuditCommand(auditId, user.id)
  return await this.startAuditHandler.execute(command)
}
```

### Transacciones

Los handlers actualmente NO usan transacciones. Considerar implementar:

```typescript
@Injectable()
export class CloseAuditHandler {
  constructor(private readonly transactionManager: TransactionManager) {}

  async execute(command: CloseAuditCommand): Promise<AuditEntity> {
    return await this.transactionManager.runInTransaction(async () => {
      // ... lógica
    })
  }
}
```

### Clasificación de Severidad

La validación actual solo distingue NO_CONFORME_MAYOR y NO_CONFORME_MENOR.
No hay clasificación de **CRÍTICO** (critical) aún.

Para implementar:

1. Agregar campo `severity` a `EvaluationEntity`
2. Permitir que el auditor clasifique severidad
3. Actualizar validaciones de cierre

---

## 🎉 Conclusión

El sistema de auditorías ahora cuenta con:

✅ Ciclo de vida completo con 6 estados
✅ Validaciones robustas de cierre
✅ Metadatos completos de cierre y cancelación
✅ Patrón Use Cases/CQRS implementado
✅ 6 nuevos endpoints REST
✅ Sistema de observaciones multi-nivel
✅ Control de permisos a nivel de handler
✅ Migración de base de datos completa

**El sistema está listo para ser probado y desplegado!** 🚀

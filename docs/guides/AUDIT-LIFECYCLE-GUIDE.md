# Guía del Ciclo de Vida de Auditorías

Sistema completo de gestión de auditorías basado en estándares internacionales (ISO 19011, ISO 9001).

## 🎯 Objetivo

Implementar el ciclo de vida completo de una auditoría con:

- Estados bien definidos
- Restricciones de negocio
- Roles y permisos
- Auditorías de seguimiento
- Trazabilidad completa

---

## 📊 Estados del Ciclo de Vida

### 1. **DRAFT** (Borrador)

**Descripción:** Auditoría creada pero no planificada

**Características:**

- Recién creada
- Sin fechas definidas
- Sin equipo auditor asignado
- Puede editarse libremente
- Solo visible para el creador y administradores

**Acciones permitidas:**

- Editar información básica
- Asignar organización
- Definir alcance preliminar
- Eliminar (solo creador/admin)

**Transiciones:**

- → **PLANNED**: Al planificar y asignar equipo

---

### 2. **PLANNED** (Planificada)

**Descripción:** Auditoría planificada, lista para iniciar

**Características:**

- Fechas de inicio y fin definidas
- Lead auditor asignado
- Equipo auditor asignado
- Alcance definido
- Plantilla/estándar seleccionado
- Plan de auditoría creado

**Acciones permitidas:**

- Editar fechas (si no ha iniciado)
- Modificar equipo auditor
- Ajustar alcance
- Cargar documentos de planificación

**Transiciones:**

- → **IN_PROGRESS**: Al iniciar la auditoría (fecha de inicio)
- → **CANCELLED**: Si se cancela antes de iniciar
- ← **DRAFT**: Si se despublica (opcional)

**Restricciones para pasar a PLANNED:**

```typescript
✓ Debe tener lead auditor asignado
✓ Debe tener al menos 1 auditor adicional
✓ Debe tener fecha de inicio
✓ Debe tener fecha de fin (posterior a inicio)
✓ Debe tener alcance definido
✓ Debe tener plantilla/estándar seleccionado
```

---

### 3. **IN_PROGRESS** (En Progreso)

**Descripción:** Auditoría en ejecución

**Características:**

- Auditoría activa
- Auditores evaluando
- Se crean hallazgos/no conformidades
- Se generan evidencias
- Reuniones de auditoría

**Acciones permitidas:**

- Crear evaluaciones
- Registrar hallazgos (conformidades, no conformidades, observaciones)
- Cargar evidencias
- Crear planes de acción (para no conformidades)
- Actualizar estado de avance
- Programar reuniones

**Roles y permisos:**

- **Lead Auditor**: Supervisa, aprueba, puede hacer todo
- **Auditores**: Evalúan áreas asignadas, crean hallazgos
- **Auditados**: Pueden ver hallazgos de sus áreas, responder, cargar evidencias

**Transiciones:**

- → **PENDING_CLOSURE**: Al solicitar cierre (lead auditor)
- → **CANCELLED**: Si se cancela (razón justificada)

---

### 4. **PENDING_CLOSURE** (Pendiente de Cierre)

**Descripción:** Evaluación completa, esperando validación para cierre

**Características:**

- Todas las evaluaciones completadas
- Lead auditor revisa resultados
- Se valida que cumple requisitos de cierre
- Se prepara reporte final

**Acciones permitidas:**

- Lead auditor revisa todo
- Se pueden ajustar evaluaciones (si necesario)
- Se genera borrador de reporte
- Se validan planes de acción

**Restricciones de cierre (validaciones):**

```typescript
✓ Todas las evaluaciones completadas (100%)
✓ Todos los hallazgos tienen clasificación
✓ No conformidades CRÍTICAS tienen plan de acción
✓ No conformidades MAYORES tienen plan de acción (opcional según política)
✓ Reporte final generado
✓ Lead auditor aprobó cierre
✓ Documentación cargada
```

**Transiciones:**

- → **CLOSED**: Si cumple todas las restricciones
- ← **IN_PROGRESS**: Si faltan cosas o se encuentra algo nuevo

---

### 5. **CLOSED** (Cerrada)

**Descripción:** Auditoría finalizada y cerrada

**Características:**

- Auditoría completamente finalizada
- Reporte final emitido
- Inmutable (no se pueden editar evaluaciones)
- Histórico preservado
- Se pueden consultar resultados

**Acciones permitidas:**

- Consultar reporte
- Descargar evidencias
- Ver estadísticas
- Exportar datos
- **Crear auditoría de seguimiento** (si hay no conformidades)

**Metadatos de cierre:**

```typescript
{
  closedAt: Date,
  closedBy: UserId,
  totalEvaluations: number,
  totalFindings: number,
  nonConformitiesCount: {
    critical: number,
    major: number,
    minor: number,
  },
  conformitiesPercentage: number,
  requiresFollowUp: boolean,
  reportUrl: string,
}
```

**Transiciones:**

- → **FOLLOW_UP** (nueva auditoría): Si hay no conformidades pendientes

---

### 6. **CANCELLED** (Cancelada)

**Descripción:** Auditoría cancelada

**Características:**

- Cancelada en cualquier estado (excepto CLOSED)
- Razón de cancelación registrada
- Se preserva historial hasta el momento de cancelación

**Acciones permitidas:**

- Solo consulta de historial
- No se puede reactivar (crear nueva en su lugar)

**Metadatos de cancelación:**

```typescript
{
  cancelledAt: Date,
  cancelledBy: UserId,
  cancellationReason: string,
  previousStatus: AuditStatus,
}
```

---

## 🔄 Diagrama de Flujo

```
    [DRAFT]
       ↓
   Planificar
       ↓
   [PLANNED] ←──────┐
       ↓            │
    Iniciar      Despublicar
       ↓            │
 [IN_PROGRESS] ─────┘
       ↓
  Solicitar cierre
       ↓
[PENDING_CLOSURE]
     ↙   ↘
Rechazar  Aprobar
   ↓        ↓
[IN_PROG] [CLOSED]
             ↓
      Crear seguimiento
             ↓
        [Nueva DRAFT]
        tipo: FOLLOW_UP

    CANCELLED ← Desde cualquier estado (excepto CLOSED)
```

---

## 👥 Roles y Responsabilidades

### 1. **Lead Auditor** (Auditor Líder)

**Responsabilidades:**

- Planificar la auditoría
- Asignar áreas a auditores
- Supervisar el progreso
- Revisar hallazgos
- Aprobar/rechazar cierre
- Generar reporte final

**Permisos:**

- Crear auditoría (DRAFT)
- Planificar (DRAFT → PLANNED)
- Iniciar (PLANNED → IN_PROGRESS)
- Solicitar cierre (IN_PROGRESS → PENDING_CLOSURE)
- Cerrar auditoría (PENDING_CLOSURE → CLOSED)
- Cancelar auditoría
- Todas las acciones de auditores

---

### 2. **Auditor**

**Responsabilidades:**

- Evaluar áreas asignadas
- Registrar hallazgos
- Cargar evidencias
- Documentar observaciones
- Crear no conformidades

**Permisos:**

- Ver auditoría asignada
- Crear evaluaciones en sus áreas
- Registrar hallazgos
- Cargar evidencias
- Actualizar evaluaciones (solo en IN_PROGRESS)

---

### 3. **Auditado** (Organización/Área auditada)

**Responsabilidades:**

- Proveer información
- Responder a hallazgos
- Implementar planes de acción
- Cargar evidencias de corrección

**Permisos:**

- Ver hallazgos de su área
- Comentar hallazgos
- Cargar evidencias
- Ver planes de acción asignados
- Actualizar estado de planes de acción

---

## 🔍 Tipos de Auditoría

### 1. **INITIAL** (Inicial)

Primera auditoría sobre un estándar/proceso

### 2. **RECERTIFICATION** (Recertificación)

Auditoría periódica programada (ej: anual)

### 3. **FOLLOW_UP** (Seguimiento)

Auditoría de seguimiento después de una auditoría cerrada con no conformidades

**Características especiales:**

- Referencia a auditoría original (`parentAuditId`)
- Solo evalúa no conformidades pendientes
- Más corta en duración
- Enfocada en verificar correcciones

### 4. **SURVEILLANCE** (Vigilancia)

Auditoría de vigilancia intermedia (entre recertificaciones)

---

## ✅ Validaciones de Cierre

### Validación 1: Evaluaciones Completas

```typescript
async validateEvaluationsComplete(auditId: string): Promise<boolean> {
  const audit = await this.auditsRepository.findById(auditId)
  const evaluations = await this.evaluationsRepository.findByAuditId(auditId)

  // Todas las evaluaciones deben estar completadas
  const allCompleted = evaluations.every(e => e.status === 'COMPLETED')

  if (!allCompleted) {
    throw new AuditCannotBeClosedException(
      auditId,
      'Hay evaluaciones sin completar'
    )
  }

  return true
}
```

### Validación 2: Hallazgos Clasificados

```typescript
async validateFindingsClassified(auditId: string): Promise<boolean> {
  const findings = await this.findingsRepository.findByAuditId(auditId)

  const unclassified = findings.filter(f => !f.classification)

  if (unclassified.length > 0) {
    throw new AuditCannotBeClosedException(
      auditId,
      `Hay ${unclassified.length} hallazgos sin clasificar`
    )
  }

  return true
}
```

### Validación 3: No Conformidades con Plan de Acción

```typescript
async validateActionPlans(auditId: string): Promise<boolean> {
  const nonConformities = await this.findingsRepository.findNonConformitiesByAuditId(auditId)

  // Críticas y mayores DEBEN tener plan de acción
  const critical = nonConformities.filter(nc => nc.severity === 'CRITICAL')
  const major = nonConformities.filter(nc => nc.severity === 'MAJOR')

  const criticalWithoutPlan = critical.filter(nc => !nc.actionPlanId)
  const majorWithoutPlan = major.filter(nc => !nc.actionPlanId)

  if (criticalWithoutPlan.length > 0) {
    throw new AuditCannotBeClosedException(
      auditId,
      `Hay ${criticalWithoutPlan.length} no conformidades CRÍTICAS sin plan de acción`
    )
  }

  if (majorWithoutPlan.length > 0) {
    throw new AuditCannotBeClosedException(
      auditId,
      `Hay ${majorWithoutPlan.length} no conformidades MAYORES sin plan de acción`
    )
  }

  return true
}
```

### Validación 4: Reporte Generado

```typescript
async validateReportGenerated(auditId: string): Promise<boolean> {
  const audit = await this.auditsRepository.findById(auditId)

  if (!audit.reportUrl) {
    throw new AuditCannotBeClosedException(
      auditId,
      'No se ha generado el reporte final'
    )
  }

  return true
}
```

### Validación 5: Aprobación del Lead Auditor

```typescript
async validateLeadAuditorApproval(auditId: string, userId: string): Promise<boolean> {
  const audit = await this.auditsRepository.findById(auditId)

  // Solo el lead auditor puede cerrar
  if (audit.leadAuditorId !== userId) {
    throw new ForbiddenException('Solo el lead auditor puede cerrar la auditoría')
  }

  // Debe haber aprobación explícita
  if (!audit.closureApprovedAt) {
    throw new AuditCannotBeClosedException(
      auditId,
      'El lead auditor no ha aprobado el cierre'
    )
  }

  return true
}
```

---

## 📝 Auditoría de Seguimiento

### Cuándo crear

Una auditoría de seguimiento se crea cuando:

1. La auditoría original está **CLOSED**
2. Hay **no conformidades** registradas
3. Los planes de acción están en progreso
4. Se necesita verificar que se implementaron las correcciones

### Cómo crear

```typescript
// Command
export class CreateFollowUpAuditCommand {
  constructor(
    public readonly parentAuditId: string,    // Auditoría original
    public readonly scheduledStartDate: Date,  // Fecha de seguimiento
    public readonly scheduledEndDate: Date,
    public readonly leadAuditorId: string,
    public readonly auditorIds: string[],
  ) {}
}

// Handler
async execute(command: CreateFollowUpAuditCommand): Promise<AuditEntity> {
  // 1. Validar que la auditoría padre existe y está cerrada
  const parentAudit = await this.auditsRepository.findById(command.parentAuditId)

  if (!parentAudit) {
    throw new AuditNotFoundException(command.parentAuditId)
  }

  if (parentAudit.status !== AuditStatus.CLOSED) {
    throw new AuditNotClosedException(command.parentAuditId)
  }

  // 2. Verificar que tiene no conformidades
  const nonConformities = await this.findingsRepository
    .findNonConformitiesByAuditId(command.parentAuditId)

  if (nonConformities.length === 0) {
    throw new NoFollowUpRequiredException(command.parentAuditId)
  }

  // 3. Crear auditoría de seguimiento
  const followUpAudit = this.auditFactory.createFollowUp({
    parentAuditId: parentAudit.id,
    organizationId: parentAudit.organizationId,
    templateId: parentAudit.templateId,
    type: AuditType.FOLLOW_UP,
    scheduledStartDate: command.scheduledStartDate,
    scheduledEndDate: command.scheduledEndDate,
    leadAuditorId: command.leadAuditorId,
    auditorIds: command.auditorIds,
    scope: `Seguimiento de no conformidades de auditoría ${parentAudit.code}`,
  })

  // 4. Copiar no conformidades pendientes como ítems a verificar
  followUpAudit.itemsToVerify = nonConformities.map(nc => ({
    findingId: nc.id,
    description: nc.description,
    actionPlanId: nc.actionPlanId,
    verified: false,
  }))

  // 5. Guardar
  await this.auditsRepository.save(followUpAudit)

  // 6. Marcar en auditoría padre que tiene seguimiento
  parentAudit.hasFollowUp = true
  parentAudit.followUpAuditId = followUpAudit.id
  await this.auditsRepository.save(parentAudit)

  return followUpAudit
}
```

---

## 🎯 Use Cases Necesarios

### 1. **PlanAudit** (DRAFT → PLANNED)

```typescript
- Asignar lead auditor
- Asignar equipo auditor
- Definir fechas
- Definir alcance
- Validar requisitos de planificación
```

### 2. **StartAudit** (PLANNED → IN_PROGRESS)

```typescript
- Validar que fecha de inicio ha llegado
- Iniciar auditoría
- Notificar a auditores
- Habilitar evaluaciones
```

### 3. **RequestClosure** (IN_PROGRESS → PENDING_CLOSURE)

```typescript
- Solo lead auditor
- Cambiar estado
- Iniciar validaciones
- Generar borrador de reporte
```

### 4. **CloseAudit** (PENDING_CLOSURE → CLOSED)

```typescript
- Ejecutar TODAS las validaciones
- Generar reporte final
- Calcular estadísticas
- Cerrar auditoría
- Notificar stakeholders
- Determinar si requiere seguimiento
```

### 5. **ReopenAudit** (PENDING_CLOSURE → IN_PROGRESS)

```typescript
- Solo lead auditor
- Razón de reapertura
- Notificar equipo
```

### 6. **CancelAudit** (Cualquier estado → CANCELLED)

```typescript
- Solo lead auditor o admin
- Razón de cancelación (requerida)
- Preservar historial
```

### 7. **CreateFollowUpAudit** (Después de CLOSED)

```typescript
- Validar auditoría padre cerrada
- Validar no conformidades pendientes
- Crear nueva auditoría tipo FOLLOW_UP
- Referenciar auditoría original
- Copiar ítems a verificar
```

---

## 📊 Métricas y Reportes

### Estadísticas de Auditoría

```typescript
interface AuditStatistics {
  // General
  totalEvaluations: number
  completedEvaluations: number
  progressPercentage: number

  // Hallazgos
  totalFindings: number
  conformities: number
  nonConformities: number
  observations: number

  // No conformidades por severidad
  criticalNC: number
  majorNC: number
  minorNC: number

  // Planes de acción
  actionPlansCreated: number
  actionPlansCompleted: number
  actionPlansPending: number

  // Cumplimiento
  compliancePercentage: number
  requiresFollowUp: boolean

  // Tiempos
  duration: number // días
  daysUntilClosure: number
}
```

---

## 🚀 Ejemplo de Flujo Completo

```typescript
// 1. Crear auditoría (DRAFT)
const audit = await createAuditHandler.execute(
  new CreateAuditCommand(...)
)
// Estado: DRAFT

// 2. Planificar (DRAFT → PLANNED)
await planAuditHandler.execute(
  new PlanAuditCommand(
    audit.id,
    leadAuditorId,
    [auditor1Id, auditor2Id],
    startDate,
    endDate,
    scope,
  )
)
// Estado: PLANNED

// 3. Iniciar (PLANNED → IN_PROGRESS)
await startAuditHandler.execute(
  new StartAuditCommand(audit.id, currentUserId)
)
// Estado: IN_PROGRESS

// 4. Auditores evalúan (mientras está IN_PROGRESS)
await createEvaluationHandler.execute(...)
await createFindingHandler.execute(...)
await createActionPlanHandler.execute(...)

// 5. Solicitar cierre (IN_PROGRESS → PENDING_CLOSURE)
await requestClosureHandler.execute(
  new RequestClosureCommand(audit.id, leadAuditorId)
)
// Estado: PENDING_CLOSURE

// 6. Lead auditor revisa y aprueba
await approveClosureHandler.execute(
  new ApproveClosureCommand(audit.id, leadAuditorId)
)

// 7. Cerrar auditoría (PENDING_CLOSURE → CLOSED)
await closeAuditHandler.execute(
  new CloseAuditCommand(audit.id, leadAuditorId)
)
// Estado: CLOSED
// Se ejecutan TODAS las validaciones
// Se genera reporte final

// 8. Si hay no conformidades, crear seguimiento
if (audit.hasNonConformities) {
  const followUp = await createFollowUpHandler.execute(
    new CreateFollowUpAuditCommand(
      audit.id,
      followUpStartDate,
      followUpEndDate,
      leadAuditorId,
      [auditor1Id],
    )
  )
  // Nueva auditoría tipo FOLLOW_UP creada
  // Estado: DRAFT (inicialmente)
}
```

---

## ✅ Resumen

**Estados:**

1. DRAFT → Creada
2. PLANNED → Planificada
3. IN_PROGRESS → En ejecución
4. PENDING_CLOSURE → Esperando cierre
5. CLOSED → Cerrada
6. CANCELLED → Cancelada

**Validaciones de cierre:**

1. ✓ Evaluaciones 100% completas
2. ✓ Hallazgos clasificados
3. ✓ NC críticas/mayores con plan de acción
4. ✓ Reporte generado
5. ✓ Lead auditor aprobó

**Auditoría de seguimiento:**

- Solo después de CLOSED
- Si hay no conformidades
- Referencia a auditoría original
- Verifica implementación de correcciones

---

**¡Sistema completo de gestión de auditorías listo para implementar!** 🎉

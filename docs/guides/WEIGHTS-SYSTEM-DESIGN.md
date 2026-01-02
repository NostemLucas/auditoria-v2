# Sistema de Pesos Dinámicos por Auditoría

## 🎯 Problema a Resolver

Los **pesos (weights) de los estándares NO son fijos**, sino que:

- ✅ Se configuran **por auditoría**
- ✅ El **Lead Auditor** los define según la organización auditada
- ✅ Diferentes organizaciones tienen diferentes prioridades
- ✅ Los pesos afectan el cálculo del score final

### Ejemplo:

**Organización A (Banco):**

- Seguridad Información: peso 2.0 (muy importante)
- Calidad: peso 1.0 (importante)
- RRHH: peso 0.5 (menos crítico)

**Organización B (Hospital):**

- Seguridad Información: peso 1.5
- Calidad: peso 2.0 (muy importante - vidas en juego)
- RRHH: peso 1.0

---

## 🏗️ Solución: Entidad de Pesos por Auditoría

### Opción 1: Tabla Relacional (RECOMENDADO)

```
audits (1) ←──→ (N) audit_standard_weights ←──→ (1) standards
```

Permite:

- ✅ Configurar pesos específicos por auditoría
- ✅ Mantener histórico de pesos
- ✅ Validar que todos los estándares tengan peso
- ✅ Calcular ponderados fácilmente

---

## 📊 Estructura de Datos

### 1. Entidad: AuditStandardWeight

```typescript
// src/modules/audits/entities/audit-standard-weight.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm'
import { AuditEntity } from './audit.entity'
import { StandardEntity } from '@templates/entities/standard.entity'
import { UserEntity } from '@users/entities/user.entity'

/**
 * Pesos de estándares específicos por auditoría
 *
 * Permite que el Lead Auditor configure pesos diferentes
 * para cada organización auditada según sus prioridades
 */
@Entity('audit_standard_weights')
@Unique(['auditId', 'standardId']) // Un peso por estándar por auditoría
export class AuditStandardWeightEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  // Relación con auditoría
  @Column({ type: 'uuid' })
  auditId: string

  @ManyToOne(() => AuditEntity)
  @JoinColumn({ name: 'auditId' })
  audit: AuditEntity

  // Relación con estándar
  @Column({ type: 'uuid' })
  standardId: string

  @ManyToOne(() => StandardEntity)
  @JoinColumn({ name: 'standardId' })
  standard: StandardEntity

  // Peso asignado (decimal para flexibilidad)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  weight: number

  // Justificación del peso (opcional pero recomendado)
  @Column({ type: 'text', nullable: true })
  justification: string | null

  // Quién lo configuró
  @Column({ type: 'uuid' })
  configuredBy: string

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'configuredBy' })
  configuredByUser: UserEntity

  // Categoría para agrupación en gráficas
  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null

  // Orden para visualización
  @Column({ type: 'int', default: 0 })
  displayOrder: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
```

---

### 2. DTO para Configurar Pesos

```typescript
// src/modules/audits/dtos/configure-weights.dto.ts

import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

/**
 * DTO para un peso individual
 */
export class StandardWeightItemDto {
  @ApiProperty({
    description: 'ID del estándar',
    example: 'std-123',
  })
  @IsUUID()
  standardId: string

  @ApiProperty({
    description: 'Peso asignado (mayor peso = mayor importancia)',
    example: 1.5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  weight: number

  @ApiProperty({
    description: 'Justificación del peso asignado',
    example: 'Crítico para cumplimiento regulatorio del sector financiero',
    required: false,
  })
  @IsOptional()
  @IsString()
  justification?: string

  @ApiProperty({
    description: 'Categoría para agrupación en reportes',
    example: 'Seguridad de la Información',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string

  @ApiProperty({
    description: 'Orden de visualización',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  displayOrder?: number
}

/**
 * DTO para configurar todos los pesos de una auditoría
 */
export class ConfigureAuditWeightsDto {
  @ApiProperty({
    description: 'Lista de pesos para cada estándar',
    type: [StandardWeightItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StandardWeightItemDto)
  weights: StandardWeightItemDto[]

  @ApiProperty({
    description: 'Modo de normalización de pesos',
    example: 'auto',
    enum: ['auto', 'manual'],
    required: false,
  })
  @IsOptional()
  @IsString()
  normalizationMode?: 'auto' | 'manual'
}

/**
 * DTO para copiar pesos desde plantilla o auditoría anterior
 */
export class CopyWeightsDto {
  @ApiProperty({
    description: 'Origen de los pesos',
    enum: ['template', 'previous_audit'],
  })
  @IsNotEmpty()
  @IsString()
  source: 'template' | 'previous_audit'

  @ApiProperty({
    description: 'ID de la auditoría origen (si source = previous_audit)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  sourceAuditId?: string

  @ApiProperty({
    description: 'Factor de ajuste (1.0 = sin cambios, 1.5 = aumentar 50%)',
    example: 1.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  adjustmentFactor?: number
}
```

---

### 3. Caso de Uso: Configurar Pesos

```typescript
// src/modules/audits/use-cases/commands/configure-weights/configure-weights.command.ts

export class ConfigureWeightsCommand {
  constructor(
    public readonly auditId: string,
    public readonly weights: Array<{
      standardId: string
      weight: number
      justification?: string
      category?: string
      displayOrder?: number
    }>,
    public readonly configuredBy: string, // Lead Auditor ID
    public readonly normalizationMode: 'auto' | 'manual' = 'auto',
  ) {}
}
```

```typescript
// src/modules/audits/use-cases/commands/configure-weights/configure-weights.handler.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ConfigureWeightsCommand } from './configure-weights.command'
import { AuditEntity, AuditStatus } from '../../../entities/audit.entity'
import { AuditStandardWeightEntity } from '../../../entities/audit-standard-weight.entity'
import { StandardEntity } from '@templates/entities/standard.entity'
import { EvaluationEntity } from '../../../entities/evaluation.entity'

@Injectable()
export class ConfigureWeightsHandler {
  constructor(
    @InjectRepository(AuditEntity)
    private readonly auditsRepository: Repository<AuditEntity>,
    @InjectRepository(AuditStandardWeightEntity)
    private readonly weightsRepository: Repository<AuditStandardWeightEntity>,
    @InjectRepository(StandardEntity)
    private readonly standardsRepository: Repository<StandardEntity>,
    @InjectRepository(EvaluationEntity)
    private readonly evaluationsRepository: Repository<EvaluationEntity>,
  ) {}

  async execute(
    command: ConfigureWeightsCommand,
  ): Promise<AuditStandardWeightEntity[]> {
    // 1. Validar que la auditoría existe
    const audit = await this.auditsRepository.findOne({
      where: { id: command.auditId, isActive: true },
    })

    if (!audit) {
      throw new NotFoundException(`Auditoría ${command.auditId} no encontrada`)
    }

    // 2. Validar que solo el lead auditor puede configurar pesos
    if (audit.leadAuditorId !== command.configuredBy) {
      throw new ForbiddenException(
        'Solo el lead auditor puede configurar los pesos de la auditoría',
      )
    }

    // 3. Validar que la auditoría está en estado apropiado
    const allowedStatuses = [AuditStatus.DRAFT, AuditStatus.PLANNED]
    if (!allowedStatuses.includes(audit.status)) {
      throw new BadRequestException(
        `Solo se pueden configurar pesos en auditorías DRAFT o PLANNED. Estado actual: ${audit.status}`,
      )
    }

    // 4. Obtener todas las evaluaciones de la auditoría
    const evaluations = await this.evaluationsRepository.find({
      where: { auditId: command.auditId, isActive: true },
    })

    const evaluationStandardIds = new Set(evaluations.map((e) => e.standardId))

    // 5. Validar que todos los estándares de la auditoría tienen peso
    const configuredStandardIds = new Set(
      command.weights.map((w) => w.standardId),
    )

    const missingStandards = Array.from(evaluationStandardIds).filter(
      (id) => !configuredStandardIds.has(id),
    )

    if (missingStandards.length > 0) {
      throw new BadRequestException(
        `Faltan pesos para ${missingStandards.length} estándares. Todos los estándares evaluados deben tener un peso asignado.`,
      )
    }

    // 6. Validar que los estándares existen
    const standardIds = command.weights.map((w) => w.standardId)
    const standards = await this.standardsRepository.findByIds(standardIds)

    if (standards.length !== standardIds.length) {
      throw new BadRequestException('Algunos estándares no fueron encontrados')
    }

    // 7. Normalizar pesos si está en modo auto
    let normalizedWeights = command.weights
    if (command.normalizationMode === 'auto') {
      normalizedWeights = this.normalizeWeights(command.weights)
    }

    // 8. Validar que los pesos son válidos
    this.validateWeights(normalizedWeights)

    // 9. Eliminar pesos existentes (si los hay)
    await this.weightsRepository.delete({ auditId: command.auditId })

    // 10. Crear nuevos pesos
    const weightEntities = normalizedWeights.map((w) => {
      const entity = new AuditStandardWeightEntity()
      entity.auditId = command.auditId
      entity.standardId = w.standardId
      entity.weight = w.weight
      entity.justification = w.justification || null
      entity.category = w.category || null
      entity.displayOrder = w.displayOrder || 0
      entity.configuredBy = command.configuredBy
      return entity
    })

    // 11. Guardar todos los pesos
    const savedWeights = await this.weightsRepository.save(weightEntities)

    return savedWeights
  }

  /**
   * Normaliza los pesos para que sumen un total específico
   * Por defecto normaliza a suma = número de estándares
   */
  private normalizeWeights(
    weights: Array<{ standardId: string; weight: number; [key: string]: any }>,
  ): typeof weights {
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0)

    if (totalWeight === 0) {
      // Si todos los pesos son 0, asignar peso igual a todos
      return weights.map((w) => ({ ...w, weight: 1.0 }))
    }

    // Normalizar manteniendo proporciones
    const targetSum = weights.length // Normalizar a N (cantidad de estándares)
    const factor = targetSum / totalWeight

    return weights.map((w) => ({
      ...w,
      weight: Math.round(w.weight * factor * 100) / 100, // Redondear a 2 decimales
    }))
  }

  /**
   * Valida que los pesos sean consistentes
   */
  private validateWeights(
    weights: Array<{ standardId: string; weight: number; [key: string]: any }>,
  ): void {
    // Validar que no haya pesos negativos
    const negativeWeights = weights.filter((w) => w.weight < 0)
    if (negativeWeights.length > 0) {
      throw new BadRequestException('Los pesos no pueden ser negativos')
    }

    // Validar que al menos un peso sea > 0
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0)
    if (totalWeight === 0) {
      throw new BadRequestException(
        'Al menos un estándar debe tener peso mayor a 0',
      )
    }

    // Validar que no haya duplicados
    const standardIds = weights.map((w) => w.standardId)
    const uniqueIds = new Set(standardIds)
    if (standardIds.length !== uniqueIds.size) {
      throw new BadRequestException(
        'Hay estándares duplicados en la configuración',
      )
    }
  }
}
```

---

### 4. Caso de Uso: Copiar Pesos desde Plantilla o Auditoría Anterior

```typescript
// src/modules/audits/use-cases/commands/copy-weights/copy-weights.handler.ts

import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CopyWeightsCommand } from './copy-weights.command'
import { ConfigureWeightsHandler } from '../configure-weights/configure-weights.handler'
import { AuditStandardWeightEntity } from '../../../entities/audit-standard-weight.entity'
import { StandardEntity } from '@templates/entities/standard.entity'
import { EvaluationEntity } from '../../../entities/evaluation.entity'

export class CopyWeightsCommand {
  constructor(
    public readonly auditId: string,
    public readonly source: 'template' | 'previous_audit',
    public readonly configuredBy: string,
    public readonly sourceAuditId?: string,
    public readonly adjustmentFactor: number = 1.0,
  ) {}
}

@Injectable()
export class CopyWeightsHandler {
  constructor(
    @InjectRepository(AuditStandardWeightEntity)
    private readonly weightsRepository: Repository<AuditStandardWeightEntity>,
    @InjectRepository(StandardEntity)
    private readonly standardsRepository: Repository<StandardEntity>,
    @InjectRepository(EvaluationEntity)
    private readonly evaluationsRepository: Repository<EvaluationEntity>,
    private readonly configureWeightsHandler: ConfigureWeightsHandler,
  ) {}

  async execute(
    command: CopyWeightsCommand,
  ): Promise<AuditStandardWeightEntity[]> {
    let weights: Array<{
      standardId: string
      weight: number
      justification?: string
      category?: string
    }>

    if (command.source === 'template') {
      weights = await this.copyFromTemplate(command.auditId)
    } else {
      weights = await this.copyFromPreviousAudit(
        command.auditId,
        command.sourceAuditId!,
      )
    }

    // Aplicar factor de ajuste si existe
    if (command.adjustmentFactor !== 1.0) {
      weights = weights.map((w) => ({
        ...w,
        weight: w.weight * command.adjustmentFactor,
      }))
    }

    // Usar el handler de configuración para guardar
    const configureCommand = {
      auditId: command.auditId,
      weights,
      configuredBy: command.configuredBy,
      normalizationMode: 'auto' as const,
    }

    return await this.configureWeightsHandler.execute(configureCommand)
  }

  /**
   * Copia pesos desde la plantilla (valores por defecto)
   */
  private async copyFromTemplate(auditId: string): Promise<any[]> {
    // Obtener evaluaciones de la auditoría
    const evaluations = await this.evaluationsRepository.find({
      where: { auditId, isActive: true },
      relations: ['standard'],
    })

    // Usar el peso por defecto del estándar en la plantilla
    return evaluations.map((eval) => ({
      standardId: eval.standardId,
      weight: eval.standard.weight || 1.0, // Peso por defecto de la plantilla
      category: eval.standard.category,
      justification: 'Copiado desde plantilla por defecto',
    }))
  }

  /**
   * Copia pesos desde una auditoría anterior
   */
  private async copyFromPreviousAudit(
    targetAuditId: string,
    sourceAuditId: string,
  ): Promise<any[]> {
    // Obtener pesos de la auditoría anterior
    const previousWeights = await this.weightsRepository.find({
      where: { auditId: sourceAuditId },
    })

    if (previousWeights.length === 0) {
      throw new Error('La auditoría origen no tiene pesos configurados')
    }

    // Obtener evaluaciones de la auditoría actual
    const currentEvaluations = await this.evaluationsRepository.find({
      where: { auditId: targetAuditId, isActive: true },
    })

    const currentStandardIds = new Set(
      currentEvaluations.map((e) => e.standardId),
    )

    // Mapear solo los estándares que existen en ambas auditorías
    const weights = previousWeights
      .filter((pw) => currentStandardIds.has(pw.standardId))
      .map((pw) => ({
        standardId: pw.standardId,
        weight: pw.weight,
        category: pw.category,
        justification: `Copiado desde auditoría anterior (${sourceAuditId})`,
      }))

    // Para los estándares nuevos que no existían antes, asignar peso 1.0
    const mappedStandardIds = new Set(weights.map((w) => w.standardId))
    const newStandards = Array.from(currentStandardIds).filter(
      (id) => !mappedStandardIds.has(id),
    )

    newStandards.forEach((standardId) => {
      weights.push({
        standardId,
        weight: 1.0,
        category: null,
        justification: 'Peso por defecto (estándar nuevo)',
      })
    })

    return weights
  }
}
```

---

## 🔌 Controller de Pesos

```typescript
// src/modules/audits/controllers/audit-weights.controller.ts

import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { ConfigureWeightsHandler } from '../use-cases/commands/configure-weights/configure-weights.handler'
import { CopyWeightsHandler } from '../use-cases/commands/copy-weights/copy-weights.handler'
import { ConfigureWeightsCommand } from '../use-cases/commands/configure-weights/configure-weights.command'
import { CopyWeightsCommand } from '../use-cases/commands/copy-weights/copy-weights.command'
import {
  ConfigureAuditWeightsDto,
  CopyWeightsDto,
} from '../dtos/configure-weights.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditStandardWeightEntity } from '../entities/audit-standard-weight.entity'

@ApiTags('audits/weights')
@Controller('audits/:auditId/weights')
export class AuditWeightsController {
  constructor(
    @InjectRepository(AuditStandardWeightEntity)
    private readonly weightsRepository: Repository<AuditStandardWeightEntity>,
    private readonly configureWeightsHandler: ConfigureWeightsHandler,
    private readonly copyWeightsHandler: CopyWeightsHandler,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener pesos configurados de una auditoría',
    description: 'Retorna todos los pesos asignados a cada estándar',
  })
  @ApiResponse({ status: 200, type: [AuditStandardWeightEntity] })
  async getWeights(@Param('auditId') auditId: string) {
    return await this.weightsRepository.find({
      where: { auditId },
      relations: ['standard', 'configuredByUser'],
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    })
  }

  @Post('configure')
  @ApiOperation({
    summary: 'Configurar pesos de estándares (Lead Auditor)',
    description:
      'Permite al lead auditor asignar pesos específicos a cada estándar según prioridades de la organización',
  })
  @ApiResponse({ status: 200, type: [AuditStandardWeightEntity] })
  async configureWeights(
    @Param('auditId') auditId: string,
    @Body() dto: ConfigureAuditWeightsDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'current-user-id'

    const command = new ConfigureWeightsCommand(
      auditId,
      dto.weights,
      userId,
      dto.normalizationMode || 'auto',
    )

    return await this.configureWeightsHandler.execute(command)
  }

  @Post('copy')
  @ApiOperation({
    summary: 'Copiar pesos desde plantilla o auditoría anterior',
    description:
      'Facilita la configuración copiando pesos de una fuente existente',
  })
  @ApiResponse({ status: 200, type: [AuditStandardWeightEntity] })
  async copyWeights(
    @Param('auditId') auditId: string,
    @Body() dto: CopyWeightsDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'current-user-id'

    const command = new CopyWeightsCommand(
      auditId,
      dto.source,
      userId,
      dto.sourceAuditId,
      dto.adjustmentFactor || 1.0,
    )

    return await this.copyWeightsHandler.execute(command)
  }
}
```

---

## 🎯 Flujo de Uso Completo

### 1. **Crear Auditoría** (ya implementado)

```bash
POST /audits
{
  "name": "Auditoría ISO 27001 - Banco XYZ",
  "templateId": "template-iso-27001",
  "organizationId": "org-banco-xyz"
}
```

### 2. **Opción A: Copiar Pesos desde Plantilla**

```bash
POST /audits/{auditId}/weights/copy
{
  "source": "template"
}
```

### 3. **Opción B: Copiar desde Auditoría Anterior**

```bash
POST /audits/{auditId}/weights/copy
{
  "source": "previous_audit",
  "sourceAuditId": "audit-2024-001",
  "adjustmentFactor": 1.2  // Aumentar 20% todos los pesos
}
```

### 4. **Opción C: Configurar Manualmente**

```bash
POST /audits/{auditId}/weights/configure
{
  "weights": [
    {
      "standardId": "std-a5-seguridad",
      "weight": 2.0,
      "justification": "Crítico para sector bancario - regulación SBS",
      "category": "Seguridad de la Información",
      "displayOrder": 1
    },
    {
      "standardId": "std-a6-organizacion",
      "weight": 1.5,
      "justification": "Alta prioridad - cumplimiento SOX",
      "category": "Organización de Seguridad",
      "displayOrder": 2
    },
    {
      "standardId": "std-a7-rrhh",
      "weight": 1.0,
      "justification": "Prioridad media",
      "category": "Recursos Humanos",
      "displayOrder": 3
    }
  ],
  "normalizationMode": "auto"
}
```

### 5. **Ver Pesos Configurados**

```bash
GET /audits/{auditId}/weights
```

**Respuesta:**

```json
[
  {
    "id": "weight-1",
    "auditId": "audit-123",
    "standardId": "std-a5-seguridad",
    "weight": 2.0,
    "justification": "Crítico para sector bancario - regulación SBS",
    "category": "Seguridad de la Información",
    "displayOrder": 1,
    "configuredBy": "user-lead-auditor",
    "createdAt": "2025-01-15T10:00:00Z",
    "standard": {
      "id": "std-a5-seguridad",
      "code": "A.5",
      "name": "Políticas de Seguridad de la Información"
    }
  }
]
```

---

## 🔄 Actualización del Sistema de Reportes

Con los pesos configurados, ahora los reportes los utilizan automáticamente:

```typescript
// En WeightingCalculatorService

async calculateWeightedScore(auditId: string): Promise<number> {
  // 1. Obtener pesos configurados para esta auditoría
  const weights = await this.weightsRepository.find({
    where: { auditId }
  })

  // 2. Obtener evaluaciones
  const evaluations = await this.evaluationsRepository.find({
    where: { auditId }
  })

  // 3. Calcular score ponderado usando pesos específicos
  const weightsMap = new Map(weights.map(w => [w.standardId, w.weight]))

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0)
  const weightedSum = evaluations.reduce((sum, eval) => {
    const weight = weightsMap.get(eval.standardId) || 1.0
    return sum + (eval.score * weight)
  }, 0)

  return weightedSum / totalWeight
}
```

---

## 📊 Interfaz de Usuario Recomendada

### Pantalla de Configuración de Pesos

```
┌─────────────────────────────────────────────────────────┐
│  Configurar Pesos - Auditoría ISO 27001 - Banco XYZ    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Copiar desde Plantilla] [Copiar desde Auditoría]     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Estándar              │ Peso │ Categoría        │   │
│  ├───────────────────────┼──────┼──────────────────┤   │
│  │ A.5 Políticas Seg.    │ [2.0]│ Seguridad Info   │   │
│  │ A.6 Organización      │ [1.5]│ Organización     │   │
│  │ A.7 RRHH             │ [1.0]│ Recursos Humanos │   │
│  │ A.8 Gestión Activos  │ [1.8]│ Seguridad Info   │   │
│  │ A.9 Control Acceso   │ [2.0]│ Seguridad Info   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Total Peso: 8.3                                        │
│                                                         │
│  ☑ Normalizar automáticamente                          │
│                                                         │
│  [Cancelar]                      [Guardar Configuración]│
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Validaciones Implementadas

✅ Solo Lead Auditor puede configurar pesos
✅ Solo en estados DRAFT o PLANNED
✅ Todos los estándares evaluados deben tener peso
✅ No pueden haber pesos negativos
✅ Al menos un peso debe ser > 0
✅ No pueden haber duplicados
✅ Normalización automática opcional
✅ Histórico de cambios (createdAt, configuredBy)

---

## 🚀 Migración de Base de Datos

```typescript
// migrations/XXXXX-AddAuditStandardWeights.ts

import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm'

export class AddAuditStandardWeights implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'audit_standard_weights',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'auditId',
            type: 'uuid',
          },
          {
            name: 'standardId',
            type: 'uuid',
          },
          {
            name: 'weight',
            type: 'decimal(5,2)',
            default: 1.0,
          },
          {
            name: 'justification',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'varchar(100)',
            isNullable: true,
          },
          {
            name: 'displayOrder',
            type: 'int',
            default: 0,
          },
          {
            name: 'configuredBy',
            type: 'uuid',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    )

    // Foreign keys
    await queryRunner.createForeignKey(
      'audit_standard_weights',
      new TableForeignKey({
        columnNames: ['auditId'],
        referencedTableName: 'audits',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    )

    await queryRunner.createForeignKey(
      'audit_standard_weights',
      new TableForeignKey({
        columnNames: ['standardId'],
        referencedTableName: 'standards',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    )

    await queryRunner.createForeignKey(
      'audit_standard_weights',
      new TableForeignKey({
        columnNames: ['configuredBy'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
      }),
    )

    // Unique constraint
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_audit_standard_unique
      ON audit_standard_weights(auditId, standardId)
    `)

    // Index for queries
    await queryRunner.query(`
      CREATE INDEX idx_weights_audit
      ON audit_standard_weights(auditId)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('audit_standard_weights')
  }
}
```

---

## 🎯 Resumen

**Problema:** Pesos NO son fijos, dependen de la organización

**Solución:**

1. ✅ Tabla `audit_standard_weights` (auditoría + estándar + peso)
2. ✅ Lead Auditor configura pesos por auditoría
3. ✅ 3 formas de configurar: Manual, Copiar Template, Copiar Auditoría
4. ✅ Validaciones robustas
5. ✅ Normalización automática
6. ✅ Los reportes usan estos pesos dinámicamente

**Endpoints:**

- GET `/audits/:id/weights` - Ver pesos
- POST `/audits/:id/weights/configure` - Configurar manual
- POST `/audits/:id/weights/copy` - Copiar desde origen

¿Implemento esto ahora antes de las gráficas? 🚀

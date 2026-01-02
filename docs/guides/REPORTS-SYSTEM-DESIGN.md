# Sistema de Reportes con Gráficas Radiales y Ponderaciones Dinámicas

## 🎯 Problema a Resolver

1. **Gráficas Radiales (Spider Charts)** con ponderación dinámica
2. **Reportes Consolidados** con múltiples niveles (estándares → sub-estándares)
3. **Cálculos de Ponderados** según configuración de plantilla
4. **Visualización según tipo de plantilla**

---

## 🏗️ Arquitectura de Solución

### Opción 1: ViewEntities + Servicios de Cálculo (RECOMENDADO)

```
┌─────────────────┐
│   Controllers   │ → Endpoints REST
└────────┬────────┘
         │
┌────────▼────────┐
│ Reports Service │ → Lógica de negocio
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼──────┐
│ View │  │ Calc    │
│Entity│  │ Service │
└──────┘  └─────────┘
```

**Ventajas:**

- ✅ ViewEntities optimizan consultas SQL
- ✅ Cálculos en TypeScript (flexibilidad)
- ✅ Fácil de testear
- ✅ Reutilizable

---

## 📊 Estructura de Datos

### 1. ViewEntity para Datos Consolidados

```typescript
// src/modules/reports/views/audit-consolidated.view.ts

import { ViewEntity, ViewColumn, DataSource } from 'typeorm'

/**
 * Vista consolidada de evaluaciones de auditoría
 *
 * Agrupa datos de:
 * - Auditoría
 * - Evaluaciones
 * - Estándares (con jerarquía)
 * - Niveles de madurez
 * - Ponderaciones
 */
@ViewEntity({
  name: 'vw_audit_consolidated',
  expression: (dataSource: DataSource) =>
    dataSource
      .createQueryBuilder()
      .select('audit.id', 'auditId')
      .addSelect('audit.name', 'auditName')
      .addSelect('audit.status', 'auditStatus')

      // Datos de la evaluación
      .addSelect('eval.id', 'evaluationId')
      .addSelect('eval.score', 'evaluationScore')
      .addSelect('eval.complianceStatus', 'complianceStatus')
      .addSelect('eval.isCompleted', 'isCompleted')

      // Datos del estándar (con jerarquía)
      .addSelect('std.id', 'standardId')
      .addSelect('std.code', 'standardCode')
      .addSelect('std.name', 'standardName')
      .addSelect('std.parentId', 'parentStandardId')
      .addSelect('std.level', 'standardLevel')
      .addSelect('std.weight', 'standardWeight') // Ponderación
      .addSelect('std.category', 'standardCategory') // Para agrupar en gráficas

      // Datos del nivel de madurez
      .addSelect('maturity.id', 'maturityLevelId')
      .addSelect('maturity.level', 'maturityLevel')
      .addSelect('maturity.score', 'maturityScore')
      .addSelect('maturity.name', 'maturityLevelName')

      // Datos del framework (para saber el tipo de ponderación)
      .addSelect('framework.id', 'frameworkId')
      .addSelect('framework.weightingType', 'weightingType') // 'equal' | 'custom' | 'hierarchical'

      .from('audits', 'audit')
      .leftJoin('evaluations', 'eval', 'eval.auditId = audit.id')
      .leftJoin('standards', 'std', 'eval.standardId = std.id')
      .leftJoin(
        'maturity_levels',
        'maturity',
        'eval.maturityLevelId = maturity.id',
      )
      .leftJoin('frameworks', 'framework', 'audit.frameworkId = framework.id')
      .where('audit.isActive = :isActive', { isActive: true })
      .andWhere('eval.isActive = :isActive', { isActive: true }),
})
export class AuditConsolidatedView {
  @ViewColumn()
  auditId: string

  @ViewColumn()
  auditName: string

  @ViewColumn()
  auditStatus: string

  @ViewColumn()
  evaluationId: string

  @ViewColumn()
  evaluationScore: number

  @ViewColumn()
  complianceStatus: string

  @ViewColumn()
  isCompleted: boolean

  @ViewColumn()
  standardId: string

  @ViewColumn()
  standardCode: string

  @ViewColumn()
  standardName: string

  @ViewColumn()
  parentStandardId: string | null

  @ViewColumn()
  standardLevel: number

  @ViewColumn()
  standardWeight: number // Ponderación del estándar

  @ViewColumn()
  standardCategory: string // Ej: 'Seguridad', 'Calidad', etc.

  @ViewColumn()
  maturityLevelId: string

  @ViewColumn()
  maturityLevel: number

  @ViewColumn()
  maturityScore: number

  @ViewColumn()
  maturityLevelName: string

  @ViewColumn()
  frameworkId: string

  @ViewColumn()
  weightingType: string // Tipo de ponderación
}
```

---

### 2. DTOs para Respuestas de Reportes

```typescript
// src/modules/reports/dtos/radar-chart-data.dto.ts

/**
 * DTO para datos de gráfica radial (Spider Chart)
 */
export class RadarChartDataDto {
  // Datos para cada eje del radar
  axes: RadarAxisDto[]

  // Datos de series (pueden ser múltiples auditorías para comparar)
  series: RadarSeriesDto[]

  // Metadatos
  metadata: {
    auditId: string
    auditName: string
    frameworkName: string
    maxScore: number
    weightingType: string
  }
}

export class RadarAxisDto {
  // Nombre del eje (categoría o estándar)
  label: string

  // Código del estándar (si aplica)
  code?: string

  // Ponderación de este eje
  weight: number

  // Máximo valor para este eje
  max: number
}

export class RadarSeriesDto {
  // Nombre de la serie
  name: string

  // Valores para cada eje (mismo orden que axes)
  values: number[]

  // Color sugerido
  color?: string

  // Tipo (para diferenciar: actual, objetivo, anterior, etc.)
  type: 'current' | 'target' | 'previous'
}
```

```typescript
// src/modules/reports/dtos/consolidated-report.dto.ts

/**
 * DTO para reporte consolidado completo
 */
export class ConsolidatedReportDto {
  // Información general
  audit: {
    id: string
    name: string
    status: string
    organizationName: string
    leadAuditorName: string
    startDate: Date
    endDate: Date | null
  }

  // Resumen ejecutivo
  summary: {
    totalStandards: number
    evaluatedStandards: number
    progress: number // %

    overallScore: number // Puntaje ponderado total
    overallMaturityLevel: number // Nivel de madurez promedio

    conformities: number
    nonConformitiesMajor: number
    nonConformitiesMinor: number
    observations: number
    notApplicable: number
  }

  // Datos para gráficas radiales
  radarCharts: {
    byCategory: RadarChartDataDto // Por categorías principales
    byStandard: RadarChartDataDto // Por estándares individuales
    comparative?: RadarChartDataDto // Comparativa con auditorías anteriores
  }

  // Desglose por niveles (árbol jerárquico)
  hierarchy: HierarchyNodeDto[]

  // Tendencias (si hay auditorías previas)
  trends?: TrendDataDto[]
}

export class HierarchyNodeDto {
  // Datos del estándar
  id: string
  code: string
  name: string
  level: number

  // Ponderación
  weight: number

  // Scores
  score: number // Score real
  weightedScore: number // Score × weight
  maxScore: number

  // Nivel de madurez
  maturityLevel: number | null
  maturityLevelName: string | null

  // Estado de conformidad
  complianceStatus: string | null

  // Hijos (subniveles)
  children: HierarchyNodeDto[]

  // Estadísticas de hijos (si los tiene)
  childrenStats?: {
    total: number
    evaluated: number
    averageScore: number
    averageMaturityLevel: number
  }
}

export class TrendDataDto {
  date: Date
  auditId: string
  auditName: string
  overallScore: number
  maturityLevel: number
  conformityRate: number // %
}
```

---

## 🔢 Servicio de Cálculo de Ponderaciones

```typescript
// src/modules/reports/services/weighting-calculator.service.ts

import { Injectable } from '@nestjs/common'
import { AuditConsolidatedView } from '../views/audit-consolidated.view'
import { HierarchyNodeDto } from '../dtos/consolidated-report.dto'

export enum WeightingType {
  EQUAL = 'equal', // Todos los estándares tienen el mismo peso
  CUSTOM = 'custom', // Pesos personalizados por estándar
  HIERARCHICAL = 'hierarchical', // Pesos según jerarquía
}

@Injectable()
export class WeightingCalculatorService {
  /**
   * Calcula el score ponderado total de una auditoría
   */
  calculateWeightedScore(
    evaluations: AuditConsolidatedView[],
    weightingType: WeightingType,
  ): number {
    switch (weightingType) {
      case WeightingType.EQUAL:
        return this.calculateEqualWeighted(evaluations)

      case WeightingType.CUSTOM:
        return this.calculateCustomWeighted(evaluations)

      case WeightingType.HIERARCHICAL:
        return this.calculateHierarchicalWeighted(evaluations)

      default:
        return this.calculateEqualWeighted(evaluations)
    }
  }

  /**
   * Ponderación igual: Promedio simple
   */
  private calculateEqualWeighted(evaluations: AuditConsolidatedView[]): number {
    if (evaluations.length === 0) return 0

    const totalScore = evaluations.reduce(
      (sum, eval) => sum + eval.evaluationScore,
      0,
    )
    return totalScore / evaluations.length
  }

  /**
   * Ponderación personalizada: Usa el peso de cada estándar
   */
  private calculateCustomWeighted(
    evaluations: AuditConsolidatedView[],
  ): number {
    if (evaluations.length === 0) return 0

    const totalWeight = evaluations.reduce(
      (sum, eval) => sum + eval.standardWeight,
      0,
    )

    if (totalWeight === 0) return this.calculateEqualWeighted(evaluations)

    const weightedSum = evaluations.reduce(
      (sum, eval) => sum + eval.evaluationScore * eval.standardWeight,
      0,
    )

    return weightedSum / totalWeight
  }

  /**
   * Ponderación jerárquica: Calcula desde las hojas hacia la raíz
   */
  private calculateHierarchicalWeighted(
    evaluations: AuditConsolidatedView[],
  ): number {
    // 1. Construir árbol jerárquico
    const tree = this.buildHierarchyTree(evaluations)

    // 2. Calcular ponderados de abajo hacia arriba
    const rootScore = this.calculateNodeWeightedScore(tree)

    return rootScore
  }

  /**
   * Construye árbol jerárquico de estándares
   */
  buildHierarchyTree(evaluations: AuditConsolidatedView[]): HierarchyNodeDto[] {
    // Mapear evaluaciones a nodos
    const nodesMap = new Map<string, HierarchyNodeDto>()

    evaluations.forEach((eval) => {
      if (!nodesMap.has(eval.standardId)) {
        nodesMap.set(eval.standardId, {
          id: eval.standardId,
          code: eval.standardCode,
          name: eval.standardName,
          level: eval.standardLevel,
          weight: eval.standardWeight,
          score: eval.evaluationScore,
          weightedScore: 0, // Se calculará después
          maxScore: eval.maturityScore || 100,
          maturityLevel: eval.maturityLevel,
          maturityLevelName: eval.maturityLevelName,
          complianceStatus: eval.complianceStatus,
          children: [],
        })
      }
    })

    // Construir relaciones padre-hijo
    const roots: HierarchyNodeDto[] = []

    nodesMap.forEach((node) => {
      const parentEval = evaluations.find(
        (e) => e.standardId === node.id && e.parentStandardId,
      )

      if (parentEval?.parentStandardId) {
        const parent = nodesMap.get(parentEval.parentStandardId)
        if (parent) {
          parent.children.push(node)
        } else {
          roots.push(node)
        }
      } else {
        roots.push(node)
      }
    })

    return roots
  }

  /**
   * Calcula score ponderado de un nodo (recursivo)
   */
  private calculateNodeWeightedScore(node: HierarchyNodeDto): number {
    // Si no tiene hijos, retorna su score directo
    if (node.children.length === 0) {
      node.weightedScore = node.score
      return node.score
    }

    // Si tiene hijos, calcula el promedio ponderado de los hijos
    const totalWeight = node.children.reduce(
      (sum, child) => sum + child.weight,
      0,
    )

    if (totalWeight === 0) {
      // Si no hay pesos, usa promedio simple
      const childrenScores = node.children.map((child) =>
        this.calculateNodeWeightedScore(child),
      )
      node.weightedScore =
        childrenScores.reduce((sum, score) => sum + score, 0) /
        childrenScores.length
    } else {
      // Calcula promedio ponderado
      const weightedSum = node.children.reduce((sum, child) => {
        const childScore = this.calculateNodeWeightedScore(child)
        return sum + childScore * child.weight
      }, 0)

      node.weightedScore = weightedSum / totalWeight
    }

    // Actualizar estadísticas de hijos
    node.childrenStats = {
      total: node.children.length,
      evaluated: node.children.filter((c) => c.score > 0).length,
      averageScore: node.weightedScore,
      averageMaturityLevel:
        node.children.reduce((sum, c) => sum + (c.maturityLevel || 0), 0) /
        node.children.length,
    }

    return node.weightedScore
  }

  /**
   * Agrupa evaluaciones por categoría para gráficas radiales
   */
  groupByCategory(evaluations: AuditConsolidatedView[]): Map<string, number> {
    const categoryScores = new Map<
      string,
      { total: number; count: number; weight: number }
    >()

    evaluations.forEach((eval) => {
      const category = eval.standardCategory || 'Sin categoría'

      if (!categoryScores.has(category)) {
        categoryScores.set(category, { total: 0, count: 0, weight: 0 })
      }

      const current = categoryScores.get(category)!
      current.total += eval.evaluationScore * eval.standardWeight
      current.count += 1
      current.weight += eval.standardWeight
    })

    // Calcular promedios ponderados por categoría
    const result = new Map<string, number>()

    categoryScores.forEach((value, category) => {
      const average =
        value.weight > 0
          ? value.total / value.weight
          : value.total / value.count
      result.set(category, average)
    })

    return result
  }
}
```

---

## 🎨 Servicio de Generación de Reportes

```typescript
// src/modules/reports/services/reports-generator.service.ts

import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditConsolidatedView } from '../views/audit-consolidated.view'
import {
  WeightingCalculatorService,
  WeightingType,
} from './weighting-calculator.service'
import {
  ConsolidatedReportDto,
  RadarChartDataDto,
  RadarAxisDto,
  RadarSeriesDto,
} from '../dtos/consolidated-report.dto'

@Injectable()
export class ReportsGeneratorService {
  constructor(
    @InjectRepository(AuditConsolidatedView)
    private readonly auditConsolidatedView: Repository<AuditConsolidatedView>,
    private readonly weightingCalculator: WeightingCalculatorService,
  ) {}

  /**
   * Genera reporte consolidado completo
   */
  async generateConsolidatedReport(
    auditId: string,
  ): Promise<ConsolidatedReportDto> {
    // 1. Obtener datos consolidados de la vista
    const data = await this.auditConsolidatedView.find({
      where: { auditId },
    })

    if (data.length === 0) {
      throw new Error(`No se encontraron datos para la auditoría ${auditId}`)
    }

    const weightingType = data[0].weightingType as WeightingType

    // 2. Calcular resumen ejecutivo
    const summary = this.calculateSummary(data, weightingType)

    // 3. Generar gráficas radiales
    const radarCharts = {
      byCategory: this.generateRadarByCategory(data, weightingType),
      byStandard: this.generateRadarByStandard(data, weightingType),
    }

    // 4. Construir jerarquía
    const hierarchy = this.weightingCalculator.buildHierarchyTree(data)

    // 5. Calcular ponderados jerárquicos
    hierarchy.forEach((root) => {
      this.weightingCalculator['calculateNodeWeightedScore'](root)
    })

    // 6. Obtener tendencias (si existen auditorías previas)
    const trends = await this.calculateTrends(auditId)

    return {
      audit: {
        id: data[0].auditId,
        name: data[0].auditName,
        status: data[0].auditStatus,
        // ... otros campos desde joins
      },
      summary,
      radarCharts,
      hierarchy,
      trends,
    }
  }

  /**
   * Genera datos para gráfica radial por categoría
   */
  private generateRadarByCategory(
    data: AuditConsolidatedView[],
    weightingType: WeightingType,
  ): RadarChartDataDto {
    // Agrupar por categoría
    const categoryScores = this.weightingCalculator.groupByCategory(data)

    // Crear ejes
    const axes: RadarAxisDto[] = Array.from(categoryScores.entries()).map(
      ([category, score]) => ({
        label: category,
        weight: 1, // Puede ser dinámico
        max: 100,
      }),
    )

    // Crear serie de datos
    const values = Array.from(categoryScores.values())

    const series: RadarSeriesDto[] = [
      {
        name: 'Nivel Actual',
        values,
        color: '#3b82f6',
        type: 'current',
      },
      {
        name: 'Objetivo',
        values: axes.map(() => 100), // Línea de objetivo al 100%
        color: '#10b981',
        type: 'target',
      },
    ]

    return {
      axes,
      series,
      metadata: {
        auditId: data[0].auditId,
        auditName: data[0].auditName,
        frameworkName: '', // Obtener del join
        maxScore: 100,
        weightingType,
      },
    }
  }

  /**
   * Genera datos para gráfica radial por estándar
   */
  private generateRadarByStandard(
    data: AuditConsolidatedView[],
    weightingType: WeightingType,
  ): RadarChartDataDto {
    // Solo estándares de nivel 1 (raíz) para no saturar la gráfica
    const rootStandards = data.filter(
      (d) => d.standardLevel === 1 || !d.parentStandardId,
    )

    const axes: RadarAxisDto[] = rootStandards.map((std) => ({
      label: `${std.standardCode} - ${std.standardName}`,
      code: std.standardCode,
      weight: std.standardWeight,
      max: 100,
    }))

    const values = rootStandards.map((std) => std.evaluationScore)

    const series: RadarSeriesDto[] = [
      {
        name: 'Nivel Actual',
        values,
        color: '#3b82f6',
        type: 'current',
      },
    ]

    return {
      axes,
      series,
      metadata: {
        auditId: data[0].auditId,
        auditName: data[0].auditName,
        frameworkName: '',
        maxScore: 100,
        weightingType,
      },
    }
  }

  /**
   * Calcula resumen ejecutivo
   */
  private calculateSummary(
    data: AuditConsolidatedView[],
    weightingType: WeightingType,
  ) {
    const totalStandards = new Set(data.map((d) => d.standardId)).size
    const evaluatedStandards = data.filter((d) => d.isCompleted).length
    const progress = (evaluatedStandards / totalStandards) * 100

    const overallScore = this.weightingCalculator.calculateWeightedScore(
      data,
      weightingType,
    )

    const averageMaturityLevel =
      data.reduce((sum, d) => sum + (d.maturityLevel || 0), 0) / data.length

    return {
      totalStandards,
      evaluatedStandards,
      progress,
      overallScore,
      overallMaturityLevel: Math.round(averageMaturityLevel),
      conformities: data.filter((d) => d.complianceStatus === 'conforme')
        .length,
      nonConformitiesMajor: data.filter(
        (d) => d.complianceStatus === 'no_conforme_mayor',
      ).length,
      nonConformitiesMinor: data.filter(
        (d) => d.complianceStatus === 'no_conforme_menor',
      ).length,
      observations: data.filter((d) => d.complianceStatus === 'observacion')
        .length,
      notApplicable: data.filter((d) => d.complianceStatus === 'no_aplica')
        .length,
    }
  }

  /**
   * Calcula tendencias comparando con auditorías anteriores
   */
  private async calculateTrends(auditId: string) {
    // Implementar lógica para obtener auditorías previas
    // y calcular tendencias de scores, madurez, conformidad
    // Retornar TrendDataDto[]
    return []
  }
}
```

---

## 🔌 Controller de Reportes

```typescript
// src/modules/reports/controllers/reports.controller.ts

import { Controller, Get, Param } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { ReportsGeneratorService } from '../services/reports-generator.service'
import {
  ConsolidatedReportDto,
  RadarChartDataDto,
} from '../dtos/consolidated-report.dto'

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsGenerator: ReportsGeneratorService) {}

  @Get('audits/:auditId/consolidated')
  @ApiOperation({
    summary: 'Obtener reporte consolidado completo',
    description:
      'Incluye gráficas radiales, jerarquía, ponderados y tendencias',
  })
  @ApiResponse({ status: 200, type: ConsolidatedReportDto })
  async getConsolidatedReport(
    @Param('auditId') auditId: string,
  ): Promise<ConsolidatedReportDto> {
    return await this.reportsGenerator.generateConsolidatedReport(auditId)
  }

  @Get('audits/:auditId/radar/category')
  @ApiOperation({
    summary: 'Gráfica radial por categoría',
    description: 'Datos para spider chart agrupado por categorías',
  })
  @ApiResponse({ status: 200, type: RadarChartDataDto })
  async getRadarByCategory(
    @Param('auditId') auditId: string,
  ): Promise<RadarChartDataDto> {
    const report =
      await this.reportsGenerator.generateConsolidatedReport(auditId)
    return report.radarCharts.byCategory
  }

  @Get('audits/:auditId/radar/standard')
  @ApiOperation({
    summary: 'Gráfica radial por estándar',
    description: 'Datos para spider chart agrupado por estándares principales',
  })
  @ApiResponse({ status: 200, type: RadarChartDataDto })
  async getRadarByStandard(
    @Param('auditId') auditId: string,
  ): Promise<RadarChartDataDto> {
    const report =
      await this.reportsGenerator.generateConsolidatedReport(auditId)
    return report.radarCharts.byStandard
  }
}
```

---

## 🎨 Ejemplo de Respuesta JSON

### GET /reports/audits/:id/radar/category

```json
{
  "axes": [
    {
      "label": "Seguridad de la Información",
      "weight": 1.5,
      "max": 100
    },
    {
      "label": "Gestión de Calidad",
      "weight": 1.0,
      "max": 100
    },
    {
      "label": "Continuidad del Negocio",
      "weight": 1.2,
      "max": 100
    },
    {
      "label": "Cumplimiento Legal",
      "weight": 1.0,
      "max": 100
    },
    {
      "label": "Gestión de Riesgos",
      "weight": 1.3,
      "max": 100
    }
  ],
  "series": [
    {
      "name": "Nivel Actual",
      "values": [75.5, 82.3, 68.9, 91.2, 70.1],
      "color": "#3b82f6",
      "type": "current"
    },
    {
      "name": "Objetivo",
      "values": [100, 100, 100, 100, 100],
      "color": "#10b981",
      "type": "target"
    }
  ],
  "metadata": {
    "auditId": "audit-123",
    "auditName": "Auditoría ISO 27001 - 2025",
    "frameworkName": "ISO 27001:2013",
    "maxScore": 100,
    "weightingType": "custom"
  }
}
```

### GET /reports/audits/:id/consolidated

```json
{
  "audit": {
    "id": "audit-123",
    "name": "Auditoría ISO 27001 - 2025",
    "status": "closed",
    "organizationName": "Tech Corp S.A.",
    "leadAuditorName": "Juan Pérez",
    "startDate": "2025-02-01",
    "endDate": "2025-02-28"
  },
  "summary": {
    "totalStandards": 114,
    "evaluatedStandards": 114,
    "progress": 100,
    "overallScore": 76.8,
    "overallMaturityLevel": 3,
    "conformities": 85,
    "nonConformitiesMajor": 5,
    "nonConformitiesMinor": 12,
    "observations": 10,
    "notApplicable": 2
  },
  "radarCharts": {
    "byCategory": { ... },
    "byStandard": { ... }
  },
  "hierarchy": [
    {
      "id": "std-001",
      "code": "A.5",
      "name": "Políticas de Seguridad",
      "level": 1,
      "weight": 1.2,
      "score": 0,
      "weightedScore": 78.5,
      "maxScore": 100,
      "maturityLevel": null,
      "maturityLevelName": null,
      "complianceStatus": null,
      "children": [
        {
          "id": "std-002",
          "code": "A.5.1",
          "name": "Directrices de la dirección...",
          "level": 2,
          "weight": 1.0,
          "score": 80,
          "weightedScore": 80,
          "maxScore": 100,
          "maturityLevel": 3,
          "maturityLevelName": "Definido",
          "complianceStatus": "conforme",
          "children": [],
          "childrenStats": null
        },
        {
          "id": "std-003",
          "code": "A.5.2",
          "name": "Revisión de políticas...",
          "level": 2,
          "weight": 1.0,
          "score": 77,
          "weightedScore": 77,
          "maxScore": 100,
          "maturityLevel": 3,
          "maturityLevelName": "Definido",
          "complianceStatus": "conforme",
          "children": []
        }
      ],
      "childrenStats": {
        "total": 2,
        "evaluated": 2,
        "averageScore": 78.5,
        "averageMaturityLevel": 3.0
      }
    }
  ],
  "trends": []
}
```

---

## 📊 Frontend: Renderizar Gráficas

### Opción 1: Chart.js (Recomendado)

```typescript
// React component example
import { Radar } from 'react-chartjs-2'

function RadarChartComponent({ data }) {
  const chartData = {
    labels: data.axes.map(axis => axis.label),
    datasets: data.series.map(serie => ({
      label: serie.name,
      data: serie.values,
      backgroundColor: serie.color + '20', // Con transparencia
      borderColor: serie.color,
      borderWidth: 2,
    }))
  }

  const options = {
    scales: {
      r: {
        beginAtZero: true,
        max: data.metadata.maxScore,
        ticks: {
          stepSize: 20
        }
      }
    }
  }

  return <Radar data={chartData} options={options} />
}
```

### Opción 2: Recharts (También buena opción)

```typescript
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'

function RadarChartComponent({ data }) {
  // Transformar datos al formato de Recharts
  const chartData = data.axes.map((axis, index) => ({
    subject: axis.label,
    ...data.series.reduce((acc, serie) => ({
      ...acc,
      [serie.name]: serie.values[index]
    }), {})
  }))

  return (
    <RadarChart width={600} height={400} data={chartData}>
      <PolarGrid />
      <PolarAngleAxis dataKey="subject" />
      <PolarRadiusAxis domain={[0, 100]} />
      {data.series.map(serie => (
        <Radar
          key={serie.name}
          name={serie.name}
          dataKey={serie.name}
          stroke={serie.color}
          fill={serie.color}
          fillOpacity={0.3}
        />
      ))}
    </RadarChart>
  )
}
```

---

## 🚀 Siguientes Pasos

1. **Crear ViewEntity** (15 min)
2. **Implementar WeightingCalculatorService** (30 min)
3. **Implementar ReportsGeneratorService** (45 min)
4. **Crear endpoints en controller** (15 min)
5. **Probar con Postman** (30 min)
6. **Integrar con frontend** (variable)

---

## ✅ Ventajas de Esta Solución

✅ **ViewEntity optimiza consultas** (1 query vs múltiples joins)
✅ **Cálculos flexibles** (TypeScript permite cualquier lógica)
✅ **Ponderación dinámica** (soporta 3 tipos)
✅ **Jerarquías ilimitadas** (recursivo)
✅ **Fácil de testear** (servicios aislados)
✅ **Escalable** (agregar nuevos tipos de reportes)
✅ **Frontend agnóstico** (JSON estándar)

¿Quieres que implemente esto ahora? 🚀

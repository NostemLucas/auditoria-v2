import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { ConfigureWeightsCommand } from './configure-weights.command'
import { AuditEntity, AuditStatus } from '../../../entities/audit.entity'
import { AuditStandardWeightEntity } from '../../../entities/audit-standard-weight.entity'
import { StandardEntity } from '@templates/entities/standard.entity'
import { EvaluationEntity } from '../../../entities/evaluation.entity'

/**
 * Handler para configurar pesos de estándares
 *
 * Responsabilidad: Permitir al Lead Auditor asignar ponderaciones
 * específicas a cada estándar según la organización auditada
 *
 * Validaciones:
 * - Solo lead auditor puede configurar
 * - Solo en estados DRAFT o PLANNED
 * - Todos los estándares evaluados deben tener peso
 * - Pesos válidos (no negativos, al menos uno > 0)
 * - No duplicados
 */
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

    if (evaluations.length === 0) {
      throw new BadRequestException(
        'La auditoría no tiene evaluaciones. Debe planificar primero.',
      )
    }

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
    const standards = await this.standardsRepository.find({
      where: { id: In(standardIds) },
    })

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
   *
   * Esto mantiene las proporciones relativas pero ajusta la escala
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
    // Target sum = N (cantidad de estándares) para mantener escala razonable
    const targetSum = weights.length
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

    // Validar que los pesos no sean excesivamente grandes
    const maxWeight = Math.max(...weights.map((w) => w.weight))
    if (maxWeight > 100) {
      throw new BadRequestException(
        'Los pesos no deben exceder 100. Use valores relativos (ej: 1.0, 1.5, 2.0)',
      )
    }
  }
}

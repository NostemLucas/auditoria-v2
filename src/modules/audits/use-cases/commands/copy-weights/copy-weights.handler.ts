import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CopyWeightsCommand } from './copy-weights.command'
import { AuditEntity, AuditStatus } from '../../../entities/audit.entity'
import { AuditStandardWeightEntity } from '../../../entities/audit-standard-weight.entity'
import { EvaluationEntity } from '../../../entities/evaluation.entity'
import { ConfigureWeightsCommand } from '../configure-weights/configure-weights.command'
import { ConfigureWeightsHandler } from '../configure-weights/configure-weights.handler'

/**
 * Handler para copiar pesos desde una fuente existente
 *
 * Responsabilidad: Facilitar la configuración de pesos reutilizando
 * configuraciones previas con ajustes opcionales
 *
 * Validaciones:
 * - Solo lead auditor puede copiar
 * - Solo en estados DRAFT o PLANNED
 * - Fuente debe existir y tener pesos configurados
 * - Ajuste de pesos válido
 */
@Injectable()
export class CopyWeightsHandler {
  constructor(
    @InjectRepository(AuditEntity)
    private readonly auditsRepository: Repository<AuditEntity>,
    @InjectRepository(AuditStandardWeightEntity)
    private readonly weightsRepository: Repository<AuditStandardWeightEntity>,
    @InjectRepository(EvaluationEntity)
    private readonly evaluationsRepository: Repository<EvaluationEntity>,
    private readonly configureWeightsHandler: ConfigureWeightsHandler,
  ) {}

  async execute(
    command: CopyWeightsCommand,
  ): Promise<AuditStandardWeightEntity[]> {
    // 1. Validar que la auditoría destino existe
    const targetAudit = await this.auditsRepository.findOne({
      where: { id: command.auditId, isActive: true },
    })

    if (!targetAudit) {
      throw new NotFoundException(`Auditoría ${command.auditId} no encontrada`)
    }

    // 2. Validar que solo el lead auditor puede copiar pesos
    if (targetAudit.leadAuditorId !== command.copiedBy) {
      throw new ForbiddenException(
        'Solo el lead auditor puede configurar los pesos de la auditoría',
      )
    }

    // 3. Validar que la auditoría está en estado apropiado
    const allowedStatuses = [AuditStatus.DRAFT, AuditStatus.PLANNED]
    if (!allowedStatuses.includes(targetAudit.status)) {
      throw new BadRequestException(
        `Solo se pueden copiar pesos en auditorías DRAFT o PLANNED. Estado actual: ${targetAudit.status}`,
      )
    }

    // 4. Obtener pesos de la fuente según el tipo
    let sourceWeights: AuditStandardWeightEntity[]

    if (command.source === 'template') {
      sourceWeights = await this.getWeightsFromTemplate(targetAudit)
    } else if (command.source === 'previous_audit') {
      if (!command.sourceAuditId) {
        throw new BadRequestException(
          'sourceAuditId es requerido cuando source = "previous_audit"',
        )
      }
      sourceWeights = await this.getWeightsFromPreviousAudit(
        command.sourceAuditId,
      )
    } else {
      throw new BadRequestException(
        'Fuente no válida. Use "template" o "previous_audit"',
      )
    }

    if (sourceWeights.length === 0) {
      throw new BadRequestException(
        'La fuente seleccionada no tiene pesos configurados',
      )
    }

    // 5. Obtener evaluaciones de la auditoría destino
    const targetEvaluations = await this.evaluationsRepository.find({
      where: { auditId: command.auditId, isActive: true },
    })

    if (targetEvaluations.length === 0) {
      throw new BadRequestException(
        'La auditoría no tiene evaluaciones. Debe planificar primero.',
      )
    }

    const targetStandardIds = new Set(
      targetEvaluations.map((e) => e.standardId),
    )

    // 6. Mapear pesos: solo copiar para estándares que existen en auditoría destino
    const mappedWeights = sourceWeights
      .filter((sw) => targetStandardIds.has(sw.standardId))
      .map((sw) => ({
        standardId: sw.standardId,
        weight: sw.weight * command.adjustmentFactor,
        justification: sw.justification
          ? `${sw.justification} (Copiado de ${command.source})`
          : `Copiado de ${command.source}`,
        category: sw.category || undefined,
        displayOrder: sw.displayOrder,
      }))

    if (mappedWeights.length === 0) {
      throw new BadRequestException(
        'No hay estándares coincidentes entre la fuente y la auditoría destino',
      )
    }

    // 7. Para estándares que no tienen peso en la fuente, asignar peso por defecto
    const coveredStandardIds = new Set(mappedWeights.map((w) => w.standardId))
    const missingStandards = Array.from(targetStandardIds).filter(
      (id) => !coveredStandardIds.has(id),
    )

    if (missingStandards.length > 0) {
      // Asignar peso promedio a estándares faltantes
      const avgWeight =
        mappedWeights.reduce((sum, w) => sum + w.weight, 0) /
        mappedWeights.length

      missingStandards.forEach((standardId) => {
        mappedWeights.push({
          standardId,
          weight: avgWeight,
          justification: 'Peso asignado automáticamente (no existía en fuente)',
          category: undefined,
          displayOrder: 999,
        })
      })
    }

    // 8. Delegar la configuración al ConfigureWeightsHandler
    const configureCommand = new ConfigureWeightsCommand(
      command.auditId,
      mappedWeights,
      command.copiedBy,
      command.normalizationMode,
    )

    return await this.configureWeightsHandler.execute(configureCommand)
  }

  /**
   * Obtiene pesos desde la plantilla de la auditoría
   */
  private async getWeightsFromTemplate(
    audit: AuditEntity,
  ): Promise<AuditStandardWeightEntity[]> {
    if (!audit.templateId) {
      throw new BadRequestException('La auditoría no tiene plantilla asociada')
    }

    // Buscar una auditoría previa con la misma plantilla que tenga pesos configurados
    const previousAuditWithTemplate = await this.auditsRepository.findOne({
      where: {
        templateId: audit.templateId,
        isActive: true,
      },
      order: { createdAt: 'DESC' },
    })

    if (!previousAuditWithTemplate) {
      throw new BadRequestException(
        'No se encontraron pesos configurados para esta plantilla',
      )
    }

    const weights = await this.weightsRepository.find({
      where: { auditId: previousAuditWithTemplate.id },
    })

    if (weights.length === 0) {
      throw new BadRequestException(
        'La plantilla no tiene pesos de referencia configurados',
      )
    }

    return weights
  }

  /**
   * Obtiene pesos desde una auditoría previa
   */
  private async getWeightsFromPreviousAudit(
    sourceAuditId: string,
  ): Promise<AuditStandardWeightEntity[]> {
    const sourceAudit = await this.auditsRepository.findOne({
      where: { id: sourceAuditId, isActive: true },
    })

    if (!sourceAudit) {
      throw new NotFoundException(
        `Auditoría origen ${sourceAuditId} no encontrada`,
      )
    }

    const weights = await this.weightsRepository.find({
      where: { auditId: sourceAuditId },
    })

    if (weights.length === 0) {
      throw new BadRequestException(
        'La auditoría origen no tiene pesos configurados',
      )
    }

    return weights
  }
}

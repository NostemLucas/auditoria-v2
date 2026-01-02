import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditEntity } from '../entities/audit.entity'
import {
  EvaluationEntity,
  ComplianceStatus,
} from '../entities/evaluation.entity'
import {
  ActionPlanEntity,
  ActionPlanStatus,
} from '../entities/action-plan.entity'

/**
 * Excepciones personalizadas para validación de cierre
 */
export class AuditCannotBeClosedException extends Error {
  constructor(
    public readonly auditId: string,
    public readonly reason: string,
  ) {
    super(`Auditoría ${auditId} no puede cerrarse: ${reason}`)
    this.name = 'AuditCannotBeClosedException'
  }
}

/**
 * Validador para cierre de auditorías
 *
 * Implementa las 5 validaciones obligatorias:
 * 1. Todas las evaluaciones completadas (100%)
 * 2. Todos los hallazgos clasificados
 * 3. No conformidades críticas/mayores con plan de acción
 * 4. Reporte generado (opcional según configuración)
 * 5. Lead auditor aprobó
 */
@Injectable()
export class AuditClosureValidator {
  constructor(
    @InjectRepository(AuditEntity)
    private readonly auditsRepository: Repository<AuditEntity>,
    @InjectRepository(EvaluationEntity)
    private readonly evaluationsRepository: Repository<EvaluationEntity>,
    @InjectRepository(ActionPlanEntity)
    private readonly actionPlansRepository: Repository<ActionPlanEntity>,
  ) {}

  /**
   * Ejecuta todas las validaciones de cierre
   */
  async validateClosure(auditId: string): Promise<void> {
    await this.validateEvaluationsComplete(auditId)
    await this.validateFindingsClassified(auditId)
    await this.validateActionPlans(auditId)
    // validateReportGenerated es opcional según configuración
    // validateLeadAuditorApproval se valida en el handler
  }

  /**
   * Validación 1: Todas las evaluaciones completadas
   */
  async validateEvaluationsComplete(auditId: string): Promise<boolean> {
    const evaluations = await this.evaluationsRepository.find({
      where: { auditId, isActive: true },
    })

    if (evaluations.length === 0) {
      throw new AuditCannotBeClosedException(
        auditId,
        'No hay evaluaciones registradas',
      )
    }

    const incompleteEvaluations = evaluations.filter((e) => !e.isCompleted)

    if (incompleteEvaluations.length > 0) {
      throw new AuditCannotBeClosedException(
        auditId,
        `Hay ${incompleteEvaluations.length} evaluaciones sin completar`,
      )
    }

    return true
  }

  /**
   * Validación 2: Todos los hallazgos clasificados
   */
  async validateFindingsClassified(auditId: string): Promise<boolean> {
    const evaluations = await this.evaluationsRepository.find({
      where: { auditId, isActive: true },
    })

    const unclassified = evaluations.filter((e) => !e.complianceStatus)

    if (unclassified.length > 0) {
      throw new AuditCannotBeClosedException(
        auditId,
        `Hay ${unclassified.length} evaluaciones sin clasificar su estado de conformidad`,
      )
    }

    return true
  }

  /**
   * Validación 3: No conformidades críticas/mayores con plan de acción
   */
  async validateActionPlans(auditId: string): Promise<boolean> {
    // Obtener todas las evaluaciones con no conformidades mayores
    const nonConformities = await this.evaluationsRepository.find({
      where: [
        {
          auditId,
          isActive: true,
          complianceStatus: ComplianceStatus.NO_CONFORME_MAYOR,
        },
      ],
      relations: ['actionPlans'],
    })

    // Validar que cada no conformidad mayor tenga al menos un plan de acción aprobado o en progreso
    const withoutActionPlan = nonConformities.filter(
      (nc) =>
        !nc.actionPlans ||
        nc.actionPlans.length === 0 ||
        !nc.actionPlans.some(
          (ap) =>
            ap.status === ActionPlanStatus.APROBADO ||
            ap.status === ActionPlanStatus.EN_PROGRESO,
        ),
    )

    if (withoutActionPlan.length > 0) {
      throw new AuditCannotBeClosedException(
        auditId,
        `Hay ${withoutActionPlan.length} no conformidades MAYORES sin plan de acción aprobado`,
      )
    }

    return true
  }

  /**
   * Validación 4: Reporte generado (opcional)
   */
  async validateReportGenerated(auditId: string): Promise<boolean> {
    const audit = await this.auditsRepository.findOne({
      where: { id: auditId },
    })

    if (!audit) {
      throw new Error(`Auditoría ${auditId} no encontrada`)
    }

    // Si tiene closureMetadata con reportUrl, está ok
    if (audit.closureMetadata?.reportUrl) {
      return true
    }

    // Si no requiere reporte (según configuración del sistema), está ok
    // Esta lógica puede ser configurada según necesidades del negocio
    return true
  }

  /**
   * Calcula estadísticas para metadatos de cierre
   */
  async calculateClosureStatistics(auditId: string): Promise<{
    totalEvaluations: number
    totalFindings: number
    nonConformitiesCount: {
      critical: number
      major: number
      minor: number
    }
    conformitiesPercentage: number
    requiresFollowUp: boolean
  }> {
    const evaluations = await this.evaluationsRepository.find({
      where: { auditId, isActive: true },
    })

    const totalEvaluations = evaluations.length
    const totalFindings = evaluations.filter(
      (e) => e.complianceStatus !== null,
    ).length

    const nonConformitiesMajor = evaluations.filter(
      (e) => e.complianceStatus === ComplianceStatus.NO_CONFORME_MAYOR,
    ).length

    const nonConformitiesMinor = evaluations.filter(
      (e) => e.complianceStatus === ComplianceStatus.NO_CONFORME_MENOR,
    ).length

    const conformities = evaluations.filter(
      (e) => e.complianceStatus === ComplianceStatus.CONFORME,
    ).length

    const conformitiesPercentage =
      totalFindings > 0 ? (conformities / totalFindings) * 100 : 0

    const requiresFollowUp =
      nonConformitiesMajor > 0 || nonConformitiesMinor > 0

    return {
      totalEvaluations,
      totalFindings,
      nonConformitiesCount: {
        critical: 0, // No tenemos clasificación de crítico aún
        major: nonConformitiesMajor,
        minor: nonConformitiesMinor,
      },
      conformitiesPercentage: Math.round(conformitiesPercentage * 100) / 100,
      requiresFollowUp,
    }
  }
}

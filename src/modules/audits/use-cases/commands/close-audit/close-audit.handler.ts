import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditEntity, AuditStatus } from '../../../entities/audit.entity'
import { AuditClosureValidator } from '../../../validators/audit-closure.validator'
import { CloseAuditCommand } from './close-audit.command'

/**
 * Handler para el comando CloseAudit
 *
 * Responsabilidad: Cerrar definitivamente una auditoría (PENDING_CLOSURE → CLOSED)
 *
 * Validaciones completas de cierre:
 * ✓ Todas las evaluaciones completadas (100%)
 * ✓ Todos los hallazgos clasificados
 * ✓ No conformidades mayores con plan de acción aprobado
 * ✓ Lead auditor aprobó el cierre
 *
 * Genera metadatos finales de cierre con estadísticas completas
 */
@Injectable()
export class CloseAuditHandler {
  constructor(
    @InjectRepository(AuditEntity)
    private readonly auditsRepository: Repository<AuditEntity>,
    private readonly closureValidator: AuditClosureValidator,
  ) {}

  async execute(command: CloseAuditCommand): Promise<AuditEntity> {
    // 1. Obtener auditoría
    const audit = await this.auditsRepository.findOne({
      where: { id: command.auditId, isActive: true },
    })

    if (!audit) {
      throw new NotFoundException(`Auditoría ${command.auditId} no encontrada`)
    }

    // 2. Validar estado actual
    if (audit.status !== AuditStatus.PENDING_CLOSURE) {
      throw new BadRequestException(
        `Solo se pueden cerrar auditorías en estado PENDING_CLOSURE. Estado actual: ${audit.status}`,
      )
    }

    // 3. Validar que solo el lead auditor puede cerrar
    if (audit.leadAuditorId !== command.closedBy) {
      throw new ForbiddenException(
        'Solo el lead auditor puede cerrar la auditoría',
      )
    }

    // 4. Validar aprobación del lead auditor
    if (!audit.closureApprovedAt) {
      throw new BadRequestException(
        'El lead auditor debe aprobar el cierre antes de cerrar la auditoría. Use el endpoint de aprobación primero.',
      )
    }

    // 5. Ejecutar validaciones de cierre (re-validar)
    try {
      await this.closureValidator.validateClosure(command.auditId)
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'AuditCannotBeClosedException'
      ) {
        throw new BadRequestException(
          `No se puede cerrar la auditoría: ${error.message}`,
        )
      }
      throw error
    }

    // 6. Calcular estadísticas finales
    const statistics = await this.closureValidator.calculateClosureStatistics(
      command.auditId,
    )

    // 7. Actualizar metadatos de cierre con datos finales
    audit.closureMetadata = {
      closedAt: new Date(),
      closedBy: command.closedBy,
      ...statistics,
      reportUrl: command.reportUrl || audit.closureMetadata?.reportUrl,
    }

    // 8. Establecer fecha de fin si no está establecida
    if (!audit.endDate) {
      audit.endDate = new Date()
    }

    // 9. Cambiar estado a CLOSED
    audit.status = AuditStatus.CLOSED

    // 10. Guardar y retornar
    const closedAudit = await this.auditsRepository.save(audit)

    // TODO: Aquí se podría disparar eventos para:
    // - Notificar stakeholders
    // - Generar reportes finales
    // - Crear auditoría de seguimiento automáticamente si requiresFollowUp = true

    return closedAudit
  }
}

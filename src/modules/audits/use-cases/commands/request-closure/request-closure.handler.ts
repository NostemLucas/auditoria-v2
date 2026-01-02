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
import { RequestClosureCommand } from './request-closure.command'

/**
 * Handler para el comando RequestClosure
 *
 * Responsabilidad: Solicitar cierre de auditoría (IN_PROGRESS → PENDING_CLOSURE)
 *
 * Validaciones previas (antes de solicitar):
 * ✓ Todas las evaluaciones completadas (100%)
 * ✓ Todos los hallazgos clasificados
 * ✓ No conformidades mayores con plan de acción
 *
 * Nota: El cierre definitivo (CLOSED) requiere aprobación adicional
 */
@Injectable()
export class RequestClosureHandler {
  constructor(
    @InjectRepository(AuditEntity)
    private readonly auditsRepository: Repository<AuditEntity>,
    private readonly closureValidator: AuditClosureValidator,
  ) {}

  async execute(command: RequestClosureCommand): Promise<AuditEntity> {
    // 1. Obtener auditoría
    const audit = await this.auditsRepository.findOne({
      where: { id: command.auditId, isActive: true },
    })

    if (!audit) {
      throw new NotFoundException(`Auditoría ${command.auditId} no encontrada`)
    }

    // 2. Validar estado actual
    if (audit.status !== AuditStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Solo se puede solicitar cierre de auditorías en estado IN_PROGRESS. Estado actual: ${audit.status}`,
      )
    }

    // 3. Validar que solo el lead auditor puede solicitar cierre
    if (audit.leadAuditorId !== command.requestedBy) {
      throw new ForbiddenException(
        'Solo el lead auditor puede solicitar el cierre de la auditoría',
      )
    }

    // 4. Ejecutar validaciones de cierre
    try {
      await this.closureValidator.validateClosure(command.auditId)
    } catch (error) {
      // Si las validaciones fallan, lanzar error específico
      if (
        error instanceof Error &&
        error.name === 'AuditCannotBeClosedException'
      ) {
        throw new BadRequestException(
          `No se puede solicitar el cierre: ${error.message}`,
        )
      }
      throw error
    }

    // 5. Calcular estadísticas preliminares
    const statistics = await this.closureValidator.calculateClosureStatistics(
      command.auditId,
    )

    // 6. Cambiar estado a PENDING_CLOSURE
    audit.status = AuditStatus.PENDING_CLOSURE

    // 7. Registrar metadatos preliminares (se completarán en el cierre final)
    audit.closureMetadata = {
      closedAt: new Date(), // Fecha de solicitud (se actualizará en cierre final)
      closedBy: command.requestedBy,
      ...statistics,
      reportUrl: command.reportUrl,
    }

    // 8. Guardar
    return await this.auditsRepository.save(audit)
  }
}

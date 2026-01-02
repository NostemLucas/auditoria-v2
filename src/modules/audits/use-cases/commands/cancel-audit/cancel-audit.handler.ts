import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditEntity, AuditStatus } from '../../../entities/audit.entity'
import { CancelAuditCommand } from './cancel-audit.command'

/**
 * Handler para el comando CancelAudit
 *
 * Responsabilidad: Cancelar una auditoría (Cualquier estado → CANCELLED)
 *
 * Restricciones:
 * ✓ No se pueden cancelar auditorías ya cerradas (CLOSED)
 * ✓ Solo el lead auditor puede cancelar
 * ✓ Razón de cancelación es obligatoria
 * ✓ Se preserva el historial hasta el momento de cancelación
 */
@Injectable()
export class CancelAuditHandler {
  constructor(
    @InjectRepository(AuditEntity)
    private readonly auditsRepository: Repository<AuditEntity>,
  ) {}

  async execute(command: CancelAuditCommand): Promise<AuditEntity> {
    // 1. Obtener auditoría
    const audit = await this.auditsRepository.findOne({
      where: { id: command.auditId, isActive: true },
    })

    if (!audit) {
      throw new NotFoundException(`Auditoría ${command.auditId} no encontrada`)
    }

    // 2. Validar que no esté ya cerrada o cancelada
    if (audit.status === AuditStatus.CLOSED) {
      throw new BadRequestException(
        'No se pueden cancelar auditorías ya cerradas',
      )
    }

    if (audit.status === AuditStatus.CANCELLED) {
      throw new BadRequestException('La auditoría ya está cancelada')
    }

    // 3. Validar que solo el lead auditor puede cancelar
    // TODO: Agregar validación de roles de admin
    if (audit.leadAuditorId !== command.cancelledBy) {
      throw new ForbiddenException(
        'Solo el lead auditor puede cancelar la auditoría',
      )
    }

    // 4. Validar razón de cancelación
    if (
      !command.cancellationReason ||
      command.cancellationReason.trim() === ''
    ) {
      throw new BadRequestException('La razón de cancelación es obligatoria')
    }

    // 5. Guardar estado anterior
    const previousStatus = audit.status

    // 6. Registrar metadatos de cancelación
    audit.cancellationMetadata = {
      cancelledAt: new Date(),
      cancelledBy: command.cancelledBy,
      cancellationReason: command.cancellationReason,
      previousStatus,
    }

    // 7. Cambiar estado a CANCELLED
    audit.status = AuditStatus.CANCELLED

    // 8. Guardar
    return await this.auditsRepository.save(audit)
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditEntity, AuditStatus } from '../../../entities/audit.entity'
import { ApproveClosureCommand } from './approve-closure.command'

/**
 * Handler para el comando ApproveClosure
 *
 * Responsabilidad: Aprobar el cierre de una auditoría en PENDING_CLOSURE
 * para que pueda ser cerrada definitivamente
 *
 * Esto es un paso intermedio entre solicitar cierre y cerrar definitivamente
 */
@Injectable()
export class ApproveClosureHandler {
  constructor(
    @InjectRepository(AuditEntity)
    private readonly auditsRepository: Repository<AuditEntity>,
  ) {}

  async execute(command: ApproveClosureCommand): Promise<AuditEntity> {
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
        `Solo se puede aprobar cierre de auditorías en estado PENDING_CLOSURE. Estado actual: ${audit.status}`,
      )
    }

    // 3. Validar que solo el lead auditor puede aprobar
    if (audit.leadAuditorId !== command.approvedBy) {
      throw new ForbiddenException(
        'Solo el lead auditor puede aprobar el cierre de la auditoría',
      )
    }

    // 4. Registrar aprobación
    audit.closureApprovedAt = new Date()
    audit.closureApprovedBy = command.approvedBy

    // 5. Guardar
    return await this.auditsRepository.save(audit)
  }
}

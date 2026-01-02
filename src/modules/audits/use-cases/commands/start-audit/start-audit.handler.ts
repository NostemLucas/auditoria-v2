import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditEntity, AuditStatus } from '../../../entities/audit.entity'
import { StartAuditCommand } from './start-audit.command'

/**
 * Handler para el comando StartAudit
 *
 * Responsabilidad: Iniciar una auditoría planificada (PLANNED → IN_PROGRESS)
 *
 * Validaciones:
 * ✓ Solo el lead auditor puede iniciar
 * ✓ Solo auditorías PLANNED pueden iniciarse
 * ✓ La fecha de inicio debe haber llegado (opcional, según política)
 */
@Injectable()
export class StartAuditHandler {
  constructor(
    @InjectRepository(AuditEntity)
    private readonly auditsRepository: Repository<AuditEntity>,
  ) {}

  async execute(command: StartAuditCommand): Promise<AuditEntity> {
    // 1. Obtener auditoría
    const audit = await this.auditsRepository.findOne({
      where: { id: command.auditId, isActive: true },
    })

    if (!audit) {
      throw new NotFoundException(`Auditoría ${command.auditId} no encontrada`)
    }

    // 2. Validar estado actual
    if (audit.status !== AuditStatus.PLANNED) {
      throw new BadRequestException(
        `Solo se pueden iniciar auditorías en estado PLANNED. Estado actual: ${audit.status}`,
      )
    }

    // 3. Validar que solo el lead auditor puede iniciar
    if (audit.leadAuditorId !== command.startedBy) {
      throw new ForbiddenException(
        'Solo el lead auditor puede iniciar la auditoría',
      )
    }

    // 4. Validar que la fecha de inicio haya llegado (opcional, comentado por ahora)
    // const today = new Date()
    // today.setHours(0, 0, 0, 0)
    // if (audit.startDate > today) {
    //   throw new BadRequestException(
    //     `La auditoría no puede iniciarse antes de la fecha programada: ${audit.startDate}`,
    //   )
    // }

    // 5. Cambiar estado a IN_PROGRESS
    audit.status = AuditStatus.IN_PROGRESS

    // 6. Guardar
    return await this.auditsRepository.save(audit)
  }
}

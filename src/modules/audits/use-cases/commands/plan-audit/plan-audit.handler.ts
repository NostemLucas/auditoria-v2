import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { AuditEntity, AuditStatus } from '../../../entities/audit.entity'
import { UserEntity } from '@users/entities/user.entity'
import { PlanAuditCommand } from './plan-audit.command'

/**
 * Handler para el comando PlanAudit
 *
 * Responsabilidad: Planificar una auditoría (DRAFT → PLANNED)
 *
 * Validaciones de planificación:
 * ✓ Debe tener lead auditor asignado
 * ✓ Debe tener al menos 1 auditor adicional
 * ✓ Debe tener fecha de inicio
 * ✓ Debe tener fecha de fin (posterior a inicio)
 * ✓ Debe tener alcance definido
 * ✓ Debe tener plantilla/estándar seleccionado (ya existe en DRAFT)
 */
@Injectable()
export class PlanAuditHandler {
  constructor(
    @InjectRepository(AuditEntity)
    private readonly auditsRepository: Repository<AuditEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async execute(command: PlanAuditCommand): Promise<AuditEntity> {
    // 1. Obtener auditoría
    const audit = await this.auditsRepository.findOne({
      where: { id: command.auditId, isActive: true },
      relations: ['auditTeam'],
    })

    if (!audit) {
      throw new NotFoundException(`Auditoría ${command.auditId} no encontrada`)
    }

    // 2. Validar estado actual
    if (audit.status !== AuditStatus.DRAFT) {
      throw new BadRequestException(
        `Solo se pueden planificar auditorías en estado DRAFT. Estado actual: ${audit.status}`,
      )
    }

    // 3. Validar fechas
    if (command.scheduledStartDate >= command.scheduledEndDate) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      )
    }

    // 4. Validar lead auditor existe
    const leadAuditor = await this.usersRepository.findOne({
      where: { id: command.leadAuditorId },
    })

    if (!leadAuditor) {
      throw new NotFoundException(
        `Lead auditor ${command.leadAuditorId} no encontrado`,
      )
    }

    // 5. Validar auditores existen
    if (command.auditorIds.length === 0) {
      throw new BadRequestException(
        'Debe asignar al menos 1 auditor adicional al equipo',
      )
    }

    const auditors = await this.usersRepository.find({
      where: { id: In(command.auditorIds) },
    })

    if (auditors.length !== command.auditorIds.length) {
      throw new BadRequestException('Algunos auditores no fueron encontrados')
    }

    // 6. Validar alcance
    if (!command.scope || command.scope.trim() === '') {
      throw new BadRequestException('El alcance de la auditoría es requerido')
    }

    // 7. Actualizar auditoría
    audit.leadAuditorId = command.leadAuditorId
    audit.auditTeam = auditors
    audit.startDate = command.scheduledStartDate
    audit.endDate = command.scheduledEndDate
    audit.scope = command.scope

    if (command.organizationId) {
      audit.organizationId = command.organizationId
    }

    // 8. Cambiar estado a PLANNED
    audit.status = AuditStatus.PLANNED

    // 9. Guardar
    return await this.auditsRepository.save(audit)
  }
}

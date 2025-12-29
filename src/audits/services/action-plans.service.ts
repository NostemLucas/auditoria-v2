import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import {
  ActionPlanEntity,
  ActionPlanStatus,
  VerificationResult,
} from '../entities/action-plan.entity'
import { CreateActionPlanDto, UpdateActionPlanDto } from '../dtos'

@Injectable()
export class ActionPlansService {
  constructor(
    @InjectRepository(ActionPlanEntity)
    private readonly actionPlanRepository: Repository<ActionPlanEntity>,
  ) {}

  async create(
    createActionPlanDto: CreateActionPlanDto,
  ): Promise<ActionPlanEntity> {
    const actionPlan = this.actionPlanRepository.create({
      ...createActionPlanDto,
      implementationEvidence: [],
    })

    return await this.actionPlanRepository.save(actionPlan)
  }

  async findAll(): Promise<ActionPlanEntity[]> {
    return await this.actionPlanRepository.find({
      where: { isActive: true },
      relations: [
        'evaluation',
        'evaluation.audit',
        'responsible',
        'creator',
        'approver',
        'verifier',
      ],
      order: { createdAt: 'DESC' },
    })
  }

  async findOne(id: string): Promise<ActionPlanEntity> {
    const actionPlan = await this.actionPlanRepository.findOne({
      where: { id, isActive: true },
      relations: [
        'evaluation',
        'evaluation.audit',
        'evaluation.standard',
        'responsible',
        'creator',
        'approver',
        'verifier',
        'previousActionPlan',
      ],
    })

    if (!actionPlan) {
      throw new NotFoundException(`Plan de acción con ID ${id} no encontrado`)
    }

    return actionPlan
  }

  async findByEvaluation(evaluationId: string): Promise<ActionPlanEntity[]> {
    return await this.actionPlanRepository.find({
      where: { evaluationId, isActive: true },
      relations: ['responsible', 'creator', 'approver'],
      order: { createdAt: 'DESC' },
    })
  }

  async findByResponsible(responsibleId: string): Promise<ActionPlanEntity[]> {
    return await this.actionPlanRepository.find({
      where: { responsibleId, isActive: true },
      relations: ['evaluation', 'evaluation.audit', 'creator'],
      order: { dueDate: 'ASC' },
    })
  }

  async findByStatus(status: ActionPlanStatus): Promise<ActionPlanEntity[]> {
    return await this.actionPlanRepository.find({
      where: { status, isActive: true },
      relations: ['evaluation', 'evaluation.audit', 'responsible', 'creator'],
      order: { dueDate: 'ASC' },
    })
  }

  async update(
    id: string,
    updateActionPlanDto: UpdateActionPlanDto,
  ): Promise<ActionPlanEntity> {
    const actionPlan = await this.findOne(id)

    Object.assign(actionPlan, updateActionPlanDto)

    return await this.actionPlanRepository.save(actionPlan)
  }

  async submitForApproval(id: string): Promise<ActionPlanEntity> {
    const actionPlan = await this.findOne(id)

    if (actionPlan.status !== ActionPlanStatus.BORRADOR) {
      throw new BadRequestException(
        'Solo se pueden enviar a aprobación planes en estado borrador',
      )
    }

    actionPlan.status = ActionPlanStatus.PENDIENTE_APROBACION

    return await this.actionPlanRepository.save(actionPlan)
  }

  async approve(id: string, approverId: string): Promise<ActionPlanEntity> {
    const actionPlan = await this.findOne(id)

    if (actionPlan.status !== ActionPlanStatus.PENDIENTE_APROBACION) {
      throw new BadRequestException(
        'Solo se pueden aprobar planes en estado pendiente de aprobación',
      )
    }

    actionPlan.status = ActionPlanStatus.APROBADO
    actionPlan.approvedBy = approverId
    actionPlan.approvedAt = new Date()

    return await this.actionPlanRepository.save(actionPlan)
  }

  async reject(
    id: string,
    approverId: string,
    reason: string,
  ): Promise<ActionPlanEntity> {
    const actionPlan = await this.findOne(id)

    if (actionPlan.status !== ActionPlanStatus.PENDIENTE_APROBACION) {
      throw new BadRequestException(
        'Solo se pueden rechazar planes en estado pendiente de aprobación',
      )
    }

    actionPlan.status = ActionPlanStatus.RECHAZADO
    actionPlan.approvedBy = approverId
    actionPlan.approvedAt = new Date()
    actionPlan.rejectionReason = reason

    return await this.actionPlanRepository.save(actionPlan)
  }

  async startImplementation(id: string): Promise<ActionPlanEntity> {
    const actionPlan = await this.findOne(id)

    if (actionPlan.status !== ActionPlanStatus.APROBADO) {
      throw new BadRequestException('Solo se pueden iniciar planes aprobados')
    }

    actionPlan.status = ActionPlanStatus.EN_PROGRESO

    return await this.actionPlanRepository.save(actionPlan)
  }

  async markAsCompleted(id: string): Promise<ActionPlanEntity> {
    const actionPlan = await this.findOne(id)

    if (actionPlan.status !== ActionPlanStatus.EN_PROGRESO) {
      throw new BadRequestException(
        'Solo se pueden completar planes en progreso',
      )
    }

    if (actionPlan.implementationEvidence.length === 0) {
      throw new BadRequestException(
        'Debe subir evidencias antes de marcar como completado',
      )
    }

    actionPlan.status = ActionPlanStatus.COMPLETADO
    actionPlan.completedAt = new Date()

    return await this.actionPlanRepository.save(actionPlan)
  }

  async verify(
    id: string,
    verifierId: string,
    result: VerificationResult,
    comments?: string,
  ): Promise<ActionPlanEntity> {
    const actionPlan = await this.findOne(id)

    if (actionPlan.status !== ActionPlanStatus.COMPLETADO) {
      throw new BadRequestException(
        'Solo se pueden verificar planes completados',
      )
    }

    if (result === VerificationResult.APROBADO) {
      actionPlan.status = ActionPlanStatus.VERIFICADO
    } else {
      actionPlan.status = ActionPlanStatus.EN_PROGRESO
    }

    actionPlan.verifiedBy = verifierId
    actionPlan.verifiedAt = new Date()
    actionPlan.verificationResult = result
    actionPlan.verificationComments = comments || null

    return await this.actionPlanRepository.save(actionPlan)
  }

  async close(id: string): Promise<ActionPlanEntity> {
    const actionPlan = await this.findOne(id)

    if (actionPlan.status !== ActionPlanStatus.VERIFICADO) {
      throw new BadRequestException('Solo se pueden cerrar planes verificados')
    }

    actionPlan.status = ActionPlanStatus.CERRADO

    return await this.actionPlanRepository.save(actionPlan)
  }

  async checkOverdue(): Promise<void> {
    const now = new Date()

    const overduePlans = await this.actionPlanRepository
      .createQueryBuilder('plan')
      .where('plan.dueDate < :now', { now })
      .andWhere('plan.status IN (:...statuses)', {
        statuses: [ActionPlanStatus.APROBADO, ActionPlanStatus.EN_PROGRESO],
      })
      .andWhere('plan.isActive = true')
      .getMany()

    for (const plan of overduePlans) {
      plan.status = ActionPlanStatus.VENCIDO
      await this.actionPlanRepository.save(plan)
    }
  }

  async remove(id: string): Promise<void> {
    const actionPlan = await this.findOne(id)
    actionPlan.isActive = false
    await this.actionPlanRepository.save(actionPlan)
  }

  async delete(id: string): Promise<void> {
    await this.actionPlanRepository.delete(id)
  }
}

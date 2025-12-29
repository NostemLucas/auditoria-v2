import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditEntity, AuditType, AuditStatus } from '../entities/audit.entity'
import {
  EvaluationEntity,
  ComplianceStatus,
} from '../entities/evaluation.entity'
import { StandardEntity } from '../../templates/entities/standard.entity'
import { UserEntity } from '../../users/entities/user.entity'
import { CreateAuditDto, UpdateAuditDto } from '../dtos'

@Injectable()
export class AuditsService {
  constructor(
    @InjectRepository(AuditEntity)
    private readonly auditRepository: Repository<AuditEntity>,
    @InjectRepository(EvaluationEntity)
    private readonly evaluationRepository: Repository<EvaluationEntity>,
    @InjectRepository(StandardEntity)
    private readonly standardRepository: Repository<StandardEntity>,
  ) {}

  async create(createAuditDto: CreateAuditDto): Promise<AuditEntity> {
    const { auditTeamIds, ...auditData } = createAuditDto

    // Crear la auditoría
    const audit = this.auditRepository.create({
      ...auditData,
      totalScore: 0,
      progress: 0,
    })

    // Si hay equipo de auditores, asignarlos
    if (auditTeamIds && auditTeamIds.length > 0) {
      audit.auditTeam = auditTeamIds.map((id) => ({ id }) as UserEntity)
    }

    const savedAudit = await this.auditRepository.save(audit)

    // Generar evaluaciones automáticamente
    await this.generateEvaluations(savedAudit)

    // Retornar con las evaluaciones generadas
    return await this.findOne(savedAudit.id)
  }

  private async generateEvaluations(audit: AuditEntity): Promise<void> {
    if (
      audit.auditType === AuditType.INICIAL ||
      audit.auditType === AuditType.RECERTIFICACION
    ) {
      // Para auditorías iniciales o recertificación, crear evaluaciones para TODAS las normas auditables
      await this.generateInitialEvaluations(audit)
    } else if (audit.auditType === AuditType.SEGUIMIENTO) {
      // Para seguimiento, solo crear evaluaciones de las no conformidades del padre
      await this.generateFollowUpEvaluations(audit)
    }
  }

  private async generateInitialEvaluations(audit: AuditEntity): Promise<void> {
    // Obtener todas las normas auditables del template
    const auditableStandards = await this.standardRepository.find({
      where: {
        templateId: audit.templateId,
        isAuditable: true,
        isActive: true,
      },
    })

    // Crear una evaluación por cada norma auditable
    const evaluations = auditableStandards.map((standard) => {
      return this.evaluationRepository.create({
        auditId: audit.id,
        standardId: standard.id,
        score: 0,
        isCompleted: false,
        evidence: [],
      })
    })

    await this.evaluationRepository.save(evaluations)
  }

  private async generateFollowUpEvaluations(audit: AuditEntity): Promise<void> {
    if (!audit.parentAuditId) {
      throw new BadRequestException(
        'Las auditorías de seguimiento requieren un parentAuditId',
      )
    }

    // Obtener evaluaciones del padre con no conformidades
    const parentEvaluations = await this.evaluationRepository.find({
      where: {
        auditId: audit.parentAuditId,
        complianceStatus: ComplianceStatus.NO_CONFORME_MENOR,
      },
    })

    const parentEvaluationsMayor = await this.evaluationRepository.find({
      where: {
        auditId: audit.parentAuditId,
        complianceStatus: ComplianceStatus.NO_CONFORME_MAYOR,
      },
    })

    const allNonCompliances = [...parentEvaluations, ...parentEvaluationsMayor]

    if (allNonCompliances.length === 0) {
      throw new BadRequestException(
        'La auditoría padre no tiene no conformidades para dar seguimiento',
      )
    }

    // Crear evaluaciones solo para las no conformidades
    const evaluations = allNonCompliances.map((parentEvaluation) => {
      return this.evaluationRepository.create({
        auditId: audit.id,
        standardId: parentEvaluation.standardId,
        previousEvaluationId: parentEvaluation.id,
        score: 0,
        isCompleted: false,
        evidence: [],
      })
    })

    await this.evaluationRepository.save(evaluations)
  }

  async findAll(): Promise<AuditEntity[]> {
    return await this.auditRepository.find({
      where: { isActive: true },
      relations: [
        'template',
        'framework',
        'organization',
        'leadAuditor',
        'auditTeam',
        'approver',
      ],
      order: { createdAt: 'DESC' },
    })
  }

  async findOne(id: string): Promise<AuditEntity> {
    const audit = await this.auditRepository.findOne({
      where: { id, isActive: true },
      relations: [
        'template',
        'framework',
        'organization',
        'leadAuditor',
        'auditTeam',
        'approver',
        'parentAudit',
        'evaluations',
        'evaluations.standard',
        'evaluations.maturityLevel',
      ],
    })

    if (!audit) {
      throw new NotFoundException(`Auditoría con ID ${id} no encontrada`)
    }

    return audit
  }

  async findByTemplate(templateId: string): Promise<AuditEntity[]> {
    return await this.auditRepository.find({
      where: { templateId, isActive: true },
      relations: ['framework', 'organization', 'leadAuditor', 'auditTeam'],
      order: { createdAt: 'DESC' },
    })
  }

  async findByFramework(frameworkId: string): Promise<AuditEntity[]> {
    return await this.auditRepository.find({
      where: { frameworkId, isActive: true },
      relations: ['template', 'organization', 'leadAuditor', 'auditTeam'],
      order: { createdAt: 'DESC' },
    })
  }

  async findByLeadAuditor(leadAuditorId: string): Promise<AuditEntity[]> {
    return await this.auditRepository.find({
      where: { leadAuditorId, isActive: true },
      relations: ['template', 'framework', 'organization', 'auditTeam'],
      order: { createdAt: 'DESC' },
    })
  }

  async findByOrganization(organizationId: string): Promise<AuditEntity[]> {
    return await this.auditRepository.find({
      where: { organizationId, isActive: true },
      relations: ['template', 'framework', 'leadAuditor', 'auditTeam'],
      order: { createdAt: 'DESC' },
    })
  }

  async findByAuditor(auditorId: string): Promise<AuditEntity[]> {
    // Buscar auditorías donde el usuario es lead auditor o miembro del equipo
    const asLead = await this.findByLeadAuditor(auditorId)

    const asTeamMember = await this.auditRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.auditTeam', 'team')
      .leftJoinAndSelect('audit.template', 'template')
      .leftJoinAndSelect('audit.framework', 'framework')
      .leftJoinAndSelect('audit.organization', 'organization')
      .leftJoinAndSelect('audit.leadAuditor', 'leadAuditor')
      .where('audit.isActive = :isActive', { isActive: true })
      .andWhere('team.id = :auditorId', { auditorId })
      .orderBy('audit.createdAt', 'DESC')
      .getMany()

    // Combinar y eliminar duplicados
    const uniqueMap = new Map<string, AuditEntity>()
    ;[...asLead, ...asTeamMember].forEach((audit) => {
      uniqueMap.set(audit.id, audit)
    })

    return Array.from(uniqueMap.values())
  }

  async update(
    id: string,
    updateAuditDto: UpdateAuditDto,
  ): Promise<AuditEntity> {
    const audit = await this.findOne(id)

    Object.assign(audit, updateAuditDto)

    return await this.auditRepository.save(audit)
  }

  async updateProgress(auditId: string): Promise<void> {
    const audit = await this.findOne(auditId)

    const totalEvaluations = audit.evaluations.length
    const completedEvaluations = audit.evaluations.filter(
      (e) => e.isCompleted,
    ).length

    const progress =
      totalEvaluations > 0 ? (completedEvaluations / totalEvaluations) * 100 : 0

    audit.progress = Number(progress.toFixed(2))

    // Calcular score total (promedio de scores de evaluaciones completadas)
    const completedEvals = audit.evaluations.filter((e) => e.isCompleted)
    if (completedEvals.length > 0) {
      const totalScore = completedEvals.reduce(
        (sum, e) => sum + Number(e.score),
        0,
      )
      audit.totalScore = Number((totalScore / completedEvals.length).toFixed(2))
    }

    await this.auditRepository.save(audit)
  }

  async complete(id: string): Promise<AuditEntity> {
    const audit = await this.findOne(id)

    // Verificar que todas las evaluaciones estén completadas
    const allCompleted = audit.evaluations.every((e) => e.isCompleted)

    if (!allCompleted) {
      throw new BadRequestException(
        'No se puede completar la auditoría. Aún hay evaluaciones pendientes',
      )
    }

    audit.status = AuditStatus.COMPLETADA
    audit.endDate = new Date()

    return await this.auditRepository.save(audit)
  }

  async approve(id: string, approverId: string): Promise<AuditEntity> {
    const audit = await this.findOne(id)

    if (audit.status !== AuditStatus.COMPLETADA) {
      throw new BadRequestException(
        'Solo se pueden aprobar auditorías completadas',
      )
    }

    audit.status = AuditStatus.APROBADA
    audit.approverId = approverId

    return await this.auditRepository.save(audit)
  }

  async remove(id: string): Promise<void> {
    const audit = await this.findOne(id)
    audit.isActive = false
    await this.auditRepository.save(audit)
  }

  async delete(id: string): Promise<void> {
    await this.auditRepository.delete(id)
  }
}

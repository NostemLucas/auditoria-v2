import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { EvaluationEntity } from '../entities/evaluation.entity'
import { MaturityLevelEntity } from '../../maturity-frameworks/entities/maturity-level.entity'
import { CreateEvaluationDto, UpdateEvaluationDto } from '../dtos'
import { AuditsService } from './audits.service'

@Injectable()
export class EvaluationsService {
  constructor(
    @InjectRepository(EvaluationEntity)
    private readonly evaluationRepository: Repository<EvaluationEntity>,
    @InjectRepository(MaturityLevelEntity)
    private readonly maturityLevelRepository: Repository<MaturityLevelEntity>,
    private readonly auditsService: AuditsService,
  ) {}

  async create(
    createEvaluationDto: CreateEvaluationDto,
  ): Promise<EvaluationEntity> {
    const evaluation = this.evaluationRepository.create(createEvaluationDto)
    return await this.evaluationRepository.save(evaluation)
  }

  async findAll(): Promise<EvaluationEntity[]> {
    return await this.evaluationRepository.find({
      where: { isActive: true },
      relations: ['audit', 'standard', 'maturityLevel', 'evaluator'],
      order: { createdAt: 'DESC' },
    })
  }

  async findOne(id: string): Promise<EvaluationEntity> {
    const evaluation = await this.evaluationRepository.findOne({
      where: { id, isActive: true },
      relations: [
        'audit',
        'standard',
        'maturityLevel',
        'evaluator',
        'previousEvaluation',
        'actionPlans',
        'actionPlans.responsible',
        'actionPlans.creator',
      ],
    })

    if (!evaluation) {
      throw new NotFoundException(`Evaluación con ID ${id} no encontrada`)
    }

    return evaluation
  }

  async findByAudit(auditId: string): Promise<EvaluationEntity[]> {
    return await this.evaluationRepository.find({
      where: { auditId, isActive: true },
      relations: ['standard', 'maturityLevel', 'evaluator'],
      order: { createdAt: 'ASC' },
    })
  }

  async findByStandard(standardId: string): Promise<EvaluationEntity[]> {
    return await this.evaluationRepository.find({
      where: { standardId, isActive: true },
      relations: ['audit', 'maturityLevel', 'evaluator'],
      order: { createdAt: 'DESC' },
    })
  }

  async update(
    id: string,
    updateEvaluationDto: UpdateEvaluationDto,
  ): Promise<EvaluationEntity> {
    const evaluation = await this.findOne(id)

    // Si se está asignando un maturityLevel, copiar sus textos y score
    if (updateEvaluationDto.maturityLevelId) {
      const maturityLevel = await this.maturityLevelRepository.findOne({
        where: { id: updateEvaluationDto.maturityLevelId },
      })

      if (maturityLevel) {
        // Copiar score automáticamente
        updateEvaluationDto.score = Number(maturityLevel.score)

        // Si no se proporcionaron textos personalizados, usar los del nivel
        if (!updateEvaluationDto.observations && maturityLevel.observations) {
          updateEvaluationDto.observations = maturityLevel.observations
        }
        if (
          !updateEvaluationDto.recommendations &&
          maturityLevel.recommendations
        ) {
          updateEvaluationDto.recommendations = maturityLevel.recommendations
        }
      }
    }

    Object.assign(evaluation, updateEvaluationDto)

    // Si se marca como evaluada, registrar fecha y usuario
    if (updateEvaluationDto.evaluatedBy && !evaluation.evaluatedAt) {
      evaluation.evaluatedAt = new Date()
    }

    const savedEvaluation = await this.evaluationRepository.save(evaluation)

    // Actualizar progreso de la auditoría
    await this.auditsService.updateProgress(evaluation.auditId)

    return savedEvaluation
  }

  async complete(id: string): Promise<EvaluationEntity> {
    const evaluation = await this.findOne(id)

    if (!evaluation.maturityLevelId) {
      throw new NotFoundException(
        'No se puede completar la evaluación sin asignar un nivel de madurez',
      )
    }

    evaluation.isCompleted = true

    const savedEvaluation = await this.evaluationRepository.save(evaluation)

    // Actualizar progreso de la auditoría
    await this.auditsService.updateProgress(evaluation.auditId)

    return savedEvaluation
  }

  async remove(id: string): Promise<void> {
    const evaluation = await this.findOne(id)
    evaluation.isActive = false
    await this.evaluationRepository.save(evaluation)
  }

  async delete(id: string): Promise<void> {
    await this.evaluationRepository.delete(id)
  }
}

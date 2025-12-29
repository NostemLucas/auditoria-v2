import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditEntity } from '../entities/audit.entity'
import { StandardEntity } from '../../templates/entities/standard.entity'
import { MaturityLevelEntity } from '../../maturity-frameworks/entities/maturity-level.entity'

@ValidatorConstraint({ name: 'EvaluationFields', async: true })
@Injectable()
export class EvaluationFieldsValidator implements ValidatorConstraintInterface {
  constructor(
    @InjectRepository(AuditEntity)
    private readonly auditRepository: Repository<AuditEntity>,
    @InjectRepository(StandardEntity)
    private readonly standardRepository: Repository<StandardEntity>,
    @InjectRepository(MaturityLevelEntity)
    private readonly maturityLevelRepository: Repository<MaturityLevelEntity>,
  ) {}

  async validate(value: unknown, args: ValidationArguments): Promise<boolean> {
    const dto = args.object as {
      auditId: string
      standardId: string
      maturityLevelId?: string
    }

    if (!dto.auditId || !dto.standardId) {
      return false
    }

    // Obtener la auditoría
    const audit = await this.auditRepository.findOne({
      where: { id: dto.auditId },
    })

    if (!audit) {
      return false
    }

    // Validar que el standard pertenece al template de la auditoría
    const standard = await this.standardRepository.findOne({
      where: { id: dto.standardId },
    })

    if (!standard) {
      return false
    }

    if (standard.templateId !== audit.templateId) {
      return false
    }

    // Validar que el standard es auditable
    if (!standard.isAuditable) {
      return false
    }

    // Si hay maturityLevelId, validar que pertenece al framework de la auditoría
    if (dto.maturityLevelId) {
      const maturityLevel = await this.maturityLevelRepository.findOne({
        where: { id: dto.maturityLevelId },
      })

      if (!maturityLevel) {
        return false
      }

      if (maturityLevel.frameworkId !== audit.frameworkId) {
        return false
      }
    }

    return true
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  defaultMessage(_args: ValidationArguments): string {
    return 'Los campos de la evaluación no son válidos. Verifica que el standard pertenezca al template de la auditoría, sea auditable, y que el maturityLevel pertenezca al framework de la auditoría.'
  }
}

export function IsValidEvaluationFields(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: EvaluationFieldsValidator,
    })
  }
}

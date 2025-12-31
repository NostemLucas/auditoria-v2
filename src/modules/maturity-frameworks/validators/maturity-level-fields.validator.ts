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
import { FrameworkEntity, ScoringType } from '../entities/framework.entity'

@ValidatorConstraint({ name: 'MaturityLevelFields', async: true })
@Injectable()
export class MaturityLevelFieldsValidator implements ValidatorConstraintInterface {
  constructor(
    @InjectRepository(FrameworkEntity)
    private readonly frameworkRepository: Repository<FrameworkEntity>,
  ) {}

  async validate(value: unknown, args: ValidationArguments): Promise<boolean> {
    const dto = args.object as {
      frameworkId: string
      minRange?: number
      maxRange?: number
      weight?: number
      numericValue?: number
    }

    if (!dto.frameworkId) {
      return false
    }

    const framework = await this.frameworkRepository.findOne({
      where: { id: dto.frameworkId },
    })

    if (!framework) {
      return false
    }

    const { scoringType } = framework

    switch (scoringType) {
      case ScoringType.DISCRETE:
        // No debe tener minRange, maxRange, ni weight
        if (dto.minRange !== undefined || dto.maxRange !== undefined) {
          return false
        }
        if (dto.weight !== undefined) {
          return false
        }
        // numericValue debe estar entre minValue y maxValue
        if (dto.numericValue !== undefined) {
          if (
            dto.numericValue < Number(framework.minValue) ||
            dto.numericValue > Number(framework.maxValue)
          ) {
            return false
          }
        }
        break

      case ScoringType.PERCENTAGE:
        // Debe tener minRange y maxRange
        if (dto.minRange === undefined || dto.maxRange === undefined) {
          return false
        }
        // No debe tener weight
        if (dto.weight !== undefined) {
          return false
        }
        // Validar que los rangos estén entre 0 y 100
        if (dto.minRange < 0 || dto.maxRange > 100) {
          return false
        }
        if (dto.minRange >= dto.maxRange) {
          return false
        }
        break

      case ScoringType.BINARY:
        // numericValue solo puede ser 0 o 1
        if (dto.numericValue !== undefined) {
          if (dto.numericValue !== 0 && dto.numericValue !== 1) {
            return false
          }
        }
        // No debe tener minRange, maxRange, ni weight
        if (
          dto.minRange !== undefined ||
          dto.maxRange !== undefined ||
          dto.weight !== undefined
        ) {
          return false
        }
        break

      case ScoringType.WEIGHTED:
        // Debe tener weight si useWeights está activado
        if (framework.useWeights && dto.weight === undefined) {
          return false
        }
        break

      case ScoringType.CUSTOM:
        // Permite cualquier combinación
        break

      default:
        return false
    }

    return true
  }

  defaultMessage(args: ValidationArguments): string {
    const dto = args.object as { frameworkId: string }
    return `Los campos proporcionados no son válidos para el tipo de scoring del framework ${dto.frameworkId}`
  }
}

export function IsValidMaturityLevelFields(
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: MaturityLevelFieldsValidator,
    })
  }
}

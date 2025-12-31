import { PartialType } from '@nestjs/swagger'
import { CreateActionPlanDto } from './create-action-plan.dto'
import {
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import {
  ActionPlanStatus,
  VerificationResult,
} from '../entities/action-plan.entity'

export class ImplementationEvidenceDto {
  @IsString()
  @MaxLength(500)
  description: string

  @IsArray()
  @IsString({ each: true })
  files: string[]
}

export class UpdateActionPlanDto extends PartialType(CreateActionPlanDto) {
  @IsOptional()
  @IsEnum(ActionPlanStatus, { message: 'Estado del plan de acción inválido' })
  status?: ActionPlanStatus

  @IsOptional()
  @IsString()
  @MaxLength(2000, {
    message: 'La razón de rechazo no puede exceder 2000 caracteres',
  })
  rejectionReason?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImplementationEvidenceDto)
  implementationEvidence?: ImplementationEvidenceDto[]

  @IsOptional()
  @IsString()
  @MaxLength(2000, {
    message: 'Las notas de progreso no pueden exceder 2000 caracteres',
  })
  progressNotes?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000, {
    message:
      'Los comentarios de verificación no pueden exceder 2000 caracteres',
  })
  verificationComments?: string

  @IsOptional()
  @IsEnum(VerificationResult, {
    message: 'Resultado de verificación inválido',
  })
  verificationResult?: VerificationResult
}

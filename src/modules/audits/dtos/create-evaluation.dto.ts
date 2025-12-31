import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  MaxLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ComplianceStatus } from '../entities/evaluation.entity'
import { IsValidEvaluationFields } from '../validators'

export class EvidenceDto {
  @IsEnum(['document', 'photo', 'video', 'link', 'other'])
  type: 'document' | 'photo' | 'video' | 'link' | 'other'

  @IsString()
  url: string

  @IsString()
  @MaxLength(500)
  description: string
}

export class CreateEvaluationDto {
  @IsUUID('4', { message: 'El auditId debe ser un UUID válido' })
  @IsValidEvaluationFields({
    message:
      'El standard debe pertenecer al template de la auditoría y ser auditable. El maturityLevel debe pertenecer al framework de la auditoría.',
  })
  auditId: string

  @IsUUID('4', { message: 'El standardId debe ser un UUID válido' })
  standardId: string

  @IsOptional()
  @IsUUID('4', { message: 'El maturityLevelId debe ser un UUID válido' })
  maturityLevelId?: string

  @IsOptional()
  @IsUUID('4', {
    message: 'El previousEvaluationId debe ser un UUID válido',
  })
  previousEvaluationId?: string

  @IsOptional()
  @IsNumber()
  score?: number

  @IsOptional()
  @IsEnum(ComplianceStatus, { message: 'Estado de conformidad inválido' })
  complianceStatus?: ComplianceStatus

  @IsOptional()
  @IsString()
  @MaxLength(5000, {
    message: 'Las observaciones no pueden exceder 5000 caracteres',
  })
  observations?: string

  @IsOptional()
  @IsString()
  @MaxLength(5000, {
    message: 'Las recomendaciones no pueden exceder 5000 caracteres',
  })
  recommendations?: string

  @IsOptional()
  @IsString()
  @MaxLength(5000, {
    message: 'Los hallazgos no pueden exceder 5000 caracteres',
  })
  findings?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000, {
    message: 'Los comentarios no pueden exceder 2000 caracteres',
  })
  comments?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvidenceDto)
  evidence?: EvidenceDto[]

  @IsOptional()
  @IsUUID('4', { message: 'El evaluatedBy debe ser un UUID válido' })
  evaluatedBy?: string
}

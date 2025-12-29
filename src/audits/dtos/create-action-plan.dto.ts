import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator'

export class CreateActionPlanDto {
  @IsUUID('4', { message: 'El evaluationId debe ser un UUID válido' })
  evaluationId: string

  @IsString()
  @MaxLength(2000, { message: 'La acción no puede exceder 2000 caracteres' })
  action: string

  @IsOptional()
  @IsString()
  @MaxLength(2000, {
    message: 'La causa raíz no puede exceder 2000 caracteres',
  })
  rootCause?: string

  @IsUUID('4', { message: 'El responsibleId debe ser un UUID válido' })
  responsibleId: string

  @IsDateString({}, { message: 'La fecha límite debe ser una fecha válida' })
  dueDate: string

  @IsUUID('4', { message: 'El createdBy debe ser un UUID válido' })
  createdBy: string

  @IsOptional()
  @IsUUID('4', {
    message: 'El previousActionPlanId debe ser un UUID válido',
  })
  previousActionPlanId?: string
}

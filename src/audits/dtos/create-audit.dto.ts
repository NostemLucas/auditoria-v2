import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsArray,
  MinLength,
  MaxLength,
} from 'class-validator'
import { AuditType } from '../entities/audit.entity'
import { IsValidFollowUpAudit } from '../validators'

export class CreateAuditDto {
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(200, { message: 'El nombre no puede exceder 200 caracteres' })
  name: string

  @IsOptional()
  @IsString()
  @MaxLength(2000, {
    message: 'La descripción no puede exceder 2000 caracteres',
  })
  description?: string

  @IsUUID('4', { message: 'El templateId debe ser un UUID válido' })
  templateId: string

  @IsUUID('4', { message: 'El frameworkId debe ser un UUID válido' })
  frameworkId: string

  @IsEnum(AuditType, { message: 'Tipo de auditoría inválido' })
  @IsValidFollowUpAudit({
    message:
      'Para auditorías de seguimiento, debe proporcionar un parentAuditId válido de una auditoría completada con el mismo template y framework',
  })
  auditType: AuditType

  @IsOptional()
  @IsUUID('4', {
    message: 'El parentAuditId debe ser un UUID válido',
  })
  parentAuditId?: string

  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida' })
  startDate: string

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha válida' })
  endDate?: string

  @IsUUID('4', { message: 'El organizationId debe ser un UUID válido' })
  organizationId: string

  @IsUUID('4', { message: 'El leadAuditorId debe ser un UUID válido' })
  leadAuditorId: string

  @IsOptional()
  @IsArray({ message: 'El auditTeamIds debe ser un array' })
  @IsUUID('4', {
    each: true,
    message: 'Cada ID del equipo debe ser un UUID válido',
  })
  auditTeamIds?: string[]

  @IsOptional()
  @IsUUID('4', { message: 'El approverId debe ser un UUID válido' })
  approverId?: string
}

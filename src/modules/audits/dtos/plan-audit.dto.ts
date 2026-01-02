import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsArray,
  IsDateString,
  IsOptional,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class PlanAuditDto {
  @ApiProperty({
    description: 'ID del lead auditor (auditor líder)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  leadAuditorId: string

  @ApiProperty({
    description: 'IDs de los auditores del equipo',
    example: [
      '123e4567-e89b-12d3-a456-426614174001',
      '123e4567-e89b-12d3-a456-426614174002',
    ],
    type: [String],
  })
  @IsNotEmpty()
  @IsArray()
  @IsUUID('4', { each: true })
  auditorIds: string[]

  @ApiProperty({
    description: 'Fecha de inicio programada (ISO 8601)',
    example: '2025-01-15',
  })
  @IsNotEmpty()
  @IsDateString()
  scheduledStartDate: string

  @ApiProperty({
    description: 'Fecha de fin programada (ISO 8601)',
    example: '2025-01-30',
  })
  @IsNotEmpty()
  @IsDateString()
  scheduledEndDate: string

  @ApiProperty({
    description: 'Alcance de la auditoría (qué se va a auditar)',
    example:
      'Auditoría de cumplimiento ISO 27001 - Controles de seguridad de la información',
  })
  @IsNotEmpty()
  @IsString()
  scope: string

  @ApiProperty({
    description: 'ID de la organización (opcional, si necesita cambiar)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string
}

import {
  IsEnum,
  IsUUID,
  IsOptional,
  IsObject,
  IsString,
  IsIn,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ReportType } from '../entities/report.entity'

export class GenerateReportDto {
  @ApiProperty({
    description: 'Tipo de reporte a generar',
    enum: ReportType,
    example: ReportType.AUDIT_REPORT,
  })
  @IsEnum(ReportType)
  reportType: ReportType

  @ApiPropertyOptional({
    description: 'ID de la auditoría (requerido para reportes de auditoría)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4')
  auditId?: string

  @ApiPropertyOptional({
    description: 'Metadata adicional para el reporte',
    example: { includeEvidence: true, includeCharts: false },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>

  @ApiPropertyOptional({
    description:
      'Tema de diseño para el documento (default, corporate_green, minimal)',
    example: 'default',
    enum: ['default', 'corporate_green', 'minimal'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['default', 'corporate_green', 'minimal'])
  theme?: string
}

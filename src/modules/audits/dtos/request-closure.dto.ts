import { IsOptional, IsString, IsUrl } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class RequestClosureDto {
  @ApiProperty({
    description: 'URL del reporte preliminar de auditoría',
    example: 'https://storage.example.com/audits/reports/audit-2025-001.pdf',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  reportUrl?: string
}

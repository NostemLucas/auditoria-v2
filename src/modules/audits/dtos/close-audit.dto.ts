import { IsOptional, IsString, IsUrl } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CloseAuditDto {
  @ApiProperty({
    description: 'URL del reporte final de auditoría',
    example:
      'https://storage.example.com/audits/reports/audit-2025-001-final.pdf',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  reportUrl?: string
}

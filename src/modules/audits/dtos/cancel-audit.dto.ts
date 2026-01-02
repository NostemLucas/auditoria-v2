import { IsNotEmpty, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CancelAuditDto {
  @ApiProperty({
    description: 'Razón de cancelación de la auditoría',
    example:
      'Cambios en los requisitos del cliente. Se reprogramará para el próximo trimestre.',
  })
  @IsNotEmpty()
  @IsString()
  cancellationReason: string
}

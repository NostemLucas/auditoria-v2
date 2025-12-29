import { PartialType } from '@nestjs/swagger'
import { CreateAuditDto } from './create-audit.dto'
import { IsEnum, IsOptional } from 'class-validator'
import { AuditStatus } from '../entities/audit.entity'

export class UpdateAuditDto extends PartialType(CreateAuditDto) {
  @IsOptional()
  @IsEnum(AuditStatus, { message: 'Estado de auditoría inválido' })
  status?: AuditStatus
}

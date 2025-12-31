import { PartialType } from '@nestjs/swagger'
import { CreateEvaluationDto } from './create-evaluation.dto'
import { IsBoolean, IsOptional } from 'class-validator'

export class UpdateEvaluationDto extends PartialType(CreateEvaluationDto) {
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean
}

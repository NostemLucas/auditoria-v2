import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator'
import { FrameworkType, ScoringType } from '../entities/framework.entity'

export class UpdateFrameworkDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000, {
    message: 'La descripción no puede exceder 2000 caracteres',
  })
  description?: string

  @IsOptional()
  @IsEnum(FrameworkType, {
    message: 'Tipo de framework inválido',
  })
  frameworkType?: FrameworkType

  @IsOptional()
  @IsEnum(ScoringType, {
    message: 'Tipo de puntuación inválido',
  })
  scoringType?: ScoringType

  @IsOptional()
  @IsNumber({}, { message: 'El valor mínimo debe ser un número' })
  @Min(0, { message: 'El valor mínimo no puede ser negativo' })
  minValue?: number

  @IsOptional()
  @IsNumber({}, { message: 'El valor máximo debe ser un número' })
  @Min(0, { message: 'El valor máximo no puede ser negativo' })
  @Max(1000, { message: 'El valor máximo no puede exceder 1000' })
  maxValue?: number

  @IsOptional()
  @IsBoolean()
  allowDecimals?: boolean

  @IsOptional()
  @IsBoolean()
  useWeights?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'La versión no puede exceder 20 caracteres' })
  version?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000, {
    message: 'La metodología no puede exceder 2000 caracteres',
  })
  methodology?: string

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'El autor no puede exceder 100 caracteres' })
  author?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

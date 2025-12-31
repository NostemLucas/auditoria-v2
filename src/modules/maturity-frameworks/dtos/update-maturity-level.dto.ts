import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsNumber,
  IsArray,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator'

export class UpdateMaturityLevelDto {
  @IsOptional()
  @IsUUID('4', { message: 'El frameworkId debe ser un UUID válido' })
  frameworkId?: string

  @IsOptional()
  @IsNumber({}, { message: 'El valor numérico debe ser un número' })
  numericValue?: number

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El displayValue debe tener al menos 1 caracter' })
  @MaxLength(50, {
    message: 'El displayValue no puede exceder 50 caracteres',
  })
  displayValue?: string

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(200, { message: 'El nombre no puede exceder 200 caracteres' })
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El shortName no puede exceder 50 caracteres' })
  shortName?: string

  @IsOptional()
  @IsNumber({}, { message: 'El minRange debe ser un número' })
  @Min(0)
  minRange?: number

  @IsOptional()
  @IsNumber({}, { message: 'El maxRange debe ser un número' })
  @Min(0)
  maxRange?: number

  @IsOptional()
  @IsNumber({}, { message: 'El weight debe ser un número' })
  @Min(0)
  @Max(1)
  weight?: number

  @IsOptional()
  @IsNumber({}, { message: 'El score debe ser un número' })
  @Min(0)
  score?: number

  // ========== TEXTOS BASE PREDEFINIDOS ==========

  @IsOptional()
  @IsString()
  @MaxLength(5000, {
    message: 'La descripción no puede exceder 5000 caracteres',
  })
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(5000, {
    message: 'Las observaciones no pueden exceder 5000 caracteres',
  })
  observations?: string

  @IsOptional()
  @IsString()
  @MaxLength(5000, {
    message: 'Las recomendaciones no pueden exceder 5000 caracteres',
  })
  recommendations?: string

  @IsOptional()
  @IsString()
  @MaxLength(5000, {
    message: 'Los criterios no pueden exceder 5000 caracteres',
  })
  criteria?: string

  @IsOptional()
  @IsString()
  @MaxLength(5000, {
    message: 'La guía de implementación no puede exceder 5000 caracteres',
  })
  implementationGuidance?: string

  @IsOptional()
  @IsArray({ message: 'requiredEvidence debe ser un array' })
  @IsString({ each: true, message: 'Cada evidencia debe ser un string' })
  requiredEvidence?: string[]

  @IsOptional()
  @IsString()
  @MaxLength(5000, {
    message: 'Las acciones sugeridas no pueden exceder 5000 caracteres',
  })
  suggestedActions?: string

  // ========== FIN TEXTOS BASE ==========

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'El color no puede exceder 20 caracteres' })
  color?: string

  @IsOptional()
  @IsString()
  @MaxLength(10, { message: 'El ícono no puede exceder 10 caracteres' })
  icon?: string

  @IsOptional()
  @IsNumber({}, { message: 'El orden debe ser un número' })
  @Min(0, { message: 'El orden debe ser mayor o igual a 0' })
  order?: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  Min,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

/**
 * DTO para un peso individual de estándar
 */
export class StandardWeightItemDto {
  @ApiProperty({
    description: 'ID del estándar a ponderar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  standardId: string

  @ApiProperty({
    description:
      'Peso asignado (mayor peso = mayor importancia en el score final)',
    example: 1.5,
    minimum: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  weight: number

  @ApiProperty({
    description:
      'Justificación del peso asignado (recomendado para auditorías)',
    example:
      'Crítico para cumplimiento regulatorio del sector financiero - Regulación SBS',
    required: false,
  })
  @IsOptional()
  @IsString()
  justification?: string

  @ApiProperty({
    description: 'Categoría para agrupación en gráficas radiales',
    example: 'Seguridad de la Información',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string

  @ApiProperty({
    description: 'Orden de visualización en reportes',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  displayOrder?: number
}

/**
 * DTO para configurar todos los pesos de una auditoría
 */
export class ConfigureAuditWeightsDto {
  @ApiProperty({
    description: 'Lista de pesos para cada estándar evaluado en la auditoría',
    type: [StandardWeightItemDto],
    example: [
      {
        standardId: '123e4567-e89b-12d3-a456-426614174000',
        weight: 2.0,
        justification: 'Muy importante para sector bancario',
        category: 'Seguridad de la Información',
        displayOrder: 1,
      },
      {
        standardId: '123e4567-e89b-12d3-a456-426614174001',
        weight: 1.5,
        justification: 'Alta prioridad - cumplimiento SOX',
        category: 'Organización de Seguridad',
        displayOrder: 2,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StandardWeightItemDto)
  weights: StandardWeightItemDto[]

  @ApiProperty({
    description:
      'Modo de normalización de pesos. Auto ajusta proporciones automáticamente.',
    example: 'auto',
    enum: ['auto', 'manual'],
    required: false,
    default: 'auto',
  })
  @IsOptional()
  @IsEnum(['auto', 'manual'])
  normalizationMode?: 'auto' | 'manual'
}

/**
 * DTO para copiar pesos desde una fuente existente
 */
export class CopyWeightsDto {
  @ApiProperty({
    description: 'Fuente de los pesos a copiar',
    enum: ['template', 'previous_audit'],
    example: 'template',
  })
  @IsNotEmpty()
  @IsEnum(['template', 'previous_audit'])
  source: 'template' | 'previous_audit'

  @ApiProperty({
    description:
      'ID de la auditoría origen (requerido si source = previous_audit)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  sourceAuditId?: string

  @ApiProperty({
    description:
      'Factor de ajuste para los pesos copiados (1.0 = sin cambios, 1.5 = aumentar 50%, 0.8 = reducir 20%)',
    example: 1.0,
    minimum: 0.1,
    required: false,
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  adjustmentFactor?: number
}

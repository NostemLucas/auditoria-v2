import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { EvaluationsService } from '../services/evaluations.service'
import { CreateEvaluationDto, UpdateEvaluationDto } from '../dtos'

@ApiTags('evaluations')
@Controller('evaluations')
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una nueva evaluación' })
  @ApiResponse({ status: 201, description: 'Evaluación creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() createEvaluationDto: CreateEvaluationDto) {
    return await this.evaluationsService.create(createEvaluationDto)
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las evaluaciones' })
  @ApiResponse({ status: 200, description: 'Lista de evaluaciones' })
  @ApiQuery({
    name: 'auditId',
    required: false,
    type: String,
    description: 'Filtrar por ID de auditoría',
  })
  @ApiQuery({
    name: 'standardId',
    required: false,
    type: String,
    description: 'Filtrar por ID de norma',
  })
  async findAll(
    @Query('auditId') auditId?: string,
    @Query('standardId') standardId?: string,
  ) {
    if (auditId) {
      return await this.evaluationsService.findByAudit(auditId)
    }

    if (standardId) {
      return await this.evaluationsService.findByStandard(standardId)
    }

    return await this.evaluationsService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una evaluación por ID' })
  @ApiResponse({ status: 200, description: 'Evaluación encontrada' })
  @ApiResponse({ status: 404, description: 'Evaluación no encontrada' })
  async findOne(@Param('id') id: string) {
    return await this.evaluationsService.findOne(id)
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar una evaluación',
    description:
      'Al asignar un maturityLevel, se copian automáticamente el score y los textos predefinidos',
  })
  @ApiResponse({
    status: 200,
    description: 'Evaluación actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Evaluación no encontrada' })
  async update(
    @Param('id') id: string,
    @Body() updateEvaluationDto: UpdateEvaluationDto,
  ) {
    return await this.evaluationsService.update(id, updateEvaluationDto)
  }

  @Patch(':id/complete')
  @ApiOperation({
    summary: 'Completar una evaluación',
    description:
      'Marca la evaluación como completada y actualiza el progreso de la auditoría',
  })
  @ApiResponse({
    status: 200,
    description: 'Evaluación completada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Debe asignar un nivel de madurez antes de completar',
  })
  @ApiResponse({ status: 404, description: 'Evaluación no encontrada' })
  async complete(@Param('id') id: string) {
    return await this.evaluationsService.complete(id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desactivar una evaluación' })
  @ApiResponse({
    status: 204,
    description: 'Evaluación desactivada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Evaluación no encontrada' })
  async remove(@Param('id') id: string) {
    await this.evaluationsService.remove(id)
  }
}

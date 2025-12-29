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
import { ActionPlansService } from '../services/action-plans.service'
import { CreateActionPlanDto, UpdateActionPlanDto } from '../dtos'
import {
  ActionPlanStatus,
  VerificationResult,
} from '../entities/action-plan.entity'

@ApiTags('action-plans')
@Controller('action-plans')
export class ActionPlansController {
  constructor(private readonly actionPlansService: ActionPlansService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear un nuevo plan de acción',
    description: 'Creado por el auditado para remediar una no conformidad',
  })
  @ApiResponse({
    status: 201,
    description: 'Plan de acción creado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() createActionPlanDto: CreateActionPlanDto) {
    return await this.actionPlansService.create(createActionPlanDto)
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los planes de acción' })
  @ApiResponse({ status: 200, description: 'Lista de planes de acción' })
  @ApiQuery({
    name: 'evaluationId',
    required: false,
    type: String,
    description: 'Filtrar por ID de evaluación',
  })
  @ApiQuery({
    name: 'responsibleId',
    required: false,
    type: String,
    description: 'Filtrar por ID de responsable',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ActionPlanStatus,
    description: 'Filtrar por estado',
  })
  async findAll(
    @Query('evaluationId') evaluationId?: string,
    @Query('responsibleId') responsibleId?: string,
    @Query('status') status?: ActionPlanStatus,
  ) {
    if (evaluationId) {
      return await this.actionPlansService.findByEvaluation(evaluationId)
    }

    if (responsibleId) {
      return await this.actionPlansService.findByResponsible(responsibleId)
    }

    if (status) {
      return await this.actionPlansService.findByStatus(status)
    }

    return await this.actionPlansService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un plan de acción por ID' })
  @ApiResponse({ status: 200, description: 'Plan de acción encontrado' })
  @ApiResponse({ status: 404, description: 'Plan de acción no encontrado' })
  async findOne(@Param('id') id: string) {
    return await this.actionPlansService.findOne(id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un plan de acción' })
  @ApiResponse({
    status: 200,
    description: 'Plan de acción actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Plan de acción no encontrado' })
  async update(
    @Param('id') id: string,
    @Body() updateActionPlanDto: UpdateActionPlanDto,
  ) {
    return await this.actionPlansService.update(id, updateActionPlanDto)
  }

  @Patch(':id/submit')
  @ApiOperation({
    summary: 'Enviar plan a aprobación',
    description: 'El auditado envía el plan al auditor para aprobación',
  })
  @ApiResponse({
    status: 200,
    description: 'Plan enviado a aprobación exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Solo se pueden enviar planes en estado borrador',
  })
  async submitForApproval(@Param('id') id: string) {
    return await this.actionPlansService.submitForApproval(id)
  }

  @Patch(':id/approve')
  @ApiOperation({
    summary: 'Aprobar plan de acción',
    description: 'El auditor aprueba el plan propuesto por el auditado',
  })
  @ApiResponse({ status: 200, description: 'Plan aprobado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Solo se pueden aprobar planes pendientes de aprobación',
  })
  async approve(
    @Param('id') id: string,
    @Body('approverId') approverId: string,
  ) {
    return await this.actionPlansService.approve(id, approverId)
  }

  @Patch(':id/reject')
  @ApiOperation({
    summary: 'Rechazar plan de acción',
    description: 'El auditor rechaza el plan y solicita ajustes',
  })
  @ApiResponse({ status: 200, description: 'Plan rechazado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Solo se pueden rechazar planes pendientes de aprobación',
  })
  async reject(
    @Param('id') id: string,
    @Body('approverId') approverId: string,
    @Body('reason') reason: string,
  ) {
    return await this.actionPlansService.reject(id, approverId, reason)
  }

  @Patch(':id/start')
  @ApiOperation({
    summary: 'Iniciar implementación',
    description: 'El auditado inicia la implementación del plan aprobado',
  })
  @ApiResponse({
    status: 200,
    description: 'Implementación iniciada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Solo se pueden iniciar planes aprobados',
  })
  async startImplementation(@Param('id') id: string) {
    return await this.actionPlansService.startImplementation(id)
  }

  @Patch(':id/complete')
  @ApiOperation({
    summary: 'Marcar como completado',
    description:
      'El auditado marca el plan como completado (requiere evidencias)',
  })
  @ApiResponse({ status: 200, description: 'Plan completado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Debe subir evidencias antes de completar',
  })
  async markAsCompleted(@Param('id') id: string) {
    return await this.actionPlansService.markAsCompleted(id)
  }

  @Patch(':id/verify')
  @ApiOperation({
    summary: 'Verificar plan en auditoría de seguimiento',
    description: 'El auditor verifica si el plan se cumplió correctamente',
  })
  @ApiResponse({ status: 200, description: 'Plan verificado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Solo se pueden verificar planes completados',
  })
  async verify(
    @Param('id') id: string,
    @Body('verifierId') verifierId: string,
    @Body('result') result: VerificationResult,
    @Body('comments') comments?: string,
  ) {
    return await this.actionPlansService.verify(
      id,
      verifierId,
      result,
      comments,
    )
  }

  @Patch(':id/close')
  @ApiOperation({
    summary: 'Cerrar plan de acción',
    description: 'Cierra definitivamente un plan verificado',
  })
  @ApiResponse({ status: 200, description: 'Plan cerrado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Solo se pueden cerrar planes verificados',
  })
  async close(@Param('id') id: string) {
    return await this.actionPlansService.close(id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desactivar un plan de acción' })
  @ApiResponse({
    status: 204,
    description: 'Plan de acción desactivado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Plan de acción no encontrado' })
  async remove(@Param('id') id: string) {
    await this.actionPlansService.remove(id)
  }
}

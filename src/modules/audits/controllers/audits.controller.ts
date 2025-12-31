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
import { AuditsService } from '../services/audits.service'
import { CreateAuditDto, UpdateAuditDto } from '../dtos'

@ApiTags('audits')
@Controller('audits')
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear una nueva auditoría',
    description:
      'Crea una auditoría y genera automáticamente las evaluaciones según el tipo (inicial: todas las normas, seguimiento: solo no conformidades del padre)',
  })
  @ApiResponse({
    status: 201,
    description: 'Auditoría creada exitosamente con evaluaciones generadas',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() createAuditDto: CreateAuditDto) {
    return await this.auditsService.create(createAuditDto)
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las auditorías' })
  @ApiResponse({ status: 200, description: 'Lista de auditorías' })
  @ApiQuery({
    name: 'templateId',
    required: false,
    type: String,
    description: 'Filtrar por ID de plantilla',
  })
  @ApiQuery({
    name: 'frameworkId',
    required: false,
    type: String,
    description: 'Filtrar por ID de framework',
  })
  @ApiQuery({
    name: 'auditorId',
    required: false,
    type: String,
    description: 'Filtrar por ID de auditor (lead o miembro del equipo)',
  })
  @ApiQuery({
    name: 'organizationId',
    required: false,
    type: String,
    description: 'Filtrar por ID de organización auditada',
  })
  async findAll(
    @Query('templateId') templateId?: string,
    @Query('frameworkId') frameworkId?: string,
    @Query('auditorId') auditorId?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    if (templateId) {
      return await this.auditsService.findByTemplate(templateId)
    }

    if (frameworkId) {
      return await this.auditsService.findByFramework(frameworkId)
    }

    if (auditorId) {
      return await this.auditsService.findByAuditor(auditorId)
    }

    if (organizationId) {
      return await this.auditsService.findByOrganization(organizationId)
    }

    return await this.auditsService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una auditoría por ID' })
  @ApiResponse({ status: 200, description: 'Auditoría encontrada' })
  @ApiResponse({ status: 404, description: 'Auditoría no encontrada' })
  async findOne(@Param('id') id: string) {
    return await this.auditsService.findOne(id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una auditoría' })
  @ApiResponse({
    status: 200,
    description: 'Auditoría actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Auditoría no encontrada' })
  async update(
    @Param('id') id: string,
    @Body() updateAuditDto: UpdateAuditDto,
  ) {
    return await this.auditsService.update(id, updateAuditDto)
  }

  @Patch(':id/complete')
  @ApiOperation({
    summary: 'Completar una auditoría',
    description:
      'Marca la auditoría como completada. Requiere que todas las evaluaciones estén completadas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Auditoría completada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede completar. Hay evaluaciones pendientes',
  })
  @ApiResponse({ status: 404, description: 'Auditoría no encontrada' })
  async complete(@Param('id') id: string) {
    return await this.auditsService.complete(id)
  }

  @Patch(':id/approve')
  @ApiOperation({
    summary: 'Aprobar una auditoría',
    description: 'Aprueba una auditoría completada',
  })
  @ApiResponse({ status: 200, description: 'Auditoría aprobada exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Solo se pueden aprobar auditorías completadas',
  })
  @ApiResponse({ status: 404, description: 'Auditoría no encontrada' })
  async approve(
    @Param('id') id: string,
    @Body('approverId') approverId: string,
  ) {
    return await this.auditsService.approve(id, approverId)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desactivar una auditoría' })
  @ApiResponse({
    status: 204,
    description: 'Auditoría desactivada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Auditoría no encontrada' })
  async remove(@Param('id') id: string) {
    await this.auditsService.remove(id)
  }
}

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
import { CurrentUser } from '@auth/decorators/current-user.decorator'
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { AuditsService } from '../services/audits.service'
import {
  CreateAuditDto,
  UpdateAuditDto,
  PlanAuditDto,
  RequestClosureDto,
  CloseAuditDto,
  CancelAuditDto,
  ConfigureAuditWeightsDto,
  CopyWeightsDto,
} from '../dtos'
import {
  PlanAuditHandler,
  StartAuditHandler,
  RequestClosureHandler,
  ApproveClosureHandler,
  CloseAuditHandler,
  CancelAuditHandler,
  ConfigureWeightsHandler,
  CopyWeightsHandler,
  PlanAuditCommand,
  StartAuditCommand,
  RequestClosureCommand,
  ApproveClosureCommand,
  CloseAuditCommand,
  CancelAuditCommand,
  ConfigureWeightsCommand,
  CopyWeightsCommand,
} from '../use-cases'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditStandardWeightEntity } from '../entities/audit-standard-weight.entity'

@ApiTags('audits')
@Controller('audits')
export class AuditsController {
  constructor(
    private readonly auditsService: AuditsService,
    private readonly planAuditHandler: PlanAuditHandler,
    private readonly startAuditHandler: StartAuditHandler,
    private readonly requestClosureHandler: RequestClosureHandler,
    private readonly approveClosureHandler: ApproveClosureHandler,
    private readonly closeAuditHandler: CloseAuditHandler,
    private readonly cancelAuditHandler: CancelAuditHandler,
    private readonly configureWeightsHandler: ConfigureWeightsHandler,
    private readonly copyWeightsHandler: CopyWeightsHandler,
    @InjectRepository(AuditStandardWeightEntity)
    private readonly weightsRepository: Repository<AuditStandardWeightEntity>,
  ) {}

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

  // ==================== NUEVOS ENDPOINTS DEL CICLO DE VIDA ====================

  @Post(':id/plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Planificar una auditoría (DRAFT → PLANNED)',
    description:
      'Asigna equipo auditor, fechas y alcance. Cambia el estado de DRAFT a PLANNED.',
  })
  @ApiResponse({
    status: 200,
    description: 'Auditoría planificada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Validación fallida o estado incorrecto',
  })
  @ApiResponse({ status: 403, description: 'Sin permisos' })
  @ApiResponse({ status: 404, description: 'Auditoría no encontrada' })
  async planAudit(
    @Param('id') auditId: string,
    @Body() planAuditDto: PlanAuditDto,
  ) {
    const command = new PlanAuditCommand(
      auditId,
      planAuditDto.leadAuditorId,
      planAuditDto.auditorIds,
      new Date(planAuditDto.scheduledStartDate),
      new Date(planAuditDto.scheduledEndDate),
      planAuditDto.scope,
      planAuditDto.organizationId,
    )
    return await this.planAuditHandler.execute(command)
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar una auditoría (PLANNED → IN_PROGRESS)',
    description:
      'Inicia una auditoría planificada. Solo el lead auditor puede iniciar.',
  })
  @ApiResponse({ status: 200, description: 'Auditoría iniciada exitosamente' })
  @ApiResponse({ status: 400, description: 'Estado incorrecto' })
  @ApiResponse({
    status: 403,
    description: 'Solo el lead auditor puede iniciar',
  })
  @ApiResponse({ status: 404, description: 'Auditoría no encontrada' })
  async startAudit(
    @Param('id') auditId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const command = new StartAuditCommand(auditId, userId)
    return await this.startAuditHandler.execute(command)
  }

  @Post(':id/request-closure')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicitar cierre de auditoría (IN_PROGRESS → PENDING_CLOSURE)',
    description:
      'Solicita el cierre de una auditoría. Ejecuta validaciones de cierre. Solo el lead auditor puede solicitar.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Solicitud de cierre exitosa. Auditoría en estado PENDING_CLOSURE',
  })
  @ApiResponse({
    status: 400,
    description: 'Validaciones de cierre fallidas o estado incorrecto',
  })
  @ApiResponse({
    status: 403,
    description: 'Solo el lead auditor puede solicitar cierre',
  })
  @ApiResponse({ status: 404, description: 'Auditoría no encontrada' })
  async requestClosure(
    @Param('id') auditId: string,
    @Body() requestClosureDto: RequestClosureDto,
    @CurrentUser('sub') userId: string,
  ) {
    const command = new RequestClosureCommand(
      auditId,
      userId,
      requestClosureDto.reportUrl,
    )
    return await this.requestClosureHandler.execute(command)
  }

  @Post(':id/approve-closure')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Aprobar cierre de auditoría (PENDING_CLOSURE)',
    description:
      'Aprueba el cierre de una auditoría en PENDING_CLOSURE. Paso previo al cierre definitivo.',
  })
  @ApiResponse({ status: 200, description: 'Cierre aprobado exitosamente' })
  @ApiResponse({ status: 400, description: 'Estado incorrecto' })
  @ApiResponse({
    status: 403,
    description: 'Solo el lead auditor puede aprobar',
  })
  @ApiResponse({ status: 404, description: 'Auditoría no encontrada' })
  async approveClosure(
    @Param('id') auditId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const command = new ApproveClosureCommand(auditId, userId)
    return await this.approveClosureHandler.execute(command)
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cerrar definitivamente una auditoría (PENDING_CLOSURE → CLOSED)',
    description:
      'Cierra definitivamente una auditoría. Ejecuta todas las validaciones y genera metadatos finales. Requiere aprobación previa.',
  })
  @ApiResponse({
    status: 200,
    description: 'Auditoría cerrada exitosamente con metadatos completos',
  })
  @ApiResponse({
    status: 400,
    description: 'Validaciones fallidas, falta aprobación o estado incorrecto',
  })
  @ApiResponse({
    status: 403,
    description: 'Solo el lead auditor puede cerrar',
  })
  @ApiResponse({ status: 404, description: 'Auditoría no encontrada' })
  async closeAudit(
    @Param('id') auditId: string,
    @Body() closeAuditDto: CloseAuditDto,
    @CurrentUser('sub') userId: string,
  ) {
    const command = new CloseAuditCommand(
      auditId,
      userId,
      closeAuditDto.reportUrl,
    )
    return await this.closeAuditHandler.execute(command)
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancelar una auditoría (Cualquier estado → CANCELLED)',
    description:
      'Cancela una auditoría en cualquier estado (excepto CLOSED). Solo el lead auditor puede cancelar.',
  })
  @ApiResponse({ status: 200, description: 'Auditoría cancelada exitosamente' })
  @ApiResponse({
    status: 400,
    description:
      'No se puede cancelar (ya cerrada o ya cancelada) o falta razón',
  })
  @ApiResponse({
    status: 403,
    description: 'Solo el lead auditor puede cancelar',
  })
  @ApiResponse({ status: 404, description: 'Auditoría no encontrada' })
  async cancelAudit(
    @Param('id') auditId: string,
    @Body() cancelAuditDto: CancelAuditDto,
    @CurrentUser('sub') userId: string,
  ) {
    const command = new CancelAuditCommand(
      auditId,
      userId,
      cancelAuditDto.cancellationReason,
    )
    return await this.cancelAuditHandler.execute(command)
  }

  // ============================================================
  // WEIGHTS MANAGEMENT ENDPOINTS
  // ============================================================

  @Get(':id/weights')
  @ApiOperation({
    summary: 'Obtener pesos configurados de una auditoría',
    description:
      'Retorna los pesos asignados a cada estándar de la auditoría. Si no hay pesos configurados, retorna array vacío.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Pesos de la auditoría (puede estar vacío si no hay configurados)',
  })
  @ApiResponse({ status: 404, description: 'Auditoría no encontrada' })
  async getAuditWeights(@Param('id') auditId: string) {
    const weights = await this.weightsRepository.find({
      where: { auditId },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    })
    return weights
  }

  @Post(':id/weights')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Configurar pesos de estándares para una auditoría',
    description:
      'Permite al Lead Auditor asignar ponderaciones específicas a cada estándar según las prioridades de la organización auditada. Solo disponible en estados DRAFT o PLANNED.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pesos configurados exitosamente',
  })
  @ApiResponse({
    status: 400,
    description:
      'Datos inválidos, estado incorrecto, o faltan pesos para algunos estándares',
  })
  @ApiResponse({
    status: 403,
    description: 'Solo el lead auditor puede configurar pesos',
  })
  @ApiResponse({ status: 404, description: 'Auditoría no encontrada' })
  async configureWeights(
    @Param('id') auditId: string,
    @Body() configureWeightsDto: ConfigureAuditWeightsDto,
    @CurrentUser('sub') userId: string,
  ) {
    const command = new ConfigureWeightsCommand(
      auditId,
      configureWeightsDto.weights,
      userId,
      configureWeightsDto.normalizationMode || 'auto',
    )
    return await this.configureWeightsHandler.execute(command)
  }

  @Post(':id/weights/copy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Copiar pesos desde una plantilla o auditoría previa',
    description:
      'Facilita la configuración de pesos reutilizando configuraciones previas. Permite copiar desde la plantilla de la auditoría o desde una auditoría previa. Opcionalmente puede aplicar un factor de ajuste.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pesos copiados y configurados exitosamente',
  })
  @ApiResponse({
    status: 400,
    description:
      'Fuente inválida, sin pesos configurados, o sin estándares coincidentes',
  })
  @ApiResponse({
    status: 403,
    description: 'Solo el lead auditor puede configurar pesos',
  })
  @ApiResponse({ status: 404, description: 'Auditoría no encontrada' })
  async copyWeights(
    @Param('id') auditId: string,
    @Body() copyWeightsDto: CopyWeightsDto,
    @CurrentUser('sub') userId: string,
  ) {
    const command = new CopyWeightsCommand(
      auditId,
      copyWeightsDto.source,
      userId,
      copyWeightsDto.sourceAuditId,
      copyWeightsDto.adjustmentFactor || 1.0,
    )
    return await this.copyWeightsHandler.execute(command)
  }
}

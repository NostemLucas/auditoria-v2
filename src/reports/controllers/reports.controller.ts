import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { ReportsService } from '../services/reports.service'
import { GenerateReportDto, ShareReportDto, ShareRole } from '../dtos'

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Generar un nuevo reporte',
    description:
      'Genera un reporte en Google Docs. El proceso es asíncrono. El reporte estará disponible cuando el status sea "completed".',
  })
  @ApiResponse({
    status: 202,
    description:
      'Reporte en proceso de generación. Consultar estado con GET /reports/:id',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async generate(
    @Body() generateReportDto: GenerateReportDto,
    // TODO: Obtener userId del token JWT cuando implementes autenticación
    // @CurrentUser() user: User
  ) {
    // Temporalmente usar un ID hardcoded
    const userId = '00000000-0000-0000-0000-000000000000'

    return await this.reportsService.generateReport(generateReportDto, userId)
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los reportes' })
  @ApiResponse({ status: 200, description: 'Lista de reportes' })
  async findAll() {
    return await this.reportsService.findAll()
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un reporte por ID',
    description:
      'Retorna la información del reporte incluyendo el URL del documento de Google Docs',
  })
  @ApiResponse({ status: 200, description: 'Reporte encontrado' })
  @ApiResponse({ status: 404, description: 'Reporte no encontrado' })
  async findOne(@Param('id') id: string) {
    return await this.reportsService.findOne(id)
  }

  @Post(':id/share')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Compartir un reporte',
    description: 'Comparte el documento de Google Docs con un usuario',
  })
  @ApiResponse({ status: 200, description: 'Reporte compartido exitosamente' })
  @ApiResponse({ status: 404, description: 'Reporte no encontrado' })
  @ApiResponse({
    status: 400,
    description: 'El reporte aún no ha sido generado',
  })
  async share(@Param('id') id: string, @Body() shareReportDto: ShareReportDto) {
    const role = shareReportDto.role || ShareRole.READER

    await this.reportsService.shareReport(id, shareReportDto.email, role)

    return {
      message: `Reporte compartido con ${shareReportDto.email} como ${role}`,
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar un reporte',
    description:
      'Desactiva el reporte y elimina el documento de Google Docs asociado',
  })
  @ApiResponse({ status: 204, description: 'Reporte eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Reporte no encontrado' })
  async remove(@Param('id') id: string) {
    await this.reportsService.remove(id)
  }
}

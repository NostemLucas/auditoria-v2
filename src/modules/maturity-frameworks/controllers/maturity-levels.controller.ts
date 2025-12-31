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
import { MaturityLevelsService } from '../services/maturity-levels.service'
import { CreateMaturityLevelDto, UpdateMaturityLevelDto } from '../dtos'

@ApiTags('maturity-levels')
@Controller('maturity-levels')
export class MaturityLevelsController {
  constructor(private readonly maturityLevelsService: MaturityLevelsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo nivel de madurez' })
  @ApiResponse({
    status: 201,
    description: 'Nivel de madurez creado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() createMaturityLevelDto: CreateMaturityLevelDto) {
    return await this.maturityLevelsService.create(createMaturityLevelDto)
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los niveles de madurez' })
  @ApiResponse({ status: 200, description: 'Lista de niveles de madurez' })
  @ApiQuery({
    name: 'frameworkId',
    required: false,
    type: String,
    description: 'Filtrar por ID de framework',
  })
  async findAll(@Query('frameworkId') frameworkId?: string) {
    if (frameworkId) {
      return await this.maturityLevelsService.findByFramework(frameworkId)
    }

    return await this.maturityLevelsService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un nivel de madurez por ID' })
  @ApiResponse({ status: 200, description: 'Nivel de madurez encontrado' })
  @ApiResponse({ status: 404, description: 'Nivel de madurez no encontrado' })
  async findOne(@Param('id') id: string) {
    return await this.maturityLevelsService.findOne(id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un nivel de madurez' })
  @ApiResponse({
    status: 200,
    description: 'Nivel de madurez actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Nivel de madurez no encontrado' })
  async update(
    @Param('id') id: string,
    @Body() updateMaturityLevelDto: UpdateMaturityLevelDto,
  ) {
    return await this.maturityLevelsService.update(id, updateMaturityLevelDto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un nivel de madurez' })
  @ApiResponse({
    status: 204,
    description: 'Nivel de madurez eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Nivel de madurez no encontrado' })
  async remove(@Param('id') id: string) {
    await this.maturityLevelsService.remove(id)
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desactivar un nivel de madurez' })
  @ApiResponse({
    status: 200,
    description: 'Nivel de madurez desactivado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Nivel de madurez no encontrado' })
  async deactivate(@Param('id') id: string) {
    return await this.maturityLevelsService.deactivate(id)
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activar un nivel de madurez' })
  @ApiResponse({
    status: 200,
    description: 'Nivel de madurez activado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Nivel de madurez no encontrado' })
  async activate(@Param('id') id: string) {
    return await this.maturityLevelsService.activate(id)
  }
}

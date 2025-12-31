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
import { FrameworksService } from '../services/frameworks.service'
import { CreateFrameworkDto, UpdateFrameworkDto } from '../dtos'

@ApiTags('frameworks')
@Controller('frameworks')
export class FrameworksController {
  constructor(private readonly frameworksService: FrameworksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo framework de madurez' })
  @ApiResponse({ status: 201, description: 'Framework creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() createFrameworkDto: CreateFrameworkDto) {
    return await this.frameworksService.create(createFrameworkDto)
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los frameworks' })
  @ApiResponse({ status: 200, description: 'Lista de frameworks' })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    type: Boolean,
    description: 'Filtrar solo frameworks activos',
  })
  @ApiQuery({
    name: 'frameworkType',
    required: false,
    type: String,
    description: 'Filtrar por tipo de framework',
  })
  @ApiQuery({
    name: 'scoringType',
    required: false,
    type: String,
    description: 'Filtrar por tipo de puntuación',
  })
  async findAll(
    @Query('activeOnly') activeOnly?: string,
    @Query('frameworkType') frameworkType?: string,
    @Query('scoringType') scoringType?: string,
  ) {
    if (activeOnly === 'true') {
      return await this.frameworksService.findAllActive()
    }

    if (frameworkType) {
      return await this.frameworksService.findByType(frameworkType)
    }

    if (scoringType) {
      return await this.frameworksService.findByScoringType(scoringType)
    }

    return await this.frameworksService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un framework por ID' })
  @ApiResponse({ status: 200, description: 'Framework encontrado' })
  @ApiResponse({ status: 404, description: 'Framework no encontrado' })
  async findOne(@Param('id') id: string) {
    return await this.frameworksService.findOne(id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un framework' })
  @ApiResponse({
    status: 200,
    description: 'Framework actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Framework no encontrado' })
  async update(
    @Param('id') id: string,
    @Body() updateFrameworkDto: UpdateFrameworkDto,
  ) {
    return await this.frameworksService.update(id, updateFrameworkDto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un framework' })
  @ApiResponse({ status: 204, description: 'Framework eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Framework no encontrado' })
  async remove(@Param('id') id: string) {
    await this.frameworksService.remove(id)
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desactivar un framework' })
  @ApiResponse({
    status: 200,
    description: 'Framework desactivado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Framework no encontrado' })
  async deactivate(@Param('id') id: string) {
    return await this.frameworksService.deactivate(id)
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activar un framework' })
  @ApiResponse({
    status: 200,
    description: 'Framework activado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Framework no encontrado' })
  async activate(@Param('id') id: string) {
    return await this.frameworksService.activate(id)
  }
}

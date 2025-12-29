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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { UsersService } from '../services/users.service'
import { UserFactory } from '../factories/user.factory'
import { CreateUserDto, UpdateUserDto } from '../dtos'

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userFactory: UserFactory,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto)
    return this.userFactory.toResponse(user)
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los usuarios' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  async findAll(@Query('organizationId') organizationId?: string) {
    const users = organizationId
      ? await this.usersService.findByOrganization(organizationId)
      : await this.usersService.findAll()

    return this.userFactory.toResponseList(users)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id)
    return this.userFactory.toResponse(user)
  }

  @Get('email/:email')
  @ApiOperation({ summary: 'Buscar usuario por email' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  async findByEmail(@Param('email') email: string) {
    const user = await this.usersService.findByEmail(email)
    return user ? this.userFactory.toResponse(user) : null
  }

  @Get('username/:username')
  @ApiOperation({ summary: 'Buscar usuario por username' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  async findByUsername(@Param('username') username: string) {
    const user = await this.usersService.findByUsername(username)
    return user ? this.userFactory.toResponse(user) : null
  }

  @Get('ci/:ci')
  @ApiOperation({ summary: 'Buscar usuario por CI' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  async findByCI(@Param('ci') ci: string) {
    const user = await this.usersService.findByCI(ci)
    return user ? this.userFactory.toResponse(user) : null
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un usuario' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto)
    return this.userFactory.toResponse(user)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un usuario' })
  @ApiResponse({ status: 204, description: 'Usuario eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id)
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desactivar un usuario' })
  @ApiResponse({ status: 200, description: 'Usuario desactivado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async deactivate(@Param('id') id: string) {
    const user = await this.usersService.deactivate(id)
    return this.userFactory.toResponse(user)
  }
}

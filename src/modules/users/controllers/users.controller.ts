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
import { UserFactory } from '../factories/user.factory'
import { CreateUserDto, UpdateUserDto } from '../dtos'

// Command Handlers
import {
  CreateUserCommand,
  CreateUserHandler,
  UpdateUserCommand,
  UpdateUserHandler,
  DeleteUserCommand,
  DeleteUserHandler,
  DeactivateUserCommand,
  DeactivateUserHandler,
} from '../use-cases/commands'

// Query Handlers
import {
  GetUserQuery,
  GetUserHandler,
  GetUsersQuery,
  GetUsersHandler,
  GetUsersByOrganizationQuery,
  GetUsersByOrganizationHandler,
} from '../use-cases/queries'

/**
 * Controller de usuarios
 *
 * Responsabilidad: Orquestar use cases (commands/queries)
 * NO contiene lógica de negocio, solo traduce HTTP a use cases
 */
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    // Command Handlers
    private readonly createUserHandler: CreateUserHandler,
    private readonly updateUserHandler: UpdateUserHandler,
    private readonly deleteUserHandler: DeleteUserHandler,
    private readonly deactivateUserHandler: DeactivateUserHandler,

    // Query Handlers
    private readonly getUserHandler: GetUserHandler,
    private readonly getUsersHandler: GetUsersHandler,
    private readonly getUsersByOrgHandler: GetUsersByOrganizationHandler,

    // Factory para transformar respuestas
    private readonly userFactory: UserFactory,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() dto: CreateUserDto) {
    const command = new CreateUserCommand(
      dto.names,
      dto.lastNames,
      dto.email,
      dto.username,
      dto.ci,
      '', // Password se hashea en otro lugar o no se usa en CreateUserDto
      dto.roles || [],
      dto.phone,
      dto.address,
      dto.organizationId,
    )

    const user = await this.createUserHandler.execute(command)
    return this.userFactory.toResponse(user)
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los usuarios' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  async findAll(@Query('organizationId') organizationId?: string) {
    // Si hay filtro por organización, usar query específica
    if (organizationId) {
      const query = new GetUsersByOrganizationQuery(organizationId)
      const users = await this.getUsersByOrgHandler.execute(query)
      return this.userFactory.toResponseList(users)
    }

    // Sin filtro, obtener todos
    const query = new GetUsersQuery()
    const users = await this.getUsersHandler.execute(query)
    return this.userFactory.toResponseList(users)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findOne(@Param('id') id: string) {
    const query = new GetUserQuery(id)
    const user = await this.getUserHandler.execute(query)
    return this.userFactory.toResponse(user)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un usuario' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const command = new UpdateUserCommand(
      id,
      dto.names,
      dto.lastNames,
      dto.email,
      dto.username,
      dto.ci,
      dto.phone,
      dto.address,
      dto.image,
      dto.roles,
      dto.organizationId,
    )

    const user = await this.updateUserHandler.execute(command)
    return this.userFactory.toResponse(user)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un usuario' })
  @ApiResponse({ status: 204, description: 'Usuario eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async remove(@Param('id') id: string) {
    const command = new DeleteUserCommand(id)
    await this.deleteUserHandler.execute(command)
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desactivar un usuario' })
  @ApiResponse({ status: 200, description: 'Usuario desactivado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async deactivate(@Param('id') id: string) {
    const command = new DeactivateUserCommand(id)
    const user = await this.deactivateUserHandler.execute(command)
    return this.userFactory.toResponse(user)
  }
}

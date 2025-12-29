import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { UserEntity, UserStatus } from '../entities/user.entity'
import { RoleEntity } from '../entities/role.entity'
import { UsersRepository } from '../repositories/users.repository'
import { UserFactory } from '../factories/user.factory'
import { CreateUserDto, UpdateUserDto } from '../dtos'

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly userFactory: UserFactory,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    // Validar unicidad
    await this.validateUniqueness(
      createUserDto.email,
      createUserDto.username,
      createUserDto.ci,
    )

    // Obtener roles si se proporcionan
    let roles: RoleEntity[] = []
    if (createUserDto.roleIds && createUserDto.roleIds.length > 0) {
      roles = await this.roleRepository.find({
        where: { id: In(createUserDto.roleIds) },
      })

      if (roles.length !== createUserDto.roleIds.length) {
        throw new BadRequestException('Algunos roles no existen')
      }
    }

    // Crear usuario usando el factory
    const user = this.userFactory.createFromDto(createUserDto, roles)

    // Guardar en BD
    return await this.usersRepository.create(user)
  }

  async findAll(): Promise<UserEntity[]> {
    return await this.usersRepository.findAll()
  }

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findById(id)

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`)
    }

    return user
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return await this.usersRepository.findByEmail(email)
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    return await this.usersRepository.findByUsername(username)
  }

  async findByCI(ci: string): Promise<UserEntity | null> {
    return await this.usersRepository.findByCI(ci)
  }

  async findByOrganization(organizationId: string): Promise<UserEntity[]> {
    return await this.usersRepository.findByOrganization(organizationId)
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findOne(id)

    // Validar unicidad si se actualiza email, username o CI
    if (updateUserDto.email || updateUserDto.username || updateUserDto.ci) {
      await this.validateUniqueness(
        updateUserDto.email,
        updateUserDto.username,
        updateUserDto.ci,
        id,
      )
    }

    // Obtener roles si se proporcionan
    let roles: RoleEntity[] | undefined
    if (updateUserDto.roleIds !== undefined) {
      if (updateUserDto.roleIds.length > 0) {
        roles = await this.roleRepository.find({
          where: { id: In(updateUserDto.roleIds) },
        })

        if (roles.length !== updateUserDto.roleIds.length) {
          throw new BadRequestException('Algunos roles no existen')
        }
      } else {
        roles = []
      }
    }

    // Actualizar usuario usando el factory
    this.userFactory.updateFromDto(user, updateUserDto, roles)

    // Guardar cambios
    return await this.usersRepository.update(user)
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id)
    await this.usersRepository.delete(user)
  }

  async deactivate(id: string): Promise<UserEntity> {
    const user = await this.findOne(id)
    user.status = UserStatus.INACTIVE
    return await this.usersRepository.update(user)
  }

  private async validateUniqueness(
    email?: string,
    username?: string,
    ci?: string,
    excludeId?: string,
  ): Promise<void> {
    if (email) {
      const exists = await this.usersRepository.existsByEmail(email, excludeId)
      if (exists) {
        throw new ConflictException('El email ya está registrado')
      }
    }

    if (username) {
      const exists = await this.usersRepository.existsByUsername(
        username,
        excludeId,
      )
      if (exists) {
        throw new ConflictException('El username ya está en uso')
      }
    }

    if (ci) {
      const exists = await this.usersRepository.existsByCI(ci, excludeId)
      if (exists) {
        throw new ConflictException('El CI ya está registrado')
      }
    }
  }
}

import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { UserEntity, UserStatus } from '../entities/user.entity'
import type { IUsersRepository } from '../repositories/users-repository.interface'
import { UserFactory } from '../factories/user.factory'
import { CreateUserDto, UpdateUserDto } from '../dtos'
import { TransactionManager } from '@core/database/transaction-manager.service'

@Injectable()
export class UsersService {
  constructor(
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
    private readonly userFactory: UserFactory,
    private readonly transactionManager: TransactionManager,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    // Ejemplo de uso de transacción con contexto
    // TODAS las operaciones del repositorio dentro de runInTransaction
    // usarán automáticamente el mismo EntityManager
    return await this.transactionManager.runInTransaction(async () => {
      // Validar unicidad
      await this.validateUniqueness(
        createUserDto.email,
        createUserDto.username,
        createUserDto.ci,
      )

      // Crear usuario usando el factory (roles ya están en el DTO)
      const user = this.userFactory.createFromDto(createUserDto)

      // Guardar en BD - NO necesitas pasar entityManager
      // El repositorio lo obtiene automáticamente del contexto!
      return await this.usersRepository.save(user)
    })
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
    return await this.transactionManager.runInTransaction(async () => {
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

      // Actualizar usuario usando el factory (roles están en el DTO)
      this.userFactory.updateFromDto(user, updateUserDto)

      // Guardar cambios - El contexto transaccional se maneja automáticamente
      return await this.usersRepository.patch(user, updateUserDto)
    })
  }

  async remove(id: string): Promise<void> {
    await this.transactionManager.runInTransaction(async () => {
      const user = await this.findOne(id)
      await this.usersRepository.softDelete(user.id)
    })
  }

  async deactivate(id: string): Promise<UserEntity> {
    return await this.transactionManager.runInTransaction(async () => {
      const user = await this.findOne(id)
      user.status = UserStatus.INACTIVE
      return await this.usersRepository.patch(user, {
        status: UserStatus.INACTIVE,
      })
    })
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

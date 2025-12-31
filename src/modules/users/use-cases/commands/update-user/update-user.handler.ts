import { Injectable, Inject } from '@nestjs/common'
import type { UserEntity } from '@users/entities/user.entity'
import type { IUsersRepository } from '@users/repositories/users-repository.interface'
import { UsersValidationService } from '@users/services/users-validation.service'
import { UserFactory } from '@users/factories/user.factory'
import { TransactionManager } from '@core/database/transaction-manager.service'
import type { UpdateUserCommand } from './update-user.command'

/**
 * Handler para el comando UpdateUser
 *
 * Responsabilidad: Orquestar la lógica de negocio para actualizar un usuario
 */
@Injectable()
export class UpdateUserHandler {
  constructor(
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
    private readonly validationService: UsersValidationService,
    private readonly userFactory: UserFactory,
    private readonly transactionManager: TransactionManager,
  ) {}

  async execute(command: UpdateUserCommand): Promise<UserEntity> {
    return await this.transactionManager.runInTransaction(async () => {
      // 1. Verificar que el usuario exista
      const user = await this.validationService.ensureUserExists(command.userId)

      // 2. Validar unicidad si se actualiza email, username o CI
      if (command.email || command.username || command.ci) {
        await this.validationService.validateUniqueness(
          {
            email: command.email,
            username: command.username,
            ci: command.ci,
          },
          command.userId,
        )
      }

      // 3. Actualizar usuario usando factory
      this.userFactory.updateFromDto(user, {
        names: command.names,
        lastNames: command.lastNames,
        email: command.email,
        username: command.username,
        ci: command.ci,
        phone: command.phone,
        address: command.address,
        image: command.image,
        roles: command.roles,
        organizationId: command.organizationId,
      })

      // 4. Persistir cambios
      return await this.usersRepository.patch(user, {
        names: command.names,
        lastNames: command.lastNames,
        email: command.email,
        username: command.username,
        ci: command.ci,
        phone: command.phone,
        address: command.address,
        image: command.image,
        roles: command.roles,
        organizationId: command.organizationId,
      })
    })
  }
}

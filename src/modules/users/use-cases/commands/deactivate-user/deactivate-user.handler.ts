import { Injectable, Inject } from '@nestjs/common'
import type { UserEntity } from '@users/entities/user.entity'
import { UserStatus } from '@users/entities/user.entity'
import type { IUsersRepository } from '@users/repositories/users-repository.interface'
import { UsersValidationService } from '@users/services/users-validation.service'
import { TransactionManager } from '@core/database/transaction-manager.service'
import type { DeactivateUserCommand } from './deactivate-user.command'

/**
 * Handler para el comando DeactivateUser
 *
 * Responsabilidad: Cambiar el estado del usuario a INACTIVE
 */
@Injectable()
export class DeactivateUserHandler {
  constructor(
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
    private readonly validationService: UsersValidationService,
    private readonly transactionManager: TransactionManager,
  ) {}

  async execute(command: DeactivateUserCommand): Promise<UserEntity> {
    return await this.transactionManager.runInTransaction(async () => {
      // 1. Verificar que el usuario exista
      const user = await this.validationService.ensureUserExists(command.userId)

      // 2. Cambiar status a INACTIVE
      user.status = UserStatus.INACTIVE

      // 3. Persistir cambio
      return await this.usersRepository.patch(user, {
        status: UserStatus.INACTIVE,
      })
    })
  }
}

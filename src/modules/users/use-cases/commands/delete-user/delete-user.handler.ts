import { Injectable, Inject } from '@nestjs/common'
import type { IUsersRepository } from '@users/repositories/users-repository.interface'
import { UsersValidationService } from '@users/services/users-validation.service'
import { TransactionManager } from '@core/database/transaction-manager.service'
import type { DeleteUserCommand } from './delete-user.command'

/**
 * Handler para el comando DeleteUser
 *
 * Responsabilidad: Eliminar (soft delete) un usuario
 */
@Injectable()
export class DeleteUserHandler {
  constructor(
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
    private readonly validationService: UsersValidationService,
    private readonly transactionManager: TransactionManager,
  ) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    await this.transactionManager.runInTransaction(async () => {
      // 1. Verificar que el usuario exista
      await this.validationService.ensureUserExists(command.userId)

      // 2. Soft delete
      await this.usersRepository.softDelete(command.userId)
    })
  }
}

import { Injectable, Inject } from '@nestjs/common'
import type { UserEntity } from '@users/entities/user.entity'
import type { IUsersRepository } from '@users/repositories/users-repository.interface'
import { UsersValidationService } from '@users/services/users-validation.service'
import { UserFactory } from '@users/factories/user.factory'
import { TransactionManager } from '@core/database/transaction-manager.service'
import type { CreateUserCommand } from './create-user.command'

/**
 * Handler para el comando CreateUser
 *
 * Responsabilidad: Orquestar la lógica de negocio para crear un usuario
 * - Valida unicidad (usando service reutilizable)
 * - Crea la entidad (usando factory)
 * - Persiste en base de datos (usando repository)
 */
@Injectable()
export class CreateUserHandler {
  constructor(
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
    private readonly validationService: UsersValidationService,
    private readonly userFactory: UserFactory,
    private readonly transactionManager: TransactionManager,
  ) {}

  async execute(command: CreateUserCommand): Promise<UserEntity> {
    return await this.transactionManager.runInTransaction(async () => {
      // 1. Validar unicidad (servicio reutilizable)
      await this.validationService.validateUniqueness({
        email: command.email,
        username: command.username,
        ci: command.ci,
      })

      // 2. Crear entidad usando factory
      const user = this.userFactory.createFromDto({
        names: command.names,
        lastNames: command.lastNames,
        email: command.email,
        username: command.username,
        ci: command.ci,
        roles: command.roles,
        phone: command.phone,
        address: command.address,
        organizationId: command.organizationId,
      })

      // 3. Persistir en BD
      return await this.usersRepository.save(user)
    })
  }
}

import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserEntity } from './entities/user.entity'
import { UsersController } from './controllers/users.controller'
import { UsersRepository } from './repositories/users.repository'
import { UserFactory } from './factories/user.factory'
import { OrganizationsModule } from '@organizations/organizations.module'
import { TransactionManager } from '@core/database/transaction-manager.service'

// Services
import { UsersService } from './services/users.service'
import { UsersValidationService } from './services/users-validation.service'

// Command Handlers
import {
  CreateUserHandler,
  UpdateUserHandler,
  DeleteUserHandler,
  DeactivateUserHandler,
} from './use-cases/commands'

// Query Handlers
import {
  GetUserHandler,
  GetUsersHandler,
  GetUsersByOrganizationHandler,
} from './use-cases/queries'

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), OrganizationsModule],
  controllers: [UsersController],
  providers: [
    // Core
    TransactionManager,

    // Servicios
    UsersService, // Mantener por compatibilidad (opcional: puede removerse después)
    UsersValidationService,
    UserFactory,

    // Repository
    {
      provide: 'IUsersRepository',
      useClass: UsersRepository,
    },

    // Command Handlers
    CreateUserHandler,
    UpdateUserHandler,
    DeleteUserHandler,
    DeactivateUserHandler,

    // Query Handlers
    GetUserHandler,
    GetUsersHandler,
    GetUsersByOrganizationHandler,
  ],
  exports: [
    UsersService, // Mantener por compatibilidad
    UsersValidationService,
    'IUsersRepository',
    // Exportar handlers si otros módulos los necesitan
    CreateUserHandler,
    GetUserHandler,
  ],
})
export class UsersModule {}

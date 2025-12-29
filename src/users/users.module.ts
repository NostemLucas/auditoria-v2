import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserEntity } from './entities/user.entity'
import { RoleEntity } from './entities/role.entity'
import { UsersController } from './controllers/users.controller'
import { UsersService } from './services/users.service'
import { UsersRepository } from './repositories/users.repository'
import { UserFactory } from './factories/user.factory'
import { OrganizationsModule } from '../organizations/organizations.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, RoleEntity]),
    OrganizationsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, UserFactory],
  exports: [UsersService],
})
export class UsersModule {}

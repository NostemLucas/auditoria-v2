import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { NotificationsGateway } from './notifications.gateway'
import { NotificationsService } from './notifications.service'
import {
  NotificationsController,
  RoomsController,
  UsersController,
} from './notifications.controller'
import {
  Notification,
  Room,
  UserSocketEntity,
  UserRoomEntity,
} from './entities'
import { UserEntity } from '@users/entities/user.entity'
import { AuthModule } from '@auth'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      UserEntity,
      Room,
      UserSocketEntity,
      UserRoomEntity,
    ]),
    AuthModule, // Para usar JwtService en el guard
  ],
  controllers: [NotificationsController, RoomsController, UsersController],
  providers: [NotificationsGateway, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

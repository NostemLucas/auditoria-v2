import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { NotificationsController, RoomsController, UsersController } from './notifications.controller';
import { Notification } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import { Room } from '../entities/room.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User, Room])],
  controllers: [NotificationsController, RoomsController, UsersController],
  providers: [NotificationsGateway, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

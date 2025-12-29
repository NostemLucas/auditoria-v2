import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { NotificationType } from '../entities/notification.entity'

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  async createNotification(
    @Body()
    body: {
      title: string
      message: string
      type?: NotificationType
      username?: string
      roomName?: string
      metadata?: Record<string, any>
    },
  ) {
    return await this.notificationsService.createNotification(body)
  }

  @Get('user/:username')
  async getUserNotifications(
    @Param('username') username: string,
    @Query('limit') limit?: number,
  ) {
    return await this.notificationsService.getUserNotifications(username, limit)
  }

  @Get('room/:roomName')
  async getRoomNotifications(
    @Param('roomName') roomName: string,
    @Query('limit') limit?: number,
  ) {
    return await this.notificationsService.getRoomNotifications(roomName, limit)
  }

  @Get('stats')
  async getStats() {
    return await this.notificationsService.getNotificationStats()
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string) {
    return await this.notificationsService.markAsRead(id)
  }
}

@Controller('rooms')
export class RoomsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getActiveRooms() {
    return await this.notificationsService.getActiveRooms()
  }

  @Post()
  async createRoom(@Body() body: { name: string; description?: string }) {
    return await this.notificationsService.getOrCreateRoom(
      body.name,
      body.description,
    )
  }
}

@Controller('users')
export class UsersController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  async createUser(@Body() body: { username: string; email?: string }) {
    return await this.notificationsService.getOrCreateUser(
      body.username,
      body.email,
    )
  }

  @Get(':username')
  async getUser(@Param('username') username: string) {
    return await this.notificationsService.findUserByUsername(username)
  }
}

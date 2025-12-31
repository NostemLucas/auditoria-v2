import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { NotificationsService } from './notifications.service'
import { Logger, UseGuards } from '@nestjs/common'
import { WsJwtGuard } from './guards/ws-jwt.guard'
import type {
  JoinRoomData,
  LeaveRoomData,
  SendNotificationData,
  MarkAsReadData,
} from './interfaces/notification-events.interface'
import type { JwtPayload } from '@auth/interfaces/jwt-payload.interface'

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:4200'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },
})
@UseGuards(WsJwtGuard)
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(NotificationsGateway.name)

  constructor(private readonly notificationsService: NotificationsService) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const user: JwtPayload = client.data.user

      if (!user) {
        this.logger.warn(`Client ${client.id} connected without authentication`)
        client.disconnect()
        return
      }

      // Registrar el socket del usuario autenticado
      const userAgent = client.handshake.headers['user-agent']
      const ipAddress = client.handshake.address

      await this.notificationsService.registerUserSocket(
        user.sub,
        client.id,
        userAgent,
        ipAddress,
      )

      this.logger.log(
        `Client connected: ${client.id} - User: ${user.username} (${user.email})`,
      )
    } catch (error) {
      this.logger.error(`Error handling connection: ${error}`)
      client.disconnect()
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    this.logger.log(`Client disconnected: ${client.id}`)
    await this.notificationsService.handleUserDisconnect(client.id)
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomData,
  ) {
    try {
      const user: JwtPayload = client.data.user
      const { roomName } = data

      await client.join(roomName)
      this.logger.log(
        `Client ${client.id} (${user.username}) joined room: ${roomName}`,
      )

      const room = await this.notificationsService.getOrCreateRoom(roomName)

      // Persistir membresía en la sala
      await this.notificationsService.joinRoom(user.sub, room.id, client.id)

      client.emit('joinedRoom', {
        success: true,
        roomName,
        roomId: room.id,
        message: `Successfully joined room: ${roomName}`,
      })

      this.server.to(roomName).emit('userJoined', {
        username: user.username,
        roomName,
        timestamp: new Date(),
      })

      return { success: true, roomId: room.id }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to join room'
      this.logger.error(`Error joining room: ${errorMessage}`)
      client.emit('error', { message: 'Failed to join room' })
      return { success: false, error: errorMessage }
    }
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LeaveRoomData,
  ) {
    try {
      const user: JwtPayload = client.data.user
      const { roomName } = data

      await client.leave(roomName)
      this.logger.log(
        `Client ${client.id} (${user.username}) left room: ${roomName}`,
      )

      // Persistir que el usuario salió de la sala
      const room = await this.notificationsService.getOrCreateRoom(roomName)
      await this.notificationsService.leaveRoom(user.sub, room.id, client.id)

      this.server.to(roomName).emit('userLeft', {
        username: user.username,
        roomName,
        timestamp: new Date(),
      })

      client.emit('leftRoom', {
        success: true,
        roomName,
        message: `Successfully left room: ${roomName}`,
      })

      return { success: true }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to leave room'
      this.logger.error(`Error leaving room: ${errorMessage}`)
      return { success: false, error: errorMessage }
    }
  }

  @SubscribeMessage('sendNotification')
  async handleSendNotification(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendNotificationData,
  ) {
    try {
      const notification =
        await this.notificationsService.createNotification(data)

      if (data.roomName) {
        // Enviar a todos en la sala
        this.server.to(data.roomName).emit('notification', notification)
      } else if (data.username) {
        // Enviar a TODOS los sockets activos del usuario
        const user = await this.notificationsService.findUserByUsername(
          data.username,
        )
        if (user) {
          const socketIds =
            await this.notificationsService.getUserActiveSocketIds(user.id)
          for (const socketId of socketIds) {
            this.server.to(socketId).emit('notification', notification)
          }
        }
      } else {
        // Broadcast a todos los clientes conectados
        this.server.emit('notification', notification)
      }

      return { success: true, notification }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send notification'
      this.logger.error(`Error sending notification: ${errorMessage}`)
      return { success: false, error: errorMessage }
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: MarkAsReadData,
  ) {
    try {
      const notification = await this.notificationsService.markAsRead(
        data.notificationId,
      )
      return { success: true, notification }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to mark notification as read'
      this.logger.error(`Error marking notification as read: ${errorMessage}`)
      return { success: false, error: errorMessage }
    }
  }

  @SubscribeMessage('getActiveRooms')
  async handleGetActiveRooms() {
    try {
      const rooms = await this.notificationsService.getActiveRooms()
      return { success: true, rooms }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to get active rooms'
      this.logger.error(`Error getting active rooms: ${errorMessage}`)
      return { success: false, error: errorMessage }
    }
  }
}

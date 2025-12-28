import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationsService } from './notifications.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    await this.notificationsService.handleUserDisconnect(client.id);
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomName: string; username?: string },
  ) {
    try {
      const { roomName, username } = data;

      await client.join(roomName);
      this.logger.log(`Client ${client.id} joined room: ${roomName}`);

      if (username) {
        await this.notificationsService.updateUserSocket(username, client.id);
      }

      const room = await this.notificationsService.getOrCreateRoom(roomName);

      client.emit('joinedRoom', {
        success: true,
        roomName,
        roomId: room.id,
        message: `Successfully joined room: ${roomName}`,
      });

      this.server.to(roomName).emit('userJoined', {
        username: username || 'Anonymous',
        roomName,
        timestamp: new Date(),
      });

      return { success: true, roomId: room.id };
    } catch (error) {
      this.logger.error(`Error joining room: ${error.message}`);
      client.emit('error', { message: 'Failed to join room' });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomName: string; username?: string },
  ) {
    try {
      const { roomName, username } = data;

      await client.leave(roomName);
      this.logger.log(`Client ${client.id} left room: ${roomName}`);

      this.server.to(roomName).emit('userLeft', {
        username: username || 'Anonymous',
        roomName,
        timestamp: new Date(),
      });

      client.emit('leftRoom', {
        success: true,
        roomName,
        message: `Successfully left room: ${roomName}`,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error leaving room: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('sendNotification')
  async handleSendNotification(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    try {
      const notification =
        await this.notificationsService.createNotification(data);

      if (data.roomName) {
        this.server.to(data.roomName).emit('notification', notification);
      } else if (data.username) {
        const user = await this.notificationsService.findUserByUsername(
          data.username,
        );
        if (user?.socketId) {
          this.server.to(user.socketId).emit('notification', notification);
        }
      } else {
        this.server.emit('notification', notification);
      }

      return { success: true, notification };
    } catch (error) {
      this.logger.error(`Error sending notification: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string },
  ) {
    try {
      const notification = await this.notificationsService.markAsRead(
        data.notificationId,
      );
      return { success: true, notification };
    } catch (error) {
      this.logger.error(`Error marking notification as read: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('getActiveRooms')
  async handleGetActiveRooms(@ConnectedSocket() client: Socket) {
    try {
      const rooms = await this.notificationsService.getActiveRooms();
      return { success: true, rooms };
    } catch (error) {
      this.logger.error(`Error getting active rooms: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

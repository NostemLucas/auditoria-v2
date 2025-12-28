import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType, NotificationStatus } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import { Room } from '../entities/room.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
  ) {}

  async createNotification(data: {
    title: string;
    message: string;
    type?: NotificationType;
    username?: string;
    roomName?: string;
    metadata?: Record<string, any>;
  }): Promise<Notification> {
    const notification = new Notification();
    notification.title = data.title;
    notification.message = data.message;
    notification.type = data.type || NotificationType.INFO;
    notification.status = NotificationStatus.SENT;
    if (data.metadata) {
      notification.metadata = data.metadata;
    }

    if (data.username) {
      const user = await this.getOrCreateUser(data.username);
      notification.userId = user.id;
    }

    if (data.roomName) {
      const room = await this.getOrCreateRoom(data.roomName);
      notification.roomId = room.id;
    }

    return await this.notificationRepository.save(notification);
  }

  async getOrCreateUser(username: string, email?: string): Promise<User> {
    let user = await this.userRepository.findOne({ where: { username } });

    if (!user) {
      user = new User();
      user.username = username;
      user.email = email || `${username}@example.com`;
      user = await this.userRepository.save(user);
      this.logger.log(`Created new user: ${username}`);
    }

    return user;
  }

  async getOrCreateRoom(name: string, description?: string): Promise<Room> {
    let room = await this.roomRepository.findOne({ where: { name } });

    if (!room) {
      room = new Room();
      room.name = name;
      if (description) {
        room.description = description;
      }
      room.isActive = true;
      room = await this.roomRepository.save(room);
      this.logger.log(`Created new room: ${name}`);
    }

    return room;
  }

  async updateUserSocket(username: string, socketId: string): Promise<User> {
    const user = await this.getOrCreateUser(username);
    user.socketId = socketId;
    return await this.userRepository.save(user);
  }

  async handleUserDisconnect(socketId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { socketId } });
    if (user) {
      user.socketId = null;
      await this.userRepository.save(user);
      this.logger.log(`User ${user.username} disconnected`);
    }
  }

  async findUserByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { username } });
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (notification) {
      notification.status = NotificationStatus.READ;
      notification.readAt = new Date();
      return await this.notificationRepository.save(notification);
    }

    throw new Error('Notification not found');
  }

  async getActiveRooms(): Promise<Room[]> {
    return await this.roomRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getUserNotifications(username: string, limit: number = 50): Promise<Notification[]> {
    const user = await this.findUserByUsername(username);
    if (!user) {
      return [];
    }

    return await this.notificationRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getRoomNotifications(roomName: string, limit: number = 50): Promise<Notification[]> {
    const room = await this.roomRepository.findOne({ where: { name: roomName } });
    if (!room) {
      return [];
    }

    return await this.notificationRepository.find({
      where: { roomId: room.id },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getNotificationStats() {
    const total = await this.notificationRepository.count();
    const pending = await this.notificationRepository.count({
      where: { status: NotificationStatus.PENDING },
    });
    const sent = await this.notificationRepository.count({
      where: { status: NotificationStatus.SENT },
    });
    const read = await this.notificationRepository.count({
      where: { status: NotificationStatus.READ },
    });

    return { total, pending, sent, read };
  }
}

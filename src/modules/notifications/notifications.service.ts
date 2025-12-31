import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, IsNull } from 'typeorm'
import {
  Notification,
  NotificationType,
  NotificationStatus,
} from './entities/notification.entity'
import { UserEntity } from '@users/entities/user.entity'
import { Room, UserSocketEntity, UserRoomEntity } from './entities'
import { SendNotificationData } from './interfaces/notification-events.interface'

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(UserSocketEntity)
    private userSocketRepository: Repository<UserSocketEntity>,
    @InjectRepository(UserRoomEntity)
    private userRoomRepository: Repository<UserRoomEntity>,
  ) {}

  async createNotification(data: SendNotificationData): Promise<Notification> {
    const notification = new Notification()
    notification.title = data.title
    notification.message = data.message
    notification.type = data.type ?? NotificationType.INFO
    notification.status = NotificationStatus.SENT
    if (data.metadata) {
      notification.metadata = data.metadata
    }

    if (data.username) {
      const user = await this.getOrCreateUser(data.username)
      notification.userId = user.id
    }

    if (data.roomName) {
      const room = await this.getOrCreateRoom(data.roomName)
      notification.roomId = room.id
    }

    return await this.notificationRepository.save(notification)
  }

  async getOrCreateUser(username: string, email?: string): Promise<UserEntity> {
    let user = await this.userRepository.findOne({ where: { username } })

    if (!user) {
      user = new UserEntity()
      user.username = username
      user.email = email || `${username}@example.com`
      // Campos obligatorios con valores por defecto para compatibilidad con WebSockets
      user.names = 'WebSocket'
      user.lastNames = 'User'
      user.ci = `WS-${Date.now()}` // Generar CI único temporal
      user = await this.userRepository.save(user)
      this.logger.log(`Created new user: ${username}`)
    }

    return user
  }

  async getOrCreateRoom(name: string, description?: string): Promise<Room> {
    let room = await this.roomRepository.findOne({ where: { name } })

    if (!room) {
      room = new Room()
      room.name = name
      if (description) {
        room.description = description
      }
      room.isActive = true
      room = await this.roomRepository.save(room)
      this.logger.log(`Created new room: ${name}`)
    }

    return room
  }

  /**
   * Registra una nueva conexión de socket para un usuario
   * Soporta múltiples conexiones simultáneas (desktop, mobile, etc.)
   */
  async registerUserSocket(
    userId: string,
    socketId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<UserSocketEntity> {
    const userSocket = new UserSocketEntity()
    userSocket.userId = userId
    userSocket.socketId = socketId
    userSocket.userAgent = userAgent || null
    userSocket.ipAddress = ipAddress || null
    userSocket.rooms = []
    userSocket.disconnectedAt = null

    const saved = await this.userSocketRepository.save(userSocket)
    this.logger.log(`Socket registered: ${socketId} for user ${userId}`)
    return saved
  }

  /**
   * Marca un socket como desconectado
   * NO elimina otros sockets activos del mismo usuario
   */
  async handleUserDisconnect(socketId: string): Promise<void> {
    const userSocket = await this.userSocketRepository.findOne({
      where: { socketId },
      relations: ['user'],
    })

    if (userSocket) {
      userSocket.disconnect()
      await this.userSocketRepository.save(userSocket)

      // Marcar que el usuario salió de todas sus salas
      await this.leaveAllRooms(userSocket.userId, socketId)

      this.logger.log(
        `Socket disconnected: ${socketId} for user ${userSocket.user?.username}`,
      )
    }
  }

  /**
   * Obtiene todos los sockets activos de un usuario
   */
  async getUserActiveSockets(userId: string): Promise<UserSocketEntity[]> {
    return await this.userSocketRepository.find({
      where: {
        userId,
        disconnectedAt: IsNull(),
      },
      order: { connectedAt: 'DESC' },
    })
  }

  /**
   * Obtiene IDs de todos los sockets activos de un usuario
   */
  async getUserActiveSocketIds(userId: string): Promise<string[]> {
    const sockets = await this.getUserActiveSockets(userId)
    return sockets.map((s) => s.socketId)
  }

  /**
   * Encuentra un usuario por socketId
   */
  async findUserBySocketId(socketId: string): Promise<UserEntity | null> {
    const userSocket = await this.userSocketRepository.findOne({
      where: { socketId, disconnectedAt: IsNull() },
      relations: ['user'],
    })
    return userSocket?.user || null
  }

  /**
   * Registra que un usuario se unió a una sala
   */
  async joinRoom(
    userId: string,
    roomId: string,
    socketId: string,
  ): Promise<UserRoomEntity> {
    // Verificar si ya está en la sala (membresía activa)
    let userRoom = await this.userRoomRepository.findOne({
      where: {
        userId,
        roomId,
        leftAt: IsNull(),
      },
    })

    if (!userRoom) {
      // Crear nueva membresía
      userRoom = new UserRoomEntity()
      userRoom.userId = userId
      userRoom.roomId = roomId
      userRoom.leftAt = null
      userRoom = await this.userRoomRepository.save(userRoom)
    }

    // Actualizar el socket para incluir la sala
    const userSocket = await this.userSocketRepository.findOne({
      where: { socketId },
    })
    if (userSocket) {
      userSocket.addRoom(roomId)
      await this.userSocketRepository.save(userSocket)
    }

    return userRoom
  }

  /**
   * Registra que un usuario salió de una sala
   */
  async leaveRoom(
    userId: string,
    roomId: string,
    socketId?: string,
  ): Promise<void> {
    // Si se proporciona socketId, solo remover del socket específico
    if (socketId) {
      const userSocket = await this.userSocketRepository.findOne({
        where: { socketId },
      })
      if (userSocket) {
        userSocket.removeRoom(roomId)
        await this.userSocketRepository.save(userSocket)
      }
    }

    // Verificar si el usuario tiene otros sockets en la sala
    const otherSocketsInRoom = await this.userSocketRepository.count({
      where: {
        userId,
        disconnectedAt: IsNull(),
      },
    })

    // Solo marcar como "left" si no hay otros sockets activos del usuario
    if (otherSocketsInRoom === 0 || !socketId) {
      const userRoom = await this.userRoomRepository.findOne({
        where: {
          userId,
          roomId,
          leftAt: IsNull(),
        },
      })

      if (userRoom) {
        userRoom.leave()
        await this.userRoomRepository.save(userRoom)
      }
    }
  }

  /**
   * Marca que un usuario salió de todas sus salas (al desconectarse)
   */
  async leaveAllRooms(userId: string, socketId: string): Promise<void> {
    const userSocket = await this.userSocketRepository.findOne({
      where: { socketId },
    })

    if (userSocket) {
      const rooms = [...userSocket.rooms]
      for (const roomId of rooms) {
        await this.leaveRoom(userId, roomId, socketId)
      }
    }
  }

  /**
   * Obtiene las salas activas de un usuario
   */
  async getUserActiveRooms(userId: string): Promise<UserRoomEntity[]> {
    return await this.userRoomRepository.find({
      where: {
        userId,
        leftAt: IsNull(),
      },
      relations: ['room'],
      order: { joinedAt: 'DESC' },
    })
  }

  async findUserByUsername(username: string): Promise<UserEntity | null> {
    return await this.userRepository.findOne({ where: { username } })
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    })

    if (notification) {
      notification.status = NotificationStatus.READ
      notification.readAt = new Date()
      return await this.notificationRepository.save(notification)
    }

    throw new Error('Notification not found')
  }

  async getActiveRooms(): Promise<Room[]> {
    return await this.roomRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    })
  }

  async getUserNotifications(
    username: string,
    limit: number = 50,
  ): Promise<Notification[]> {
    const user = await this.findUserByUsername(username)
    if (!user) {
      return []
    }

    return await this.notificationRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      take: limit,
    })
  }

  async getRoomNotifications(
    roomName: string,
    limit: number = 50,
  ): Promise<Notification[]> {
    const room = await this.roomRepository.findOne({
      where: { name: roomName },
    })
    if (!room) {
      return []
    }

    return await this.notificationRepository.find({
      where: { roomId: room.id },
      order: { createdAt: 'DESC' },
      take: limit,
    })
  }

  async getNotificationStats() {
    const total = await this.notificationRepository.count()
    const pending = await this.notificationRepository.count({
      where: { status: NotificationStatus.PENDING },
    })
    const sent = await this.notificationRepository.count({
      where: { status: NotificationStatus.SENT },
    })
    const read = await this.notificationRepository.count({
      where: { status: NotificationStatus.READ },
    })

    return { total, pending, sent, read }
  }
}

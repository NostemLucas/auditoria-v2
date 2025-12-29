import { NotificationType } from '../entities/notification.entity'

export interface JoinRoomData {
  roomName: string
  username?: string
}

export interface LeaveRoomData {
  roomName: string
  username?: string
}

export interface SendNotificationData {
  title: string
  message: string
  type?: NotificationType
  username?: string
  roomName?: string
  metadata?: Record<string, unknown>
}

export interface MarkAsReadData {
  notificationId: string
}

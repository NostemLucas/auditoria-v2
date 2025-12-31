import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { UserEntity } from '@users/entities/user.entity'

/**
 * Entidad para rastrear múltiples conexiones WebSocket de un usuario
 *
 * Permite que un usuario esté conectado desde múltiples dispositivos simultáneamente:
 * - Desktop + Mobile
 * - Múltiples tabs/ventanas
 * - Diferentes navegadores
 */
@Entity('user_sockets')
@Index(['userId', 'disconnectedAt']) // Búsqueda rápida de sockets activos por usuario
@Index(['socketId']) // Búsqueda rápida por socketId
export class UserSocketEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  /**
   * ID del usuario propietario del socket
   */
  @Column({ type: 'uuid' })
  @Index()
  userId: string

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity

  /**
   * ID único del socket (client.id de Socket.IO)
   */
  @Column({ type: 'varchar', length: 100, unique: true })
  socketId: string

  /**
   * Salas a las que está unido este socket
   * Ejemplo: ['reportes', 'usuarios', 'audits']
   */
  @Column({ type: 'simple-array', default: '' })
  rooms: string[]

  /**
   * User-Agent del cliente (para identificar dispositivo)
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string | null

  /**
   * IP del cliente
   */
  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null

  /**
   * Timestamp de conexión
   */
  @CreateDateColumn()
  connectedAt: Date

  /**
   * Timestamp de desconexión (null si está activo)
   */
  @Column({ type: 'timestamp', nullable: true })
  @Index()
  disconnectedAt: Date | null

  /**
   * Última actividad del socket (para detectar sockets zombie)
   */
  @UpdateDateColumn()
  lastActivityAt: Date

  /**
   * Metadata adicional (opcional)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null

  /**
   * Verifica si el socket está activo
   */
  get isActive(): boolean {
    return this.disconnectedAt === null
  }

  /**
   * Agrega una sala a este socket
   */
  addRoom(roomName: string): void {
    if (!this.rooms.includes(roomName)) {
      this.rooms.push(roomName)
    }
  }

  /**
   * Remueve una sala de este socket
   */
  removeRoom(roomName: string): void {
    this.rooms = this.rooms.filter((room) => room !== roomName)
  }

  /**
   * Marca el socket como desconectado
   */
  disconnect(): void {
    this.disconnectedAt = new Date()
  }
}

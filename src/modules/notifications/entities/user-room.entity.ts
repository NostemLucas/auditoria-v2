import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm'
import { UserEntity } from '@users/entities/user.entity'
import { Room } from './room.entity'

/**
 * Entidad para persistir la membresía de usuarios en salas
 *
 * Permite:
 * - Recuperar salas tras reconexión
 * - Auditar quién estuvo en qué sala
 * - Saber cuántos usuarios activos hay en cada sala
 */
@Entity('user_rooms')
@Unique(['userId', 'roomId', 'leftAt']) // Un usuario puede estar en la misma sala múltiples veces en el tiempo
@Index(['userId', 'leftAt']) // Búsqueda rápida de salas activas por usuario
@Index(['roomId', 'leftAt']) // Búsqueda rápida de usuarios activos en sala
export class UserRoomEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  /**
   * ID del usuario
   */
  @Column({ type: 'uuid' })
  @Index()
  userId: string

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity

  /**
   * ID de la sala
   */
  @Column({ type: 'uuid' })
  @Index()
  roomId: string

  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: Room

  /**
   * Timestamp cuando el usuario se unió a la sala
   */
  @CreateDateColumn()
  joinedAt: Date

  /**
   * Timestamp cuando el usuario salió de la sala (null si está activo)
   */
  @Column({ type: 'timestamp', nullable: true })
  @Index()
  leftAt: Date | null

  /**
   * Rol del usuario en la sala (opcional)
   * Ejemplo: 'admin', 'moderator', 'member'
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  role: string | null

  /**
   * Metadata adicional (opcional)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null

  /**
   * Verifica si el usuario está actualmente en la sala
   */
  get isActive(): boolean {
    return this.leftAt === null
  }

  /**
   * Marca que el usuario salió de la sala
   */
  leave(): void {
    this.leftAt = new Date()
  }
}

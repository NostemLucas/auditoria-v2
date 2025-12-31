import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm'
import { BaseEntity } from '@core/entities'
import { UserEntity } from '@users/entities/user.entity'

@Entity('refresh_tokens')
@Index(['token']) // Index para búsquedas rápidas
@Index(['userId']) // Index para búsquedas por usuario
export class RefreshTokenEntity extends BaseEntity {
  /**
   * El token JWT hasheado (para seguridad)
   * NO almacenamos el token en texto plano
   */
  @Column({ type: 'varchar', length: 500, unique: true })
  token: string

  /**
   * ID del usuario dueño del token
   */
  @Column({ type: 'uuid' })
  userId: string

  /**
   * Fecha de expiración del token
   */
  @Column({ type: 'timestamp' })
  expiresAt: Date

  /**
   * Si el token ha sido revocado (logout, cambio password, etc.)
   */
  @Column({ type: 'boolean', default: false })
  isRevoked: boolean

  /**
   * Fecha en que fue revocado
   */
  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date | null

  /**
   * IP del dispositivo que creó el token
   */
  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null

  /**
   * User agent del dispositivo
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string | null

  /**
   * ID del token que reemplazó a este (rotation)
   */
  @Column({ type: 'uuid', nullable: true })
  replacedByTokenId: string | null

  /**
   * Relación con el usuario
   */
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity

  /**
   * Verifica si el token está vigente
   */
  isValid(): boolean {
    if (this.isRevoked) {
      return false
    }

    if (this.expiresAt < new Date()) {
      return false
    }

    return true
  }
}

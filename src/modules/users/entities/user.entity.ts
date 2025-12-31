import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm'
import { OrganizationEntity } from '@organizations/entities/organization.entity'
import { BaseEntity } from '@core'
import { Role } from '@authorization'

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('users')
export class UserEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 50 })
  names: string

  @Column({ type: 'varchar', length: 50 })
  lastNames: string

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string

  @Column({ type: 'varchar', length: 30, unique: true })
  username: string

  @Column({ type: 'varchar', length: 15, unique: true })
  ci: string

  @Column({ type: 'varchar', length: 255, select: false })
  password: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  address: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  image: string | null

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus

  @Column({ type: 'uuid', nullable: true })
  organizationId: string | null

  @ManyToOne(() => OrganizationEntity, (organization) => organization.users, {
    nullable: true,
  })
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity

  /**
   * Roles del usuario (array de enums)
   * Los permisos se derivan de estos roles usando getPermissionsForRoles() de @authorization
   * @example ['admin', 'gerente']
   */
  @Column({ type: 'simple-array', default: '' })
  roles: Role[]

  // Computed properties
  get fullName(): string {
    return `${this.names} ${this.lastNames}`
  }
}

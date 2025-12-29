import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm'
import { RoleEntity } from './role.entity'
import { OrganizationEntity } from '../../organizations/entities/organization.entity'

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

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

  @Column({ type: 'varchar', nullable: true })
  socketId: string | null

  @ManyToOne(() => OrganizationEntity, (organization) => organization.users, {
    nullable: true,
  })
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity

  @ManyToMany(() => RoleEntity, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
  })
  roles: RoleEntity[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Computed property
  get fullName(): string {
    return `${this.names} ${this.lastNames}`
  }
}

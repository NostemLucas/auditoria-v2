import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { TemplateEntity } from '../../templates/entities/template.entity'
import { FrameworkEntity } from '../../maturity-frameworks/entities/framework.entity'
import { UserEntity } from '@users/entities/user.entity'
import { OrganizationEntity } from '@organizations/entities/organization.entity'
import { EvaluationEntity } from './evaluation.entity'

export enum AuditType {
  INICIAL = 'inicial',
  SEGUIMIENTO = 'seguimiento',
  RECERTIFICACION = 'recertificacion',
}

export enum AuditStatus {
  DRAFT = 'draft', // Borrador
  PLANNED = 'planned', // Planificada
  IN_PROGRESS = 'in_progress', // En progreso
  PENDING_CLOSURE = 'pending_closure', // Pendiente de cierre
  CLOSED = 'closed', // Cerrada
  CANCELLED = 'cancelled', // Cancelada
}

@Entity('audits')
export class AuditEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 200 })
  name: string

  @Column({ type: 'text', nullable: true })
  description: string | null

  // Relación con Template
  @Column({ type: 'uuid' })
  templateId: string

  @ManyToOne(() => TemplateEntity)
  @JoinColumn({ name: 'templateId' })
  template: TemplateEntity

  // Relación con Framework
  @Column({ type: 'uuid' })
  frameworkId: string

  @ManyToOne(() => FrameworkEntity)
  @JoinColumn({ name: 'frameworkId' })
  framework: FrameworkEntity

  // Tipo de auditoría
  @Column({ type: 'enum', enum: AuditType, default: AuditType.INICIAL })
  auditType: AuditType

  // Auditoría padre (para seguimientos)
  @Column({ type: 'uuid', nullable: true })
  parentAuditId: string | null

  @ManyToOne(() => AuditEntity, { nullable: true })
  @JoinColumn({ name: 'parentAuditId' })
  parentAudit: AuditEntity | null

  @OneToMany(() => AuditEntity, (audit) => audit.parentAudit)
  followUpAudits: AuditEntity[]

  // Fechas
  @Column({ type: 'date' })
  startDate: Date

  @Column({ type: 'date', nullable: true })
  endDate: Date | null

  // Estado
  @Column({ type: 'enum', enum: AuditStatus, default: AuditStatus.DRAFT })
  status: AuditStatus

  // Alcance (scope) de la auditoría
  @Column({ type: 'text', nullable: true })
  scope: string | null

  // Organización auditada
  @Column({ type: 'uuid' })
  organizationId: string

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity

  // Lead Auditor (Auditor Líder)
  @Column({ type: 'uuid' })
  leadAuditorId: string

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'leadAuditorId' })
  leadAuditor: UserEntity

  // Equipo de Auditores
  @ManyToMany(() => UserEntity)
  @JoinTable({
    name: 'audit_team',
    joinColumn: { name: 'auditId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'auditorId', referencedColumnName: 'id' },
  })
  auditTeam: UserEntity[]

  // Aprobador
  @Column({ type: 'uuid', nullable: true })
  approverId: string | null

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'approverId' })
  approver: UserEntity | null

  // Métricas
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalScore: number

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progress: number // Porcentaje de evaluaciones completadas

  // Metadatos de cierre
  @Column({ type: 'jsonb', nullable: true })
  closureMetadata: {
    closedAt: Date
    closedBy: string
    totalEvaluations: number
    totalFindings: number
    nonConformitiesCount: {
      critical: number
      major: number
      minor: number
    }
    conformitiesPercentage: number
    requiresFollowUp: boolean
    reportUrl?: string
  } | null

  // Aprobación de cierre
  @Column({ type: 'timestamp', nullable: true })
  closureApprovedAt: Date | null

  @Column({ type: 'uuid', nullable: true })
  closureApprovedBy: string | null

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'closureApprovedBy' })
  closureApprover: UserEntity | null

  // Metadatos de cancelación
  @Column({ type: 'jsonb', nullable: true })
  cancellationMetadata: {
    cancelledAt: Date
    cancelledBy: string
    cancellationReason: string
    previousStatus: AuditStatus
  } | null

  // Evaluaciones
  @OneToMany(() => EvaluationEntity, (evaluation) => evaluation.audit)
  evaluations: EvaluationEntity[]

  @Column({ type: 'boolean', default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { AuditEntity } from '../../audits/entities/audit.entity'
import { UserEntity } from '@users/entities/user.entity'

export enum ReportType {
  AUDIT_REPORT = 'audit_report',
  COMPLIANCE_MATRIX = 'compliance_matrix',
  ACTION_PLAN_SUMMARY = 'action_plan_summary',
  EXECUTIVE_SUMMARY = 'executive_summary',
  CONSOLIDATED_REPORT = 'consolidated_report', // Reporte completo con pesos, scores ponderados, y análisis detallado
}

export enum ReportStatus {
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('reports')
export class ReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 200 })
  title: string

  @Column({
    type: 'enum',
    enum: ReportType,
  })
  reportType: ReportType

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.GENERATING,
  })
  status: ReportStatus

  // Google Docs ID
  @Column({ type: 'varchar', length: 200, nullable: true })
  googleDocId: string | null

  // Google Drive URL
  @Column({ type: 'varchar', length: 500, nullable: true })
  googleDocUrl: string | null

  // Relación con Auditoría (si aplica)
  @Column({ type: 'uuid', nullable: true })
  auditId: string | null

  @ManyToOne(() => AuditEntity, { nullable: true })
  @JoinColumn({ name: 'auditId' })
  audit: AuditEntity | null

  // Usuario que generó el reporte
  @Column({ type: 'uuid' })
  generatedBy: string

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'generatedBy' })
  generator: UserEntity

  // Metadata del reporte
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null

  @Column({ type: 'boolean', default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

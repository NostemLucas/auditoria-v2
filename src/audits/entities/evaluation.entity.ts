import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { AuditEntity } from './audit.entity'
import { StandardEntity } from '../../templates/entities/standard.entity'
import { MaturityLevelEntity } from '../../maturity-frameworks/entities/maturity-level.entity'
import { UserEntity } from '../../users/entities/user.entity'
import { ActionPlanEntity } from './action-plan.entity'

export enum ComplianceStatus {
  CONFORME = 'conforme',
  NO_CONFORME_MENOR = 'no_conforme_menor',
  NO_CONFORME_MAYOR = 'no_conforme_mayor',
  OBSERVACION = 'observacion',
  NO_APLICA = 'no_aplica',
}

export interface Evidence {
  type: 'document' | 'photo' | 'video' | 'link' | 'other'
  url: string
  description: string
  uploadedAt: Date
  uploadedBy: string
}

@Entity('evaluations')
export class EvaluationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  // Relación con Audit
  @Column({ type: 'uuid' })
  auditId: string

  @ManyToOne(() => AuditEntity, (audit) => audit.evaluations)
  @JoinColumn({ name: 'auditId' })
  audit: AuditEntity

  // Relación con Standard (norma a evaluar)
  @Column({ type: 'uuid' })
  standardId: string

  @ManyToOne(() => StandardEntity)
  @JoinColumn({ name: 'standardId' })
  standard: StandardEntity

  // Relación con MaturityLevel (nivel asignado)
  @Column({ type: 'uuid', nullable: true })
  maturityLevelId: string | null

  @ManyToOne(() => MaturityLevelEntity, { nullable: true })
  @JoinColumn({ name: 'maturityLevelId' })
  maturityLevel: MaturityLevelEntity | null

  // Relación con evaluación anterior (para auditorías de seguimiento)
  @Column({ type: 'uuid', nullable: true })
  previousEvaluationId: string | null

  @ManyToOne(() => EvaluationEntity, { nullable: true })
  @JoinColumn({ name: 'previousEvaluationId' })
  previousEvaluation: EvaluationEntity | null

  // Puntaje
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  score: number

  // Estado de conformidad
  @Column({
    type: 'enum',
    enum: ComplianceStatus,
    nullable: true,
  })
  complianceStatus: ComplianceStatus | null

  // Textos (heredados del maturityLevel + personalizados)
  @Column({ type: 'text', nullable: true })
  observations: string | null

  @Column({ type: 'text', nullable: true })
  recommendations: string | null

  @Column({ type: 'text', nullable: true })
  findings: string | null

  @Column({ type: 'text', nullable: true })
  comments: string | null

  // Evidencias
  @Column({ type: 'jsonb', default: [] })
  evidence: Evidence[]

  // Evaluador
  @Column({ type: 'uuid', nullable: true })
  evaluatedBy: string | null

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'evaluatedBy' })
  evaluator: UserEntity | null

  @Column({ type: 'timestamp', nullable: true })
  evaluatedAt: Date | null

  // Estado
  @Column({ type: 'boolean', default: false })
  isCompleted: boolean

  // Planes de acción asociados
  @OneToMany(() => ActionPlanEntity, (actionPlan) => actionPlan.evaluation)
  actionPlans: ActionPlanEntity[]

  @Column({ type: 'boolean', default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { EvaluationEntity } from './evaluation.entity'
import { UserEntity } from '../../users/entities/user.entity'

export enum ActionPlanStatus {
  BORRADOR = 'borrador',
  PENDIENTE_APROBACION = 'pendiente_aprobacion',
  APROBADO = 'aprobado',
  RECHAZADO = 'rechazado',
  EN_PROGRESO = 'en_progreso',
  COMPLETADO = 'completado',
  VERIFICADO = 'verificado',
  CERRADO = 'cerrado',
  VENCIDO = 'vencido',
}

export enum VerificationResult {
  APROBADO = 'aprobado',
  RECHAZADO = 'rechazado',
}

export interface ImplementationEvidence {
  description: string
  files: string[]
  uploadedAt: Date
  uploadedBy: string
}

@Entity('action_plans')
export class ActionPlanEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  // Relación con Evaluation
  @Column({ type: 'uuid' })
  evaluationId: string

  @ManyToOne(() => EvaluationEntity, (evaluation) => evaluation.actionPlans)
  @JoinColumn({ name: 'evaluationId' })
  evaluation: EvaluationEntity

  // Relación con plan anterior (si fue rechazado y se creó uno nuevo)
  @Column({ type: 'uuid', nullable: true })
  previousActionPlanId: string | null

  @ManyToOne(() => ActionPlanEntity, { nullable: true })
  @JoinColumn({ name: 'previousActionPlanId' })
  previousActionPlan: ActionPlanEntity | null

  // Contenido del plan
  @Column({ type: 'text' })
  action: string

  @Column({ type: 'text', nullable: true })
  rootCause: string | null

  // Responsable
  @Column({ type: 'uuid' })
  responsibleId: string

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'responsibleId' })
  responsible: UserEntity

  @Column({ type: 'date' })
  dueDate: Date

  // Creación (por el auditado)
  @Column({ type: 'uuid' })
  createdBy: string

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'createdBy' })
  creator: UserEntity

  @CreateDateColumn()
  createdAt: Date

  // Estado
  @Column({
    type: 'enum',
    enum: ActionPlanStatus,
    default: ActionPlanStatus.BORRADOR,
  })
  status: ActionPlanStatus

  // Aprobación (por el auditor)
  @Column({ type: 'uuid', nullable: true })
  approvedBy: string | null

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'approvedBy' })
  approver: UserEntity | null

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date | null

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null

  // Implementación (por el auditado)
  @Column({ type: 'jsonb', default: [] })
  implementationEvidence: ImplementationEvidence[]

  @Column({ type: 'text', nullable: true })
  progressNotes: string | null

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null

  // Verificación (por el auditor en auditoría de seguimiento)
  @Column({ type: 'uuid', nullable: true })
  verifiedBy: string | null

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'verifiedBy' })
  verifier: UserEntity | null

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date | null

  @Column({ type: 'text', nullable: true })
  verificationComments: string | null

  @Column({
    type: 'enum',
    enum: VerificationResult,
    nullable: true,
  })
  verificationResult: VerificationResult | null

  @Column({ type: 'boolean', default: true })
  isActive: boolean

  @UpdateDateColumn()
  updatedAt: Date
}

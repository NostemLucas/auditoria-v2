import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { FrameworkEntity } from './framework.entity'

@Entity('maturity_levels')
export class MaturityLevelEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'uuid' })
  frameworkId: string

  @ManyToOne(() => FrameworkEntity, (framework) => framework.levels)
  @JoinColumn({ name: 'frameworkId' })
  framework: FrameworkEntity

  // Valor numérico (flexible para diferentes tipos)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  numericValue: number

  // Representación visual
  @Column({ type: 'varchar', length: 50 })
  displayValue: string

  @Column({ type: 'varchar', length: 200 })
  name: string

  @Column({ type: 'varchar', length: 50, nullable: true })
  shortName: string | null

  // Para rangos (en caso de porcentajes)
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minRange: number | null

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxRange: number | null

  // Para ponderación con pesos
  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  weight: number | null

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  score: number

  // ========== TEXTOS BASE PREDEFINIDOS ==========

  @Column({ type: 'text', nullable: true })
  description: string | null

  // Observaciones predefinidas que se mostrarán al ponderar
  @Column({ type: 'text', nullable: true })
  observations: string | null

  // Recomendaciones predefinidas para este nivel
  @Column({ type: 'text', nullable: true })
  recommendations: string | null

  // Criterios de evaluación/cumplimiento
  @Column({ type: 'text', nullable: true })
  criteria: string | null

  // Guía de implementación
  @Column({ type: 'text', nullable: true })
  implementationGuidance: string | null

  // Evidencias requeridas (JSON array de strings)
  @Column({ type: 'jsonb', nullable: true })
  requiredEvidence: string[] | null

  // Acciones sugeridas para alcanzar este nivel
  @Column({ type: 'text', nullable: true })
  suggestedActions: string | null

  // ========== FIN TEXTOS BASE ==========

  // Visual
  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string | null

  @Column({ type: 'varchar', length: 10, nullable: true })
  icon: string | null

  @Column({ type: 'int' })
  order: number

  @Column({ type: 'boolean', default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

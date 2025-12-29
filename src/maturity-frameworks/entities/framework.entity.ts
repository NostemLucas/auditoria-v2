import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm'
import { MaturityLevelEntity } from './maturity-level.entity'

export enum FrameworkType {
  MATURITY = 'maturity', // COBIT, CMMI
  COMPLIANCE = 'compliance', // ISO 27001
  ASSESSMENT = 'assessment', // Evaluaciones generales
  RISK = 'risk', // Evaluación de riesgos
}

export enum ScoringType {
  DISCRETE = 'discrete', // 0,1,2,3,4,5
  PERCENTAGE = 'percentage', // 0-100%
  BINARY = 'binary', // 0 o 1
  WEIGHTED = 'weighted', // Con pesos
  CUSTOM = 'custom', // Personalizado
}

@Entity('frameworks')
export class FrameworkEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({
    type: 'enum',
    enum: FrameworkType,
    default: FrameworkType.MATURITY,
  })
  frameworkType: FrameworkType

  @Column({
    type: 'enum',
    enum: ScoringType,
    default: ScoringType.DISCRETE,
  })
  scoringType: ScoringType

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minValue: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 5 })
  maxValue: number

  @Column({ type: 'boolean', default: false })
  allowDecimals: boolean

  @Column({ type: 'boolean', default: false })
  useWeights: boolean

  @Column({ type: 'varchar', length: 20, nullable: true })
  version: string | null

  @Column({ type: 'text', nullable: true })
  methodology: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  author: string | null

  @Column({ type: 'boolean', default: true })
  isActive: boolean

  @OneToMany(() => MaturityLevelEntity, (level) => level.framework)
  levels: MaturityLevelEntity[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

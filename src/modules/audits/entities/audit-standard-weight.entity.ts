import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm'
import { AuditEntity } from './audit.entity'
import { StandardEntity } from '@templates/entities/standard.entity'
import { UserEntity } from '@users/entities/user.entity'

/**
 * Pesos de estándares específicos por auditoría
 *
 * Permite que el Lead Auditor configure pesos diferentes
 * para cada organización auditada según sus prioridades.
 *
 * Ejemplo:
 * - Banco: Seguridad = 2.0, Calidad = 1.0
 * - Hospital: Seguridad = 1.5, Calidad = 2.0
 */
@Entity('audit_standard_weights')
@Unique(['auditId', 'standardId']) // Un peso por estándar por auditoría
export class AuditStandardWeightEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  // Relación con auditoría
  @Column({ type: 'uuid' })
  auditId: string

  @ManyToOne(() => AuditEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auditId' })
  audit: AuditEntity

  // Relación con estándar
  @Column({ type: 'uuid' })
  standardId: string

  @ManyToOne(() => StandardEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'standardId' })
  standard: StandardEntity

  // Peso asignado (decimal para flexibilidad)
  // Mayor peso = mayor importancia en el cálculo final
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  weight: number

  // Justificación del peso (opcional pero recomendado)
  @Column({ type: 'text', nullable: true })
  justification: string | null

  // Categoría para agrupación en gráficas radiales
  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null

  // Orden para visualización en reportes
  @Column({ type: 'int', default: 0 })
  displayOrder: number

  // Quién configuró este peso
  @Column({ type: 'uuid' })
  configuredBy: string

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'configuredBy' })
  configuredByUser: UserEntity

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

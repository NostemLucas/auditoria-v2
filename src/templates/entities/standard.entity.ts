import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm'
import { TemplateEntity } from './template.entity'

@Entity('standards')
export class StandardEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'uuid' })
  templateId: string

  @ManyToOne(() => TemplateEntity, (template) => template.standards)
  @JoinColumn({ name: 'templateId' })
  template: TemplateEntity

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null

  @ManyToOne(() => StandardEntity, (standard) => standard.children, {
    nullable: true,
  })
  @JoinColumn({ name: 'parentId' })
  parent: StandardEntity | null

  @OneToMany(() => StandardEntity, (standard) => standard.parent)
  children: StandardEntity[]

  @Column({ type: 'varchar', length: 50 })
  code: string

  @Column({ type: 'varchar', length: 200 })
  title: string

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({ type: 'int' })
  order: number

  @Column({ type: 'int', default: 1 })
  level: number

  @Column({ type: 'boolean', default: true })
  isAuditable: boolean

  @Column({ type: 'boolean', default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

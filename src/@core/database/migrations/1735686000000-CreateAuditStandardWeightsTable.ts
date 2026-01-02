import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm'

/**
 * Migración: Creación de tabla audit_standard_weights
 *
 * Esta tabla almacena las ponderaciones específicas que el Lead Auditor
 * asigna a cada estándar según las prioridades de la organización auditada.
 *
 * Features:
 * - Pesos personalizados por auditoría (no en plantilla)
 * - Justificación para rastreabilidad
 * - Categorización para gráficas radiales
 * - Orden de visualización configurable
 * - Soft deletes
 */
export class CreateAuditStandardWeightsTable1735686000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear tabla audit_standard_weights
    await queryRunner.createTable(
      new Table({
        name: 'audit_standard_weights',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'auditId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'standardId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'weight',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 1.0,
            isNullable: false,
          },
          {
            name: 'justification',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'displayOrder',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'configuredBy',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
        ],
      }),
      true,
    )

    // 2. Crear índice único compuesto (auditId, standardId) para evitar duplicados
    await queryRunner.createIndex(
      'audit_standard_weights',
      new TableIndex({
        name: 'UQ_audit_standard_weights_audit_standard',
        columnNames: ['auditId', 'standardId'],
        isUnique: true,
      }),
    )

    // 3. Crear índice en auditId para consultas rápidas
    await queryRunner.createIndex(
      'audit_standard_weights',
      new TableIndex({
        name: 'IDX_audit_standard_weights_auditId',
        columnNames: ['auditId'],
      }),
    )

    // 4. Crear índice en standardId para consultas rápidas
    await queryRunner.createIndex(
      'audit_standard_weights',
      new TableIndex({
        name: 'IDX_audit_standard_weights_standardId',
        columnNames: ['standardId'],
      }),
    )

    // 5. Crear índice en category para agrupaciones en gráficas
    await queryRunner.createIndex(
      'audit_standard_weights',
      new TableIndex({
        name: 'IDX_audit_standard_weights_category',
        columnNames: ['category'],
      }),
    )

    // 6. Crear foreign key hacia audits
    await queryRunner.createForeignKey(
      'audit_standard_weights',
      new TableForeignKey({
        name: 'FK_audit_standard_weights_audit',
        columnNames: ['auditId'],
        referencedTableName: 'audits',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    )

    // 7. Crear foreign key hacia standards
    await queryRunner.createForeignKey(
      'audit_standard_weights',
      new TableForeignKey({
        name: 'FK_audit_standard_weights_standard',
        columnNames: ['standardId'],
        referencedTableName: 'standards',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    )

    // 8. Crear foreign key hacia users (configuredBy)
    await queryRunner.createForeignKey(
      'audit_standard_weights',
      new TableForeignKey({
        name: 'FK_audit_standard_weights_user',
        columnNames: ['configuredBy'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    )

    // 9. Crear trigger para actualizar updatedAt automáticamente
    await queryRunner.query(`
      CREATE TRIGGER update_audit_standard_weights_updated_at
      BEFORE UPDATE ON audit_standard_weights
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Eliminar trigger
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_audit_standard_weights_updated_at ON audit_standard_weights;
    `)

    // 2. Eliminar foreign keys
    await queryRunner.dropForeignKey(
      'audit_standard_weights',
      'FK_audit_standard_weights_user',
    )
    await queryRunner.dropForeignKey(
      'audit_standard_weights',
      'FK_audit_standard_weights_standard',
    )
    await queryRunner.dropForeignKey(
      'audit_standard_weights',
      'FK_audit_standard_weights_audit',
    )

    // 3. Eliminar índices
    await queryRunner.dropIndex(
      'audit_standard_weights',
      'IDX_audit_standard_weights_category',
    )
    await queryRunner.dropIndex(
      'audit_standard_weights',
      'IDX_audit_standard_weights_standardId',
    )
    await queryRunner.dropIndex(
      'audit_standard_weights',
      'IDX_audit_standard_weights_auditId',
    )
    await queryRunner.dropIndex(
      'audit_standard_weights',
      'UQ_audit_standard_weights_audit_standard',
    )

    // 4. Eliminar tabla
    await queryRunner.dropTable('audit_standard_weights')
  }
}

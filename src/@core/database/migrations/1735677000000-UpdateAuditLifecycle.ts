import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

/**
 * Migración: Actualización del ciclo de vida de auditorías
 *
 * Cambios:
 * 1. Actualizar enum de status con nuevos estados (PLANNED, PENDING_CLOSURE, CANCELLED)
 * 2. Agregar campo scope (alcance)
 * 3. Agregar campos de metadatos de cierre (closureMetadata, closureApprovedAt, closureApprovedBy)
 * 4. Agregar campos de metadatos de cancelación (cancellationMetadata)
 */
export class UpdateAuditLifecycle1735677000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Actualizar enum de status
    await queryRunner.query(`
      -- Crear nuevo tipo enum con los nuevos estados
      CREATE TYPE audit_status_new AS ENUM (
        'draft',
        'planned',
        'in_progress',
        'pending_closure',
        'closed',
        'cancelled'
      );
    `)

    // 2. Mapear valores antiguos a nuevos (si hay datos existentes)
    await queryRunner.query(`
      -- Actualizar registros existentes con mapeo de estados antiguos a nuevos
      -- borrador -> draft
      -- en_progreso -> in_progress
      -- completada -> pending_closure (transición temporal)
      -- aprobada -> pending_closure (transición temporal)
      -- cerrada -> closed

      UPDATE audits SET status =
        CASE
          WHEN status::text = 'borrador' THEN 'draft'
          WHEN status::text = 'en_progreso' THEN 'in_progress'
          WHEN status::text = 'completada' THEN 'pending_closure'
          WHEN status::text = 'aprobada' THEN 'pending_closure'
          WHEN status::text = 'cerrada' THEN 'closed'
          ELSE status::text
        END::audit_status_new;
    `)

    // 3. Cambiar columna al nuevo tipo
    await queryRunner.query(`
      ALTER TABLE audits
      ALTER COLUMN status TYPE audit_status_new
      USING status::text::audit_status_new;
    `)

    // 4. Eliminar tipo antiguo
    await queryRunner.query(`
      DROP TYPE IF EXISTS audit_status CASCADE;
    `)

    // 5. Renombrar nuevo tipo
    await queryRunner.query(`
      ALTER TYPE audit_status_new RENAME TO audit_status;
    `)

    // 6. Actualizar default
    await queryRunner.query(`
      ALTER TABLE audits
      ALTER COLUMN status SET DEFAULT 'draft'::audit_status;
    `)

    // 7. Agregar campo scope
    await queryRunner.addColumn(
      'audits',
      new TableColumn({
        name: 'scope',
        type: 'text',
        isNullable: true,
      }),
    )

    // 8. Agregar campos de metadatos de cierre
    await queryRunner.addColumn(
      'audits',
      new TableColumn({
        name: 'closureMetadata',
        type: 'jsonb',
        isNullable: true,
      }),
    )

    await queryRunner.addColumn(
      'audits',
      new TableColumn({
        name: 'closureApprovedAt',
        type: 'timestamp',
        isNullable: true,
      }),
    )

    await queryRunner.addColumn(
      'audits',
      new TableColumn({
        name: 'closureApprovedBy',
        type: 'uuid',
        isNullable: true,
      }),
    )

    // 9. Agregar foreign key para closureApprovedBy
    await queryRunner.query(`
      ALTER TABLE audits
      ADD CONSTRAINT FK_audits_closureApprovedBy
      FOREIGN KEY ("closureApprovedBy") REFERENCES users(id);
    `)

    // 10. Agregar campo de metadatos de cancelación
    await queryRunner.addColumn(
      'audits',
      new TableColumn({
        name: 'cancellationMetadata',
        type: 'jsonb',
        isNullable: true,
      }),
    )

    // 11. Crear índice para scope (para búsquedas de texto)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audits_scope
      ON audits USING gin(to_tsvector('spanish', scope));
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Eliminar índice
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audits_scope;`)

    // 2. Eliminar foreign key
    await queryRunner.query(`
      ALTER TABLE audits
      DROP CONSTRAINT IF EXISTS FK_audits_closureApprovedBy;
    `)

    // 3. Eliminar columnas nuevas
    await queryRunner.dropColumn('audits', 'cancellationMetadata')
    await queryRunner.dropColumn('audits', 'closureApprovedBy')
    await queryRunner.dropColumn('audits', 'closureApprovedAt')
    await queryRunner.dropColumn('audits', 'closureMetadata')
    await queryRunner.dropColumn('audits', 'scope')

    // 4. Restaurar enum antiguo
    await queryRunner.query(`
      CREATE TYPE audit_status_old AS ENUM (
        'borrador',
        'en_progreso',
        'completada',
        'aprobada',
        'cerrada'
      );
    `)

    // 5. Mapear valores nuevos a antiguos
    await queryRunner.query(`
      UPDATE audits SET status =
        CASE
          WHEN status::text = 'draft' THEN 'borrador'
          WHEN status::text = 'planned' THEN 'borrador'
          WHEN status::text = 'in_progress' THEN 'en_progreso'
          WHEN status::text = 'pending_closure' THEN 'completada'
          WHEN status::text = 'closed' THEN 'cerrada'
          WHEN status::text = 'cancelled' THEN 'borrador'
          ELSE status::text
        END::audit_status_old;
    `)

    // 6. Cambiar columna al tipo antiguo
    await queryRunner.query(`
      ALTER TABLE audits
      ALTER COLUMN status TYPE audit_status_old
      USING status::text::audit_status_old;
    `)

    // 7. Eliminar tipo nuevo
    await queryRunner.query(`
      DROP TYPE IF EXISTS audit_status CASCADE;
    `)

    // 8. Renombrar tipo antiguo
    await queryRunner.query(`
      ALTER TYPE audit_status_old RENAME TO audit_status;
    `)

    // 9. Restaurar default
    await queryRunner.query(`
      ALTER TABLE audits
      ALTER COLUMN status SET DEFAULT 'borrador'::audit_status;
    `)
  }
}

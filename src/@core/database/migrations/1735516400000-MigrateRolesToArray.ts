import { MigrationInterface, QueryRunner } from 'typeorm'

export class MigrateRolesToArray1735516400000 implements MigrationInterface {
  name = 'MigrateRolesToArray1735516400000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Agregar columna roles a users (simple-array)
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "roles" text DEFAULT ''
    `)

    // 2. Migrar datos de user_roles a array en users
    await queryRunner.query(`
      UPDATE "users" u
      SET "roles" = (
        SELECT string_agg(r."name", ',')
        FROM "roles" r
        INNER JOIN "user_roles" ur ON ur."roleId" = r."id"
        WHERE ur."userId" = u."id"
      )
      WHERE EXISTS (
        SELECT 1 FROM "user_roles" WHERE "userId" = u."id"
      )
    `)

    // 3. Eliminar tablas obsoletas
    await queryRunner.query(`DROP TABLE IF EXISTS "user_roles"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recrear tabla roles
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "displayName" character varying,
        "description" character varying,
        "permissions" jsonb NOT NULL DEFAULT '[]',
        "level" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id")
      )
    `)

    // Recrear tabla user_roles
    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "userId" uuid NOT NULL,
        "roleId" uuid NOT NULL,
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("userId", "roleId")
      )
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_user_roles_userId" ON "user_roles" ("userId")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_user_roles_roleId" ON "user_roles" ("roleId")
    `)

    await queryRunner.query(`
      ALTER TABLE "user_roles"
      ADD CONSTRAINT "FK_user_roles_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `)

    await queryRunner.query(`
      ALTER TABLE "user_roles"
      ADD CONSTRAINT "FK_user_roles_roleId"
      FOREIGN KEY ("roleId") REFERENCES "roles"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `)

    // Eliminar columna roles de users
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "roles"`)
  }
}

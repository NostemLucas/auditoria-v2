import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOrganizationNitAndLogo1767021496831 implements MigrationInterface {
  name = 'AddOrganizationNitAndLogo1767021496831'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Agregar columna nit como nullable primero
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD "nit" character varying(50)`,
    )

    // 2. Asignar NITs temporales a registros existentes (basados en un contador)
    await queryRunner.query(`
      UPDATE "organizations"
      SET "nit" = 'TEMP-NIT-' || id
      WHERE "nit" IS NULL
    `)

    // 3. Hacer la columna NOT NULL
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "nit" SET NOT NULL`,
    )

    // 4. Agregar constraint de unicidad
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD CONSTRAINT "UQ_organizations_nit" UNIQUE ("nit")`,
    )

    // 5. Agregar columna logoUrl (nullable)
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD "logoUrl" character varying(500)`,
    )

    // 6. Actualizar tipos de columnas existentes para que coincidan con la entidad
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "name" TYPE character varying(200)`,
    )
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "description" TYPE text`,
    )
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "address" TYPE character varying(500)`,
    )
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "phone" TYPE character varying(50)`,
    )
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "email" TYPE character varying(200)`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir cambios de tipos de columnas
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "email" TYPE character varying`,
    )
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "phone" TYPE character varying`,
    )
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "address" TYPE character varying`,
    )
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "description" TYPE character varying`,
    )
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "name" TYPE character varying`,
    )

    // Eliminar logoUrl
    await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN "logoUrl"`)

    // Eliminar constraint de unicidad de nit
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP CONSTRAINT "UQ_organizations_nit"`,
    )

    // Eliminar columna nit
    await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN "nit"`)
  }
}

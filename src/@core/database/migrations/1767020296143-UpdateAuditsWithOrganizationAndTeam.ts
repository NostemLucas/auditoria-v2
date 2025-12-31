import { MigrationInterface, QueryRunner } from 'typeorm'

export class UpdateAuditsWithOrganizationAndTeam1767020296143 implements MigrationInterface {
  name = 'UpdateAuditsWithOrganizationAndTeam1767020296143'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "audits" DROP CONSTRAINT "FK_ca81c47e005063880099d65a9ca"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" DROP CONSTRAINT "FK_13185577e8086e68288dc905576"`,
    )
    await queryRunner.query(
      `CREATE TABLE "audit_team" ("auditId" uuid NOT NULL, "auditorId" uuid NOT NULL, CONSTRAINT "PK_54e66c9436215e77472f5e50252" PRIMARY KEY ("auditId", "auditorId"))`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_26ee1cd003d3f10d798bae6d74" ON "audit_team" ("auditId") `,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_caa5ee7d1945b2514ee9a7ae78" ON "audit_team" ("auditorId") `,
    )
    await queryRunner.query(`ALTER TABLE "audits" DROP COLUMN "auditorId"`)
    await queryRunner.query(`ALTER TABLE "audits" DROP COLUMN "auditeeId"`)
    await queryRunner.query(
      `ALTER TABLE "audits" ADD "organizationId" uuid NOT NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" ADD "leadAuditorId" uuid NOT NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" ADD CONSTRAINT "FK_59f6393ca7a2c7643fe0368a4d2" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" ADD CONSTRAINT "FK_9b5941218ca2351d086da0f2bf3" FOREIGN KEY ("leadAuditorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_team" ADD CONSTRAINT "FK_26ee1cd003d3f10d798bae6d74b" FOREIGN KEY ("auditId") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_team" ADD CONSTRAINT "FK_caa5ee7d1945b2514ee9a7ae782" FOREIGN KEY ("auditorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "audit_team" DROP CONSTRAINT "FK_caa5ee7d1945b2514ee9a7ae782"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_team" DROP CONSTRAINT "FK_26ee1cd003d3f10d798bae6d74b"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" DROP CONSTRAINT "FK_9b5941218ca2351d086da0f2bf3"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" DROP CONSTRAINT "FK_59f6393ca7a2c7643fe0368a4d2"`,
    )
    await queryRunner.query(`ALTER TABLE "audits" DROP COLUMN "leadAuditorId"`)
    await queryRunner.query(`ALTER TABLE "audits" DROP COLUMN "organizationId"`)
    await queryRunner.query(
      `ALTER TABLE "audits" ADD "auditeeId" uuid NOT NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" ADD "auditorId" uuid NOT NULL`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_caa5ee7d1945b2514ee9a7ae78"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_26ee1cd003d3f10d798bae6d74"`,
    )
    await queryRunner.query(`DROP TABLE "audit_team"`)
    await queryRunner.query(
      `ALTER TABLE "audits" ADD CONSTRAINT "FK_13185577e8086e68288dc905576" FOREIGN KEY ("auditeeId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" ADD CONSTRAINT "FK_ca81c47e005063880099d65a9ca" FOREIGN KEY ("auditorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
  }
}

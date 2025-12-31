import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateReportsTable1767030165480 implements MigrationInterface {
  name = 'CreateReportsTable1767030165480'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."reports_reporttype_enum" AS ENUM('audit_report', 'compliance_matrix', 'action_plan_summary', 'executive_summary')`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."reports_status_enum" AS ENUM('generating', 'completed', 'failed')`,
    )
    await queryRunner.query(
      `CREATE TABLE "reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(200) NOT NULL, "reportType" "public"."reports_reporttype_enum" NOT NULL, "status" "public"."reports_status_enum" NOT NULL DEFAULT 'generating', "googleDocId" character varying(200), "googleDocUrl" character varying(500), "auditId" uuid, "generatedBy" uuid NOT NULL, "metadata" jsonb NOT NULL DEFAULT '{}', "errorMessage" text, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_4c2a0a6ff6e975cd6c286afb85a" FOREIGN KEY ("auditId") REFERENCES "audits"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_5637094b9b686cf952b17290179" FOREIGN KEY ("generatedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_5637094b9b686cf952b17290179"`,
    )
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_4c2a0a6ff6e975cd6c286afb85a"`,
    )
    await queryRunner.query(`DROP TABLE "reports"`)
    await queryRunner.query(`DROP TYPE "public"."reports_status_enum"`)
    await queryRunner.query(`DROP TYPE "public"."reports_reporttype_enum"`)
  }
}

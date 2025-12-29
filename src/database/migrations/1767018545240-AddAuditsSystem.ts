import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAuditsSystem1767018545240 implements MigrationInterface {
  name = 'AddAuditsSystem1767018545240'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."audits_audittype_enum" AS ENUM('inicial', 'seguimiento', 'recertificacion')`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."audits_status_enum" AS ENUM('borrador', 'en_progreso', 'completada', 'aprobada', 'cerrada')`,
    )
    await queryRunner.query(
      `CREATE TABLE "audits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(200) NOT NULL, "description" text, "templateId" uuid NOT NULL, "frameworkId" uuid NOT NULL, "auditType" "public"."audits_audittype_enum" NOT NULL DEFAULT 'inicial', "parentAuditId" uuid, "startDate" date NOT NULL, "endDate" date, "status" "public"."audits_status_enum" NOT NULL DEFAULT 'borrador', "auditorId" uuid NOT NULL, "auditeeId" uuid NOT NULL, "approverId" uuid, "totalScore" numeric(10,2) NOT NULL DEFAULT '0', "progress" numeric(5,2) NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b2d7a2089999197dc7024820f28" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."action_plans_status_enum" AS ENUM('borrador', 'pendiente_aprobacion', 'aprobado', 'rechazado', 'en_progreso', 'completado', 'verificado', 'cerrado', 'vencido')`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."action_plans_verificationresult_enum" AS ENUM('aprobado', 'rechazado')`,
    )
    await queryRunner.query(
      `CREATE TABLE "action_plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "evaluationId" uuid NOT NULL, "previousActionPlanId" uuid, "action" text NOT NULL, "rootCause" text, "responsibleId" uuid NOT NULL, "dueDate" date NOT NULL, "createdBy" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "status" "public"."action_plans_status_enum" NOT NULL DEFAULT 'borrador', "approvedBy" uuid, "approvedAt" TIMESTAMP, "rejectionReason" text, "implementationEvidence" jsonb NOT NULL DEFAULT '[]', "progressNotes" text, "completedAt" TIMESTAMP, "verifiedBy" uuid, "verifiedAt" TIMESTAMP, "verificationComments" text, "verificationResult" "public"."action_plans_verificationresult_enum", "isActive" boolean NOT NULL DEFAULT true, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_969b73b0a2c013da5849ac154fb" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."evaluations_compliancestatus_enum" AS ENUM('conforme', 'no_conforme_menor', 'no_conforme_mayor', 'observacion', 'no_aplica')`,
    )
    await queryRunner.query(
      `CREATE TABLE "evaluations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "auditId" uuid NOT NULL, "standardId" uuid NOT NULL, "maturityLevelId" uuid, "previousEvaluationId" uuid, "score" numeric(10,2) NOT NULL DEFAULT '0', "complianceStatus" "public"."evaluations_compliancestatus_enum", "observations" text, "recommendations" text, "findings" text, "comments" text, "evidence" jsonb NOT NULL DEFAULT '[]', "evaluatedBy" uuid, "evaluatedAt" TIMESTAMP, "isCompleted" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f683b433eba0e6dae7e19b29e29" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" ADD CONSTRAINT "FK_9d388ca6ecd0a7da43c3fe144ee" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" ADD CONSTRAINT "FK_314b932d31c60b010830ab9ae4a" FOREIGN KEY ("frameworkId") REFERENCES "frameworks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" ADD CONSTRAINT "FK_dcdadf36d0fd457e25d79af6e4f" FOREIGN KEY ("parentAuditId") REFERENCES "audits"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" ADD CONSTRAINT "FK_ca81c47e005063880099d65a9ca" FOREIGN KEY ("auditorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" ADD CONSTRAINT "FK_13185577e8086e68288dc905576" FOREIGN KEY ("auditeeId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" ADD CONSTRAINT "FK_02885173f9468ad70bc3fa83bb0" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "action_plans" ADD CONSTRAINT "FK_06c2a1fe4646271321bef3b1f2a" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "action_plans" ADD CONSTRAINT "FK_87f42d8dc20fa6760eb4c739a20" FOREIGN KEY ("previousActionPlanId") REFERENCES "action_plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "action_plans" ADD CONSTRAINT "FK_9ce4c090c0cf8181acd56fff5da" FOREIGN KEY ("responsibleId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "action_plans" ADD CONSTRAINT "FK_781f25a1a95eb1563802c556ee2" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "action_plans" ADD CONSTRAINT "FK_095f93b9802678b465f88f6cdb8" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "action_plans" ADD CONSTRAINT "FK_fc7bb94a3eab3b5fa6574a18af5" FOREIGN KEY ("verifiedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "evaluations" ADD CONSTRAINT "FK_e9ec12f8a82a67ce1117f3e1ec7" FOREIGN KEY ("auditId") REFERENCES "audits"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "evaluations" ADD CONSTRAINT "FK_d53cb758081f9b05a5754c61c71" FOREIGN KEY ("standardId") REFERENCES "standards"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "evaluations" ADD CONSTRAINT "FK_52018d85debfdaaed7d7e56eead" FOREIGN KEY ("maturityLevelId") REFERENCES "maturity_levels"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "evaluations" ADD CONSTRAINT "FK_4b84bbb0a6b55324b20407281a4" FOREIGN KEY ("previousEvaluationId") REFERENCES "evaluations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "evaluations" ADD CONSTRAINT "FK_383b689eacf0a6bc4179f4a181a" FOREIGN KEY ("evaluatedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "evaluations" DROP CONSTRAINT "FK_383b689eacf0a6bc4179f4a181a"`,
    )
    await queryRunner.query(
      `ALTER TABLE "evaluations" DROP CONSTRAINT "FK_4b84bbb0a6b55324b20407281a4"`,
    )
    await queryRunner.query(
      `ALTER TABLE "evaluations" DROP CONSTRAINT "FK_52018d85debfdaaed7d7e56eead"`,
    )
    await queryRunner.query(
      `ALTER TABLE "evaluations" DROP CONSTRAINT "FK_d53cb758081f9b05a5754c61c71"`,
    )
    await queryRunner.query(
      `ALTER TABLE "evaluations" DROP CONSTRAINT "FK_e9ec12f8a82a67ce1117f3e1ec7"`,
    )
    await queryRunner.query(
      `ALTER TABLE "action_plans" DROP CONSTRAINT "FK_fc7bb94a3eab3b5fa6574a18af5"`,
    )
    await queryRunner.query(
      `ALTER TABLE "action_plans" DROP CONSTRAINT "FK_095f93b9802678b465f88f6cdb8"`,
    )
    await queryRunner.query(
      `ALTER TABLE "action_plans" DROP CONSTRAINT "FK_781f25a1a95eb1563802c556ee2"`,
    )
    await queryRunner.query(
      `ALTER TABLE "action_plans" DROP CONSTRAINT "FK_9ce4c090c0cf8181acd56fff5da"`,
    )
    await queryRunner.query(
      `ALTER TABLE "action_plans" DROP CONSTRAINT "FK_87f42d8dc20fa6760eb4c739a20"`,
    )
    await queryRunner.query(
      `ALTER TABLE "action_plans" DROP CONSTRAINT "FK_06c2a1fe4646271321bef3b1f2a"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" DROP CONSTRAINT "FK_02885173f9468ad70bc3fa83bb0"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" DROP CONSTRAINT "FK_13185577e8086e68288dc905576"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" DROP CONSTRAINT "FK_ca81c47e005063880099d65a9ca"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" DROP CONSTRAINT "FK_dcdadf36d0fd457e25d79af6e4f"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" DROP CONSTRAINT "FK_314b932d31c60b010830ab9ae4a"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" DROP CONSTRAINT "FK_9d388ca6ecd0a7da43c3fe144ee"`,
    )
    await queryRunner.query(`DROP TABLE "evaluations"`)
    await queryRunner.query(
      `DROP TYPE "public"."evaluations_compliancestatus_enum"`,
    )
    await queryRunner.query(`DROP TABLE "action_plans"`)
    await queryRunner.query(
      `DROP TYPE "public"."action_plans_verificationresult_enum"`,
    )
    await queryRunner.query(`DROP TYPE "public"."action_plans_status_enum"`)
    await queryRunner.query(`DROP TABLE "audits"`)
    await queryRunner.query(`DROP TYPE "public"."audits_status_enum"`)
    await queryRunner.query(`DROP TYPE "public"."audits_audittype_enum"`)
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddMaturityFrameworks1766985564386 implements MigrationInterface {
  name = 'AddMaturityFrameworks1766985564386'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."frameworks_frameworktype_enum" AS ENUM('maturity', 'compliance', 'assessment', 'risk')`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."frameworks_scoringtype_enum" AS ENUM('discrete', 'percentage', 'binary', 'weighted', 'custom')`,
    )
    await queryRunner.query(
      `CREATE TABLE "frameworks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "description" text, "frameworkType" "public"."frameworks_frameworktype_enum" NOT NULL DEFAULT 'maturity', "scoringType" "public"."frameworks_scoringtype_enum" NOT NULL DEFAULT 'discrete', "minValue" numeric(10,2) NOT NULL DEFAULT '0', "maxValue" numeric(10,2) NOT NULL DEFAULT '5', "allowDecimals" boolean NOT NULL DEFAULT false, "useWeights" boolean NOT NULL DEFAULT false, "version" character varying(20), "methodology" text, "author" character varying(100), "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_dfaedaffdb18492a02a1f367ac4" UNIQUE ("name"), CONSTRAINT "PK_23e178ce62668c9ce2036b7a3c2" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "maturity_levels" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "frameworkId" uuid NOT NULL, "numericValue" numeric(10,2) NOT NULL, "displayValue" character varying(50) NOT NULL, "name" character varying(200) NOT NULL, "shortName" character varying(50), "minRange" numeric(10,2), "maxRange" numeric(10,2), "weight" numeric(5,4), "score" numeric(10,2) NOT NULL DEFAULT '0', "description" text, "observations" text, "recommendations" text, "criteria" text, "implementationGuidance" text, "requiredEvidence" jsonb, "suggestedActions" text, "color" character varying(20), "icon" character varying(10), "order" integer NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_81c8def76639c01612a78d88f24" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `ALTER TABLE "maturity_levels" ADD CONSTRAINT "FK_2d5ac37a26afd5bfc1d58c1912b" FOREIGN KEY ("frameworkId") REFERENCES "frameworks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "maturity_levels" DROP CONSTRAINT "FK_2d5ac37a26afd5bfc1d58c1912b"`,
    )
    await queryRunner.query(`DROP TABLE "maturity_levels"`)
    await queryRunner.query(`DROP TABLE "frameworks"`)
    await queryRunner.query(`DROP TYPE "public"."frameworks_scoringtype_enum"`)
    await queryRunner.query(
      `DROP TYPE "public"."frameworks_frameworktype_enum"`,
    )
  }
}

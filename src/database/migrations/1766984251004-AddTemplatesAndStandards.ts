import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTemplatesAndStandards1766984251004 implements MigrationInterface {
  name = 'AddTemplatesAndStandards1766984251004'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "standards" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "templateId" uuid NOT NULL, "parentId" uuid, "code" character varying(50) NOT NULL, "title" character varying(200) NOT NULL, "description" text, "order" integer NOT NULL, "level" integer NOT NULL DEFAULT '1', "isAuditable" boolean NOT NULL DEFAULT true, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cb084ce5e29cc74efe0befbefa8" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "description" text, "version" character varying(20), "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_5624219dd33b4644599d4d4b231" UNIQUE ("name"), CONSTRAINT "PK_515948649ce0bbbe391de702ae5" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `ALTER TABLE "standards" ADD CONSTRAINT "FK_805dd318d004cfb5156b1a5ce8d" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "standards" ADD CONSTRAINT "FK_a9df2d5c058d37a47d59b7a9c34" FOREIGN KEY ("parentId") REFERENCES "standards"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "standards" DROP CONSTRAINT "FK_a9df2d5c058d37a47d59b7a9c34"`,
    )
    await queryRunner.query(
      `ALTER TABLE "standards" DROP CONSTRAINT "FK_805dd318d004cfb5156b1a5ce8d"`,
    )
    await queryRunner.query(`DROP TABLE "templates"`)
    await queryRunner.query(`DROP TABLE "standards"`)
  }
}

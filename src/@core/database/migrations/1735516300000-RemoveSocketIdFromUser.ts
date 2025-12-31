import { MigrationInterface, QueryRunner } from 'typeorm'

export class RemoveSocketIdFromUser1735516300000 implements MigrationInterface {
  name = 'RemoveSocketIdFromUser1735516300000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove socketId column from users table
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "socketId"`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore socketId column (in case we need to rollback)
    await queryRunner.query(
      `ALTER TABLE "users" ADD "socketId" character varying`,
    )
  }
}

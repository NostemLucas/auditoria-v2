import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUserSocketAndUserRoom1735516200000 implements MigrationInterface {
  name = 'AddUserSocketAndUserRoom1735516200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create user_sockets table
    await queryRunner.query(
      `CREATE TABLE "user_sockets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "socketId" character varying(100) NOT NULL,
        "rooms" text NOT NULL DEFAULT '',
        "userAgent" character varying(500),
        "ipAddress" character varying(45),
        "connectedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "disconnectedAt" TIMESTAMP,
        "lastActivityAt" TIMESTAMP NOT NULL DEFAULT now(),
        "metadata" jsonb,
        CONSTRAINT "UQ_user_sockets_socketId" UNIQUE ("socketId"),
        CONSTRAINT "PK_user_sockets" PRIMARY KEY ("id")
      )`,
    )

    // Create indexes for user_sockets
    await queryRunner.query(
      `CREATE INDEX "IDX_user_sockets_userId" ON "user_sockets" ("userId")`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_user_sockets_socketId" ON "user_sockets" ("socketId")`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_user_sockets_userId_disconnectedAt" ON "user_sockets" ("userId", "disconnectedAt")`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_user_sockets_disconnectedAt" ON "user_sockets" ("disconnectedAt")`,
    )

    // Create user_rooms table
    await queryRunner.query(
      `CREATE TABLE "user_rooms" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "roomId" uuid NOT NULL,
        "joinedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "leftAt" TIMESTAMP,
        "role" character varying(50),
        "metadata" jsonb,
        CONSTRAINT "PK_user_rooms" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_rooms_userId_roomId_leftAt" UNIQUE ("userId", "roomId", "leftAt")
      )`,
    )

    // Create indexes for user_rooms
    await queryRunner.query(
      `CREATE INDEX "IDX_user_rooms_userId" ON "user_rooms" ("userId")`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_user_rooms_roomId" ON "user_rooms" ("roomId")`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_user_rooms_userId_leftAt" ON "user_rooms" ("userId", "leftAt")`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_user_rooms_roomId_leftAt" ON "user_rooms" ("roomId", "leftAt")`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_user_rooms_leftAt" ON "user_rooms" ("leftAt")`,
    )

    // Add foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "user_sockets" ADD CONSTRAINT "FK_user_sockets_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "user_rooms" ADD CONSTRAINT "FK_user_rooms_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "user_rooms" ADD CONSTRAINT "FK_user_rooms_roomId" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "user_rooms" DROP CONSTRAINT "FK_user_rooms_roomId"`,
    )
    await queryRunner.query(
      `ALTER TABLE "user_rooms" DROP CONSTRAINT "FK_user_rooms_userId"`,
    )
    await queryRunner.query(
      `ALTER TABLE "user_sockets" DROP CONSTRAINT "FK_user_sockets_userId"`,
    )

    // Drop indexes for user_rooms
    await queryRunner.query(`DROP INDEX "IDX_user_rooms_leftAt"`)
    await queryRunner.query(`DROP INDEX "IDX_user_rooms_roomId_leftAt"`)
    await queryRunner.query(`DROP INDEX "IDX_user_rooms_userId_leftAt"`)
    await queryRunner.query(`DROP INDEX "IDX_user_rooms_roomId"`)
    await queryRunner.query(`DROP INDEX "IDX_user_rooms_userId"`)

    // Drop indexes for user_sockets
    await queryRunner.query(`DROP INDEX "IDX_user_sockets_disconnectedAt"`)
    await queryRunner.query(
      `DROP INDEX "IDX_user_sockets_userId_disconnectedAt"`,
    )
    await queryRunner.query(`DROP INDEX "IDX_user_sockets_socketId"`)
    await queryRunner.query(`DROP INDEX "IDX_user_sockets_userId"`)

    // Drop tables
    await queryRunner.query(`DROP TABLE "user_rooms"`)
    await queryRunner.query(`DROP TABLE "user_sockets"`)
  }
}

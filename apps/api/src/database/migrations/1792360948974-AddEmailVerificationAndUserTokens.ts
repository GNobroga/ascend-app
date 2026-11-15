import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailVerificationAndUserTokens1792360948974 implements MigrationInterface {
    name = 'AddEmailVerificationAndUserTokens1792360948974'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "type" character varying(30) NOT NULL, "tokenHash" character varying(64) NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "usedAt" TIMESTAMP WITH TIME ZONE, "userId" uuid NOT NULL, CONSTRAINT "PK_63764db9d9aaa4af33e07b2f4bf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b848ddeb21c22ecee6a867e9ae" ON "user_tokens"  ("tokenHash") `);
        await queryRunner.query(`CREATE INDEX "IDX_6bfdd310dccb9a4c53cea50186" ON "user_tokens"  ("expiresAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_6c87eaa5d56e55bbd1dfdeaaa6" ON "user_tokens"  ("userId", "type") `);
        await queryRunner.query(`ALTER TABLE "users" ADD "emailVerifiedAt" TIMESTAMP WITH TIME ZONE`);
        // Contas já vinculadas ao Google têm o e-mail confirmado pelo provider.
        await queryRunner.query(`UPDATE "users" u SET "emailVerifiedAt" = i."createdAt" FROM "user_identities" i WHERE i."userId" = u."id" AND i."emailVerified" = true AND u."emailVerifiedAt" IS NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_56b91d98f71e3d1b649ed6e9f3" ON "refresh_tokens"  ("expiresAt") `);
        await queryRunner.query(`ALTER TABLE "user_tokens" ADD CONSTRAINT "FK_92ce9a299624e4c4ffd99b645b6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_tokens" DROP CONSTRAINT "FK_92ce9a299624e4c4ffd99b645b6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_56b91d98f71e3d1b649ed6e9f3"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emailVerifiedAt"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6c87eaa5d56e55bbd1dfdeaaa6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6bfdd310dccb9a4c53cea50186"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b848ddeb21c22ecee6a867e9ae"`);
        await queryRunner.query(`DROP TABLE "user_tokens"`);
    }

}

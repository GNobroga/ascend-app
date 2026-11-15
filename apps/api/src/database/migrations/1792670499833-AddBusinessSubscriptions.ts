import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBusinessSubscriptions1792670499833 implements MigrationInterface {
    name = 'AddBusinessSubscriptions1792670499833'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "business_subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "status" character varying(20) NOT NULL DEFAULT 'trialing', "trialEndsAt" TIMESTAMP WITH TIME ZONE NOT NULL, "activationBonusGrantedAt" TIMESTAMP WITH TIME ZONE, "businessId" uuid NOT NULL, CONSTRAINT "REL_792c92f884d26d34d5572f0728" UNIQUE ("businessId"), CONSTRAINT "PK_2d48c7ab8b9e49e60819e24ce03" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "business_subscriptions" ADD CONSTRAINT "FK_792c92f884d26d34d5572f0728a" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`INSERT INTO "business_subscriptions" ("businessId", "status", "trialEndsAt") SELECT "id", 'trialing', now() + interval '7 days' FROM "businesses"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "business_subscriptions" DROP CONSTRAINT "FK_792c92f884d26d34d5572f0728a"`);
        await queryRunner.query(`DROP TABLE "business_subscriptions"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBusinessSubscriptionEvents1792670861689 implements MigrationInterface {
    name = 'AddBusinessSubscriptionEvents1792670861689'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "business_subscription_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "type" character varying(40) NOT NULL, "previousStatus" character varying(20), "newStatus" character varying(20) NOT NULL, "metadata" jsonb, "subscriptionId" uuid NOT NULL, "actorUserId" uuid, CONSTRAINT "PK_afdf18407085999ea0fa8bad9c8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9c08b27915b08a2e8a5f3bc53f" ON "business_subscription_events"  ("subscriptionId", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "business_subscription_events" ADD CONSTRAINT "FK_2f1ec62ec983f2bf6c4c093414c" FOREIGN KEY ("subscriptionId") REFERENCES "business_subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "business_subscription_events" ADD CONSTRAINT "FK_61a5cd9b2e4f6e4f32a79562ba3" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`INSERT INTO "business_subscription_events" ("subscriptionId", "type", "previousStatus", "newStatus", "metadata", "createdAt") SELECT "id", 'trial_started', NULL, "status", jsonb_build_object('trialEndsAt', "trialEndsAt"), "createdAt" FROM "business_subscriptions"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "business_subscription_events" DROP CONSTRAINT "FK_61a5cd9b2e4f6e4f32a79562ba3"`);
        await queryRunner.query(`ALTER TABLE "business_subscription_events" DROP CONSTRAINT "FK_2f1ec62ec983f2bf6c4c093414c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9c08b27915b08a2e8a5f3bc53f"`);
        await queryRunner.query(`DROP TABLE "business_subscription_events"`);
    }

}

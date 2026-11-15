import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBusinessInvitations1792503295624 implements MigrationInterface {
    name = 'AddBusinessInvitations1792503295624'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "business_invitations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "email" character varying(320) NOT NULL, "roles" character varying(50) array NOT NULL, "tokenHash" character varying(64) NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "acceptedAt" TIMESTAMP WITH TIME ZONE, "declinedAt" TIMESTAMP WITH TIME ZONE, "revokedAt" TIMESTAMP WITH TIME ZONE, "businessId" uuid NOT NULL, "invitedById" uuid, CONSTRAINT "PK_6961c1a5c94f4c01e2eb6e4b299" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b6d486853727cf98f1a0ecaee2" ON "business_invitations"  ("tokenHash") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_361a3ceded2745a77926a539cf" ON "business_invitations"  ("businessId", "email") WHERE "acceptedAt" IS NULL AND "declinedAt" IS NULL AND "revokedAt" IS NULL`);
        await queryRunner.query(`ALTER TABLE "business_invitations" ADD CONSTRAINT "FK_b62e74c4503abeeddf12d2a4aa3" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "business_invitations" ADD CONSTRAINT "FK_28065c021887b28dc9e0529e0d9" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "business_invitations" DROP CONSTRAINT "FK_28065c021887b28dc9e0529e0d9"`);
        await queryRunner.query(`ALTER TABLE "business_invitations" DROP CONSTRAINT "FK_b62e74c4503abeeddf12d2a4aa3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_361a3ceded2745a77926a539cf"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b6d486853727cf98f1a0ecaee2"`);
        await queryRunner.query(`DROP TABLE "business_invitations"`);
    }

}

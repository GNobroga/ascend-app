import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWhatsAppConnections1792582252170 implements MigrationInterface {
    name = 'AddWhatsAppConnections1792582252170'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "business_whatsapp_connections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "instanceName" character varying(100) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'disconnected', "phoneNumber" character varying(20), "enabled" boolean NOT NULL DEFAULT true, "termsAcceptedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "connectedAt" TIMESTAMP WITH TIME ZONE, "disconnectedAt" TIMESTAMP WITH TIME ZONE, "businessId" uuid NOT NULL, CONSTRAINT "REL_d96e2b90a0ed023876affee21e" UNIQUE ("businessId"), CONSTRAINT "PK_df08a381a7568a6c6fe0f8c5542" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9741e92a1f0b6626ab203118ab" ON "business_whatsapp_connections"  ("instanceName") `);
        await queryRunner.query(`ALTER TABLE "customers" ADD "whatsappOptedOutAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "business_whatsapp_connections" ADD CONSTRAINT "FK_d96e2b90a0ed023876affee21ec" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "business_whatsapp_connections" DROP CONSTRAINT "FK_d96e2b90a0ed023876affee21ec"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "whatsappOptedOutAt"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9741e92a1f0b6626ab203118ab"`);
        await queryRunner.query(`DROP TABLE "business_whatsapp_connections"`);
    }

}

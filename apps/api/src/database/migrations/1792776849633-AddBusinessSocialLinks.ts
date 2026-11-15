import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBusinessSocialLinks1792776849633 implements MigrationInterface {
    name = 'AddBusinessSocialLinks1792776849633'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "business_social_links" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "network" character varying(20) NOT NULL, "url" character varying(2048) NOT NULL, "businessId" uuid NOT NULL, CONSTRAINT "PK_c1a8bb14935f51e33cb09a6818b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_800654ca116ac6e4c1c5f54725" ON "business_social_links"  ("businessId", "network") `);
        await queryRunner.query(`ALTER TABLE "business_social_links" ADD CONSTRAINT "FK_866e1dff83ced24625932be251d" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "business_social_links" DROP CONSTRAINT "FK_866e1dff83ced24625932be251d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_800654ca116ac6e4c1c5f54725"`);
        await queryRunner.query(`DROP TABLE "business_social_links"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBusinessPhone1792612193996 implements MigrationInterface {
    name = 'AddBusinessPhone1792612193996'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "businesses" ADD "phone" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "businesses" ADD "phoneIsWhatsApp" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN "phoneIsWhatsApp"`);
        await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN "phone"`);
    }

}

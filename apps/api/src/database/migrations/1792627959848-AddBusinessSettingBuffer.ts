import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBusinessSettingBuffer1792627959848 implements MigrationInterface {
    name = 'AddBusinessSettingBuffer1792627959848'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "business_settings" ADD "bufferMinutes" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "business_settings" DROP COLUMN "bufferMinutes"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class StoreProfessionalPhotoKey1792460000000 implements MigrationInterface {
    name = 'StoreProfessionalPhotoKey1792460000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "professionals" RENAME COLUMN "photoUrl" TO "photoKey"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "professionals" RENAME COLUMN "photoKey" TO "photoUrl"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserPhotoKey1792516756062 implements MigrationInterface {
    name = 'AddUserPhotoKey1792516756062'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "photoKey" character varying(2048)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "photoKey"`);
    }

}

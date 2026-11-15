import { MigrationInterface, QueryRunner } from "typeorm";

export class StoreImageKeys1792400000000 implements MigrationInterface {
    name = 'StoreImageKeys1792400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "business_images" RENAME COLUMN "url" TO "storageKey"`);
        await queryRunner.query(`ALTER TABLE "service_images" RENAME COLUMN "url" TO "storageKey"`);
        await queryRunner.query(`ALTER TABLE "package_images" RENAME COLUMN "url" TO "storageKey"`);
        await queryRunner.query(`ALTER TABLE "businesses" RENAME COLUMN "logoUrl" TO "logoKey"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "businesses" RENAME COLUMN "logoKey" TO "logoUrl"`);
        await queryRunner.query(`ALTER TABLE "package_images" RENAME COLUMN "storageKey" TO "url"`);
        await queryRunner.query(`ALTER TABLE "service_images" RENAME COLUMN "storageKey" TO "url"`);
        await queryRunner.query(`ALTER TABLE "business_images" RENAME COLUMN "storageKey" TO "url"`);
    }

}

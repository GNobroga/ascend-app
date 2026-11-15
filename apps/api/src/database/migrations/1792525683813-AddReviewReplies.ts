import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReviewReplies1792525683813 implements MigrationInterface {
    name = 'AddReviewReplies1792525683813'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_45a6cefc24d5af16842be69a65"`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD "reply" text`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD "repliedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_45a6cefc24d5af16842be69a65" ON "reviews"  ("appointmentId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_45a6cefc24d5af16842be69a65"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "repliedAt"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "reply"`);
        await queryRunner.query(`CREATE INDEX "IDX_45a6cefc24d5af16842be69a65" ON "reviews" USING btree ("appointmentId") `);
    }

}

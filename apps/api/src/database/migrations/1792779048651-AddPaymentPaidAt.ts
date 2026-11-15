import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaymentPaidAt1792779048651 implements MigrationInterface {
    name = 'AddPaymentPaidAt1792779048651'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" ADD "paidAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`UPDATE "payments" SET "paidAt" = "createdAt"`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "paidAt" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "paidAt" SET DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "paidAt"`);
    }

}

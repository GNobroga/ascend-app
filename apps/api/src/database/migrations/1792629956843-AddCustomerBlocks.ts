import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCustomerBlocks1792629956843 implements MigrationInterface {
    name = 'AddCustomerBlocks1792629956843'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "customer_blocks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "type" character varying(20) NOT NULL, "reason" text, "until" TIMESTAMP WITH TIME ZONE, "feeAmount" numeric(10,2), "feePaidAt" TIMESTAMP WITH TIME ZONE, "feePaymentNotes" text, "liftedAt" TIMESTAMP WITH TIME ZONE, "customerId" uuid NOT NULL, "feePaymentMethodId" uuid, "blockedByUserId" uuid, "liftedByUserId" uuid, CONSTRAINT "PK_12ee7297e50becaacbd1457c002" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_customer_blocks_open" ON "customer_blocks"  ("customerId") WHERE "liftedAt" IS NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_7f067608f85b94884e0b7cc35f" ON "customer_blocks"  ("customerId", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "business_settings" ADD "unblockFee" numeric(10,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "customer_blocks" ADD CONSTRAINT "FK_d1fbcdd938e1276680ee852a33b" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "customer_blocks" ADD CONSTRAINT "FK_cb46b5c4320be48e5add3f27a4e" FOREIGN KEY ("feePaymentMethodId") REFERENCES "business_payment_methods"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "customer_blocks" ADD CONSTRAINT "FK_de2790cddceceff0bde60a3a443" FOREIGN KEY ("blockedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "customer_blocks" ADD CONSTRAINT "FK_73d9da728699e9eaf3106f84c27" FOREIGN KEY ("liftedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "customer_blocks" DROP CONSTRAINT "FK_73d9da728699e9eaf3106f84c27"`);
        await queryRunner.query(`ALTER TABLE "customer_blocks" DROP CONSTRAINT "FK_de2790cddceceff0bde60a3a443"`);
        await queryRunner.query(`ALTER TABLE "customer_blocks" DROP CONSTRAINT "FK_cb46b5c4320be48e5add3f27a4e"`);
        await queryRunner.query(`ALTER TABLE "customer_blocks" DROP CONSTRAINT "FK_d1fbcdd938e1276680ee852a33b"`);
        await queryRunner.query(`ALTER TABLE "business_settings" DROP COLUMN "unblockFee"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7f067608f85b94884e0b7cc35f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_customer_blocks_open"`);
        await queryRunner.query(`DROP TABLE "customer_blocks"`);
    }

}

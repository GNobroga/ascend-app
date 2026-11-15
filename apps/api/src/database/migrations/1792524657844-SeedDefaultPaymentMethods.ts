import { MigrationInterface, QueryRunner } from "typeorm";

const DEFAULTS = ['Dinheiro', 'Pix', 'Cartão de crédito', 'Cartão de débito'];

export class SeedDefaultPaymentMethods1792524657844 implements MigrationInterface {
    name = 'SeedDefaultPaymentMethods1792524657844'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `INSERT INTO "business_payment_methods" ("businessId", "name")
             SELECT b.id, d.name FROM "businesses" b CROSS JOIN unnest($1::varchar[]) AS d(name)
             WHERE NOT EXISTS (SELECT 1 FROM "business_payment_methods" m WHERE m."businessId" = b.id)`,
            [DEFAULTS],
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM "business_payment_methods" m
             WHERE m."name" = ANY($1::varchar[])
               AND NOT EXISTS (SELECT 1 FROM "payments" p WHERE p."paymentMethodId" = m.id)`,
            [DEFAULTS],
        );
    }

}

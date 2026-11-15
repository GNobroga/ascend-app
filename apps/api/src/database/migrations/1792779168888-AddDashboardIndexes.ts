import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDashboardIndexes1792779168888 implements MigrationInterface {
    name = 'AddDashboardIndexes1792779168888'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_939f03487247fc2bdbc4ff6ab8" ON "payments" ("paidAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_e896adb7fe7ccb8d463c938e84" ON "reviews" ("businessId", "createdAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_e896adb7fe7ccb8d463c938e84"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_939f03487247fc2bdbc4ff6ab8"`);
    }

}

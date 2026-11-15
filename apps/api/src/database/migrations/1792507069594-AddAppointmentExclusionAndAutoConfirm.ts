import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAppointmentExclusionAndAutoConfirm1792507069594 implements MigrationInterface {
    name = 'AddAppointmentExclusionAndAutoConfirm1792507069594'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // btree_gist permite usar `uuid WITH =` junto com o range na mesma restrição gist.
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);
        await queryRunner.query(`ALTER TABLE "business_settings" ADD "autoConfirmOnlineBookings" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "EXCL_appointments_professional_period" EXCLUDE USING gist ("professionalId" WITH =, tstzrange("startAt", "endAt") WITH &&) WHERE (status NOT IN ('cancelled', 'no_show') AND "deletedAt" IS NULL)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "EXCL_appointments_professional_period"`);
        await queryRunner.query(`ALTER TABLE "business_settings" DROP COLUMN "autoConfirmOnlineBookings"`);
    }

}

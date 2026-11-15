import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAppointmentReminders1792518927859 implements MigrationInterface {
    name = 'AddAppointmentReminders1792518927859'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "business_settings" ADD "reminderHoursBefore" integer NOT NULL DEFAULT '24'`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD "reminderSentAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`CREATE INDEX "IDX_appointments_reminder_pending" ON "appointments"  ("startAt") WHERE "reminderSentAt" IS NULL AND status = 'confirmed' AND "deletedAt" IS NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_appointments_reminder_pending"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN "reminderSentAt"`);
        await queryRunner.query(`ALTER TABLE "business_settings" DROP COLUMN "reminderHoursBefore"`);
    }

}

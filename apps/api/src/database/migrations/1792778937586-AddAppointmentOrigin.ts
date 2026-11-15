import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAppointmentOrigin1792778937586 implements MigrationInterface {
    name = 'AddAppointmentOrigin1792778937586'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointments" ADD "origin" character varying(20)`);
        await queryRunner.query(`
            UPDATE "appointments" a
            SET "origin" = CASE
                WHEN EXISTS (SELECT 1 FROM "business_members" m WHERE m."businessId" = c."businessId" AND m."userId" = h."changedByUserId") THEN 'team'
                WHEN c."userId" = h."changedByUserId" THEN 'customer'
            END
            FROM (
                SELECT DISTINCT ON ("appointmentId") "appointmentId", "changedByUserId"
                FROM "appointment_status_histories"
                WHERE "previousStatus" IS NULL
                ORDER BY "appointmentId", "createdAt"
            ) h, "customers" c
            WHERE h."appointmentId" = a."id" AND c."id" = a."customerId"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN "origin"`);
    }

}

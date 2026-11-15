import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppointmentsService } from './appointments.service.js';

@Injectable()
export class AppointmentRemindersTask {

    private readonly logger = new Logger(AppointmentRemindersTask.name);

    constructor(private readonly appointments: AppointmentsService) { }

    @Cron(CronExpression.EVERY_5_MINUTES, { name: 'appointment-reminders' })
    async sendDueReminders(): Promise<void> {
        try {
            const sent = await this.appointments.sendDueReminders();
            if (sent) {
                this.logger.log(`Lembretes de agendamento disparados: ${sent}.`);
            }
        } catch (error) {
            this.logger.error('Falha ao disparar lembretes de agendamento.', error instanceof Error ? error.stack : error);
        }
    }
}

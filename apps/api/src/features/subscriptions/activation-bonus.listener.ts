import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppointmentEvent, type AppointmentCreatedEvent } from '../appointments/index.js';
import { BusinessSubscriptionsService } from '../businesses/index.js';

@Injectable()
export class ActivationBonusListener {

    constructor(private readonly subscriptions: BusinessSubscriptionsService) { }

    @OnEvent(AppointmentEvent.CREATED, { async: true })
    async onAppointmentCreated(event: AppointmentCreatedEvent): Promise<void> {
        await this.subscriptions.grantActivationBonus(event.businessId);
    }
}

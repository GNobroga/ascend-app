import { Injectable } from '@nestjs/common';
import type { BusinessSubscriptionEntity } from '../../database/entities/business-subscription.entity.js';
import { AppointmentsService } from '../appointments/index.js';
import { BusinessHoursService, BusinessSubscriptionsService, type SubscriptionAccess } from '../businesses/index.js';
import { ServicesService } from '../catalog/index.js';
import { ProfessionalsService } from '../professionals/index.js';

export interface ActivationSteps {
    businessHours: boolean;
    services: boolean;
    professionals: boolean;
    firstAppointment: boolean;
}

export interface SubscriptionOverview {
    subscription: BusinessSubscriptionEntity;
    access: SubscriptionAccess;
    activationSteps: ActivationSteps;
}

@Injectable()
export class SubscriptionsService {

    constructor(
        private readonly subscriptions: BusinessSubscriptionsService,
        private readonly hours: BusinessHoursService,
        private readonly services: ServicesService,
        private readonly professionals: ProfessionalsService,
        private readonly appointments: AppointmentsService,
    ) { }

    async getOverview(businessId: string): Promise<SubscriptionOverview> {
        const [subscription, hours, services, professionals, firstAppointment] = await Promise.all([
            this.subscriptions.getByBusiness(businessId),
            this.hours.findByBusiness(businessId),
            this.services.hasActive(businessId),
            this.professionals.hasBookable(businessId),
            this.appointments.hasAny(businessId),
        ]);
        return {
            subscription,
            access: BusinessSubscriptionsService.accessOf(subscription),
            activationSteps: { businessHours: hours.length > 0, services, professionals, firstAppointment },
        };
    }
}

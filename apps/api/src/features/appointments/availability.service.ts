import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, MoreThan, Not, Repository } from 'typeorm';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { addDays, toLocalDate, weekdayOf, zonedTimeToUtc } from '../../common/utilities/time-zone.js';
import { AppointmentEntity } from '../../database/entities/appointment.entity.js';
import type { BusinessEntity } from '../../database/entities/business.entity.js';
import type { BusinessSettingEntity } from '../../database/entities/business-setting.entity.js';
import { BusinessHoursService, BusinessSettingsService } from '../businesses/index.js';
import { PackagesService, ServicesService } from '../catalog/index.js';
import { ProfessionalsService, ProfessionalTimeOffsService, ProfessionalWorkingHoursService } from '../professionals/index.js';
import { computeSlots, fitsInDay, intersect, type Interval, type ProfessionalDay, type Slot } from './slot-calculator.js';

const MINUTE_MS = 60 * 1000;

export const STATUSES_THAT_FREE_THE_SLOT = [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW];

export interface Offer {
    serviceIds?: string[];
    packageId?: string;
}

export interface AvailabilityQuery extends Offer {
    date: string;
    professionalId?: string;
}

export interface Availability {
    date: string;
    timezone: string;
    durationMinutes: number;
    slots: Slot[];
}

export interface BookingRequest extends Offer {
    professionalId: string;
    startAt: Date;
    durationMinutes?: number;
    ignoreAppointmentId?: string;
}

export const ensureSingleOffer = (offer: Offer): void => {
    if (Boolean(offer.serviceIds?.length) === Boolean(offer.packageId)) {
        throw new AppException(ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, 'Dados inválidos.', [
            { path: 'packageId', message: 'send exactly one of packageId or serviceIds' },
        ]);
    }
};

@Injectable()
export class AvailabilityService {

    constructor(
        @InjectRepository(AppointmentEntity) private readonly appointments: Repository<AppointmentEntity>,
        private readonly businessHours: BusinessHoursService,
        private readonly settings: BusinessSettingsService,
        private readonly services: ServicesService,
        private readonly packages: PackagesService,
        private readonly professionals: ProfessionalsService,
        private readonly workingHours: ProfessionalWorkingHoursService,
        private readonly timeOffs: ProfessionalTimeOffsService,
    ) { }

    forCustomers(business: BusinessEntity, query: AvailabilityQuery): Promise<Availability> {
        return this.compute(business, query, true);
    }

    forTeam(business: BusinessEntity, query: AvailabilityQuery): Promise<Availability> {
        return this.compute(business, query, false);
    }

    async ensureBookableByCustomer(business: BusinessEntity, request: BookingRequest): Promise<void> {
        const date = toLocalDate(request.startAt, business.timezone);
        const { slots } = await this.compute(business, { date, serviceIds: request.serviceIds, packageId: request.packageId, professionalId: request.professionalId }, true);
        if (!slots.some((s) => s.start === request.startAt.getTime())) {
            throw AvailabilityService.unavailable();
        }
    }

    async ensureBookableByTeam(business: BusinessEntity, request: BookingRequest): Promise<void> {
        ensureSingleOffer(request);
        const durationMinutes = request.durationMinutes ?? await this.durationOf(business.id, request, false);
        await this.bookableProfessionalIds(business.id, request);
        const setting = await this.settings.getByBusiness(business.id);

        const date = toLocalDate(request.startAt, business.timezone);
        const [day] = await this.loadDays(business, date, [request.professionalId], setting.bufferMinutes * MINUTE_MS, request.ignoreAppointmentId);
        const start = request.startAt.getTime();
        if (!day || !fitsInDay(day, { start, end: start + durationMinutes * MINUTE_MS })) {
            throw AvailabilityService.unavailable();
        }
    }

    static unavailable(): AppException {
        return new AppException(ErrorCode.APPOINTMENT_SLOT_UNAVAILABLE, HttpStatus.CONFLICT, 'Horário indisponível.');
    }

    private async compute(business: BusinessEntity, query: AvailabilityQuery, enforceBookingWindow: boolean): Promise<Availability> {
        ensureSingleOffer(query);
        const { date } = query;
        const durationMinutes = await this.durationOf(business.id, query, enforceBookingWindow);
        const professionalIds = await this.bookableProfessionalIds(business.id, query);
        const availability: Availability = { date, timezone: business.timezone, durationMinutes, slots: [] };

        const setting = await this.settings.getByBusiness(business.id);
        const now = Date.now();
        if (enforceBookingWindow && !AvailabilityService.isWithinBookingWindow(date, setting, business.timezone, now)) {
            return availability;
        }

        const days = await this.loadDays(business, date, professionalIds, setting.bufferMinutes * MINUTE_MS);
        availability.slots = computeSlots(days, {
            durationMs: durationMinutes * MINUTE_MS,
            stepMs: setting.slotIntervalMinutes * MINUTE_MS,
            notBefore: enforceBookingWindow ? now + setting.minimumAdvanceBookingMinutes * MINUTE_MS : undefined,
        });
        return availability;
    }

    private async loadDays(business: BusinessEntity, date: string, professionalIds: string[], bufferMs: number, ignoreAppointmentId?: string): Promise<ProfessionalDay[]> {
        const { timezone } = business;
        const weekday = weekdayOf(date);
        const opening = (await this.businessHours.findByBusiness(business.id)).find((h) => h.dayOfWeek === weekday);
        if (!opening || opening.isClosed || !opening.openTime || !opening.closeTime || !professionalIds.length) {
            return [];
        }
        const businessWindow = AvailabilityService.toInterval(date, opening.openTime, opening.closeTime, timezone);

        const dayStart = zonedTimeToUtc(date, '00:00', timezone);
        const dayEnd = zonedTimeToUtc(addDays(date, 1), '00:00', timezone);
        const [hours, timeOffs, appointments] = await Promise.all([
            this.workingHours.findForDay(professionalIds, weekday),
            this.timeOffs.findOverlapping(professionalIds, dayStart, dayEnd),
            this.appointments.find({
                where: {
                    ...(ignoreAppointmentId && { id: Not(ignoreAppointmentId) }),
                    professional: { id: In(professionalIds) },
                    startAt: LessThan(new Date(dayEnd.getTime() + bufferMs)),
                    endAt: MoreThan(new Date(dayStart.getTime() - bufferMs)),
                    status: Not(In(STATUSES_THAT_FREE_THE_SLOT)),
                },
                relations: { professional: true },
            }),
        ]);

        return professionalIds.map((professionalId) => {
            const shift = hours.find((h) => h.professional.id === professionalId);
            const window = shift && !shift.isDayOff && shift.startTime && shift.endTime
                ? intersect(businessWindow, AvailabilityService.toInterval(date, shift.startTime, shift.endTime, timezone))
                : null;
            const busy = [
                ...timeOffs
                    .filter((t) => t.professional.id === professionalId)
                    .map((t) => ({ start: t.startAt.getTime(), end: t.endAt.getTime() })),
                ...appointments
                    .filter((a) => a.professional.id === professionalId)
                    .map((a) => ({ start: a.startAt.getTime() - bufferMs, end: a.endAt.getTime() + bufferMs })),
            ];
            return { professionalId, window, busy };
        });
    }

    private async durationOf(businessId: string, offer: Offer, online: boolean): Promise<number> {
        const services = offer.packageId
            ? (await this.packages.getForBooking(businessId, offer.packageId, { online })).services.map((link) => link.service)
            : await this.services.getMany(businessId, offer.serviceIds ?? [], { activeOnly: online });
        return services.reduce((total, s) => total + s.durationInMinutes, 0);
    }

    private async bookableProfessionalIds(businessId: string, query: Offer & { professionalId?: string }): Promise<string[]> {
        const professionals = query.packageId
            ? await this.professionals.listBookableForPackage(businessId, query.packageId)
            : await this.professionals.listBookable(businessId, query.serviceIds);
        const ids = professionals.map((p) => p.id);
        if (!query.professionalId) {
            return ids;
        }
        if (!ids.includes(query.professionalId)) {
            throw new AppException(ErrorCode.PROFESSIONAL_NOT_FOUND, HttpStatus.NOT_FOUND, 'Profissional não encontrado ou não atende este pacote ou serviços.');
        }
        return [query.professionalId];
    }

    private static isWithinBookingWindow(date: string, setting: BusinessSettingEntity, timezone: string, now: number): boolean {
        const today = toLocalDate(new Date(now), timezone);
        return date >= today && date <= addDays(today, setting.maximumAdvanceBookingDays);
    }

    private static toInterval(date: string, start: string, end: string, timezone: string): Interval {
        return { start: zonedTimeToUtc(date, start, timezone).getTime(), end: zonedTimeToUtc(date, end, timezone).getTime() };
    }
}

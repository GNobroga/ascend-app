import { HttpStatus, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThan, LessThanOrEqual, MoreThan, QueryFailedError, Repository, type EntityManager, type FindOptionsWhere } from 'typeorm';
import { AppointmentOrigin } from '../../common/enums/appointment-origin.enum.js';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum.js';
import { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { CommissionMode } from '../../common/enums/commission-mode.enum.js';
import { PaymentStatus } from '../../common/enums/payment-status.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { AppointmentServiceEntity } from '../../database/entities/appointment-service.entity.js';
import { AppointmentStatusHistoryEntity } from '../../database/entities/appointment-status-history.entity.js';
import { AppointmentEntity } from '../../database/entities/appointment.entity.js';
import type { BusinessSettingEntity } from '../../database/entities/business-setting.entity.js';
import type { BusinessEntity } from '../../database/entities/business.entity.js';
import { PaymentEntity } from '../../database/entities/payment.entity.js';
import type { ProfessionalEntity } from '../../database/entities/professional.entity.js';

import { BusinessSettingsService, BusinessSubscriptionsService, BusinessesService, type BusinessMembership } from '../businesses/index.js';
import { PackagesService, ServicesService } from '../catalog/index.js';
import { CustomersService } from '../customers/index.js';
import { ProfessionalsService } from '../professionals/index.js';
import {
    AppointmentEvent,
    type AppointmentCreatedEvent,
    type AppointmentReminderDueEvent,
    type AppointmentRescheduledEvent,
    type AppointmentStatusChangedEvent,
} from './appointment-events.js';
import { AvailabilityService } from './availability.service.js';
import { pricePackage, priceServices, roundMoney, type AppointmentPricing } from './pricing.js';
import type {
    AppointmentListQueryDto,
    ChangeAppointmentStatusDto,
    CustomerAppointmentListQueryDto,
    CustomerAppointmentSummary,
    CreateAppointmentDto,
    CreateMyAppointmentDto,
    MyAppointmentListQueryDto,
    RescheduleAppointmentDto,
    UpdateAppointmentServicesDto,
} from './dto/appointment.dto.js';

const toCents = (value: number): number => Math.round(value * 100);

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const REVIEW_WINDOW_MS = 30 * 24 * HOUR_MS;
const MAX_AGENDA_RANGE_MS = 31 * 24 * HOUR_MS;
const EXCLUSION_VIOLATION = '23P01';
const REMINDER_BATCH_SIZE = 500;

const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
    [AppointmentStatus.PENDING]: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
    [AppointmentStatus.CONFIRMED]: [AppointmentStatus.IN_PROGRESS, AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
    [AppointmentStatus.IN_PROGRESS]: [AppointmentStatus.COMPLETED],
    [AppointmentStatus.COMPLETED]: [],
    [AppointmentStatus.CANCELLED]: [],
    [AppointmentStatus.NO_SHOW]: [],
};
const STATUSES_AFTER_START: AppointmentStatus[] = [AppointmentStatus.IN_PROGRESS, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW];
const OPEN_STATUSES: AppointmentStatus[] = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];

const TEAM_RELATIONS = { customer: true, professional: true, package: true, services: { service: true }, payments: true, reviews: true } as const;
const CUSTOMER_RELATIONS = { customer: { business: { setting: true } }, professional: true, package: true, services: { service: true }, reviews: true } as const;
const NOTIFICATION_RELATIONS = {
    customer: { user: true, business: true },
    professional: { member: { user: true } },
    package: true,
    services: { service: true },
} as const;


interface CustomerSummaryRow {
    total: string;
    completed: string;
    cancelled: string;
    noShow: string;
    spent: string;
    lastVisitAt: Date | null;
    nextAppointmentAt: Date | null;
}

interface StatusChange {
    status: AppointmentStatus;
    reason?: string | null;
    changedByUserId: string | null;
    reminderSentAt?: Date | null;
}

@Injectable()
export class AppointmentsService {

    constructor(
        @InjectRepository(AppointmentEntity) private readonly appointments: Repository<AppointmentEntity>,
        private readonly availability: AvailabilityService,
        private readonly businesses: BusinessesService,
        private readonly settings: BusinessSettingsService,
        private readonly subscriptions: BusinessSubscriptionsService,
        private readonly services: ServicesService,
        private readonly packages: PackagesService,
        private readonly professionals: ProfessionalsService,
        private readonly customers: CustomersService,
        private readonly events: EventEmitter2,
    ) { }

    hasAny(businessId: string): Promise<boolean> {
        return this.appointments.exists({ where: AppointmentsService.ofBusiness(businessId), withDeleted: true });
    }

    async listForTeam(businessId: string, query: AppointmentListQueryDto): Promise<AppointmentEntity[]> {
        if (query.to <= query.from || query.to.getTime() - query.from.getTime() > MAX_AGENDA_RANGE_MS) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, 'Dados inválidos.', [
                { path: 'to', message: 'to must be after from and at most 31 days later' },
            ]);
        }
        return this.appointments.find({
            where: {
                ...AppointmentsService.ofBusiness(businessId),
                startAt: LessThan(query.to),
                endAt: MoreThan(query.from),
                ...(query.professionalId && { professional: { id: query.professionalId } }),
                ...(query.status && { status: query.status }),
            },
            relations: TEAM_RELATIONS,
            order: { startAt: 'ASC' },
            withDeleted: true,
        });
    }

    async listForCustomerRecord(businessId: string, customerId: string, query: CustomerAppointmentListQueryDto): Promise<[AppointmentEntity[], number]> {
        await this.customers.getById(businessId, customerId);
        return this.appointments.findAndCount({
            where: {
                deletedAt: IsNull(),
                customer: { id: customerId, business: { id: businessId } },
                ...(query.status && { status: query.status }),
            },
            relations: TEAM_RELATIONS,
            order: { startAt: 'DESC' },
            skip: query.skip,
            take: query.pageSize,
            withDeleted: true,
        });
    }

    async summarizeForCustomerRecord(businessId: string, customerId: string): Promise<CustomerAppointmentSummary> {
        await this.customers.getById(businessId, customerId);
        const [row]: CustomerSummaryRow[] = await this.appointments.query(`
            SELECT
                count(*) AS total,
                count(*) FILTER (WHERE status = $2) AS completed,
                count(*) FILTER (WHERE status = $3) AS cancelled,
                count(*) FILTER (WHERE status = $4) AS "noShow",
                coalesce(sum("totalPrice") FILTER (WHERE status = $2), 0) AS spent,
                max("startAt") FILTER (WHERE status = $2) AS "lastVisitAt",
                min("startAt") FILTER (WHERE status = ANY($5) AND "startAt" > now()) AS "nextAppointmentAt"
            FROM appointments
            WHERE "customerId" = $1 AND "deletedAt" IS NULL`,
        [customerId, AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW, OPEN_STATUSES]);
        return {
            totalCount: Number(row.total),
            completedCount: Number(row.completed),
            cancelledCount: Number(row.cancelled),
            noShowCount: Number(row.noShow),
            totalSpent: roundMoney(Number(row.spent)),
            lastVisitAt: row.lastVisitAt,
            nextAppointmentAt: row.nextAppointmentAt,
        };
    }

    async getForTeam(businessId: string, id: string): Promise<AppointmentEntity> {
        const appointment = await this.appointments.findOne({
            where: { id, ...AppointmentsService.ofBusiness(businessId) },
            relations: { ...TEAM_RELATIONS, statusHistory: { changedByUser: true } },
            order: { statusHistory: { createdAt: 'ASC' } },
            withDeleted: true,
        });
        if (!appointment) {
            throw AppointmentsService.notFound();
        }
        return appointment;
    }

    async createByTeam(business: BusinessEntity, actor: BusinessMembership, actorUserId: string, dto: CreateAppointmentDto): Promise<AppointmentEntity> {
        await this.ensureCanManage(business.id, actor, [dto.professionalId]);
        const customer = await this.customers.getById(business.id, dto.customerId);
        await this.availability.ensureBookableByTeam(business, dto);
        const setting = await this.settings.getByBusiness(business.id);

        const id = await this.book(business.id, dto, {
            customerId: customer.id,
            status: AppointmentStatus.CONFIRMED,
            internalNotes: dto.internalNotes ?? null,
            changedByUserId: actorUserId,
            reminderSentAt: AppointmentsService.reminderSentAtFor(dto.startAt, setting),
            origin: AppointmentOrigin.TEAM,
        });
        this.events.emit(AppointmentEvent.CREATED, { appointmentId: id, businessId: business.id, actorUserId, origin: 'team' } satisfies AppointmentCreatedEvent);
        return this.getForTeam(business.id, id);
    }

    async createByCustomer(userId: string, dto: CreateMyAppointmentDto): Promise<AppointmentEntity> {
        const business = await this.businesses.getActiveBySlug(dto.businessSlug);
        await this.subscriptions.ensureFullAccess(business.id);
        await this.availability.ensureBookableByCustomer(business, dto);
        const setting = await this.settings.getByBusiness(business.id);

        const id = await this.appointments.manager.transaction(async (manager) => {
            const customer = await this.customers.resolveForUser(manager, business.id, userId);
            await this.customers.ensureCanBookOnline(manager, customer.id);
            return this.book(business.id, dto, {
                customerId: customer.id,
                status: setting.autoConfirmOnlineBookings ? AppointmentStatus.CONFIRMED : AppointmentStatus.PENDING,
                internalNotes: null,
                changedByUserId: userId,
                reminderSentAt: AppointmentsService.reminderSentAtFor(dto.startAt, setting),
                origin: AppointmentOrigin.CUSTOMER,
            }, manager);
        });
        this.events.emit(AppointmentEvent.CREATED, { appointmentId: id, businessId: business.id, actorUserId: userId, origin: 'customer' } satisfies AppointmentCreatedEvent);
        return this.getForCustomer(userId, id);
    }

    async changeStatus(businessId: string, actor: BusinessMembership, actorUserId: string, id: string, dto: ChangeAppointmentStatusDto): Promise<AppointmentEntity> {
        const appointment = await this.getForTeam(businessId, id);
        await this.ensureCanManage(businessId, actor, [appointment.professional.id]);
        AppointmentsService.ensureTransition(appointment, dto.status);
        const reminderSentAt = dto.status === AppointmentStatus.CONFIRMED
            ? AppointmentsService.reminderSentAtFor(appointment.startAt, await this.settings.getByBusiness(businessId))
            : null;

        await this.appointments.manager.transaction((manager) =>
            AppointmentsService.applyStatus(manager, appointment, { status: dto.status, reason: dto.reason, changedByUserId: actorUserId, reminderSentAt }));
        this.emitStatusChanged(appointment, businessId, actorUserId, 'team', dto.status, dto.reason);
        return this.getForTeam(businessId, id);
    }

    async reschedule(business: BusinessEntity, actor: BusinessMembership, actorUserId: string, id: string, dto: RescheduleAppointmentDto): Promise<AppointmentEntity> {
        const appointment = await this.getForTeam(business.id, id);
        const professionalId = dto.professionalId ?? appointment.professional.id;
        await this.ensureCanManage(business.id, actor, [appointment.professional.id, professionalId]);

        const startAt = dto.startAt ?? appointment.startAt;
        const moves = startAt.getTime() !== appointment.startAt.getTime() || professionalId !== appointment.professional.id;
        if (moves && !OPEN_STATUSES.includes(appointment.status)) {
            throw new AppException(ErrorCode.INVALID_STATUS_TRANSITION, HttpStatus.CONFLICT, 'Só agendamentos pendentes ou confirmados podem ser remarcados.');
        }

        const durationMinutes = appointment.services.reduce((total, s) => total + s.durationMinutes, 0);
        if (moves) {
            await this.availability.ensureBookableByTeam(business, {
                professionalId,
                startAt,
                durationMinutes,
                ignoreAppointmentId: id,
                ...(appointment.package ? { packageId: appointment.package.id } : { serviceIds: appointment.services.map((s) => s.service.id) }),
            });
        }
        const professional = professionalId === appointment.professional.id ? null : await this.professionals.getById(business.id, professionalId);
        const durationMs = durationMinutes * MINUTE_MS;
        const timeChanged = startAt.getTime() !== appointment.startAt.getTime();
        const setting = timeChanged ? await this.settings.getByBusiness(business.id) : null;

        await this.withSlotGuard(() => this.appointments.manager.transaction(async (manager) => {
            await manager.update(AppointmentEntity, { id }, {
                startAt,
                endAt: new Date(startAt.getTime() + durationMs),
                internalNotes: dto.internalNotes,
                ...(professional && { professional: { id: professional.id } }),
                ...(setting && { reminderSentAt: AppointmentsService.reminderSentAtFor(startAt, setting) }),
            });
            if (professional && appointment.commissionMode === CommissionMode.PACKAGE && appointment.package) {
                const commissionPercent = AppointmentsService.packagePercentFor(professional, appointment.package.id);
                await manager.update(AppointmentEntity, { id }, {
                    commissionPercent,
                    commissionAmount: roundMoney(appointment.totalPrice * commissionPercent / 100),
                });
            } else if (professional) {
                for (const line of appointment.services) {
                    const commissionPercent = AppointmentsService.commissionPercentFor(professional, line.service.id);
                    await manager.update(AppointmentServiceEntity, { id: line.id }, {
                        commissionPercent,
                        commissionAmount: roundMoney(line.price * commissionPercent / 100),
                    });
                }
            }
        }));
        if (moves) {
            this.events.emit(AppointmentEvent.RESCHEDULED, {
                appointmentId: id,
                businessId: business.id,
                actorUserId,
                origin: 'team',
                previousStartAt: appointment.startAt,
                previousProfessionalId: appointment.professional.id,
            } satisfies AppointmentRescheduledEvent);
        }
        return this.getForTeam(business.id, id);
    }

    async updateServices(business: BusinessEntity, actor: BusinessMembership, id: string, dto: UpdateAppointmentServicesDto): Promise<AppointmentEntity> {
        const appointment = await this.getForTeam(business.id, id);
        await this.ensureCanManage(business.id, actor, [appointment.professional.id]);
        if (!OPEN_STATUSES.includes(appointment.status)) {
            throw new AppException(ErrorCode.INVALID_STATUS_TRANSITION, HttpStatus.CONFLICT, 'Só agendamentos pendentes ou confirmados podem ter os serviços alterados.');
        }
        if (appointment.package) {
            throw new AppException(ErrorCode.APPOINTMENT_IS_PACKAGE, HttpStatus.CONFLICT, 'Os serviços de um pacote não podem ser alterados; cancele e agende os serviços avulsos.');
        }

        const kept = appointment.services.filter((line) => dto.serviceIds.includes(line.service.id));
        const removed = appointment.services.filter((line) => !dto.serviceIds.includes(line.service.id));
        const addedIds = dto.serviceIds.filter((serviceId) => !appointment.services.some((line) => line.service.id === serviceId));
        if (!removed.length && !addedIds.length) {
            return appointment;
        }

        const professional = await this.professionals.getById(business.id, appointment.professional.id);
        const added = addedIds.length ? (await this.servicePricing(business.id, addedIds, professional)).lines : [];
        const lines = [...kept, ...added];
        const durationMinutes = lines.reduce((total, line) => total + line.durationMinutes, 0);
        const totalPrice = roundMoney(lines.reduce((total, line) => total + line.price, 0));
        if (added.length) {
            await this.availability.ensureBookableByTeam(business, {
                professionalId: professional.id,
                startAt: appointment.startAt,
                durationMinutes,
                serviceIds: addedIds,
                ignoreAppointmentId: id,
            });
        }

        await this.withSlotGuard(() => this.appointments.manager.transaction(async (manager) => {
            await this.lockForUpdate(manager, id);
            const paid = await manager.sum(PaymentEntity, 'amount', { appointment: { id }, status: PaymentStatus.PAID }) ?? 0;
            if (toCents(totalPrice) < toCents(paid)) {
                throw new AppException(ErrorCode.PAYMENT_EXCEEDS_BALANCE, HttpStatus.CONFLICT, `O novo total fica abaixo do que já foi pago (R$ ${paid.toFixed(2)}); estorne antes.`);
            }
            if (removed.length) {
                await manager.delete(AppointmentServiceEntity, { id: In(removed.map((line) => line.id)) });
            }
            await manager.save(added.map(({ serviceId, ...line }) => manager.create(AppointmentServiceEntity, {
                ...line,
                service: { id: serviceId },
                appointment: { id },
            })));
            await manager.update(AppointmentEntity, { id }, {
                endAt: new Date(appointment.startAt.getTime() + durationMinutes * MINUTE_MS),
                totalPrice,
            });
        }));
        return this.getForTeam(business.id, id);
    }

    async listForCustomer(userId: string, query: MyAppointmentListQueryDto): Promise<[AppointmentEntity[], number]> {
        const now = new Date();
        return this.appointments.findAndCount({
            where: {
                deletedAt: IsNull(),
                customer: { user: { id: userId } },
                ...(query.upcoming === true && { startAt: MoreThan(now) }),
                ...(query.upcoming === false && { startAt: LessThanOrEqual(now) }),
            },
            relations: CUSTOMER_RELATIONS,
            order: { startAt: query.upcoming ? 'ASC' : 'DESC' },
            skip: query.skip,
            take: query.pageSize,
            withDeleted: true,
        });
    }

    async getForCustomer(userId: string, id: string): Promise<AppointmentEntity> {
        const appointment = await this.appointments.findOne({
            where: { id, deletedAt: IsNull(), customer: { user: { id: userId } } },
            relations: CUSTOMER_RELATIONS,
            withDeleted: true,
        });
        if (!appointment) {
            throw AppointmentsService.notFound();
        }
        return appointment;
    }

    async cancelByCustomer(userId: string, id: string, reason: string | null | undefined): Promise<AppointmentEntity> {
        const appointment = await this.getForCustomer(userId, id);
        AppointmentsService.ensureTransition(appointment, AppointmentStatus.CANCELLED);
        const deadline = AppointmentsService.cancellableUntil(appointment);
        if (!deadline) {
            throw new AppException(ErrorCode.CANCELLATION_WINDOW_CLOSED, HttpStatus.CONFLICT, 'O prazo para cancelar este agendamento já passou.');
        }

        await this.appointments.manager.transaction((manager) =>
            AppointmentsService.applyStatus(manager, appointment, { status: AppointmentStatus.CANCELLED, reason, changedByUserId: userId }));
        this.emitStatusChanged(appointment, appointment.customer.business.id, userId, 'customer', AppointmentStatus.CANCELLED, reason);
        return this.getForCustomer(userId, id);
    }

    async lockForUpdate(manager: EntityManager, id: string): Promise<AppointmentEntity> {
        const appointment = await manager.findOne(AppointmentEntity, { where: { id }, lock: { mode: 'pessimistic_write' } });
        if (!appointment) {
            throw AppointmentsService.notFound();
        }
        return appointment;
    }

    findForNotification(id: string): Promise<AppointmentEntity | null> {
        return this.appointments.findOne({ where: { id }, relations: NOTIFICATION_RELATIONS, withDeleted: true });
    }

    async sendDueReminders(): Promise<number> {
        const now = new Date();
        const due: AppointmentReminderDueEvent[] = await this.appointments.createQueryBuilder('appointment')
            .innerJoin('appointment.customer', 'customer')
            .innerJoin('customer.business', 'business')
            .innerJoin('business.setting', 'setting')
            .select(['appointment.id AS "appointmentId"', 'business.id AS "businessId"'])
            .where('appointment.status = :status', { status: AppointmentStatus.CONFIRMED })
            .andWhere('appointment.reminderSentAt IS NULL')
            .andWhere('setting.reminderHoursBefore > 0')
            .andWhere('appointment.startAt > :now', { now })
            .andWhere('appointment.startAt <= CAST(:now AS timestamptz) + make_interval(hours => setting.reminderHoursBefore)')
            .orderBy('appointment.startAt', 'ASC')
            .limit(REMINDER_BATCH_SIZE)
            .getRawMany();
        if (!due.length) {
            return 0;
        }

        const claimed = await this.appointments.createQueryBuilder()
            .update(AppointmentEntity)
            .set({ reminderSentAt: now })
            .where('id IN (:...ids)', { ids: due.map((d) => d.appointmentId) })
            .andWhere('"reminderSentAt" IS NULL')
            .returning(['id'])
            .execute();
        const claimedIds = new Set((claimed.raw as { id: string }[]).map((row) => row.id));

        const sent = due.filter((d) => claimedIds.has(d.appointmentId));
        for (const event of sent) {
            this.events.emit(AppointmentEvent.REMINDER_DUE, event satisfies AppointmentReminderDueEvent);
        }
        return sent.length;
    }

    static deadlinesOf(appointment: AppointmentEntity): { cancellableUntil: Date | null; reviewableUntil: Date | null } {
        return { cancellableUntil: AppointmentsService.cancellableUntil(appointment), reviewableUntil: AppointmentsService.reviewableUntil(appointment) };
    }

    static reviewableUntil(appointment: AppointmentEntity): Date | null {
        if (appointment.status !== AppointmentStatus.COMPLETED) {
            return null;
        }
        const deadline = new Date(appointment.endAt.getTime() + REVIEW_WINDOW_MS);
        return deadline > new Date() ? deadline : null;
    }

    static cancellableUntil(appointment: AppointmentEntity): Date | null {
        if (!OPEN_STATUSES.includes(appointment.status)) {
            return null;
        }
        const limitHours = appointment.customer.business.setting.cancellationLimitHours;
        const deadline = new Date(appointment.startAt.getTime() - limitHours * HOUR_MS);
        return deadline > new Date() ? deadline : null;
    }

    private async book(
        businessId: string,
        request: { professionalId: string; serviceIds?: string[]; packageId?: string; startAt: Date; customerNotes?: string | null },
        fields: { customerId: string; status: AppointmentStatus; internalNotes: string | null; changedByUserId: string; reminderSentAt: Date | null; origin: AppointmentOrigin },
        manager?: EntityManager,
    ): Promise<string> {
        const professional = await this.professionals.getById(businessId, request.professionalId);
        const pricing = request.packageId
            ? await this.packagePricing(businessId, request.packageId, professional, fields.origin === AppointmentOrigin.CUSTOMER)
            : await this.servicePricing(businessId, request.serviceIds ?? [], professional);
        const durationMs = pricing.lines.reduce((total, l) => total + l.durationMinutes, 0) * MINUTE_MS;

        const write = async (tx: EntityManager) => {
            const appointment = await tx.save(tx.create(AppointmentEntity, {
                customer: { id: fields.customerId },
                professional: { id: professional.id },
                package: request.packageId ? { id: request.packageId } : null,
                startAt: request.startAt,
                endAt: new Date(request.startAt.getTime() + durationMs),
                status: fields.status,
                origin: fields.origin,
                customerNotes: request.customerNotes ?? null,
                internalNotes: fields.internalNotes,
                totalPrice: pricing.totalPrice,
                commissionMode: pricing.commissionMode,
                commissionPercent: pricing.commissionPercent,
                commissionAmount: pricing.commissionAmount,
                reminderSentAt: fields.reminderSentAt,
            }));
            await tx.save(pricing.lines.map(({ serviceId, ...line }) => tx.create(AppointmentServiceEntity, {
                ...line,
                service: { id: serviceId },
                appointment: { id: appointment.id },
            })));
            await tx.save(tx.create(AppointmentStatusHistoryEntity, {
                appointment: { id: appointment.id },
                previousStatus: null,
                newStatus: fields.status,
                changedByUser: { id: fields.changedByUserId },
            }));
            return appointment.id;
        };

        return this.withSlotGuard(() => (manager ? write(manager) : this.appointments.manager.transaction(write)));
    }

    async ensureCanManage(businessId: string, actor: BusinessMembership, professionalIds: string[]): Promise<void> {
        if (actor.roles.some((r) => r === BusinessMemberRole.OWNER || r === BusinessMemberRole.ADMIN)) {
            return;
        }
        const own = await this.professionals.findByMember(businessId, actor.id);
        if (!own || professionalIds.some((id) => id !== own.id)) {
            throw new AppException(ErrorCode.INSUFFICIENT_BUSINESS_ROLE, HttpStatus.FORBIDDEN, 'Profissionais só gerenciam os próprios agendamentos.');
        }
    }

    private async withSlotGuard<T>(operation: () => Promise<T>): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            if (error instanceof QueryFailedError && (error.driverError as { code?: string }).code === EXCLUSION_VIOLATION) {
                throw AvailabilityService.unavailable();
            }
            throw error;
        }
    }

    private async servicePricing(businessId: string, serviceIds: string[], professional: ProfessionalEntity): Promise<AppointmentPricing> {
        const services = await this.services.getMany(businessId, serviceIds);
        const ordered = serviceIds.map((serviceId) => services.find((s) => s.id === serviceId)!);
        return priceServices(ordered, (serviceId) => AppointmentsService.commissionPercentFor(professional, serviceId));
    }

    private async packagePricing(businessId: string, packageId: string, professional: ProfessionalEntity, online: boolean): Promise<AppointmentPricing> {
        const pkg = await this.packages.getForBooking(businessId, packageId, { online });
        return pricePackage({
            price: pkg.price,
            commissionMode: pkg.commissionMode,
            services: pkg.services.map((link) => link.service),
            packagePercent: AppointmentsService.packagePercentFor(professional, pkg.id),
        }, (serviceId) => AppointmentsService.commissionPercentFor(professional, serviceId));
    }

    private static commissionPercentFor(professional: ProfessionalEntity, serviceId: string): number {
        const link = professional.services.find((s) => s.service?.id === serviceId);
        return link?.commissionPercent ?? professional.commissionPercent;
    }

    private static packagePercentFor(professional: ProfessionalEntity, packageId: string): number {
        const link = professional.packages.find((p) => p.package?.id === packageId);
        return link?.commissionPercent ?? professional.commissionPercent;
    }

    private static ensureTransition(appointment: AppointmentEntity, next: AppointmentStatus): void {
        if (!TRANSITIONS[appointment.status].includes(next)) {
            throw new AppException(ErrorCode.INVALID_STATUS_TRANSITION, HttpStatus.CONFLICT, `Não é possível passar de ${appointment.status} para ${next}.`);
        }
        if (STATUSES_AFTER_START.includes(next) && appointment.startAt > new Date()) {
            throw new AppException(ErrorCode.INVALID_STATUS_TRANSITION, HttpStatus.CONFLICT, `${next} só é permitido a partir do início do agendamento.`);
        }
    }

    private static async applyStatus(manager: EntityManager, appointment: AppointmentEntity, change: StatusChange): Promise<void> {
        const cancelled = change.status === AppointmentStatus.CANCELLED;
        await manager.update(AppointmentEntity, { id: appointment.id }, {
            status: change.status,
            ...(cancelled && { cancelledAt: new Date(), cancellationReason: change.reason ?? null }),
            ...(change.reminderSentAt && { reminderSentAt: change.reminderSentAt }),
        });
        await manager.save(manager.create(AppointmentStatusHistoryEntity, {
            appointment: { id: appointment.id },
            previousStatus: appointment.status,
            newStatus: change.status,
            reason: change.reason ?? null,
            changedByUser: change.changedByUserId ? { id: change.changedByUserId } : null,
        }));
    }

    private emitStatusChanged(
        appointment: AppointmentEntity,
        businessId: string,
        actorUserId: string,
        origin: AppointmentOrigin,
        status: AppointmentStatus,
        reason: string | null | undefined,
    ): void {
        this.events.emit(AppointmentEvent.STATUS_CHANGED, {
            appointmentId: appointment.id,
            businessId,
            actorUserId,
            origin,
            previousStatus: appointment.status,
            status,
            reason: reason ?? null,
        } satisfies AppointmentStatusChangedEvent);
    }

    private static reminderSentAtFor(startAt: Date, setting: Pick<BusinessSettingEntity, 'reminderHoursBefore'>): Date | null {
        const insideWindow = startAt.getTime() - setting.reminderHoursBefore * HOUR_MS <= Date.now();
        return setting.reminderHoursBefore > 0 && insideWindow ? new Date() : null;
    }

    private static ofBusiness(businessId: string): FindOptionsWhere<AppointmentEntity> {
        return { deletedAt: IsNull(), customer: { business: { id: businessId } } };
    }

    private static notFound(): AppException {
        return new AppException(ErrorCode.APPOINTMENT_NOT_FOUND, HttpStatus.NOT_FOUND, 'Agendamento não encontrado.');
    }
}

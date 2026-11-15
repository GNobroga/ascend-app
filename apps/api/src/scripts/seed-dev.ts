import * as argon2 from 'argon2';
import { DataSource, type EntityManager } from 'typeorm';
import { AppointmentOrigin } from '../common/enums/appointment-origin.enum.js';
import { AppointmentStatus } from '../common/enums/appointment-status.enum.js';
import { BusinessMemberRole } from '../common/enums/business-member-role.enum.js';
import { CommissionMode } from '../common/enums/commission-mode.enum.js';
import { PaymentStatus } from '../common/enums/payment-status.enum.js';
import { ReviewType } from '../common/enums/review-type.enum.js';
import { SubscriptionEventType } from '../common/enums/subscription-event-type.enum.js';
import { SubscriptionStatus } from '../common/enums/subscription-status.enum.js';
import { Weekday } from '../common/enums/weekday.enum.js';
import { env } from '../config/env.config.js';
import { AppointmentServiceEntity } from '../database/entities/appointment-service.entity.js';
import { AppointmentStatusHistoryEntity } from '../database/entities/appointment-status-history.entity.js';
import { AppointmentEntity } from '../database/entities/appointment.entity.js';
import { BusinessHourEntity } from '../database/entities/business-hour.entity.js';
import { BusinessMemberRoleEntity } from '../database/entities/business-member-role.entity.js';
import { BusinessMemberEntity } from '../database/entities/business-member.entity.js';
import { BusinessPaymentMethodEntity } from '../database/entities/business-payment-method.entity.js';
import { BusinessSettingEntity } from '../database/entities/business-setting.entity.js';
import { BusinessSubscriptionEventEntity } from '../database/entities/business-subscription-event.entity.js';
import { BusinessSubscriptionEntity } from '../database/entities/business-subscription.entity.js';
import { BusinessEntity } from '../database/entities/business.entity.js';
import { CustomerEntity } from '../database/entities/customer.entity.js';
import { PackageServiceEntity } from '../database/entities/package-service.entity.js';
import { PackageEntity } from '../database/entities/package.entity.js';
import { PaymentEntity } from '../database/entities/payment.entity.js';
import { ProfessionalPackageEntity } from '../database/entities/professional-package.entity.js';
import { ProfessionalServiceEntity } from '../database/entities/professional-service.entity.js';
import { ProfessionalSpecialtyEntity } from '../database/entities/professional-specialty.entity.js';
import { ProfessionalWorkingHoursEntity } from '../database/entities/professional-working-hours.entity.js';
import { ProfessionalEntity } from '../database/entities/professional.entity.js';
import { ReviewEntity } from '../database/entities/review.entity.js';
import { ServiceCategoryEntity } from '../database/entities/service-category.entity.js';
import { ServiceEntity } from '../database/entities/service.entity.js';
import { SpecialtyEntity } from '../database/entities/specialty.entity.js';
import { UserEntity } from '../database/entities/user.entity.js';
import { dataSourceOptions } from '../database/typeorm.config.js';
import { pricePackage, priceServices, type AppointmentPricing } from '../features/appointments/pricing.js';

const ADMIN_EMAIL = 'admin@ascend.dev';
const PASSWORD = 'Ascend@123';
const BUSINESS_SLUG = 'barbearia-ascend';
const UTC_OFFSET = '-03:00';
const DAY_MS = 24 * 60 * 60 * 1000;

const STAFF = [
    { name: 'Admin Ascend', email: ADMIN_EMAIL, phone: '+5511900000001', roles: [BusinessMemberRole.OWNER, BusinessMemberRole.PROFESSIONAL], commission: 0, bio: 'Fundador da Barbearia Ascend.' },
    { name: 'Rafael Souza', email: 'rafael@ascend.dev', phone: '+5511900000002', roles: [BusinessMemberRole.PROFESSIONAL], commission: 40, bio: 'Especialista em cortes clássicos e navalhado.' },
    { name: 'Juliana Lima', email: 'juliana@ascend.dev', phone: '+5511900000003', roles: [BusinessMemberRole.ADMIN, BusinessMemberRole.PROFESSIONAL], commission: 45, bio: 'Coloração, química e cortes modernos.' },
];

const CATEGORIES = [
    { name: 'Cabelo', services: [
        { name: 'Corte masculino', duration: 30, price: 50 },
        { name: 'Corte degradê', duration: 45, price: 60 },
        { name: 'Coloração', duration: 90, price: 150 },
    ] },
    { name: 'Barba', services: [
        { name: 'Barba completa', duration: 30, price: 40 },
        { name: 'Pezinho', duration: 15, price: 15 },
    ] },
];

const SPECIALTIES = ['Cortes clássicos', 'Degradê', 'Barba', 'Coloração'];

const CUSTOMERS = [
    'Lucas Pereira', 'Mateus Oliveira', 'Gabriel Santos', 'Pedro Almeida', 'Bruno Costa',
    'Thiago Rocha', 'Felipe Martins', 'André Carvalho', 'Diego Ribeiro', 'Vinícius Gomes',
];

const REVIEW_COMMENTS = ['Atendimento excelente!', 'Muito bom, voltarei.', 'Corte impecável.', null, 'Pontual e caprichoso.'];

const SLOTS = ['09:00', '10:30', '14:00', '16:00'];

let seed = 42;
const random = (): number => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
};
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];

const localDate = (date: Date): string => new Date(date.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
const at = (day: string, time: string): Date => new Date(`${day}T${time}:00${UTC_OFFSET}`);

const seedStaff = async (manager: EntityManager, business: BusinessEntity, passwordHash: string) => {
    const professionals: { professional: ProfessionalEntity; user: UserEntity; commission: number }[] = [];
    for (const staff of STAFF) {
        const user = await manager.save(manager.create(UserEntity, {
            name: staff.name,
            email: staff.email,
            emailVerifiedAt: new Date(),
            passwordHash,
            phone: staff.phone,
            phoneVerifiedAt: new Date(),
        }));
        const member = await manager.save(manager.create(BusinessMemberEntity, { business, user }));
        await manager.save(staff.roles.map((role) => manager.create(BusinessMemberRoleEntity, { member, role })));
        const professional = await manager.save(manager.create(ProfessionalEntity, {
            displayName: staff.name.split(' ')[0],
            bio: staff.bio,
            commissionPercent: staff.commission,
            member,
        }));
        await manager.save(Object.values(Weekday).map((dayOfWeek) => manager.create(ProfessionalWorkingHoursEntity, {
            professional,
            dayOfWeek,
            isDayOff: dayOfWeek === Weekday.SUNDAY,
            startTime: dayOfWeek === Weekday.SUNDAY ? null : '09:00',
            endTime: dayOfWeek === Weekday.SUNDAY ? null : dayOfWeek === Weekday.SATURDAY ? '14:00' : '19:00',
        })));
        professionals.push({ professional, user, commission: staff.commission });
    }
    return professionals;
};

const seedBusiness = async (manager: EntityManager, ownerHash: string) => {
    const business = await manager.save(manager.create(BusinessEntity, {
        name: 'Barbearia Ascend',
        slug: BUSINESS_SLUG,
        description: 'Barbearia de bairro com atendimento caprichado e ambiente descontraído.',
        email: 'contato@ascend.dev',
        taxId: '11222333000181',
        phone: '+5511900000000',
        phoneIsWhatsApp: true,
        timezone: 'America/Sao_Paulo',
        address: {
            postalCode: '01310100',
            street: 'Avenida Paulista',
            number: '1000',
            complement: 'Loja 2',
            district: 'Bela Vista',
            city: 'São Paulo',
            state: 'SP',
        },
    }));
    await manager.save(manager.create(BusinessSettingEntity, { business }));
    await manager.save(Object.values(Weekday).map((dayOfWeek) => manager.create(BusinessHourEntity, {
        business,
        dayOfWeek,
        isClosed: dayOfWeek === Weekday.SUNDAY,
        openTime: dayOfWeek === Weekday.SUNDAY ? null : '09:00',
        closeTime: dayOfWeek === Weekday.SUNDAY ? null : dayOfWeek === Weekday.SATURDAY ? '14:00' : '19:00',
    })));
    const paymentMethods = await manager.save(['Dinheiro', 'Pix', 'Cartão de crédito', 'Cartão de débito']
        .map((name) => manager.create(BusinessPaymentMethodEntity, { business, name })));

    const staff = await seedStaff(manager, business, ownerHash);
    const owner = staff[0].user;

    const subscription = await manager.save(manager.create(BusinessSubscriptionEntity, {
        business,
        status: SubscriptionStatus.ACTIVE,
        trialEndsAt: new Date(Date.now() + 365 * DAY_MS),
    }));
    await manager.save(manager.create(BusinessSubscriptionEventEntity, {
        subscription,
        type: SubscriptionEventType.TRIAL_STARTED,
        previousStatus: null,
        newStatus: SubscriptionStatus.ACTIVE,
        actorUser: owner,
        metadata: { trialEndsAt: subscription.trialEndsAt.toISOString() },
    }));

    return { business, paymentMethods, staff, owner };
};

const seedCatalog = async (manager: EntityManager, business: BusinessEntity, professionals: ProfessionalEntity[]) => {
    const services: ServiceEntity[] = [];
    for (const [categoryIndex, category] of CATEGORIES.entries()) {
        const saved = await manager.save(manager.create(ServiceCategoryEntity, { business, name: category.name, displayOrder: categoryIndex }));
        for (const [serviceIndex, service] of category.services.entries()) {
            services.push(await manager.save(manager.create(ServiceEntity, {
                business,
                category: saved,
                name: service.name,
                description: null,
                durationInMinutes: service.duration,
                price: service.price,
                displayOrder: serviceIndex,
            })));
        }
    }

    const comboServices = [services[0], services[3]];
    const combo = await manager.save(manager.create(PackageEntity, {
        business,
        name: 'Corte + Barba',
        description: 'Corte masculino e barba completa com desconto.',
        price: 80,
        durationMinutes: comboServices.reduce((total, s) => total + s.durationInMinutes, 0),
        commissionMode: CommissionMode.PRORATED,
    }));
    await manager.save(comboServices.map((service) => manager.create(PackageServiceEntity, { package: combo, service })));

    const specialties = await manager.save(SPECIALTIES.map((name) => manager.create(SpecialtyEntity, { business, name })));

    const coloring = services[2];
    for (const [index, professional] of professionals.entries()) {
        const offered = services.filter((s) => s !== coloring || index === 2);
        await manager.save(offered.map((service) => manager.create(ProfessionalServiceEntity, { professional, service, commissionPercent: null })));
        await manager.save(manager.create(ProfessionalPackageEntity, { professional, package: combo, commissionPercent: null }));
        const own = index === 2 ? [specialties[1], specialties[3]] : [specialties[0], specialties[2]];
        await manager.save(own.map((specialty) => manager.create(ProfessionalSpecialtyEntity, { professional, specialty })));
        professional.services = offered.map((service) => ({ service, commissionPercent: null }) as ProfessionalServiceEntity);
    }

    return { services, combo, comboServices };
};

const seedCustomers = (manager: EntityManager, business: BusinessEntity) =>
    manager.save(CUSTOMERS.map((name, index) => manager.create(CustomerEntity, {
        business,
        name,
        email: `${name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}@example.com`,
        phone: `+55119${String(81000000 + index * 1111).padStart(8, '0')}`,
        notes: index === 0 ? 'Prefere máquina 2 nas laterais.' : null,
    })));

const pastStatus = (): AppointmentStatus => {
    const roll = random();
    if (roll < 0.8) return AppointmentStatus.COMPLETED;
    if (roll < 0.9) return AppointmentStatus.NO_SHOW;
    return AppointmentStatus.CANCELLED;
};

const futureStatus = (): AppointmentStatus => (random() < 0.75 ? AppointmentStatus.CONFIRMED : AppointmentStatus.PENDING);

const historyFor = (status: AppointmentStatus): AppointmentStatus[] => {
    switch (status) {
        case AppointmentStatus.PENDING: return [AppointmentStatus.PENDING];
        case AppointmentStatus.CONFIRMED: return [AppointmentStatus.CONFIRMED];
        case AppointmentStatus.CANCELLED: return [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED];
        case AppointmentStatus.NO_SHOW: return [AppointmentStatus.CONFIRMED, AppointmentStatus.NO_SHOW];
        default: return [AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS, AppointmentStatus.COMPLETED];
    }
};

const seedAppointments = async (
    manager: EntityManager,
    context: {
        business: BusinessEntity;
        owner: UserEntity;
        professionals: { professional: ProfessionalEntity; commission: number }[];
        customers: CustomerEntity[];
        catalog: Awaited<ReturnType<typeof seedCatalog>>;
        paymentMethods: BusinessPaymentMethodEntity[];
    },
) => {
    const { business, owner, professionals, customers, catalog, paymentMethods } = context;
    const now = new Date();
    const today = localDate(now);
    let count = 0;
    let reviewIndex = 0;

    for (let offset = -75; offset <= 10; offset++) {
        const day = localDate(new Date(now.getTime() + offset * DAY_MS));
        const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
        if (weekday === Weekday.SUNDAY) continue;
        const slots = weekday === Weekday.SATURDAY ? SLOTS.slice(0, 2) : SLOTS;

        for (const { professional, commission } of professionals) {
            for (const slot of slots) {
                if (random() < 0.35) continue;

                const usePackage = random() < 0.2;
                const offered = professional.services.map((link) => link.service);
                const pricing: AppointmentPricing = usePackage
                    ? pricePackage({ price: catalog.combo.price, commissionMode: catalog.combo.commissionMode, services: catalog.comboServices, packagePercent: commission }, () => commission)
                    : priceServices([pick(offered)], () => commission);
                const duration = pricing.lines.reduce((total, line) => total + line.durationMinutes, 0);
                const startAt = at(day, slot);
                const endAt = new Date(startAt.getTime() + duration * 60 * 1000);
                const status = endAt < now ? pastStatus() : futureStatus();
                const finished = status === AppointmentStatus.COMPLETED;
                const customer = pick(customers);

                const appointment = await manager.save(manager.create(AppointmentEntity, {
                    startAt,
                    endAt,
                    status,
                    origin: random() < 0.3 ? AppointmentOrigin.CUSTOMER : AppointmentOrigin.TEAM,
                    professional,
                    customer,
                    package: usePackage ? catalog.combo : null,
                    customerNotes: random() < 0.15 ? 'Chego uns minutinhos antes.' : null,
                    internalNotes: null,
                    cancellationReason: status === AppointmentStatus.CANCELLED ? 'Imprevisto do cliente.' : null,
                    cancelledAt: status === AppointmentStatus.CANCELLED ? new Date(startAt.getTime() - DAY_MS) : null,
                    reminderSentAt: day < today ? new Date(startAt.getTime() - DAY_MS) : null,
                    totalPrice: pricing.totalPrice,
                    commissionMode: pricing.commissionMode,
                    commissionPercent: pricing.commissionPercent,
                    commissionAmount: finished ? pricing.commissionAmount : 0,
                }));

                await manager.save(pricing.lines.map((line) => manager.create(AppointmentServiceEntity, {
                    appointment,
                    service: { id: line.serviceId },
                    listPrice: line.listPrice,
                    price: line.price,
                    durationMinutes: line.durationMinutes,
                    commissionPercent: line.commissionPercent,
                    commissionAmount: line.commissionAmount,
                })));

                let previousStatus: AppointmentStatus | null = null;
                for (const newStatus of historyFor(status)) {
                    await manager.save(manager.create(AppointmentStatusHistoryEntity, {
                        appointment,
                        previousStatus,
                        newStatus,
                        reason: newStatus === AppointmentStatus.CANCELLED ? appointment.cancellationReason : null,
                        changedByUser: owner,
                    }));
                    previousStatus = newStatus;
                }

                if (finished) {
                    await manager.save(manager.create(PaymentEntity, {
                        appointment,
                        paymentMethod: pick(paymentMethods),
                        amount: pricing.totalPrice,
                        status: PaymentStatus.PAID,
                        paidAt: endAt,
                    }));
                    if (random() < 0.4) {
                        await manager.save(manager.create(ReviewEntity, {
                            business,
                            type: ReviewType.APPOINTMENT,
                            professional,
                            customer,
                            appointment,
                            rating: pick([4, 5, 5, 5, 3]),
                            comment: REVIEW_COMMENTS[reviewIndex++ % REVIEW_COMMENTS.length],
                            createdAt: new Date(Math.min(endAt.getTime() + 2 * 60 * 60 * 1000, now.getTime())),
                        }));
                    }
                }
                count++;
            }
        }
    }
    return count;
};

const run = async () => {
    if (env.NODE_ENV !== 'development') {
        throw new Error(`Seed só roda com NODE_ENV=development (atual: ${env.NODE_ENV}).`);
    }

    const dataSource = await new DataSource(dataSourceOptions).initialize();
    try {
        if (await dataSource.getRepository(UserEntity).exists({ where: { email: ADMIN_EMAIL }, withDeleted: true })) {
            console.log(`Seed já aplicado (${ADMIN_EMAIL} existe). Nada a fazer.`);
            return;
        }

        const passwordHash = await argon2.hash(PASSWORD);
        const appointments = await dataSource.transaction(async (manager) => {
            const { business, paymentMethods, staff, owner } = await seedBusiness(manager, passwordHash);
            const professionals = staff.map(({ professional, commission }) => ({ professional, commission }));
            const catalog = await seedCatalog(manager, business, professionals.map((p) => p.professional));
            const customers = await seedCustomers(manager, business);

            await manager.save([
                manager.create(ReviewEntity, { business, type: ReviewType.BUSINESS, customer: customers[1], rating: 5, comment: 'Melhor barbearia da região!' }),
                manager.create(ReviewEntity, { business, type: ReviewType.PROFESSIONAL, professional: professionals[1].professional, customer: customers[2], rating: 5, comment: 'O Rafael é fera no degradê.' }),
            ]);

            return seedAppointments(manager, { business, owner, professionals, customers, catalog, paymentMethods });
        });

        console.log(`Seed concluído: negócio "${BUSINESS_SLUG}", ${STAFF.length} membros, ${CUSTOMERS.length} clientes, ${appointments} agendamentos.`);
        console.log(`Login: ${ADMIN_EMAIL} / ${PASSWORD} (mesma senha para ${STAFF.slice(1).map((s) => s.email).join(', ')}).`);
    } finally {
        await dataSource.destroy();
    }
};

await run();

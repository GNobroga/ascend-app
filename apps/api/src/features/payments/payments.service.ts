import { HttpStatus, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum.js';
import { PaymentStatus } from '../../common/enums/payment-status.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { PaymentEntity } from '../../database/entities/payment.entity.js';
import { AppointmentsService } from '../appointments/index.js';
import { BusinessPaymentMethodsService, type BusinessMembership } from '../businesses/index.js';
import type { CreatePaymentDto } from './dto/payment.dto.js';
import { PaymentEvent, type PaymentChangedEvent } from './payment-events.js';

const toCents = (value: number): number => Math.round(value * 100);

const ACTIONS = {
    [PaymentStatus.REFUNDED]: 'Estorno',
    [PaymentStatus.CANCELLED]: 'Cancelamento',
} as const;

@Injectable()
export class PaymentsService {

    constructor(
        @InjectRepository(PaymentEntity) private readonly payments: Repository<PaymentEntity>,
        private readonly appointments: AppointmentsService,
        private readonly paymentMethods: BusinessPaymentMethodsService,
        private readonly events: EventEmitter2,
    ) { }

    async list(businessId: string, appointmentId: string): Promise<PaymentEntity[]> {
        await this.appointments.getForTeam(businessId, appointmentId);
        return this.payments.find({
            where: { appointment: { id: appointmentId } },
            relations: { paymentMethod: true },
            order: { createdAt: 'ASC' },
            withDeleted: true,
        });
    }

    async create(businessId: string, actor: BusinessMembership, appointmentId: string, dto: CreatePaymentDto): Promise<PaymentEntity> {
        const appointment = await this.appointments.getForTeam(businessId, appointmentId);
        await this.appointments.ensureCanManage(businessId, actor, [appointment.professional.id]);
        const method = await this.paymentMethods.getActiveById(businessId, dto.paymentMethodId);

        const id = await this.payments.manager.transaction(async (manager) => {
            const locked = await this.appointments.lockForUpdate(manager, appointmentId);
            if (locked.status === AppointmentStatus.CANCELLED) {
                throw new AppException(ErrorCode.PAYMENT_NOT_ALLOWED, HttpStatus.CONFLICT, 'Agendamento cancelado não recebe pagamentos novos.');
            }

            const repo = manager.getRepository(PaymentEntity);
            const paid = await repo.sum('amount', { appointment: { id: appointmentId }, status: PaymentStatus.PAID }) ?? 0;
            const balanceCents = toCents(locked.totalPrice) - toCents(paid);
            if (toCents(dto.amount) > balanceCents) {
                throw new AppException(ErrorCode.PAYMENT_EXCEEDS_BALANCE, HttpStatus.CONFLICT, `O valor passa do saldo do agendamento (R$ ${(balanceCents / 100).toFixed(2)}).`);
            }

            const payment = await repo.save(repo.create({
                appointment: { id: appointmentId },
                paymentMethod: { id: method.id },
                amount: dto.amount,
                status: PaymentStatus.PAID,
                notes: dto.notes?.trim() || null,
                paidAt: dto.paidAt ?? new Date(),
            }));
            return payment.id;
        });
        this.events.emit(PaymentEvent.CHANGED, { paymentId: id, appointmentId, businessId } satisfies PaymentChangedEvent);
        return this.getById(appointmentId, id);
    }

    refund(businessId: string, actor: BusinessMembership, appointmentId: string, id: string, reason: string | null | undefined): Promise<PaymentEntity> {
        return this.close(businessId, actor, appointmentId, id, PaymentStatus.REFUNDED, reason);
    }

    cancel(businessId: string, actor: BusinessMembership, appointmentId: string, id: string, reason: string | null | undefined): Promise<PaymentEntity> {
        return this.close(businessId, actor, appointmentId, id, PaymentStatus.CANCELLED, reason);
    }

    private async close(
        businessId: string,
        actor: BusinessMembership,
        appointmentId: string,
        id: string,
        status: typeof PaymentStatus.REFUNDED | typeof PaymentStatus.CANCELLED,
        reason: string | null | undefined,
    ): Promise<PaymentEntity> {
        const appointment = await this.appointments.getForTeam(businessId, appointmentId);
        await this.appointments.ensureCanManage(businessId, actor, [appointment.professional.id]);
        const payment = await this.getById(appointmentId, id);

        const note = reason?.trim() ? `${ACTIONS[status]}: ${reason.trim()}` : null;
        const notes = [payment.notes, note].filter(Boolean).join('\n') || null;
        const result = await this.payments.update({ id, status: PaymentStatus.PAID }, { status, notes });
        if (!result.affected) {
            throw new AppException(ErrorCode.INVALID_PAYMENT_TRANSITION, HttpStatus.CONFLICT, 'Só pagamentos recebidos (`paid`) podem ser estornados ou cancelados.');
        }
        this.events.emit(PaymentEvent.CHANGED, { paymentId: id, appointmentId, businessId } satisfies PaymentChangedEvent);
        return this.getById(appointmentId, id);
    }

    private async getById(appointmentId: string, id: string): Promise<PaymentEntity> {
        const payment = await this.payments.findOne({
            where: { id, appointment: { id: appointmentId } },
            relations: { paymentMethod: true },
            withDeleted: true,
        });
        if (!payment) {
            throw new AppException(ErrorCode.PAYMENT_NOT_FOUND, HttpStatus.NOT_FOUND, 'Pagamento não encontrado.');
        }
        return payment;
    }
}

import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Not, Repository, type EntityManager, type FindOptionsWhere, type SelectQueryBuilder } from 'typeorm';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum.js';
import { CustomerBlockType } from '../../common/enums/customer-block-type.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { CustomerBlockEntity } from '../../database/entities/customer-block.entity.js';
import { CustomerEntity } from '../../database/entities/customer.entity.js';
import { BusinessPaymentMethodsService, BusinessSettingsService } from '../businesses/index.js';
import { UsersService } from '../users/index.js';
import {
    DuplicateField,
    MAX_BLOCK_DAYS,
    type BlockCustomerDto,
    type CreateCustomerDto,
    type CustomerListQueryDto,
    type PayUnblockFeeDto,
    type UpdateCustomerDto,
} from './dto/customer.dto.js';

const MIN_PHONE_SEARCH_DIGITS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_BLOCK_CONDITION = 'block.liftedAt IS NULL AND (block.until IS NULL OR block.until > now())';

interface ContactFields {
    email?: string | null;
    phone?: string | null;
}

export interface PossibleDuplicateGroup {
    field: DuplicateField;
    value: string;
    customers: CustomerEntity[];
}

interface DuplicateGroupRow {
    field: DuplicateField;
    value: string;
    ids: string[];
}

const escapeLike = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

@Injectable()
export class CustomersService {

    constructor(
        @InjectRepository(CustomerEntity) private readonly customers: Repository<CustomerEntity>,
        @InjectRepository(CustomerBlockEntity) private readonly blocks: Repository<CustomerBlockEntity>,
        private readonly users: UsersService,
        private readonly settings: BusinessSettingsService,
        private readonly paymentMethods: BusinessPaymentMethodsService,
    ) { }

    async list(businessId: string, query: CustomerListQueryDto): Promise<[CustomerEntity[], number]> {
        const qb = CustomersService.withStanding(this.customers.createQueryBuilder('customer'))
            .where('"customer"."businessId" = :businessId', { businessId });

        const search = query.search?.trim();
        if (search) {
            const digits = search.replace(/\D/g, '');
            qb.andWhere(new Brackets((or) => {
                or.where('customer.name ILIKE :term', { term: `%${escapeLike(search)}%` })
                    .orWhere('customer.email ILIKE :term');
                if (digits.length >= MIN_PHONE_SEARCH_DIGITS) {
                    or.orWhere('customer.phone LIKE :digits', { digits: `%${digits}%` });
                }
            }));
        }

        const [customers, total] = await qb.orderBy('customer.name', 'ASC').addOrderBy('customer.createdAt', 'ASC')
            .skip(query.skip)
            .take(query.pageSize)
            .getManyAndCount();
        return [await this.withNoShowCounts(customers), total];
    }

    async getById(businessId: string, id: string): Promise<CustomerEntity> {
        const customer = await CustomersService.withStanding(this.customers.createQueryBuilder('customer'))
            .where('customer.id = :id', { id })
            .andWhere('"customer"."businessId" = :businessId', { businessId })
            .getOne();
        if (customer) {
            await this.withNoShowCounts([customer]);
        }
        if (!customer) {
            throw new AppException(ErrorCode.CUSTOMER_NOT_FOUND, HttpStatus.NOT_FOUND, 'Cliente não encontrado.');
        }
        return customer;
    }

    async create(businessId: string, dto: CreateCustomerDto): Promise<CustomerEntity> {
        const contact = CustomersService.normalizeContact(dto);
        if (!dto.allowDuplicate) {
            await this.ensureNoDuplicate(businessId, contact);
        }

        const customer = await this.customers.save(this.customers.create({
            business: { id: businessId },
            name: dto.name.trim(),
            email: contact.email ?? null,
            phone: contact.phone ?? null,
            notes: dto.notes ?? null,
        }));
        return this.getById(businessId, customer.id);
    }

    async update(businessId: string, id: string, dto: UpdateCustomerDto): Promise<CustomerEntity> {
        const customer = await this.getById(businessId, id);
        const contact = CustomersService.normalizeContact(dto);

        const changedContact: ContactFields = {
            ...(contact.email !== undefined && contact.email !== customer.email && { email: contact.email }),
            ...(contact.phone !== undefined && contact.phone !== customer.phone && { phone: contact.phone }),
        };
        if (!dto.allowDuplicate) {
            await this.ensureNoDuplicate(businessId, changedContact, id);
        }

        this.customers.merge(customer, { name: dto.name?.trim(), notes: dto.notes, ...contact });
        if (dto.whatsappOptOut !== undefined && dto.whatsappOptOut !== !!customer.whatsappOptedOutAt) {
            customer.whatsappOptedOutAt = dto.whatsappOptOut ? new Date() : null;
        }
        await this.customers.save(customer);
        return this.getById(businessId, id);
    }

    async remove(businessId: string, id: string): Promise<void> {
        const customer = await this.getById(businessId, id);
        await this.customers.softDelete({ id: customer.id });
    }

    async block(businessId: string, actorUserId: string, id: string, dto: BlockCustomerDto): Promise<CustomerEntity> {
        const customer = await this.getById(businessId, id);
        if (dto.type === CustomerBlockType.TEMPORARY && !CustomersService.isValidBlockEnd(dto.until!)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, 'Dados inválidos.', [
                { path: 'until', message: `until must be in the future and at most ${MAX_BLOCK_DAYS} days ahead` },
            ]);
        }
        const feeAmount = dto.type === CustomerBlockType.FEE ? (await this.settings.getByBusiness(businessId)).unblockFee : null;
        if (feeAmount === 0) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, 'Dados inválidos.', [
                { path: 'type', message: 'set unblockFee in the business settings before blocking by fee' },
            ]);
        }

        await this.blocks.manager.transaction(async (manager) => {
            await manager.update(CustomerBlockEntity, { customer: { id: customer.id }, liftedAt: IsNull() }, { liftedAt: new Date(), liftedByUser: { id: actorUserId } });
            await manager.save(manager.create(CustomerBlockEntity, {
                customer: { id: customer.id },
                type: dto.type,
                reason: dto.reason?.trim() || null,
                until: dto.type === CustomerBlockType.TEMPORARY ? dto.until ?? null : null,
                feeAmount,
                blockedByUser: { id: actorUserId },
            }));
        });
        return this.getById(businessId, id);
    }

    async payUnblockFee(businessId: string, actorUserId: string, id: string, dto: PayUnblockFeeDto): Promise<CustomerEntity> {
        const customer = await this.getById(businessId, id);
        if (customer.activeBlock?.type !== CustomerBlockType.FEE) {
            throw new AppException(ErrorCode.CUSTOMER_NOT_BLOCKED, HttpStatus.CONFLICT, 'O cliente não tem bloqueio por taxa ativo.');
        }
        const method = await this.paymentMethods.getActiveById(businessId, dto.paymentMethodId);

        const now = new Date();
        await this.blocks.update({ id: customer.activeBlock.id, liftedAt: IsNull() }, {
            feePaidAt: now,
            feePaymentMethod: { id: method.id },
            feePaymentNotes: dto.notes?.trim() || null,
            liftedAt: now,
            liftedByUser: { id: actorUserId },
        });
        return this.getById(businessId, id);
    }

    async unblock(businessId: string, actorUserId: string, id: string): Promise<void> {
        const customer = await this.getById(businessId, id);
        if (!customer.activeBlock) {
            throw new AppException(ErrorCode.CUSTOMER_NOT_BLOCKED, HttpStatus.CONFLICT, 'O cliente não está bloqueado.');
        }
        await this.blocks.update({ id: customer.activeBlock.id, liftedAt: IsNull() }, { liftedAt: new Date(), liftedByUser: { id: actorUserId } });
    }

    async ensureCanBookOnline(manager: EntityManager, customerId: string): Promise<void> {
        const block = await manager.getRepository(CustomerBlockEntity).createQueryBuilder('block')
            .where('"block"."customerId" = :customerId', { customerId })
            .andWhere(ACTIVE_BLOCK_CONDITION)
            .getOne();
        if (!block) {
            return;
        }
        const details = block.type === CustomerBlockType.TEMPORARY
            ? [{ path: 'until', message: block.until!.toISOString() }]
            : [{ path: 'feeAmount', message: block.feeAmount!.toFixed(2) }];
        throw new AppException(ErrorCode.CUSTOMER_BLOCKED, HttpStatus.FORBIDDEN, 'Este negócio bloqueou seus agendamentos online. Entre em contato com ele.', details);
    }

    async findPossibleDuplicates(businessId: string): Promise<PossibleDuplicateGroup[]> {
        const groupBy = (field: DuplicateField) => `
            SELECT '${field}' AS field, "${field}" AS value, array_agg(id ORDER BY "createdAt") AS ids
            FROM customers
            WHERE "businessId" = $1 AND "deletedAt" IS NULL AND "${field}" IS NOT NULL
            GROUP BY "${field}"
            HAVING count(*) > 1`;
        const rows: DuplicateGroupRow[] = await this.customers.query(
            `${groupBy(DuplicateField.PHONE)} UNION ALL ${groupBy(DuplicateField.EMAIL)} ORDER BY value`,
            [businessId],
        );
        if (!rows.length) {
            return [];
        }

        const customers = await this.withNoShowCounts(await CustomersService.withStanding(this.customers.createQueryBuilder('customer'))
            .where('customer.id IN (:...ids)', { ids: rows.flatMap((r) => r.ids) })
            .getMany());
        const byId = new Map(customers.map((c) => [c.id, c]));
        return rows.map((row) => ({ field: row.field, value: row.value, customers: row.ids.map((id) => byId.get(id)!) }));
    }

    /**
     * Cliente do negócio para a conta do usuário, usado pelo agendamento online dentro da transação dele.
     * Só liga a conta a um cliente de balcão pelo e-mail verificado e com um único candidato: ligar dá acesso ao histórico do cliente.
     */
    async resolveForUser(manager: EntityManager, businessId: string, userId: string): Promise<CustomerEntity> {
        const user = await this.users.findById(userId);
        if (!user?.emailVerifiedAt) {
            throw new AppException(ErrorCode.EMAIL_NOT_VERIFIED, HttpStatus.FORBIDDEN, 'Confirme seu e-mail para agendar.');
        }

        const repo = manager.getRepository(CustomerEntity);
        const linked = await repo.findOne({ where: { business: { id: businessId }, user: { id: user.id } }, withDeleted: true });
        if (linked) {
            if (linked.deletedAt) {
                await repo.restore({ id: linked.id });
                linked.deletedAt = null;
            }
            return linked;
        }

        const candidates = await repo.find({ where: { business: { id: businessId }, email: user.email, user: IsNull() }, take: 2 });
        if (candidates.length === 1) {
            const [candidate] = candidates;
            const { affected } = await repo.update(
                { id: candidate.id, user: IsNull() },
                { user: { id: user.id }, phone: candidate.phone ?? user.phone },
            );
            if (affected) {
                return repo.findOneByOrFail({ id: candidate.id });
            }
            return this.resolveForUser(manager, businessId, userId);
        }

        return repo.save(repo.create({
            business: { id: businessId },
            user: { id: user.id },
            name: user.name,
            email: user.email,
            phone: user.phone,
        }));
    }

    private async ensureNoDuplicate(businessId: string, contact: ContactFields, ignoreId?: string): Promise<void> {
        const base: FindOptionsWhere<CustomerEntity> = { business: { id: businessId }, ...(ignoreId && { id: Not(ignoreId) }) };
        const where = [
            ...(contact.phone ? [{ ...base, phone: contact.phone }] : []),
            ...(contact.email ? [{ ...base, email: contact.email }] : []),
        ];
        if (!where.length) {
            return;
        }

        const matches = await this.customers.find({ where });
        if (!matches.length) {
            return;
        }

        const details = matches.flatMap((match) => [
            ...(contact.phone && match.phone === contact.phone ? [{ path: DuplicateField.PHONE, message: match.id }] : []),
            ...(contact.email && match.email === contact.email ? [{ path: DuplicateField.EMAIL, message: match.id }] : []),
        ]);
        throw new AppException(ErrorCode.CUSTOMER_POSSIBLE_DUPLICATE, HttpStatus.CONFLICT, 'Já existe cliente com este telefone ou e-mail.', details);
    }

    private static isValidBlockEnd(until: Date): boolean {
        const now = Date.now();
        return until.getTime() > now && until.getTime() <= now + MAX_BLOCK_DAYS * DAY_MS;
    }

    private static withStanding(qb: SelectQueryBuilder<CustomerEntity>): SelectQueryBuilder<CustomerEntity> {
        return qb
            .leftJoinAndSelect('customer.user', 'user')
            .leftJoinAndMapOne('customer.activeBlock', 'customer.blocks', 'block', ACTIVE_BLOCK_CONDITION);
    }

    private async withNoShowCounts(customers: CustomerEntity[]): Promise<CustomerEntity[]> {
        if (!customers.length) {
            return customers;
        }
        const rows: { id: string; count: string }[] = await this.customers.createQueryBuilder('customer')
            .innerJoin('customer.appointments', 'appointment', 'appointment.status = :noShow AND appointment.deletedAt IS NULL', { noShow: AppointmentStatus.NO_SHOW })
            .select('customer.id', 'id')
            .addSelect('COUNT(appointment.id)', 'count')
            .where('customer.id IN (:...ids)', { ids: customers.map((c) => c.id) })
            .groupBy('customer.id')
            .withDeleted()
            .getRawMany();
        const counts = new Map(rows.map((row) => [row.id, Number(row.count)]));
        for (const customer of customers) {
            customer.noShowCount = counts.get(customer.id) ?? 0;
        }
        return customers;
    }

    private static normalizeContact(dto: ContactFields): ContactFields {
        return {
            ...(dto.email !== undefined && { email: dto.email && UsersService.normalizeEmail(dto.email) }),
            ...(dto.phone !== undefined && { phone: dto.phone }),
        };
    }
}

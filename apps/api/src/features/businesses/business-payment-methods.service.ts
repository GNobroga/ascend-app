import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type EntityManager } from 'typeorm';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { BusinessPaymentMethodEntity } from '../../database/entities/business-payment-method.entity.js';
import type {
    CreatePaymentMethodDto,
    PaymentMethodListQueryDto,
    UpdatePaymentMethodDto,
} from './dto/business-payment-method.dto.js';

export const DEFAULT_PAYMENT_METHODS = ['Dinheiro', 'Pix', 'Cartão de crédito', 'Cartão de débito'];

@Injectable()
export class BusinessPaymentMethodsService {

    constructor(@InjectRepository(BusinessPaymentMethodEntity) private readonly methods: Repository<BusinessPaymentMethodEntity>) { }

    list(businessId: string, query: PaymentMethodListQueryDto = {}): Promise<BusinessPaymentMethodEntity[]> {
        return this.methods.find({
            where: { business: { id: businessId }, ...(query.isActive !== undefined && { isActive: query.isActive }) },
            order: { name: 'ASC' },
        });
    }

    async getActiveById(businessId: string, id: string): Promise<BusinessPaymentMethodEntity> {
        const method = await this.methods.findOneBy({ id, business: { id: businessId }, isActive: true });
        if (!method) {
            throw BusinessPaymentMethodsService.notFound();
        }
        return method;
    }

    async createDefaults(manager: EntityManager, businessId: string): Promise<void> {
        await manager.save(DEFAULT_PAYMENT_METHODS.map((name) => manager.create(BusinessPaymentMethodEntity, { business: { id: businessId }, name })));
    }

    create(businessId: string, dto: CreatePaymentMethodDto): Promise<BusinessPaymentMethodEntity> {
        return this.methods.save(this.methods.create({
            business: { id: businessId },
            name: dto.name.trim(),
            description: dto.description ?? null,
            isActive: dto.isActive,
        }));
    }

    async update(businessId: string, id: string, dto: UpdatePaymentMethodDto): Promise<BusinessPaymentMethodEntity> {
        const method = await this.getById(businessId, id);
        this.methods.merge(method, { name: dto.name?.trim(), description: dto.description, isActive: dto.isActive });
        return this.methods.save(method);
    }

    async remove(businessId: string, id: string): Promise<void> {
        const method = await this.getById(businessId, id);
        await this.methods.softDelete({ id: method.id });
    }

    private async getById(businessId: string, id: string): Promise<BusinessPaymentMethodEntity> {
        const method = await this.methods.findOneBy({ id, business: { id: businessId } });
        if (!method) {
            throw BusinessPaymentMethodsService.notFound();
        }
        return method;
    }

    private static notFound(): AppException {
        return new AppException(ErrorCode.PAYMENT_METHOD_NOT_FOUND, HttpStatus.NOT_FOUND, 'Forma de pagamento não encontrada.');
    }
}

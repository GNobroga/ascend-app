import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { BusinessSettingEntity } from '../../database/entities/business-setting.entity.js';
import type { UpdateBusinessSettingDto } from './dto/business-setting.dto.js';

const MINUTES_PER_DAY = 24 * 60;

@Injectable()
export class BusinessSettingsService {

    constructor(@InjectRepository(BusinessSettingEntity) private readonly settings: Repository<BusinessSettingEntity>) { }

    // A configuração nasce junto com o negócio, então sempre existe para um negócio acessível.
    getByBusiness(businessId: string): Promise<BusinessSettingEntity> {
        return this.settings.findOneByOrFail({ business: { id: businessId } });
    }

    async update(businessId: string, dto: UpdateBusinessSettingDto): Promise<BusinessSettingEntity> {
        const setting = await this.getByBusiness(businessId);
        this.settings.merge(setting, dto);
        BusinessSettingsService.ensureAdvanceWindowIsValid(setting);
        return this.settings.save(setting);
    }

    private static ensureAdvanceWindowIsValid(setting: BusinessSettingEntity): void {
        if (setting.minimumAdvanceBookingMinutes >= setting.maximumAdvanceBookingDays * MINUTES_PER_DAY) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, 'Dados inválidos.', [
                { path: 'minimumAdvanceBookingMinutes', message: 'minimumAdvanceBookingMinutes must be less than maximumAdvanceBookingDays' },
            ]);
        }
    }
}

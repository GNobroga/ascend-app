import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ensureEndsAfterStart } from '../../common/utilities/time-range.js';
import { BusinessHourEntity } from '../../database/entities/business-hour.entity.js';
import type { BusinessHourDto } from './dto/business-hour.dto.js';

@Injectable()
export class BusinessHoursService {

    constructor(@InjectRepository(BusinessHourEntity) private readonly hours: Repository<BusinessHourEntity>) { }

    findByBusiness(businessId: string): Promise<BusinessHourEntity[]> {
        return this.hours.find({ where: { business: { id: businessId } }, order: { dayOfWeek: 'ASC' } });
    }

    async replaceWeek(businessId: string, week: BusinessHourDto[]): Promise<BusinessHourEntity[]> {
        ensureEndsAfterStart(week.flatMap((day, i) => !day.isClosed && day.openTime && day.closeTime
            ? [{ start: day.openTime, end: day.closeTime, path: `hours.${i}.closeTime` }]
            : []));

        await this.hours.manager.transaction(async (manager) => {
            const repo = manager.getRepository(BusinessHourEntity);
            await repo.delete({ business: { id: businessId } });
            await repo.save(week.map((day) => repo.create({
                business: { id: businessId },
                dayOfWeek: day.dayOfWeek,
                isClosed: day.isClosed,
                openTime: day.isClosed ? null : day.openTime,
                closeTime: day.isClosed ? null : day.closeTime,
            })));
        });

        return this.findByBusiness(businessId);
    }
}

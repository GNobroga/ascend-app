import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { Weekday } from '../../common/enums/weekday.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { ensureEndsAfterStart, toHourMinute } from '../../common/utilities/time-range.js';
import { ProfessionalWorkingHoursEntity } from '../../database/entities/professional-working-hours.entity.js';
import { BusinessHoursService } from '../businesses/index.js';
import type { ProfessionalWorkingHourDto } from './dto/professional-working-hours.dto.js';
import { ProfessionalsService } from './professionals.service.js';

@Injectable()
export class ProfessionalWorkingHoursService {

    constructor(
        @InjectRepository(ProfessionalWorkingHoursEntity) private readonly hours: Repository<ProfessionalWorkingHoursEntity>,
        private readonly professionals: ProfessionalsService,
        private readonly businessHours: BusinessHoursService,
    ) { }

    async findByProfessional(businessId: string, professionalId: string): Promise<ProfessionalWorkingHoursEntity[]> {
        await this.professionals.ensureExists(businessId, professionalId);
        return this.list(professionalId);
    }

    async replaceWeek(businessId: string, professionalId: string, week: ProfessionalWorkingHourDto[]): Promise<ProfessionalWorkingHoursEntity[]> {
        await this.professionals.ensureExists(businessId, professionalId);
        const workDays = week.flatMap((day, i) => !day.isDayOff && day.startTime && day.endTime
            ? [{ index: i, dayOfWeek: day.dayOfWeek, start: day.startTime, end: day.endTime }]
            : []);

        ensureEndsAfterStart(workDays.map(({ index, start, end }) => ({ start, end, path: `workingHours.${index}.endTime` })));
        await this.ensureWithinBusinessHours(businessId, workDays);

        await this.hours.manager.transaction(async (manager) => {
            const repo = manager.getRepository(ProfessionalWorkingHoursEntity);
            await repo.delete({ professional: { id: professionalId } });
            await repo.save(week.map((day) => repo.create({
                professional: { id: professionalId },
                dayOfWeek: day.dayOfWeek,
                isDayOff: day.isDayOff,
                startTime: day.isDayOff ? null : day.startTime,
                endTime: day.isDayOff ? null : day.endTime,
            })));
        });

        return this.list(professionalId);
    }

    findForDay(professionalIds: string[], dayOfWeek: Weekday): Promise<ProfessionalWorkingHoursEntity[]> {
        return this.hours.find({ where: { professional: { id: In(professionalIds) }, dayOfWeek }, relations: { professional: true } });
    }

    private list(professionalId: string): Promise<ProfessionalWorkingHoursEntity[]> {
        return this.hours.find({ where: { professional: { id: professionalId } }, order: { dayOfWeek: 'ASC' } });
    }

    private async ensureWithinBusinessHours(
        businessId: string,
        workDays: { index: number; dayOfWeek: number; start: string; end: string }[],
    ): Promise<void> {
        const businessWeek = await this.businessHours.findByBusiness(businessId);
        if (!businessWeek.length) {
            return;
        }

        const details = workDays.flatMap(({ index, dayOfWeek, start, end }) => {
            const opening = businessWeek.find((h) => h.dayOfWeek === dayOfWeek);
            if (!opening || opening.isClosed || !opening.openTime || !opening.closeTime) {
                return [{ path: `workingHours.${index}.isDayOff`, message: 'the business is closed on this day' }];
            }
            const open = toHourMinute(opening.openTime);
            const close = toHourMinute(opening.closeTime);
            return start < open || end > close
                ? [{ path: `workingHours.${index}`, message: `working hours must be within business hours (${open}-${close})` }]
                : [];
        });

        if (details.length) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, 'Dados inválidos.', details);
        }
    }
}

import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThan, MoreThan, Not, Repository } from 'typeorm';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { AppointmentEntity } from '../../database/entities/appointment.entity.js';
import { ProfessionalTimeOffEntity } from '../../database/entities/professional-time-off.entity.js';
import type { CreateProfessionalTimeOffDto, ProfessionalTimeOffQueryDto, UpdateProfessionalTimeOffDto } from './dto/professional-time-off.dto.js';
import { ProfessionalsService } from './professionals.service.js';

@Injectable()
export class ProfessionalTimeOffsService {

    constructor(
        @InjectRepository(ProfessionalTimeOffEntity) private readonly timeOffs: Repository<ProfessionalTimeOffEntity>,
        private readonly professionals: ProfessionalsService,
    ) { }

    async list(businessId: string, professionalId: string, query: ProfessionalTimeOffQueryDto = {}): Promise<ProfessionalTimeOffEntity[]> {
        await this.professionals.ensureExists(businessId, professionalId);
        return this.timeOffs.find({
            where: {
                professional: { id: professionalId },
                ...(query.from && { endAt: MoreThan(query.from) }),
                ...(query.to && { startAt: LessThan(query.to) }),
            },
            order: { startAt: 'ASC' },
        });
    }

    findOverlapping(professionalIds: string[], from: Date, to: Date): Promise<ProfessionalTimeOffEntity[]> {
        return this.timeOffs.find({
            where: { professional: { id: In(professionalIds) }, startAt: LessThan(to), endAt: MoreThan(from) },
            relations: { professional: true },
        });
    }

    async create(businessId: string, professionalId: string, dto: CreateProfessionalTimeOffDto): Promise<ProfessionalTimeOffEntity> {
        await this.professionals.ensureExists(businessId, professionalId);
        await this.ensureValidPeriod(professionalId, dto.startAt, dto.endAt);
        return this.timeOffs.save(this.timeOffs.create({
            professional: { id: professionalId },
            startAt: dto.startAt,
            endAt: dto.endAt,
            type: dto.type,
            reason: dto.reason ?? null,
        }));
    }

    async update(businessId: string, professionalId: string, id: string, dto: UpdateProfessionalTimeOffDto): Promise<ProfessionalTimeOffEntity> {
        const timeOff = await this.getById(businessId, professionalId, id);
        this.timeOffs.merge(timeOff, { startAt: dto.startAt, endAt: dto.endAt, type: dto.type, reason: dto.reason });
        await this.ensureValidPeriod(professionalId, timeOff.startAt, timeOff.endAt, timeOff.id);
        return this.timeOffs.save(timeOff);
    }

    async remove(businessId: string, professionalId: string, id: string): Promise<void> {
        const timeOff = await this.getById(businessId, professionalId, id);
        await this.timeOffs.delete({ id: timeOff.id });
    }

    private async getById(businessId: string, professionalId: string, id: string): Promise<ProfessionalTimeOffEntity> {
        await this.professionals.ensureExists(businessId, professionalId);
        const timeOff = await this.timeOffs.findOneBy({ id, professional: { id: professionalId } });
        if (!timeOff) {
            throw new AppException(ErrorCode.TIME_OFF_NOT_FOUND, HttpStatus.NOT_FOUND, 'Ausência não encontrada.');
        }
        return timeOff;
    }

    private async ensureValidPeriod(professionalId: string, startAt: Date, endAt: Date, ignoreId?: string): Promise<void> {
        if (endAt <= startAt) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, 'Dados inválidos.', [
                { path: 'endAt', message: 'endAt must be after startAt' },
            ]);
        }

        const overlaps = await this.timeOffs.existsBy({
            professional: { id: professionalId },
            startAt: LessThan(endAt),
            endAt: MoreThan(startAt),
            ...(ignoreId && { id: Not(ignoreId) }),
        });
        if (overlaps) {
            throw new AppException(ErrorCode.TIME_OFF_OVERLAP, HttpStatus.CONFLICT, 'O período se sobrepõe a outra ausência do profissional.');
        }

        // `appointments` depende de `professionals`, e não o contrário; por isso a agenda é lida direto pelo manager.
        const hasAppointments = await this.timeOffs.manager.existsBy(AppointmentEntity, {
            deletedAt: IsNull(),
            professional: { id: professionalId },
            startAt: LessThan(endAt),
            endAt: MoreThan(startAt),
            status: Not(In([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW])),
        });
        if (hasAppointments) {
            throw new AppException(
                ErrorCode.TIME_OFF_CONFLICTS_WITH_APPOINTMENTS,
                HttpStatus.CONFLICT,
                'O profissional tem agendamentos nesse período; remarque ou cancele antes.',
            );
        }
    }
}

import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { SpecialtyEntity } from '../../database/entities/specialty.entity.js';
import type { CreateSpecialtyDto, UpdateSpecialtyDto } from './dto/specialty.dto.js';

@Injectable()
export class SpecialtiesService {

    constructor(@InjectRepository(SpecialtyEntity) private readonly specialties: Repository<SpecialtyEntity>) { }

    list(businessId: string): Promise<SpecialtyEntity[]> {
        return this.specialties.find({ where: { business: { id: businessId } }, order: { name: 'ASC' } });
    }

    async getById(businessId: string, id: string): Promise<SpecialtyEntity> {
        const specialty = await this.specialties.findOneBy({ id, business: { id: businessId } });
        if (!specialty) {
            throw SpecialtiesService.notFound();
        }
        return specialty;
    }

    async ensureAllExist(businessId: string, ids: string[]): Promise<void> {
        const found = ids.length ? await this.specialties.countBy({ id: In(ids), business: { id: businessId } }) : 0;
        if (found !== ids.length) {
            throw SpecialtiesService.notFound();
        }
    }

    async create(businessId: string, dto: CreateSpecialtyDto): Promise<SpecialtyEntity> {
        const name = dto.name.trim();
        await this.ensureNameAvailable(businessId, name);
        return this.specialties.save(this.specialties.create({
            business: { id: businessId },
            name,
            description: dto.description ?? null,
        }));
    }

    async update(businessId: string, id: string, dto: UpdateSpecialtyDto): Promise<SpecialtyEntity> {
        const specialty = await this.getById(businessId, id);
        const name = dto.name?.trim();
        if (name !== undefined && name !== specialty.name) {
            await this.ensureNameAvailable(businessId, name);
        }
        this.specialties.merge(specialty, { name, description: dto.description });
        return this.specialties.save(specialty);
    }

    async remove(businessId: string, id: string): Promise<void> {
        const specialty = await this.getById(businessId, id);
        await this.specialties.delete({ id: specialty.id });
    }

    private async ensureNameAvailable(businessId: string, name: string): Promise<void> {
        if (await this.specialties.existsBy({ name, business: { id: businessId } })) {
            throw new AppException(ErrorCode.SPECIALTY_NAME_IN_USE, HttpStatus.CONFLICT, 'Já existe uma especialidade com este nome.');
        }
    }

    private static notFound(): AppException {
        return new AppException(ErrorCode.SPECIALTY_NOT_FOUND, HttpStatus.NOT_FOUND, 'Especialidade não encontrada.');
    }
}

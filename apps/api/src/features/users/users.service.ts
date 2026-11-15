import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { StorageService } from '../../common/storage/storage.service.js';
import { UserEntity } from '../../database/entities/user.entity.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';

export interface CreateUserInput {
    name: string;
    email: string;
    passwordHash?: string | null;
    photoUrl?: string | null;
    emailVerifiedAt?: Date | null;
}

@Injectable()
export class UsersService {

    constructor(
        @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
        private readonly storage: StorageService,
    ) { }

    static normalizeEmail(email: string): string {
        return email.trim().toLowerCase();
    }

    findById(id: string): Promise<UserEntity | null> {
        return this.users.findOneBy({ id });
    }

    async getCurrent(id: string): Promise<UserEntity> {
        const user = await this.findById(id);
        if (!user) {
            throw new AppException(ErrorCode.UNAUTHENTICATED, HttpStatus.UNAUTHORIZED, 'Não autenticado.');
        }
        return user;
    }

    findByEmail(email: string): Promise<UserEntity | null> {
        return this.users.findOneBy({ email: UsersService.normalizeEmail(email) });
    }

    async create(input: CreateUserInput): Promise<UserEntity> {
        const email = UsersService.normalizeEmail(input.email);

        const existing = await this.users.findOne({ where: { email }, withDeleted: true });

        if (existing) {
            throw UsersService.emailInUse();
        }

        return await this.users.save(this.users.create({
            name: input.name.trim(),
            email,
            passwordHash: input.passwordHash ?? null,
            photoUrl: input.photoUrl ?? null,
            emailVerifiedAt: input.emailVerifiedAt ?? null,
        }));

    }

    async markEmailVerified(id: string): Promise<void> {
        await this.users.update({ id, emailVerifiedAt: IsNull() }, { emailVerifiedAt: new Date() });
    }

    async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
        await this.users.update({ id }, { passwordHash });
    }

    async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserEntity> {
        const user = await this.getCurrent(id);
        if (dto.name !== undefined) {
            user.name = dto.name.trim();
        }
        if (dto.phone !== undefined && dto.phone !== user.phone) {
            user.phone = dto.phone;
            user.phoneVerifiedAt = null;
        }
        return await this.users.save(user);
    }

    async setPhoto(id: string, file: Buffer): Promise<UserEntity> {
        const user = await this.getCurrent(id);
        user.photoKey = await this.storage.replaceImage(`users/${id}`, file, user.photoKey, async (photoKey) => {
            await this.users.update({ id }, { photoKey, photoUrl: null });
        });
        user.photoUrl = null;
        return user;
    }

    async removePhoto(id: string): Promise<void> {
        const user = await this.getCurrent(id);
        await this.users.update({ id }, { photoKey: null, photoUrl: null });
        if (user.photoKey) {
            await this.storage.delete(user.photoKey);
        }
    }

    private static emailInUse(): AppException {
        return new AppException(ErrorCode.EMAIL_ALREADY_IN_USE, HttpStatus.CONFLICT, 'E-mail já cadastrado.');
    }
}

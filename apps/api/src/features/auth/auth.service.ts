import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { MailDispatcher } from '../../common/mail/mail-dispatcher.service.js';
import { AuthProvider } from '../../common/enums/auth-provider.enum.js';
import { UserTokenType } from '../../common/enums/user-token-type.enum.js';
import { env } from '../../config/env.config.js';
import { UserIdentityEntity } from '../../database/entities/user-identity.entity.js';
import type { UserEntity } from '../../database/entities/user.entity.js';
import { UsersService } from '../users/index.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import type { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { ResetPasswordDto } from './dto/reset-password.dto.js';
import { EmailVerificationMail } from './mails/email-verification.mail.js';
import { PasswordResetMail } from './mails/password-reset.mail.js';
import type { GoogleProfile } from './services/google.service.js';
import { PasswordHasher } from './services/password-hasher.service.js';
import { TokenService, type SessionTokens } from './services/token.service.js';
import { UserTokenService } from './services/user-token.service.js';

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export interface AuthResult {
    user: UserEntity;
    session: SessionTokens;
}

@Injectable()
export class AuthService {

    constructor(
        private readonly users: UsersService,
        private readonly tokens: TokenService,
        private readonly userTokens: UserTokenService,
        private readonly passwords: PasswordHasher,
        private readonly mail: MailDispatcher,
        @InjectRepository(UserIdentityEntity) private readonly identities: Repository<UserIdentityEntity>,
    ) { }

    async register(dto: RegisterDto, currentRefreshToken?: string): Promise<AuthResult> {
        const user = await this.users.create({
            name: dto.name,
            email: dto.email,
            passwordHash: await this.passwords.hash(dto.password),
        });
        this.sendEmailVerification(user);
        return { user, session: await this.tokens.openSession(user.id, currentRefreshToken) };
    }

    async resendEmailVerification(userId: string): Promise<void> {
        const user = await this.users.getCurrent(userId);
        if (user.emailVerifiedAt) {
            throw new AppException(ErrorCode.EMAIL_ALREADY_VERIFIED, HttpStatus.CONFLICT, 'E-mail já verificado.');
        }
        this.sendEmailVerification(user);
    }

 
    async verifyEmail(token: string | undefined): Promise<void> {
        const userId = token ? await this.userTokens.verify(token, UserTokenType.EMAIL_VERIFICATION) : null;
        if (!userId) {
            throw new AppException(ErrorCode.INVALID_VERIFICATION_TOKEN, HttpStatus.BAD_REQUEST, 'Link de verificação inválido ou expirado.');
        }
        await this.users.markEmailVerified(userId);
    }


    forgotPassword(dto: ForgotPasswordDto): void {
        this.mail.dispatch(PasswordResetMail, async () => {
            const user = await this.users.findByEmail(dto.email);
            if (!user) {
                return null;
            }
            const token = await this.userTokens.issue(user.id, UserTokenType.PASSWORD_RESET, env.PASSWORD_RESET_TTL_MINUTES * MINUTE_MS);
            const url = new URL('/reset-password', env.FRONTEND_URL);
            url.searchParams.set('token', token);
            return {
                to: { name: user.name, address: user.email },
                data: { name: user.name, url: url.toString(), ttlMinutes: env.PASSWORD_RESET_TTL_MINUTES },
            };
        });
    }

    async resetPassword(dto: ResetPasswordDto): Promise<void> {
        const passwordHash = await this.passwords.hash(dto.password);

        const userId = await this.userTokens.consume(dto.token, UserTokenType.PASSWORD_RESET);
        if (!userId) {
            throw new AppException(ErrorCode.INVALID_RESET_TOKEN, HttpStatus.BAD_REQUEST, 'Link de redefinição inválido, expirado ou já usado.');
        }

        await this.users.updatePasswordHash(userId, passwordHash);
        await this.users.markEmailVerified(userId);
        await this.tokens.revokeAllSessions(userId);
    }

    async login(dto: LoginDto, currentRefreshToken?: string): Promise<AuthResult> {
        const user = await this.users.findByEmail(dto.email);

        const valid = await this.passwords.verify(user?.passwordHash, dto.password);

        if (!user || !valid) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED, 'E-mail ou senha inválidos.');
        }

        return { user, session: await this.tokens.openSession(user.id, currentRefreshToken) };
    }

    refresh(refreshToken: string | undefined): Promise<SessionTokens> {
        if (!refreshToken) {
            throw new AppException(ErrorCode.INVALID_REFRESH_TOKEN, HttpStatus.UNAUTHORIZED, 'Sessão inválida ou expirada.');
        }
        return this.tokens.rotate(refreshToken);
    }

    async logout(refreshToken: string | undefined): Promise<void> {
        if (refreshToken) {
            await this.tokens.revokeSession(refreshToken);
        }
    }

    /** Troca a senha (ou cria, em conta só com Google), derruba todas as sessões e abre uma nova para quem trocou. */
    async changePassword(userId: string, dto: ChangePasswordDto): Promise<SessionTokens> {
        const user = await this.users.getCurrent(userId);
        if (user.passwordHash && !await this.passwords.verify(user.passwordHash, dto.currentPassword ?? '')) {
            throw new AppException(ErrorCode.INVALID_CURRENT_PASSWORD, HttpStatus.BAD_REQUEST, 'Senha atual incorreta.');
        }

        await this.users.updatePasswordHash(userId, await this.passwords.hash(dto.newPassword));
        await this.tokens.revokeAllSessions(userId);
        return this.tokens.openSession(userId);
    }

    async loginWithGoogle(profile: GoogleProfile, currentRefreshToken?: string): Promise<AuthResult> {
        if (!profile.emailVerified) {
            throw new AppException(ErrorCode.GOOGLE_EMAIL_NOT_VERIFIED, HttpStatus.FORBIDDEN, 'E-mail não verificado pelo Google.');
        }

        const identity = await this.identities.findOne({
            where: { provider: AuthProvider.GOOGLE, providerUserId: profile.sub },
            relations: { user: true },
        });

        let user: UserEntity;
        if (identity) {
            if (!identity.user) {
                throw new AppException(ErrorCode.OAUTH_FAILED, HttpStatus.UNAUTHORIZED, 'Conta indisponível.');
            }
            user = identity.user;
            if (!identity.emailVerified) {
                await this.identities.update({ id: identity.id }, { emailVerified: true });
            }
        } else {
            user = await this.users.findByEmail(profile.email) ?? await this.users.create({
                name: profile.name ?? profile.email.split('@')[0],
                email: profile.email,
                photoUrl: profile.picture,
                emailVerifiedAt: new Date(),
            });
            await this.identities.save(this.identities.create({
                provider: AuthProvider.GOOGLE,
                providerUserId: profile.sub,
                emailVerified: true,
                user,
            }));
        }


        await this.users.markEmailVerified(user.id);

        return { user, session: await this.tokens.openSession(user.id, currentRefreshToken) };
    }

    private sendEmailVerification(user: UserEntity): void {
        this.mail.dispatch(EmailVerificationMail, async () => {
            const token = await this.userTokens.issue(user.id, UserTokenType.EMAIL_VERIFICATION, env.EMAIL_VERIFICATION_TTL_HOURS * HOUR_MS);
            const url = new URL('/api/auth/verify-email', env.API_URL);
            url.searchParams.set('token', token);
            return {
                to: { name: user.name, address: user.email },
                data: { name: user.name, url: url.toString(), ttlHours: env.EMAIL_VERIFICATION_TTL_HOURS },
            };
        });
    }
}

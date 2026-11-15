import { HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-code.enum.js';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {

    protected override async throwThrottlingException(): Promise<void> {
        throw new AppException(ErrorCode.TOO_MANY_REQUESTS, HttpStatus.TOO_MANY_REQUESTS, 'Muitas requisições. Tente novamente em instantes.');
    }
}

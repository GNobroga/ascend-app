import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordHasher {

    private readonly dummyHash = argon2.hash('dummy-password-for-timing');

    hash(password: string): Promise<string> {
        return argon2.hash(password);
    }

    async verify(hash: string | null | undefined, password: string): Promise<boolean> {
        if (!hash) {
            await argon2.verify(await this.dummyHash, password);
            return false;
        }
        return argon2.verify(hash, password);
    }
}

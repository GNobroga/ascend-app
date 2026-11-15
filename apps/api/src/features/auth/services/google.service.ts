import { randomBytes } from 'node:crypto';
import { env } from '@/config/env.config.js';
import { Injectable } from '@nestjs/common';
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';

export interface GoogleAuthorizationRequest {
    url: string;
    state: string;
    codeVerifier: string;
}

export interface GoogleProfile {
    sub: string;
    email: string;
    emailVerified: boolean;
    name: string | null;
    picture: string | null;
}

const SCOPES = ['openid', 'email', 'profile'];

@Injectable()
export class GoogleAuthService {

    private readonly client = new OAuth2Client({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        redirectUri: env.GOOGLE_REDIRECT_URI,
    });

    async createAuthorizationRequest(): Promise<GoogleAuthorizationRequest> {
        const state = randomBytes(32).toString('base64url');
        const { codeVerifier, codeChallenge } = await this.client.generateCodeVerifierAsync();

        const url = this.client.generateAuthUrl({
            scope: SCOPES,
            state,
            code_challenge: codeChallenge,
            code_challenge_method: CodeChallengeMethod.S256,
        });

        return { url, state, codeVerifier };
    }

    async getProfile(code: string, codeVerifier: string): Promise<GoogleProfile | null> {
        try {
            const { tokens } = await this.client.getToken({ code, codeVerifier });
            if (!tokens.id_token) {
                return null;
            }

            const ticket = await this.client.verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_CLIENT_ID });
            const payload = ticket.getPayload();
            if (!payload?.sub || !payload.email) {
                return null;
            }

            return {
                sub: payload.sub,
                email: payload.email,
                emailVerified: payload.email_verified === true,
                name: payload.name ?? null,
                picture: payload.picture ?? null,
            };
        } catch {
            return null;
        }
    }
}

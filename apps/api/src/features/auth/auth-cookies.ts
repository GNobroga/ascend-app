import { Injectable, type CookieSerializeOptions } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Response } from 'express';
import { env } from '../../config/env.config.js';
import type { SessionTokens } from './services/token.service.js';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
export const OAUTH_GOOGLE_COOKIE = 'oauth_google';
export const OAUTH_GOOGLE_REDIRECT_COOKIE = 'oauth_google_redirect';

export interface OAuthGoogleCookie {
    state: string;
    codeVerifier: string;
}

const OAUTH_COOKIE_TTL_SECONDS = 10 * 60;
const DAY_SECONDS = 24 * 60 * 60;

const baseOptions = (path: string): CookieSerializeOptions => ({
    path,
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    ...(env.COOKIE_DOMAIN && { domain: env.COOKIE_DOMAIN }),
});

const accessOptions = baseOptions('/');
const refreshOptions = baseOptions('/api/auth');
const oauthGoogleOptions = baseOptions('/api/auth/google');

@Injectable()
export class AuthCookies {

    constructor(private readonly adapterHost: HttpAdapterHost) { }

    private get adapter() {
        return this.adapterHost.httpAdapter;
    }

    setSession(res: Response, tokens: SessionTokens): void {
        this.adapter.setCookie(res, ACCESS_TOKEN_COOKIE, tokens.accessToken, { ...accessOptions, maxAge: env.ACCESS_TOKEN_TTL_SECONDS });
        this.adapter.setCookie(res, REFRESH_TOKEN_COOKIE, tokens.refreshToken, { ...refreshOptions, maxAge: env.REFRESH_TOKEN_TTL_DAYS * DAY_SECONDS });
    }

    clearSession(res: Response): void {
        this.adapter.clearCookie(res, ACCESS_TOKEN_COOKIE, accessOptions);
        this.adapter.clearCookie(res, REFRESH_TOKEN_COOKIE, refreshOptions);
    }

    setOAuthGoogle(res: Response, { state, codeVerifier }: OAuthGoogleCookie, redirectTo: string | null): void {
        this.adapter.setCookie(res, OAUTH_GOOGLE_COOKIE, `${state}.${codeVerifier}`, { ...oauthGoogleOptions, maxAge: OAUTH_COOKIE_TTL_SECONDS });
        if (redirectTo) {
            this.adapter.setCookie(res, OAUTH_GOOGLE_REDIRECT_COOKIE, redirectTo, { ...oauthGoogleOptions, maxAge: OAUTH_COOKIE_TTL_SECONDS });
        } else {
            this.adapter.clearCookie(res, OAUTH_GOOGLE_REDIRECT_COOKIE, oauthGoogleOptions);
        }
    }

    clearOAuthGoogle(res: Response): void {
        this.adapter.clearCookie(res, OAUTH_GOOGLE_COOKIE, oauthGoogleOptions);
        this.adapter.clearCookie(res, OAUTH_GOOGLE_REDIRECT_COOKIE, oauthGoogleOptions);
    }

    static parseOAuthGoogle(value: string | undefined): OAuthGoogleCookie | null {
        const separator = value?.indexOf('.') ?? -1;
        if (!value || separator <= 0) {
            return null;
        }
        return { state: value.slice(0, separator), codeVerifier: value.slice(separator + 1) };
    }
}

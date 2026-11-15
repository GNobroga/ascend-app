import { AuthCleanupTask } from './auth-cleanup.task.js';
import { AuthCookies } from './auth-cookies.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { GoogleAuthService } from './services/google.service.js';
import { PasswordHasher } from './services/password-hasher.service.js';
import { TokenService } from './services/token.service.js';
import { UserTokenService } from './services/user-token.service.js';

export { JwtAuthGuard } from './jwt-auth.guard.js';
export { ACCESS_TOKEN_COOKIE } from './auth-cookies.js';

export const authControllers = [AuthController];
export const authProviders = [AuthService, TokenService, UserTokenService, GoogleAuthService, PasswordHasher, AuthCookies, AuthCleanupTask];

export const UserTokenType = {
    EMAIL_VERIFICATION: 'email_verification',
    PASSWORD_RESET: 'password_reset',
} as const;

export type UserTokenType = (typeof UserTokenType)[keyof typeof UserTokenType];

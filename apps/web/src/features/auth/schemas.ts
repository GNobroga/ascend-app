import { z } from 'zod';

const emailSchema = z.email('Informe um e-mail válido.').max(320, 'O e-mail deve ter no máximo 320 caracteres.');

const newPasswordSchema = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .max(128, 'A senha deve ter no máximo 128 caracteres.');

const passwordConfirmationSchema = z.string().min(1, 'Confirme sua senha.');

const passwordsMatch = ({ password, passwordConfirmation }: { password: string; passwordConfirmation: string }) =>
  password === passwordConfirmation;

const PASSWORDS_MISMATCH = { message: 'As senhas não coincidem.', path: ['passwordConfirmation'] };

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe sua senha.').max(128, 'A senha deve ter no máximo 128 caracteres.'),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Informe seu nome.').max(255, 'O nome deve ter no máximo 255 caracteres.'),
    email: emailSchema,
    password: newPasswordSchema,
    passwordConfirmation: passwordConfirmationSchema,
  })
  .refine(passwordsMatch, PASSWORDS_MISMATCH);

export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: newPasswordSchema,
    passwordConfirmation: passwordConfirmationSchema,
  })
  .refine(passwordsMatch, PASSWORDS_MISMATCH);

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const createChangePasswordSchema = (requiresCurrentPassword: boolean) =>
  z
    .object({
      currentPassword: requiresCurrentPassword
        ? z.string().min(1, 'Informe sua senha atual.').max(128, 'A senha deve ter no máximo 128 caracteres.')
        : z.string(),
      password: newPasswordSchema,
      passwordConfirmation: passwordConfirmationSchema,
    })
    .refine(passwordsMatch, PASSWORDS_MISMATCH);

export type ChangePasswordValues = z.infer<ReturnType<typeof createChangePasswordSchema>>;

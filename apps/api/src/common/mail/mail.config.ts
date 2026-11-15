import { join } from 'node:path';
import { FileTemplateEngine, MailModule, SmtpTransport } from '@nestjs/mail';
import { env } from '../../config/env.config.js';

/** Opções do `MailModule`: SMTP do `.env` e templates em `./templates` (layout `layout.html`, partials em `partials/`). */
export const mailOptions: Parameters<typeof MailModule.forRoot>[0] = {
    transport: new SmtpTransport({
        host: env.EMAIL_HOST,
        port: env.EMAIL_PORT,
        secure: env.EMAIL_TLS_ENABLED,
        auth: { user: env.EMAIL_USERNAME, pass: env.EMAIL_PASSWORD },
    }),
    templates: new FileTemplateEngine({
        dir: join(import.meta.dirname, 'templates'),
        layout: 'layout',
        cache: env.NODE_ENV !== 'development',
    }),
    from: env.EMAIL_FROM,
    retry: false,
};

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, type Type } from '@nestjs/common';
import { Mailer, type Mailable, type MailableSendOptions } from '@nestjs/mail';
import type { Queue } from 'bullmq';
import { MAIL_QUEUE, type MailJob } from './mail-queue.js';

type SendOptions<M extends Mailable<any>> = MailableSendOptions<Parameters<M['render']>[0]>;

@Injectable()
export class MailDispatcher {

    private readonly logger = new Logger(MailDispatcher.name);

    constructor(
        private readonly mailer: Mailer,
        @InjectQueue(MAIL_QUEUE) private readonly queue: Queue<MailJob>,
    ) { }

    dispatch<M extends Mailable<any>>(
        mail: Type<M>,
        options: SendOptions<M> | (() => Promise<SendOptions<M> | null>),
    ): void {
        this.enqueue(mail, options).catch((error: unknown) => {
            this.logger.error(`Falha ao enfileirar ${mail.name}.`, error instanceof Error ? error.stack : error);
        });
    }

    private async enqueue<M extends Mailable<any>>(
        mail: Type<M>,
        options: SendOptions<M> | (() => Promise<SendOptions<M> | null>),
    ): Promise<void> {
        const resolved = typeof options === 'function' ? await options() : options;
        if (!resolved) {
            return;
        }
        const message = await this.mailer.render(mail, resolved);
        await this.queue.add(mail.name, {
            to: message.to.map(({ name, address }) => ({ name, address })),
            subject: message.subject,
            html: message.html,
            text: message.text,
        });
    }
}

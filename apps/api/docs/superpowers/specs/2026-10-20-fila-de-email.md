# Fila de e-mail

Envio de e-mail por uma fila durável (BullMQ + Redis), com novas tentativas e limite de taxa. Hoje o `MailDispatcher` tenta uma vez, em memória; uma falha (limite do provedor, SMTP fora do ar, restart no meio do envio) vira só uma linha de log, e o e-mail se perde.

O Redis entra também como base para o que vem depois: cache, storage do throttler e pub/sub do SSE com várias instâncias.

## Decisões

1. **`@nestjs/bullmq` + `bullmq`.** O `bull`/`@nestjs/bull` é a versão legada e só recebe manutenção.
2. **Redis no `docker-compose.yaml`:**
   - `redis:8-alpine` com `--appendonly yes` e volume próprio. Sem persistência, um restart do Redis apaga a fila.
   - Porta só em `127.0.0.1` e senha (`--requirepass`), como o Postgres.
   - Healthcheck com `redis-cli ping`.
3. **Variáveis novas no `EnvConfig`:**
   - `REDIS_HOST`, `REDIS_PORT` (padrão `6379`) e `REDIS_PASSWORD`;
   - `MAIL_RATE_LIMIT_MAX` (padrão `1`) e `MAIL_RATE_LIMIT_DURATION_MS` (padrão `1000`): no máximo `MAX` envios a cada `DURATION_MS`, somando todas as instâncias. O padrão serve ao Mailtrap gratuito; em produção, ajuste ao plano do provedor.
4. **O `dispatch` renderiza e enfileira; não envia.**
   - A assinatura continua a mesma, e quem chama (auth, convites, notificações) não muda.
   - Em segundo plano, como hoje: resolve as opções (inclusive a forma `() => Promise<SendOptions | null>`, que busca o usuário e emite o token fora da requisição) e renderiza com `Mailer.render(MailClass, options)`.
   - O job carrega a **mensagem pronta** (`to`, `subject`, `html`, `text`). Assim:
     - o worker não precisa de um registro nome → classe, e o `common/` continua sem importar as features;
     - mudar um template não afeta o que já está na fila.
   - Falha ao renderizar ou ao enfileirar (Redis fora do ar) é logada, e esse e-mail se perde. O risco é aceito: o Redis passa a ser dependência da API, como o Postgres.
5. **Fila `mail`:**
   - `attempts: 5` com `backoff` exponencial de 1 min (1, 2, 4 e 8 min entre as tentativas);
   - `limiter: { max: MAIL_RATE_LIMIT_MAX, duration: MAIL_RATE_LIMIT_DURATION_MS }` no worker, `concurrency: 1`;
   - todo erro de envio é retentado, porque o provedor marca limite de taxa com código 5xx (o Mailtrap responde `550 Too many emails per second`).
6. **O `Mailer` não retenta mais por conta própria** (retry desligado no `MailModule`). Senão, as 3 tentativas internas multiplicam as 5 da fila.
7. **Retenção e dados sensíveis:** os e-mails de verificação e de redefinição de senha levam o token em claro no link.
   - `removeOnComplete: true`: o job some ao ser enviado.
   - `removeOnFail: { age: 7 dias }`: o falho fica para inspeção. Os tokens já expiraram nesse prazo (24 h e minutos).
8. **Desligamento:** o worker termina o envio em andamento ao parar a API (`enableShutdownHooks`, se ainda não estiver ligado).

## Organização

- `common/mail/`:
  - `mail-dispatcher.service.ts`: passa a enfileirar.
  - `mail.processor.ts`: `WorkerHost` da fila `mail`, que chama `Mailer.send` com a mensagem pronta e loga a falha definitiva.
  - `mail-queue.ts`: nome da fila e tipo do job.
- `AppModule`: `BullModule.forRoot` (conexão) e `BullModule.registerQueue({ name: 'mail' })`. São módulos de terceiros, como o `MailModule`, e não ferem a regra de um módulo só.

## Fora desta spec

- Painel da fila (Bull Board).
- Mover o storage do throttler e o pub/sub do SSE para o Redis.
- Cache.
- Gravar o e-mail na mesma transação da ação que o gera (outbox transacional). O evento depois do commit ainda pode se perder se o processo cair no meio.

## Tarefas

- [x] T1 Redis no `docker-compose.yaml` e as variáveis no `.env` e no `EnvConfig`.
- [x] T2 Instalar `@nestjs/bullmq`, `bullmq` e `ioredis` e registrar a conexão e a fila no `AppModule`. No BullMQ 6 o `ioredis` é opcional e, em ESM, a conexão precisa ser um cliente já construído (`common/redis/redis-client.ts`, com `maxRetriesPerRequest: null`, exigido pelos workers).
- [x] T3 `MailDispatcher` renderiza e enfileira; `MailProcessor` envia com limitador; retry do `Mailer` desligado.
- [x] T4 Fechamento: build e lint; rajada de e-mails contra o Mailtrap, conferindo que todos saem (com espera) e nenhum se perde; restart da API com jobs pendentes; atualizar `docs/regras-de-negocio.md` §14 e o CLAUDE.md (subir o Redis).

## Resultado do fechamento

- Rajada de 12 e-mails em 388 ms: todos entraram na fila; com 1 envio/s, o Mailtrap gratuito ainda recusou a maioria (`550 Too many emails per second`), e as recusas viraram novas tentativas.
- API derrubada com 6 jobs pendentes: os 6 continuaram no Redis e foram retomados ao subir de novo.
- Com `MAIL_RATE_LIMIT_DURATION_MS=10000` no `.env` de desenvolvimento, os 12 foram entregues; os 2 últimos, na 5ª tentativa. Nenhum foi para `failed`.
- Com o Mailtrap gratuito, use 1 envio a cada 10 s em desenvolvimento. Em produção, ajuste ao plano do provedor.

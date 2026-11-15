# Notificações

Avisos de agendamento por e-mail e dentro do sistema, lembrete antes do horário e entrega em tempo real (regras de negócio §12).

Depende da spec `2026-10-20-agendamentos.md`.

## Etapas

1. **Eventos e envio**: concluída.
2. **Lembrete**: concluída.
3. **Leitura**: concluída.
4. **Tempo real**: concluída.

## Decisões gerais

1. **Comunicação por eventos** (`@nestjs/event-emitter`), seguindo a regra 4 do CLAUDE.md:
   - `appointments` emite e não conhece `notifications`;
   - `notifications` escuta e lê o que precisa pelos `index.ts` de `appointments` e `businesses`.
   - Os nomes e os payloads dos eventos ficam em `features/appointments/appointment-events.ts`, exportados pelo `index.ts`.
2. **O evento só sai depois do commit.** Os métodos do `AppointmentsService` emitem depois do `await` da transação, nunca de dentro dela. Assim não sai aviso de agendamento que não foi gravado.
3. **O payload é mínimo:** ids e quem fez a ação (`appointmentId`, `businessId`, `actorUserId` e, quando couber, status anterior, status novo e motivo). O listener recarrega o agendamento, para não depender de entity montada pela metade.
4. **Listeners assíncronos** (`{ async: true }`), para a requisição não esperar o envio. Erro no listener é logado e não sobe.
5. **O banco é a fonte da verdade:** toda notificação in-app é gravada em `notifications` antes de ser empurrada pelo SSE. Se a conexão cair, nada se perde.
6. **Limitação aceita:** se o processo morrer entre o commit e o listener, o aviso se perde, porque não há outbox. Isso vale para os eventos da Etapa 1. O lembrete (Etapa 2) é idempotente e não tem esse problema.

## Etapa 1: eventos e envio

### Eventos

| Evento | Quando | Payload além de `appointmentId`, `businessId` e `actorUserId` |
|---|---|---|
| `appointment.created` | criação pela equipe ou pelo cliente | `origin: 'team' \| 'customer'` |
| `appointment.rescheduled` | `PATCH` que muda `startAt` ou o profissional | `previousStartAt`, `previousProfessionalId` |
| `appointment.status_changed` | mudança de status pela equipe ou cancelamento pelo cliente | `previousStatus`, `status`, `reason` |

- `reschedule` passa a receber o `actorUserId`, como os outros métodos.
- Um `PATCH` que só altera `internalNotes` não emite evento.

### Quem recebe

Destinatários possíveis:
- **Cliente:** e-mail no `user.email` se tiver conta, senão no `customer.email`; sem e-mail, não recebe nada. A notificação in-app só existe se ele tiver conta.
- **Profissional:** o usuário do membro (`professional.member.user`). Recebe in-app e e-mail.
- **Gestores:** membros ativos com papel `owner` ou `admin`. Recebem só in-app, para não lotar a caixa de entrada.

| Evento | Cliente | Profissional | Gestores |
|---|---|---|---|
| criado pelo cliente | e-mail de recebimento: "confirmado" ou "aguardando confirmação", conforme o status | ✅ | ✅ |
| criado pela equipe | ✅ | ✅ | — |
| remarcado | ✅ | ✅ (o antigo e o novo, se o profissional mudou) | — |
| `pending → confirmed` | ✅ | — | — |
| cancelado pela equipe | ✅ | ✅ | — |
| cancelado pelo cliente | e-mail de comprovante | ✅ | ✅ |
| `in_progress`, `completed`, `no_show` | — | — | — |

Regras que valem para todas as linhas:
- **Quem fez a ação não recebe aviso dela.** A exceção é o cliente, que recebe e-mail de comprovante do que ele mesmo fez (sem in-app).
- **O mesmo usuário recebe uma vez por evento.** Exemplo: o dono que também é o profissional.
- **Os horários são formatados no `timezone` do negócio**, em pt-BR (ex.: "terça, 21 de outubro, 14:30").

### Conteúdo

- `title` e `message` são montados em pt-BR na criação e gravados, sem template na leitura.
- **Novos tipos em `NotificationType`:** `appointment_rescheduled` e `appointment_reminder`. A coluna é `varchar`, então não precisa de migration.
- **Templates de e-mail** no layout atual, com botão para o agendamento no front:
  - o cliente vai para `FRONTEND_URL/me/appointments/:id`;
  - a equipe vai para `FRONTEND_URL/businesses/:businessId/appointments/:id`.

### Organização

- Nova feature `features/notifications/`:
  - `notifications.service.ts`: grava e, a partir da Etapa 3, lista e marca como lida.
  - `appointment-notifications.listener.ts`: escuta os eventos, resolve os destinatários e dispara in-app e e-mail.
  - `appointment-messages.ts`: títulos e textos por evento e público, e a data formatada no fuso do negócio.
  - `mails/appointment.mail.ts`: um `Mailable` só, com o template `appointment.html` (mensagem, quando, serviços, profissional e local). Os tipos diferem só no texto, então um template por tipo seria duplicação.
- `appointments` ganha um método de leitura para o listener, que traz o agendamento com o cliente (e o usuário dele), o profissional (com membro e usuário), os serviços e o negócio.
- `businesses` ganha `findManagerUserIds(businessId)`, que devolve os usuários dos membros ativos com papel `owner` ou `admin`.
- `professionals` ganha `findWithUser(id)`, para avisar o profissional anterior quando o agendamento troca de profissional.

### Fora desta etapa

- Preferências de notificação (desligar e-mail por tipo).
- WhatsApp e SMS.
- Avisos de pagamento e de avaliação. Os tipos existem, mas as features ainda não.

## Etapa 2: lembrete

### Decisões

1. **Nova setting `reminderHoursBefore`** (padrão `24`, de `0` a `168`). `0` desliga o lembrete.
2. **Nova coluna `appointments.reminderSentAt`** (`timestamptz`, nula).
3. **Job agendado a cada 5 minutos, em `appointments`**, porque o repositório é dele:
   - **Seleciona** agendamentos `confirmed`, não removidos, com `reminderSentAt` nulo, cujo `startAt` cai entre agora e agora + `reminderHoursBefore` do negócio, e com o lembrete ligado.
   - **Reivindica** cada um com `UPDATE ... SET "reminderSentAt" = now() WHERE id = :id AND "reminderSentAt" IS NULL`. Só emite `appointment.reminder_due` se afetou uma linha. Isso deixa o job seguro com mais de uma instância.
   - O listener de `notifications` envia o e-mail ao cliente e grava a notificação in-app, se ele tiver conta.
4. **Agendamento criado ou remarcado já dentro da janela** sai com `reminderSentAt` preenchido na escrita, porque o e-mail de confirmação ou de remarcação já cumpre o papel do lembrete.
5. **Remarcar para fora da janela zera `reminderSentAt`**, para o lembrete sair de novo no horário certo.
6. **Pendentes não recebem lembrete.** Se forem confirmados dentro da janela, o aviso de confirmação já serve.

### Fora desta etapa

- Marcar `no_show` automaticamente.
- Lembrete para o profissional (a agenda do dia).

## Etapa 3: leitura

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/me/notifications?status?&cursor&limit` | lista as notificações do usuário, mais recentes primeiro, paginada por cursor |
| GET | `/api/me/notifications/unread-count` | `{ count }` |
| POST | `/api/me/notifications/:notificationId/read` | marca como lida (idempotente) |
| POST | `/api/me/notifications/read-all` | marca todas como lidas |

- Marcar como lida grava `status` e `readAt` juntos (`@Check` da entity).
- Uma notificação de outro usuário responde 404 `NOTIFICATION_NOT_FOUND`.
- A resposta traz `businessId` e `appointmentId`, para o front montar o link.
- **Cursor:** `base64url` de `createdAt|id`. A ordem e a comparação usam `createdAt` truncado em milissegundos e desempatam por `id`, porque o `Date` do JS não guarda os microssegundos do Postgres. Cursor malformado → 400 `INVALID_CURSOR`.
- `ApiResponse.cursorPaginated` passa a receber até `limit + 1` linhas e usa o excedente para `hasMore`. Antes, com exatamente `limit` itens restantes, a próxima página vinha vazia.

## Etapa 4: tempo real (SSE)

1. **SSE e não WebSocket:** o fluxo é só do servidor para o cliente.
   - Usa o `@Sse()` nativo do Nest e o `JwtAuthGuard` por cookie, como qualquer rota.
   - Não traz dependência nova nem exige configuração de upgrade no proxy.
2. **`GET /api/me/notifications/stream`**: cada notificação gravada para o usuário é enviada como evento `notification`, no mesmo formato da listagem.
   - Um evento `ping` a cada 25 s mantém a conexão viva atrás de proxies.
3. **Sem replay:** `Last-Event-ID` é ignorado. Ao reconectar, o front recarrega a lista e o `unread-count`.
4. **A distribuição fica atrás de uma interface** (`NotificationStream`: `publish(userId, payload)` e `subscribe(userId)`). A implementação é em memória, com um `Subject` por processo.
   - Com mais de uma instância da API, ela troca para `LISTEN/NOTIFY` do Postgres, sem Redis. Isso fica fora desta etapa.
5. **Expiração do access token:** a conexão aberta continua viva, mas a reconexão automática do `EventSource` recebe 401. O front trata o `onerror` chamando `/api/auth/refresh` e reabrindo o stream.
6. **Proxy:** o `@Sse()` do Nest já envia `X-Accel-Buffering: no` e `Cache-Control: no-cache`, então a rota não define cabeçalhos.

## Novos `ErrorCode`

`NOTIFICATION_NOT_FOUND` (Etapa 3).

## Tarefas

### Etapa 1
- [x] T1.1 Instalar `@nestjs/event-emitter` e registrar `EventEmitterModule` no `AppModule`.
- [x] T1.2 `appointment-events.ts`: nomes e payloads; exportar pelo `index.ts`.
- [x] T1.3 Emitir os eventos no `AppointmentsService` depois do commit; `reschedule` passa a receber `actorUserId`.
- [x] T1.4 Leitura para notificação em `appointments` e `findManagerUserIds` em `businesses`.
- [x] T1.5 Novos `NotificationType` e atualização de `docs/regras-de-negocio.md` §12.
- [x] T1.6 `NotificationsService.createMany` e o listener, com a tabela de destinatários.
- [x] T1.7 Textos por evento e e-mail (`AppointmentMail` + `appointment.html`), com datas no fuso do negócio.
- [x] T1.8 Fechamento: build, lint e cenário completo contra o banco, conferindo as notificações gravadas e os e-mails no log ou no catcher local.

### Etapa 2
- [x] T2.1 Migration: `appointments.reminderSentAt` e a setting `reminderHoursBefore`, também no DTO de settings.
- [x] T2.2 Preencher e zerar `reminderSentAt` na criação e na remarcação (decisões 4 e 5).
- [x] T2.3 Job do lembrete com a reivindicação atômica e o evento `appointment.reminder_due`.
- [x] T2.4 Listener e e-mail do lembrete.
- [x] T2.5 Fechamento: build, lint, migration sem diferenças e lembrete conferido contra o banco.

### Etapa 3
- [x] T3.1 `ErrorCode` `NOTIFICATION_NOT_FOUND`.
- [x] T3.2 Listagem com cursor, contagem, marcar uma e marcar todas.
- [x] T3.3 DTOs e controller documentados.
- [x] T3.4 Fechamento: build, lint e rotas no Swagger.

### Etapa 4
- [x] T4.1 Interface `NotificationStream` e implementação em memória.
- [x] T4.2 `NotificationsService.create` publica no stream depois de gravar.
- [x] T4.3 Rota `@Sse()` com `ping` e limpeza da inscrição ao desconectar (o Nest cancela o `Observable` quando o cliente fecha).
- [x] T4.4 Fechamento: build, lint e teste com dois usuários conectados ao stream.

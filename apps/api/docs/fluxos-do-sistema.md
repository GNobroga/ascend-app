# Fluxos do sistema

Mapa do que o frontend faz, em que ordem e com quais rotas. O detalhe de cada rota (corpo, respostas e erros) está no Swagger (`/api/docs`); as regras, em `regras-de-negocio.md`.

## Convenções que valem para tudo

```
Toda requisição
├── Base: /api
├── Sessão em cookies httpOnly (o front nunca lê o token)
│   ├── access_token  → enviado em todas as rotas (path /)
│   ├── refresh_token → enviado só em /api/auth (path /api/auth)
│   └── fetch/axios com credentials: 'include'; EventSource com withCredentials: true
├── Resposta de sucesso
│   ├── { data }                        → objeto ou lista simples
│   ├── { data, meta: { page, ... } }   → paginada por página (page, pageSize)
│   └── { data, meta: { nextCursor, hasMore } } → paginada por cursor (cursor, limit)
├── Resposta de erro: { error: { statusCode, code, message, details? } }
│   └── o front decide pelo `code` (ex.: EMAIL_NOT_VERIFIED), nunca pela mensagem
├── 401 UNAUTHENTICATED em qualquer rota
│   ├── POST /api/auth/refresh
│   │   ├── 204 → repete a requisição original
│   │   └── 401 → sessão acabou → tela de login
│   └── só uma renovação por vez (as outras requisições esperam a mesma)
└── Datas
    ├── a API recebe e devolve instantes ISO em UTC (2026-10-27T13:00:00.000Z)
    ├── exibir no fuso do negócio (business.timezone) nas telas do negócio
    └── `date` da disponibilidade (YYYY-MM-DD) é o dia no fuso do negócio
```

## Telas que a API espera que existam no front

Os e-mails e redirecionamentos da API apontam para estas rotas do `FRONTEND_URL`:

| Rota do front | Quem leva até ela | O que a tela faz |
|---|---|---|
| `/login?error=<CODE>` | falha na verificação de e-mail ou no Google | login, mostrando o erro do `code` |
| `/email-verified` | link de verificação de e-mail (sucesso) | confirma e segue para o app |
| `/reset-password?token=` | e-mail de redefinição de senha | formulário de nova senha |
| `/auth/callback` | login com Google (sucesso) | chama `GET /api/users/me` e entra no app |
| `/accept-invitation?token=` | e-mail de convite para a equipe | mostra o convite, aceita ou recusa |
| `/me/appointments/:id` | e-mails ao cliente (confirmação, lembrete, convite para avaliar) | detalhe do agendamento do cliente |
| `/businesses/:businessId/appointments/:id` | e-mails à equipe | detalhe do agendamento na agenda |

## 1. Conta e sessão

```
Entrar no sistema
├── Cadastro com e-mail e senha
│   ├── POST /api/auth/register → sessão aberta (cookies) + e-mail de verificação enviado
│   └── usuário já entra; verificar o e-mail só é exigido para agendar online
├── Login com e-mail e senha → POST /api/auth/login
├── Login com Google
│   ├── navegar (não fetch) para GET /api/auth/google
│   ├── Google → GET /api/auth/google/callback
│   │   ├── sucesso → /auth/callback (sessão aberta)
│   │   └── falha → /login?error=OAUTH_DENIED | OAUTH_STATE_MISMATCH | OAUTH_FAILED | GOOGLE_EMAIL_NOT_VERIFIED
├── Depois de entrar
│   ├── GET /api/users/me → dados da conta (emailVerifiedAt, hasPassword, foto)
│   └── GET /api/businesses/mine → negócios em que é membro, com os papéis
│       ├── vazio → só cliente (ou oferecer "criar meu negócio")
│       ├── um ou mais → seletor: entrar como cliente ou em qual negócio, com qual papel
│       └── o papel escolhido define o menu (owner/admin/professional)
├── Verificação de e-mail
│   ├── link do e-mail → GET /api/auth/verify-email → /email-verified ou /login?error=INVALID_VERIFICATION_TOKEN
│   └── reenviar → POST /api/auth/verify-email/resend (limite: 3 a cada 15 min)
├── Esqueci a senha
│   ├── POST /api/auth/forgot-password (sempre 204, exista ou não o e-mail)
│   └── /reset-password?token= → POST /api/auth/reset-password → derruba todas as sessões → login
├── Perfil
│   ├── PATCH /api/users/me (nome, telefone)
│   ├── PUT/DELETE /api/users/me/photo
│   └── Trocar senha → POST /api/auth/change-password
│       ├── hasPassword = true  → pede currentPassword
│       ├── hasPassword = false (conta só Google) → cria a senha sem a atual
│       └── derruba as outras sessões; a atual continua (cookies novos)
└── Sair → POST /api/auth/logout
```

## 2. Visitante na página pública do negócio

Tudo público, sem login, identificado pelo `slug`.

```
/{slug}
├── GET /api/public/businesses/:slug              → dados, endereço, horários, imagens
├── GET /api/public/businesses/:slug/services     → categorias, serviços e pacotes agendáveis
├── GET /api/public/businesses/:slug/professionals?serviceId= → profissionais
├── GET /api/public/businesses/:slug/ratings      → média do negócio e de cada profissional
└── GET /api/public/businesses/:slug/reviews?professionalId=&cursor= → avaliações
    └── comentário oculto pelo negócio vem null; só o primeiro nome do cliente
```

## 3. Cliente agendando online

```
Agendar
├── 1. Escolher o que fazer (exatamente um dos dois)
│   ├── serviços avulsos → serviceIds (1 a 10, atendidos em sequência)
│   └── pacote → packageId
├── 2. Escolher o profissional (opcional)
│   └── sem professionalId, a disponibilidade junta todos os que atendem
├── 3. Escolher dia e horário
│   └── GET /api/public/businesses/:slug/availability?date=YYYY-MM-DD&(serviceIds|packageId)&professionalId?
│       ├── slots: [{ startAt, endAt, professionalIds }]
│       ├── lista vazia = dia sem horário (fechado, passado ou fora da janela); não é erro
│       └── o calendário consulta dia a dia
├── 4. Confirmar (exige login)
│   ├── não logado → login/cadastro → volta para a confirmação
│   └── POST /api/me/appointments { businessSlug, professionalId, serviceIds|packageId, startAt, customerNotes? }
│       ├── 201 → status confirmed (ou pending, se o negócio confirma manualmente)
│       ├── 403 EMAIL_NOT_VERIFIED → pedir verificação (reenviar e-mail)
│       ├── 409 APPOINTMENT_SLOT_UNAVAILABLE → horário foi ocupado; recarregar a disponibilidade
│       └── 404 PACKAGE_NOT_FOUND | SERVICE_NOT_FOUND | PROFESSIONAL_NOT_FOUND → recarregar o catálogo
└── Avisos que o cliente recebe (e-mail e, com conta, in-app)
    ├── recebido/confirmado, confirmado depois (se estava pending)
    ├── remarcado ou cancelado pela equipe
    ├── lembrete X horas antes (reminderHoursBefore do negócio)
    └── convite para avaliar quando o atendimento é concluído
```

## 4. Cliente: meus agendamentos e avaliação

```
/me/appointments
├── GET /api/me/appointments?upcoming=true|false&page= → de todos os negócios
│   └── cada item: status, package, business, professional, services,
│       cancellableUntil, review, reviewableUntil
├── Cancelar
│   ├── botão só se cancellableUntil != null
│   └── POST /api/me/appointments/:id/cancel { reason? }
│       └── 409 CANCELLATION_WINDOW_CLOSED → prazo passou
├── Remarcar → não existe para o cliente: cancela e agenda de novo
└── Avaliar
    ├── botão só se reviewableUntil != null (concluído e até 30 dias depois)
    └── PUT /api/me/appointments/:id/review { rating 1..5, comment? }
        ├── cria ou edita (uma avaliação por atendimento)
        └── review.reply = resposta do negócio, quando houver
```

## 5. Notificações (qualquer usuário logado)

```
Sininho
├── ao abrir o app
│   ├── GET /api/me/notifications/unread-count → badge
│   └── abrir EventSource('/api/me/notifications/stream', { withCredentials: true })
├── eventos do stream
│   ├── notification → inserir no topo da lista e somar 1 no badge
│   └── ping (a cada 25 s) → ignorar
├── reconexão / erro do EventSource
│   ├── POST /api/auth/refresh (o token pode ter expirado)
│   ├── reabrir o stream
│   └── recarregar a lista e o unread-count (o stream não reenvia o que passou)
├── lista → GET /api/me/notifications?status=&cursor=&limit=
├── clicar → POST /api/me/notifications/:id/read → navegar por businessId/appointmentId
└── marcar todas → POST /api/me/notifications/read-all
```

## 6. Dono: criar e preparar o negócio

Ordem para o negócio ficar agendável. Sem os passos marcados com ★, a disponibilidade volta vazia.

```
Criar negócio
├── POST /api/businesses → usuário vira owner; nascem as configurações e 4 formas de pagamento
├── ★ Horário de funcionamento → PUT /api/businesses/:id/hours (os 7 dias)
├── Configurações → PATCH /api/businesses/:id/settings
│   └── antecedência, intervalo da grade, cancelamento, auto-confirmação, lembrete
├── Logo e imagens → PUT /:id/logo, /:id/images
├── Catálogo
│   ├── categorias (opcional) → /:id/service-categories
│   ├── ★ serviços → POST /:id/services (duração, preço)
│   └── pacotes (opcional) → POST /:id/packages (2 a 10 serviços, preço próprio, modo de comissão)
├── Equipe
│   ├── convidar → POST /:id/invitations { email, roles }
│   │   └── convidado: /accept-invitation?token= → POST /api/invitations/lookup (sem login)
│   │       → login/cadastro com o MESMO e-mail → POST /api/invitations/accept
│   └── membros → GET/PATCH/DELETE /:id/members (papéis, suspender, remover)
├── ★ Profissionais (cada membro que atende)
│   ├── POST /:id/professionals { memberId, displayName, commissionPercent? }
│   ├── ★ PUT .../:professionalId/working-hours (os 7 dias, dentro do horário do negócio)
│   ├── ★ PUT .../:professionalId/services (serviços que executa + comissão por serviço)
│   ├── PUT .../:professionalId/packages (pacotes que atende + comissão do pacote)
│   └── foto, especialidades, ausências (/time-offs)
└── Formas de pagamento → /:id/payment-methods (editar, desativar, criar outras)
```

## 7. Equipe: agenda do dia a dia

```
Agenda (/businesses/:id/appointments)
├── Ver → GET /:id/appointments?from&to (até 31 dias)&professionalId&status
│   └── cada item traz: serviços, pacote, comissão, paidAmount/balance/paymentStatus, review
├── Encaixar (agendar pela equipe)
│   ├── buscar/cadastrar o cliente → GET/POST /:id/customers
│   │   └── 409 CUSTOMER_POSSIBLE_DUPLICATE → mostrar os candidatos (details);
│   │       usar um deles ou reenviar com allowDuplicate: true
│   ├── horários → GET /:id/availability?date&(serviceIds|packageId)&professionalId
│   │   (ignora grade e antecedência; aceita serviço/pacote inativo)
│   └── POST /:id/appointments { customerId, professionalId, serviceIds|packageId, startAt, notes }
│       └── nasce confirmed
├── Remarcar → PATCH /:id/appointments/:appointmentId { startAt?, professionalId?, internalNotes? }
│   └── trocar profissional recalcula a comissão (num pacote, o novo precisa estar ligado a ele)
├── Mudar status → POST /:id/appointments/:appointmentId/status { status, reason? }
│   └── ver a máquina de status abaixo
└── Permissões
    ├── owner/admin → todos os agendamentos
    └── só professional → vê todos, mas altera apenas os próprios (403 INSUFFICIENT_BUSINESS_ROLE)
```

### Máquina de status do agendamento

```
pending ──→ confirmed ──→ in_progress ──→ completed
   │            │    └──────────────────────↗   (concluir direto)
   │            ├──→ no_show     (só a partir do startAt)
   └──→ cancelled ←──┘
completed, cancelled e no_show são finais
in_progress, completed e no_show só a partir do startAt
```

## 8. Equipe: receber pagamento

```
No agendamento
├── ver → GET /:id/appointments/:appointmentId/payments  (+ paidAmount, balance, paymentStatus)
├── registrar → POST .../payments { paymentMethodId, amount, notes? }
│   ├── nasce paid; vários por agendamento (sinal + saldo)
│   ├── 409 PAYMENT_EXCEEDS_BALANCE → valor maior que o saldo
│   └── 409 PAYMENT_NOT_ALLOWED → agendamento cancelado (no_show aceita: taxa de falta)
├── estornar (dinheiro devolvido) → POST .../payments/:paymentId/refund { reason? }
├── cancelar (lançado por engano) → POST .../payments/:paymentId/cancel { reason? }
└── pagar NÃO conclui o atendimento; concluir é a mudança de status
```

```
Pagamento: paid ──→ refunded | cancelled   (finais; pending e failed reservados ao pagamento online)
Agendamento: paymentStatus = unpaid → partial → paid (soma dos paid vs. totalPrice)
```

## 9. Equipe: avaliações

```
/businesses/:id/reviews
├── listar → GET ?professionalId&rating&status&cursor (comentário sempre visível para a equipe)
├── owner/admin
│   ├── ocultar/publicar comentário → PATCH /:reviewId { status: hidden|published }
│   │   └── a nota continua na média
│   └── responder → PUT /:reviewId/reply { reply } | DELETE /:reviewId/reply
└── aviso in-app "Nova avaliação" para o profissional e os gestores
```

## 10. O que acontece sozinho (sem o front pedir)

```
Sistema
├── a cada 5 min → lembretes de agendamentos confirmed que entraram na janela do negócio
├── eventos de agendamento → avisos in-app + e-mails (fila com novas tentativas)
│   └── WhatsApp do negócio conectado → o cliente também recebe por WhatsApp (sem opt-out)
├── WhatsApp caiu e não voltou em 2 min → aviso in-app whatsapp_disconnected aos gestores
├── atendimento concluído → convite para avaliar (cliente com conta)
├── avaliação nova → aviso in-app à equipe
└── 3h da manhã → limpeza de tokens expirados
```

## 11. Dono: conectar o WhatsApp

Só `owner` e `admin`. Com o WhatsApp conectado, os clientes recebem os avisos de agendamento também por WhatsApp, a partir do número do próprio negócio.

```
Tela "WhatsApp" (configurações do negócio)
├── ao abrir → GET /api/businesses/:id/whatsapp
│   ├── 404 WHATSAPP_CONNECTION_NOT_FOUND → nunca conectou → mostrar "Conectar"
│   └── 200 → mostrar conforme status
├── Conectar
│   ├── mostrar o aviso: integração não oficial, o número pode ser bloqueado pelo WhatsApp;
│   │   recomendar um número de WhatsApp Business dedicado
│   ├── POST /api/businesses/:id/whatsapp { acceptTerms: true }
│   │   ├── 200 { status: connecting, qrCode: { code, base64 } } → mostrar o QR (base64 é <img src>)
│   │   └── 409 WHATSAPP_ALREADY_CONNECTED → recarregar com GET
│   └── instrução: WhatsApp do celular → Aparelhos conectados → Conectar um aparelho
├── Enquanto status = connecting
│   ├── GET a cada 3–5 s (o QR muda sozinho a cada ~20 s; sempre exibir o último)
│   ├── connected → parar o polling, mostrar phoneNumber e connectedAt
│   └── disconnected (QR expirou sem leitura) → oferecer "Conectar" de novo
├── Conectado
│   ├── pausar/retomar envios → PATCH /api/businesses/:id/whatsapp { enabled }
│   └── desconectar → DELETE /api/businesses/:id/whatsapp → 204 → volta a "Conectar"
├── Desconectado depois de já ter conectado (status = disconnected)
│   └── mostrar disconnectedAt e "Reconectar" (mesmo POST, novo QR)
└── 502 WHATSAPP_UNAVAILABLE em qualquer rota → serviço de WhatsApp fora; tentar de novo em instantes

Aviso de queda
├── notificação in-app whatsapp_disconnected (pelo stream do sininho, seção 5)
└── clicar → levar para a tela "WhatsApp" do businessId da notificação

Cliente que não quer receber WhatsApp
└── ficha do cliente → PATCH /api/businesses/:id/customers/:customerId { whatsappOptOut: true | false }
    └── a resposta traz whatsappOptedOutAt (null = recebe)
```

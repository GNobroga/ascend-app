# Avaliações

O cliente avalia o atendimento concluído; o negócio modera o comentário e responde; a página pública mostra as notas e as médias (regras de negócio §11).

Depende das specs `2026-10-20-agendamentos.md` e `2026-10-20-notificacoes.md`.

## Etapas

1. **Avaliar, moderar e responder**: concluída.
2. **Página pública e avisos**: concluída.

## Decisões gerais

1. **Só se avalia atendimento concluído.**
   - A avaliação é do tipo `appointment`: o agendamento é do cliente logado e está `completed`. Senão → 409 `REVIEW_NOT_ALLOWED`.
   - A avaliação guarda o profissional que atendeu, e a nota conta para o negócio e para ele.
   - Os tipos `business` e `professional` (avaliação livre, sem atendimento) continuam no enum, mas nenhuma rota os cria. Isso impede avaliação de quem nunca foi atendido.
2. **Uma avaliação por agendamento**, garantida por índice único em `appointmentId`.
   - O cliente pode editar nota e comentário. Não há histórico de edições.
   - Isso substitui a regra do §11 de "várias avaliações, vale a mais recente".
3. **Prazo:** o cliente avalia e edita até **30 dias depois do fim do atendimento** (`endAt`). Depois → 409 `REVIEW_WINDOW_CLOSED`.
4. **Quem avalia:** só cliente com conta, pela rota `/api/me`. O cliente cadastrado só pelo balcão, sem conta, não avalia.
5. **Moderação: ocultar esconde só o comentário.**
   - `owner`/`admin` alternam o `status` entre `published` e `hidden`.
   - `hidden`: a página pública mostra a nota, mas não o comentário. **A nota continua na média**, então o negócio não consegue sumir com as notas ruins.
   - Se o cliente editar o comentário, a avaliação continua `hidden` até o negócio reabrir.
6. **Resposta do negócio:** uma por avaliação, que `owner`/`admin` escrevem, editam e removem. Ela aparece abaixo da avaliação na página pública.
   - Ela aparece mesmo com o comentário oculto, porque é do negócio.
7. **Médias:** média simples de todas as avaliações (inclusive as `hidden`), com 1 casa decimal, mais a quantidade.
   - Do negócio: todas as suas avaliações.
   - Do profissional: as dos atendimentos dele.
   - Calculadas na consulta, sem cache.
8. **Exclusão:** o cliente não apaga a avaliação (edita, se quiser). Profissional ou cliente removidos não apagam as avaliações já feitas.

## Etapa 1: avaliar, moderar e responder

### Migration

- Índice único em `reviews."appointmentId"`. Ele aceita vários `NULL`, então não afeta os tipos sem agendamento.
- Colunas `reply` (`text`, nula) e `repliedAt` (`timestamptz`, nula).

### Endpoints

**Cliente** (autenticado, sob `/api/me/appointments/:appointmentId/review`):

| Método | Rota | Descrição |
|---|---|---|
| PUT | `/` | cria ou edita a avaliação: `rating` (1 a 5, inteiro) e `comment?` (até 2000) |

- `GET /api/me/appointments` passa a trazer, em cada agendamento, `review` (`{ rating, comment, reply }` ou `null`) e `reviewableUntil` (data limite, ou `null` se não pode mais avaliar).
- Duas chamadas simultâneas sem avaliação: a segunda esbarra no índice único (`23505`) e vira edição, sem erro para o cliente.

**Equipe** (sob `/api/businesses/:businessId/reviews`):

| Método | Rota | Acesso |
|---|---|---|
| GET | `/?professionalId?&rating?&status?&cursor&limit` | membro |
| PATCH | `/:reviewId` (`status`) | `owner`/`admin` |
| PUT | `/:reviewId/reply` (`reply`, até 2000) | `owner`/`admin` |
| DELETE | `/:reviewId/reply` | `owner`/`admin` |

- A listagem vem da mais recente para a mais antiga, paginada por cursor como as notificações. Traz a nota, o comentário (sempre, mesmo `hidden`), o status, a resposta, o cliente, o profissional e o agendamento.
- O agendamento da equipe (`AppointmentResponseDto`) ganha `review` (`{ id, rating, status }` ou `null`).

### Novos `ErrorCode`

`REVIEW_NOT_FOUND`, `REVIEW_NOT_ALLOWED`, `REVIEW_WINDOW_CLOSED`.

### Organização

Nova feature `features/reviews/`, dona do repositório de `Review`.
- Depende de `appointments`, para o agendamento do cliente e o status, e de `businesses`.
- `appointments` não depende de `reviews`: o `review` das respostas de agendamento vem da relação, carregada pelo próprio `appointments`, como os pagamentos. A relação inversa `Appointment.reviews` é acrescentada só na entity, sem mudança de schema.

### Tarefas

- [x] T1.1 Migration (índice único, `reply`, `repliedAt`), relação inversa na entity, `ErrorCode`s e registro no `TypeOrmModule.forFeature`.
- [x] T1.2 `ReviewsService`: avaliar e editar (dono, `completed`, prazo), listar com cursor, moderar, responder e remover a resposta.
- [x] T1.3 DTOs e controllers (cliente e equipe) documentados.
- [x] T1.4 `review` e `reviewableUntil` nas respostas de agendamento.
- [x] T1.5 Fechamento: build, lint, migration sem diferenças e cenário contra o banco.

## Etapa 2: página pública e avisos

### Decisões

1. **Rota pública** `GET /api/public/businesses/:slug/reviews?professionalId?&cursor&limit`.
   - Traz a nota, o comentário (ou `null` se `hidden`), a resposta, a data, o primeiro nome do cliente e o nome do profissional.
   - Não traz sobrenome, e-mail nem telefone do cliente.
2. **Médias públicas** (mudou na implementação): rota própria `GET /api/public/businesses/:slug/ratings`, que devolve `{ business: { average, count }, professionals: [{ professionalId, average, count }] }`.
   - Não entram na página do negócio nem na listagem de profissionais, que são de `businesses` e `professionals`. Essas features teriam de ler a tabela de avaliações, criando ciclo com `reviews` ou quebrando a regra de repositório privado. O front faz uma chamada a mais.
   - Texto original:
   - a página pública do negócio ganha `rating: { average, count }` (`average` `null` sem avaliações);
   - cada profissional da listagem pública ganha o mesmo.
3. **Convite para avaliar:** quando o agendamento vira `completed`, o cliente com conta recebe e-mail e aviso in-app ("Como foi seu atendimento?"), com link para avaliar.
   - Usa o evento `appointment.status_changed` e o tipo `appointment_completed`, que já existem.
4. **Avaliação recebida:** o profissional que atendeu e os gestores (`owner`/`admin`) recebem aviso **só in-app** (`review_received`) quando uma avaliação é criada. Edições não avisam.
   - `reviews` emite o evento `review.created`, e `notifications` escuta, no mesmo padrão dos agendamentos.

### Fora desta spec

- Avaliação livre do negócio ou do profissional, sem atendimento.
- Fotos na avaliação.
- Denúncia de avaliação pelo público.
- Avaliação por cliente sem conta (link mágico por e-mail).

### Tarefas

- [x] T2.1 Listagem pública e rota de médias (negócio e profissionais).
- [x] T2.2 Evento `review.created` e os avisos (convite no `completed` e avaliação recebida).
- [x] T2.3 Atualizar `docs/regras-de-negocio.md` §11 e §12.
- [x] T2.4 Fechamento: build, lint e cenário contra o banco.

# Membros e profissionais

Feature que permite montar a equipe de um negócio e preparar os profissionais para receber agendamentos: membros e papéis, especialidades, perfil do profissional, serviços executados, horário de trabalho e ausências.

É pré-requisito da disponibilidade e dos agendamentos (regras de negócio §5 e §8), que ficam fora desta spec.

## Escopo

**Dentro**
- Gestão de membros do negócio (listar, adicionar, alterar papéis/status, remover).
- CRUD de especialidades.
- Perfil do profissional (criar a partir de um membro, editar, remover, foto).
- Vínculo do profissional com serviços (com comissão por serviço) e especialidades.
- Horário de trabalho semanal e ausências.
- Listagem pública dos profissionais de um negócio.

- Convite por e-mail para entrar no negócio (Etapa 9), que substitui a adição direta de membro.

**Fora**
- `ProfessionalPackage`: pacotes ainda não existem.
- Conflito de ausência com agendamentos futuros: entra na feature de agendamentos.
- Autogestão pelo próprio profissional (editar o próprio perfil ou folgas): por enquanto só `owner`/`admin` gerenciam.

## Decisões

1. ~~**Adição de membro pelo e-mail de um usuário já cadastrado.** E-mail sem conta → 404 `USER_NOT_FOUND`. O vínculo nasce `active`.~~ Substituída pelo convite (decisões 12 a 18). A pessoa entrava sem consentir, quem não tinha conta não podia ser adicionado, e o 404 revelava quais e-mails têm conta.
2. **Membro removido volta por `restore()`.** O índice único `(business, user)` inclui removidos (§13), então quem foi removido e aceita um novo convite tem o vínculo restaurado, com os papéis substituídos.
3. **Papéis:**
   - Só `owner` concede ou retira `owner`, e só `owner` altera, suspende ou remove um membro que é `owner`. `admin` que tentar recebe 403 `INSUFFICIENT_BUSINESS_ROLE`.
   - O negócio sempre mantém ao menos um `owner` ativo. Retirar o papel, suspender ou remover o último devolve 409 `LAST_OWNER`.
   - Todo membro tem ao menos um papel (validação do DTO).
4. **Remover membro remove o profissional dele** (soft delete), na mesma transação. `softDelete` não propaga (§13). A feature `businesses` faz isso pelo `manager` da transação, sem importar `professionals`, para não inverter a direção de dependência.
5. **Profissional nasce de um membro** (`memberId`). Membro que já tem profissional ativo → 409 `PROFESSIONAL_ALREADY_EXISTS`. Se o profissional dele foi removido, ele é restaurado com os novos dados. O papel `professional` não é exigido nem alterado, porque papel é permissão e quem atende é definido pela existência do profissional (§4).
6. **Foto guarda a key do storage**, como logo e imagens: migration `photoUrl` → `photoKey`. Os endpoints são `PUT`/`DELETE .../photo`, com `@ImageUpload`.
7. **Serviços e especialidades do profissional são substituídos em bloco** (`PUT` com a lista inteira), como o horário do negócio. Cada serviço precisa ser do mesmo negócio: o service do catálogo garante isso e devolve 404 `SERVICE_NOT_FOUND`. O mesmo vale para especialidades, com `SPECIALTY_NOT_FOUND`.
8. **Horário de trabalho** é a semana inteira (7 dias), com fim depois do início. Se o negócio já tem horário configurado, o expediente precisa caber nele: dia em que o negócio está fechado só aceita folga. Sem horário do negócio, não há essa checagem. A validação "fim depois do início" é extraída para `common/utilities` e passa a ser usada também pelo horário do negócio.
9. **Ausências:** `endAt` depois de `startAt` e sem sobreposição com outra ausência do mesmo profissional (409 `TIME_OFF_OVERLAP`). A listagem aceita `from`/`to` opcionais.
10. **Especialidade** tem nome único por negócio (409 `SPECIALTY_NAME_IN_USE`). Não tem soft delete: excluir remove os vínculos em cascata.
11. **Público:** lista só profissionais de membros `active`, com filtro opcional por `serviceId`. Não expõe comissão nem dados do usuário.

### Convites (Etapa 9)

12. **O convite tem tabela própria (`business_invitations`), e o membro só é criado no aceite.**
    - `BusinessMember` e `user_tokens` exigem um usuário, e o convidado pode ainda não ter conta.
    - Um membro "convidado" obrigaria o guard, a listagem, a contagem de `owner` e a criação de profissional a filtrar esse status.
    - Com isso, o status `invited` sai de `BusinessMemberStatus`.
13. **Campos do convite:**
    - `business`, `email` (normalizado em minúsculas), `roles` (array de `BusinessMemberRole`) e `invitedBy` (usuário).
    - `tokenHash`, com `generateOpaqueToken`/`hashOpaqueToken`, e `expiresAt`.
    - `acceptedAt`, `declinedAt` e `revokedAt`.
    - Índice único parcial em `(business, email)` para os pendentes (os três campos de encerramento nulos).
    - Validade em `BUSINESS_INVITATION_TTL_DAYS` (padrão 7), no `EnvConfig`.
14. **Criar convite** (`owner`/`admin`):
    - A resposta é a mesma, tenha o e-mail conta ou não.
    - Se já existe convite pendente para o e-mail, o token é trocado, os papéis são atualizados e o e-mail é reenviado.
    - E-mail que já é de um membro do negócio → 409 `MEMBER_ALREADY_EXISTS`. Isso não vaza nada, porque quem convida já enxerga a equipe.
    - Só `owner` convida com o papel `owner`.
    - A rota tem `@RateLimit`, para não servir de disparo de e-mails.
15. **Link do e-mail:** `FRONTEND_URL/accept-invitation?token=<token>`, no padrão de `/reset-password?token=`. O front chama a API: não há redirect.
16. **Token inválido, expirado, revogado ou já usado** → 400 `INVALID_INVITATION_TOKEN`, a mesma resposta para todos os casos.
    - O token vai no **body** (`{ token }`), e não na URL da API. O `pino-http` registra a URL de toda requisição e não tem `redact` configurado, então um token no caminho iria parar nos logs. É o mesmo padrão do `reset-password`.
17. **Aceitar** exige login, e o e-mail da conta deve ser o do convite. Se não for → 403 `INVITATION_EMAIL_MISMATCH`, para que um link repassado não sirva a outra conta. O aceite:
    - cria o membro `active` com os papéis do convite, ou o restaura pela decisão 2;
    - marca o convite como aceito, na mesma transação;
    - marca o e-mail como verificado se ainda não estava, já que o token chegou nesse e-mail.
18. **`POST /members` sai.** A criação de membro passa a ser interna, chamada pelo aceite. `USER_NOT_FOUND` deixa de ser usado e é removido.

## Endpoints

Todos ficam sob `/api/businesses/:businessId`. **Leitura:** qualquer membro ativo. **Escrita:** `owner`/`admin`.

| Método | Rota | Feature |
|---|---|---|
| GET | `/members` | businesses |
| ~~POST~~ | ~~`/members`~~ (substituída pelos convites) | businesses |
| PATCH | `/members/:memberId` | businesses |
| GET/POST | `/invitations` | businesses |
| POST | `/invitations/:invitationId/resend` | businesses |
| DELETE | `/invitations/:invitationId` | businesses |
| POST | `/api/invitations/lookup` (público: negócio, papéis e validade) | businesses |
| POST | `/api/invitations/accept` (autenticado) | businesses |
| POST | `/api/invitations/decline` (autenticado) | businesses |
| DELETE | `/members/:memberId` | businesses |
| GET/POST | `/specialties` | professionals |
| PATCH/DELETE | `/specialties/:specialtyId` | professionals |
| GET/POST | `/professionals` | professionals |
| GET/PATCH/DELETE | `/professionals/:professionalId` | professionals |
| PUT/DELETE | `/professionals/:professionalId/photo` | professionals |
| PUT | `/professionals/:professionalId/services` | professionals |
| PUT | `/professionals/:professionalId/specialties` | professionals |
| GET/PUT | `/professionals/:professionalId/working-hours` | professionals |
| GET/POST | `/professionals/:professionalId/time-offs` | professionals |
| PATCH/DELETE | `/professionals/:professionalId/time-offs/:timeOffId` | professionals |
| GET | `/api/public/businesses/:slug/professionals` | professionals |

## Organização

- **`features/businesses`**: `business-members.service.ts` e `business-members.controller.ts`. A feature é dona do repositório de membros e usa `UsersService` (de `users/index.ts`) para achar o usuário pelo e-mail.
- **Convites** também ficam em `features/businesses`:
  - `business-invitations.service.ts`;
  - `business-invitations.controller.ts`, com as rotas do negócio;
  - `invitations.controller.ts`, com as rotas do convidado (token no body);
  - `mails/business-invitation.mail.ts` e o template `business-invitation.html`, enviados pelo `MailDispatcher`.
  - Marcar o e-mail como verificado usa `UsersService.markEmailVerified`.
- **`features/professionals`** (nova): especialidades, profissionais, horário de trabalho e ausências.
  - Depende de `businesses` (membros, horário do negócio, negócio por slug) e de `catalog` (`ServicesService.getById`), sempre pelos `index.ts`.
  - `businesses` e `catalog` não importam `professionals`.

## Novos `ErrorCode`

`MEMBER_NOT_FOUND`, `MEMBER_ALREADY_EXISTS`, `LAST_OWNER`, `PROFESSIONAL_NOT_FOUND`, `PROFESSIONAL_ALREADY_EXISTS`, `SPECIALTY_NOT_FOUND`, `SPECIALTY_NAME_IN_USE`, `TIME_OFF_NOT_FOUND`, `TIME_OFF_OVERLAP`.

Etapa 9: `INVITATION_NOT_FOUND`, `INVALID_INVITATION_TOKEN`, `INVITATION_EMAIL_MISMATCH`. `USER_NOT_FOUND`, criado na Etapa 0, é removido.

## Tarefas

### Etapa 0: base
- [x] T0.1 Atualizar `docs/regras-de-negocio.md`: `storageKey`/`logoKey`/`photoKey` e as decisões desta spec.
- [x] T0.2 Migration `professionals.photoUrl` → `photoKey` e ajuste da entity.
- [x] T0.3 Extrair a validação "fim depois do início" da semana para `common/utilities` e usá-la no `BusinessHoursService`.
- [x] T0.4 Adicionar os novos `ErrorCode`.

### Etapa 1: membros
- [x] T1.1 `BusinessMembersService`: listar, adicionar (com restore), alterar papéis/status e remover (com soft delete do profissional), com as regras de `owner`.
- [x] T1.2 DTOs e `BusinessMembersController` documentados.

### Etapa 2: especialidades
- [x] T2.1 `SpecialtiesService` com CRUD e nome único por negócio.
- [x] T2.2 DTOs e `SpecialtiesController` documentados.

### Etapa 3: perfil do profissional
- [x] T3.1 `ProfessionalsService`: listar, detalhar, criar a partir do membro (com restore), editar e remover.
- [x] T3.2 Foto (`PUT`/`DELETE`) com `StorageService`.
- [x] T3.3 DTOs e `ProfessionalsController` documentados.

### Etapa 4: vínculos
- [x] T4.1 `PUT .../services` com comissão por serviço, validando o negócio de cada serviço.
- [x] T4.2 `PUT .../specialties` validando o negócio de cada especialidade.

### Etapa 5: horário de trabalho
- [x] T5.1 `ProfessionalWorkingHoursService`: semana inteira, fim depois do início, dentro do horário do negócio.
- [x] T5.2 Endpoints `GET`/`PUT` documentados.

### Etapa 6: ausências
- [x] T6.1 `ProfessionalTimeOffsService`: CRUD, intervalo válido e sem sobreposição.
- [x] T6.2 Endpoints documentados, com filtro `from`/`to`.

### Etapa 7: público
- [x] T7.1 `GET /api/public/businesses/:slug/professionals?serviceId=`.

### Etapa 8: fechamento
- [x] T8.1 Registrar a feature no `AppModule` (controllers, providers, `forFeature`).
- [x] T8.2 `pnpm build`, `pnpm lint`, `migration:run` e `migration:generate` sem diferenças, e boot da API com as rotas mapeadas.

### Etapa 9: convites
- [x] T9.1 `BusinessInvitationEntity` e migration: tabela, índice único parcial dos pendentes, FKs. Remover `invited` de `BusinessMemberStatus`.
- [x] T9.2 `BUSINESS_INVITATION_TTL_DAYS` no `EnvConfig` e novos `ErrorCode` (remover `USER_NOT_FOUND`).
- [x] T9.3 E-mail de convite: `BusinessInvitationMail` e template `business-invitation.html` com o link `FRONTEND_URL/accept-invitation?token=`.
- [x] T9.4 `BusinessInvitationsService`:
  - criar ou reemitir o convite;
  - listar os pendentes, reenviar e revogar;
  - ver pelo token, aceitar e recusar.
- [x] T9.5 Transformar `BusinessMembersService.add` em criação interna (`userId` + papéis, com restore) usada pelo aceite, e remover `POST /members` e `AddBusinessMemberDto`.
- [x] T9.6 Controllers documentados: rotas do negócio, com `@RateLimit` na criação, e rotas por token.
- [x] T9.7 Atualizar `docs/regras-de-negocio.md` §4 com o fluxo de convite.
- [x] T9.8 Fechamento: build, lint, migration sem diferenças, boot e rotas no Swagger.

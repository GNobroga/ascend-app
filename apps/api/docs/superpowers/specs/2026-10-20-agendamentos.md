# Agendamentos

Feature que permite marcar horários: clientes do negócio, cálculo de disponibilidade e agendamentos (regras de negócio §7 e §8).

Depende da spec `2026-10-20-membros-e-profissionais.md` (profissionais, horário de trabalho e ausências).

## Etapas

1. **Clientes**: concluída.
2. **Disponibilidade**: concluída.
3. **Agendamentos**: detalhada abaixo.

## Etapa 1: clientes

### Decisões

1. **A conta é global e o cliente é por negócio.** O `Customer` existe com ou sem conta (§7). A recepção cadastra clientes sem conta, e o agendamento online usa a conta de quem está logado.
2. **Normalização na escrita:**
   - e-mail com `trim` e em minúsculas;
   - telefone em E.164 (`+5511999990000`); sem DDI, assume `+55`; formato inválido → 400 `VALIDATION_ERROR`.
3. **Detectar duplicado avisa, não bloqueia.**
   - **Critério:** cliente ativo do mesmo negócio com o **mesmo telefone OU o mesmo e-mail**. O nome não entra.
   - `POST` e `PATCH` (quando telefone ou e-mail mudam) respondem 409 `CUSTOMER_POSSIBLE_DUPLICATE`, a menos que o body traga `allowDuplicate: true`.
   - Os `details` do erro trazem um item por candidato: `path` é o campo que coincidiu (`phone`/`email`) e `message` é o id do cliente.
   - Duplicado intencional (telefone compartilhado entre mãe e filho, por exemplo) é permitido. Por isso não há índice único, e uma corrida entre dois cadastros simultâneos pode gerar duplicado. O risco é aceito.
4. **Ligar uma conta a um cliente existente** (no agendamento online) usa um critério mais estrito que o da detecção, porque um erro aqui dá acesso ao histórico de outra pessoa. Em ordem:
   1. Existe cliente ligado à conta no negócio → usa esse cliente. Se ele estiver removido, é restaurado, porque o índice único `(business, user)` inclui removidos.
   2. O e-mail da conta está **verificado** e existe **exatamente um** cliente sem conta com esse e-mail → liga a conta a ele e preenche só os campos vazios (não sobrescreve o que a recepção cadastrou).
   3. Senão → cria um cliente novo com o nome, o e-mail e o telefone da conta.
   - A ligação é um `UPDATE ... WHERE "userId" IS NULL`. Se outro pedido ligar o mesmo cliente antes, a resolução recomeça.
   - O telefone não liga contas, porque não é verificado.
5. **Agendar online exige e-mail verificado** → 403 `EMAIL_NOT_VERIFIED`, verificado antes da resolução. Assim, criar uma conta com o e-mail de outra pessoa não basta para assumir o cadastro dela. Nada é criado nem ligado quando a resposta é 403.
6. **Possíveis duplicados são calculados na hora** (`GET /customers/possible-duplicates`): grupos de clientes ativos com o mesmo telefone ou e-mail. Não há marca gravada.
   - Limitação aceita: duplicados intencionais continuam aparecendo na lista até existir uma forma de dispensá-los.
7. **Permissões:** qualquer membro ativo lê, cadastra e edita clientes, porque a recepção e os profissionais atendem. Só `owner`/`admin` excluem.
8. **Exclusão é lógica** (`softDelete`). O cliente some das listas e da detecção de duplicados.

### Fora desta etapa

- Juntar clientes (`merge`), passando agendamentos e avaliações para um registro só.
- Dispensar um grupo de possíveis duplicados.
- Ligação por telefone, enquanto não houver verificação de telefone.

### Endpoints

Todos ficam sob `/api/businesses/:businessId/customers`.

| Método | Rota | Acesso |
|---|---|---|
| GET | `/` (`search`, `page`, `pageSize`) | membro |
| GET | `/possible-duplicates` | membro |
| GET | `/:customerId` | membro |
| POST | `/` | membro |
| PATCH | `/:customerId` | membro |
| DELETE | `/:customerId` | `owner`/`admin` |

A resolução da decisão 4 é um método do `CustomersService` (`resolveForUser`). Ela não tem rota própria: quem a usa é o agendamento online, na Etapa 3.

### Novos `ErrorCode`

`CUSTOMER_NOT_FOUND`, `CUSTOMER_POSSIBLE_DUPLICATE`, `EMAIL_NOT_VERIFIED`.

### Tarefas

- [x] T1.1 `normalizePhone` em `common/utilities/phone.ts` e decorator de validação.
- [x] T1.2 Helper `ApiPaginatedResponse` em `api-docs.ts` e documentação do `PaginationQueryDto`.
- [x] T1.3 Novos `ErrorCode`.
- [x] T1.4 `CustomersService`: busca paginada, detalhe, criação e edição com detecção de duplicado, exclusão e possíveis duplicados.
- [x] T1.5 `resolveForUser` (decisões 4 e 5), recebendo o `EntityManager` da transação do agendamento.
- [x] T1.6 DTOs e `CustomersController` documentados.
- [x] T1.7 Registrar a feature e atualizar `docs/regras-de-negocio.md` §7.
- [x] T1.8 Fechamento: build, lint, migration sem diferenças, boot e rotas no Swagger.

## Etapa 2: disponibilidade

### Decisões

1. **Horário livre** (§5) = horário do negócio ∩ horário de trabalho do profissional − ausências − agendamentos que ocupam a agenda.
   - Ocupam a agenda: todos os status, menos `cancelled` e `no_show` (§8).
   - Sem horário do negócio no dia, ou sem horário de trabalho do profissional, ou dia de folga → nenhum horário.
2. **Duração** = soma de `durationInMinutes` dos serviços pedidos (`serviceIds`, um ou mais). O profissional precisa executar **todos** eles. Pacotes entram quando a feature de pacotes existir.
3. **Grade:**
   - Os horários começam no início do expediente do dia (a interseção da decisão 1) e avançam de `slotIntervalMinutes` em `slotIntervalMinutes`.
   - Um horário só vale se o atendimento inteiro (`startAt` até `startAt + duração`) couber no expediente e não encostar em ausência nem em agendamento.
4. **Fuso:**
   - `date` (`YYYY-MM-DD`) e os horários de funcionamento e de trabalho valem no `timezone` do negócio.
   - A resposta devolve instantes ISO em UTC, que o front exibe no fuso que quiser.
   - A conversão usa `Intl` (sem dependência nova) e trata horário de verão.
5. **Janela de agendamento** (settings), só na rota pública:
   - nenhum horário antes de agora + `minimumAdvanceBookingMinutes`;
   - nenhuma data depois de hoje + `maximumAdvanceBookingDays` (no fuso do negócio).
   - A rota da equipe ignora a janela, para permitir encaixe.
6. **Sem `professionalId`**, a resposta junta todos os profissionais que podem atender (membro `active` e com todos os serviços). Cada horário lista os profissionais livres nele.
7. **Serviços:**
   - Na rota pública, só serviços ativos: inativo ou inexistente → 404 `SERVICE_NOT_FOUND`.
   - Na rota da equipe, qualquer serviço do negócio.
   - Profissional que não existe, não executa todos os serviços ou está suspenso → 404 `PROFESSIONAL_NOT_FOUND`.
8. **Na rota pública, data passada ou fora da janela** devolve lista vazia, e não erro, para o calendário do front tratar todos os dias do mesmo jeito. A rota da equipe não tem essa restrição.
9. **O cálculo é uma função pura** (`computeSlots`), sem banco. O service só reúne os dados e chama a função. O agendamento da Etapa 3 reaproveita a mesma função para conferir o horário pedido.
   - Para a Etapa 3: o `AvailabilityService` faz três consultas em paralelo (`Promise.all`). Dentro de uma transação, elas rodariam na mesma conexão, o que o `pg` já marca como depreciado. Quando o agendamento usar a disponibilidade dentro da transação dele, essas consultas precisam ser sequenciais.

### Fora desta etapa

- Resumo de dias com horário livre no mês (para pintar o calendário).
- Intervalo de almoço e mais de um turno por dia (§5 prevê um turno).
- Tempo de preparo entre atendimentos.

### Endpoints

| Método | Rota | Acesso |
|---|---|---|
| GET | `/api/public/businesses/:slug/availability?date&serviceIds&professionalId?` | público, com janela de agendamento |
| GET | `/api/businesses/:businessId/availability?date&serviceIds&professionalId?` | membro, sem janela |

Resposta: `{ date, timezone, durationMinutes, slots: [{ startAt, endAt, professionalIds }] }`.

### Organização

- Nova feature `features/appointments/`: disponibilidade agora e agendamentos na Etapa 3.
  - Depende de `businesses` (negócio, horário, settings), `catalog` (serviços) e `professionals` (profissionais, horários, ausências), sempre pelos `index.ts`.
  - É dona do repositório de agendamentos.
- `professionals` ganha consultas em lote: horários de trabalho de vários profissionais num dia da semana e ausências num intervalo.
- `common/utilities/time-zone.ts`: data e hora locais ↔ instante UTC.

### Tarefas

- [x] T2.1 `common/utilities/time-zone.ts` (local → UTC, dia da semana e "hoje" no fuso).
- [x] T2.2 `computeSlots` puro em `features/appointments/slot-calculator.ts`.
- [x] T2.3 Consultas em lote em `professionals` (horários e ausências de vários profissionais).
- [x] T2.4 `AvailabilityService`: valida serviços e profissional, reúne os dados, aplica a janela e calcula.
- [x] T2.5 DTOs e controllers (público e da equipe) documentados.
- [x] T2.6 Registrar a feature e atualizar `docs/regras-de-negocio.md` §5.
- [x] T2.7 Fechamento: build, lint, conferência do cálculo contra o banco e rotas no Swagger.

## Etapa 3: agendamentos

### Decisões

1. **Duas portas de criação:**
   - **Cliente** (`POST /api/me/appointments`, autenticado):
     - envia `businessSlug`, `professionalId`, `serviceIds`, `startAt` e `customerNotes?`;
     - o cliente vem de `CustomersService.resolveForUser`, que exige e-mail verificado (Etapa 1).
   - **Equipe** (`POST /api/businesses/:businessId/appointments`):
     - envia `customerId`, `professionalId`, `serviceIds`, `startAt`, `customerNotes?` e `internalNotes?`;
     - o agendamento nasce `confirmed`.
2. **Status inicial do agendamento do cliente:** depende da nova setting `autoConfirmOnlineBookings` (padrão `true`). Ligada, nasce `confirmed`; desligada, nasce `pending`.
3. **Validação do horário:**
   - **Cliente:** `startAt` precisa ser exatamente um dos horários que a disponibilidade pública devolve para aquele dia, profissional e serviços. Isso inclui a grade, a antecedência mínima e máxima e os serviços ativos.
   - **Equipe:** o atendimento inteiro precisa caber no expediente do dia (horário do negócio ∩ horário do profissional) e não encostar em ausência nem em outro agendamento. A grade e a janela de antecedência não se aplicam, para permitir encaixe.
   - Se não couber → 409 `APPOINTMENT_SLOT_UNAVAILABLE`.
   - As duas checagens reaproveitam o cálculo da Etapa 2, e a leitura acontece **antes** da transação de escrita. Com isso, a nota da Etapa 2 sobre consultas em paralelo dentro de transação deixa de se aplicar.
4. **Concorrência:**
   - Restrição `EXCLUDE USING gist` (§8) sobre `("professionalId" WITH =, tstzrange("startAt", "endAt") WITH &&)`, valendo para agendamentos que ocupam a agenda (status diferente de `cancelled` e `no_show`, sem `deletedAt`).
   - A restrição é declarada na entity com `@Exclusion`, e a migration cria a extensão `btree_gist`.
   - Violação (`23P01`) → 409 `APPOINTMENT_SLOT_UNAVAILABLE`.
5. **Serviços, preço e comissão** (§8, §10, serviço avulso):
   - Cada serviço vira uma linha de `AppointmentService`:
     - `listPrice` = `price` = preço atual do serviço;
     - `durationMinutes` = duração atual do serviço;
     - `commissionPercent` = `ProfessionalService.commissionPercent ?? Professional.commissionPercent`;
     - `commissionAmount` = `price × percent / 100`, arredondado a 2 casas.
   - Os serviços são atendidos em sequência: `endAt` = `startAt` + soma das durações.
   - `totalPrice` é a soma dos preços. `commissionMode` fica `null` e `Appointment.commissionAmount` fica `0`, porque não há pacote.
   - Pacotes ficam para a feature de pacotes.
6. **Transições de status** (fora delas → 409 `INVALID_STATUS_TRANSITION`):

   | De | Para |
   |---|---|
   | `pending` | `confirmed`, `cancelled` |
   | `confirmed` | `in_progress`, `completed`, `cancelled`, `no_show` |
   | `in_progress` | `completed` |
   | `completed`, `cancelled`, `no_show` | nenhuma (finais) |

   - `in_progress`, `completed` e `no_show` só a partir do `startAt`.
   - `cancelled` grava `cancelledAt` e `cancellationReason`.
7. **Histórico:** a criação e toda mudança de status gravam um `AppointmentStatusHistory` na mesma transação, com o status anterior (`null` na criação), o novo, o motivo e o usuário que fez a mudança.
8. **Permissões da equipe:**
   - Qualquer membro ativo vê a agenda inteira.
   - `owner`/`admin` criam e alteram qualquer agendamento.
   - Quem tem só o papel `professional` cria e altera apenas os agendamentos em que é o profissional; nos demais → 403 `INSUFFICIENT_BUSINESS_ROLE`.
9. **Remarcar** (`PATCH`, só a equipe e só em `pending`/`confirmed`):
   - pode mudar `startAt`, `professionalId` e `internalNotes`; os serviços são fixos;
   - um novo horário ou profissional passa pela validação da equipe (decisão 3);
   - trocar o profissional recalcula a comissão das linhas.
10. **Cliente** (`/api/me/appointments`):
    - lista os próprios agendamentos de todos os negócios, paginada, com filtro `upcoming`;
    - pode cancelar o próprio agendamento em `pending`/`confirmed`, até `cancellationLimitHours` antes do `startAt` (→ 409 `CANCELLATION_WINDOW_CLOSED`);
    - não reagenda: cancela e marca outro.
11. **Agenda da equipe** (`GET /appointments?from&to`): o intervalo vai até 31 dias, com filtros `professionalId` e `status`, ordenada por `startAt` e sem paginação, porque é a visão de calendário.
12. **Ausência × agendamentos** (pendência da spec de profissionais):
    - Criar ou alterar uma ausência que se sobrepõe a agendamentos que ocupam a agenda → 409 `TIME_OFF_CONFLICTS_WITH_APPOINTMENTS`.
    - `professionals` não depende de `appointments`, então a checagem lê a tabela `appointments` pelo `manager`, como a remoção de membro faz com profissionais.

### Fora desta etapa

- Notificações e e-mails de agendamento.
- Pagamentos e pacotes.
- Reagendamento pelo cliente.
- Lembrete automático e marcação automática de `no_show`.

### Endpoints

| Método | Rota | Acesso |
|---|---|---|
| GET | `/api/businesses/:businessId/appointments?from&to&professionalId?&status?` | membro |
| GET | `/api/businesses/:businessId/appointments/:appointmentId` | membro |
| POST | `/api/businesses/:businessId/appointments` | membro (decisão 8) |
| PATCH | `/api/businesses/:businessId/appointments/:appointmentId` | membro (decisão 8) |
| POST | `/api/businesses/:businessId/appointments/:appointmentId/status` | membro (decisão 8) |
| GET | `/api/me/appointments?upcoming&page&pageSize` | autenticado |
| POST | `/api/me/appointments` | autenticado, e-mail verificado |
| POST | `/api/me/appointments/:appointmentId/cancel` | autenticado, dono |

### Novos `ErrorCode`

`APPOINTMENT_NOT_FOUND`, `APPOINTMENT_SLOT_UNAVAILABLE`, `INVALID_STATUS_TRANSITION`, `CANCELLATION_WINDOW_CLOSED`, `TIME_OFF_CONFLICTS_WITH_APPOINTMENTS`.

### Tarefas

- [x] T3.1 Migration: `btree_gist`, `@Exclusion` em `AppointmentEntity` e setting `autoConfirmOnlineBookings`, também no DTO de settings.
- [x] T3.2 Novos `ErrorCode`.
- [x] T3.3 Disponibilidade: checagem de um horário (`ensureBookable`) nos modos cliente e equipe.
- [x] T3.4 `AppointmentsService`:
  - criação pela equipe e pelo cliente, com preço, comissão e histórico;
  - tratamento de `23P01`.
- [x] T3.5 Transições de status com histórico, remarcação e cancelamento pelo cliente.
- [x] T3.6 Agenda da equipe, detalhe e "meus agendamentos", com DTOs.
- [x] T3.7 Controllers documentados (equipe e `/api/me`).
- [x] T3.8 Conflito entre ausência e agendamentos.
- [x] T3.9 Registrar a feature e atualizar `docs/regras-de-negocio.md` §8.
- [x] T3.10 Fechamento: build, lint, migration sem diferenças, cenário completo contra o banco e rotas no Swagger.

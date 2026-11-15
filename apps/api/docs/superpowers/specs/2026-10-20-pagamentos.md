# Pagamentos

Formas de pagamento do negócio e registro manual do que foi recebido em cada agendamento (regras de negócio §3 e §9).

Depende das specs `2026-10-20-agendamentos.md` e `2026-10-20-pacotes.md`.

## Etapas

1. **Formas de pagamento**: concluída.
2. **Registro de pagamentos**: concluída.

## Decisões gerais

1. **Registro manual.** A equipe anota o que recebeu no balcão (Pix, maquininha, dinheiro). Não há gateway: o sistema não cobra nem confere nada.
2. **Preparado para pagamento online.** O cliente vai poder pagar pelo app no futuro.
   - Os status `pending` e `failed` ficam reservados para isso (cobrança criada e aguardando, e cobrança recusada). O registro manual nunca os usa.
   - Quando o gateway vier, entram as colunas dele (id externo, provedor) e um webhook que leva `pending` a `paid` ou `failed`. O resto desta spec continua valendo.
3. **Status no registro manual:**
   - Lançar cria o pagamento já `paid`.
   - **Estornar** (`paid → refunded`): o dinheiro foi devolvido ao cliente. É sempre do valor inteiro do pagamento.
   - **Cancelar** (`paid → cancelled`): o lançamento foi um erro e o dinheiro nunca entrou.
   - `refunded` e `cancelled` são finais. Para corrigir um valor, cancela-se o lançamento e faz-se outro.
4. **Total recebido = soma dos pagamentos `paid`.** Estornados e cancelados não contam.
   - Isso ajusta a regra do §9, que previa estorno como lançamento separado ("`paid` menos `refunded`").
5. **Nunca receber mais que o `totalPrice`.** Um lançamento que faria o recebido passar do total → 409 `PAYMENT_EXCEEDS_BALANCE`.
6. **Permissões:**
   - Lançar, estornar e cancelar seguem a regra de alterar agendamentos: `owner`/`admin` em qualquer agendamento; quem é só `professional`, nos próprios. Senão → 403 `INSUFFICIENT_BUSINESS_ROLE`.
   - Qualquer membro ativo vê os pagamentos, como vê a agenda.
7. **Agendamento cancelado não recebe lançamento novo** (→ 409 `PAYMENT_NOT_ALLOWED`). Os pagamentos já feitos continuam lá: é a equipe quem decide se estorna (sinal devolvido) ou não (sinal retido).
   - `no_show` aceita lançamento, para cobrar taxa de falta.
8. **O pagamento não muda o status do agendamento.** Concluir o atendimento e receber são ações separadas.
9. **Sem exclusão.** Pagamento é registro financeiro: não é apagado nem editado, só estornado ou cancelado.

## Etapa 1: formas de pagamento

### Decisões

1. **As formas ficam na feature `businesses`**, como horário e configurações, porque são configuração do negócio e nascem na criação dele. A feature de pagamentos lê as formas pelo `index.ts` de `businesses`.
2. **4 formas padrão**, criadas na mesma transação do cadastro do negócio: Dinheiro, Pix, Cartão de crédito e Cartão de débito, todas ativas.
   - Uma migration cria as mesmas para os negócios que já existem.
3. **O negócio edita, desativa e remove as formas**, inclusive as padrão.
   - Desativada: não aceita lançamentos novos, mas os antigos continuam apontando para ela.
   - Remoção: exclusão lógica (`softDelete`), com o mesmo efeito para os lançamentos antigos.
4. **Nome:** de 1 a 100 caracteres. Repetir nome no mesmo negócio é permitido; não há índice único.

### Endpoints

Todos ficam sob `/api/businesses/:businessId/payment-methods`.

| Método | Rota | Acesso |
|---|---|---|
| GET | `/?isActive?` | membro |
| POST | `/` | `owner`/`admin` |
| PATCH | `/:paymentMethodId` | `owner`/`admin` |
| DELETE | `/:paymentMethodId` | `owner`/`admin` |

Corpo: `name`, `description?` e `isActive?`. Lista ordenada por nome.

### Novos `ErrorCode`

`PAYMENT_METHOD_NOT_FOUND`.

### Tarefas

- [x] T1.1 `ErrorCode` e registro de `BusinessPaymentMethodEntity` e `PaymentEntity` no `TypeOrmModule.forFeature`.
- [x] T1.2 `BusinessPaymentMethodsService` (listar, criar, editar, remover e `getActiveById` para os lançamentos) e as 4 padrão na criação do negócio.
- [x] T1.3 Migration de dados com as 4 padrão para os negócios existentes.
- [x] T1.4 DTOs e controller documentados.
- [x] T1.5 Fechamento: build, lint, migration sem diferenças de schema e cenário contra o banco.

## Etapa 2: registro de pagamentos

### Decisões

1. **Nova feature `payments`**, dona do repositório de `Payment`.
   - Ela depende de `appointments` (o agendamento e a checagem de permissão) e de `businesses` (as formas).
   - `appointments` não depende de `payments`: o resumo financeiro é calculado a partir da relação `Appointment.payments`, carregada pelo próprio `appointments`.
2. **`AppointmentsService` expõe a checagem de permissão** (`ensureCanManage`, antes privada) e a trava do agendamento (`lockForUpdate`), para que pagamentos usem a mesma regra sem tocar no repositório de agendamentos.
3. **Lançamento:** `paymentMethodId` (forma ativa do negócio, senão → 404 `PAYMENT_METHOD_NOT_FOUND`), `amount` (maior que zero, até 2 casas decimais) e `notes?`.
   - A checagem do saldo e a gravação acontecem na mesma transação, com o agendamento travado (`SELECT ... FOR UPDATE`). Assim, dois lançamentos simultâneos não passam juntos do total.
4. **Estorno e cancelamento** recebem `reason?`, que é acrescentado às `notes` do pagamento. Pagamento que não está `paid` → 409 `INVALID_PAYMENT_TRANSITION`.
5. **Resumo financeiro do agendamento**, na resposta da equipe (detalhe e agenda):
   - `paidAmount`: soma dos `paid`;
   - `balance`: `totalPrice − paidAmount`;
   - `paymentStatus`: `unpaid` (nada recebido), `partial` ou `paid` (recebido igual ao total; agendamento de total zero já nasce `paid`).
   - O cliente (`/api/me/appointments`) não vê pagamentos nesta etapa.

### Endpoints

Todos ficam sob `/api/businesses/:businessId/appointments/:appointmentId/payments`.

| Método | Rota | Acesso |
|---|---|---|
| GET | `/` | membro |
| POST | `/` | membro (decisão geral 6) |
| POST | `/:paymentId/refund` | membro (decisão geral 6) |
| POST | `/:paymentId/cancel` | membro (decisão geral 6) |

A resposta de cada pagamento traz: `id`, `amount`, `status`, a forma (`{ id, name }`), `notes`, `createdAt` e `updatedAt`.

### Novos `ErrorCode`

`PAYMENT_NOT_FOUND`, `PAYMENT_EXCEEDS_BALANCE`, `PAYMENT_NOT_ALLOWED`, `INVALID_PAYMENT_TRANSITION`.

### Fora desta spec

- Pagamento online (gateway, Pix ou cartão pelo app, webhooks).
- Estorno parcial.
- Aviso ao cliente de pagamento recebido (o tipo `payment_received` já existe).
- Relatórios: caixa do dia, faturamento por período e comissão por profissional.
- Pagamentos na visão do cliente.

### Tarefas

- [x] T2.1 Novos `ErrorCode` e `ensureCanManage` público no `AppointmentsService`.
- [x] T2.2 `PaymentsService`: listar, lançar (com trava e checagem de saldo), estornar e cancelar.
- [x] T2.3 DTOs e controller documentados.
- [x] T2.4 Resumo financeiro (`paidAmount`, `balance`, `paymentStatus`) nas respostas de agendamento da equipe.
- [x] T2.5 Atualizar `docs/regras-de-negocio.md` §3 e §9.
- [x] T2.6 Fechamento: build, lint e cenário contra o banco (saldo, estouro, lançamentos simultâneos, estorno, cancelamento, permissões e agendamento cancelado).

## Resultado do fechamento

- Etapa 1: negócio novo com as 4 formas; CRUD, filtro, exclusão lógica, permissões; migration de dados revertida e reaplicada.
- Etapa 2 (26 checagens contra o banco):
  - saldo e resumo (`unpaid` → `partial` → `paid`), estouro por R$ 0,01, valor zero e 3 casas;
  - forma inativa, removida (continua no pagamento antigo) e de outro agendamento;
  - estorno com motivo, estorno e cancelamento repetidos;
  - **3 lançamentos simultâneos de R$ 60 sobre saldo de R$ 90: só 1 passa**;
  - profissional no próprio agendamento, 403 no de outro; agendamento cancelado → 409;
  - resumo também na agenda.

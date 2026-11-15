# Regras de negócio

Referência do comportamento do sistema para quem constrói o frontend (ou qualquer cliente da API). A fonte de verdade é a API (`apps/api`); o Swagger em `/api/docs` traz o contrato de cada rota. Este documento explica o **porquê** e as regras que atravessam várias telas.

Valores monetários são em reais (2 casas). Datas trafegam em ISO 8601 (UTC); exiba no fuso do negócio (`business.timezone`).

## Visão geral

- **Negócio** (`business`): barbearia, salão, clínica etc. Tem página pública em `/api/public/businesses/:slug` (só negócios `active`).
- **Redes sociais** (`PUT /businesses/:id/social-links`, `owner`/`admin`): no máximo um link por rede (`instagram`, `facebook`, `tiktok`, `youtube`, `x`, `linkedin`, `website`), sempre `https` e no domínio da rede (`website` aceita qualquer domínio). Aparecem em `socialLinks` na página pública, inclusive com o negócio `restricted`. O front escolhe o ícone pelo `network`, nunca pela URL.
- **Membros** da equipe acessam o negócio com papéis. Um membro pode ter **perfil de profissional** (quem atende).
- **Clientes** (`customers`) pertencem a um negócio. Podem ter conta na plataforma (agendam online) ou ser só cadastro de balcão.
- **Catálogo**: serviços (com categorias) e pacotes.
- **Agendamentos**, com pagamentos, avaliações e notificações.

## Papéis e permissões

| Papel | Pode |
|---|---|
| `owner` | Tudo. Só um `owner` gerencia outros `owner` (membros e convites). |
| `admin` | Tudo do negócio, exceto gerenciar `owner`. |
| `professional` | Ver o negócio; gerenciar **só os próprios** agendamentos e os pagamentos deles (`INSUFFICIENT_BUSINESS_ROLE` caso contrário). |

- Rotas de configuração (negócio, catálogo, profissionais, membros, convites, formas de pagamento, WhatsApp, bloqueio de cliente) são de `owner`/`admin`.
- Membro `suspended` perde o acesso; o profissional dele some da agenda pública e não recebe novos agendamentos.
- Novos membros entram **só por convite** (e-mail com link `FRONTEND_URL/accept-invitation?token=...`). Quem aceita precisa estar logado com o e-mail do convite.

## Assinatura e período de teste

Cada negócio tem uma assinatura própria (`GET /api/businesses/:id/subscription`, qualquer membro). Um dono com dois negócios tem duas assinaturas. Não há plano gratuito: todo negócio começa em teste.

- **Teste** (`trialing`): começa na criação do negócio e dura 7 dias, com tudo liberado e sem limite de profissionais. Cada negócio tem um único teste (o CPF/CNPJ não se repete).
- **Bônus de ativação**: o primeiro agendamento criado durante o teste (pela equipe ou pelo cliente) soma 7 dias ao fim original, uma única vez (`activation.bonusGrantedAt`). Agendamento cancelado depois não tira o bônus. Criado com o teste já vencido, não concede.
- **Etapas de ativação** (`activation.steps`), para o checklist de onboarding: horário de funcionamento cadastrado, pelo menos um serviço ativo, pelo menos um profissional ativo com expediente e ligado a um serviço ou pacote, e o primeiro agendamento. Como um agendamento só existe com as três primeiras feitas, só ele dispara o bônus.
- `active`: assinatura em dia, acesso completo sem prazo.
- O histórico da assinatura fica guardado, um evento por mudança (início do teste, bônus concedido e, com a cobrança, ativação, inadimplência e cancelamento), com quem fez e quando. Ainda não é exposto pela API.

### Acesso restrito

`access` vale `full` ou `restricted`. Teste vencido deixa o negócio `restricted`. Os dados nunca são apagados.

| Continua | Para (`SUBSCRIPTION_RESTRICTED`, 402) |
|---|---|
| Login, agenda, clientes, catálogo e histórico | Agendamento online pelo cliente |
| Concluir, cancelar, remarcar e marcar falta nos agendamentos existentes | Novos agendamentos pela equipe |
| Registrar pagamentos | Convidar membros (e reenviar convite) |
| Lembretes por e-mail dos agendamentos já marcados | Conectar e enviar WhatsApp |

A página pública continua no ar e traz `onlineBookingAvailable`: com `false`, esconda o botão de agendar.

> Enquanto a cobrança não existe, `BILLING_ENFORCEMENT_ENABLED` fica desligado: o teste é contado e exibido, mas vencer não restringe nada (`access` segue `full`). Mostre "teste encerrado" a partir de `trialEndsAt`.

### Cobrança (quando o gateway entrar)

Assinatura única: preço base com alguns profissionais incluídos, mais um valor por profissional extra.

```
valor = base + max(0, profissionais ativos − incluídos) × valor por extra
```

- **Profissional ativo**: perfil de profissional não excluído, de membro não excluído e não `suspended`. `owner`/`admin` sem perfil de profissional não contam; o `owner` que também atende conta.
- A contagem é feita ao gerar cada fatura e fica gravada nela. Mudanças no meio do ciclo valem a partir da próxima fatura, sem cobrança proporcional nem reembolso.
- Adicionar profissional nunca é bloqueado; a tela só avisa o novo valor.
- Só o `owner` gerencia a assinatura.

## Configurações de agendamento do negócio

`GET/PATCH /api/businesses/:id/settings` (editar: `owner`/`admin`).

| Campo | Padrão | Efeito |
|---|---|---|
| `slotIntervalMinutes` | 30 | Grade dos horários oferecidos (múltiplo de 5, 5–240). |
| `bufferMinutes` | 0 | Intervalo livre entre dois atendimentos do mesmo profissional (limpeza/preparo). Múltiplo de 5, 0–120. |
| `minimumAdvanceBookingMinutes` | 60 | Antecedência mínima para o cliente agendar online. |
| `maximumAdvanceBookingDays` | 30 | Até quantos dias à frente o cliente agenda online. |
| `cancellationLimitHours` | 24 | Até quantas horas antes do início o cliente pode cancelar. |
| `autoConfirmOnlineBookings` | `true` | Agendamento online nasce `confirmed`; desligado, nasce `pending` e a equipe confirma. |
| `reminderHoursBefore` | 24 | Antecedência do lembrete ao cliente; `0` desliga. |
| `unblockFee` | 0 | Taxa para o cliente sair de um bloqueio por taxa (ver [Bloqueio de clientes](#bloqueio-de-clientes)). |

## Horários e disponibilidade

Horário livre = horário do negócio ∩ expediente do profissional − ausências − agendamentos ativos.

- **Horário do negócio** (`/hours`): a semana inteira, 7 dias obrigatórios.
- **Expediente do profissional** (`/professionals/:id/working-hours`): também 7 dias; precisa caber no horário do negócio, e dia fechado do negócio só aceita folga.
- **Ausências** (`/time-offs`): férias, consultas etc. Não podem sobrepor outra ausência nem agendamentos ativos.
- **Agendamentos ativos** ocupam a agenda; `cancelled` e `no_show` liberam o horário.
- **Duração**: a soma das durações dos serviços (ou dos serviços do pacote). O atendimento **inteiro** precisa caber: um horário só aparece se do início ao fim não houver conflito. Ex.: serviço de 60 min às 10:20 não aparece se houver agendamento às 10:40.
- **Intervalo entre atendimentos** (`bufferMinutes`): cada agendamento existente ocupa esse tempo a mais antes e depois. Não vale antes do fechamento nem em volta de ausências. O horário salvo no agendamento é só o do atendimento.
- Os inícios seguem a grade de `slotIntervalMinutes` a partir da abertura.

Duas consultas:

| | Pública (`/api/public/businesses/:slug/availability`) | Equipe (`/api/businesses/:id/availability`) |
|---|---|---|
| Antecedência mínima/máxima | Respeita; fora da janela devolve `slots` vazio | Ignora (permite encaixe) |
| Serviços inativos | Não aceita | Aceita |

Cada slot traz `professionalIds`: os profissionais livres naquele início. Sem `professionalId` na query, considera todos os aptos.

**Profissional apto**: membro ativo que executa **todos** os serviços pedidos (`PUT /professionals/:id/services`) ou que está ligado ao pacote (`PUT /professionals/:id/packages`).

## Catálogo

- **Serviço**: preço, duração, categoria opcional, ativo/inativo, até 10 imagens. Exclusão é lógica; agendamentos passados continuam apontando para ele.
- **Categoria**: excluir não apaga os serviços (ficam sem categoria). Categoria inativa esconde seus serviços do catálogo público.
- **Pacote**: conjunto de serviços com preço próprio. Só é agendável com profissionais ligados. Aparece no catálogo público só se estiver ativo e com todos os serviços ativos.
- Mudar preço/duração/serviços **não altera** agendamentos já feitos: o agendamento guarda os valores do momento da reserva.

## Agendamentos

### Criação

| | Pelo cliente (`POST /api/me/appointments`) | Pela equipe (`POST /api/businesses/:id/appointments`) |
|---|---|---|
| Horário | Precisa ser um slot da disponibilidade pública | Basta caber no expediente e estar livre (encaixe) |
| Status inicial | `confirmed` ou `pending` (`autoConfirmOnlineBookings`) | `confirmed` |
| Origem (`origin`) | `customer` | `team` |
| Requisitos | E-mail verificado (`EMAIL_NOT_VERIFIED`); cliente não bloqueado (`CUSTOMER_BLOCKED`) | Cliente cadastrado no negócio |

- Envie **`serviceIds` ou `packageId`**, nunca os dois. Até 10 serviços, atendidos em sequência.
- No agendamento online, o sistema usa o cadastro de cliente ligado à conta do usuário; se não houver, liga a um cadastro de balcão com o mesmo e-mail (quando há exatamente um) ou cria um novo.
- Conflito de horário em reservas simultâneas é barrado no banco: a segunda recebe `APPOINTMENT_SLOT_UNAVAILABLE` (409). Trate como "horário acabou de ser ocupado" e recarregue os slots.

### Preço e comissão

- **Serviços avulsos**: cada linha guarda preço de tabela, preço cobrado, duração e comissão do profissional (percentual do serviço no profissional, ou o percentual padrão dele).
- **Pacote**: o preço do pacote é rateado entre os serviços proporcionalmente ao preço de cada um. Comissão no modo `package` (percentual sobre o pacote) ou `prorated` (por serviço, sobre o valor rateado).

### Status

```
pending ──► confirmed ──► in_progress ──► completed
   │            │
   │            ├──► completed
   │            ├──► no_show
   ▼            ▼
cancelled   cancelled
```

- `in_progress`, `completed` e `no_show` só a partir do horário de início.
- Toda mudança fica no histórico (`statusHistory`), com quem mudou e o motivo.
- O motivo do cancelamento pela equipe é mostrado e enviado ao cliente.

### Alterações pela equipe

- **Remarcar** (`PATCH /appointments/:id`): muda horário e/ou profissional (só `pending`/`confirmed`). Mantém serviços e duração; trocar o profissional recalcula a comissão. Observações internas podem ser editadas sempre.
- **Trocar serviços** (`PUT /appointments/:id/services`): envia a lista final de serviços (mín. 1). Só `pending`/`confirmed` e **não vale para pacote** (`APPOINTMENT_IS_PACKAGE`: cancele e agende avulso). Mantém o início e recalcula fim e total. Serviços mantidos conservam o preço da reserva; os novos usam o preço atual. Adicionar exige que o profissional execute os novos serviços e que o atendimento maior caiba na agenda. Recusa se o novo total ficar abaixo do já pago (`PAYMENT_EXCEEDS_BALANCE`; estorne antes). Remover libera o tempo na agenda na hora.

### Cancelamento pelo cliente

`POST /api/me/appointments/:id/cancel`: só `pending`/`confirmed` e até `cancellationLimitHours` antes do início (`CANCELLATION_WINDOW_CLOSED`). A resposta de "meus agendamentos" traz `cancellableUntil` (ou `null`): use para mostrar/esconder o botão.

### Lembrete

Enviado `reminderHoursBefore` antes do início, só para agendamentos `confirmed`. Se o agendamento já nasce (ou é confirmado/remarcado) dentro da janela, o lembrete é dispensado.

## Pagamentos

Registro manual pela equipe (não há gateway de pagamento online).

- Formas de pagamento por negócio; nascem com Dinheiro, Pix, Cartão de crédito e Cartão de débito.
- Pagamento nasce `paid`. A soma dos `paid` não passa do `totalPrice` (`PAYMENT_EXCEEDS_BALANCE`). Agendamento cancelado não recebe pagamento novo.
- **Estorno** (`refund`): o dinheiro voltou ao cliente. **Cancelamento** (`cancel`): lançamento feito por engano. Ambos deixam de contar no recebido.
- **Data do recebimento** (`paidAt`): por padrão, o momento do lançamento. Quando o pagamento é lançado depois, a equipe informa o dia em que o dinheiro entrou (nunca no futuro). Os indicadores usam essa data no "Recebido".
- Registrar pagamento **não muda** o status do agendamento.
- `paymentStatus` do agendamento: `unpaid`, `partial` ou `paid` (total zero já é `paid`); `balance` é o que falta.

## Clientes

- Cadastro de balcão pela equipe. Telefone gravado em E.164 (aceita máscara; sem DDI é tratado como brasileiro) e e-mail em minúsculas.
- **Duplicados**: criar/editar com telefone ou e-mail já usado devolve `CUSTOMER_POSSIBLE_DUPLICATE` (409) com os ids existentes em `details`; reenvie com `allowDuplicate: true` para gravar mesmo assim. `GET /customers/possible-duplicates` lista os grupos.
- `whatsappOptOut`: o cliente pediu para não receber WhatsApp.
- A resposta traz `noShowCount` (quantas faltas) e `activeBlock` (bloqueio vigente ou `null`).
- **Histórico** (`GET /customers/:id/appointments`): todos os agendamentos do cliente no negócio, do mais recente ao mais antigo, paginados, com `status` opcional. Qualquer membro vê o histórico completo, inclusive `professional` (só leitura; continua gerenciando só os próprios agendamentos).
- **Resumo** (`GET /customers/:id/appointments/summary`): contagens (total, `completed`, `cancelled`, `no_show`), valor gasto (soma do `totalPrice` dos `completed`, mesma regra da receita do dashboard), ticket médio (`null` sem atendimento concluído), última visita (início do último `completed`) e próximo agendamento (`pending`/`confirmed` que ainda não começou). Mesma permissão do histórico.

### Bloqueio de clientes

Para clientes que faltam. O bloqueio **impede só o agendamento online** naquele negócio; a equipe continua podendo agendar pelo cliente.

| Tipo | Como funciona |
|---|---|
| `temporary` | Vence sozinho em `until` (no futuro, até 365 dias). |
| `fee` | Dura até a equipe registrar o pagamento da taxa. O valor é a `unblockFee` do negócio **no momento do bloqueio** (exige `unblockFee` > 0). |

- Bloquear: `POST /customers/:id/block` (`owner`/`admin`), com `type`, `until` (só `temporary`) e `reason` opcional (só a equipe vê). Um bloqueio novo encerra o anterior.
- Taxa paga: `POST /customers/:id/block/fee-payment` (qualquer membro), com a forma de pagamento. O cliente paga por fora (Pix, balcão) e o registro desbloqueia na hora. Essa taxa **não** entra nos pagamentos de agendamento.
- Desbloquear sem cobrar: `DELETE /customers/:id/block` (`owner`/`admin`).
- O histórico de bloqueios fica guardado (quem bloqueou, quem desbloqueou, como a taxa foi paga).
- Cliente bloqueado que tenta agendar online recebe `CUSTOMER_BLOCKED` (403) com `details`:
  - `[{ path: 'until', message: '<ISO>' }]` no bloqueio temporário;
  - `[{ path: 'feeAmount', message: '50.00' }]` no bloqueio por taxa.

  Mostre a data ou o valor e oriente o cliente a falar com o negócio. A disponibilidade pública não esconde horários de cliente bloqueado; o bloqueio só é checado ao confirmar o agendamento.

## Avaliações

- O cliente avalia (`PUT /api/me/appointments/:id/review`) só agendamentos `completed`, até 30 dias depois do fim. Uma avaliação por agendamento, editável nesse prazo. A nota conta para o negócio e para o profissional.
- O negócio pode ocultar o comentário (`hidden`): some da página pública, mas a nota continua e conta na média. Pode responder; a resposta aparece mesmo com o comentário oculto.

## Notificações

Canais: in-app (lista + SSE em `/api/me/notifications/stream`), e-mail e WhatsApp (se o negócio conectou e o cliente não fez opt-out). Quem executou a ação não é notificado dela.

| Evento | Cliente | Profissional | Gestores (`owner`/`admin`) |
|---|---|---|---|
| Agendamento criado | sim | sim | só se foi o cliente que agendou |
| Confirmado (`pending` → `confirmed`) | sim | | |
| Remarcado / trocado de profissional | sim | o novo e o anterior | |
| Cancelado | sim | sim | só se foi o cliente que cancelou |
| Concluído | convite para avaliar (se tiver conta) | | |
| Lembrete | sim | | |
| Avaliação recebida | | sim | sim |
| WhatsApp desconectado (mais de 2 min) | | | sim |

## WhatsApp

- `owner`/`admin` conectam o número do negócio via QR code (`POST /whatsapp`, depois consulte `GET /whatsapp` a cada poucos segundos enquanto `status` for `connecting`). Conectar registra o aceite dos termos.
- Dá para pausar o envio sem desconectar (`PATCH`). Desconectar apaga a conexão.

## Contas e autenticação

- Sessão em cookies httpOnly (`access_token`, `refresh_token`); o front nunca lê token. Em 401, chame `POST /api/auth/refresh` e repita; se falhar, mande para o login.
- Login por e-mail/senha ou Google. Conta só-Google pode criar senha depois.
- Para voltar a uma página depois do login com Google, abra `GET /api/auth/google?redirectTo=<caminho>`: o caminho (relativo, começando com `/`) volta no redirect final para `/auth/callback` ou `/login?error=...`.
- Verificar o e-mail é obrigatório para **agendar online**, não para logar.
- Trocar ou redefinir a senha derruba as outras sessões.

## Endereços e CEP

- `GET /api/postal-codes/:postalCode` (usuário logado) devolve rua, bairro, cidade e UF de um CEP, para preencher formulários de endereço. A API consulta o ViaCEP e guarda o resultado em cache.
- CEP geral de cidade (cidades pequenas) vem sem `street` e `district`: o usuário completa à mão.
- `POSTAL_CODE_NOT_FOUND` (404): CEP inexistente; peça o endereço manualmente. `POSTAL_CODE_UNAVAILABLE` (502): serviço fora do ar; o formulário continua funcionando sem o preenchimento automático.
- A consulta é só uma ajuda: nunca bloqueie o cadastro por causa dela, e não sobrescreva o que o usuário já digitou.

## Indicadores

Definições únicas, usadas pelo dashboard da home e pelos relatórios. Todo período é em datas locais no fuso do negócio, e o período anterior tem a mesma duração (com "Este mês" no dia 10, compara com os 10 primeiros dias do mês passado). O `professional` sem papel de gestão só recebe os próprios números, sem ranking da equipe nem dados financeiros do negócio; a própria comissão ele vê.

| Indicador | Definição |
|---|---|
| Agendamentos | Agendamentos com início no período, de qualquer status. Os cancelados aparecem à parte. |
| Atendimentos | Agendamentos `completed` com início no período. |
| Faturamento | Soma do `totalPrice` dos atendimentos do período (o valor atendido, pago ou não). |
| Recebido | Soma dos pagamentos `paid` com `paidAt` no período. Estornados e cancelados não contam. |
| A receber | Saldo (`balance`) dos atendimentos ainda não quitados, com início até o fim do período. |
| Ticket médio | Faturamento ÷ atendimentos. |
| Taxa de faltas | `no_show` ÷ (`completed` + `no_show`) no período. |
| Taxa de cancelamento | `cancelled` ÷ agendamentos no período. |
| Clientes atendidos | Clientes distintos com atendimento no período. |
| Clientes novos | Clientes cujo **primeiro atendimento** caiu no período (não conta a data do cadastro). |
| Clientes recorrentes | Clientes atendidos no período que já tinham atendimento antes dele. |
| Clientes que sumiram | Clientes com pelo menos dois atendimentos, o último há mais de 60 dias, e sem agendamento futuro (`pending`/`confirmed`). |
| Nota média | Média das avaliações criadas no período, inclusive as de comentário oculto. |
| Participação online | Agendamentos com `origin = customer` ÷ agendamentos com origem conhecida. |
| Comissão | Soma da comissão dos atendimentos do período. |
| Ocupação | Minutos agendados (`completed`, `confirmed`, `in_progress`, cortados nos limites do período) ÷ minutos de expediente dos profissionais ativos, descontadas as ausências. Pode passar de 100% com encaixes fora do expediente. |
| Horários de pico | Atendimentos por dia da semana e hora de início, no fuso do negócio. |

- **Rotas**: `GET /businesses/:id/dashboard/summary` (cartões, com o período de comparação) e `GET /businesses/:id/dashboard/timeseries` (séries por dia, semana ou mês). Só gestores: `/dashboard/professionals` (ranking da equipe), `/dashboard/services` (serviços avulsos e pacotes; o pacote conta uma vez por atendimento, pelo preço do pacote), `/dashboard/payment-methods` (recebido por forma) e `/dashboard/inactive-customers` (os 10 que sumiram mais recentemente e o total). Qualquer membro, com o mesmo recorte do `summary`: `/dashboard/heatmap` e `/dashboard/occupancy`. As respostas ficam em cache por até 2 minutos; agendamento criado, remarcado ou com status mudado, pagamento e avaliação nova atualizam na hora. Período de até 366 dias. Membro sem papel de gestão e sem perfil de profissional recebe `INSUFFICIENT_BUSINESS_ROLE`.
- **Origem** (`origin`): `customer` quando o próprio cliente agendou pela página pública, `team` quando a equipe agendou pelo painel. Agendamentos anteriores ao campo foram inferidos pelo histórico; o que não deu para inferir vem `null` e fica fora da participação online.
- **Data do recebimento** (`paidAt`): por padrão, o momento do lançamento; a equipe pode informar outra data (no passado) quando lança um pagamento depois. Pagamentos anteriores ao campo usam a data do lançamento.

## Erros

Formato padrão: `{ error: { statusCode, code, message, details? } }`, com `code` do `ErrorCode`, mensagem em português e `details` opcional (`[{ path, message }]`). A lista de códigos fica em `apps/web/src/shared/api/error-code.ts` (espelho de `apps/api/src/common/errors/error-code.enum.ts`). Decida o comportamento da tela pelo `code`, nunca pelo texto da mensagem.

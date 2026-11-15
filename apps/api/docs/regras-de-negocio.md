# Regras de negócio

Registro das decisões de modelagem e das regras de negócio definidas para a API. As entities ficam em `src/database/entities/`. Onde a regra não é garantida pelo banco, ela é marcada como **validação no service**.

## 1. Visão geral

Sistema de agendamento multi-negócio. Um **usuário** pode ser dono, administrador ou profissional em vários **negócios**, e também **cliente** em vários negócios. O negócio é o eixo: serviços, pacotes, profissionais, clientes e agendamentos pertencem a um negócio.

```
User ─┬─ UserIdentity                 Business ─┬─ Setting / Hours / Images / PaymentMethods
      ├─ BusinessMember ─ MemberRole            ├─ Specialty / ServiceCategory / Service / Package
      │     └─ Professional ─┬─ WorkingHours / TimeOff / Specialties
      └─ Customer ─┬─ Appointment   └─ Services / Packages (junções)
                   │    ├─ AppointmentService (preço, duração e comissão copiados)
                   │    ├─ StatusHistory / Payment
                   └─ Review
Notification → User (+ Business e Appointment opcionais)
```

## 2. Usuários e autenticação

- `User` tem e-mail único (normalizado em minúsculas, **validação no service**), nome, `phone` (com DDI, opcional) e `phoneVerifiedAt`.
- `passwordHash` é opcional: quem entra apenas por provider externo não tem senha. No login por senha, `passwordHash` nulo é tratado como credencial inválida, com a mesma mensagem genérica.
- `UserIdentity` liga o usuário a uma conta em um provider (`AuthProvider`, hoje só `google`). O par `(provider, providerUserId)` é único.
- Vincular uma identidade externa a um usuário existente pelo e-mail só é permitido se o provider confirmou o e-mail (`emailVerified`).

## 3. Negócio

- Identificado por `slug` único e `taxId` (CNPJ ou CPF, sem máscara) único.
- Tem `status` (`active`, `inactive`, `suspended`), endereço embutido (`Address`) e `timezone` (nome IANA, padrão `America/Sao_Paulo`).
- **Fuso horário:** horários de funcionamento e de trabalho são `time` sem fuso e valem no `timezone` do negócio. Para saber se está aberto, converta o "agora" para esse fuso.
- **Endereço (Brasil):** `postalCode` guarda os 8 dígitos do CEP sem hífen, `state` é a UF (2 letras), `number` é string (aceita "S/N").
- **Configurações** (`BusinessSetting`, uma por negócio): antecedência mínima de cancelamento (horas), antecedência mínima e máxima de agendamento (minutos e dias), intervalo entre horários disponíveis (minutos) e antecedência do lembrete (`reminderHoursBefore`, horas; `0` desliga). Valores devem ser positivos (**validação no service**).
- **Horário de funcionamento** (`BusinessHour`): um registro por dia da semana (`Weekday`, domingo = 0). Dia fechado (`isClosed`) tem os horários nulos.
- **Formas de pagamento** (`BusinessPaymentMethod`): cadastradas por negócio, com `isActive` e exclusão lógica. O negócio nasce com Dinheiro, Pix, Cartão de crédito e Cartão de débito, que pode editar, desativar ou remover. Forma inativa ou removida não aceita lançamentos novos; os antigos continuam apontando para ela.
- **Imagens:** `type` define a finalidade (`cover`, `gallery`, `interior`, `exterior`, `work`), com ordem de exibição.

## 4. Membros e papéis

- `BusinessMember` é o vínculo único `(business, user)`. Tem `status` (`active`, `suspended`) e `joinedAt`.
- O **status é do vínculo**, uma vez por usuário e negócio. Suspender é uma alteração em uma linha.
- Os **papéis** ficam em `BusinessMemberRole` (`owner`, `admin`, `professional`). Um membro pode ter vários, sem repetir o mesmo papel. O seletor pós-login lista os papéis do usuário por negócio, e a pessoa escolhe com qual entra.
- Todo membro deve ter pelo menos um papel (**validação no service**, criar o vínculo e o papel na mesma transação).
- O papel é permissão. Quem atende clientes é definido pela existência de um `Professional`, e não pelo papel `professional`.
- **Entrada por convite** (`BusinessInvitation`): `owner`/`admin` convida um e-mail com os papéis; o membro só é criado quando a pessoa aceita. O convidado pode ainda não ter conta.
  - Um convite pendente por `(business, email)` (índice único parcial). Convidar de novo troca os papéis e o token.
  - O link vai para `FRONTEND_URL/accept-invitation?token=`; só o hash do token é guardado, com validade de `BUSINESS_INVITATION_TTL_DAYS`.
  - Aceitar exige login com o e-mail do convite, cria o vínculo `active` (ou restaura um removido) e marca o e-mail como verificado.
  - O convite termina aceito, recusado ou revogado. Nenhum dos três volta a ser pendente.
- Só `owner` concede ou retira `owner` e só `owner` altera, suspende ou remove outro `owner`. O negócio sempre mantém ao menos um `owner` ativo (**validação no service**).

## 5. Profissionais

- Todo `Professional` é um membro: relação 1:1 obrigatória com `BusinessMember`, com a chave estrangeira no profissional. O negócio do profissional é `member.business`.
- Um membro tem no máximo um profissional. A mesma pessoa em outro negócio tem outro membro e, se atender, outro profissional. O perfil (`displayName`, `bio`, `photoKey`) é por negócio.
- O profissional nasce de um membro existente. Remover o membro remove o profissional (soft delete, na mesma transação). Recriar o profissional de um membro que já teve um restaura o registro.
- Quem **pode receber agendamentos** é definido pelo status do membro (deve estar `active`). O profissional não tem status próprio.
- **Serviços e pacotes executados:** `ProfessionalService` e `ProfessionalPackage` (junções únicas). O profissional, o serviço e o pacote devem ser do mesmo negócio (**validação no service**).
- **Especialidades:** por negócio (`Specialty`, nome único por negócio), ligadas ao profissional por `ProfessionalSpecialty`.
- **Horário de trabalho** (`ProfessionalWorkingHours`): um registro por dia da semana, com folga (`isDayOff`) e horários nulos. Um turno por dia.
- **Ausências** (`ProfessionalTimeOff`): período com tipo (`vacation`, `day_off`, `sick_leave`, `personal`, `other`). Sobreposição entre ausências e conflito com agendamentos futuros são tratados no service.
- O horário de trabalho deve caber no horário de funcionamento do negócio, quando este estiver configurado: dia fechado só aceita folga (**validação no service**).
- **Disponibilidade** = horário do negócio ∩ horário de trabalho do profissional − ausências − agendamentos existentes (exceto `cancelled` e `no_show`).
  - A duração é a soma dos serviços pedidos, e o profissional precisa executar todos eles.
  - Os horários seguem a grade de `slotIntervalMinutes`, a partir do início do expediente, e o atendimento inteiro precisa caber nele.
  - A data e os horários valem no `timezone` do negócio; a API responde instantes em UTC.
  - Na página pública valem a antecedência mínima e a máxima; a equipe pode encaixar fora delas.

## 6. Catálogo

- `ServiceCategory`: por negócio, com ordem e `isActive`.
- `Service`: por negócio, com duração (min), preço, `isActive`, ordem e imagens. A categoria é **opcional**. Se houver, deve ser do mesmo negócio do serviço (**validação no service**). Um serviço tem no máximo uma categoria.
- `Package`: por negócio, agrupa de 2 a 10 serviços (`PackageService`), com preço próprio (pode ser menor ou maior que a soma dos serviços), duração estimada (só exibição; a agenda bloqueia a soma das durações dos serviços), modo de comissão, `isActive`, ordem e imagens. Exclusão lógica.
  - Só atende o pacote o profissional ligado a ele (`ProfessionalPackage`, com exceção de comissão opcional).
  - Aparece na página pública só se estiver ativo e com todos os serviços ativos.
- Imagens de negócio, serviço e pacote compartilham `ImageBaseEntity` (`storageKey`, `altText`, `displayOrder`).
- **Arquivos no storage:** o banco guarda a key do objeto (`storageKey`, `logoKey`, `photoKey`), nunca a URL. A URL pública é montada na resposta, o que permite trocar domínio ou CDN sem migrar dados.

## 7. Clientes

- `Customer` é o cliente **de um negócio**, com dados próprios: `name`, `email`, `phone`, `notes`.
- A ligação com `User` é **opcional**, o que permite cliente atendido sem conta. Com usuário vinculado, o par `(business, user)` é único.
- **Normalização:** e-mail em minúsculas; telefone em E.164 (sem DDI, assume `+55`).
- **Duplicados avisam, não bloqueiam.** Cadastrar ou editar um cliente com o mesmo telefone ou e-mail de outro cliente ativo do negócio devolve 409 `CUSTOMER_POSSIBLE_DUPLICATE`, com os ids dos existentes. `allowDuplicate: true` grava mesmo assim (ex.: telefone compartilhado). Não há índice único. Os grupos de possíveis duplicados são calculados na hora.
- **Ligar conta a cliente** (agendamento online), em ordem:
  1. cliente já ligado à conta no negócio (restaurado se removido);
  2. e-mail da conta **verificado** e **um único** cliente sem conta com esse e-mail: liga e preenche só os campos vazios;
  3. senão, cria um cliente novo com os dados da conta.
  - O telefone não liga contas, porque não é verificado.
- Agendar online exige e-mail verificado (403 `EMAIL_NOT_VERIFIED`), checado antes da ligação.
- **Opt-out de WhatsApp:** `whatsappOptedOutAt` marca quando o cliente pediu para não receber mensagens. O negócio liga e desliga com `whatsappOptOut` no `PATCH` do cliente (§15).

## 8. Agendamentos

- `Appointment` pertence a um cliente (o negócio vem de `customer.business`), tem um profissional, `startAt`, `endAt`, `status`, observações, motivo e data de cancelamento, e `totalPrice`.
- **Status:** `pending`, `confirmed`, `in_progress`, `completed`, `cancelled`, `no_show`. Toda mudança gera um registro em `AppointmentStatusHistory` (status anterior, novo, motivo e usuário que fez; usuário nulo quando é o sistema), gravado na mesma transação da mudança. Transições permitidas (**validação no service**):
  - `pending` → `confirmed` ou `cancelled`;
  - `confirmed` → `in_progress`, `completed`, `cancelled` ou `no_show`;
  - `in_progress` → `completed`;
  - `completed`, `cancelled` e `no_show` são finais.
  - `in_progress`, `completed` e `no_show` só a partir do `startAt`.
- **Criação:**
  - pela equipe, nasce `confirmed`;
  - pelo cliente (`/api/me/appointments`), nasce `confirmed` ou `pending`, conforme `BusinessSetting.autoConfirmOnlineBookings`.
  - O cliente só reserva horários da disponibilidade pública. A equipe pode encaixar fora da grade e da antecedência, mas dentro do expediente e sem conflito.
- **Permissões:** `owner`/`admin` gerenciam todos os agendamentos; quem é só `professional` gerencia apenas os próprios. A agenda é visível para todos os membros.
- **Cancelamento pelo cliente:** só em `pending`/`confirmed` e até `cancellationLimitHours` antes do início. O cliente não reagenda: cancela e marca outro. A equipe remarca (horário ou profissional) e, ao trocar o profissional, a comissão é recalculada.
- **Serviços do agendamento** (`AppointmentService`): cópia no momento da reserva de `listPrice` (preço de tabela), `price` (valor cobrado), `durationMinutes` e da comissão. Mudanças posteriores no serviço não alteram agendamentos já feitos.
- **Pacote** é opcional, e o agendamento é um pacote **ou** serviços avulsos (`packageId` ou `serviceIds`, exatamente um).
  - Os serviços do pacote entram em `AppointmentService`, na ordem de exibição, e a duração é a soma deles.
  - `totalPrice` = preço do pacote, rateado entre as linhas pelo `listPrice` (§10). Sem `listPrice` em nenhuma linha, o rateio é igual.
  - Só atende o profissional ligado ao pacote. Online, o pacote precisa estar agendável (§6); a equipe agenda qualquer pacote não removido.
  - A remarcação valida o horário com a duração gravada nas linhas, não com a dos serviços atuais.
- **Conflito de horário:** o mesmo profissional não pode ter dois agendamentos sobrepostos, ignorando cancelados, `no_show` e removidos.
  - O service checa antes de gravar.
  - A restrição `EXCL_appointments_professional_period` (`EXCLUDE USING gist`, com `btree_gist`) garante isso sob concorrência; a violação vira 409 `APPOINTMENT_SLOT_UNAVAILABLE`.
- Uma ausência não pode se sobrepor a agendamentos que ocupam a agenda (**validação no service**).
- O profissional, o cliente e o pacote de um agendamento devem ser do mesmo negócio (**validação no service**).

## 9. Pagamentos

- `Payment` pertence a um agendamento e a uma forma de pagamento. Tem `amount`, `status` (`pending`, `paid`, `failed`, `cancelled`, `refunded`) e `notes`.
- Registro manual (spec `2026-10-20-pagamentos.md`): o lançamento nasce `paid`; estornar (`paid → refunded`, valor inteiro devolvido) ou cancelar (`paid → cancelled`, lançamento por engano) são finais. `pending` e `failed` ficam para o pagamento online.
- Um agendamento pode ter vários pagamentos (sinal, saldo). O total recebido é a soma dos `paid` e não passa de `totalPrice`: a checagem trava o agendamento, então lançamentos simultâneos não estouram o total.
- Agendamento cancelado não recebe lançamento novo; `no_show` recebe (taxa de falta). Pagar não muda o status do agendamento.
- Permissões: as de alterar agendamentos para lançar, estornar e cancelar; qualquer membro vê. O agendamento da equipe traz `paidAmount`, `balance` e `paymentStatus` (`unpaid`, `partial`, `paid`).
- Pagamentos são registro financeiro: não têm soft delete, e o banco recusa apagar agendamento ou forma de pagamento que tenha pagamentos.

## 10. Comissão

Três níveis de taxa, do mais específico ao mais geral:

1. `ProfessionalService.commissionPercent`: exceção por serviço. Com `null`, usa o padrão do profissional.
2. `ProfessionalPackage.commissionPercent`: exceção por pacote (modo `package`). Com `null`, usa o padrão do profissional.
3. `Professional.commissionPercent`: padrão do profissional (0 a 100, default 0).

Resolver com `??`, nunca `||`, porque `0` é uma taxa válida.

O valor da comissão é copiado e fica fixo. Mudar uma taxa depois não altera comissões passadas.

**Modos de comissão para pacotes** (`Package.commissionMode`, copiado em `Appointment.commissionMode` na reserva):

| Modo | Base de cálculo | Onde fica o valor |
|---|---|---|
| `prorated` (padrão) | preço do pacote rateado entre os serviços, na proporção do preço de tabela; cada linha usa a taxa do seu serviço | `AppointmentService.commissionAmount` (e `Appointment.commissionAmount = 0`) |
| `package` | percentual único sobre o preço do pacote | `Appointment.commissionAmount` (e as linhas ficam com `0`) |

- Serviço avulso: comissão sobre o `price` da linha, com a taxa do serviço.
- **Cálculo:** `commissionAmount = price × commissionPercent / 100`, arredondado a 2 casas e calculado uma vez, na criação.
- **Rateio:** o preço do pacote é dividido pelas linhas proporcionalmente ao `listPrice`; o centavo que sobra vai para a maior parcela, para a soma bater exatamente com o preço do pacote.
- Comissão total do agendamento = `Appointment.commissionAmount` + soma de `AppointmentService.commissionAmount`, sem depender do modo.
- Comissão 0% não distingue salário fixo de "sem comissão". O sistema só calcula comissão. Salário e repasse ficam fora, e um controle de repasse pago é decisão futura.

## 11. Avaliações

- `Review` tem `type` (`business`, `professional`, `appointment`), `rating` (1 a 5), `comment` opcional e `status` (`published`, `hidden`).
- Consistência garantida por `@Check`: `business` não tem profissional nem agendamento; `professional` tem profissional e não tem agendamento; `appointment` tem agendamento.
- O cliente só avalia atendimento `completed` dele (tipo `appointment`), com conta e até 30 dias depois do `endAt`. Uma avaliação por agendamento (índice único), que ele pode editar. Os tipos `business` e `professional` não têm rota.
- `owner`/`admin` ocultam o comentário (`hidden`), sem tirar a nota da média, e escrevem uma resposta pública (`reply`, `repliedAt`). Editar o comentário não reabre uma avaliação oculta.
- Página pública: `/api/public/businesses/:slug/reviews` (só o primeiro nome do cliente; comentário oculto vem `null`) e `/ratings` (média com 1 casa e quantidade, do negócio e por profissional, contando as ocultas).
- Avisos: concluir o atendimento convida o cliente com conta a avaliar (e-mail e in-app, `appointment_completed`); avaliação nova avisa o profissional e os gestores só in-app (`review_received`). Edição não avisa.
- Para avaliações de agendamento, o agendamento deve ser do cliente e estar `completed` (**validação no service**).

## 12. Notificações

- `Notification` pertence a um usuário e pode ter negócio e agendamento relacionados.
- Tipos: `appointment_created`, `appointment_confirmed`, `appointment_rescheduled`, `appointment_cancelled`, `appointment_completed`, `appointment_reminder`, `payment_received`, `review_received`, `whatsapp_disconnected`, `general`.
- Status `unread` ou `read`, com `readAt`. O `@Check` garante: `unread` sem `readAt`, `read` com `readAt`. Marcar como lida atualiza os dois campos juntos.
- O usuário lê só as próprias notificações em `/api/me/notifications`, paginadas por cursor, com contagem de não lidas e marcação individual (idempotente) ou de todas.
- **Tempo real:** `GET /api/me/notifications/stream` (SSE) entrega cada notificação gravada para o usuário conectado, além de um `ping` a cada 25 s. Não há replay: o banco é a fonte da verdade. A distribuição é em memória e só alcança quem está conectado na mesma instância.
- **Avisos de agendamento** (spec `2026-10-20-notificacoes.md`): `appointments` emite eventos depois do commit, e `notifications` grava a notificação in-app e envia o e-mail.
  - O cliente recebe e-mail (no e-mail da conta ou, sem conta, no do cadastro). A notificação in-app só existe se ele tiver conta.
  - O profissional recebe in-app e e-mail. Os gestores (`owner`/`admin`) recebem só in-app, e só de agendamento online e de cancelamento feito pelo cliente.
  - Quem fez a ação não é avisado dela, exceto o cliente, que recebe o comprovante por e-mail.
  - Avisam: criação, remarcação (mudança de horário ou de profissional), `pending → confirmed` e cancelamento. `in_progress`, `completed` e `no_show` não avisam.
  - O motivo do cancelamento vai no aviso, para o cliente e para a equipe.
  - Com o WhatsApp do negócio conectado, o cliente também recebe os avisos por WhatsApp, inclusive o lembrete (§15).
- **Lembrete:** um job a cada 5 minutos avisa o cliente (e-mail e, com conta, in-app) dos agendamentos `confirmed` que começam dentro de `reminderHoursBefore`.
  - `appointments.reminderSentAt` marca o envio. A reivindicação é um `UPDATE ... WHERE "reminderSentAt" IS NULL`, seguro com várias instâncias.
  - Agendamento criado, confirmado ou remarcado já dentro da janela sai marcado, porque o aviso daquela ação já faz o papel do lembrete. Remarcar para fora da janela zera a marca.

## 13. Exclusão e integridade

- Entities com `deletedAt` (`SoftDeletableEntity`): usuário, negócio, categoria, serviço, pacote, membro, profissional, cliente, forma de pagamento e agendamento. As demais (junções, histórico, pagamentos, avaliações, notificações) são removidas fisicamente.
- `softDelete()` **não** aciona o `onDelete` nem remove os filhos. A propagação (por exemplo, ao remover um negócio) é feita no service, em transação, ou por `softRemove()` com `cascade: ['soft-remove', 'recover']` e relações carregadas.
- Índices únicos incluem registros removidos logicamente: um e-mail, `slug`, `taxId` ou par `(business, user)` removido continua ocupado. A forma de liberar é `restore()` ou um índice único parcial com `WHERE "deletedAt" IS NULL`.
- O banco recusa a exclusão física de quem tem histórico: profissional com agendamentos, serviço com agendamentos, forma de pagamento com pagamentos.
- Apagar fisicamente um negócio remove em cascata o que pertence a ele.

## 14. Convenções técnicas

- Classes base abstratas em `src/database/entities/base/` (`BaseEntity`, `SoftDeletableEntity`, `ImageBaseEntity`).
- Enums como objetos `as const` com tipo derivado, em `src/common/enums/`. Colunas de enum são `varchar`, para novos valores não exigirem migration.
- Valores monetários são `numeric` com `transformer` para `number`.
- Classes de entity terminam em `Entity`. O nome da tabela é declarado em cada uma (`@Entity('businesses')`), em snake_case e no plural.
- As colunas mantêm o nome do campo em camelCase (`createdAt`, `businessId`). Declare sempre o `type` do `@Column`, porque a CLI do TypeORM roda via `tsx` e não emite metadados de decorators.
- Os `@Check` usam os nomes de coluna e os valores literais dos enums. Mudar o nome de uma coluna ou um valor de enum exige revisar as constraints.
- **E-mail sai por fila** (BullMQ + Redis, spec `2026-10-20-fila-de-email.md`): o `MailDispatcher.dispatch` renderiza e enfileira a mensagem pronta, e o `MailProcessor` envia com limite de taxa (`MAIL_RATE_LIMIT_MAX` por `MAIL_RATE_LIMIT_DURATION_MS`) e até 5 tentativas com espera exponencial. O retry interno do `Mailer` fica desligado.

## 15. WhatsApp

- Cada negócio conecta o **próprio número** pelo Evolution API (Baileys, protocolo não oficial do WhatsApp Web). O número pode ser bloqueado pelo WhatsApp; por isso conectar exige `acceptTerms: true`, gravado em `termsAcceptedAt`.
- `BusinessWhatsAppConnection` (uma por negócio): `instanceName` (`business-<businessId>`), `status` (`disconnected`, `connecting`, `connected`), `phoneNumber` em E.164, `enabled`, `connectedAt` e `disconnectedAt`. Só `owner` e `admin` gerenciam.
- **Conexão:** o `POST` cria a instância (ou retoma uma existente) e devolve o QR code. O `GET` sincroniza o status com o Evolution e, enquanto `connecting`, devolve um QR novo. O `DELETE` encerra a sessão, apaga a instância e o registro. `enabled: false` pausa os envios sem desconectar.
- **Status por webhook:** o Evolution chama `POST /api/webhooks/evolution` com o header `x-webhook-secret` (`EVOLUTION_WEBHOOK_SECRET`). `open` grava `connected` e o número na hora. Uma queda só é confirmada se durar mais de 2 minutos: um job na fila `whatsapp-connection` consulta o Evolution e, se continuar fora, grava `disconnected` e avisa os gestores in-app (`whatsapp_disconnected`). Quedas rápidas se reconectam sozinhas e não geram alerta.
- **O que é enviado:** só para o cliente e só avisos de agendamento: criação, confirmação, remarcação, cancelamento e lembrete. O convite de avaliação não vai por WhatsApp. A equipe não recebe WhatsApp. O e-mail continua saindo, o que também cobre falhas do WhatsApp.
- **Para quem:** o telefone do cadastro do cliente ou, sem ele, o da conta. Cliente com `whatsappOptedOutAt` não recebe. O rodapé da mensagem diz que basta avisar; a resposta chega no WhatsApp do negócio, que marca o opt-out no cadastro.
- **Envio** (fila `whatsapp-message`):
  - Negócio sem conexão ou com `enabled: false` não enfileira nada.
  - Anti-bloqueio: cada negócio tem um próximo horário livre no Redis (`whatsapp:next-slot:<businessId>`). A primeira mensagem sai na hora; as seguintes, com intervalo aleatório entre `WHATSAPP_MIN_INTERVAL_MS` e `WHATSAPP_MAX_INTERVAL_MS` (8 a 20 s por padrão). Antes de enviar, o Evolution mostra "digitando…" por 1,5 a 3,5 s.
  - No envio, o processor confere de novo `enabled` e o status real no Evolution. Desconectado, a mensagem é descartada sem novas tentativas.
  - Evolution fora do ar: até 4 tentativas com espera exponencial a partir de 1 minuto. Erro 4xx (ex.: número sem WhatsApp) não é repetido.
- **Provider:** o resto do sistema só conhece `WhatsAppProvider` (`src/common/whatsapp/`). `EvolutionProvider` é a implementação atual; trocar pela API oficial do WhatsApp é trocar o provider no `AppModule`.
- O Evolution guarda só a sessão da instância (schema `evolution_api` do mesmo database); mensagens, contatos e conversas não são armazenados.

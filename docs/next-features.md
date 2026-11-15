# Próximos recursos

Recursos levantados depois de concluir o `docs/roadmap.md` (exceto a seção 14, de cobrança). Cada seção explica o problema, o que muda na API e no web, e um checklist. Mesmo combinado do roadmap: ao entregar um item, marque aqui no mesmo commit, e atualize o `docs/business-rules.md` quando criar ou mudar uma regra.

Ordem sugerida: 1, 2 e 3 primeiro (maior impacto), depois 4 a 6 (experiência do cliente), e 7 a 9 conforme o foco do produto.

## 1. Relatórios e comissões

**Problema:** a API já grava a comissão de cada linha e o `totalCommission` de cada agendamento, mas não há como somar por período. As perguntas mais comuns do dono ficam sem resposta: quanto pagar a cada profissional no mês e quanto entrou por forma de pagamento.

**Proposta:**
- API: endpoints de relatório por período (`from`/`to` no fuso do negócio), só `owner`/`admin`:
  - comissões por profissional: atendimentos concluídos, valor atendido e comissão;
  - recebimentos por forma de pagamento: pagamentos `paid`, descontando estornos e cancelamentos;
  - resumo: faturamento, ticket médio, faltas e cancelamentos.
- Definir na regra de negócio o que conta: só `completed`? Faltas e cancelados ficam de fora? Comissão sobre o atendido ou sobre o recebido?
- Web: página "Relatórios" no menu (gestores), com filtro de período, tabelas e exportação CSV.
- O `professional` vê só o próprio relatório de comissões.

**Checklist:**
- [ ] Regra de negócio: o que entra em faturamento e comissão (`docs/business-rules.md`)
- [ ] API: relatório de comissões por profissional
- [ ] API: relatório de recebimentos por forma de pagamento
- [ ] API: resumo do período (faturamento, ticket médio, faltas, cancelamentos)
- [ ] Web: página de relatórios com filtro de período
- [ ] Web: exportar CSV
- [ ] Web: profissional vê o próprio relatório

## 2. Exclusão de conta e termos (LGPD)

**Problema:** não existe rota para o usuário apagar a própria conta, nem páginas de termos de uso e política de privacidade. O sistema guarda nome, telefone e e-mail de clientes, então a LGPD se aplica. Lojas de apps e o Google OAuth em produção também exigem essas páginas.

**Proposta:**
- API: `DELETE /users/me`, com confirmação por senha (ou reautenticação em conta só-Google).
  - Anonimiza os dados pessoais em vez de apagar as linhas, para não quebrar o histórico dos negócios: agendamentos, pagamentos e avaliações continuam, sem nome nem contato.
  - Bloqueia se o usuário for o último `owner` de um negócio (transferir antes ou excluir o negócio).
  - Revoga as sessões.
- API: registrar o aceite dos termos (versão e data) no cadastro e no login com Google.
- Web: páginas públicas `/terms` e `/privacy` (os slugs já estão reservados).
- Web: em "Minha conta", uma zona de perigo com "Excluir minha conta".
- Web: checkbox de aceite no cadastro.

**Checklist:**
- [ ] Regra de negócio: o que é apagado, o que é anonimizado e o caso do último `owner`
- [ ] API: `DELETE /users/me` com anonimização e revogação das sessões
- [ ] API: aceite dos termos (versão e data) no cadastro e no Google
- [ ] Web: páginas `/terms` e `/privacy`
- [ ] Web: excluir conta em "Minha conta"
- [ ] Web: aceite dos termos no cadastro

## 3. Prévia do link da página pública

**Problema:** o dono divulga `seusite/slug` no WhatsApp e no Instagram, mas o web é uma SPA e o `index.html` não tem metas `og:`. O link aparece sem nome, foto nem descrição do negócio.

**Proposta:**
- Servir para os robôs de prévia (WhatsApp, Facebook, X, Telegram etc.) um HTML com `og:title`, `og:description`, `og:image` (capa ou logo) e `og:url` do negócio.
- Opções, da mais simples para a mais completa:
  - rota na API (`GET /og/:slug`), com o proxy mandando os user agents de robô para ela;
  - o proxy injeta as metas no `index.html` antes de servir.
- Metas padrão da plataforma no `index.html` para as demais páginas.

**Checklist:**
- [ ] Decidir a estratégia (rota na API + regra no proxy ou injeção no proxy)
- [ ] Metas `og:` padrão no `index.html`
- [ ] HTML com as metas do negócio para os robôs
- [ ] Testar a prévia no WhatsApp e no Facebook (debugger de compartilhamento)

## 4. Remarcar online pelo cliente

**Problema:** o cliente só consegue cancelar. Para mudar de horário, cancela e agenda de novo, e pode perder o horário no meio do caminho.

**Proposta:**
- API: `POST /me/appointments/:id/reschedule` com o novo `startAt` (e o profissional, opcional). Só `pending`/`confirmed`, dentro do mesmo prazo do cancelamento (`cancellationLimitHours`), e o horário novo precisa estar na disponibilidade pública. É atômico: o horário antigo só é liberado se o novo for reservado.
- A resposta de "meus agendamentos" ganha `reschedulableUntil` (ou reaproveita o `cancellableUntil`).
- Notificar o negócio da remarcação.
- Web: botão "Remarcar" no card de "Meus agendamentos", abrindo a escolha de dia e horário (reaproveita `DayPicker` e `SlotPicker` da página de agendamento).

**Checklist:**
- [ ] Regra de negócio: prazo e limites da remarcação pelo cliente
- [ ] API: rota de remarcação, atômica e validada pela disponibilidade pública
- [ ] API: notificação ao negócio
- [ ] Web: remarcar em "Meus agendamentos"

## 5. Notificações para o cliente no layout público

**Problema:** a API já envia notificações in-app ao cliente (confirmação, cancelamento pela equipe, convite para avaliar), e o SSE existe, mas o layout público não mostra o sino.

**Proposta:**
- Web: incluir o `NotificationBell` no cabeçalho do layout público quando houver usuário logado.
- Conferir se os links das notificações ao cliente abrem `/me/appointments/:id`.

**Checklist:**
- [ ] Web: sino de notificações no layout público
- [ ] Conferir os links das notificações do cliente

## 6. Adicionar ao calendário

**Problema:** o cliente marca e esquece. Levar o agendamento para a agenda do celular reduz faltas.

**Proposta:**
- API: `GET /me/appointments/:id/calendar.ics` (e um link equivalente no e-mail de confirmação), com local, serviços e o horário no fuso certo.
- Web: botão "Adicionar ao calendário" no card do agendamento e na tela de sucesso, com as opções Google Calendar (link) e `.ics` (Apple, Outlook).
- Ao cancelar ou remarcar, o `.ics` novo usa o mesmo `UID`, para atualizar o evento.

**Checklist:**
- [ ] API: gerar o `.ics` do agendamento
- [ ] API: link no e-mail de confirmação
- [ ] Web: "Adicionar ao calendário" (Google e `.ics`)

## 7. Verificação de telefone

**Problema:** o usuário tem `phoneVerifiedAt`, mas não existe fluxo para verificar o número. Só vale a pena se o telefone virar requisito (por exemplo, para receber lembretes por WhatsApp).

**Proposta:**
- API: enviar um código por WhatsApp (ou SMS) e confirmar, com limite de tentativas.
- Web: verificar em "Minha conta" e, se for requisito, no fluxo de agendamento.

**Checklist:**
- [ ] Decidir se o telefone verificado vira requisito, e para quê
- [ ] API: enviar e confirmar o código, com limite de tentativas
- [ ] Web: verificar telefone em "Minha conta"

## 8. Autonomia do profissional

**Problema:** o profissional depende do dono para registrar as próprias ausências e não vê o próprio desempenho.

**Proposta:**
- API: permitir ao `professional` criar, editar e excluir as próprias ausências (mesmas validações de hoje).
- Web: área "Minha agenda" com as ausências e o resumo dele (atendimentos, nota, comissão; depende do item 1).

**Checklist:**
- [ ] Regra de negócio: o que o profissional pode alterar sozinho
- [ ] API: ausências do próprio profissional
- [ ] Web: "Minha agenda" com ausências e resumo

## 9. Qualidade e manutenção

**Problema:** a maior parte das features não tem teste, e nada roda `tsc`, lint e build a cada push. Mudanças grandes podem quebrar algo sem ninguém perceber.

**Proposta:**
- CI (GitHub Actions) em todo push e PR: `tsc`, lint e build da API e do web.
- Testes nas regras mais sensíveis, escolhidas uma a uma: disponibilidade, transições de status, prazo de cancelamento, bloqueio de cliente, preço e comissão.
- E2E dos fluxos principais: login, agendar online, cancelar.

**Checklist:**
- [ ] CI com `tsc`, lint e build (API e web)
- [ ] Escolher as regras que ganham testes primeiro
- [ ] Testes de disponibilidade e status
- [ ] E2E: agendar online e cancelar

## Pendências pequenas

- [ ] Validar slugs reservados também na API (hoje a validação existe só no front)
- [ ] Redirecionar `/b/:id/agenda` para `/b/:id/appointments` (links antigos)
- [ ] Assinatura e cobrança: seção 14 do `docs/roadmap.md`, quando o gateway entrar

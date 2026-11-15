# Roadmap do web

Checklist das telas do `apps/web`, na ordem sugerida. Cada item marcado foi entregue (commit na `main`). Ao terminar um item, marque aqui no mesmo commit.

Antes de cada item: ler a seção de `docs/business-rules.md` e o contrato no Swagger (`/api/docs`).

## Já entregue

- [x] Autenticação: login, cadastro, Google, esqueci/redefinir senha, e-mail verificado
- [x] Criar negócio (fluxo em etapas, com CEP) e boas-vindas
- [x] Trocar de negócio (`business-switcher`) e card do período de teste
- [x] Configurações como submenu, uma rota por seção: horário, agendamento e pagamento (`/settings/:section`)
- [x] Catálogo: serviços, pacotes e categorias (imagens, ordenação, texto alternativo)
- [x] Profissionais: adicionar a partir de um membro, perfil, foto, comissão, serviços/pacotes e expediente
- [x] Campos de endereço reutilizáveis (`AddressFields`)

## Pendências transversais

- [x] Fuso horário do negócio: `businessQueries.detail` (carregado no layout do negócio) e `useBusinessTimezone`; datas com `TZDate` de `@date-fns/tz`. Ausências já usam.

## 1. Fechar profissionais

- [x] Ausências do profissional (férias, consultas): listar, criar, editar, excluir (`/professionals/:id/time-offs`). Não podem sobrepor outra ausência nem agendamentos ativos.
- [x] Especialidades: CRUD do negócio (`/specialties`) e atribuição ao profissional (`PUT /professionals/:id/specialties`)

## 2. Equipe (membros e convites)

Sem isso, só o dono consegue virar profissional.

- [x] Lista de membros com papel e status; mudar papel, suspender/reativar, remover (`/members`). Só `owner` mexe em `owner`.
- [x] Convites: enviar, reenviar, cancelar, listar pendentes (`/invitations`). Bloqueado com `SUBSCRIPTION_RESTRICTED`.
- [x] Página pública `accept-invitation?token=...`: consultar, aceitar e recusar (`/api/invitations/lookup|accept|decline`). Exige estar logado com o e-mail do convite.

## 3. Clientes

- [x] Lista com busca e paginação (`/customers`)
- [x] Criar/editar cadastro de balcão; tratar `CUSTOMER_POSSIBLE_DUPLICATE` com opção de gravar mesmo assim
- [x] Detalhe do cliente: dados, faltas (`noShowCount`), bloqueio vigente
- [x] Histórico de agendamentos no detalhe do cliente (`GET /customers/:id/appointments`), visível para qualquer membro
- [x] Possíveis duplicados (`/customers/possible-duplicates`)
- [x] Excluir cliente

## 4. Agenda (agendamentos pela equipe)

Fecha a última etapa de ativação (primeiro agendamento concede o bônus de 7 dias).

- [x] Calendário: Dia (coluna por profissional), Semana e Mês, filtros na URL, lista no celular (`GET /appointments`)
- [x] Detalhe do agendamento com histórico de status (painel lateral, `?appointment=`)
- [x] Mudar status: confirmar, iniciar, concluir, falta, cancelar com motivo (`POST /appointments/:id/status`)
- [x] Profissional (`professional`) vê e gerencia só os próprios agendamentos (filtro na tela; a API ainda devolve todos)
- [x] Novo agendamento: cliente, serviços **ou** pacote, profissional e horário pela disponibilidade da equipe (`/availability`); tratar `APPOINTMENT_SLOT_UNAVAILABLE`. Também clicando num horário vazio da grade
- [x] Kanban do dia por status (visão "Quadro"), com arrastar para mudar o status
- [x] Remarcar horário/profissional e editar observações (`PATCH`), inclusive arrastando na grade com validação
- [x] Trocar serviços (`PUT /appointments/:id/services`); não vale para pacote
- [x] Destacar horários livres na grade (visão Dia)

## 5. Pagamentos

- [x] Formas de pagamento do negócio em Configurações (`/payment-methods`)
- [x] Registrar pagamento no agendamento, saldo e `paymentStatus` (`/appointments/:id/payments`)
- [x] Estornar e cancelar lançamento

## 6. Bloqueio de clientes

- [x] Bloquear (temporário ou por taxa), desbloquear e registrar taxa paga (`/customers/:id/block`)
- [x] Taxa de desbloqueio (`unblockFee`) já existe nas regras de agendamento: conferir o aviso quando for 0

## 7. Dados do negócio

Vira a primeira página do submenu Configurações (`/settings/business`), e o índice `/settings` passa a redirecionar para ela.

- [x] Dados cadastrais: nome, slug, descrição, contato, endereço e fuso horário (`PATCH /businesses/:id`, usando `AddressFields`)
- [x] Logo (`PUT/DELETE /businesses/:id/logo`)
- [x] Galeria de fotos do negócio (`/businesses/:id/images`), com escolha da capa

## 8. Início (dashboard)

- [x] Checklist de ativação completo (`activation.steps`) com links para cada etapa
- [x] Resumo do dia: próximos agendamentos, recebido, pendentes de confirmação (feature `dashboard`)

## 9. Notificações

- [x] Sino com contador (`/me/notifications/unread-count`) e lista
- [x] Tempo real via SSE (`/me/notifications/stream`)
- [x] Marcar como lida / todas lidas

## 10. Avaliações (gestão)

- [x] Lista de avaliações do negócio (`/reviews`)
- [x] Ocultar comentário e responder (`PATCH`, `PUT/DELETE /reply`)

## 11. WhatsApp

- [x] Conectar por QR code com polling enquanto `connecting` (`/whatsapp`)
- [x] Pausar envio e desconectar

## 12. Conta do usuário

- [x] Perfil: nome e foto (`PATCH /users/me`, `PUT/DELETE /users/me/photo`)
- [x] Trocar senha / criar senha em conta só-Google (`/auth/change-password`)
- [x] Reenviar verificação de e-mail (`/auth/verify-email/resend`)

## 13. Área pública e do cliente

- [x] Página pública do negócio (`/public/businesses/:slug`): dados, catálogo, profissionais, avaliações e notas
- [x] Agendamento online pela disponibilidade pública; esconder com `onlineBookingAvailable: false`; tratar `EMAIL_NOT_VERIFIED`, `CUSTOMER_BLOCKED`, `SUBSCRIPTION_RESTRICTED`
- [x] Meus agendamentos e cancelamento (`cancellableUntil`, `CANCELLATION_WINDOW_CLOSED`)
- [x] Avaliar agendamento concluído (até 30 dias)

## 14. Assinatura (quando a cobrança entrar)

- [ ] Tela da assinatura (só `owner`) com valor por profissional extra
- [ ] Aviso de novo valor ao adicionar profissional
- [ ] Estado `restricted`: banners e ações bloqueadas

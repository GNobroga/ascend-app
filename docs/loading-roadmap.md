# Carregamento sem travar a navegação

Hoje quase todo loader faz `await` das queries da página. O React Router só troca de tela quando todas terminam, então numa requisição lenta o usuário continua vendo a página anterior, só com a barra fina do `RootLayout`, e parece que o clique não funcionou.

O objetivo é trocar de tela na hora e mostrar skeletons enquanto os dados chegam, sem perder a vantagem do loader: a requisição começa na navegação, em paralelo com o download do chunk `lazy` da página.

Mesmo combinado do `docs/roadmap.md`: ao entregar um item, marque aqui no mesmo commit.

## Padrão

**No loader, `await` só para:**
- guarda de acesso e redirect (`authenticatedLoader`, `requireBusinessManager`, `requireManager`);
- dados que decidem um redirect (`CUSTOMER_NOT_FOUND`, `PROFESSIONAL_NOT_FOUND`, `scope=past` em meus agendamentos);
- dados que montam a estrutura da tela e já costumam estar no cache (`businessQueries.mine()`, `businessQueries.detail()`, `userQueries.me()`).

**O resto:** `prefetch(queryClient.query(...))` (ou `queryClient.infiniteQuery(...)` para listas infinitas), de `@/app/query-client`. O `prefetch` dispara sem esperar e engole a rejeição; o erro aparece depois no componente.

**Na página:** o cabeçalho aparece na hora e cada bloco que depende de dado não esperado fica dentro do próprio `<QueryBoundary fallback={<...Skeleton />}>` (`@/shared/components/query-boundary`) e lê com `useSuspenseQuery`. Um boundary por bloco (tabela, card, aba), não um para a página inteira. Sem boundary, o componente suspende dentro da transição da navegação e a tela antiga continua lá, ou seja, o mesmo comportamento de hoje.

Blocos que já tratam `isPending`/`isError` com `useQuery` (dashboard, WhatsApp, listas com filtro) podem continuar assim, mostrando o skeleton em `isPending`.

## 0. Base

- [x] Componente `Skeleton` em `packages/ui` (padrão shadcn), com story
- [x] Skeletons reutilizáveis em `packages/ui/components/skeletons`: `ListSkeleton`, `CardGridSkeleton`, `FormSkeleton` e `BlockSkeleton`
- [x] Erro por bloco: `QueryBoundary` (`Suspense` + `react-error-boundary` + `QueryErrorResetBoundary`) com botão "Tentar de novo", para um bloco que falha não derrubar a página inteira no `RouteErrorBoundary`
- [x] `void queryClient.query(...)` rejeitado gera `unhandledrejection` (o `query` rejeita e o `prefetchQuery` está depreciado): disparos sem `await` passam pelo helper `prefetch`
- [x] Filtros e paginação na mesma rota: `useQuery` com `placeholderData: keepPreviousData` e opacidade enquanto `isPlaceholderData`, como a lista de clientes; skeleton só no primeiro carregamento (`isPending`)

## 1. Clientes

- [x] Lista (`customersLoader`): `prefetch` na lista, skeleton nas linhas; busca e paginação seguem o item de filtros da base
- [x] Possíveis duplicados (`possibleDuplicatesLoader`): `prefetch` e skeleton dos grupos
- [x] Detalhe (`customerLoader`): manter `await` no `detail` (redirect em `CUSTOMER_NOT_FOUND`); histórico de agendamentos com skeleton próprio

## 2. Agenda

- [x] `agendaLoader`: manter `await` em `businessQueries.detail` (fuso para o intervalo), `hours`, `professionals.list` e `members` (estrutura da grade e qual profissional é o usuário)
- [x] `prefetch` na lista de agendamentos, com skeleton no lugar da grade até a primeira resposta (Dia, Semana, Mês, Quadro e lista do celular)
- [x] `prefetch` em `catalogQueries.services` e `catalogQueries.packages`; o formulário de novo agendamento espera com skeleton próprio (o painel de detalhe já tratava `isPending`)

## 3. Catálogo

- [x] Serviços (`servicesLoader`): `prefetch` e skeleton da lista
- [x] Pacotes (`packagesLoader`): `prefetch` e skeleton da lista
- [x] Categorias (`categoriesLoader`): `prefetch` e skeleton da lista

## 4. Profissionais

- [x] Lista (`professionalsLoader`): manter a guarda; `prefetch` na lista e nos membros, skeleton das linhas
- [x] Detalhe (`professionalLoader`): manter `await` no `detail` (redirect em `PROFESSIONAL_NOT_FOUND`); `prefetch` em expediente, ausências, especialidades, horário do negócio, serviços e pacotes, com skeleton por aba

## 5. Equipe

- [x] `teamLoader`: manter a guarda; `prefetch` em membros e convites; skeleton nos membros (os convites não ocupam espaço até chegar, porque somem quando não há nenhum)
- [x] Aceitar convite (`acceptInvitationLoader`): `prefetch` no usuário e no convite, skeleton do cartão no lugar do loader

## 6. Configurações

- [x] Dados do negócio (`businessDetailsLoader`): `prefetch` em imagens e redes sociais, skeleton nas redes sociais (a galeria já tratava `isPending`; o `detail` vem do layout)
- [x] Horário (`hoursSettingsLoader`): `prefetch` e skeleton do formulário
- [x] Agendamento (`bookingSettingsLoader`): `prefetch` e skeleton do formulário
- [x] Pagamento (`paymentSettingsLoader`): `prefetch` e skeleton da lista de formas
- [x] WhatsApp (`whatsappSettingsLoader`): já dispara sem `await`

## 7. Avaliações

- [x] `reviewsLoader`: `prefetch(queryClient.infiniteQuery(...))`, skeleton da lista no primeiro carregamento

## 8. Início (dashboard)

- [x] Blocos secundários sem `await` (resumo, série, ocupação, mapa de calor, rankings)
- [x] Rever o `await` de `members` e `professionals.list`: `members` (não usado na página) vira `prefetch`; `professionals.list` continua esperado porque monta o filtro de profissional

## 9. Área pública e do cliente

- [x] Página pública (`storefrontLoader`): só espera o negócio
- [x] Agendamento online (`bookingLoader`): manter `await` em `me` (redirect para login) e no negócio (404); `prefetch` em catálogo e profissionais, skeleton do formulário
- [x] Meus agendamentos (`myAppointmentsLoader`): manter `await` só quando há `appointmentId` sem `scope` (decide o redirect para `scope=past`); nos outros casos, `prefetch` e skeleton da lista, também ao trocar de aba
- [x] `prefetchQuery`/`prefetchInfiniteQuery` (depreciados) da página pública e do WhatsApp trocados pelo `prefetch`

## Fica como está

Loaders de guarda e redirect, que precisam terminar antes de decidir a rota: `authenticatedLoader`, `authLayoutLoader`, `homeLoader`, `businessIndexLoader`, `businessLayoutLoader`, `settingsIndexLoader` e `catalogIndexLoader`.

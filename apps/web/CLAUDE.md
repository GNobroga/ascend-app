# Web

React 19 (com React Compiler) + Vite 8 + TypeScript, pnpm. UI vem do `@packages/ui` (shadcn sobre Base UI + Tailwind 4). Consome a API NestJS de `apps/api`.

## Forma de trabalhar

- **Não escreva spec nem plano para coisas simples.** Nova página, componente, query ou form seguindo o padrão abaixo é feito direto: no máximo um resumo curto do que vai fazer.
- Responda em português.
- **Só escreva testes nas features que eu pedir explicitamente. Nunca crie testes por conta própria**, nem em outras features "aproveitando". Se achar que um teste vale a pena, pergunte antes.
- **Não adicione comentários no código.** O código deve se explicar por nomes claros.
- **Antes de construir uma tela ou fluxo, leia a seção correspondente de `docs/business-rules.md`** (raiz do monorepo): permissões por papel, status, prazos, erros esperados e o que mostrar em cada caso. O contrato exato de cada rota está no Swagger da API (`/api/docs`).

## UI: `@packages/ui`

O design system fica no pacote compartilhado `packages/ui` (shadcn, style `base-rhea`, sobre Base UI + Tailwind 4, ícones `lucide-react`). O app só consome.

- **Componentes do shadcn são instalados no `packages/ui`, nunca no `apps/web`.** Rode o CLI de dentro de `packages/ui` (é lá que está o `components.json`): `pnpm dlx shadcn@latest add <componente>`. Eles caem em `packages/ui/src/components/ui/`.
- Importe pelos exports do pacote:
  - `@packages/ui/components/<nome>` (ex.: `@packages/ui/components/button`)
  - `@packages/ui/hooks/<nome>`
  - `@packages/ui/lib/<nome>` (ex.: `cn` em `@packages/ui/lib/utils`)
  - `@packages/ui/globals.css` (tema e tokens)
- Componente genérico e reutilizável (sem regra de negócio) também vai para o `packages/ui`. Componente que conhece domínio (ex.: `business-card`) fica na feature, em `features/<nome>/components/`; compartilhado entre features e com domínio, em `shared/components/`.
- Não sobrescreva estilos do shadcn no app; ajuste tema/variantes no `packages/ui`.

## Comandos

- `pnpm dev`, `pnpm build` (roda `tsc -b` antes do build), `pnpm lint`, `pnpm preview`, `pnpm test`, `pnpm test:watch`, `pnpm test:e2e`, `pnpm test:e2e:ui`
- Da raiz do monorepo: `pnpm web:dev`, `pnpm web:build`, `pnpm web:lint`, `pnpm web:test`, `pnpm web:test:e2e`

## Testes

- Vitest (ambiente `jsdom`, `globals: true`) + Testing Library (`@testing-library/react`, `@testing-library/user-event`, matchers do `@testing-library/jest-dom`). Config no bloco `test` do `vite.config.ts`, setup em `vitest.setup.ts`.
- **Testes só nas features que eu pedir.** Nunca escreva testes por iniciativa própria.
- Arquivos `*.test.ts(x)` ao lado do arquivo testado.
- Prefira queries por papel/texto acessível (`getByRole`, `getByLabelText`) e `userEvent` em vez de `fireEvent`.
- E2E com Playwright: config em `playwright.config.ts`, testes em `e2e/*.spec.ts`. O `webServer` sobe o Vite (ou reaproveita o que já estiver rodando); a API precisa estar no ar (`pnpm infra:up` + `pnpm api:dev`). `E2E_BASE_URL` sobrescreve a URL base. Mesma regra: só nas features que eu pedir.
- Locators do Playwright também por papel/texto (`page.getByRole`, `page.getByLabel`), nunca seletores CSS de classe.

## Stack

| Responsabilidade | Lib |
|---|---|
| Rotas (data mode: `createBrowserRouter` + loaders) | `react-router` (nunca `react-router-dom`) |
| Estado do servidor, cache, mutations | `@tanstack/react-query` |
| HTTP | `axios`, só pelo `api` de `@/shared/api/http` (a instância `http` fica para quando precisar da resposta inteira) |
| Forms | `react-hook-form` + `@hookform/resolvers/zod` + componentes `Form` do shadcn |
| Validação | `zod` |
| Estado na URL (filtros, página, abas) | `nuqs` |
| Erros fora de rota | `react-error-boundary` |
| Datas | `date-fns` (locale `ptBR` de `date-fns/locale`) |

Não usar: Redux, `useEffect` para buscar dados, estado global para dado do servidor. Estado de UI local é `useState`; só considere uma store global se surgir estado de cliente realmente compartilhado.

## Arquitetura

Organização por feature, espelhando as features da API (`auth`, `businesses`, `catalog`, `appointments`, `customers`, `professionals`, `reviews`, `notifications`, `users`).

```
src/
  main.tsx
  app/
    router.tsx          createBrowserRouter; junta as rotas exportadas pelas features
    providers.tsx       QueryClientProvider, NuqsAdapter, RouterProvider, Toaster
    query-client.ts     instância única do QueryClient (usada por loaders e provider)
    layouts/            root-layout, auth-layout, app-layout (protegido)
    errors/             route-error-boundary, not-found
  features/
    <nome>/
      api/
        <nome>.api.ts         chamadas HTTP tipadas (usam `api`, que já devolve o `data`)
        <nome>.queries.ts     query key factory + queryOptions/infiniteQueryOptions
        <nome>.mutations.ts   hooks useMutation (com invalidação/setQueryData)
      components/
      pages/                  componentes de rota + seus loaders
      schemas.ts              schemas zod dos forms
      search-params.ts        parsers do nuqs (compartilhados por loader e componente)
      types.ts
      routes.tsx              RouteObject[] da feature (com `lazy`)
      index.ts                API pública da feature
  shared/
    api/
      http.ts               instância axios + interceptors + atalhos `api.get/post/put/patch/delete`
      api-error.ts          classe ApiError e helpers
      types.ts              ApiResponse<T>, PaginationMeta, CursorPaginationMeta
    forms/
      apply-api-errors.ts   mapeia `details[].path` da API para `form.setError`
    components/  hooks/  lib/
    env.ts                  `import.meta.env` validado com zod
```

### Fronteiras

- Fora da própria feature, importe só pelo `index.ts` dela (`@/features/<nome>`), nunca arquivos internos.
- `shared/` não importa de `features/` nem de `app/`.
- Dentro da feature, imports relativos; para sair dela, alias `@/`.
- `axios` é importado só em `shared/api/http.ts`.

### Onde registrar

- **Feature nova:** exporte `<nome>Routes` no `index.ts` dela e espalhe em `app/router.tsx`, dentro do layout certo (público em `auth-layout`, autenticado em `app-layout`).
- **Variável de ambiente nova:** adicione no schema de `shared/env.ts` (prefixo `VITE_`). Nunca leia `import.meta.env` direto no resto do código.

## Dados: loaders + TanStack Query

O loader **não guarda dado**: só garante que ele esteja no cache. O componente lê do cache com a **mesma** `queryOptions`.

```ts
export const businessQueries = {
  all: () => ['businesses'] as const,
  detail: (id: string) =>
    queryOptions({
      queryKey: [...businessQueries.all(), id],
      queryFn: () => businessesApi.getById(id),
    }),
};

export const businessLoader = ({ params }: LoaderFunctionArgs) =>
  queryClient.ensureQueryData(businessQueries.detail(params.id!));

export function BusinessPage() {
  const { id } = useParams();
  const { data } = useSuspenseQuery(businessQueries.detail(id!));
}
```

- Query keys sempre pela factory da feature (`<nome>Queries`); nunca arrays soltos no componente.
- Dado crítico da página: `await ensureQueryData` no loader. Dado secundário: `prefetchQuery` sem `await` + `<Suspense>` no componente.
- **Mutations são `useMutation`, não `action` do React Router.** Após sucesso, `invalidateQueries` (ou `setQueryData` quando a resposta já traz o dado novo).
- Rotas usam `lazy` para dividir o bundle por página, com exports nomeados (`{ Component, loader }`).
- `QueryClient`: `staleTime` ~30s; sem retry em 4xx; erro de mutation não tratado vira toast global via `MutationCache.onError`; devtools só em dev.

## Listas, filtros e paginação

- Parsers do nuqs definidos uma vez em `search-params.ts`.
- Loader lê com `createLoader(parsers)(request)` e chama `ensureQueryData(<nome>Queries.list(filters))`; o componente usa `useQueryStates(parsers)`. A query key é a mesma nos dois.
- Paginação por página (`meta: { page, pageSize, total, totalPages }`): `placeholderData: keepPreviousData`.
- Paginação por cursor (`meta: { limit, nextCursor, hasMore }`): `infiniteQueryOptions`.

## Contrato com a API

- Todas as rotas da API ficam em `/api/*`. Em dev o Vite faz proxy de `/api` para a API, mantendo front e back na mesma origem (cookies funcionam sem `SameSite=None`). Em produção, o reverse proxy faz o mesmo.
- Sucesso: `{ data, meta? }`. O interceptor desembrulha `data`; listas paginadas mantêm `meta`.
- Erro: `{ error: { statusCode, code, message, details?: [{ path, message }] } }`. O interceptor converte em `ApiError`; trate pelo `code` (ver `apps/api/src/common/errors/error-code.enum.ts`), nunca pela `message`.
- Tipos de request/response escritos à mão em `<nome>.api.ts`, espelhando os DTOs da API.

## Autenticação

- Sessão em cookies httpOnly (`access_token`, `refresh_token`); o front nunca lê nem guarda token. `http` usa `withCredentials: true`.
- Usuário logado: `meQuery` (`GET /api/users/me`) é a fonte da verdade. Login/register fazem `setQueryData` dela; logout faz `queryClient.clear()`.
- Refresh: em 401 com `code === 'UNAUTHENTICATED'`, o interceptor chama `POST /api/auth/refresh` uma única vez (requests concorrentes aguardam a mesma promise) e repete o request. Se o refresh falhar, limpa o cache e redireciona para `/login?redirectTo=…`. Outros 401 (ex.: `INVALID_CREDENTIALS`) não disparam refresh.
- `app-layout` protege as rotas: loader faz `ensureQueryData(meQuery)` e redireciona para o login em 401. `auth-layout` redireciona usuário já logado para a área autenticada.

## Forms

- Schema zod em `schemas.ts`, `useForm({ resolver: zodResolver(schema) })`, componentes `Form` do shadcn.
- No `onError` da mutation: `applyApiErrors(form, error)` mapeia `VALIDATION_ERROR` para os campos; demais `code` viram mensagem no topo do form.

## Erros e carregamento

- `errorElement` na raiz e em cada layout para erro de loader/render de rota.
- `react-error-boundary` + `QueryErrorResetBoundary` para seções isoladas dentro de uma página.
- Indicador global de navegação no `root-layout` via `useNavigation()`.

## Convenções de código

- **Sem export default** (exceto arquivos `*.config.ts` e o `meta` de `*.stories.tsx`). Sempre exports nomeados.
- Arquivos em kebab-case (`business-card.tsx`, `businesses.queries.ts`).
- `type` em vez de `interface`; `import type` para imports só de tipo.
- Sem `any`; evite non-null assertion (`!`) fora de params de rota garantidos.
- `<button>` sempre com `type` explícito.
- As regras de lint estão em `.oxlintrc.json`; rode `pnpm lint` antes de concluir.

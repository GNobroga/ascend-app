# API

NestJS 12 + TypeORM (Postgres), ESM (`nodenext`), pnpm. O `.env` fica em `apps/api/.env` (modelo em `apps/api/.env.example`).

## Forma de trabalhar

- **Não escreva spec nem plano para coisas simples.** Mudanças pequenas e localizadas (novo endpoint, campo, fix, nova feature seguindo o padrão abaixo) são feitas direto: no máximo um resumo curto do que vai fazer.
- Escreva spec (`docs/superpowers/specs/`) só quando a mudança for realmente arquitetural: nova decisão estrutural, mudança de interface que outras partes dependem, ou algo com trade-offs que valha registrar. Em dúvida, pergunte em uma linha em vez de escrever o documento.
- Responda em português.
- **Jamais escreva testes (unitários ou e2e) sem permissão explícita.** Se achar que um teste vale a pena, pergunte antes.
- **Regras de negócio** ficam documentadas em `docs/business-rules.md` (raiz do monorepo), usado como referência pelo frontend. Mudou ou criou uma regra de negócio? Atualize o documento no mesmo passo.
- **Não saia adicionando comentários no código.** O código deve se explicar por nomes claros. Comente só quando houver um porquê não óbvio (workaround, restrição externa, decisão contraintuitiva), e nunca para narrar o que o código faz.

## Comandos

- `pnpm start:dev`, `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`
- Migrations (rodar de dentro de `apps/api`):
  - `pnpm migration:generate src/database/migrations/<Nome>`
  - `pnpm migration:run` / `pnpm migration:revert`
  - Produção (após `pnpm build`, sem tsx): `pnpm migration:run:prod`

## Variáveis de ambiente

- Toda leitura de env passa por `src/config/env.config.ts` (`env` tipado e validado com `class-validator`). **Nunca use `process.env` direto** no resto do código.
- Variável nova: adicione na classe `EnvConfig` com validação (e default, se fizer sentido).

## Arquitetura

Um único `AppModule`; não criar módulos Nest por feature. Ele só junta duas listas: a infraestrutura (`app.infrastructure.ts`) e as features (`features/index.ts`). Organização por feature:

```
src/
  config/              env e validação
  database/
    typeorm.config.ts  dataSourceOptions (usado pelo Nest e pela CLI)
    data-source.ts     DataSource para a CLI do TypeORM
    entities/          TODAS as entities (*.entity.ts)
      index.ts                  array `entities`, registrado no `TypeOrmModule.forFeature`
      base/                     classes base abstratas (não são entities)
        base.entity.ts            BaseEntity: id (uuid), createdAt, updatedAt
        soft-deletable.entity.ts  SoftDeletableEntity: BaseEntity + deletedAt
        image-base.entity.ts      ImageBaseEntity: BaseEntity + url, altText, displayOrder
    migrations/
  common/              filters, guards, decorators, pipes, base classes
    utilities/         funções puras reaproveitáveis (sem DI); nunca dentro de services/
  features/
    index.ts           agrega imports, controllers e providers de todas as features
    <nome>/
      <nome>.controller.ts
      <nome>.service.ts
      <nome>.repository.ts
      dto/
      index.ts         API pública da feature + `<nome>Controllers` e `<nome>Providers`
  app.infrastructure.ts  imports e providers globais: logger, TypeORM, JWT, mail, Bull, schedule, eventos, throttler, pipe/filter/guards, storage, provider de WhatsApp
  app.module.ts        só junta `app.infrastructure.ts` e `features/index.ts`
```

### Onde registrar

- **Entity nova:** adicione no array `entities` de `database/entities/index.ts`.
- **Feature nova:** exporte `<nome>Controllers` e `<nome>Providers` no `index.ts` dela e espalhe nas listas de `features/index.ts`. Fila BullMQ da feature: `BullModule.registerQueue(...)` em `featureImports`.
- **Infraestrutura global** (módulo `forRoot`, provider de `common/`, `APP_*`): `app.infrastructure.ts`.
- O `app.module.ts` não muda.

### Regras

1. Entities ficam centralizadas em `src/database/entities/`, porque as relações cruzam features. Em relações use `() => Entity` para evitar ciclos.
2. Uma feature só acessa outra pelo `index.ts` dela (service e tipos), nunca por arquivos internos nem pelo repository.
3. O repository é privado da feature dona. Precisa de dados de outra feature? Chame o service dela.
4. Dependência em direção única: features de base não importam as de topo. Dependência mútua real → service de orquestração separado ou eventos (`@nestjs/event-emitter`).
5. Repository começa fino (`@InjectRepository`). Feature CRUD puro pode usar `Repository<T>` direto no service até surgirem queries relevantes.
6. Evitar ciclos de import (`import/no-cycle` no lint).
7. Toda entity estende `BaseEntity`; as que precisam de exclusão lógica estendem `SoftDeletableEntity` (use `softDelete()` / `restore()`; `find*` já ignora deletados, `withDeleted: true` inclui). Não declare `id`, `createdAt` ou `updatedAt` nas entities concretas. Atenção: `BaseEntity` do projeto não é a do TypeORM; importe de `src/database/entities/`.
8. Schema só muda por migration (`synchronize: false`). Nunca ligar `synchronize`.

## Banco de dados

- Postgres 18 via `pnpm infra:up`, a partir da raiz do monorepo. O compose lê o mesmo `.env` da API (`--env-file apps/api/.env`) e tem healthcheck (`docker inspect postgres --format '{{.State.Health.Status}}'`).
- A porta só é exposta em `127.0.0.1`.
- Redis 8 sobe no mesmo compose (`redis`), com senha, `appendonly` e porta só em `127.0.0.1`. A API depende dele para a fila de e-mail (BullMQ): sem Redis, os e-mails não saem.
- Evolution API (`evolution`, WhatsApp) sobe no mesmo compose, porta só em `127.0.0.1`. Usa o schema `evolution_api` no mesmo database da API (migrations próprias, via Prisma; as do TypeORM ficam no `public`) e o db 6 do Redis. O painel fica em `http://localhost:${EVOLUTION_PORT}/manager`, autenticado com `EVOLUTION_API_KEY`.

## Documentação da API (Swagger)

`@nestjs/swagger`, sem o CLI plugin: tudo é declarado explicitamente. A UI fica em `/api/docs` (só em `development`), configurada em `main.ts`.

**Todo endpoint criado ou alterado deve sair documentado no mesmo passo**, sem esperar pedido:

- Controller: `@ApiTags('<feature>')`.
- Cada rota:
  - `@ApiOperation({ summary, description? })`. A `description` explica efeitos colaterais (cookies, revogações, redirects).
  - Sucesso:
    - Corpo via `ApiResponse.of()`: use `@ApiDataResponse(Dto, { status?, description?, isArray? })` de `src/common/http/api-docs.ts`.
    - Sem corpo: `@ApiNoContentResponse`.
    - Redirect: `@ApiFoundResponse`.
  - Um `@ApiErrorResponse(status, descrição)` para **cada** erro que a rota pode devolver, citando o `ErrorCode` (ex.: ``'E-mail já cadastrado (`EMAIL_ALREADY_IN_USE`).'``). Inclua o 400 de validação quando houver body ou query DTO.
  - Rota autenticada (sem `@IsPublic()`): `@ApiCookieAuth()`.
  - `@Query`/`@Param` soltos, fora de um DTO: `@ApiQuery`/`@ApiParam`.
- Precisa de um formato de resposta que os helpers não cobrem, como listas paginadas (`ApiResponse.paginated`/`cursorPaginated`)? Crie o helper em `api-docs.ts`; não monte schema inline no controller.

**Todo DTO (entrada e saída) documenta todas as propriedades:**

- `@ApiProperty` para obrigatórias e `@ApiPropertyOptional` para opcionais.
- O decorator fica acima dos decorators do `class-validator`.
- Espelhe as restrições de validação no schema: `minLength`/`maxLength`, `minimum`/`maximum`, `format` (`email`, `uuid`, `date-time`, `uri`, `password`), `enum` (`enum: Object.values(MeuEnum)`).
- Dê `example` realista e `description` quando o nome do campo não bastar.
- Campos `T | null`: `type` explícito + `nullable: true`, porque o metadata do TS não resolve uniões.
- Arrays e DTOs aninhados: `type: [OutroDto]` / `type: OutroDto`.

## Convenções

- Imports relativos em ESM precisam da extensão `.js` (ex.: `'./app.module.js'`).
- `src/` não pode importar de fora dele (`rootDir` do `tsconfig.build.json`).
- Testes unitários: `*.spec.ts` ao lado do código; e2e em `test/`.

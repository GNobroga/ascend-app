# Ascend

Scheduling platform for service businesses (barbershops, salons, clinics, etc.). Owners register their business, build a catalog of services and packages, organize their team of professionals, and take bookings online or at the front desk, with payments, reviews, and notifications by email and WhatsApp.

## Features

- **Authentication**: email and password, Google sign-in, email verification, and password reset
- **Businesses**: step-by-step creation (with postal code lookup), public page by `slug`, opening hours, social links, and booking and payment settings
- **Team**: members with roles (`owner`, `admin`, `professional`) who join by invitation
- **Professionals**: profile, photo, specialties, commission, services offered, working hours, and time off
- **Catalog**: services, categories, and packages, with images and ordering
- **Customers**: walk-in registration, history, no-shows, blocks, and duplicate detection
- **Appointments**: schedule, a "my appointments" area for customers, reminders, and status history
- **Payments, reviews, and notifications**
- **Subscription** per business, with a trial period
- **Dashboard** with business metrics
- **WhatsApp** via Evolution API

## Stack

| Part | Technologies |
|---|---|
| API (`apps/api`) | NestJS 12, TypeORM, PostgreSQL 18, BullMQ + Redis, Swagger, Pino, Vitest |
| Web (`apps/web`) | React 19 (React Compiler), Vite 8, React Router, TanStack Query, React Hook Form + Zod, nuqs, Tailwind 4, Playwright |
| UI (`packages/ui`) | Shared design system: shadcn on Base UI + Tailwind 4 |
| Storybook (`apps/storybook`) | Catalog of the `@packages/ui` components |
| Infra (`docker-compose.yaml`) | PostgreSQL, Redis, RustFS (S3 storage), Evolution API, and pgAdmin |

Monorepo managed with **pnpm workspaces**; linting with **oxlint**.

## Structure

```
apps/
  api/          NestJS API (organized by feature in src/features)
  web/          React frontend (organized by feature in src/features)
  storybook/    Design system Storybook
packages/
  ui/           Shared components (@packages/ui)
docs/           Business rules and roadmaps
docker/         Image files (reserved)
docker-compose.yaml
```

## Prerequisites

- Node.js 24+
- pnpm 10 (`corepack enable`)
- Docker and Docker Compose

## Running locally

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Set up environment variables**

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

   Fill in `apps/api/.env`. It is used by both the API and `docker-compose` (database, Redis, storage, and Evolution API). In `apps/web/.env`, set `API_PROXY_TARGET` to the API port (`PORT`).

3. **Start the infrastructure**

   ```bash
   pnpm infra:up
   ```

   Starts Postgres, Redis, RustFS, Evolution API, and pgAdmin, waits for the health checks, and creates the storage bucket. To stop it: `pnpm infra:down`.

4. **Run the migrations** (and optionally seed development data)

   ```bash
   pnpm api:migration:run
   pnpm --filter @apps/api db:seed
   ```

5. **Start the API and web app**

   ```bash
   pnpm dev
   ```

   Or separately with `pnpm api:dev` and `pnpm web:dev`. Vite proxies `/api` to the API.

### Local services

| Service | Address |
|---|---|
| Web | `http://localhost:5173` |
| API Swagger (`development` only) | `http://localhost:<PORT>/api/docs` |
| Storybook | `http://localhost:6006` |
| pgAdmin | `http://localhost:5050` |
| Evolution API dashboard | `http://localhost:<EVOLUTION_PORT>/manager` |
| RustFS console | `http://localhost:<STORAGE_CONSOLE_PORT>` |

## Scripts (from the root)

| Command | Description |
|---|---|
| `pnpm dev` | API and web in parallel, in watch mode |
| `pnpm api:dev` / `pnpm api:debug` | API in watch mode / with debugger |
| `pnpm api:build` / `pnpm api:prod` | Production build and run of the API |
| `pnpm api:test` / `pnpm api:test:e2e` | API unit / e2e tests |
| `pnpm api:lint` | Lint the API |
| `pnpm api:migration:generate <path>` | Generate a migration from the entities |
| `pnpm api:migration:run` / `pnpm api:migration:revert` | Apply / revert migrations |
| `pnpm api:storage:setup` | Create the storage bucket |
| `pnpm web:dev` / `pnpm web:build` / `pnpm web:preview` | Web dev server, build, and preview |
| `pnpm web:test` / `pnpm web:test:e2e` | Web tests (Vitest) / e2e (Playwright) |
| `pnpm web:lint` | Lint the web app |
| `pnpm storybook:dev` / `pnpm storybook:build` | Storybook |
| `pnpm infra:up` / `pnpm infra:down` | Start / stop the Docker infrastructure |

> To generate migrations, prefer running from inside `apps/api`: `pnpm migration:generate src/database/migrations/<Name>`.

## Debugging

`.vscode/launch.json` includes the **NestJS: Debug** configuration, which starts the API with `start:debug` and attaches the VS Code debugger.

## Documentation

- [`docs/business-rules.md`](docs/business-rules.md): business rules (roles, statuses, deadlines, and expected errors)
- [`docs/roadmap.md`](docs/roadmap.md) and [`docs/next-features.md`](docs/next-features.md): what has shipped and what comes next
- [`docs/dashboard.md`](docs/dashboard.md): dashboard requirements
- [`docs/loading-roadmap.md`](docs/loading-roadmap.md): plan for loading without blocking navigation
- [`apps/api/docs/`](apps/api/docs): system flows and API feature specs
- [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md) and [`apps/web/CLAUDE.md`](apps/web/CLAUDE.md): architecture and conventions for each app
- Swagger at `/api/docs`: contract for each route

> The project docs are written in Portuguese.

# CLAUDE.md — Nehemiah

## Project Overview

Full-stack monorepo: Next.js frontend + NestJS backend + shared TypeScript types.

- **Frontend**: `frontend/` — Next.js 15, React 19, Tailwind CSS v4, shadcn/ui, Zustand, TanStack Query
- **Backend**: `backend/` — NestJS with Fastify adapter, Drizzle ORM, PostgreSQL, Repository Pattern
- **Shared**: `shared/types/` — TypeScript interfaces used by both apps via `@shared/*` path alias
- **Infra**: Docker Compose (dev + prod), GitHub Actions CI/CD

## Commands

### Root
```bash
pnpm dev              # docker compose up (full stack)
pnpm dev:frontend     # frontend only
pnpm dev:backend      # backend only
pnpm test             # run all tests
pnpm lint             # lint both apps
```

### Frontend (`cd frontend`)
```bash
pnpm dev              # next dev (port 3000)
pnpm build            # next build
pnpm test             # vitest run
pnpm test:e2e         # playwright test
pnpm lint             # next lint
pnpm format           # prettier --write .
```

### Backend (`cd backend`)
```bash
pnpm dev              # nest start --watch (port 8000)
pnpm build            # nest build
pnpm test             # jest
pnpm test:e2e         # jest --config test/e2e/jest-e2e.json
pnpm lint             # eslint "{src,test}/**/*.ts"
pnpm format           # prettier --write .
pnpm db:generate      # drizzle-kit generate (create migration from schema changes)
pnpm db:migrate       # drizzle-kit migrate (apply pending migrations)
pnpm db:push          # drizzle-kit push (push schema directly, dev only)
pnpm db:studio        # drizzle-kit studio (visual DB browser)
pnpm db:seed          # ts-node src/database/seeds/seed.ts
```

## Code Style

- **Formatter**: Prettier — single quotes, semicolons, trailing commas, 100 char width, 2-space indent
- **Frontend linter**: ESLint with `next/core-web-vitals` + `next/typescript`
- **Backend linter**: ESLint with `@typescript-eslint/recommended`
- `no-console` is warn-level (only `console.warn` and `console.error` allowed)
- `@typescript-eslint/no-explicit-any` is warn-level — avoid `any`, use proper types
- Frontend enforces `max-lines: 1000` per file
- Always format before committing. Both apps have `pnpm format`.

## Architecture Rules

### Backend — Drizzle ORM

This project uses **Drizzle ORM**, NOT TypeORM. Do not import from `typeorm` or `@nestjs/typeorm`.

- **Schemas** are defined in `src/database/schema/` using Drizzle's `pgTable()` builder
- **Types** are inferred from schemas: `typeof table.$inferSelect` and `typeof table.$inferInsert`
- **Drizzle instance** is injected globally via `DrizzleModule` using the `DRIZZLE` DI token
- **Migrations** are managed with `drizzle-kit` (config: `backend/drizzle.config.ts`)
- Use `pnpm db:push` for rapid dev iteration, `pnpm db:generate` + `pnpm db:migrate` for production

### Backend — Repository Pattern (MUST follow)

Services NEVER import Drizzle directly. They depend on repository interfaces injected via DI tokens.

```
Controller → Service → IRepository (interface) ← Repository (Drizzle implementation)
```

When creating a new module:
1. Define schema in `src/database/schema/` using `pgTable()`, export from `index.ts`
2. Define repository interface + DI token in `interfaces/`
3. Implement repository in `repositories/` (injects `DRIZZLE` token, uses Drizzle query builder)
4. Service injects via `@Inject(TOKEN)` — never the Drizzle `db` directly
5. Controller injects service — stays thin, no business logic
6. Wire in module: provide repository with `{ provide: TOKEN, useClass: RepoImpl }`

Example (see `src/modules/users/` for reference implementation):
```typescript
// Schema (src/database/schema/user.schema.ts)
export const users = pgTable('users', { id: uuid('id').defaultRandom().primaryKey(), ... });
export type User = typeof users.$inferSelect;

// Repository
constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}
async findAll() { return this.db.select().from(users); }

// Interface
export const USER_REPOSITORY = 'USER_REPOSITORY';
export interface IUserRepository { findAll(): Promise<User[]>; /* ... */ }

// Service
constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

// Module
{ provide: USER_REPOSITORY, useClass: UserRepository }
```

### Backend — Database Schema

All Drizzle table schemas live in `src/database/schema/` and are barrel-exported from `src/database/schema/index.ts`. When adding a new table:
1. Create `src/database/schema/<name>.schema.ts` with `pgTable()` definition
2. Export it from `src/database/schema/index.ts`
3. Re-export types from the module's `entities/` folder for local use

### Backend — Module Structure

Every module lives in `src/modules/<name>/` with this layout:
```
<name>/
├── controllers/           # Route handlers — thin, delegates to service
├── services/              # Business logic
├── repositories/          # Drizzle data access (injects DRIZZLE token)
├── dto/                   # create-<name>.dto.ts, update-<name>.dto.ts
├── interfaces/            # Repository interface + DI token
└── <name>.module.ts       # NestJS module wiring
```

### Backend — DTOs & Validation

- Use `class-validator` decorators on DTOs
- Global `ValidationPipe` is configured with `whitelist: true`, `transform: true`, `forbidNonWhitelisted: true`
- Never trust raw input — always go through a DTO

### Backend — API Prefix

All routes are prefixed with `/api/v1` (set in `main.ts`). Controllers should NOT include this prefix.

### Backend — Fastify

This project uses Fastify, NOT Express. Do not import Express types or middleware. Use `@nestjs/platform-fastify`.

### Frontend — Feature Modules

Organize domain logic in `src/features/<name>/`:
```
<name>/
├── components/      # Feature-specific UI
├── hooks/           # Feature-specific React hooks
├── actions/         # Next.js Server Actions
├── api/             # TanStack Query hooks + fetch calls
├── schemas/         # Zod schemas (form validation)
├── types/           # Feature-local types
└── index.ts         # Barrel export
```

### Frontend — State Management

- **Server state**: TanStack Query — all API data fetching goes through query hooks
- **Client state**: Zustand stores in `src/store/`
  - `auth.store.ts` — user session + JWT (persisted)
  - `ui.store.ts` — global UI state (modals, sidebar, toasts)
- Do NOT use React Context for state that changes frequently

### Frontend — Forms

Always use this pattern:
1. Define Zod schema in `features/<name>/schemas/`
2. Infer TypeScript type with `z.infer<typeof schema>`
3. Use `react-hook-form` with `zodResolver`
4. Render with shadcn Form components

### Frontend — Components

- `src/components/ui/` — shadcn/ui primitives (do not modify these directly)
- `src/components/layout/` — Navbar, Sidebar, Footer
- `src/components/shared/` — Reusable non-shadcn components
- Feature-specific components go in `src/features/<name>/components/`

### Frontend — App Router

- Route groups: `(auth)` for login/register, `(dashboard)` for authenticated pages
- Each group has its own `layout.tsx`
- Global error/loading/not-found pages are in `src/app/`

## Shared Types

Located in `shared/types/`. Both apps import via `@shared/types`:
```typescript
import type { ApiResponse, BaseUser, PaginatedResponse } from '@shared/types';
```

When both apps need the same interface, add it here. Feature-local types stay in their respective app.

Key types:
- `ApiResponse<T>` — standard API response wrapper
- `ApiError` — error response shape
- `BaseUser` / `UserRole` — user entity shape
- `PaginationQuery` / `PaginatedResponse<T>` — pagination helpers

## Path Aliases

Both apps use these `tsconfig.json` paths:
- `@/*` → `./src/*` (app-local imports)
- `@shared/*` → `../shared/*` (shared types)

Always use path aliases, never relative imports like `../../../`.

## Environment

- Frontend env: `frontend/.env` (copy from `frontend/.env.example`)
- Backend env: `backend/.env` (copy from `backend/.env.example`)
- `.env` files are gitignored — NEVER commit them
- Backend connects to Postgres on `DATABASE_HOST:DATABASE_PORT` (defaults: `postgres:5432`)
- Backend API runs on port `API_PORT` (default: `8000`)
- Frontend expects backend at `NEXT_PUBLIC_API_URL` (default: `http://localhost:8000/api/v1`)

## Docker

- `docker compose up` starts: Postgres, pgAdmin, Redis, MinIO, Mailpit, backend, frontend
- Backend and frontend have volume mounts for hot reload
- Each app has its own `Dockerfile` inside its directory

## CI/CD

- Single workflow: `.github/workflows/ci.yml`
- PR to `main` → lint + test + build both apps (checks only)
- Merge to `main` → lint + test + build → push Docker images to GHCR → auto-deploy to production

## Testing

- **Frontend**: Vitest for unit tests, Playwright for E2E
- **Backend**: Jest for unit tests (`*.spec.ts` co-located with source), Supertest for E2E
- When testing backend services, mock the repository interface — not Drizzle
- Run `pnpm test` from root to test both apps

## Common Pitfalls

- Don't use `console.log` — use `console.warn` or `console.error` (linter enforces this)
- Don't put business logic in controllers — keep them thin, delegate to services
- Don't import Drizzle `db` in services — use the injected repository interface
- Don't use Express types/middleware — this is a Fastify project
- Don't skip DTO validation — every endpoint input goes through a validated DTO
- Don't put shared types in `frontend/` or `backend/` — use `shared/types/`
- Don't define table schemas inside modules — all schemas go in `src/database/schema/`
- Don't use `db:push` in production — use `db:generate` + `db:migrate`

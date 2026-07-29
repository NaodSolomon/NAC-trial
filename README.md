# NAC-trial

Full-stack monorepo — Next.js frontend + NestJS backend with PostgreSQL, Redis, MinIO, and Mailpit.

## Tech Stack

| Layer      | Tech                                                        |
|------------|-------------------------------------------------------------|
| Frontend   | Next.js 15, React 19, TypeScript, Tailwind CSS v4, shadcn/ui |
| Backend    | NestJS, Fastify, Drizzle ORM, Repository Pattern            |
| Database   | PostgreSQL 16                                               |
| Cache      | Redis 7                                                     |
| Storage    | MinIO (dev) / Cloudflare R2 (prod)                          |
| Mail       | Mailpit (dev)                                               |
| Testing    | Vitest + Playwright (frontend) / Jest + Supertest (backend) |
| CI/CD      | GitHub Actions → GHCR → VPS deploy                         |
| Infra      | Docker Compose (dev + prod), Traefik (prod SSL)             |

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Docker](https://www.docker.com/) & Docker Compose

### Setup

```bash
# Clone and enter
git clone https://github.com/NaodSolomon/NAC-trial.git
cd NAC-trial

# Copy env files
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# Start everything (Postgres, Redis, MinIO, Mailpit, backend, frontend)
docker compose up
```

### Run without Docker

```bash
# Frontend (requires backend services running)
cd frontend && pnpm install && pnpm dev

# Backend (requires Postgres + Redis)
cd backend && pnpm install && pnpm dev
```

## Service URLs (Development)

| Service   | URL                          | Purpose            |
|-----------|------------------------------|---------------------|
| Frontend  | http://localhost:3000         | Next.js app         |
| Backend   | http://localhost:8000/api/v1  | NestJS API          |
| pgAdmin   | http://localhost:5050         | Postgres GUI        |
| MinIO UI  | http://localhost:9001         | Object storage GUI  |
| Mailpit   | http://localhost:8025         | Email catcher UI    |
| Redis     | localhost:6379                | Cache               |

**pgAdmin login:** `admin@admin.com` / `admin`
**MinIO login:** `minioadmin` / `minioadmin`

## Project Structure

```
nehemiah/
├── frontend/          # Next.js app
│   ├── src/
│   │   ├── app/       # App Router pages & layouts
│   │   ├── components/# UI components (shadcn + custom)
│   │   ├── features/  # Feature modules (auth, users, etc.)
│   │   ├── hooks/     # Shared React hooks
│   │   ├── lib/       # Utilities (api-client, cn(), constants)
│   │   ├── providers/ # React context providers
│   │   └── store/     # Zustand stores
│   └── tests/         # Unit + E2E tests
│
├── backend/           # NestJS app
│   ├── src/
│   │   ├── modules/   # Feature modules (users, etc.)
│   │   ├── common/    # Guards, filters, interceptors, pipes
│   │   ├── config/    # App, database, JWT configuration
│   │   └── database/  # Drizzle schema, migrations, seeds
│   └── test/          # E2E tests
│
├── shared/            # Shared TypeScript types
│   └── types/
│
├── .github/workflows/ # CI/CD pipelines
├── docker-compose.yml          # Dev environment
└── docker-compose.prod.yml     # Production (Traefik + GHCR)
```

## Scripts

### Root

| Command              | Description                        |
|----------------------|------------------------------------|
| `pnpm dev`           | Start all services via Docker      |
| `pnpm dev:frontend`  | Run frontend only                  |
| `pnpm dev:backend`   | Run backend only                   |
| `pnpm build`         | Build all Docker images            |
| `pnpm test`          | Run all tests                      |
| `pnpm lint`          | Lint both apps                     |

### Frontend (`cd frontend`)

| Command              | Description                        |
|----------------------|------------------------------------|
| `pnpm dev`           | Start dev server                   |
| `pnpm build`         | Production build                   |
| `pnpm test`          | Run unit tests (Vitest)            |
| `pnpm test:e2e`      | Run E2E tests (Playwright)         |
| `pnpm lint`          | Lint with ESLint                   |
| `pnpm format`        | Format with Prettier               |

### Backend (`cd backend`)

| Command              | Description                        |
|----------------------|------------------------------------|
| `pnpm dev`           | Start with watch mode              |
| `pnpm build`         | Build for production               |
| `pnpm test`          | Run unit tests (Jest)              |
| `pnpm test:e2e`      | Run E2E tests                      |
| `pnpm db:generate`   | Generate migration from schema diff|
| `pnpm db:migrate`    | Apply pending migrations           |
| `pnpm db:check`      | Check migration history consistency |
| `pnpm db:studio`     | Open Drizzle Studio (visual DB)    |
| `pnpm db:seed`       | Seed the database                  |
| `pnpm lint`          | Lint with ESLint                   |
| `pnpm format`        | Format with Prettier               |

## Shared Types

Both apps use `@shared/*` path alias to import from `shared/types/`:

```typescript
import type { AdminUser, ApiResponse, PaginatedResponse } from '@shared/types';
```

## Backend Architecture

The backend uses **Drizzle ORM** with the **Repository Pattern**:

```
Module
├── controllers/    # HTTP layer — route handlers
├── services/       # Business logic — depends on repository interface
├── repositories/   # Data access — Drizzle implementation
├── dto/            # Data transfer objects (class-validator)
└── interfaces/     # Repository contracts
```

Database schemas are defined in `src/database/schema/` using Drizzle's `pgTable()` builder. Services depend on repository **interfaces**, not implementations. Repositories are injected via NestJS DI using tokens.

All database changes must be represented by a committed migration:

```bash
cd backend
pnpm db:generate --name=<descriptive_name>
pnpm db:check
pnpm db:migrate
```

Do not use schema push commands. Migration files are reviewed and deployed in order so every environment has a reproducible database history.

## Administrator Authentication

The platform has no public user registration. Administrator authentication uses:

- short-lived JWT access tokens;
- rotating JWT refresh tokens stored only as SHA-256 hashes;
- refresh-token family revocation when reuse is detected;
- database-backed account activation and temporary login lockout;
- separate production secrets for access tokens, refresh tokens, and IP hashing.

| Method | Endpoint               | Purpose                         |
|--------|------------------------|---------------------------------|
| POST   | `/api/v1/auth/login`   | Authenticate an administrator   |
| POST   | `/api/v1/auth/refresh` | Rotate a valid refresh token    |
| POST   | `/api/v1/auth/logout`  | Revoke the supplied session     |
| GET    | `/api/v1/auth/me`      | Return the current administrator|

To create the first super administrator, set `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, and `SEED_ADMIN_PASSWORD`, then run `pnpm db:seed` from `backend/`. Seed credentials are never given default values, and an existing administrator is never overwritten.

## Authorization and Audit

Private administration endpoints require both a valid access JWT and an explicitly allowed database-backed role. Administrator account management and audit-log access are restricted to `SUPER_ADMIN`.

| Method | Endpoint                    | Required role | Purpose                    |
|--------|-----------------------------|---------------|----------------------------|
| GET    | `/api/v1/admin/users`       | `SUPER_ADMIN` | List administrator accounts|
| POST   | `/api/v1/admin/users`       | `SUPER_ADMIN` | Create an administrator    |
| GET    | `/api/v1/admin/users/:id`   | `SUPER_ADMIN` | Read an administrator      |
| PATCH  | `/api/v1/admin/users/:id`   | `SUPER_ADMIN` | Update an administrator    |
| DELETE | `/api/v1/admin/users/:id`   | `SUPER_ADMIN` | Delete an administrator    |
| GET    | `/api/v1/admin/audit-logs`  | `SUPER_ADMIN` | Search immutable audit logs|

Administrator create, update, and delete operations write their audit records in the same database transaction. Login and logout events are also recorded. Password hashes, raw tokens, and raw IP addresses are never included in audit metadata.

The final active super administrator cannot be demoted, deactivated, or deleted. Administrators also cannot delete their own account.

## Content Management

Step 5 adds the first complete content-management slice. English and Amharic pages share a
`translationKey`, while each language keeps its own unique slug and content. Authors work in
drafts, can publish immediately, or schedule future publication. Editing published content
returns it to draft so unreviewed changes never become public automatically.

| Method | Endpoint                                      | Access                         | Purpose                         |
|--------|-----------------------------------------------|--------------------------------|---------------------------------|
| GET    | `/api/v1/public/pages/:slug?languageCode=en` | Public                         | Read a published page           |
| GET    | `/api/v1/admin/slugs/check`                  | Editor or super administrator  | Check localized slug availability |
| GET    | `/api/v1/admin/cms/pages`                    | Editor or super administrator  | List and filter pages           |
| POST   | `/api/v1/admin/cms/pages`                    | Editor or super administrator  | Create a draft                  |
| PATCH  | `/api/v1/admin/cms/pages/:id`                | Editor or super administrator  | Edit a page                     |
| POST   | `/api/v1/admin/cms/pages/:id/publish`        | Editor or super administrator  | Publish immediately             |
| POST   | `/api/v1/admin/cms/pages/:id/schedule`       | Editor or super administrator  | Schedule publication            |
| DELETE | `/api/v1/admin/cms/pages/:id`                | Editor or super administrator  | Delete a page                   |

Navigation has public localized reads and protected management endpoints under
`/api/v1/admin/navigation`. Public site settings are available at `/api/v1/settings`; only a
super administrator can update them at `/api/v1/admin/settings`. All content, navigation, and
settings mutations write an audit record in the same database transaction.

A trusted scheduler should call `POST /api/v1/internal/jobs/publish-scheduled` with the
`x-internal-api-key` header. Set a separate, randomly generated `INTERNAL_API_KEY` of at least
32 characters in production. This endpoint is intended for a cron service, not browsers.

## Media Library

Step 6 provides CMS asset storage through the S3-compatible API shared by Cloudflare R2 and
local MinIO. The API accepts JPEG, PNG, GIF, WebP, MP4, WebM, and PDF files. It verifies both
the declared MIME type and the file signature, generates the object key server-side, limits
each request to one bounded file, and requires accessibility alt text for images.

| Method | Endpoint                     | Required role                    | Purpose                    |
|--------|------------------------------|----------------------------------|----------------------------|
| GET    | `/api/v1/admin/media`        | Editor or super administrator    | Search and filter assets   |
| POST   | `/api/v1/admin/media/upload` | Editor or super administrator    | Upload an asset            |
| DELETE | `/api/v1/admin/media/:id`    | `SUPER_ADMIN`                    | Delete an asset            |

Uploads use `multipart/form-data` with a required `file` and optional `languageCode`,
`altText`, `caption`, and `folder` fields. `altText` is mandatory for images. Configure the
`STORAGE_*` variables for Cloudflare R2 in production; the example values target MinIO during
local development. Set `STORAGE_PUBLIC_URL` to the public CDN or custom-domain base URL.

## CI/CD

### PR Flow
1. Push feature branch → open PR targeting `main`
2. CI runs lint + tests + build for both apps (checks only, no deploy)

### Prod Flow
1. Merge PR into `main`
2. Docker images auto-built and pushed to GHCR
3. Auto-deploys to production VPS via SSH

### Required GitHub Secrets

| Secret            | Description                              |
|-------------------|------------------------------------------|
| `PROD_HOST`       | Production VPS IP                        |
| `PROD_USER`       | SSH user for production                  |
| `PROD_SSH_KEY`    | SSH private key for production           |
| `GHCR_TOKEN`      | GitHub PAT with `write:packages` scope   |

## Production Deployment

```bash
# On your VPS
git clone <your-repo>
cd nehemiah
cp backend/.env.example backend/.env   # fill prod values
cp frontend/.env.example frontend/.env # fill prod values

# Start with Traefik SSL
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Production uses Traefik for automatic SSL via Let's Encrypt. Update `yourdomain.com` and `your@email.com` in `docker-compose.prod.yml`.

## Environment Variables

See [backend/.env.example](backend/.env.example) and [frontend/.env.example](frontend/.env.example) for all available config options.

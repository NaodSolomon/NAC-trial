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

## Contact Form

Step 7 composes the public Contact page from the published `contact` CMS page and global site
settings, so editors do not maintain the same address and phone number in multiple places.
Public submissions are validated, normalized, rate-limited to five requests per minute per
client, and stored without IP addresses or user-agent fingerprints.

| Method | Endpoint                    | Access                      | Purpose                         |
|--------|-----------------------------|-----------------------------|---------------------------------|
| GET    | `/api/v1/public/contact`    | Public                      | Read localized contact content  |
| POST   | `/api/v1/public/contact`    | Public, rate-limited        | Submit a contact message        |
| GET    | `/api/v1/admin/contact`     | Editor or super administrator | Search and list submissions   |
| DELETE | `/api/v1/admin/contact/:id` | `SUPER_ADMIN`               | Permanently delete a submission |

The public request accepts `name`, `email`, `message`, optional `subject`, and optional
`languageCode` (`en` or `am`). Deletion is audited without copying the sender's personal data
into audit metadata. Outbound email is intentionally deferred to a queued mail/outbox slice;
contact persistence must succeed independently of temporary email-provider failures.

## Volunteer Engagement

Step 8 completes the volunteer-page engagement workflow. The localized page body comes from
the published `volunteer` CMS page. Applications and newsletter subscriptions are validated,
normalized, rate-limited, and stored without network identifiers. Duplicate newsletter
signup returns the same success response, preventing account enumeration.

| Method | Endpoint                              | Access                         | Purpose                        |
|--------|---------------------------------------|--------------------------------|--------------------------------|
| GET    | `/api/v1/public/volunteer`            | Public                         | Read volunteer-page content    |
| POST   | `/api/v1/public/volunteer/apply`      | Public, rate-limited           | Submit a volunteer application |
| GET    | `/api/v1/admin/volunteers`            | Editor or super administrator  | Review applications            |
| DELETE | `/api/v1/admin/volunteers/:id`        | `SUPER_ADMIN`                  | Delete an application          |
| GET    | `/api/v1/public/testimonials`         | Public                         | Read published testimonials    |
| GET    | `/api/v1/admin/testimonials`          | Editor or super administrator  | Review all testimonials        |
| POST   | `/api/v1/admin/testimonials`          | Editor or super administrator  | Create a testimonial           |
| PATCH  | `/api/v1/admin/testimonials/:id`      | Editor or super administrator  | Edit or publish a testimonial  |
| DELETE | `/api/v1/admin/testimonials/:id`      | Editor or super administrator  | Delete a testimonial           |
| POST   | `/api/v1/public/newsletter`           | Public, rate-limited           | Subscribe an email address     |
| GET    | `/api/v1/admin/newsletter`            | `SUPER_ADMIN`                  | List subscribers               |
| DELETE | `/api/v1/admin/newsletter/:email`     | `SUPER_ADMIN`                  | Remove a subscriber            |

Testimonials start as drafts unless explicitly published. Public queries cannot request draft
status, and repository filtering independently enforces `PUBLISHED`. Audit metadata for
application and subscriber deletion excludes names, email addresses, phone numbers, and
message content.

## Donations and Payments

Step 9 adds a payment-safe donation workflow without storing card or bank credentials. PayPal
uses the server-side Orders v2 API and PayPal's official webhook verification endpoint.
Provider order IDs, capture IDs, and webhook event IDs are uniquely constrained for
idempotency. Telebirr and CBE routes fail closed until verified provider adapters are added.

Public endpoints under `/api/v1/public/donations` support initiation, status, cancellation,
recent anonymous donations, and configured gateway discovery. PayPal webhooks are received at
`/api/v1/webhooks/paypal`. Administrative endpoints under `/api/v1/admin/donations` provide
finance-restricted listing, detail, statistics, CSV export, PDF receipt generation, and queued
receipt delivery. Only `SUPER_ADMIN` can manually verify a pending donation.

Set `PAYPAL_ENABLED=true` only after configuring sandbox or production client credentials,
webhook ID, return URL, and cancel URL. Receipt PDFs are stored through the existing R2/MinIO
storage abstraction. Receipt emails use a transactional outbox so email-provider downtime
does not roll back or corrupt confirmed payments.

## Events and RSVP

Step 10 adds localized event publishing and RSVP management. Public queries expose only
published events, while editors can manage drafts and translations. Event slugs are unique per
language, end times must follow start times, and each email can RSVP only once per event.

| Method | Endpoint                                | Access                        | Purpose |
|--------|-----------------------------------------|-------------------------------|---------|
| GET    | `/api/v1/public/events`                 | Public                        | List published events |
| GET    | `/api/v1/public/events/:slug`           | Public                        | Read a localized event |
| POST   | `/api/v1/public/events/:id/rsvp`        | Public, rate-limited          | Submit an RSVP |
| GET    | `/api/v1/admin/events`                  | Editor or super administrator | Manage event inventory |
| POST   | `/api/v1/admin/events`                  | Editor or super administrator | Create an event |
| PATCH  | `/api/v1/admin/events/:id`              | Editor or super administrator | Update an event |
| DELETE | `/api/v1/admin/events/:id`              | `SUPER_ADMIN`                 | Delete an event and its RSVPs |
| GET    | `/api/v1/admin/events/:id/rsvps`        | Editor or super administrator | Review RSVPs |
| GET    | `/api/v1/admin/events/:id/rsvps/export` | Editor or super administrator | Export RSVP CSV |

Use `languageCode=en|am` for localized reads and `timeframe=upcoming|past|all` for event lists.
RSVP closes when an event ends and personal RSVP data is never returned by public routes.
Automated reminders and calendar-file generation remain separate future slices.

## Gallery

Step 11 adds a localized public gallery backed by the existing secure media pipeline. Gallery
uploads accept validated images and videos only; file signatures must match declared MIME
types, image alternative text is mandatory, and objects are stored under the `gallery`
namespace in the configured R2 or MinIO bucket.

| Method | Endpoint                    | Access                        | Purpose |
|--------|-----------------------------|-------------------------------|---------|
| GET    | `/api/v1/public/gallery`    | Public                        | List localized images and videos |
| POST   | `/api/v1/admin/gallery`     | Editor or super administrator | Upload a gallery item |
| PATCH  | `/api/v1/admin/gallery/:id` | Editor or super administrator | Update title or alternative text |
| DELETE | `/api/v1/admin/gallery/:id` | `SUPER_ADMIN`                 | Delete the item and stored media |

The upload is `multipart/form-data` with `file`, `title`, `altText`, and `languageCode`
(`en` or `am`). Public listing supports pagination, language, media-type filtering, and never
exposes storage object keys or administrator identifiers. Mutations are audit logged.

## Anonymous Visitor Analytics

Step 12 adds the documented analytics summary and timeline using a first-party, anonymous
event stream. The system records page paths, timestamps, Cloudflare country codes, coarse
device categories, and sanitized referrers. Query strings are removed before storage because
they can contain tokens or personal information. IP addresses, cookies, user agents, and
visitor fingerprints are not stored.

| Method | Endpoint                            | Access                  | Purpose |
|--------|-------------------------------------|-------------------------|---------|
| POST   | `/api/v1/public/analytics/events`   | Public, rate-limited    | Record an anonymous event |
| GET    | `/api/v1/admin/analytics/summary`   | `SUPER_ADMIN`           | Read total page views and top dimensions |
| GET    | `/api/v1/admin/analytics/timeline`  | `SUPER_ADMIN`           | Read a 1-, 7-, or 30-day visitor timeline |

The ingestion body accepts `eventType` (`page_view`, `click`, or `submit`), a local `pageUrl`,
`deviceType`, and optional `referrer`. Country is accepted only from Cloudflare's
`CF-IPCountry` request header; clients cannot submit it in the body. In this anonymous model,
the documented `totalVisitors` and daily `visitors` values represent page-view counts rather
than uniquely identified people.

## Security Hardening

Step 13 applies defense in depth across every API route. A global rate-limit guard provides a
100-request-per-minute baseline while sensitive public write routes keep their lower limits.
CORS uses an exact allowlist and production origins must use HTTPS. Responses include a
restrictive API CSP, clickjacking, MIME-sniffing, referrer, permissions, cache, and correlation
headers; production also enables HSTS.

JSON bodies default to 1 MiB and can be configured with `REQUEST_BODY_LIMIT_BYTES` within the
enforced 1 KiB–5 MiB range. Multipart uploads retain independent file-size limits and
signature-based file validation. The global sanitization policy rejects control characters,
prototype-pollution keys, script tags, inline event handlers, and JavaScript URLs in managed
content instead of silently rewriting submitted data.

Authentication keeps five-attempt/15-minute account lockout and rotating refresh-token
families. Reuse of a revoked refresh token revokes the entire family. PayPal webhooks are
accepted only after PayPal signature verification. Production startup rejects short,
placeholder, whitespace-containing, or reused security secrets. HTTP logs contain method,
query-free path, status context, duration, and request correlation only—never bodies, tokens,
credentials, or query strings.

## Testing, API Documentation, and Deployment

Step 14 formalizes the release pipeline:

- `pnpm test` runs isolated service, guard, policy, and payment-contract unit tests.
- `pnpm test:e2e` boots the real Fastify application against the dedicated PostgreSQL test
  database. It verifies successful JWT login, refresh rotation, logout and revocation,
  role boundaries, public-data privacy, every implemented vertical slice, CORS, rate limits,
  request limits, security headers, OpenAPI, and smoke behavior. Object storage and PayPal
  are deterministic in-process simulations; no paid or external service is contacted.
- `pnpm test:integration` applies every Drizzle migration to PostgreSQL and exercises real
  repository queries when `TEST_DATABASE_URL` is configured. The database-dependent suite
  prints an explicit warning and skips locally when that variable is absent; CI always
  supplies it.
- Migration-chain tests ensure every journal entry has its matching ordered SQL file.
- `pnpm test:coverage` enforces the initial unit-layer coverage baseline: 55% statements,
  45% branches, 50% functions, and 55% lines. This gate covers services, guards, request
  policies, payment contracts, and environment validation. Repository and controller
  execution belong to the PostgreSQL integration and Fastify E2E suites.
- `pnpm test:ci` is the canonical backend quality gate used both locally and by GitHub
  Actions. It runs lint, coverage-gated unit tests, E2E tests, integration tests, migration
  consistency checks, and the production build.

Start the disposable local integration database with:

```bash
docker compose -f docker-compose.test.yml up -d --wait
$env:TEST_DATABASE_URL="postgresql://nehemiah_test:nehemiah_test@localhost:5434/nehemiah_test"
cd backend
pnpm test:integration
pnpm test:e2e
docker compose -f ../docker-compose.test.yml down
```

Use only a disposable database whose name clearly contains `test`. The database cleanup
and connection helpers refuse any other database name. At integration-suite startup, the
dedicated database's `public` and `drizzle` schemas are recreated and all committed migrations
are applied from the beginning.

The PostgreSQL suite exercises every Drizzle repository: administrators, authentication
sessions, audit logs, CMS pages, navigation, settings, contact submissions, engagement,
events and RSVPs, media, gallery, donations, and analytics. It also verifies database
uniqueness and check constraints, token-family revocation, webhook idempotency, and rollback
when a transactional audit write fails. No payment-provider network calls are made.

OpenAPI JSON is available at `/api/v1/docs/openapi.json` and Swagger UI at
`/api/v1/docs` when `SWAGGER_ENABLED=true`. Documentation defaults off in production.
Unauthenticated monitoring endpoints are `/api/v1/system/health` and
`/api/v1/system/version`.

The restored CI workflow runs backend tests with PostgreSQL, validates migrations, builds the
production backend image, and verifies the frontend. Production deployment is manual,
restricted to `main`, and protected by the GitHub `production` environment. Configure
`PROD_HOST`, `PROD_USER`, `PROD_SSH_KEY`, and `PROD_APP_PATH` before running it. The workflow
builds immutable SHA-tagged images, runs migrations as a one-off container, and then performs
the Compose rollout.

## CI/CD

### PR Flow
1. Push feature branch → open PR targeting `main`
2. CI runs lint + tests + build for both apps (checks only, no deploy)

### Prod Flow
1. Merge the reviewed PR into `main`
2. Manually start the production workflow after CI succeeds
3. SHA-tagged images are pushed to GHCR
4. Migrations run before the Compose application rollout

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

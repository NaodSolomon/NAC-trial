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
| `pnpm db:seed:demo`  | Seed local trial homepage and FAQ  |
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

The API, Drizzle CLI, migration scripts, and seed scripts all use the same database connection
precedence. `TEST_DATABASE_URL` takes precedence while `NODE_ENV=test`; otherwise
`DATABASE_URL` is preferred. `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`,
`DATABASE_PASSWORD`, and `DATABASE_NAME` remain supported together as a legacy fallback.

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
| POST   | `/api/v1/auth/password-reset/request` | Request generic reset instructions |
| POST   | `/api/v1/auth/password-reset/confirm` | Consume a single-use reset token |
| GET    | `/api/v1/admin/system/sessions` | List administrator sessions (`SUPER_ADMIN`) |
| POST   | `/api/v1/admin/system/sessions/revoke` | Revoke one session or all sessions for an administrator (`SUPER_ADMIN`) |

To create the first super administrator, set `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, and `SEED_ADMIN_PASSWORD`, then run `pnpm db:seed` from `backend/`. Seed credentials are never given default values, and an existing administrator is never overwritten.

For a local trial environment, run `pnpm db:seed:demo` after migrations and the bootstrap seed.
This separate, idempotent seed publishes the English `home` and `faq` CMS pages used by the
homepage and FAQ composition endpoints. It creates an inactive technical content author with
no usable login credential, never creates a default administrator, and leaves existing pages
unchanged when the script is run again. Demonstration content is not part of the production
bootstrap seed.

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
| GET    | `/api/v1/public/events/:slug/calendar.ics` | Public                     | Download an iCalendar event |
| POST   | `/api/v1/public/events/:id/rsvp`        | Public, rate-limited          | Submit an RSVP |
| GET    | `/api/v1/admin/events`                  | Editor or super administrator | Manage event inventory |
| POST   | `/api/v1/admin/events`                  | Editor or super administrator | Create an event |
| PATCH  | `/api/v1/admin/events/:id`              | Editor or super administrator | Update an event |
| DELETE | `/api/v1/admin/events/:id`              | `SUPER_ADMIN`                 | Delete an event and its RSVPs |
| GET    | `/api/v1/admin/events/:id/rsvps`        | Editor or super administrator | Review RSVPs |
| GET    | `/api/v1/admin/events/:id/rsvps/export` | Editor or super administrator | Export RSVP CSV |

Use `languageCode=en|am` for localized reads and `timeframe=upcoming|past|all` for event lists.
RSVP closes when an event ends and personal RSVP data is never returned by public routes.
Calendar-file generation is implemented by the public `.ics` endpoint. Automated reminder
emails remain a separate future slice.

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
Unauthenticated monitoring endpoints are `/api/v1/system/health/live`,
`/api/v1/system/health/ready`, and `/api/v1/system/version`. Liveness only confirms that the
API process can accept requests. Readiness returns `503` when PostgreSQL is unavailable and
remains `200` with a `degraded` status when only the optional Redis cache is unavailable.
`/api/v1/system/health` remains a backwards-compatible alias for readiness.

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

## Free Local Trial Runtime

Copy `backend/.env.example` to `backend/.env`, then start the complete local stack:

```bash
docker compose up --build
```

The trial stack uses PostgreSQL, MinIO object storage, Mailpit SMTP, Redis, and the fake
payment gateway. Mailpit is available at `http://localhost:8025` and the MinIO console at
`http://localhost:9001`. The API health and version endpoints identify `mode: trial` and
list the selected adapters. Fake checkouts persist donation workflows but cannot collect
money or contact PayPal, Telebirr, or CBE.

Real PayPal traffic requires all three explicit switches:
`PAYMENT_DRIVER=paypal`, `PAYMENTS_ENABLED=true`, and `PAYPAL_ENABLED=true`, plus valid
credentials. Leaving any switch disabled keeps the production gateway closed.

### Step 19: Donation simulation

Open `http://localhost:3000/donate` to complete the local demonstration. The fake gateway
creates a persisted donation and redirects to `/donate/simulated`, where it can be confirmed,
failed, or cancelled. Confirmation generates a PDF test receipt in MinIO and sends its link
to Mailpit (`http://localhost:8025`). No card, bank, PayPal, Telebirr, or CBE information is
requested, stored, or transmitted.

The simulation API is:

- `POST /api/v1/public/donations`
- `GET /api/v1/public/donations/:id`
- `POST /api/v1/public/donations/:id/cancel`
- `POST /api/v1/test/payments/:id/confirm`
- `POST /api/v1/test/payments/:id/fail`

The `/test/payments` controller is registered only for `NODE_ENV=test` or when
`TRIAL_MODE=true` outside production. Production rejects `TRIAL_MODE=true` during startup
and independently omits these routes. Repeating a confirmation uses the same fake event ID:
the database accepts it once, returns `duplicate: true` thereafter, and sends only one email.

### Step 20: Redis caching and health

Public settings, navigation, published CMS pages, published events, and gallery results use
Redis cache-aside reads with short TTLs. PostgreSQL remains authoritative: a cache miss or
Redis outage runs the original repository query, and a Redis write or invalidation failure
never rolls back a successful database mutation. Mutations increment a namespace version,
making every older key in that content area immediately unreachable.

`GET /api/v1/system/health` reports `checks.postgresql` and `checks.redis` independently and
uses `status: degraded` when either dependency is unavailable. Super administrators can use
`POST /api/v1/admin/cache/clear` to invalidate all application namespaces and
`POST /api/v1/admin/cache/warm` to prefill settings and English/Amharic navigation. Redis is
started by local Compose but is not a hard backend startup dependency, so the API continues
to serve database-backed content during an outage.

### Step 21: Complete OpenAPI contract

Swagger UI at `http://localhost:8000/api/v1/docs` now documents request DTO fields,
validation constraints, success envelopes, reusable pagination metadata, and the standard
error envelope. Every operation receives a tag, summary, and response contract. Protected
administrator routes show the `admin-jwt` bearer requirement, while scheduled internal jobs
show the `X-Internal-API-Key` requirement.

The media and gallery upload operations describe their `multipart/form-data` fields and
binary file part. The PayPal webhook operation documents all five required signature
headers. Trial confirmation and failure operations are identified as local-only simulation
routes and document their idempotency and terminal-state responses. The E2E suite validates
the generated document, resolves component references, and asserts these representative
security, request, upload, webhook, pagination, and response schemas.

### Step 22: Demonstration content features

The backend now includes the content needed to exercise a complete frontend without adding
the deferred enterprise features:

- `/api/v1/public/blog` serves only published posts; administrators can create, edit,
  publish, and delete posts under `/api/v1/admin/blog`.
- `/api/v1/public/content/homepage` and `/api/v1/public/content/faqs` compose the published
  `home` and `faq` CMS pages. Homepage sections and FAQ items are stored in each page's
  structured `metadata`; CMS pages and blogs carry bounded SEO title, description, and image
  fields.
- `/api/v1/public/search?q=support` searches published CMS pages, events, and blog posts
  directly in PostgreSQL. No external indexing account is required.
- `/api/v1/public/resources` lists published downloads. A request to
  `/api/v1/public/resources/:id/download` atomically increments the persisted counter and
  returns the local file metadata.
- `/api/v1/public/events/:slug/calendar.ics` downloads a standards-compatible calendar
  event for published events.

Blog and resource services follow the repository interfaces described above. Their
administrative create, update, publish, and delete operations write the acting administrator's
audit record in the same PostgreSQL transaction as the content mutation.

Migration `0007_add_demo_content_features.sql` adds blog posts, resources, and CMS SEO
columns. Earlier migrations and snapshots remain unchanged. External search services, reminder
emails, recurring donations, MFA/OAuth, and paid monitoring remain
explicitly deferred.

Migration `0008_add_search_trigram_indexes.sql` enables PostgreSQL `pg_trgm` and adds GIN
indexes for the CMS, event, and blog fields searched by `/api/v1/public/search`. Search remains
fully local to PostgreSQL; no external indexing service or paid account is required.

### Step 23: Administrator session dashboard

Super administrators can inspect active, revoked, expired, or all administrator sessions with
pagination and optional administrator filtering. Responses expose a short IP-hash fingerprint
for device comparison, but never expose refresh-token hashes, raw tokens, raw IP addresses, or
token-family identifiers.

The revoke endpoint accepts exactly one `sessionId` or `adminId`. A session target terminates
one device; an administrator target terminates every non-revoked session for that account.
Successful changes and their `REVOKE` or `REVOKE_ALL` audit records are committed in one
PostgreSQL transaction. Migration `0009_add_auth_session_active_index.sql` adds the partial
index used by active-session dashboard queries.

### Step 24: Secure password reset

Password recovery does not reveal whether an administrator email exists. Reset requests always
return the same public message and are limited to three attempts per IP every 15 minutes. For
an active account, the backend sends a Mailpit message containing a frontend reset URL whose
token expires after 20 minutes.

Only a SHA-256 token hash is stored in `password_reset_tokens`; the raw 256-bit token exists
only in the email URL. Issuing a new token deletes earlier unused tokens. Confirmation claims
the token with one conditional PostgreSQL update, so expired, reused, invalid, and concurrent
losing requests receive the same generic error. The confirmation transaction changes the
bcrypt password hash, clears login lockout state, revokes all existing sessions, and inserts a
token-free `PASSWORD_RESET / ADMIN` audit event. If email delivery fails, the exact newly
issued token is deleted. Migration `0010_add_password_reset_tokens.sql` creates the token table,
foreign key, unique hash constraint, and administrator/expiration indexes.

### Step 25: Dedicated SEO endpoints

SEO remains part of each CMS page rather than becoming a second content store. Public clients
can request `GET /api/v1/public/seo/:slug?languageCode=en`; the response contains only the
slug, language, resolved SEO title, description, normalized keyword array, and image URL for a
currently published page. Draft content and general CMS metadata are never returned. When no
SEO title exists, the page title is used; missing keywords return an empty array.

`SUPER_ADMIN` and `CONTENT_EDITOR` roles can update one language variant through
`PATCH /api/v1/admin/seo/:slug`. Titles are limited to 70 characters, descriptions to 160,
and keyword arrays to ten unique, lowercase entries of at most 40 characters. Image URLs must
use HTTPS or the configured local MinIO location. The CMS update and its
`UPDATE_SEO / CMS_PAGE` audit event share one PostgreSQL transaction, and successful changes
invalidate the CMS cache. Migration `0011_add_cms_seo_keywords.sql` adds the authoritative
typed `seo_keywords` array without rewriting any previous migration or snapshot.

### Step 26: PostgreSQL search-index rebuild

`SUPER_ADMIN` can run `POST /api/v1/admin/system/search/reindex` to rebuild the seven trigram
indexes used by public CMS, event, and blog search. The endpoint accepts no table, index, or
SQL input; its allowlist is compiled into the maintenance repository. Each index is rebuilt
with `REINDEX INDEX CONCURRENTLY`, allowing normal searches to continue during maintenance.

One dedicated PostgreSQL pool client owns both a session advisory lock and the rebuild
commands. A second request receives `409 Conflict` while that lock is held. After all seven
indexes succeed, the service writes a `REINDEX / SEARCH` audit event containing the fixed
index list, start/completion timestamps, and duration. Failed or conflicting rebuilds are not
recorded as successful. No migration is added for this step because migration
`0008_add_search_trigram_indexes.sql` already created the required indexes.

## Production Deployment

```bash
# On your VPS
git clone <your-repo>
cd nehemiah
cp backend/.env.example backend/.env   # fill prod values
cp frontend/.env.example frontend/.env # fill prod values

# Start with Traefik SSL
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml build media-backup media-backup-verify
docker compose -f docker-compose.prod.yml up -d
```

Production uses Traefik for automatic SSL via Let's Encrypt. Update `yourdomain.com` and `your@email.com` in `docker-compose.prod.yml`.

The production Traefik dashboard is disabled and no infrastructure dashboard is routed through
the public reverse proxy. Application logs remain available over SSH with
`docker compose -f docker-compose.prod.yml logs backend`.

Dozzle is an optional operations profile. When temporary browser-based log inspection is
needed, start it on the VPS with:

```bash
docker compose -f docker-compose.prod.yml --profile ops up -d dozzle
```

Dozzle binds only to the VPS loopback interface. Reach it through an authenticated SSH tunnel,
not through a public DNS record:

```bash
ssh -L 8080:127.0.0.1:8080 <user>@<vps-host>
```

Then open `http://127.0.0.1:8080` locally. When the investigation is complete, stop and remove
the optional container with
`docker compose -f docker-compose.prod.yml --profile ops rm --stop --force dozzle`.
Never change the binding to `0.0.0.0` or add a public Traefik router without adding strong
authentication and an IP allowlist or VPN.

### Production backups and restore verification

The production stack starts two free scheduled backup services by default:

- `postgres-backup` creates a compressed custom-format `pg_dump`;
- `media-backup` creates a timestamped snapshot of the configured S3-compatible
  `STORAGE_BUCKET`, including MinIO or R2.

Both run immediately at startup and then every `BACKUP_INTERVAL_SECONDS` seconds. The default
is daily, retention defaults to 14 days, and every snapshot receives SHA-256 integrity data.
No database password or object-storage secret is written to the backup files or logs.

Backups are written beneath `${BACKUP_HOST_PATH:-./backups}` on the host. The repository ignores
the local default directory. For an actual production deployment, set `BACKUP_HOST_PATH` in the
VPS shell to a separately mounted encrypted disk or NAS path so the only backup is not stored on
the same physical disk as PostgreSQL. Replicate that mount to a second off-host location
according to the organization's retention policy.

Check recent backup activity with:

```bash
find "${BACKUP_HOST_PATH:-./backups}" -name .last-success -print
docker compose -f docker-compose.prod.yml logs postgres-backup media-backup
```

At least monthly, verify that the newest backups can be restored:

```bash
docker compose -f docker-compose.prod.yml --profile backup-verify run --rm postgres-backup-verify
docker compose -f docker-compose.prod.yml --profile backup-verify run --rm media-backup-verify
```

PostgreSQL verification restores into a temporary database whose name must end in
`_restore_verify`. Media verification restores into a temporary bucket whose name must end in
`-restore-verify`. The scripts reject the live database or bucket name, validate the restored
schema or object count, and remove the temporary target afterward. A failed verification must
be investigated before older snapshots expire.

### Controlled concurrency benchmark

The documented 500–1,000 concurrent-user target is measured with the repeatable k6 profile in
`performance/k6/concurrency.js`. The profile exercises liveness plus representative cached and
PostgreSQL-backed public reads. It ramps to the requested virtual-user count, holds that
concurrency, and then ramps down. Each virtual user pauses for one second between requests to
represent an active visitor rather than an unlimited request flood.

Start the isolated benchmark stack and run the default 500-user profile:

```bash
docker compose -f docker-compose.benchmark.yml up -d --build backend
docker compose -f docker-compose.benchmark.yml --profile benchmark run --rm k6
```

Run the upper 1,000-user profile:

```bash
docker compose -f docker-compose.benchmark.yml --profile benchmark run --rm \
  -e TARGET_VUS=1000 k6
```

For a quick script and environment smoke test, shorten the stages without treating the result as
capacity evidence:

```bash
docker compose -f docker-compose.benchmark.yml --profile benchmark run --rm \
  -e TARGET_VUS=10 -e RAMP_DURATION=5s -e HOLD_DURATION=10s \
  -e RAMP_DOWN_DURATION=5s k6
```

The benchmark fails when more than 1% of checks or requests fail, when p95 exceeds 750 ms, or
when p99 exceeds 1,500 ms. Run it on hardware representative of the intended deployment and
retain the complete k6 summary with the hardware, container limits, commit SHA, date, and profile.
The isolated backend keeps the real throttling guard installed but raises its single-IP ceiling
through benchmark-only environment variables; normal development and production defaults remain
100 requests per minute per IP. HTTP 429 responses therefore fail the benchmark instead of being
mistaken for successful capacity.

Remove the isolated containers and temporary PostgreSQL/Redis data afterward:

```bash
docker compose -f docker-compose.benchmark.yml --profile benchmark down --volumes
```

## Environment Variables

See [backend/.env.example](backend/.env.example) and [frontend/.env.example](frontend/.env.example) for all available config options.

# NAC-trial

Full-stack monorepo — Next.js frontend + NestJS backend with PostgreSQL, Redis, MinIO, and Mailpit.

## License

This repository is proprietary. All rights are reserved by the project owner unless a separate
written license is provided.

## Tech Stack

| Layer    | Tech                                                         |
| -------- | ------------------------------------------------------------ |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS v4, shadcn/ui |
| Backend  | NestJS, Fastify, Drizzle ORM, Repository Pattern             |
| Database | PostgreSQL 16                                                |
| Cache    | Redis 7                                                      |
| Storage  | S3-compatible: MinIO (dev); MinIO or Cloudflare R2 in production (`STORAGE_DRIVER`) |
| Mail     | SMTP (production) / Mailpit (dev)                            |
| Testing  | Vitest + Playwright (frontend) / Jest + Supertest (backend)  |
| CI/CD    | GitHub Actions → GHCR → VPS deploy                           |
| Infra    | Docker Compose (dev + prod), Traefik (prod SSL)              |

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
docker compose up -d --build --wait

# Create bootstrap settings, then populate the trial website.
# Set SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, and SEED_ADMIN_PASSWORD in backend/.env
# first, or db:seed creates no administrator and /admin stays unreachable.
docker compose exec backend pnpm db:seed
docker compose exec backend pnpm db:seed:demo
```

The backend applies pending migrations before its development server starts. The two seed commands
are deliberately separate and idempotent: `db:seed` creates production-safe global settings and an
administrator only when explicit `SEED_ADMIN_*` values are configured; `db:seed:demo` adds local
demonstration content. Open <http://localhost:3000> after both commands complete. Do not run the demo
seed in production.

### Run without Docker

> The `.env.example` templates address services by their Docker names (`postgres`,
> `redis`, `mailpit`, `minio`). When running without Docker, point them at your own
> services instead — for example `DATABASE_URL=postgresql://user:pass@localhost:5432/db`,
> `REDIS_HOST=localhost`, `MAIL_HOST=localhost`. (The bundled Docker Postgres publishes
> host port 5433, not 5432.)

```bash
# Backend (after starting PostgreSQL, Redis, MinIO, and Mailpit)
cd backend
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm db:seed:demo
pnpm dev

# Frontend (in a second terminal)
cd frontend
pnpm install
pnpm dev
```

## Service URLs (Development)

| Service  | URL                          | Purpose            |
| -------- | ---------------------------- | ------------------ |
| Frontend | http://localhost:3000        | Next.js app        |
| Backend  | http://localhost:8000/api/v1 | NestJS API         |
| pgAdmin  | http://localhost:5050        | Postgres GUI       |
| MinIO UI | http://localhost:9001        | Object storage GUI |
| Mailpit  | http://localhost:8025        | Email catcher UI   |
| Postgres | localhost:5433               | Database (host port) |
| Redis    | localhost:6379               | Cache              |

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
├── .github/workflows/ # CI/CD pipelines
├── docker-compose.yml          # Dev environment
└── docker-compose.prod.yml     # Production (Traefik + GHCR)
```

## Scripts

### Root

| Command             | Description                   |
| ------------------- | ----------------------------- |
| `pnpm dev`          | Start all services via Docker |
| `pnpm dev:frontend` | Run frontend only             |
| `pnpm dev:backend`  | Run backend only              |
| `pnpm build`        | Build all Docker images       |
| `pnpm test`         | Run all tests                 |
| `pnpm lint`         | Lint both apps                |

### Frontend (`cd frontend`)

| Command             | Description                                             |
| ------------------- | ------------------------------------------------------- |
| `pnpm dev`          | Start dev server                                        |
| `pnpm build`        | Production build                                        |
| `pnpm test`         | Run unit tests (Vitest)                                 |
| `pnpm test:e2e`     | Run E2E tests (Playwright)                              |
| `pnpm lint`         | Lint with ESLint                                        |
| `pnpm format`       | Format with Prettier                                    |
| `pnpm api:generate` | Regenerate the OpenAPI snapshot and TypeScript contract |
| `pnpm api:check`    | Fail when generated API artifacts are stale             |

Browser and server feature requests use a contract-aware client derived from the generated
OpenAPI `paths` type. Unknown endpoint or HTTP-method combinations therefore fail TypeScript
compilation. Feature Zod schemas remain the runtime trust boundary because generated types cannot
validate network JSON. Trial-only payment simulation paths are the sole bounded exception because
the backend intentionally omits those development-only controllers from production OpenAPI.

Public requests resolve the document language from a valid `lang` query first and the persisted
language cookie second. Middleware passes that normalized value into the server-rendered root
layout, so initial HTML, no-JavaScript clients, crawlers, and assistive technology receive the
correct `html[lang]` before hydration. English-only administrator and coming-soon routes always
declare English.

### Backend (`cd backend`)

| Command                        | Description                               |
| ------------------------------ | ----------------------------------------- |
| `pnpm dev`                     | Start with watch mode                     |
| `pnpm build`                   | Build for production                      |
| `pnpm test`                    | Run unit tests (Jest)                     |
| `pnpm test:e2e`                | Run E2E tests                             |
| `pnpm openapi:lint`            | Generate and validate OpenAPI             |
| `pnpm db:generate`             | Generate migration from schema diff       |
| `pnpm db:migrate`              | Apply pending migrations                  |
| `pnpm db:check`                | Check migration history consistency       |
| `pnpm db:studio`               | Open Drizzle Studio (visual DB)           |
| `pnpm db:seed`                 | Seed the database                         |
| `pnpm db:seed:demo`            | Seed the complete local trial content set |
| `pnpm db:check:launch-content` | Verify required bilingual launch content  |
| `pnpm lint`                    | Lint with ESLint                          |
| `pnpm format`                  | Format with Prettier                      |

## API Contract

The backend-generated OpenAPI document is the only cross-application API contract. There is no
parallel hand-maintained shared-types package. This avoids allowing a TypeScript interface to drift
away from the route that actually runs.

After changing a backend controller, DTO, response schema, or route:

```bash
cd backend
pnpm openapi:generate

cd ../frontend
pnpm api:generate
```

The frontend generator reads `backend/dist/openapi.json`, commits a reviewable snapshot at
`frontend/openapi/openapi.json`, and writes `frontend/src/lib/api/generated.ts`. Feature clients use
the generated OpenAPI `paths` type for endpoint, method, request, and response compatibility. Zod
schemas remain the runtime validation boundary for untrusted network JSON. Never edit either
generated artifact by hand. CI runs `pnpm api:check` and fails when they are stale.

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

| Method | Endpoint                               | Purpose                                                                 |
| ------ | -------------------------------------- | ----------------------------------------------------------------------- |
| POST   | `/api/v1/auth/login`                   | Authenticate an administrator                                           |
| POST   | `/api/v1/auth/refresh`                 | Rotate a valid refresh token                                            |
| POST   | `/api/v1/auth/logout`                  | Revoke the supplied session                                             |
| GET    | `/api/v1/auth/me`                      | Return the current administrator                                        |
| POST   | `/api/v1/auth/password-reset/request`  | Request generic reset instructions                                      |
| POST   | `/api/v1/auth/password-reset/confirm`  | Consume a single-use reset token                                        |
| GET    | `/api/v1/admin/system/sessions`        | List administrator sessions (`SUPER_ADMIN`)                             |
| POST   | `/api/v1/admin/system/sessions/revoke` | Revoke one session or all sessions for an administrator (`SUPER_ADMIN`) |

To create the first super administrator, set `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, and `SEED_ADMIN_PASSWORD`, then run `pnpm db:seed` from `backend/`. Seed credentials are never given default values, and an existing administrator is never overwritten.

For a local trial environment, run `pnpm db:seed:demo` after migrations and the bootstrap seed.
This separate, idempotent seed creates:

- published English and Amharic homepage, about, FAQ, contact, and volunteer CMS pages, including
  structured hero, services, location/map, call-to-action, mission, history, service, FAQ, and
  volunteer-role data;
- draft English and Amharic team pages with no fictional names, biographies, or claims;
- four published blog translations, six published event translations covering upcoming and past
  events, and four published testimonial translations;
- four local media/gallery records with bilingual trial labels; and
- two downloadable bilingual trial resources.

The local MinIO initializer copies the matching image and resource files into the public bucket, so
downloads and gallery images work without external storage. Every sample file and gallery
description identifies itself as trial content that must be replaced before launch. The seed
creates an inactive technical content author with no usable login credential, never creates a
default administrator, and leaves existing records unchanged when run again. Demonstration content
is not part of the production bootstrap seed and must not be used as authoritative launch content.

The seed creates English and Amharic `team` pages as drafts with no people, biographies, or
unsupported claims. Content editors must enter NAC-approved bilingual team records through the
typed CMS editor and explicitly publish both pages. Run `pnpm db:check:launch-content` before a
production release. It fails when either language lacks required published pages, the homepage
map, mission/history/services composition, volunteer roles, approved team biographies, resources,
media, or gallery content. This makes missing organizational approval a visible release blocker
instead of encouraging fictional public content.

The Step 39 frontend provides the shared private administrator workspace under `/admin`.
Navigation and client-side route gating derive from one permission map for `SUPER_ADMIN`,
`CONTENT_EDITOR`, and `FINANCE_VIEWER`; the backend still independently authorizes every API
request. The responsive shell includes desktop and mobile navigation, breadcrumbs, page titles,
global mutation feedback, and explicit confirmation for destructive actions. Dashboard cards call
only APIs available to the current role: content editors receive contact and event counts, finance
viewers receive donation statistics, and super administrators receive analytics and donation
summaries. An API-level `403` renders a controlled access-denied state.

Step 40 adds CMS and SEO administration for super administrators and content editors. The CMS
workspace provides URL-backed language/status filters, pagination, slug checks, draft creation,
editing, immediate publishing, and future scheduling. Schedule inputs use the administrator's
local date and time and are converted to ISO timestamps before the API request. Published-page
edits visibly return the content to draft, matching the backend transaction rule. Homepage and FAQ
metadata use structured editors, while generic preview content passes through the existing
text-only sanitization policy. Published generic CMS slugs are rendered at `/:slug`; this route
uses only the published-page API, applies the same text-only sanitization, respects the language
query, and returns the public not-found page for drafts or missing content. Dedicated application
routes such as `/blog`, `/events`, and `/admin` retain precedence. The separate SEO workspace
applies the backend limits of 70 title
characters, 160 description characters, ten normalized keywords of at most 40 characters, and a
2,048-character HTTPS or approved-local-MinIO image URL. Failed mutations do not reset editor
state, so unsaved CMS and SEO input remains available for correction or retry.

Step 41 adds localized navigation and global public-settings administration. Super administrators
and content editors can manage English and Amharic navigation independently, reorder items, and
control public visibility; deletion remains restricted to super administrators. Global site name,
enabled/default languages, contact details, and HTTPS social links are editable only by a super
administrator. Every successful mutation invalidates the matching backend Redis cache and the
frontend query cache, so the public header and footer refetch authoritative data. Social links are
stored as typed JSON in `site_settings.social_links`, introduced by migration `0012`; they are no
longer hard-coded in the public footer.

Step 42 completes the content-operations workspace for media, gallery, blog, resources, and events.
Multipart media and gallery uploads validate type and size before transmission and display real
browser upload progress. Blog and resource publishing keep drafts visually separate from public
content, and editing a published blog post visibly returns it to draft. Event administration
supports localized date/time editing, RSVP review, protected CSV export, and public iCalendar
downloads. Editors can create, update, and publish content; permanent deletion controls are shown
only to super administrators, matching backend authorization. Resource records reference files
uploaded through the approved media-storage workflow and never accept browser-local file paths.

Step 43 separates private engagement work into `/admin/contact`, `/admin/volunteers`,
`/admin/testimonials`, and `/admin/newsletter`. Contact submissions and volunteer applications
support search, language/status filters, pagination, and authorized review; permanent deletion is
restricted to super administrators. Content editors can create, edit, publish, and delete localized
testimonials, while newsletter subscriber management is visible only to super administrators.
Personal information remains in authenticated component memory only: it is never placed in browser
storage, frontend query keys, analytics payloads, client logs, or mutation feedback. Newsletter
removal uses the backend's existing email-keyed route, but the address is confined to that protected
request and backend logs record the route template rather than the path value.

Step 44 adds finance and analytics administration without presenting trial records as real
income. `SUPER_ADMIN` and `FINANCE_VIEWER` can filter and paginate donation demonstrations,
inspect a record, prepare or resend its test receipt, review confirmed-record statistics, and
download a filtered CSV. Runtime information places a permanent trial banner above these values
and labels confirmed amounts as simulations rather than collected funds. Analytics remains
restricted to `SUPER_ADMIN` and displays page views, form submissions by workflow, resource
downloads, donation status counts, simulated confirmed values by currency, top dimensions, and
UTC daily trends. Every visual bar includes a numeric label and an accompanying visible data
table, so meaning never depends on color or graphics alone.

Step 45 completes the super-administrator security and operations workspace. `/admin/users`
enforces the backend's self-deletion and final-active-super-administrator protections;
`/admin/audit-logs` displays only bounded, allowlisted metadata; and `/admin/sessions` exposes safe
device summaries without token hashes, raw IP addresses, or token-family identifiers. Revoking a
current session causes the next rejected API refresh to clear the protected frontend state and
return to login. `/admin/system` reports API liveness, PostgreSQL readiness, Redis degradation, and
version/adapters independently. Audited cache clear/warm and allowlisted search reindex operations
require confirmation, disable duplicate submissions while running, and explain PostgreSQL search
maintenance conflicts returned as HTTP 409.

Step 46 completes public discoverability, anonymous measurement, and enforceable performance
budgets. Published CMS SEO data drives localized canonical, Open Graph, Twitter, and
English/Amharic alternate metadata; published articles and events add schema.org Article/Event
data, while the public shell supplies Organization data. `sitemap.xml` obtains dynamic blog and
event routes only from published public APIs, and `robots.txt` excludes administrator, API,
compatibility-login, and dashboard paths. Search results and simulated checkout pages explicitly
remain out of the index.

The public layout records anonymous route views on a best-effort basis. Its payload contains only
`page_view`, a normalized local pathname, and a coarse mobile/tablet/desktop class. Query strings,
fragments, referrers, cookies, form values, administrator routes, and identifiers are never sent;
analytics timeout or failure does not affect page content. Chart and CMS/blog/SEO editor code is
split into route-specific chunks. Next Image serves AVIF/WebP with responsive sizes and a bounded
cache, and the two bundled Google font families include only their used Latin subset and weights.

Next.js applies a security-header policy to every public, authentication, and administrator
response. Its CSP denies framing and plugins, limits API and media connections to configured
origins, permits frames only from the same Google domains accepted by map validation, and keeps
fonts local. Production removes the development-only `unsafe-eval` and WebSocket allowances and
adds HSTS and insecure-request upgrading. Inline scripts and styles remain explicitly allowed for
the Next.js runtime, JSON-LD, and generated styles; all other script and style origins remain
blocked. Responses also disable MIME sniffing and browser capabilities that the site does not use.

After `pnpm build`, run `pnpm performance:check` from `frontend/` to enforce optimized chunk
budgets in CI. Then run `pnpm lighthouse:ci`; its launcher starts the mock API and production
frontend server and performs three audits of the home, About, Blog, and Events routes. CI runs these
audits immediately after `pnpm build`, before any Playwright development server can replace the
`.next` directory. The Lighthouse launcher also refuses to start unless `BUILD_ID` and the
production server manifests exist, turning an invalid build into an immediate actionable failure
instead of a server-start timeout. CI requires at least 0.90 for performance,
accessibility, best practices, and SEO. Its reports are retained as build artifacts. Resource and
responsive-image budgets are enforced during the same measured run rather than inferred from the
configuration file.

Step 47 adds a final, isolated full-stack quality gate. The existing Vitest/Testing Library and
mock Playwright suites remain fast feedback; MSW now verifies loading, availability, duplicate
submission, and forbidden-role behavior at the network boundary, while Axe scans implemented
public/authentication pages for serious or critical accessibility regressions. Unit coverage is
reported as text, JSON, and LCOV and enforced in CI alongside dependency audit, API-contract
drift, lint, type checking, production build, bundle budgets, and the complete mock browser suite.
The frontend production dependency audit fails CI at moderate severity or higher. Patched
transitive PostCSS, Nanoid, Babel, and Sharp releases are pinned through pnpm overrides until the
supported Next.js line adopts them directly; there are currently no advisory exceptions. Any
future temporary exception must identify the advisory, document the exposure and mitigation, name
an owner, and include an expiry date rather than weakening the global threshold.
The dedicated Axe project scans English and Amharic public journeys plus authentication routes and
fails on every moderate, serious, or critical violation. Windows CI also compares the approved
desktop and mobile screenshots because the checked-in baselines were produced on Windows and font
rasterization is platform-specific.

`docker-compose.e2e.yml` is deliberately separate from development Compose. It uses an in-memory
PostgreSQL database named exactly `nehemiah_e2e`, non-persistent Redis and MinIO data, Mailpit,
trial payments, and five deterministic test-only accounts. The E2E seed refuses to run against any
other database name. The stack never reads development volumes, never enables real payments, and
is removed with its named test-result volume after CI. A dedicated Playwright image installs the
locked frontend dependencies during its build, so the runner never mutates the mounted repository.

Run the complete free local stack and its real Playwright journeys with one command from the
repository root:

```bash
docker compose -f docker-compose.e2e.yml up --build \
  --abort-on-container-exit --exit-code-from playwright-e2e playwright-e2e
```

Set `E2E_TEST_SCOPE=smoke` before that command to run only the tagged seven-test pull-request
gate. With the default `all` scope, the suite also verifies automatic scheduled publishing,
draft-to-public SEO, engagement and finance review, password recovery through a real Mailpit
message, per-device session revocation, Redis cache maintenance, search reindexing, and advisory
lock conflict handling. Pull requests use the smoke scope in CI; pushes to `main` and
`Backend/Features` run the extended scope.

Always remove its disposable containers and volumes afterward (the database name and Compose
project guard make this command specific to E2E data):

```bash
docker compose -f docker-compose.e2e.yml down --volumes --remove-orphans
```

For interactive inspection, start through `frontend-e2e` in detached mode and open
`http://localhost:3100`; the E2E API, Mailpit, and MinIO consoles are bound to loopback ports
8100, 8027, and 9101. The disposable logins all use `E2eStrongPassword123!`:

- `e2e-super@nehemiah.test`
- `e2e-editor@nehemiah.test`
- `e2e-finance@nehemiah.test`
- `e2e-recovery@nehemiah.test` (dedicated password-reset account)
- `e2e-security@nehemiah.test` (isolated session-revocation administrator)

The browser coverage matrix is layered intentionally: every implemented public/admin page has
mocked success plus relevant loading, empty, validation, unavailable, forbidden, or destructive
states in `frontend/tests/e2e` and approved desktop/mobile snapshots in
`frontend/tests/visual`; `frontend/tests/fullstack` then verifies representative bilingual,
search/download, RSVP, engagement, simulated-donation, role, and system-health journeys against
real PostgreSQL, Redis, MinIO, and Mailpit adapters. The real-service role suite additionally
creates and publishes CMS content as an editor and updates settings and warms cache as a super
administrator. The extended suite covers the stateful security, publishing, SEO, finance, cache,
and search-maintenance workflows that cannot be proven by mocked browser tests, while the tagged
smoke suite keeps pull-request feedback bounded.

## Authorization and Audit

Private administration endpoints require both a valid access JWT and an explicitly allowed database-backed role. Administrator account management and audit-log access are restricted to `SUPER_ADMIN`.

| Method | Endpoint                   | Required role | Purpose                     |
| ------ | -------------------------- | ------------- | --------------------------- |
| GET    | `/api/v1/admin/users`      | `SUPER_ADMIN` | List administrator accounts |
| POST   | `/api/v1/admin/users`      | `SUPER_ADMIN` | Create an administrator     |
| GET    | `/api/v1/admin/users/:id`  | `SUPER_ADMIN` | Read an administrator       |
| PATCH  | `/api/v1/admin/users/:id`  | `SUPER_ADMIN` | Update an administrator     |
| DELETE | `/api/v1/admin/users/:id`  | `SUPER_ADMIN` | Delete an administrator     |
| GET    | `/api/v1/admin/audit-logs` | `SUPER_ADMIN` | Search immutable audit logs |

Administrator create, update, and delete operations write their audit records in the same database transaction. Login and logout events are also recorded. Password hashes, raw tokens, and raw IP addresses are never included in audit metadata.

The final active super administrator cannot be demoted, deactivated, or deleted. Administrators also cannot delete their own account.

## Content Management

Step 5 adds the first complete content-management slice. English and Amharic pages share a
`translationKey`, while each language keeps its own unique slug and content. Authors work in
drafts, can publish immediately, or schedule future publication. Editing published content
returns it to draft so unreviewed changes never become public automatically.

| Method | Endpoint                                     | Access                        | Purpose                           |
| ------ | -------------------------------------------- | ----------------------------- | --------------------------------- |
| GET    | `/api/v1/public/pages/:slug?languageCode=en` | Public                        | Read a published page             |
| GET    | `/api/v1/admin/slugs/check`                  | Editor or super administrator | Check localized slug availability |
| GET    | `/api/v1/admin/cms/pages`                    | Editor or super administrator | List and filter pages             |
| POST   | `/api/v1/admin/cms/pages`                    | Editor or super administrator | Create a draft                    |
| PATCH  | `/api/v1/admin/cms/pages/:id`                | Editor or super administrator | Edit a page                       |
| POST   | `/api/v1/admin/cms/pages/:id/publish`        | Editor or super administrator | Publish immediately               |
| POST   | `/api/v1/admin/cms/pages/:id/schedule`       | Editor or super administrator | Schedule publication              |
| DELETE | `/api/v1/admin/cms/pages/:id`                | Editor or super administrator | Delete a page                     |

Navigation has public localized reads and protected management endpoints under
`/api/v1/admin/navigation`. Public site settings are available at `/api/v1/settings`; only a
super administrator can update them at `/api/v1/admin/settings`. All content, navigation, and
settings mutations write an audit record in the same database transaction.

Scheduled CMS publishing runs automatically inside every API process at startup and then every
`SCHEDULED_PUBLISHING_INTERVAL_MS` milliseconds (60 seconds by default). A PostgreSQL advisory
lock ensures that only one process publishes a batch when Node clustering or multiple API
replicas are active. The publication changes and `AUTO_PUBLISH` audit records remain in one
database transaction, and CMS cache invalidation follows successful batches.

Set `SCHEDULED_PUBLISHING_ENABLED=false` only when an external scheduler deliberately owns this
job. The protected `POST /api/v1/internal/jobs/publish-scheduled` endpoint remains available for
manual recovery or external orchestration and uses the same advisory lock. It requires the
`x-internal-api-key` header; configure a separate, randomly generated `INTERNAL_API_KEY` of at
least 32 characters in production. Scheduler database failures are logged and retried at the
next interval without stopping the API.

## Media Library

Step 6 provides CMS asset storage through the S3-compatible API shared by Cloudflare R2 and
local MinIO. The API accepts JPEG, PNG, GIF, WebP, MP4, WebM, and PDF files. It verifies both
the declared MIME type and the file signature, generates the object key server-side, limits
each request to one bounded file, and requires accessibility alt text for images.

| Method | Endpoint                     | Required role                 | Purpose                  |
| ------ | ---------------------------- | ----------------------------- | ------------------------ |
| GET    | `/api/v1/admin/media`        | Editor or super administrator | Search and filter assets |
| POST   | `/api/v1/admin/media/upload` | Editor or super administrator | Upload an asset          |
| DELETE | `/api/v1/admin/media/:id`    | `SUPER_ADMIN`                 | Delete an asset          |

Uploads use `multipart/form-data` with a required `file` and optional `languageCode`,
`altText`, `caption`, and `folder` fields. `altText` is mandatory for images. Configure the
`STORAGE_*` variables for Cloudflare R2 in production; the example values target MinIO during
local development. Set `STORAGE_PUBLIC_URL` to the public CDN or custom-domain base URL.

Media and gallery deletion never removes an object before its database records. The metadata
deletion, immutable audit event, and unique `storage_deletion_outbox` job share one PostgreSQL
transaction. After commit, an asynchronous worker deletes the object idempotently and marks the
job complete. Temporary MinIO/R2 failures retry with exponential backoff and stale processing
locks are recoverable. Configure this worker with `STORAGE_DELETION_WORKER_*`; it is enabled by
default outside tests. Migration `0015_add_storage_deletion_outbox.sql` adds the durable queue
without modifying earlier migrations or snapshots.

The frontend gallery accepts media only from explicit origins. `NEXT_PUBLIC_STORAGE_ORIGIN`
is the browser-visible MinIO or storage origin, while optional `NEXT_PUBLIC_MEDIA_HOSTS` is a
comma-separated allowlist of production CDN origins. In Docker, set `MEDIA_IMAGE_ORIGIN` to
the container-reachable storage origin (the default is `http://minio:9000`) so the Next.js
image optimizer can load MinIO objects without exposing that internal hostname to browsers.
Keep these origins exact; paths and wildcard hostnames are intentionally not accepted.

## Contact Form

Step 7 composes the public Contact page from the published `contact` CMS page and global site
settings, so editors do not maintain the same address and phone number in multiple places.
Public submissions are validated, normalized, rate-limited to five requests per minute per
client, and stored without IP addresses or user-agent fingerprints.

| Method | Endpoint                    | Access                        | Purpose                         |
| ------ | --------------------------- | ----------------------------- | ------------------------------- |
| GET    | `/api/v1/public/contact`    | Public                        | Read localized contact content  |
| POST   | `/api/v1/public/contact`    | Public, rate-limited          | Submit a contact message        |
| GET    | `/api/v1/admin/contact`     | Editor or super administrator | Search and list submissions     |
| DELETE | `/api/v1/admin/contact/:id` | `SUPER_ADMIN`                 | Permanently delete a submission |

The public request accepts `name`, `email`, `message`, optional `subject`, and optional
`languageCode` (`en` or `am`). Deletion is audited without copying the sender's personal data
into audit metadata. Submission persistence and a `CONTACT_SUBMISSION_EMAIL` outbox entry share
one PostgreSQL transaction. The asynchronous worker forwards the message to the validated
`CONTACT_NOTIFICATION_EMAIL` mailbox, so a temporary SMTP outage never causes a successfully
stored contact request to be rejected. The outbox payload contains only the submission ID;
personal data remains in the authoritative contact row.

## Volunteer Engagement

Step 8 completes the volunteer-page engagement workflow. The localized page body comes from
the published `volunteer` CMS page. Applications and newsletter subscriptions are validated,
normalized, rate-limited, and stored without network identifiers. Duplicate newsletter
signup returns the same success response, preventing account enumeration.

| Method | Endpoint                          | Access                        | Purpose                        |
| ------ | --------------------------------- | ----------------------------- | ------------------------------ |
| GET    | `/api/v1/public/volunteer`        | Public                        | Read volunteer-page content    |
| POST   | `/api/v1/public/volunteer/apply`  | Public, rate-limited          | Submit a volunteer application |
| GET    | `/api/v1/admin/volunteers`        | Editor or super administrator | Review applications            |
| DELETE | `/api/v1/admin/volunteers/:id`    | `SUPER_ADMIN`                 | Delete an application          |
| GET    | `/api/v1/public/testimonials`     | Public                        | Read published testimonials    |
| GET    | `/api/v1/admin/testimonials`      | Editor or super administrator | Review all testimonials        |
| POST   | `/api/v1/admin/testimonials`      | Editor or super administrator | Create a testimonial           |
| PATCH  | `/api/v1/admin/testimonials/:id`  | Editor or super administrator | Edit or publish a testimonial  |
| DELETE | `/api/v1/admin/testimonials/:id`  | Editor or super administrator | Delete a testimonial           |
| POST   | `/api/v1/public/newsletter`       | Public, rate-limited          | Subscribe an email address     |
| GET    | `/api/v1/admin/newsletter`        | `SUPER_ADMIN`                 | List subscribers               |
| DELETE | `/api/v1/admin/newsletter/:email` | `SUPER_ADMIN`                 | Remove a subscriber            |

The Step 37 frontend connects `/contact` and `/volunteer` to these public APIs. Contact and
volunteer CMS content is server-rendered, testimonials are validated as published before
display, and the Google map is loaded only after explicit user activation. Contact,
volunteer, and newsletter forms use duplicate-submission guards and controlled validation,
rate-limit, and availability messages. Submitted personal information remains only in form
memory until it is posted in the request body; it is never placed in URLs, browser storage,
analytics events, or client logs. Volunteer opportunities are stored as bounded structured CMS
records, displayed as role cards, and offered as explicit choices in the application form.
`db:seed:demo` includes bilingual contact and volunteer pages, structured trial roles, and
published trial testimonials for local end-to-end demonstrations.

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

| Method | Endpoint                                   | Access                        | Purpose                       |
| ------ | ------------------------------------------ | ----------------------------- | ----------------------------- |
| GET    | `/api/v1/public/events`                    | Public                        | List published events         |
| GET    | `/api/v1/public/events/:slug`              | Public                        | Read a localized event        |
| GET    | `/api/v1/public/events/:slug/calendar.ics` | Public                        | Download an iCalendar event   |
| POST   | `/api/v1/public/events/:id/rsvp`           | Public, rate-limited          | Submit an RSVP                |
| GET    | `/api/v1/admin/events`                     | Editor or super administrator | Manage event inventory        |
| POST   | `/api/v1/admin/events`                     | Editor or super administrator | Create an event               |
| PATCH  | `/api/v1/admin/events/:id`                 | Editor or super administrator | Update an event               |
| DELETE | `/api/v1/admin/events/:id`                 | `SUPER_ADMIN`                 | Delete an event and its RSVPs |
| GET    | `/api/v1/admin/events/:id/rsvps`           | Editor or super administrator | Review RSVPs                  |
| GET    | `/api/v1/admin/events/:id/rsvps/export`    | Editor or super administrator | Export RSVP CSV               |

Use `languageCode=en|am` for localized reads and `timeframe=upcoming|past|all` for event lists.
RSVP closes when an event ends and personal RSVP data is never returned by public routes.
Calendar-file generation is implemented by the public `.ics` endpoint. Automated reminder
emails remain a separate future slice.

## Gallery

Step 11 adds a localized public gallery backed by the existing secure media pipeline. Gallery
uploads accept validated images and videos only; file signatures must match declared MIME
types, image alternative text is mandatory, and objects are stored under the `gallery`
namespace in the configured R2 or MinIO bucket.

| Method | Endpoint                    | Access                        | Purpose                          |
| ------ | --------------------------- | ----------------------------- | -------------------------------- |
| GET    | `/api/v1/public/gallery`    | Public                        | List localized images and videos |
| POST   | `/api/v1/admin/gallery`     | Editor or super administrator | Upload a gallery item            |
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

| Method | Endpoint                           | Access               | Purpose                                   |
| ------ | ---------------------------------- | -------------------- | ----------------------------------------- |
| POST   | `/api/v1/public/analytics/events`  | Public, rate-limited | Record an anonymous event                 |
| GET    | `/api/v1/admin/analytics/summary`  | `SUPER_ADMIN`        | Read total page views and top dimensions  |
| GET    | `/api/v1/admin/analytics/timeline` | `SUPER_ADMIN`        | Read a 1-, 7-, or 30-day visitor timeline |

The ingestion body accepts `eventType` (`page_view`, `click`, or `submit`), a local `pageUrl`,
`deviceType`, and optional `referrer`. Country is accepted only from Cloudflare's
`CF-IPCountry` request header; clients cannot submit it in the body. In this anonymous model,
the documented `totalVisitors` and daily `visitors` values represent page-view counts rather
than uniquely identified people. The administrator read model also aggregates authoritative
records from contact submissions, volunteer applications, newsletter subscriptions, event RSVPs,
resource download logs, and donations; it does not copy those records into the anonymous event
stream. Summary responses include form totals by workflow, total and top resource downloads,
download countries, donation status counts, and confirmed simulated values separated into USD and
ETB. Timeline responses use UTC day buckets for page views, forms, resource downloads, donation
creation/confirmation counts, and confirmed simulated values. Decimal money values are returned as
strings to preserve database precision, and the interface never describes trial values as collected
funds.

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
registered route template, status context, duration, and request correlation only—never bodies,
tokens, credentials, query strings, or concrete route-parameter values. Unmatched routes receive
defensive email and newsletter-identifier redaction before logging.

## Testing, API Documentation, and Deployment

Step 14 formalizes the release pipeline:

- `pnpm test` runs isolated service, guard, policy, and payment-contract unit tests.
- `pnpm test:e2e` boots the real Fastify application against the dedicated PostgreSQL test
  database. It verifies successful JWT login, refresh rotation, logout and revocation,
  role boundaries, public-data privacy, every implemented vertical slice, CORS, rate limits,
  request limits, security headers, OpenAPI, and smoke behavior. Object storage and payments
  are deterministic simulations; the combined security gate uses only the local Mailpit
  container and never contacts a paid or hosted service.
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
# Run only the Step 27 cross-feature security journey when iterating on these four slices.
pnpm test:e2e:security
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
production backend image, and then runs that exact image twice against an empty disposable
PostgreSQL database. The image-level gate verifies that the packaged migration journal and every
SQL migration are present, that the complete chain applies successfully, and that rerunning it is
idempotent. CI then verifies the frontend. Production deployment is manual,
restricted to `main`, and protected by the GitHub `production` environment. Configure
`PROD_HOST`, `PROD_USER`, `PROD_SSH_KEY`, and `PROD_APP_PATH` before running it. Also configure the
production environment variables `PROD_API_URL` (including `/api/v1`), `PROD_SITE_URL`,
`PROD_MEDIA_ORIGIN`, and optional `PROD_MEDIA_HOSTS`. The frontend image validates these as
non-local HTTPS URLs before `next build`; its browser chunks are then scanned so a localhost API,
site, or media fallback cannot be published. The workflow
builds immutable SHA-tagged images, runs migrations and the idempotent first-administrator
seed as one-off containers, and then performs the Compose rollout.

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

| Secret          | Description                              |
| --------------- | ---------------------------------------- |
| `PROD_HOST`     | Production VPS IP                        |
| `PROD_USER`     | SSH user for production                  |
| `PROD_SSH_KEY`  | SSH private key for production           |
| `PROD_APP_PATH` | Checkout path of this repository on the VPS |

Image pushes authenticate with the workflow's built-in `GITHUB_TOKEN`; no personal
access token is needed.

### Required GitHub Variables

Set these as repository **variables** (not secrets); the frontend image build fails
without them:

| Variable            | Description                                   |
| ------------------- | --------------------------------------------- |
| `PROD_API_URL`      | Public API origin including `/api/v1`         |
| `PROD_SITE_URL`     | Public site origin                            |
| `PROD_MEDIA_ORIGIN` | Public media origin                           |
| `PROD_MEDIA_HOSTS`  | Extra media hostnames (optional)              |

## Free Local Trial Runtime

Copy `backend/.env.example` to `backend/.env`, then start the complete local stack:

```bash
docker compose up --build
```

The trial stack uses PostgreSQL, MinIO object storage, Mailpit SMTP, Redis, and the fake
payment gateway. Mailpit is available at `http://localhost:8025` and the MinIO console at
`http://localhost:9001`. The API health and version endpoints identify `mode: trial` and
list the selected adapters. Fake checkouts persist donation workflows but cannot collect
money or contact PayPal, Telebirr, or CBE. Trial records use the explicit `SIMULATED`
gateway label in the database, API responses, receipts, dashboards, and CSV exports.

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

The frontend independently verifies `/api/v1/system/version` and gateway discovery before
enabling the flow. Trial confirmation and failure controls render only when the backend reports
trial mode, a non-production environment, the fake adapter, and real payments disabled. The form
requests only a donor name, email, amount, currency, and optional message; it never requests card
or bank details. The checkout URL contains only the donation ID, so refreshing it reloads the
existing donation instead of creating another one. When no eligible gateway is available, the
page presents a controlled unavailable state without submitting donor information.

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

`pnpm openapi:lint` generates the runtime document into the ignored `backend/dist` directory
and validates it independently with Redocly's recommended rules. CI runs this external gate
after the internal test suite; missing path-parameter declarations and strict license metadata
therefore fail validation outside the project-owned validator as well.

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
  `/api/v1/public/resources/:id/download` atomically increments the persisted counter, inserts
  an append-only download log, and returns the local file metadata. Logs contain only the
  resource, a validated two-letter country code when supplied by Cloudflare, and the download
  timestamp; raw IP addresses and detailed location data are never stored.
- `/api/v1/public/events/:slug/calendar.ics` downloads a standards-compatible calendar
  event for published events.

Blog and resource services follow the repository interfaces described above. Their
administrative create, update, publish, and delete operations write the acting administrator's
audit record in the same PostgreSQL transaction as the content mutation.

Migration `0007_add_demo_content_features.sql` adds blog posts, resources, and CMS SEO
columns. Earlier migrations and snapshots remain unchanged. External search services, reminder
emails, recurring donations, MFA/OAuth, and paid monitoring remain
explicitly deferred.

Migration `0014_add_resource_download_logs.sql` adds the download-log table, country check,
resource foreign key, and reporting/retention indexes without rewriting prior migrations. Logs
are retained for 365 days by default and cleaned asynchronously once per day. Configure the
bounded policy with `RESOURCE_DOWNLOAD_LOG_RETENTION_DAYS`,
`RESOURCE_DOWNLOAD_LOG_CLEANUP_INTERVAL_MS`, and
`RESOURCE_DOWNLOAD_LOG_CLEANUP_ENABLED`. Resource deletion cascades its logs, so the configured
period is a maximum rather than a minimum retention guarantee.

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

Local SMTP delivery uses Nodemailer rather than a hand-written socket parser, so fragmented and
multiline SMTP responses are handled by a maintained protocol implementation. Connection,
greeting, and idle-socket deadlines are configured independently with
`MAIL_CONNECTION_TIMEOUT_MS`, `MAIL_GREETING_TIMEOUT_MS`, and `MAIL_SOCKET_TIMEOUT_MS`.
File- and URL-based message attachments are disabled; current reset and simulated-receipt emails
remain plain-text messages delivered only to the configured local Mailpit service.

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

### Step 27: Combined security and regression verification

`pnpm test:e2e:security` runs one continuous controller-level journey across Steps 23–26. It
logs a super administrator in from two simulated devices, lists and revokes one session,
checks both access- and refresh-token rejection, retrieves a real password-reset message from
the disposable Mailpit container, changes the password, and proves all remaining sessions are
revoked. The recovered administrator then updates SEO on a draft page, verifies the draft is
private, publishes it, rebuilds the seven PostgreSQL search indexes, confirms public search
still finds the page, and inspects the associated audit records for secret leakage.

The standard `docker-compose.test.yml` profile supplies only disposable PostgreSQL and Mailpit
services. `TEST_MAIL_HOST`, `TEST_MAIL_PORT`, and `TEST_MAILPIT_API_URL` identify those
host-side test endpoints; they are separate from the application container's normal
`MAIL_HOST` setting. GitHub Actions provides the same two free services before running the
canonical `pnpm test:ci` gate. OpenAPI assertions explicitly cover public password recovery,
super-administrator session management, public/admin SEO, and protected search maintenance.

This completes the JWT-based trial backend scope. Better Auth remains a future alternative
authentication implementation, not a second active authentication stack. Real PayPal,
Telebirr, and CBE collection also remains disabled; trial donations continue to use the fake
gateway and never request or store card or bank credentials.

Administrative receipt resends and public contact notifications use the PostgreSQL
`notification_outbox`. Type-specific in-process workers claim due rows with
`FOR UPDATE SKIP LOCKED`, send through the configured SMTP adapter, and record `SENT` only after
SMTP acceptance. Transient failures return to `PENDING` with exponential backoff; exhausted or
invalid items become `FAILED`. Stale `PROCESSING` claims are recoverable after the configured
lock timeout, and deterministic SMTP Message-IDs make retries idempotent for receivers that
support Message-ID deduplication. Configure the workers with `OUTBOX_WORKER_*`; they are enabled
by default outside tests. Set `CONTACT_NOTIFICATION_EMAIL` to the center mailbox that should
receive contact-form messages; production startup rejects missing or invalid values.

## Production Deployment

```bash
# On your VPS
git clone <your-repo>
cd nehemiah
cp .env.production.example .env.production
cp backend/.env.production.example backend/.env.production
cp frontend/.env.production.example frontend/.env.production
# Replace every example domain, credential, and secret before continuing.

# Start with Traefik SSL
docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml build media-backup media-backup-verify

# Apply database migrations, then create the first administrator. The seed reads
# SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, and SEED_ADMIN_PASSWORD from
# backend/.env.production, never overwrites an existing administrator, and does
# nothing when they are unset. Remove them from the file after the first run.
docker compose --env-file .env.production -f docker-compose.prod.yml --profile bootstrap run --rm migrate
docker compose --env-file .env.production -f docker-compose.prod.yml --profile bootstrap run --rm seed

docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

Production uses Traefik for automatic SSL via Let's Encrypt. Domains, the ACME email, image tags,
and the public media origin come from the ignored root `.env.production` file. Compose forces the
application containers to use production mode, disables trial-payment routes and Swagger, disables
real payment collection, and supplies HTTPS public origins. Values in `backend/.env.production` or
`frontend/.env.production` cannot override those safety controls. Backend startup also rejects production
trial mode, Swagger, localhost public origins, weak secrets, and insecure public URLs.

The production Traefik dashboard is disabled and no infrastructure dashboard is routed through
the public reverse proxy. Application logs remain available over SSH with
`docker compose --env-file .env.production -f docker-compose.prod.yml logs backend`.

Uptime Kuma runs continuously but its administration interface binds only to the VPS loopback
interface and is explicitly disabled in Traefik. Reach it through an authenticated SSH tunnel:

```bash
ssh -L 3001:127.0.0.1:3001 <user>@<vps-host>
```

Then open `http://127.0.0.1:3001` locally. The supplied stack does not publish a public status
page. If one is required later, expose only Uptime Kuma's separately configured read-only status
page; keep its administration interface restricted to loopback, an allowlisted VPN, or another
authenticated private operations network.

Dozzle is an optional operations profile. When temporary browser-based log inspection is
needed, start it on the VPS with:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml --profile ops up -d dozzle
```

Dozzle binds only to the VPS loopback interface. Reach it through an authenticated SSH tunnel,
not through a public DNS record:

```bash
ssh -L 8080:127.0.0.1:8080 <user>@<vps-host>
```

Then open `http://127.0.0.1:8080` locally. When the investigation is complete, stop and remove
the optional container with
`docker compose --env-file .env.production -f docker-compose.prod.yml --profile ops rm --stop --force dozzle`.
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
docker compose --env-file .env.production -f docker-compose.prod.yml logs postgres-backup media-backup
```

At least monthly, verify that the newest backups can be restored:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml --profile backup-verify run --rm postgres-backup-verify
docker compose --env-file .env.production -f docker-compose.prod.yml --profile backup-verify run --rm media-backup-verify
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

Identical cache misses are coalesced in-process, so one public cache key can run at most one
PostgreSQL loader at a time per API instance. Joined callers receive the same result, and a
rejected loader is removed immediately so a later request can retry. Event-list queries record
pool acquisition time, query duration, queue depth, and pool utilization when pressure is high;
database acquisition/query failures are returned as a controlled `503 Service Unavailable`.
Production and benchmark modes sample successful access logs and aggregate slow-request counts
and maximum latency into one bounded warning per time window, preventing container-log volume
from becoming the measured bottleneck while preserving pressure telemetry.

The API supports bounded Node cluster concurrency through `WEB_CONCURRENCY` (1–16, default 1).
The isolated benchmark uses two workers so a multi-core container does not force all 1,000
connections through one JavaScript event loop. The primary process replaces an unexpectedly
exited worker and forwards shutdown signals for graceful Nest shutdown. Size deployments from
measured CPU capacity; remember that the 20-connection PostgreSQL pool is per worker, so two
workers can open at most 40 database connections. In-process cache single-flight is also scoped
per worker, while Redis remains the shared cache and PostgreSQL remains authoritative.

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

GitHub Actions also provides the manually dispatched **Backend performance gate** workflow.
Choose `both` before a release to execute the complete 500- and 1,000-user profiles. It is kept
separate from the normal push/PR gate because shared runners are noisy and the full check takes
about seven minutes; retain results from hardware representative of the intended deployment.

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

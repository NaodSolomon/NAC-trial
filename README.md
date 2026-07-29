# NAC-trial

Full-stack monorepo — Next.js frontend + NestJS backend with PostgreSQL, Redis, MinIO, and Mailpit.

Tech Stack
Layer	Tech
Frontend	Next.js 15, React 19, TypeScript, Tailwind CSS v4, shadcn/ui
Backend	NestJS, Fastify, Drizzle ORM, Repository Pattern
Database	PostgreSQL 16
Cache	Redis 7
Storage	MinIO (dev) / Cloudflare R2 (prod)
Mail	Mailpit (dev)
Testing	Vitest + Playwright (frontend) / Jest + Supertest (backend)
CI/CD	GitHub Actions → GHCR → VPS deploy
Infra	Docker Compose (dev + prod), Traefik (prod SSL)
Quick Start
Prerequisites
Node.js 20+
pnpm 9+
Docker & Docker Compose
Setup
# Clone and enter
git clone <your-repo-url>
cd nehemiah

# Copy env files
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# Start everything (Postgres, Redis, MinIO, Mailpit, backend, frontend)
docker compose up
Run without Docker
# Frontend (requires backend services running)
cd frontend && pnpm install && pnpm dev

# Backend (requires Postgres + Redis)
cd backend && pnpm install && pnpm dev
Service URLs (Development)
Service	URL	Purpose
Frontend	http://localhost:3000	Next.js app
Backend	http://localhost:8000/api/v1	NestJS API
pgAdmin	http://localhost:5050	Postgres GUI
MinIO UI	http://localhost:9001	Object storage GUI
Mailpit	http://localhost:8025	Email catcher UI
Redis	localhost:6379	Cache
pgAdmin login: admin@admin.com / admin MinIO login: minioadmin / minioadmin

Project Structure
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
Scripts
Root
Command	Description
pnpm dev	Start all services via Docker
pnpm dev:frontend	Run frontend only
pnpm dev:backend	Run backend only
pnpm build	Build all Docker images
pnpm test	Run all tests
pnpm lint	Lint both apps
Frontend (cd frontend)
Command	Description
pnpm dev	Start dev server
pnpm build	Production build
pnpm test	Run unit tests (Vitest)
pnpm test:e2e	Run E2E tests (Playwright)
pnpm lint	Lint with ESLint
pnpm format	Format with Prettier
Backend (cd backend)
Command	Description
pnpm dev	Start with watch mode
pnpm build	Build for production
pnpm test	Run unit tests (Jest)
pnpm test:e2e	Run E2E tests
pnpm db:generate	Generate migration from schema diff
pnpm db:migrate	Apply pending migrations
pnpm db:push	Push schema directly (dev only)
pnpm db:studio	Open Drizzle Studio (visual DB)
pnpm db:seed	Seed the database
pnpm lint	Lint with ESLint
pnpm format	Format with Prettier
Shared Types
Both apps use @shared/* path alias to import from shared/types/:

import type { ApiResponse, BaseUser, PaginatedResponse } from '@shared/types';
Backend Architecture
The backend uses Drizzle ORM with the Repository Pattern:

Module
├── controllers/    # HTTP layer — route handlers
├── services/       # Business logic — depends on repository interface
├── repositories/   # Data access — Drizzle implementation
├── dto/            # Data transfer objects (class-validator)
└── interfaces/     # Repository contracts
Database schemas are defined in src/database/schema/ using Drizzle's pgTable() builder. Services depend on repository interfaces, not implementations. Repositories are injected via NestJS DI using tokens.

CI/CD
PR Flow
Push feature branch → open PR targeting main
CI runs lint + tests + build for both apps (checks only, no deploy)
Prod Flow
Merge PR into main
Docker images auto-built and pushed to GHCR
Auto-deploys to production VPS via SSH
Required GitHub Secrets
Secret	Description
PROD_HOST	Production VPS IP
PROD_USER	SSH user for production
PROD_SSH_KEY	SSH private key for production
GHCR_TOKEN	GitHub PAT with write:packages scope
Production Deployment
# On your VPS
git clone <your-repo>
cd nehemiah
cp backend/.env.example backend/.env   # fill prod values
cp frontend/.env.example frontend/.env # fill prod values

# Start with Traefik SSL
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
Production uses Traefik for automatic SSL via Let's Encrypt. Update yourdomain.com and your@email.com in docker-compose.prod.yml.

Environment Variables
See backend/.env.example and frontend/.env.example for all available config options.

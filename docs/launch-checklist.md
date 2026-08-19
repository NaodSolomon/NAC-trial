# Launch Checklist

Every step needed to take the Nehemiah Autism Center website from this repository
to a live production site. Items are ordered — several later steps fail loudly (by
design) if an earlier one was skipped. Nothing here changes code.

## 1. Accounts and services to arrange first

- [ ] **A VPS** (2+ GB RAM) with Docker and Docker Compose installed, reachable by SSH.
- [ ] **Two DNS records** pointing at the VPS: the site domain (e.g. `www.example.org`)
      and the API domain (e.g. `api.example.org`). HTTPS certificates are issued
      automatically by Let's Encrypt on first start — no certificate work needed.
- [ ] **S3-compatible object storage** (Cloudflare R2 or any S3 service):
  - [ ] Create a bucket and an access key with read/write on it.
  - [ ] Make the bucket **publicly readable** (objects only).
  - [ ] Decide the **public media hostname** (e.g. `https://media.example.org`) —
        **final before the first upload**: uploaded files store their full URL, and
        changing the hostname later breaks every image already uploaded.
- [ ] **An SMTP provider** (Brevo, SendGrid, Amazon SES, a Google Workspace
      relay…): a verified sender address plus SMTP host, port, username and password.
      Password reset and contact notifications depend on this.

## 2. Generate the secrets

Four **different** values, each at least 32 characters (startup refuses weak,
reused, or placeholder-looking values):

```bash
openssl rand -base64 48   # run four times
```

- [ ] `JWT_ACCESS_SECRET` — [ ] `JWT_REFRESH_SECRET` — [ ] `IP_HASH_SECRET` — [ ] `INTERNAL_API_KEY`
- [ ] A strong `DATABASE_PASSWORD` / `POSTGRES_PASSWORD` (same value in both files below).

## 3. GitHub configuration (repository → Settings)

**Secrets** (Actions → Secrets):

- [ ] `PROD_HOST` — the VPS address
- [ ] `PROD_USER` — the SSH user
- [ ] `PROD_SSH_KEY` — the SSH private key
- [ ] `PROD_APP_PATH` — where the repo is cloned on the VPS

**Variables** (Actions → Variables) — the frontend image build fails without them:

- [ ] `PROD_API_URL` — `https://api.example.org/api/v1` (the `/api/v1` suffix is required)
- [ ] `PROD_SITE_URL` — `https://www.example.org`
- [ ] `PROD_MEDIA_ORIGIN` — the public media origin from step 1
- [ ] `PROD_MEDIA_HOSTS` — extra media hostnames, if any (optional)

**Environment**: create a `production` environment (Settings → Environments); the
deploy workflow runs inside it.

## 4. On the VPS

```bash
git clone <repository> && cd <repository>   # at PROD_APP_PATH
cp .env.production.example .env.production
cp backend/.env.production.example backend/.env.production
cp frontend/.env.production.example frontend/.env.production
```

Fill in all three files — every `example.org`, credential and secret. Highlights:

- [ ] Root file: `SITE_DOMAIN`, `API_DOMAIN`, `ACME_EMAIL`, `MEDIA_PUBLIC_ORIGIN`,
      `POSTGRES_*`, and pin `BACKEND_IMAGE` / `FRONTEND_IMAGE` to the SHA tags the
      deploy workflow prints (nothing publishes `:latest`).
- [ ] Backend file: the four secrets, `DATABASE_URL`, `STORAGE_*` (from step 1),
      `MAIL_DRIVER=smtp` with `MAIL_HOST` / `MAIL_PORT` / `MAIL_USER` /
      `MAIL_PASSWORD` / `MAIL_SECURE` / `MAIL_FROM`, `CONTACT_NOTIFICATION_EMAIL`,
      and `SEED_ADMIN_NAME` / `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
      (12+ characters) for the first administrator.
- [ ] If the site should answer on both `example.org` and `www.example.org`, list
      both in `FRONTEND_URL`, comma-separated — requests from an unlisted origin
      are rejected.
- [ ] `BACKUP_HOST_PATH` → a mount on **separate storage**; by default backups
      land on the same disk as the database, which protects against mistakes but
      not against disk loss.

## 5. First deployment

- [ ] Merge the reviewed branch into `main` and let CI pass.
- [ ] Start the **Production deployment** workflow (Actions → run manually). It
      builds SHA-tagged images, runs migrations, runs the idempotent
      first-administrator seed, and rolls out. *(The manual runbook in the README
      does the same by hand.)*
- [ ] After the first successful run, **remove the `SEED_ADMIN_*` lines** from
      `backend/.env.production`. The seed never overwrites an existing
      administrator, but credentials should not sit in a file.

## 6. Verify before announcing

- [ ] `https://api.example.org/api/v1/system/health/ready` returns OK.
- [ ] Sign in at `https://www.example.org/admin` with the seeded administrator.
- [ ] **Send a real email**: use *Forgot password?* and confirm the reset mail
      arrives — this is the first true test of the SMTP settings.
- [ ] Upload one image on the **Media** screen and open its URL — this is the
      first true test of the storage bucket and public origin.
- [ ] Fill in **Settings** (contact details, opening hours, donations notice) and
      publish the homepage — until then visitors see the "being prepared" page,
      which is the intended pre-content state.
- [ ] Enter the launch content per the [Content Manager Guide](./content-manager-guide.md);
      `pnpm db:check:launch-content` (from `backend/`) verifies the minimum set
      exists in both languages before you point the real domain at the site.
- [ ] Change the seeded administrator's password from the admin **Administrators**
      screen, and create personal accounts for each editor rather than sharing one.

## 7. After launch

- [ ] Run the backup **restore verification** once (`backup-verify` profile — see
      the README's backup runbook) so the first restore isn't attempted during an
      emergency.
- [ ] Ops dashboards (Uptime Kuma, Dozzle) are reachable only through an SSH
      tunnel by design; bookmark the README's commands.
- [ ] Deploys remain manual: merge to `main`, then run the workflow. Each deploy
      re-runs migrations and the (no-op) seed safely.

## Deliberately off at launch

Online payments are disabled (`PAYMENTS_ENABLED=false` is forced by the compose
file); the donate page shows the managed notice instead. Enabling real payment
collection is a separate future project, not a configuration switch.

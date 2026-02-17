# Monthly Expenses Web

Next.js + Supabase app to replace a Numbers monthly budget sheet.

## Progress So Far (February 16, 2026)

### Completed

- App account system implemented (`app_users` + `app_sessions`) with secure password hashing and cookie sessions.
- User-scoped data model implemented for:
  - accounts
  - months
  - outgoings (expenses)
  - transfers
- Full CRUD APIs implemented for months, outgoings, transfers, and accounts.
- Auth APIs implemented:
  - sign up
  - log in
  - log out
  - get/update profile display name
- Core pages implemented:
  - `/` monthly overview + month creation + outgoing entry + transfer summary
  - `/outgoings` outgoing management (add/edit/delete)
  - `/accounts` account management (add/edit/delete)
  - `/transfers` transfer management (add/edit/delete)
- Docker support implemented for dev and prod profiles.
- Health endpoint implemented: `GET /api/health`.

### Current gaps

- No automated test suite yet.
- No CI pipeline configured yet.

## Setup

### 1) Create Supabase schema

1. Create a Supabase project.
2. In Supabase SQL Editor, run:
   - `supabase/schema.sql`

### 2) Configure environment variables

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3) Optional: assign legacy data

If data was created before app login was added:

1. Create your account from the app login screen first.
2. Update email inside `supabase/assign_legacy_data_to_user.sql`.
3. Run that SQL script in Supabase.

## Run Locally

### Option A: Docker dev (recommended)

```bash
docker compose --profile dev up --build
```

App URL: `http://localhost:3000`

### Option B: Node.js

```bash
npm install
npm run dev
```

## Production Deployment (Ubuntu + Nginx + Certbot)

This project is designed to run the app container on loopback only and let Nginx handle TLS:
- App container: `127.0.0.1:3000`
- Public HTTPS: Nginx on `443`

### 1) Server baseline and firewall

Run once on Ubuntu:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx ufw
sudo systemctl enable --now docker nginx
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

### 2) Deploy app into `/opt/mcgfinance`

```bash
sudo mkdir -p /opt/mcgfinance
sudo chown "$USER":"$USER" /opt/mcgfinance
git clone <your-repo-url> /opt/mcgfinance
cd /opt/mcgfinance
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
chmod 640 .env.local
sudo docker compose --profile prod up --build -d
```

`app-prod` is published as `127.0.0.1:3000:3000` in `docker-compose.yml`.

### 3) Configure Nginx reverse proxy (hardened)

1. Copy `deploy/nginx/mcgfinance.conf.example` to `/etc/nginx/sites-available/mcgfinance.conf`.
2. Domain is set to `finance.mcg.scot` in the template (change if needed).
3. Enable the site and reload:

```bash
sudo ln -s /etc/nginx/sites-available/mcgfinance.conf /etc/nginx/sites-enabled/mcgfinance.conf
sudo nginx -t
sudo systemctl reload nginx
```

### 4) Issue/attach TLS certificate with Certbot

If this domain does not already have a cert:

```bash
sudo certbot --nginx -d finance.mcg.scot
```

Certbot will install the cert paths and configure renewal. Verify:

```bash
sudo certbot renew --dry-run
```

### 5) Verify

```bash
curl -I https://finance.mcg.scot/api/health
sudo docker compose --profile prod ps
sudo docker compose --profile prod logs -f app-prod
```

### 6) Update process

```bash
cd /opt/mcgfinance
git pull
sudo docker compose --profile prod up --build -d
```

### Security notes

- Production container now runs as a non-root user (`Dockerfile`).
- Keep `.env.local` private (`chmod 640` or stricter).
- Only expose ports `80/443` publicly; app stays loopback-only on `127.0.0.1:3000`.
- Keep Ubuntu packages and Docker image updated.

## Git Workflow And Prod Deploy

Branch model:
- `main`: production branch (server deploys this branch only).
- `codex/dev`: local/dev branch for localhost work.

Recommended flow:
1. Do all development on `codex/dev`.
2. Open PR `codex/dev -> main`.
3. Merge PR after review/checks.
4. GitHub Actions deploy runs automatically on push to `main`.

This repo includes `.github/workflows/deploy-prod.yml` for production deploys to `/opt/mcgfinance`.

Required GitHub repository secrets:
- `PROD_SSH_HOST`: Ubuntu server hostname or IP.
- `PROD_SSH_USER`: deploy user on server.
- `PROD_SSH_PORT`: usually `22`.
- `PROD_SSH_KEY`: private SSH key for deploy user.
- `PROD_SSH_KNOWN_HOSTS`: output from `ssh-keyscan -H <host>`.

Server requirement:
- Deploy user must have access to `/opt/mcgfinance` and permission to run `docker compose` (typically via `docker` group).

## API Endpoints

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/auth/me`

### Months

- `GET /api/months`
- `POST /api/months`
- `PUT /api/months/:id`
- `DELETE /api/months/:id`

### Outgoings (Expenses)

- `GET /api/expenses?month_id=<uuid>`
- `POST /api/expenses`
- `PUT /api/expenses/:id`
- `DELETE /api/expenses/:id`

### Transfers

- `GET /api/transfers?month_id=<uuid>`
- `POST /api/transfers`
- `PUT /api/transfers/:id`
- `DELETE /api/transfers/:id`

### Accounts

- `GET /api/accounts`
- `POST /api/accounts`
- `PUT /api/accounts/:code`
- `DELETE /api/accounts/:code`

### Health

- `GET /api/health`

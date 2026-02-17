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

## Run Production (behind Nginx)

```bash
docker compose --profile prod up --build -d
```

Requirements:
- Nginx should reverse proxy to `127.0.0.1:3000`.
- `app-prod` binds to loopback only: `127.0.0.1:3000:3000`.
- Configure TLS certificates in Nginx (for example with Certbot).

## Deploy on Ubuntu Server (Docker)

```bash
git clone <your-repo-url>
cd mcgfinance
cp .env.example .env.local
# fill env values
sudo docker compose --profile prod up --build -d
```

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

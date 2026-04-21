# Traffic Distribution System (Docker-first)

This project is designed to run fully with Docker Compose.

If you want the fastest, most reliable start:

```bash
docker compose up --build
```

Then open:

- App: `http://localhost:8081`
- Backend health: `http://localhost:8081/api/health`

---

## 1) Prerequisites

Install:

- Docker Engine
- Docker Compose (v2, `docker compose`)

Check:

```bash
docker --version
docker compose version
```

---

## 2) First-time setup

From project root:

```bash
cp .env.example .env
docker compose up --build
```

That is enough for local development.  
The stack includes:

- `nginx` (entrypoint on host port `8081` by default)
- `frontend` (Next.js dev server)
- `backend` (Laravel API)
- `worker` (queue worker)
- `scheduler` (Laravel scheduler)
- `db` (MySQL 8.4)
- `redis` (Redis 7)

---

## 3) Access URLs

Default URLs:

- **Main app (recommended):** `http://localhost:8081`
- Frontend direct: `http://localhost:3000`
- Backend direct (inside compose network only exposed via nginx): `http://localhost:8000` (container-internal)
- Backend health via nginx: `http://localhost:8081/api/health`
- MySQL on host: `127.0.0.1:3307` (`tds` / `tds`, root password `tds`)
- Redis on host: `127.0.0.1:6378`

---

## 4) Verify everything is healthy

In another terminal:

```bash
docker compose ps
```

Expected:

- `tds-backend` -> `healthy`
- `tds-frontend` -> `healthy`
- `tds-db` -> `healthy`
- `tds-nginx`, `tds-worker`, `tds-scheduler`, `tds-redis` -> `Up`

Quick endpoint checks:

```bash
curl -i http://localhost:8081/api/health
curl -i http://localhost:8081/api/internal/v1/traffic-sources
```

Notes:

- `/api/health` should return `200`.
- `/api/internal/v1/traffic-sources` returns `401` before login (this is expected).

---

## 5) Auth + protected endpoint smoke test

Register:

```bash
curl -s -X POST http://localhost:8081/api/internal/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Dev User","email":"devuser@example.com","password":"password123"}'
```

Login and extract token:

```bash
TOKEN=$(curl -s -X POST http://localhost:8081/api/internal/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"devuser@example.com","password":"password123"}' \
  | php -r '$j=json_decode(stream_get_contents(STDIN), true); echo $j["data"]["token"] ?? "";')
echo "$TOKEN"
```

Call protected endpoints:

```bash
curl -i http://localhost:8081/api/internal/v1/me \
  -H "Authorization: Bearer $TOKEN"

curl -i http://localhost:8081/api/internal/v1/traffic-sources \
  -H "Authorization: Bearer $TOKEN"
```

---

## 6) Run seeders

Seeders run inside the `backend` container.

Run default seeders (`DatabaseSeeder`):

```bash
docker compose exec backend php artisan db:seed
```

Run a specific seeder:

```bash
docker compose exec backend php artisan db:seed --class=PhaseOneCoreSeeder
docker compose exec backend php artisan db:seed --class=SyntheticEventSeeder
docker compose exec backend php artisan db:seed --class=KpiAggregationSeeder
```

Fresh migration + seed (drops all tables first):

```bash
docker compose exec backend php artisan migrate:fresh --seed
```

Run Taboola sync manually (same command used by scheduler):

```bash
docker compose exec backend php artisan tds:sync-taboola
```

Run with custom date window:

```bash
docker compose exec backend php artisan tds:sync-taboola --from=2026-04-01 --to=2026-04-21
```

Optional idempotency key (safe retries):

```bash
docker compose exec backend php artisan tds:sync-taboola \
  --from=2026-04-01 --to=2026-04-21 --idempotency-key=manual-sync-20260421
```

---

## 7) Generate traffic data manually

If you want dashboard/report data quickly for local testing, use one of these methods.

### Option A (recommended): one command demo dataset

This seeds core data + synthetic events + KPI aggregation:

```bash
docker compose exec backend php artisan tds:seed-phase1
```

After this, dashboard/report endpoints should return non-empty data.

### Option B: trigger public tracking flow with curl

1) Find a campaign slug:

```bash
docker compose exec backend php artisan tinker --execute="echo \App\Models\Campaign::query()->value('slug');"
```

2) Generate redirects/clicks:

```bash
SLUG="replace-with-campaign-slug"
curl -i "http://localhost:8081/api/campaign/${SLUG}"
curl -i "http://localhost:8081/api/click?campaign=${SLUG}&sid=manual-us-desktop"
curl -i "http://localhost:8081/api/click?campaign=${SLUG}&sid=manual-fr-mobile"
```

3) Rebuild KPI aggregates from raw events:

```bash
docker compose exec backend php artisan tds:aggregate-kpi
```

4) Verify KPI endpoint:

```bash
TOKEN=$(curl -s -X POST http://localhost:8081/api/internal/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"devuser@example.com","password":"password123"}' \
  | php -r '$j=json_decode(stream_get_contents(STDIN), true); echo $j["data"]["token"] ?? "";')

curl -i "http://localhost:8081/api/internal/v1/reports/kpi" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 8) Common issues and fixes

### Port already in use (nginx)

If you see:

`failed to bind host port ... :80` or `:8081`

run with a different nginx host port:

```bash
NGINX_PORT=8090 docker compose up --build
```

Then open `http://localhost:8090`.

### Need a clean DB reset

If migrations/data got into a bad state:

```bash
docker compose down -v
docker compose up --build
```

### Watch logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx
```

### Stop stack

```bash
docker compose down
```

---

## 9) Notes for developers

- Backend migrations run automatically on backend container start.
- Frontend API calls use `/api/internal/*` and are proxied correctly through nginx/Next.js.
- Redis queue + scheduler are started automatically (`worker`, `scheduler` services).

If all services are up and healthy, you should be able to use the app and all API endpoints through the nginx URL.

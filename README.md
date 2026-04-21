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

## 6) Common issues and fixes

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

## 7) Notes for developers

- Backend migrations run automatically on backend container start.
- Frontend API calls use `/api/internal/*` and are proxied correctly through nginx/Next.js.
- Redis queue + scheduler are started automatically (`worker`, `scheduler` services).

If all services are up and healthy, you should be able to use the app and all API endpoints through the nginx URL.

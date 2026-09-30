# 17 — Quickstart

## 1. Prerequisites

- Docker Desktop
- Git
- Python 3.11+ for local development if not containerized
- Node.js 20+ for local frontend development

## 2. Start the stack

```bash
git clone <your-ecdat-repository>
cd ecdat
cp .env.example .env
docker compose up -d --build
```

Check:

```bash
docker compose ps
curl http://localhost:8000/health
```

## 3. Initialize database

```bash
docker compose exec api alembic upgrade head
```

## 4. Seed the Enterprise Lab

```bash
python scripts/seed_lab.py
```

## 5. Seed replay data

```bash
python scripts/load_replay.py data/replay/demo-scan.json
```

The exact filenames are implementation placeholders; the codebase should keep the same semantics.

## 6. Open the UI

Open the local web URL exposed by the frontend container, usually the port documented in `.env.example`.

## 7. First demo flow

```text
Overview
→ New Scan
→ Enterprise Lab
→ Scan Progress
→ Inventory
→ select RSA/ECC asset
→ Evidence
→ Graph
→ Blast Radius
→ Risk
→ Migration Simulator
→ CBOM
```

## 8. Offline verification

Disable network access after images and dependencies are already staged. The demo should still load.

## 9. Reset

Use a single reset script to return Postgres to the known demo state.

## 10. When something breaks

Switch to replay mode instead of editing the database manually. See `20-FALLBACK-REPLAY-MODE.md`.

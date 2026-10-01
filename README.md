# ECDAT — Enterprise Cryptographic Discovery & Analysis Tool

> **SIH Problem:** SIH26164 | **Organization:** NTRO | 

An evidence-backed cryptographic asset discovery and quantum-migration decision-support platform built for the Smart India Hackathon 2026.

---

## Live Demo

| Layer | URL |
|---|---|
| Web Dashboard | `http://localhost:3000` |
| REST API + Swagger | `http://localhost:8000/docs` |

---

## What It Does

**Discover → Prove → Assess → Simulate → Migrate → Validate**

ECDAT scans enterprise source code, dependencies, certificates, binaries, and containers to:

1. **Discover** cryptographic assets across multiple evidence sources
2. **Prove** findings with full provenance (file, line, detector, raw signal, normalized claim)
3. **Assess** quantum-risk using the Mosca theorem: P(X + Y > Z) via Monte Carlo simulation
4. **Simulate** blast radius — BFS traversal of the enterprise crypto dependency graph
5. **Recommend** role-correct PQC migration candidates (KEM vs DSA — never mixed)
6. **Generate** CycloneDX 1.6 Cryptographic Bill of Materials (CBOM) exports

---

## Architecture

```
src/
├── ecdat/               # Core intelligence engine (deterministic-first, no LLM dependency)
│   ├── scanners/        # Python AST, Java rules, Dependencies (POM/pip), X.509, Binary, Container
│   ├── fusion/          # Multi-source evidence arbitration (Capability vs Usage distinction)
│   ├── graph/           # Enterprise crypto dependency topology + BFS blast radius
│   ├── risk/            # Mosca P(X+Y>Z) + Monte Carlo risk simulation
│   ├── migration/       # 3-wave PQC migration planner with role-correct recommendations
│   ├── cbom/            # CycloneDX 1.6 CBOM generator
│   └── ontology/        # Strict evidence role types
├── services/
│   ├── api/             # FastAPI REST API (19 endpoints, Pydantic v2)
│   └── worker/          # Async RQ background scanning workers
└── apps/
    └── web/             # Next.js 14 App Router dashboard (TypeScript, Tailwind, Framer Motion)
```

---

## Quick Start (Docker)

```bash
# 1. Clone the repository
git clone https://github.com/Shubham142856/ECDAT.git
cd ECDAT

# 2. Copy and configure environment
cp src/.env.example src/.env

# 3. Start all services (API + Worker + DB + Redis + Web)
cd src
docker compose up --build -d

# 4. Open the dashboard
open http://localhost:3000
```

---

## Quick Start (Local Dev)

```bash
# Python backend (requires Python 3.11+)
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r src/services/api/requirements.txt

# Run tests
pytest src/tests/unit/ -v

# Start API server
uvicorn services.api.main:app --reload --port 8000

# Next.js frontend (separate terminal)
cd src/apps/web
npm install
npm run dev                     # → http://localhost:3000
```

---

## Real-World Evidence (SIH Demo)

Scanned **4 pinned open-source corpora** — totalling **54 cryptographic assets**:

| Corpus | Language | Key Findings |
|---|---|---|
| **PyJWT** @ `b5bd6fe` | Python | HMAC-SHA256, RS256 JWT signing |
| **Certbot** @ `4856493` | Python | RSA-2048/4096 X.509, ECDSA certificates |
| **Paramiko** @ `142f593` | Python | RSA/Ed25519 SSH host keys, AES-CTR |
| **JJWT** @ `fb71496` | Java | RSA-SHA256, HMAC, EC P-256 signatures |

See [CORPUS.md](./CORPUS.md) for clone instructions.

---

## Non-Negotiable Rules

This project strictly enforces 23 engineering rules. Key ones:

- **Never fabricate a finding** — every claim requires scanner execution evidence
- **Never confuse capability with usage** — `import hashlib` ≠ "SHA-256 is used"
- **Deterministic-first** — core pipeline works without any LLM
- **No autonomous migration** — human approval required before any code change
- **Reproducible** — pinned commits, fixed Monte Carlo seed, versioned registries

---

## Tech Stack

| Layer | Technology |
|---|---|
| Intelligence Engine | Python 3.11, custom AST scanners |
| REST API | FastAPI, Pydantic v2, SQLAlchemy 2 |
| Task Queue | RQ (Redis Queue) |
| Database | PostgreSQL 15 |
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Framer Motion, React Flow, Recharts |
| Deployment | Docker Compose / Vercel (web) + Cloud Run (API) |

---

## License

MIT

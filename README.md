# ECDAT — Enterprise Cryptographic Discovery & Analysis Tool

> **SIH Problem ID:** SIH26164 | **Organization:** National Technical Research Organisation (NTRO)  
> **Core Principle:** Discover → Prove → Assess → Simulate → Migrate → Validate

ECDAT is an enterprise-grade, evidence-backed cryptographic discovery, quantum-risk assessment, and post-quantum cryptography (PQC) migration planning platform. Designed to meet the requirements of **SIH26164**, ECDAT combines static code inspection, dependency analysis, X.509 certificate parsing, binary scanning, and container inspection into a unified, provenance-preserving **Cryptographic Dependency Graph**.

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [SIH26164 Problem Statement Alignment](#sih26164-problem-statement-alignment)
- [System Architecture](#system-architecture)
  - [High-Level Architecture Diagram](#high-level-architecture-diagram)
  - [The 9-Stage Scan Pipeline](#the-9-stage-scan-pipeline)
  - [Evidence Roles & Fusion Engine](#evidence-roles--fusion-engine)
  - [Cryptographic Knowledge Graph](#cryptographic-knowledge-graph)
  - [Quantum Risk & Mosca Model](#quantum-risk--mosca-model)
  - [PQC Migration & Blast Radius Simulator](#pqc-migration--blast-radius-simulator)
- [Repository Structure](#repository-structure)
- [Web Dashboard & Interfaces](#web-dashboard--interfaces)
- [Real-World Corpus & Benchmark Verification](#real-world-corpus--benchmark-verification)
- [Quick Start Guide](#quick-start-guide)
  - [Docker Compose (Recommended)](#docker-compose-recommended)
  - [Local Development Setup](#local-development-setup)
  - [End-to-End Validation](#end-to-end-validation)
- [REST API Specification](#rest-api-specification)
- [Engineering Discipline & Non-Negotiable Rules](#engineering-discipline--non-negotiable-rules)
- [Honest Boundaries & Limitations](#honest-boundaries--limitations)
- [License](#license)

---

## Executive Summary

As quantum computing approaches the Cryptanalytically Relevant Quantum Computer (CRQC) milestone, legacy asymmetric cryptography (RSA, ECDSA, ECDH, DSA) faces systemic obsolescence. Large enterprise environments struggle with:

1. **Hidden Cryptographic Debt:** Cryptographic algorithms are scattered across legacy repositories, unmanaged dependencies, hardcoded certificates, binaries, and container images.
2. **False Confidence from Naive Scanners:** Basic regex or keyword search confuses library capability (`import hashlib`) with actual primitive usage (`RSA.sign(...)`), leading to alert fatigue.
3. **Lack of Quantum-Risk Prioritization:** Organizations lack probabilistic models to determine *which* assets must migrate first under real-world shelf-life and migration-latency constraints.
4. **Uncertain Migration Impact:** Migrating a key or algorithm without knowing its dependency blast radius risks cascading service outages.

**ECDAT solves this end-to-end** by building an evidence-backed graph of enterprise cryptography, running Monte Carlo simulations of the Mosca inequality $P(X + Y > Z)$, and generating role-correct PQC migration pathways along with standardized **CycloneDX 1.6 Cryptographic Bill of Materials (CBOM)**.

---

## SIH26164 Problem Statement Alignment

ECDAT directly satisfies and exceeds every clause of the NTRO SIH26164 problem statement:

| SIH26164 Requirement | ECDAT Live Deliverable | Implementation Mechanism |
|---|---|---|
| **Cryptographic Discovery & Cataloguing** | Full multi-source discovery engine | Python AST, Java Rules, Pip/Maven dependency tree, X.509 ASN.1 parser, ELF/PE/Mach-O binary scanner, Container tarball inspector |
| **Classification by Type, Lifetime & Criticality** | Granular cryptographic taxonomy | Categorizes by primitive family (KEM, Digital Signature, Hash, Symmetric Block, MAC), claim state, business context, and operational exposure |
| **Quantum Risk Assessment** | Probabilistic Mosca Engine | Evaluates $X + Y > Z$ ($X$ = data lifetime, $Y$ = migration time, $Z$ = CRQC arrival) using seeded Monte Carlo simulation |
| **PQC & Hybrid Recommendations** | NIST FIPS 203/204/205 Migration Planner | Strict role-correct mapping (ML-KEM-512/768/1024 for key exchange, ML-DSA / SLH-DSA / Falcon for signatures; never confused) |
| **Blast Radius Simulation** | Directed Graph Traversal | BFS traversal over NetworkX dependency graph calculating affected services, dependent repositories, and predicted impact |
| **CBOM Generation** | Standardized CycloneDX 1.6 CBOM | Fully compliant JSON export containing components, crypto properties, algorithms, key sizes, and NIST quantum status |
| **Interactive GUI / Visualizer** | Full Enterprise Dashboard | Next.js 14 App Router with React Flow interactive graph topology, real-time risk sliders, and live comparison matrix |

---

## System Architecture

ECDAT is designed with a **deterministic-first, evidence-driven architecture**. Cryptographic discovery is 100% deterministic and operates without an LLM in the loop, ensuring auditable provenance and zero hallucinations.

### High-Level Architecture Diagram

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       USER / AUDITOR / ANALYST                                     │
└──────────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                   │ HTTP / REST / WebSocket
┌──────────────────────────────────────────────────▼─────────────────────────────────────────────────┐
│                           PRESENTATION LAYER — Next.js 14 App Router                               │
│  ┌─────────────────────────┬─────────────────────────┬─────────────────────────┬────────────────┐  │
│  │  Discovery & Inventory  │ React Flow Graph Canvas │ Quantum Risk Simulator  │  PQC Wave Plan │  │
│  │   (/dashboard/discovery)│   (/dashboard/graph)    │   (/dashboard/risk)     │ (/dashboard/.. │  │
│  ├─────────────────────────┴─────────────────────────┴─────────────────────────┴────────────────┤  │
│  │               SIH26164 Requirement vs Live Deliverables Audit (/dashboard/compare)           │  │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                   │ JSON API (/api/*)
┌──────────────────────────────────────────────────▼─────────────────────────────────────────────────┐
│                               API GATEWAY LAYER — FastAPI & Pydantic v2                            │
│  ┌──────────────────────┬──────────────────────┬──────────────────────┬─────────────────────────┐  │
│  │ Projects & Artifacts │ Scan Orchestration   │ Graph & Topology API │ CBOM / Export Endpoints │  │
│  └──────────────────────┴──────────────────────┴──────────────────────┴─────────────────────────┘  │
└──────────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                   │
                         ┌─────────────────────────┴─────────────────────────┐
                         ▼                                                   ▼
┌─────────────────────────────────────────────────┐ ┌────────────────────────────────────────────────┐
│           ASYNC SCAN WORKER ENGINE              │ │               PERSISTENCE LAYER                │
│  ┌───────────────────────────────────────────┐  │ │  ┌──────────────────────────────────────────┐  │
│  │ Stage 1: Ingest (Safe Zip & Decompress)   │  │ │  │ PostgreSQL 15 / SQLite (Dev Mode)        │  │
│  ├───────────────────────────────────────────┤  │ │  │ • Projects & Artifact Manifests         │  │
│  │ Stage 2: Discover (AST / Rules / Scanners)│  │ │  │ • Normalized Evidence (Provenance)       │  │
│  ├───────────────────────────────────────────┤  │ │  │ • Fused Cryptographic Assets             │  │
│  │ Stage 3: Normalize (Taxonomy Mapping)     │  │ │  │ • Cryptographic Graph Nodes & Edges      │  │
│  ├───────────────────────────────────────────┤  │ │  │ • Monte Carlo Risk Results               │  │
│  │ Stage 4: Evidence Fusion (5 Roles)        │  │ │  │ • PQC Migration Plans & Wave Batches     │  │
│  ├───────────────────────────────────────────┤  │ │  └──────────────────────────────────────────┘  │
│  │ Stage 5: Topology Graph Construction      │  │ │                                                │
│  ├───────────────────────────────────────────┤  │ │  ┌──────────────────────────────────────────┐  │
│  │ Stage 6: Quantum Risk Assessment (Mosca)  │  │ │  │ Standards & Algorithm Registry           │  │
│  ├───────────────────────────────────────────┤  │ │  │ • NIST FIPS 203 (ML-KEM), 204 (ML-DSA)   │  │
│  │ Stage 7: PQC Migration & Blast Radius     │  │ │  │ • FIPS 205 (SLH-DSA), CNSA 2.0 Suites    │  │
│  ├───────────────────────────────────────────┤  │ │  │ • Legacy & Deprecated Algorithm Baselines│  │
│  │ Stage 8: Claim & Contradiction Validation │  │ │  └──────────────────────────────────────────┘  │
│  ├───────────────────────────────────────────┤  │ └────────────────────────────────────────────────┘
│  │ Stage 9: CycloneDX 1.6 CBOM Export        │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### The 9-Stage Scan Pipeline

Every scan in ECDAT moves through 9 strictly observable, auditable lifecycle stages:

1. **Ingest:** Safely extracts source trees, archives, certificates, or binaries with security boundaries (zip-bomb and path-traversal prevention per Rule 9).
2. **Discover:** Executes specialized deterministic detectors across artifacts to collect raw signals.
3. **Normalize:** Maps detector findings into canonical cryptographic taxonomy keys.
4. **Fuse:** Correlates multiple independent detector observations, assigns evidence roles, and synthesizes fused cryptographic assets.
5. **Graph:** Connects assets, source files, libraries, containers, and services into a directed topology.
6. **Risk:** Executes the probabilistic Mosca inequality model with Monte Carlo simulation for every quantum-vulnerable primitive.
7. **Migrate:** Computes role-correct PQC migration candidates and groups assets into a 3-wave transition schedule based on predicted blast radius.
8. **Validate:** Audits claims for conflicting evidence, incomplete parameters, and rule violations.
9. **Export:** Generates CycloneDX 1.6 CBOM JSON records and compliance artifacts.

### Evidence Roles & Fusion Engine

To prevent false positives, ECDAT introduces **5 strict evidence roles** (Rule 2):

| Evidence Role | Definition | Concrete Example |
|---|---|---|
| `CAPABILITY` | Library presence or import without proven invocation | `import cryptography` or dependency `pyjwt>=2.8.0` |
| `IMPLEMENTATION` | Concrete class or algorithm instantiated in code | `jwt.algorithms.RSAAlgorithm()` instantiated |
| `USAGE` | Execution call that actively invokes crypto operations | `jwt.encode(payload, key, algorithm="RS256")` |
| `CONFIGURATION` | Declarative configuration specifying an algorithm/key | `TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384` in nginx.conf |
| `OBSERVED` | Cryptographic parameter parsed from an active artifact | `RSA Public Key (2048 bit)` read from `.pem` certificate |

> **Fusion Rule:** A weaker evidence role (`CAPABILITY`) is **never** silently upgraded to a stronger claim (`USAGE`) without affirmative detector evidence. Conflicting signals are preserved, never erased (Rule 4).

### Cryptographic Knowledge Graph

ECDAT constructs an in-memory and persisted directed multigraph ($G = (V, E)$):
* **Node Types:** `Project`, `SourceFile`, `Library`, `Algorithm`, `Certificate`, `Protocol`, `DataAsset`, `KMS/HSM`.
* **Edge Types:** `USES`, `DEPENDS_ON`, `IMPLEMENTS`, `SIGNS`, `ENCRYPTS`, `PROTECTS`, `NEGOTIATES`, `CALLS`.

**Blast Radius Computation:**
When migrating an algorithm, ECDAT traverses the graph via Breadth-First Search (BFS) to identify all transitive callers, shared configurations, and exposed boundaries that will require coordinated updates.

### Quantum Risk & Mosca Model

ECDAT implements Michele Mosca's theorem:

$$\text{Risk Condition: } X + Y > Z$$

Where:
* $X$: **Shelf Life** — Required secrecy lifetime of protected data (years).
* $Y$: **Migration Time** — Time needed to re-engineer, test, and deploy post-quantum alternatives (years).
* $Z$: **CRQC Horizon** — Time until a Cryptanalytically Relevant Quantum Computer becomes operational.

Instead of hardcoding a speculative fixed Q-Day year (Rule 5), ECDAT evaluates $Z$ as a distribution under user-adjustable scenarios and calculates:

$$P(X + Y > Z)$$

Using a fixed-seed, reproducible 10,000-iteration Monte Carlo simulation.

### PQC Migration & Blast Radius Simulator

Recommendations are strictly **role-correct** (Rule 14):
* **Key Encapsulation Mechanisms (KEM):** ML-KEM-512, ML-KEM-768, ML-KEM-1024 (NIST FIPS 203).
* **Digital Signature Algorithms (DSA):** ML-DSA-44/65/87 (NIST FIPS 204), SLH-DSA (NIST FIPS 205), Falcon.
* **Hybrid Schemes:** Classical + Post-Quantum combiners (e.g., X25519 + ML-KEM-768) for transition periods.

#### The 3-Wave Migration Schedule:
1. **Wave 1 (Critical / Immediate):** Internet-facing services, long data shelf-life ($X > 10$ years), weak key lengths, unagile implementations.
2. **Wave 2 (High / Planned):** Internal service-to-service authentication, intermediate certs, moderate blast radius.
3. **Wave 3 (Medium-Low / Routine):** Ephemeral tokens, short-lived sessions, symmetric key rotation.

---

## Repository Structure

```text
d:\ecdat/
├── src/
│   ├── ecdat/                  # Core intelligence engine (deterministic-first)
│   │   ├── scanners/           # Specialized detectors
│   │   │   ├── python_ast.py   # Python AST parser & call-graph analyzer
│   │   │   ├── java_rules.py   # Java JCA/JCE and bouncycastle pattern analyzer
│   │   │   ├── dependency.py   # Pip/Poetry/Maven dependency resolver
│   │   │   ├── certificate.py  # X.509 ASN.1 certificate & key scanner
│   │   │   ├── binary.py       # Bounded static inspection for ELF, PE, Mach-O
│   │   │   ├── container.py    # Container tarball & filesystem layer scanner
│   │   │   └── config_scan.py  # TLS/SSL configuration & cipher suite parser
│   │   ├── fusion/             # Multi-source evidence arbitration & deduplication
│   │   ├── graph/              # NetworkX topology builder & BFS blast radius
│   │   ├── risk/               # Mosca P(X+Y>Z) engine with Monte Carlo simulation
│   │   ├── migration/          # PQC candidate generator & 3-wave transition planner
│   │   ├── cbom/               # CycloneDX 1.6 Cryptographic BOM generator
│   │   └── ontology/           # Data models, evidence roles, and claim states
│   ├── services/
│   │   ├── api/                # FastAPI application
│   │   │   ├── main.py         # 19 REST endpoints, CORS, background thread runner
│   │   │   └── models.py       # SQLAlchemy ORM models & database schema
│   │   └── worker/             # Background job processor
│   │       └── jobs.py         # 9-stage pipeline execution logic
│   ├── apps/
│   │   └── web/                # Next.js 14 enterprise frontend
│   │       ├── src/app/        # App Router pages (/dashboard, /graph, /compare, etc.)
│   │       ├── src/components/ # UI design system & visualizers
│   │       └── src/lib/api.ts  # Typed client API layer
│   ├── scripts/                # Verification, benchmark & DB maintenance tools
│   └── tests/                  # Unit and integration test suites
├── real-corpus/                # 4 Pinned open-source benchmark repositories
│   ├── PyJWT/                  # Python JWT signing (commit b5bd6fe)
│   ├── certbot/                # Let's Encrypt client (commit 4856493)
│   ├── paramiko/               # SSHv2 protocol implementation (commit 142f593)
│   └── jjwt/                   # Java JWT library (commit fb71496)
├── datasets/                   # Ground-truth academic benchmarks (CryptoAPI-Bench, CamBench)
├── e2e_validate.py             # Windows-safe ASCII full-pipeline test runner
├── inspect_db.py               # Database state & asset diagnostics tool
└── CORPUS.md                   # Corpus manifest & clone instructions
```

---

## Web Dashboard & Interfaces

| Route | Interface Name | Purpose & Capabilities |
|---|---|---|
| `/dashboard` | **Overview Hub** | Enterprise crypto posture, quantum risk gauge, total discovered assets, and active scans |
| `/dashboard/discovery` | **Asset Discovery** | Interactive file & archive upload dropzone, multi-role evidence breakdown, and detector logs |
| `/dashboard/graph` | **Topology Visualizer** | Interactive React Flow canvas showing directed artifact-to-primitive dependencies with blast radius inspection |
| `/dashboard/risk` | **Quantum Risk (Mosca)** | Interactive $X, Y, Z$ parameter sliders running live Monte Carlo risk recalculations |
| `/dashboard/migration` | **PQC Migration** | 3-Wave transition roadmap, role-correct NIST FIPS candidate recommendations, and blast radius metrics |
| `/dashboard/reports` | **Reports & CBOM** | Full CycloneDX 1.6 Cryptographic Bill of Materials viewer and JSON export download |
| `/dashboard/compare` | **Problem Statement Audit** | Live matrix comparing SIH26164 requirements against real backend deliverables |

---

## Real-World Corpus & Benchmark Verification

ECDAT has been benchmarked against **4 pinned real-world repositories** and controlled academic suites:

```text
                             54 FUSED CRYPTOGRAPHIC ASSETS
 ┌──────────────────────────────────────┬──────────────────────────────────────┐
 │ PyJWT (Python)                       │ Paramiko (Python)                    │
 │ 9 Fused Assets | 297 Evidence Records│ 16 Fused Assets | 183 Evidence Records│
 │ • HMAC, ECDSA, Ed25519, Ed448        │ • SSH Host Keys (RSA, Ed25519, ECDSA)│
 │ • RSA, RSA-PSS, SHA-256/384/512      │ • AES-CTR, 3DES, Blowfish, Diffie-H. │
 ├──────────────────────────────────────┼──────────────────────────────────────┤
 │ Certbot (Python)                     │ JJWT (Java)                          │
 │ 14 Fused Assets | 142 Evidence Records│ 15 Fused Assets | 210 Evidence Records│
 │ • X.509 Certificates (RSA-2048/4096) │ • JWS/JWE Digital Signatures         │
 │ • ECDSA (secp256r1/secp384r1)        │ • RSA, EC P-256, HMAC-SHA, AES-GCM  │
 └──────────────────────────────────────┴──────────────────────────────────────┘
```

* Ground truth benchmark suites: **CryptoAPI-Bench** (Java) and **CamBench** (C/Java) used to validate scanner precision and recall.
* Every finding links back to exact file paths, line numbers, and raw regex/AST signals.

---

## Quick Start Guide

### Docker Compose (Recommended)

Run the complete ECDAT suite with one command:

```bash
# 1. Clone repository
git clone https://github.com/Shubham142856/ECDAT.git
cd ECDAT

# 2. Configure environment
cp src/.env.example src/.env

# 3. Spin up all containers (Web + API + Worker + PostgreSQL + Redis)
cd src
docker compose up --build -d
```

Access the interfaces:
* **Web Dashboard:** [http://localhost:3000](http://localhost:3000)
* **API Documentation (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Local Development Setup

#### 1. Backend (Python 3.11+)

```bash
# Create and activate virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r src/services/api/requirements.txt

# Run database migrations / seed
python src/scripts/populate_real_scans.py

# Start FastAPI server
uvicorn services.api.main:app --host 127.0.0.1 --port 8000 --reload
```

#### 2. Frontend (Node.js 18+)

```bash
cd src/apps/web

# Install dependencies
npm install

# Start Next.js development server
npm run dev
# (Runs on http://localhost:3000 with --max-old-space-size=6144)
```

---

### End-to-End Validation

Run the comprehensive, Windows-safe ASCII automated validation script to verify all 8 pipeline checks:

```bash
python e2e_validate.py
```

The script verifies:
1. `GET /api/scans/{id}` → Scan status is `completed`
2. `GET /api/scans/{id}/assets` → Exactly matches scanner baseline (e.g., 9 assets for PyJWT)
3. `Evidence records` → Verifies detector IDs, source paths, and non-empty evidence
4. `GET /api/scans/{id}/graph` → Validates nodes, edges, and directional relations
5. `GET /api/scans/{id}/risk` → Validates Monte Carlo Mosca risk outputs
6. `GET /api/scans/{id}/plan` → Validates PQC migration candidates and wave grouping
7. `GET /api/scans/{id}/cbom` → Validates CycloneDX 1.6 schema compliance
8. `Provenance audit` → Confirms strict adherence to Rule 1 and Rule 3

---

## REST API Specification

ECDAT provides 19 REST endpoints grouped into 6 controllers:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check, execution mode (`live` / `replay`), and version |
| `GET` | `/api/projects` | List projects (ordered canonical benchmark sequence) |
| `POST` | `/api/projects` | Register a new enterprise project |
| `POST` | `/api/artifacts/upload` | Ingest source code, zip archive, certificate, or binary |
| `POST` | `/api/scans` | Trigger a new 9-stage analysis scan |
| `GET` | `/api/scans` | List historical scans with status and stage metrics |
| `GET` | `/api/scans/{scan_id}` | Detailed scan state, timing, and error logs |
| `GET` | `/api/scans/{scan_id}/assets` | Fused cryptographic asset inventory with provenance |
| `GET` | `/api/scans/{scan_id}/evidence`| Raw and normalized evidence records |
| `GET` | `/api/scans/{scan_id}/graph` | Cryptographic dependency topology (nodes & edges) |
| `GET` | `/api/scans/{scan_id}/risk` | Mosca quantum risk assessment & Monte Carlo distributions |
| `GET` | `/api/scans/{scan_id}/plan` | PQC migration plan, candidate recommendations, and waves |
| `GET` | `/api/scans/{scan_id}/cbom` | CycloneDX 1.6 Cryptographic Bill of Materials (CBOM) JSON |

Interactive Swagger documentation is available at `http://localhost:8000/docs`.

---

## Engineering Discipline & Non-Negotiable Rules

ECDAT is built according to **23 strict engineering rules** ensuring security and scientific rigor:

* **Rule 1 — Never fabricate a finding:** Every claim must stem from detector execution or verified benchmark ground truth.
* **Rule 2 — Never confuse capability with usage:** Dependencies or imports alone must never be classified as active algorithm usage.
* **Rule 3 — Preserve provenance:** Every finding stores source file, line number, detector type, raw signal, normalized claim, confidence, and timestamp.
* **Rule 4 — Preserve contradictory evidence:** Conflicting detector signals are never erased; they are surfaced for analyst review.
* **Rule 5 — Do not invent a Q-Day year:** Quantum risk is modeled as probability distribution $P(X + Y > Z)$, not an arbitrary fixed date.
* **Rule 7 — Never execute scanned code:** Analysis is strictly static or securely sandboxed. Unknown code or entrypoints are never executed.
* **Rule 8 — Never use real private keys:** Synthetic test keys only.
* **Rule 9 — Security before convenience:** Decompression safeguards against zip bombs, path traversal (`../`), symlinks, and oversized files.
* **Rule 10 — Deterministic first, AI second:** Core discovery, graph generation, and risk modeling run 100% deterministically without an LLM.
* **Rule 12 — No autonomous migration in V1:** Decisions are proposed, simulated, and presented for human approval.
* **Rule 14 — Role-correct PQC recommendations:** KEM for key exchange (FIPS 203), DSA for signatures (FIPS 204/205). Never mixed.

---

## Honest Boundaries & Limitations

In accordance with scientific integrity and transparent engineering:

1. **Static Analysis Boundaries:** ECDAT inspects code statically. Highly dynamic behavior (dynamic classloading, runtime reflection, obfuscated packers, or runtime-decrypted keys) may require active dynamic instrumentation or configuration manifests.
2. **Context Requirement for Risk Scoring:** Precise Mosca risk scoring depends on enterprise operational parameters ($X$ data lifetime, $Y$ migration difficulty). In the absence of user context, ECDAT marks values as `INSUFFICIENT CONTEXT` rather than inventing false risk scores.
3. **Predicted vs Guaranteed Impact:** Blast radius models the syntactic and architectural dependencies visible in the graph; operational runtime blast radius remains a prediction to guide human review.

---

## License

Distributed under the **MIT License**. See `LICENSE` for more information.

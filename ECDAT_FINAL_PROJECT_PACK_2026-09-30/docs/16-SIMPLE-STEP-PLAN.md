# 16 — Simple Step-by-Step Build Plan

This is the plan to actually build the project. Do the steps in order. Do not jump to AI agents before the deterministic pipeline is working.

## Step 1 — Create the project skeleton

Make:

- Next.js frontend
- FastAPI backend
- PostgreSQL database
- Redis/RQ worker
- Python `ecdat/` package
- Docker Compose

**Done when:** all services start and `/health` works.

## Step 2 — Define the data model

Create tables for:

`projects`, `artifacts`, `scans`, `evidence`, `crypto_assets`, `graph_nodes`, `graph_edges`, `risk_results`, `migration_plans`, `replay_snapshots`.

**Done when:** a fake scan can be stored and fetched.

## Step 3 — Build the Enterprise Lab first

Create a small fake enterprise with:

- Python service
- Java service
- dependency-only library
- certificate
- binary sample
- container sample
- `enterprise.yaml`

Plant known cases and record exact ground truth.

**Done when:** you know the correct answer before running ECDAT.

## Step 4 — Build Python detector

Detect real crypto API calls with AST.

Start simple:

```text
import
alias
call
algorithm
parameters
file
line
```

**Done when:** planted Python cases are detected correctly.

## Step 5 — Build Java detector

Use Tree-sitter plus rule patterns. Start with high-confidence APIs instead of trying to solve all Java reflection.

**Done when:** planted Java cases are found with source locations.

## Step 6 — Add dependency scanner

Read `requirements.txt`, `poetry.lock`, `pom.xml`, Gradle files and supported lockfiles.

Important: label dependency findings as **capability** by default.

**Done when:** OpenSSL-like dependency evidence does not become fake RSA usage.

## Step 7 — Add certificate scanner

Parse PEM/DER/X.509.

Record:

- key type
- key parameters
- cert signature algorithm
- validity
- SAN
- issuer/subject

**Done when:** certificate properties are shown separately from source usage.

## Step 8 — Add bounded binary/container scanning

Binary:

- file type
- imports
- symbols
- linked libraries
- known crypto signatures

Container:

- package manager metadata
- crypto libraries
- certificates
- binary inventory

Do not execute anything.

**Done when:** V1 truthfully covers all SIH input surfaces at bounded depth.

## Step 9 — Build evidence fusion

Normalize the results and attach the five roles:

`capability / implementation / usage / configuration / observed`

Add confidence and claim state.

**Done when:** strong and weak evidence look different in the UI.

## Step 10 — Build the graph

Create nodes and edges. Use NetworkX for analysis.

**Done when:** clicking an asset shows which services depend on it.

## Step 11 — Build risk

First implement:

`X + Y > Z`

Then add:

`P(X + Y > Z)`

Use a fixed RNG seed in demos.

**Done when:** the same scan produces the same risk result.

## Step 12 — Build PQC registry and migration

Create versioned data for:

- ML-KEM
- ML-DSA
- SLH-DSA
- relevant hybrid protocol groups

Then generate role-correct candidates.

**Done when:** KEM is recommended for key establishment, not signatures.

## Step 13 — Build blast radius and simulator

Start with BFS/DFS.

Then return:

- affected services
- libraries
- certificates
- clients
- data assets

Label all impact as `predicted`.

**Done when:** the UI can show before/after without changing code.

## Step 14 — Build CBOM export

Create CycloneDX 1.7 JSON and validate it before download.

**Done when:** a generated CBOM passes schema validation.

## Step 15 — Build the UI

Build these screens in this order:

1. Overview
2. Scan
3. Inventory
4. Asset detail
5. Graph
6. Risk
7. Migration simulator
8. Reports

**Done when:** the demo can be completed with no developer tools open.

## Step 16 — Add replay fallback

Take one known-good scan, store its normalized results, and load them into Postgres.

The UI must look the same. Only a small `REPLAY MODE` status indicator changes.

**Done when:** you can demonstrate the entire project even if the live scanner/worker fails.

## Step 17 — Freeze API

Backend and frontend stop changing response shapes. See `21-API-CONTRACT-FREEZE.md`.

## Step 18 — Benchmark

Run synthetic + labelled real Python/Java tests.

Record:

- precision
- recall
- F1
- capability-vs-usage accuracy
- latency
- evidence completeness

**Done when:** every slide number has a saved benchmark artifact.

## Step 19 — Security test

Test:

- zip bomb
- traversal
- symlink
- malformed cert
- secret/private-key fixtures
- huge binary
- bad container tarball
- scanner crash
- scanner timeout

## Step 20 — Demo preparation

Do three runs:

1. live
2. live again after reset
3. replay mode

Then rehearse the demo script.

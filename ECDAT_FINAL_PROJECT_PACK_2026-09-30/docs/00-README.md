# 00 — ECDAT Master Documentation Index

**Project:** Enterprise Cryptographic Discovery & Analysis Tool (ECDAT)
**SIH:** SIH26164 · NTRO · Blockchain & Cybersecurity
**Verification refresh:** 2026-09-30

## 1. Project in one sentence

ECDAT builds an evidence-backed cryptographic digital twin of an enterprise: what cryptography is present, what evidence supports each claim, how crypto assets are connected, which systems face quantum/lifecycle risk, and what migration path should be evaluated.

## 2. Locked product loop

```text
DISCOVER
  ↓
VERIFY
  ↓
PRESERVE EVIDENCE + PROVENANCE
  ↓
FUSE EVIDENCE
  ↓
RESOLVE CRYPTO USAGE
  ↓
BUILD CRYPTO GRAPH
  ↓
ADD ARCHITECTURAL + BUSINESS CONTEXT
  ↓
QUANTIFY UNCERTAINTY
  ↓
ASSESS QUANTUM RISK
  ↓
ASSESS CRYPTO-AGILITY
  ↓
CALCULATE BLAST RADIUS
  ↓
OPTIMIZE MIGRATION OPTIONS
  ↓
SIMULATE
  ↓
VALIDATE
  ↓
EXPORT CBOM + REPORT
```

## 3. V1 demo scope

V1 must truthfully cover the SIH discovery surfaces at a bounded depth:

- Source code: deep support for Python and Java.
- Dependencies/libraries: manifests and lockfiles; capability evidence only unless usage is proven elsewhere.
- X.509 certificates: key type, parameters, signature algorithm, validity and SAN metadata.
- Binaries: bounded static inspection using imports, symbols, linked libraries and known crypto API signatures; **capability/evidence only** unless stronger evidence exists.
- Container images: bounded filesystem/package inspection; locate crypto libraries, packages, certificates and binaries; **capability/evidence only** unless stronger evidence exists.
- Evidence fusion, cryptographic graph, Mosca baseline + uncertainty extension, PQC/hybrid recommendations, blast radius, migration simulation, wave plan, CycloneDX 1.7 CBOM, dashboard.

## 4. Deferred extensions

Deep reverse engineering, live TLS/SSH/QUIC probing, cloud KMS/HSM adapters, advanced runtime/eBPF evidence, OR-Tools optimization, autonomous code modification, multi-tenant enterprise RBAC, blockchain-backed transport, and future CycloneDX versions beyond 1.7 are architectural extensions rather than V1 promises.

## 5. The five evidence roles

```text
CAPABILITY      → component can provide a cryptographic function
IMPLEMENTATION  → crypto implementation/API is present
USAGE           → application code actually invokes or wires the crypto path
CONFIGURATION   → settings select or constrain the crypto path
OBSERVED        → artifact/protocol/runtime observation directly shows presence
```

The role must be shown beside every finding. Conflicting or weaker roles are retained instead of silently upgraded.

## 6. What must be research-grade

1. Evidence fusion with provenance.
2. Capability-vs-usage resolution.
3. Cryptographic dependency graph.
4. Probability-aware Mosca analysis.
5. Crypto-agility and migration-effort modelling.
6. Blast-radius prediction.
7. Migration simulation and validation gates.
8. Controlled benchmark with real and synthetic components.

## 7. Repository map

```text
ecdat/
├── apps/web/                 # Next.js UI
├── services/api/             # FastAPI API
├── services/worker/          # Redis/RQ jobs
├── ecdat/                    # Python core logic
│   ├── ontology/
│   ├── scanners/
│   ├── fusion/
│   ├── graph/
│   ├── risk/
│   ├── migration/
│   ├── cbom/
│   └── knowledge/
├── corpus/
│   ├── enterprise-lab/
│   ├── python-java-real/
│   ├── public-reference/
│   └── certificates/
├── tests/
├── scripts/
├── data/
├── config/
└── docs/
```

## 8. Documentation map

| File | Use |
|---|---|
| `01-PROJECT-OVERVIEW.md` | Problem, solution, research position |
| `02-PRD.md` | Product requirements |
| `03-ARCHITECTURE.md` | Technical architecture |
| `04-DATA-SOURCES.md` | Real corpus, benchmark and standards evidence |
| `05-MASTER-RULES.md` | Non-negotiable project rules |
| `06-RULES.md` | Engineering conventions |
| `07-MEMORY.md` | Decision log and current state |
| `08-TASKS.md` | Full implementation plan + 36h cut |
| `09-MICRO-TASKS.md` | Small executable tasks |
| `10-ERROR-HANDLING.md` | Failure and degradation behavior |
| `11-SECURITY.md` | Threat model and controls |
| `12-TESTING.md` | Tests and benchmark methodology |
| `13-PRODUCTION-CHECKLIST.md` | Release/demo gate |
| `14-VERIFICATION-REGISTER.md` | Verified external facts |
| `15-SRS.md` | Complete Software Requirements Specification |
| `16-SIMPLE-STEP-PLAN.md` | Simple build sequence |
| `17-QUICKSTART.md` | Local setup/run instructions |
| `18-DEMO-SCRIPT.md` | Demo narration and clicks |
| `19-JUDGE-QA.md` | Q&A card |
| `20-FALLBACK-REPLAY-MODE.md` | Precomputed-data fallback |
| `21-API-CONTRACT-FREEZE.md` | Frozen API shapes |
| `22-RESEARCH-EVALUATION-PLAN.md` | Experimental research plan |
| `23-CHANGELOG.md` | What was corrected and why |
| `24-PACKAGE-INVENTORY.md` | Complete file-by-file package map |

## 9. External-source status

The current indexed SIH26164 statement available to this project identifies NTRO, Software, Blockchain & Cybersecurity, discovery of cryptographic artefacts across source/binaries/libraries/containers, quantum-risk assessment, Mosca-style analysis and PQC/hybrid recommendations. A directly retrievable `sih.gov.in` page was not available in the verification run, so this package cites the indexed SIH mirror and does not present it as an official-portal capture.

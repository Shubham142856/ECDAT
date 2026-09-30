# 03 — Technical Architecture

## 1. High-level architecture

```text
                              ECDAT
                                │
                         Next.js / TypeScript
                                │
                           FastAPI Gateway
                                │
        ┌───────────────────────┼────────────────────────┐
        │                       │                        │
   DISCOVERY                KNOWLEDGE              ORCHESTRATION
        │                       │                        │
 source / deps / certs     crypto registry         worker jobs
 binary / container        PQC registry
 protocol adapters         protocol registry
 cloud/HSM adapters        lifecycle/standards
        │                       │
        └───────────────┬───────┘
                        ▼
               EVIDENCE STORE (Postgres)
                        ▼
                 EVIDENCE FUSION
                        ▼
              CRYPTOGRAPHIC GRAPH
                        ▼
             CONTEXT + RISK ENGINE
              ┌─────────┴─────────┐
              ▼                   ▼
        Quantum risk         Crypto agility
              └─────────┬─────────┘
                        ▼
               MIGRATION ENGINE
                        ▼
                BLAST RADIUS
                        ▼
               SIMULATION/WAVES
                        ▼
             VALIDATION ENGINE
                        ▼
             CBOM / REPORT / UI
```

## 2. Technology decisions

| Layer | Choice |
|---|---|
| UI | Next.js + TypeScript + Tailwind + shadcn/ui |
| Graph UI | React Flow |
| Charts | Recharts |
| API | FastAPI + Pydantic |
| DB | PostgreSQL + JSONB |
| ORM | SQLAlchemy + Alembic |
| Source parsing | Tree-sitter; Python `ast` fallback |
| Certs | Python `cryptography` |
| Binary | LIEF bounded inspection; Ghidra deferred |
| Container | filesystem/package inspection; Syft/Trivy can be optional evidence sources |
| Graph analytics | NetworkX |
| Jobs | Redis + RQ |
| CBOM | CycloneDX 1.7 |
| Deploy | Docker Compose, offline/on-prem for demo |

## 3. Scan pipeline

| Stage | Input | Output |
|---|---|---|
| 1. Ingest | ZIP/cert/binary/container | immutable input manifest + digest |
| 2. Discover | artifacts | raw evidence |
| 3. Normalize | raw evidence | normalized crypto observations |
| 4. Fuse | observations | claims with confidence and contradictions |
| 5. Graph | claims + enterprise topology | nodes/edges |
| 6. Risk | assets + context | Mosca + probability + context score |
| 7. Migrate | risk + graph + registry | candidates + blast radius + waves |
| 8. Validate | simulated changes | validation plan/status |
| 9. Export | all results | CBOM/report/dashboard payloads |

## 4. Evidence object

```text
Evidence
 ├── evidence_id
 ├── asset_id
 ├── source_type
 ├── source_location
 ├── observation_time
 ├── detector
 ├── raw_signal
 ├── normalized_claim
 ├── role[]
 ├── confidence
 ├── provenance
 └── validity
```

## 5. Claim resolution rules

A detector may emit a capability, implementation, usage, configuration or observed signal. Fusion must never upgrade a weaker signal into a stronger claim without an explicit rule.

Example:

```text
requirements.txt → openssl/python-cryptography
          = CAPABILITY

source.py → RSA sign() call with concrete key
          = USAGE / IMPLEMENTATION

certificate.pem → ECDSA-with-SHA256 certificate signature
          = OBSERVED certificate property
```

## 6. Graph model

Nodes: `Project`, `Service`, `Repository`, `SourceFile`, `Library`, `Binary`, `Container`, `Algorithm`, `Certificate`, `Protocol`, `DataAsset`, `KMS`, `HSM`.

Edges: `USES`, `DEPENDS_ON`, `IMPLEMENTS`, `PROVIDES`, `PROTECTS`, `SIGNS`, `ENCRYPTS`, `NEGOTIATES`, `DEPLOYED_ON`, `ISSUED_BY`, `STORED_IN`, `CALLS`.

## 7. Risk model

### Baseline

`X = required data secrecy lifetime`  
`Y = estimated migration time`  
`Z = CRQC-arrival scenario parameter`

Risk condition: `X + Y > Z`.

### Uncertainty extension

Represent `Z` as a distribution and calculate:

`P(X + Y > Z)`

Use a seeded Monte Carlo implementation. The output is a scenario-model result, not a forecast of the date a CRQC will exist.

### Context

Context features may include data sensitivity, business criticality, internet exposure, migration difficulty and graph blast radius. Weights are ECDAT policy defaults, not NIST-prescribed weights.

## 8. Crypto-agility model

Minimum feature groups:

- algorithm abstraction
- configuration flexibility
- protocol flexibility
- certificate agility
- key-management flexibility
- vendor coupling
- dependency coupling
- deployment coupling
- test coverage
- rollback capability

The first research version should test whether these features correlate with observed migration effort in controlled cases.

## 9. Migration engine

The registry describes:

- algorithm family
- final/standard-track/experimental status
- usage roles supported
- protocol contexts
- key/ciphertext/signature sizes
- compatibility constraints
- implementation sources
- operational trade-offs

Candidate selection must be role-aware. For example, ML-KEM is a KEM/key-establishment primitive and should not be recommended as a direct replacement for a digital-signature role.

## 10. Replay mode

Replay mode uses the same API response shapes as live mode. The source may be a seeded Postgres dataset or packaged normalized scan JSON. The UI displays `REPLAY MODE` and the source snapshot hash. This is the primary demo fallback; screen recording is only a last-resort archive.

## 11. API surfaces

See `21-API-CONTRACT-FREEZE.md` for frozen shapes.

## 12. Security architecture

Scanned content is treated as hostile input. Uploaded source is parsed, never executed. Private keys are not persisted. Archive extraction is bounded. Containers are unprivileged. Outbound network access is disabled for the demo runtime.

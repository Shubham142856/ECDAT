# ECDAT - Demo Product Architecture and PRD

**Product:** Enterprise Cryptographic Discovery & Analysis Tool (ECDAT)  
**SIH:** SIH26164 - NTRO  
**Theme:** Blockchain & Cybersecurity  
**Document:** Demo Product Architecture + Product Requirements Document  
**Purpose:** Build a credible demo product that directly satisfies the SIH requirement while preserving a path to a research-grade platform.

## 1. Product concept

ECDAT discovers cryptographic artefacts across software and infrastructure, records evidence for each finding, builds a cryptographic dependency graph, evaluates quantum and business risk, and produces evidence-backed PQC/hybrid migration recommendations.

**Core product loop:**

DISCOVER -> VERIFY -> INVENTORY -> FUSE EVIDENCE -> GRAPH -> ASSESS -> PRIORITIZE -> RECOMMEND -> SIMULATE -> VALIDATE -> EXPORT

The product is still the SIH26164 solution. Evidence fusion, dependency reasoning, uncertainty-aware risk, crypto-agility, blast-radius analysis, and migration optimization are deeper layers that make the same requested capabilities more useful and more researchable.

## 2. SIH requirement mapping

| SIH requirement | ECDAT implementation |
|---|---|
| Discover algorithms, keys, certificates, protocols, libraries, hardware modules and cloud services | Discovery Engine + Knowledge Registry |
| Scan source repositories | Source/AST Engine |
| Scan binaries | Binary Engine |
| Scan libraries/dependencies | Dependency Engine |
| Scan container images | Container Engine |
| Comprehensive quantum risk assessment | Quantum Risk Engine |
| Classify by type, lifetime, criticality | Asset + Context model |
| Mosca-style analysis | Temporal risk model |
| Recommend PQC/hybrid alternatives | Migration Engine |
| Standardized crypto report | CycloneDX 1.7 CBOM export |
| Interactive GUI | Next.js dashboard |

## 3. Target demo product

### Demo promise

A user uploads or connects a repository and ECDAT returns:

1. a cryptographic inventory;
2. a CycloneDX 1.7 CBOM;
3. evidence/provenance for findings;
4. a dependency graph;
5. quantum-risk findings using a configurable Mosca-style model;
6. a crypto-agility profile;
7. a migration-impact / blast-radius view;
8. PQC/hybrid candidates; and
9. a migration plan with validation gates.

### Demo boundary

The demo should be truthful about coverage. It should deeply support a controlled set of modalities and provide extensible adapters for the rest. The demo should not claim exhaustive binary reverse engineering or complete enterprise cloud coverage.

## 4. Personas

### Security analyst
Wants to know what cryptography exists, where it is used, why it matters, and which assets need attention first.

### Security architect / crypto owner
Wants dependency impact, migration options, crypto-agility, and a defensible migration plan.

### DevSecOps engineer
Wants scan results in CI/CD, source locations, dependency paths, and exportable CBOM data.

### Management / risk owner
Wants a fleet-level view of quantum exposure, critical systems, migration waves, and progress.

## 5. System architecture

### High-level architecture

```text
Users
  |
  v
Web UI
  |
  v
FastAPI API / Orchestrator
  |
  +---------------- Discovery Plane ----------------+
  |   Source/AST  Dependencies  Certs  Binary       |
  |   Containers  Protocol      Cloud/KMS/HSM       |
  +-------------------------+------------------------+
                            |
                            v
                    Evidence Store
                 provenance/confidence/time
                            |
                            v
                    Evidence Fusion
                            |
                            v
                 Cryptographic Graph
                            |
              +-------------+-------------+
              |             |             |
              v             v             v
           Context       Dependency     Data/Business
              \             |             /
               +------------+------------+
                            |
                            v
                   Quantum Risk Engine
                   Mosca + uncertainty
                            |
                            v
                    Crypto-Agility
                            |
                            v
                    Migration Engine
                            |
                +-----------+-----------+
                |                       |
                v                       v
            PQC/Hybrid             Blast Radius
                |                       |
                +-----------+-----------+
                            v
                    Migration Optimizer
                            |
                            v
                     Migration Simulator
                            |
                            v
                     Validation Engine
                            |
                            v
                  CBOM / Reports / UI
```

### Component responsibilities

**1. Web UI** - scan submission, asset inventory, asset detail, risk dashboard, graph explorer, migration planner, reports.

**2. API/Orchestrator** - authentication, scan lifecycle, job orchestration, result aggregation, export, audit logging.

**3. Discovery Engine** - pluggable collectors for source, AST, dependency, certificates, binaries, containers, protocols and cloud metadata.

**4. Evidence Store** - every finding is represented as evidence with provenance, detector, source location, observation time and confidence.

**5. Evidence Fusion** - combines multiple observations into claims and handles corroboration or contradiction.

**6. Cryptographic Graph** - nodes for applications, services, repositories, libraries, algorithms, certificates, keys, protocols, containers, KMS/HSMs and data assets; edges for uses, depends-on, protects, signs, negotiates and deployed-on.

**7. Quantum Risk Engine** - temporal Mosca-style analysis, uncertainty, harvest-now-decrypt-later sensitivity, business criticality and exposure.

**8. Crypto-Agility Engine** - assesses algorithm abstraction, configuration flexibility, dependency coupling, certificate/key agility, vendor coupling, testing and rollback readiness.

**9. Migration Engine** - produces candidate migrations and compares PQC/hybrid options using security, latency, compatibility, cost and lifecycle constraints.

**10. Blast Radius + Optimizer** - computes impacted assets and migration waves; later supports constrained/Pareto optimization.

**11. Validation Engine** - verifies migration proposals using static checks, dependency checks, tests and cryptographic/protocol regression gates.

## 6. Discovery architecture

### Demo-supported deeply

- Git repository / ZIP upload
- Python source and AST analysis
- dependency manifests and lockfiles
- X.509 certificate parsing
- container image filesystem/package inspection
- TLS endpoint observation for approved demo targets

### Demo-supported as controlled adapters

- Java / Go / C/C++ source rules
- binary strings and symbol signals
- cloud/KMS/HSM metadata via imported JSON

### Future adapters

- full binary implementation analysis
- runtime/eBPF observation
- AWS/Azure/GCP live connectors
- SSH/QUIC/EAP-TLS/DTLS/IoT protocol adapters

## 7. Evidence model

Each cryptographic claim should have multiple supporting observations when available.

```text
Evidence
  - evidence_id
  - asset_id
  - source_type
  - source_location
  - detector
  - raw_signal
  - normalized_claim
  - observation_time
  - confidence
  - provenance
  - status
```

Examples of `source_type`:

- AST
- regex
- dependency
- certificate
- binary
- container
- protocol
- runtime
- cloud
- manual

Important semantic rule:

**Capability != implementation != configured use != negotiated use.**

## 8. Asset and graph model

### Core asset types

- Application
- Service
- Repository
- Library
- Binary
- Container
- Algorithm
- Key metadata
- Certificate
- Protocol
- KMS/HSM
- Data asset
- Business service

### Core relationships

- USES
- DEPENDS_ON
- IMPLEMENTS
- PROTECTS
- SIGNS
- ENCRYPTS
- NEGOTIATES
- DEPLOYED_ON
- ISSUED_BY
- STORED_IN

### Example graph

```text
Payment Service
  |-- DEPENDS_ON --> OpenSSL
  |                     |-- PROVIDES --> RSA
  |                     |-- PROVIDES --> ECDSA
  |
  |-- USES --> RSA-2048 --> SIGNS --> JWT
  |-- USES --> ECDSA-P256 --> CERTIFICATE
  |-- NEGOTIATES --> X25519 + ML-KEM-768 --> TLS
  |-- PROTECTS --> Payment Data
```

## 9. Quantum-risk model

### Baseline

Use the Mosca-style condition:

```text
X + Y > Z
```

where:

- X = required data/security lifetime;
- Y = migration time;
- Z = time horizon to a cryptographically relevant quantum capability.

### Research-grade extension

Instead of a single hard-coded Z, allow:

```text
Z ~ P(Z)
```

and compute:

```text
P(X + Y > Z)
```

Then combine this with business/context features. The weights are an ECDAT analytic model and must be configurable and validated; they are not NIST normative weights.

### Demo output

- Quantum exposure probability / band
- Data lifetime
- Estimated migration duration
- Business criticality
- Data sensitivity
- Internet exposure
- Migration difficulty
- Confidence
- Recommended migration wave

## 10. Crypto-agility model

Score or profile the following dimensions:

1. algorithm abstraction;
2. configuration externalization;
3. protocol negotiation flexibility;
4. dependency coupling;
5. certificate agility;
6. key-management flexibility;
7. vendor dependency;
8. deployment coupling;
9. test coverage;
10. rollback capability.

The research question is whether these features predict migration effort and blast radius.

## 11. PQC knowledge and recommendation engine

### Initial standards registry

Use finalized NIST families as the baseline:

- ML-KEM (FIPS 203) for key establishment;
- ML-DSA (FIPS 204) for signatures;
- SLH-DSA (FIPS 205) for signatures.

### Recommendation logic

Do not use hard-coded `if algorithm == ...` rules as the long-term design. Use a registry containing:

- algorithm identifier;
- family and role;
- standard/status;
- security level;
- parameter set;
- key size;
- ciphertext/signature size;
- performance profile;
- protocol support;
- implementation availability;
- certification/lifecycle metadata;
- evidence sources;
- last verification date.

### Example recommendations

- RSA/ECDSA signing -> evaluate ML-DSA candidates, subject to certificate/protocol/library constraints.
- X25519/ECDH in supported TLS deployments -> evaluate hybrid ML-KEM integration where protocol support exists.
- AES-256-GCM -> generally retain; flag quantum-related context only when relevant rather than treating symmetric crypto as an automatic replacement target.

## 12. Migration engine

### Migration states

```text
CLASSICAL
   -> PQ-CAPABLE
   -> HYBRID / DUAL-STACK
   -> PQ AUTHENTICATION / PQ KEM
   -> PQ PREFERRED
   -> CLASSICAL RETIREMENT
```

### Migration strategies

- source refactor;
- dependency upgrade;
- configuration change;
- certificate/PKI migration;
- protocol migration;
- gateway/termination change;
- sidecar / infrastructure strategy as future option.

### Migration plan output

For each candidate:

- current algorithm/role;
- target algorithm/role;
- protocol compatibility;
- dependency changes;
- estimated effort;
- latency impact;
- blast radius;
- rollback strategy;
- validation gates;
- migration wave.

## 13. Blast-radius engine

Given a proposed crypto change, traverse graph edges to identify:

- affected services;
- affected repositories;
- affected libraries;
- affected certificates;
- affected protocols;
- affected containers;
- affected business/data assets.

Demo output:

```text
Proposed change: RSA-2048 -> ML-DSA

Affected services: 6
Affected repositories: 4
Affected certificates: 3
Dependency upgrades: 2
Protocol constraints: 1
Rollback checkpoints: 3
```

These values are derived from the scanned demo corpus, not invented static examples.

## 14. Migration optimizer

For the demo, use a transparent heuristic:

```text
Priority = risk * criticality * confidence / migration_cost
```

with visible factors and user-adjustable constraints.

For the research version, compare:

- greedy risk-first;
- risk/cost ratio;
- constrained optimization;
- Pareto frontier.

Do not present a proprietary or invented heuristic as a standards formula.

## 15. Validation engine

Any migration proposal, especially AI-generated proposals, must pass:

```text
Proposal
  -> syntax/static checks
  -> dependency consistency
  -> build
  -> unit/integration tests
  -> cryptographic tests
  -> protocol regression
  -> security regression
  -> human approval
```

ECDAT should never claim that LLM output is automatically safe merely because it compiles.

## 16. Product screens

### 1. Landing / Overview

- scan new target
- recent scans
- enterprise summary
- top quantum-risk assets

### 2. Scan Center

- Git URL / upload ZIP
- optional container image
- optional test endpoint
- scan modality toggles
- scan progress

### 3. Findings / Inventory

Columns:

- Asset
- Type
- Algorithm
- Role
- Version/Mode
- Evidence count
- Confidence
- Quantum status
- Business criticality
- Migration status

### 4. Asset Detail

Tabs:

- Overview
- Evidence
- Dependencies
- Certificate / protocol
- Quantum risk
- Crypto agility
- Migration

### 5. Graph Explorer

- application
- service
- crypto asset
- dependency links
- data/business context
- blast-radius preview

### 6. Risk Dashboard

- total crypto assets
- quantum-exposed assets
- critical assets
- high-priority migrations
- low-agility assets
- lifecycle issues

### 7. Migration Planner

- selected asset
- candidate alternatives
- compatibility constraints
- affected components
- migration waves
- validation checklist

### 8. Reports

- CycloneDX 1.7 CBOM
- executive report
- risk register
- migration roadmap

## 17. PRD - functional requirements

### FR-01 Target ingestion
The system shall accept a Git repository URL or uploaded repository archive.

### FR-02 Scan orchestration
The system shall create a scan record, execute enabled collectors, and expose scan state and progress.

### FR-03 Source crypto detection
The system shall detect supported cryptographic APIs, algorithms, modes and common usage patterns in supported languages.

### FR-04 AST context
The system shall associate a finding with file, line/range and syntactic context when available.

### FR-05 Dependency discovery
The system shall parse supported manifests/lockfiles and connect libraries to applications.

### FR-06 Certificate discovery
The system shall discover X.509 certificates, extract public metadata, and avoid storing private key material.

### FR-07 Container inspection
The system shall inspect provided container images or extracted image contents for crypto-related artefacts and package dependencies.

### FR-08 Protocol evidence
The system shall support controlled TLS endpoint inspection in the demo.

### FR-09 Evidence capture
Every finding shall retain source type, detector, location, timestamp and confidence.

### FR-10 Evidence fusion
The system shall merge corroborating findings and mark contradictory observations rather than silently overwriting them.

### FR-11 Crypto graph
The system shall build nodes and edges connecting crypto assets to software, protocols, certificates, dependencies and data/business context.

### FR-12 CBOM export
The system shall export a CycloneDX 1.7 compatible CBOM containing the discovered cryptographic inventory.

### FR-13 Quantum risk
The system shall calculate a Mosca-style temporal risk result and show the parameters used.

### FR-14 Business context
The system shall capture or allow user input for data lifetime, business criticality, sensitivity and exposure.

### FR-15 Crypto agility
The system shall present a crypto-agility profile using explicit measurable dimensions.

### FR-16 PQC recommendations
The system shall recommend candidate PQC/hybrid options from a versioned knowledge registry.

### FR-17 Blast radius
The system shall simulate graph impact for a selected migration change.

### FR-18 Migration plan
The system shall generate an ordered migration plan with dependencies and validation gates.

### FR-19 Auditability
The system shall retain scan IDs, detector versions, timestamps and report versions for reproducibility.

### FR-20 Export
The system shall support JSON and CSV exports in addition to CBOM.

## 18. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-01 | Reproducible scan: same input + same detector version should produce stable normalized findings. |
| NFR-02 | No private key material should be persisted by the platform. |
| NFR-03 | Scans must run in isolated workspaces. |
| NFR-04 | Every risk result must show the inputs used. |
| NFR-05 | UI should remain usable for at least tens of thousands of findings in the demo test dataset. |
| NFR-06 | APIs should expose scan IDs and deterministic result retrieval. |
| NFR-07 | System should degrade gracefully when a detector cannot prove a finding. |
| NFR-08 | Security-sensitive actions require authorization and audit logging. |

## 19. Data model (demo)

### Tables

**projects** - id, name, owner, created_at

**scans** - id, project_id, target_type, target_ref, status, detector_version, started_at, completed_at

**assets** - id, scan_id, asset_type, name, algorithm, parameter_set, role, version, mode, lifecycle_status

**evidence** - id, asset_id, source_type, location, detector, raw_signal, confidence, observed_at, provenance

**relationships** - id, src_asset_id, dst_asset_id, relationship_type, confidence

**contexts** - id, asset_id, data_lifetime, criticality, sensitivity, exposure, migration_time

**risk_assessments** - id, asset_id, temporal_probability, contextual_score, overall_band, model_version

**migration_options** - id, asset_id, target_algorithm, strategy, compatibility, estimated_cost, latency_impact

**migration_plans** - id, name, objective, constraint_json, status

**migration_steps** - id, plan_id, asset_id, sequence_no, strategy, prerequisites, rollback, validation_status

**audit_events** - id, actor, action, object_type, object_id, timestamp, metadata

## 20. API surface

```text
POST   /api/v1/projects
POST   /api/v1/scans
GET    /api/v1/scans/{scan_id}
GET    /api/v1/scans/{scan_id}/assets
GET    /api/v1/assets/{asset_id}
GET    /api/v1/assets/{asset_id}/evidence
GET    /api/v1/graph/{scan_id}
GET    /api/v1/risks/{scan_id}
POST   /api/v1/migrations/simulate
POST   /api/v1/migrations/plan
GET    /api/v1/migrations/{plan_id}
GET    /api/v1/reports/{scan_id}/cbom
GET    /api/v1/reports/{scan_id}/risk
GET    /api/v1/reports/{scan_id}/migration
```

## 21. Recommended implementation stack

### Frontend

- Next.js / React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts / Plotly for analytics
- Cytoscape.js or React Flow for graph visualization

### Backend

- Python 3.12+
- FastAPI
- Pydantic
- SQLAlchemy
- PostgreSQL
- Redis for job state/queue

### Analysis

- Tree-sitter for AST parsing
- custom rules + optional Semgrep adapters
- Python `cryptography` for X.509 parsing
- OpenSSL CLI for controlled TLS/certificate checks
- LIEF for binary metadata/symbol inspection
- container image extraction / OCI tooling

### Graph

- PostgreSQL adjacency tables for the demo
- optional Neo4j adapter for deeper graph workloads

### Packaging / deployment

- Docker Compose for the demo
- one-command local startup

## 22. Demo data strategy

Use a synthetic, controlled repository corpus so every finding has known ground truth.

Create small services such as:

- `legacy-auth-service` - RSA signing + JWT
- `legacy-api` - ECDSA certificate metadata
- `payment-service` - AES-256-GCM
- `tls-gateway` - X25519 / hybrid TLS evidence
- `old-utils` - deprecated hash examples
- `pqc-ready-service` - ML-KEM / ML-DSA examples

Also include:

- lockfiles;
- sample PEM certificates;
- one or two container manifests;
- dependency relationships;
- intentionally hidden/wrapped crypto calls for benchmark cases.

Ground truth should be stored separately from the scanner and used only for evaluation.

## 23. Demo narrative

1. User opens ECDAT.
2. Uploads the controlled enterprise demo repository.
3. Starts a scan.
4. Dashboard shows cryptographic assets discovered across source, dependencies, certificates and containers.
5. User opens RSA-2048 JWT signing asset.
6. ECDAT shows source evidence, dependency path, certificate/protocol context and confidence.
7. User opens the graph and selects the RSA asset.
8. ECDAT shows affected services and migration blast radius.
9. User sets data lifetime and business criticality.
10. Risk engine computes Mosca-style temporal exposure and contextual risk.
11. Migration engine proposes ML-DSA candidates and shows compatibility constraints.
12. User runs a migration simulation.
13. ECDAT produces an ordered plan and validation checklist.
14. User exports a CycloneDX 1.7 CBOM and migration report.

## 24. Research layer after the demo

### Track A - Evidence fusion
Compare single-modality vs multimodal discovery using precision, recall, F1, false-negative rate, localization and confidence calibration.

### Track B - Graph reasoning
Compare flat-CBOM prioritization vs graph-based vs evidence+graph prioritization.

### Track C - Probabilistic Mosca
Compare deterministic and probabilistic quantum-risk ranking under uncertain CRQC timelines.

### Track D - Crypto agility
Measure whether agility features predict simulated migration effort.

### Track E - Blast radius
Measure whether graph structure predicts actual impacted components after a seeded migration.

### Track F - Agentic migration
Study whether an evidence-grounded validation loop reduces migration regression compared with unconstrained LLM editing.

## 25. Demo product acceptance criteria

A demo release is complete when:

- a controlled repository can be scanned end-to-end;
- at least 20+ crypto assets are discovered with known ground truth;
- at least 4 discovery modalities contribute evidence;
- each finding has source location and confidence;
- a graph is rendered with asset/dependency relationships;
- Mosca parameters are visible for each risk decision;
- at least three PQC/hybrid recommendations can be demonstrated;
- a selected migration displays its blast radius;
- a migration plan is generated with validation gates;
- a CycloneDX 1.7 CBOM is downloadable;
- the dashboard supports inventory, risk and migration views;
- the product does not store private key material.

## 26. Product roadmap

### Release A - Demo foundation

Repository ingestion, source/AST, dependencies, certificates, evidence store, CBOM, basic risk dashboard.

### Release B - Intelligence

Evidence fusion, graph explorer, contextual risk, crypto-agility profile, TLS evidence.

### Release C - Migration

PQC registry, migration options, blast radius, migration planner, simulator.

### Release D - Advanced discovery

Binary, containers, runtime, cloud/KMS/HSM and additional protocols.

### Release E - Research / agentic layer

Uncertainty models, optimization, benchmark suite, validated migration copilot.

## 27. Security and trust principles

- Scan only repositories/endpoints the operator is authorized to analyze.
- Never ingest private key material into the analytics database.
- Store certificate/key metadata and hashes where possible.
- Isolate uploaded repositories and container extraction.
- Record detector/version provenance.
- Make every risk score explainable from stored inputs.
- Treat external intelligence and LLM output as advisory until validated.
- Keep human approval before production-changing remediation.

## 28. Source and standards basis

1. SIH26164, NTRO - Enterprise Cryptographic Discovery & Analysis Tool. The requirements used in this PRD are based on the SIH26164 problem statement supplied for this project and corroborated by current indexed SIH2026 copies. The official SIH portal was not directly retrievable in this session, so the report does not claim a newly verified official modification.
2. NIST CSWP 39-upd1, Considerations for Achieving Crypto Agility: Strategies and Practices, final June 29, 2026.
3. NIST NCCoE, Migration to Post-Quantum Cryptography FAQ, updated June 30, 2026.
4. CycloneDX v1.7, released October 21, 2025, including expanded CBOM support and provenance-oriented capabilities.
5. CycloneDX Cryptography Registry, introduced with v1.7 for consistent algorithm-family and curve naming.
6. IETF draft-ietf-tls-mlkem-11, September 17, 2026, ML-KEM Post-Quantum Key Agreement for TLS 1.3.

## 29. Final product definition

**ECDAT is an evidence-driven enterprise cryptographic intelligence platform.** It does not stop at finding an algorithm. It connects evidence to actual usage, dependencies, business context and data, translates those facts into quantum and lifecycle risk, and produces a migration plan that can be simulated and validated.

For the demo, the winning vertical slice is:

**Repository -> Discovery -> Evidence -> CBOM -> Risk -> Graph -> Blast Radius -> PQC Recommendation -> Migration Plan -> Validation.**

This remains directly aligned to SIH26164 while leaving room for the deeper research program.

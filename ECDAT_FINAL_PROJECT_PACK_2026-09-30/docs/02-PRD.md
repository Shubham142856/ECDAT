# 02 — Product Requirements Document (PRD)

## 1. Product goals

1. Create an auditable inventory of cryptographic artefacts.
2. Distinguish capability, implementation, usage, configuration and observed evidence.
3. Build a graph connecting cryptography to services, libraries, certificates, data and dependencies.
4. Quantify quantum risk using Mosca-style timing plus uncertainty.
5. Recommend PQC/hybrid alternatives with trade-offs.
6. Predict migration blast radius and sequence work into waves.
7. Export a standards-aligned CBOM and human-readable report.
8. Keep the demo operational even if live scanning fails by replaying precomputed results through the same API/UI.

## 2. SIH requirement mapping

| SIH request | ECDAT implementation |
|---|---|
| Discover algorithms/keys/certs/protocols/libraries/HSM/cloud artefacts | Discovery adapters + knowledge registry; HSM/cloud are staged adapters |
| Scan source repositories | Python + Java source engines |
| Scan binaries | Bounded binary inspection in V1 |
| Scan libraries/dependencies | Manifest/lockfile engine |
| Scan container images | Bounded package/filesystem inspection in V1 |
| Comprehensive quantum-risk assessment | Risk engine with Mosca baseline + probability extension |
| Classify by type/lifetime/criticality | Asset + context model |
| Recommend PQC/hybrid | Registry-driven migration engine |
| Standardized report | CycloneDX 1.7 CBOM + report export |
| Interactive GUI | Next.js dashboard |

## 3. Functional requirements

### 3.1 Ingestion

- FR-01 Create project.
- FR-02 Upload ZIP/repository snapshot and optional certificates/configuration files.
- FR-03 Accept binary artifacts and container tarballs under explicit size/resource limits.
- FR-04 Generate immutable scan ID and input digest.
- FR-05 Support `live` and `replay` scan modes through the same UI/API.

### 3.2 Discovery

- FR-10 Python AST crypto detection.
- FR-11 Java AST crypto detection.
- FR-12 Import alias resolution.
- FR-13 Known algorithm parameters where statically derivable.
- FR-14 YAML/JSON/properties configuration extraction.
- FR-15 Dependency/lockfile capability extraction.
- FR-16 X.509 parsing.
- FR-17 Bounded binary static evidence extraction.
- FR-18 Bounded container/package evidence extraction.
- FR-19 Existing PQC/hybrid recognition.

### 3.3 Evidence and fusion

- FR-20 Store detector, source location, raw signal, normalized claim, confidence and provenance.
- FR-21 Tag every observation with one or more evidence roles.
- FR-22 Merge corroborating evidence into a claim without erasing source records.
- FR-23 Preserve contradictions and weak signals.
- FR-24 Explain confidence contributors.
- FR-25 Support claim states: `supported`, `ambiguous`, `insufficient-context`, `contradictory`.

### 3.4 Graph

- FR-30 Nodes: project, service, repository, source file, library, binary, container, algorithm, certificate, protocol, data asset, KMS/HSM placeholder.
- FR-31 Edges: USES, DEPENDS_ON, IMPLEMENTS, PROVIDES, PROTECTS, SIGNS, ENCRYPTS, NEGOTIATES, DEPLOYED_ON, ISSUED_BY, STORED_IN, CALLS.
- FR-32 Interactive graph with filtering and click-to-inspect.
- FR-33 Enterprise topology may be supplied using `enterprise.yaml`.

### 3.5 Risk

- FR-40 Capture data lifetime X and migration time Y.
- FR-41 Run Mosca baseline `X + Y > Z` using configured scenario input.
- FR-42 Allow Z to be represented as a distribution and compute `P(X + Y > Z)`.
- FR-43 Seed Monte Carlo for reproducibility.
- FR-44 Apply configurable context weights and clearly label them as project policy defaults.
- FR-45 Display all assumptions with risk output.

### 3.6 Migration

- FR-50 Store PQC registry as versioned data, not hard-coded logic.
- FR-51 Generate candidates by usage role.
- FR-52 Distinguish finalized standards, standards-track protocol mechanisms and experimental options.
- FR-53 Show trade-offs: sizes, compatibility, protocol support, deployment fit, migration complexity.
- FR-54 Calculate graph-based blast radius.
- FR-55 Simulate migration before/after states.
- FR-56 Build dependency-aware migration waves.
- FR-57 Label predictions as predicted/modelled, never guaranteed.

### 3.7 Outputs

- FR-60 Export CycloneDX 1.7 CBOM.
- FR-61 Validate CBOM before download.
- FR-62 Export risk and migration reports.
- FR-63 Include input digest and scan provenance.
- FR-64 Optional signed/hash-linked CBOM integrity record.

### 3.8 GUI

- FR-70 Overview.
- FR-71 Scan creation and progress.
- FR-72 Inventory.
- FR-73 Asset detail + evidence.
- FR-74 Graph + blast radius.
- FR-75 Risk.
- FR-76 Migration simulator.
- FR-77 Reports/CBOM.
- FR-78 Replay-mode banner and source status.

## 4. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-01 | Enterprise Lab scan target < 60 s on demo laptop; record actual time. |
| NFR-02 | Blast-radius query target < 2 s on lab graph; record actual time. |
| NFR-03 | Offline runtime for demo. |
| NFR-04 | Same input + same seed → deterministic normalized result. |
| NFR-05 | Never execute uploaded source; never store private keys. |
| NFR-06 | Scanner failures degrade gracefully. |
| NFR-07 | Same API/UI surface for live and replay mode. |
| NFR-08 | Structured logs include scan ID/stage and exclude sensitive file content. |
| NFR-09 | UI is keyboard navigable for inventory and details. |
| NFR-10 | Deployment reproducible using Docker Compose. |

## 5. Acceptance criteria

A build is accepted when it can:

1. Scan the controlled Enterprise Lab and return evidence-backed findings.
2. Show at least one capability-only case and one proven-usage case differently.
3. Show certificate evidence separately from application-usage evidence.
4. Compute Mosca baseline and a probability result with visible assumptions.
5. Show a graph path and blast radius for a selected asset.
6. Offer a PQC/hybrid migration option with explicit trade-offs.
7. Run a migration simulation and mark impact as predicted.
8. Export and validate a CycloneDX 1.7 CBOM.
9. Switch to replay mode without changing the judge-facing UI path.
10. Pass benchmark/security/negative-case tests before demo freeze.

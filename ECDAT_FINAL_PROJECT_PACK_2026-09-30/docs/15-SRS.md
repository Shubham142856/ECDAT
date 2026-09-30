# 15 — Software Requirements Specification (SRS)

**System:** Enterprise Cryptographic Discovery & Analysis Tool (ECDAT)
**Identifier:** SIH26164
**Version:** 1.0
**Date:** 2026-09-30

## 1. Introduction

### 1.1 Purpose

This SRS defines the functional, non-functional, data, security, interface and acceptance requirements for ECDAT. It is the implementation contract derived from the project PRD and architecture.

### 1.2 Intended audience

Development team, security reviewers, research authors, SIH judges and future maintainers.

### 1.3 Product scope

ECDAT discovers cryptographic artefacts from source repositories, dependencies, certificates, bounded binary/container inputs and future protocol/cloud adapters. It preserves evidence, resolves crypto claims, builds a graph, evaluates quantum risk, recommends migration candidates and exports a CBOM.

### 1.4 Out of scope for V1

Deep reverse engineering, live network probing, deep cloud/HSM inventory, autonomous production code changes and advanced global optimization.

## 2. Definitions

| Term | Meaning |
|---|---|
| Asset | A normalized cryptographic entity or context object |
| Evidence | A raw, traceable observation supporting a claim |
| Capability | A component can provide a crypto function |
| Implementation | Crypto implementation/API exists |
| Usage | Application path actually invokes/wires the crypto |
| Configuration | Config selects/constrains crypto |
| Observed | Artifact/protocol/runtime observation directly shows presence |
| CBOM | Cryptography Bill of Materials |
| CRQC | Cryptographically relevant quantum computer |
| PQC | Post-quantum cryptography |
| Mosca model | Timing comparison of data lifetime + migration time against CRQC timing |
| Blast radius | Predicted dependent scope affected by a migration |
| Replay mode | Live UI backed by precomputed, verified scan results |

## 3. System overview

```text
Input artifacts
   ↓
Discovery adapters
   ↓
Evidence store
   ↓
Evidence fusion / claim resolution
   ↓
Crypto graph
   ↓
Risk + agility
   ↓
Migration candidates + blast radius
   ↓
Simulation + validation
   ↓
CBOM/report/UI
```

## 4. Functional requirements

### 4.1 Project and scan lifecycle

**SRS-FR-001** The system shall create a project with a unique ID.

**SRS-FR-002** The system shall accept a repository ZIP or staged directory manifest.

**SRS-FR-003** The system shall accept X.509 certificate files.

**SRS-FR-004** The system shall accept bounded binary files and container image tarballs.

**SRS-FR-005** The system shall calculate a SHA-256 digest for every top-level input artifact.

**SRS-FR-006** The system shall create a unique scan ID and store scan mode as `live` or `replay`.

**SRS-FR-007** The system shall expose scan stages and per-stage status.

### 4.2 Source discovery

**SRS-FR-010** The system shall parse supported Python source without executing it.

**SRS-FR-011** The system shall parse supported Java source using a structural parser/rule engine.

**SRS-FR-012** The system shall resolve simple import aliases.

**SRS-FR-013** The system shall detect configured algorithms in YAML/JSON/properties when statically available.

**SRS-FR-014** The system shall detect known cryptographic API calls and record exact source locations.

**SRS-FR-015** The system shall preserve the original detector signal with each finding.

### 4.3 Dependency discovery

**SRS-FR-020** The system shall parse dependency manifests/lockfiles for supported ecosystems.

**SRS-FR-021** Dependency-only evidence shall be classified as capability unless stronger evidence is proven.

**SRS-FR-022** The system shall record package name, version and source manifest location.

### 4.4 Certificate discovery

**SRS-FR-030** The system shall parse X.509 certificates.

**SRS-FR-031** The system shall extract subject, issuer, validity, SAN, public-key type/parameters and certificate signature algorithm where present.

**SRS-FR-032** The system shall not infer application key-exchange use directly from certificate signature metadata.

### 4.5 Binary/container discovery

**SRS-FR-040** The system shall inspect binary metadata without executing the binary.

**SRS-FR-041** The system shall extract bounded imports, symbols and linked-library evidence when available.

**SRS-FR-042** The system shall inspect container package manifests/filesystems without executing container entrypoints.

**SRS-FR-043** Binary/container signals shall default to capability or observed evidence unless an explicit rule proves stronger usage.

### 4.6 Evidence and fusion

**SRS-FR-050** Every evidence record shall contain source location and detector identity.

**SRS-FR-051** Every record shall contain at least one evidence role.

**SRS-FR-052** The system shall normalize equivalent algorithm names.

**SRS-FR-053** The system shall merge corroborating evidence into a claim while retaining all underlying evidence.

**SRS-FR-054** The system shall expose contradictions.

**SRS-FR-055** Confidence shall be reproducible from versioned rules and configuration.

**SRS-FR-056** The system shall support claim states `supported`, `ambiguous`, `insufficient-context`, and `contradictory`.

### 4.7 Graph

**SRS-FR-060** The system shall persist crypto graph nodes and edges.

**SRS-FR-061** The system shall support service topology input from `enterprise.yaml`.

**SRS-FR-062** The system shall compute direct and transitive dependents.

**SRS-FR-063** The system shall expose a blast-radius endpoint for a selected asset.

### 4.8 Risk

**SRS-FR-070** The system shall collect X and Y values or a documented enterprise-default source.

**SRS-FR-071** The system shall compute the baseline condition `X + Y > Z`.

**SRS-FR-072** The system shall allow Z as a distribution with configurable parameters.

**SRS-FR-073** The system shall calculate `P(X + Y > Z)` with a seeded Monte Carlo process.

**SRS-FR-074** The UI shall show assumptions, seed and distribution parameters.

**SRS-FR-075** Context weights shall be loaded from configuration and marked as ECDAT policy defaults.

### 4.9 Migration

**SRS-FR-080** The system shall maintain a versioned PQC registry.

**SRS-FR-081** The system shall generate candidates by cryptographic usage role.

**SRS-FR-082** The system shall distinguish final standards from standards-track and experimental options.

**SRS-FR-083** The system shall present performance/size/compatibility/implementation trade-offs.

**SRS-FR-084** The system shall calculate predicted migration impact from graph dependencies.

**SRS-FR-085** Predicted impact shall be explicitly labelled as a model prediction.

**SRS-FR-086** The system shall create an ordered wave plan.

### 4.10 Output

**SRS-FR-090** The system shall export CycloneDX 1.7 JSON.

**SRS-FR-091** The system shall validate exported CBOM before download.

**SRS-FR-092** The system shall include provenance references in the report/CBOM extension fields where applicable.

**SRS-FR-093** The system shall support digest and optional detached signature output.

### 4.11 Replay

**SRS-FR-100** The system shall load a verified replay snapshot into the database.

**SRS-FR-101** Replay data shall be served through the same API endpoints used by the live UI.

**SRS-FR-102** The UI shall visibly indicate replay mode.

**SRS-FR-103** Replay mode shall expose snapshot ID, source hash and generation timestamp.

## 5. Non-functional requirements

### 5.1 Performance

- NFR-001: Lab scan target under 60 seconds on the designated demo laptop.
- NFR-002: Blast radius target under 2 seconds for the lab graph.
- NFR-003: Record actual benchmark hardware and timings.

### 5.2 Reliability

- NFR-010: One scanner failure shall not erase independent results.
- NFR-011: Live failure shall not change replay API/UI shapes.

### 5.3 Security

- NFR-020: No source execution.
- NFR-021: No private-key persistence.
- NFR-022: Hostile archive containment.
- NFR-023: No outbound network during offline demo.

### 5.4 Determinism

- NFR-030: Same input, rules, registry, configuration and seed shall produce the same normalized result set.

### 5.5 Usability

- NFR-040: Judge-facing path from overview to evidence to graph to migration should be completable without developer intervention.
- NFR-041: Inventory tables shall support keyboard navigation.

## 6. Data requirements

### 6.1 Evidence schema

```text
Evidence {
  evidence_id
  asset_id
  source_type
  source_location
  observation_time
  detector
  raw_signal
  normalized_claim
  role[]
  confidence
  provenance
  validity
}
```

### 6.2 Asset schema

```text
CryptoAsset {
  asset_id
  family
  algorithm
  variant
  parameters
  usage_role
  lifecycle
  implementation
  quantum_status
  confidence
  context
}
```

## 7. Interface requirements

### 7.1 API

The API shall be REST/JSON and match `21-API-CONTRACT-FREEZE.md`.

### 7.2 UI

The UI shall provide overview, scan, inventory, evidence, graph, risk, simulator, reports and replay status.

## 8. Security requirements

Uploaded content is untrusted. Binary/container stages are bounded and static. Private keys are never stored. Error messages must not echo sensitive file contents.

## 9. Acceptance tests

The project passes SRS acceptance when:

- Enterprise Lab produces expected planted findings.
- Control/negative cases do not become false usage claims.
- Java and Python labelled tests can be scored.
- A selected asset produces a graph/blast-radius result.
- Risk output shows assumptions and probability.
- Migration simulator returns a predicted impact list.
- CBOM validates as CycloneDX 1.7.
- Replay mode reproduces the same response shapes and judge-facing screens.

## 10. Traceability

| Requirement area | Primary document |
|---|---|
| Product behavior | `02-PRD.md` |
| Architecture | `03-ARCHITECTURE.md` |
| Data | `04-DATA-SOURCES.md` |
| Security | `11-SECURITY.md` |
| Testing | `12-TESTING.md` |
| API | `21-API-CONTRACT-FREEZE.md` |
| Demo | `18-DEMO-SCRIPT.md` |

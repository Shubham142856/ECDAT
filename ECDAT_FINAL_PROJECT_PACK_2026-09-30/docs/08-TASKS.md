# 08 — Full Implementation Tasks

This plan has two layers: **A. full research/product build** and **B. 36-hour SIH demo cut**.

## A. Full build sequence

### Phase 0 — Freeze scope

- Define ontology and five evidence roles.
- Freeze API response envelope.
- Freeze scan-state model.
- Define source-status vocabulary.

### Phase 1 — Foundation

- Docker Compose.
- PostgreSQL + Alembic.
- FastAPI + RQ.
- Next.js shell.
- Structured logging.
- Feature flags for live/replay.

### Phase 2 — Data and ground truth

- Enterprise Lab.
- Python and Java manually labelled real set.
- Reference corpus imported with pinned commit SHAs.
- Negative/control fixtures.

### Phase 3 — Discovery

- Python AST.
- Java Tree-sitter/rule engine.
- dependency/lockfiles.
- X.509.
- bounded binary.
- bounded container.

### Phase 4 — Evidence fusion

- normalization.
- deduplication.
- provenance graph.
- confidence model.
- contradiction handling.
- capability-vs-usage resolution.

### Phase 5 — Graph

- node/edge persistence.
- topology ingestion.
- reachability.
- blast radius.
- graph query endpoints.

### Phase 6 — Risk

- Mosca baseline.
- seeded Monte Carlo.
- sensitivity analysis.
- context score.
- crypto-agility profile.

### Phase 7 — Migration

- PQC registry.
- role-aware recommendation engine.
- pure-PQC + hybrid options.
- constraint filters.
- migration waves.
- simulation.
- validation checklist.

### Phase 8 — Output

- CycloneDX 1.7 CBOM.
- digest/signature.
- Markdown/HTML/PDF report layer.

### Phase 9 — UI

- overview.
- scan progress.
- inventory.
- evidence panel.
- graph.
- risk.
- simulator.
- reports.
- replay banner.

### Phase 10 — Evaluation

- benchmark runner.
- precision/recall/F1 by modality and evidence role.
- false-positive analysis.
- performance.
- regression tests.
- ablation: detector-only vs detector+fusion vs graph-context.

### Phase 11 — Security and release

- hostile archives.
- resource limits.
- secret/key exclusion.
- no code execution.
- dependency audit.
- offline verification.
- final checklist.

## B. 36-hour SIH demo cut

| Time | Build |
|---|---|
| 0–3h | Repo, Docker, DB, API shell, UI shell, replay schema |
| 3–7h | Enterprise Lab + ground truth + seed data |
| 7–12h | Python + Java detection + dependency + certificate parsing |
| 12–15h | Bounded binary/container extraction |
| 15–18h | Evidence fusion + role badges + confidence |
| 18–21h | Graph + blast radius |
| 21–24h | Mosca + Monte Carlo + assumptions |
| 24–27h | PQC/hybrid recommender + simulator + waves |
| 27–31h | Inventory/evidence/graph/risk/simulator UI |
| 31–33h | CycloneDX 1.7 CBOM + validation |
| 33–34h | Replay fallback + API freeze check |
| 34–36h | Benchmark snapshot, security smoke tests, 3 dry runs, demo |

## Cut order if late

1. Drop advanced wave optimization.
2. Keep simple blast-radius BFS.
3. Keep bounded binary/container evidence rather than deep analysis.
4. Keep replay mode.
5. Never drop evidence/provenance or truthful role resolution.

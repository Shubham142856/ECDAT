# 13 — Production and Demo Checklist

## Scope

- [ ] V1 scope matches `00-README.md`.
- [ ] Advanced features are labelled roadmap.
- [ ] API contract is frozen.

## Build

- [ ] Clean Docker Compose startup.
- [ ] DB migrations pass from empty DB.
- [ ] Health checks pass.
- [ ] Replay snapshot loads.

## Correctness

- [ ] Capability-only and usage-proven cases are separated.
- [ ] Contradictions visible.
- [ ] Risk assumptions visible.
- [ ] No fixed CRQC date presented as fact.
- [ ] PQC recommendations are role-aware.
- [ ] Predicted migration impact is labelled predicted.

## Discovery

- [ ] Python scanner passes fixture suite.
- [ ] Java scanner passes fixture suite.
- [ ] Dependency scanner passes.
- [ ] X.509 parser passes.
- [ ] Bounded binary scan passes sample.
- [ ] Bounded container scan passes sample.

## Security

- [ ] Archive limits tested.
- [ ] Path traversal tested.
- [ ] No private-key bytes stored.
- [ ] No source execution.
- [ ] Network disabled during demo test.
- [ ] Non-root containers.

## Benchmark

- [ ] Final benchmark artifact saved.
- [ ] Slides use only measured values.
- [ ] Real Python/Java label set documented.
- [ ] 25-finding reference corpus labelled as reference evidence, not benchmark truth.

## Demo reliability

- [ ] Three clean live runs.
- [ ] One reset command restores database.
- [ ] Replay mode works end-to-end.
- [ ] Replay snapshot hash recorded.
- [ ] Short recording kept only as an emergency tertiary fallback.
- [ ] Q&A card reviewed.

## Go / No-Go

GO only when live demo or replay mode can complete the same judge-facing journey without manual database edits.

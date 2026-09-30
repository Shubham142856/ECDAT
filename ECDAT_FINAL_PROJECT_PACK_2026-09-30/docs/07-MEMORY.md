# 07 — Project Memory / Decision Log

## Current state — 2026-09-30

| ID | Decision | Reason |
|---|---|---|
| D-01 | Full project is month-scale; 36h is demo cut only | Avoid forcing research into hackathon timebox |
| D-02 | V1 source depth = Python + Java | Strong, bounded source benchmark path |
| D-03 | V1 includes bounded binary + container inspection | Matches SIH scan surfaces honestly |
| D-04 | Evidence roles = capability, implementation, usage, configuration, observed | Prevent false positives from dependency/backend signals |
| D-05 | Replay mode is primary demo fallback | UI remains live and inspectable; better than a video-only fallback |
| D-06 | CycloneDX target = 1.7 | Current released version in the verified specification snapshot |
| D-07 | No fixed CRQC year | Use model distribution for Z |
| D-08 | Existing real corpus stays as reference/rule-seeding | It covers useful real crypto patterns but is not balanced for Python/Java scoring |
| D-09 | Add small manually labelled Python + Java real corpus | Required before language-level claims |
| D-10 | Generic LLM detection is not the research novelty | Evidence fusion + graph + impact is the core |
| D-11 | Cloud/HSM is an extension interface, not V1 deep coverage | Avoid overclaiming enterprise completeness |

## Current verified assets

- 25 real-world finding records in `data/real-findings.json`.
- Pinned commits and source paths preserved.
- Benchmark metadata in `data/benchmark-sources.json`.
- Current standards references in `14-VERIFICATION-REGISTER.md`.

## Open research questions

1. Does evidence fusion improve capability-vs-usage precision?
2. How much does graph context improve risk prioritization?
3. Can crypto-agility features explain migration effort?
4. Does blast-radius prediction correlate with measured change scope?
5. Can validated agents reduce regression without replacing deterministic detection?

## Known limitations

- Dynamic runtime crypto may be missed.
- Obfuscated/stripped binaries are only boundedly inspected in V1.
- Live protocol observation is deferred.
- Cloud/HSM adapters are staged.
- Business context requires user-entered or synthetic topology metadata.
- Benchmark language coverage must not be generalized beyond the evaluated corpus.

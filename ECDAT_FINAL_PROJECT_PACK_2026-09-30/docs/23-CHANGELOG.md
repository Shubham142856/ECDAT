# 23 — Documentation Corrections and Decisions

## What changed in this final package

### 1. Binary/container scope corrected

Earlier documentation treated binary and container scanning as entirely deferred. That conflicted with SIH26164, which explicitly lists source repositories, binaries, libraries and container images. V1 now includes **bounded** binary/container evidence extraction, while deep analysis remains deferred.

### 2. Five evidence roles locked

Added `implementation` as a separate evidence role. The project now distinguishes capability, implementation, usage, configuration and observed evidence.

### 3. Replay fallback replaces recording-first fallback

The primary fallback is now a precomputed result snapshot loaded into PostgreSQL and exposed through the same API/UI. A recording is only a tertiary archive.

### 4. Python/Java benchmark coverage corrected

The verified 25-finding real corpus is not balanced for Python/Java. It is retained as real reference/rule-seeding data. A small hand-labelled Python + Java real-world set is required before language-level benchmark claims.

### 5. “14,522 repositories” claim removed

Use the safer description `~14,500 public GitHub repositories` for the cited student poster unless an exact dataset manifest is available.

### 6. AutoPQC removed from factual support

No primary artifact was verified strongly enough to use it as a factual project reference.

### 7. RFC status corrected

RFC 10024 is Standards Track. RFC 10042 is Informational.

### 8. FIPS 140-2 date corrected

NIST CMVP states FIPS 140-2 validated modules remain active through September 21, 2026 and are placed on the Historical list from September 22, 2026.

### 9. CycloneDX status corrected

CycloneDX 1.7 is the current released version in the checked specification overview. CycloneDX 2.0 was announced as expected in fall 2026, so it is not treated as released here.

### 10. Novelty wording tightened

Generic CBOM, crypto scanning, Mosca scoring and LLM assistance are treated as existing/overlapping capabilities. Research novelty is framed around evidence fusion, role resolution, graph context, uncertainty and migration-impact prediction.

### 11. Standalone 36-hour plan added

Added `deliverables/ECDAT_36-Hour_Execution_Plan_v2.docx` so the SIH demo schedule is available separately from the full research/product roadmap.

### 12. Package inventory added

Added `docs/24-PACKAGE-INVENTORY.md` so every delivered file has a stated purpose and status, including preserved originals.

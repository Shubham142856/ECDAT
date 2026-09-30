# 24 — Final Package Inventory

**Project:** Enterprise Cryptographic Discovery & Analysis Tool (ECDAT)
**SIH:** SIH26164 · NTRO · Blockchain & Cybersecurity
**Package refresh:** 2026-09-30

This file is the single checklist for the delivered package. The `reference/originals/` directory keeps earlier material unchanged for traceability; the corrected working documents are in `docs/` and `deliverables/`.

## 1. Read these first

1. `README.md` — package entry point.
2. `docs/00-README.md` — master project index and locked decisions.
3. `deliverables/ECDAT_SRS_v1.0.docx` — formal Software Requirements Specification.
4. `docs/16-SIMPLE-STEP-PLAN.md` — simple build order.
5. `docs/17-QUICKSTART.md` — setup and startup.
6. `docs/18-DEMO-SCRIPT.md` — five-minute judge demo.
7. `docs/19-JUDGE-QA.md` — prepared judge questions and answers.
8. `docs/20-FALLBACK-REPLAY-MODE.md` — primary live-UI fallback.
9. `docs/21-API-CONTRACT-FREEZE.md` — frozen frontend/backend contract.
10. `docs/22-RESEARCH-EVALUATION-PLAN.md` — paper-grade evaluation plan.

## 2. Corrected formal deliverables

| File | Purpose |
|---|---|
| `deliverables/ECDAT_SRS_v1.0.docx` | Formal software requirements specification |
| `deliverables/ECDAT_PRD_v2.docx` | Corrected product requirements document |
| `deliverables/ECDAT_Technical_Report_v2.docx` | Corrected technical/research architecture report |
| `deliverables/ECDAT_Project_Documentation_Guide.docx` | Human-facing map of the whole package |

## 3. Core project documentation

| File | Purpose |
|---|---|
| `docs/00-README.md` | Master index, scope, evidence roles, repository map |
| `docs/01-PROJECT-OVERVIEW.md` | Problem, solution, research position and limitations |
| `docs/02-PRD.md` | Working product requirements |
| `docs/03-ARCHITECTURE.md` | Architecture, data flow, graph and risk model |
| `docs/04-DATA-SOURCES.md` | Verified corpus, benchmarks and standards notes |
| `docs/05-MASTER-RULES.md` | Non-negotiable truthfulness and architecture rules |
| `docs/06-RULES.md` | Engineering conventions |
| `docs/07-MEMORY.md` | Project decisions and current state |
| `docs/08-TASKS.md` | Full roadmap plus 36-hour demo cut |
| `docs/09-MICRO-TASKS.md` | Small executable implementation tasks |
| `docs/10-ERROR-HANDLING.md` | Failure handling and graceful degradation |
| `docs/11-SECURITY.md` | Threat model and security controls |
| `docs/12-TESTING.md` | Test layers, benchmark methodology and reproducibility |
| `docs/13-PRODUCTION-CHECKLIST.md` | Demo/release readiness checklist |
| `docs/14-VERIFICATION-REGISTER.md` | Externally verified facts and source status |
| `docs/15-SRS.md` | Markdown form of the complete SRS |
| `docs/16-SIMPLE-STEP-PLAN.md` | Simple step-by-step implementation order |
| `docs/17-QUICKSTART.md` | Local installation and run commands |
| `docs/18-DEMO-SCRIPT.md` | Judge-facing click path and narration |
| `docs/19-JUDGE-QA.md` | Technical Q&A card |
| `docs/20-FALLBACK-REPLAY-MODE.md` | Precomputed-result replay architecture |
| `docs/21-API-CONTRACT-FREEZE.md` | Frozen API endpoints and response shapes |
| `docs/22-RESEARCH-EVALUATION-PLAN.md` | Research questions, ablations and metrics |
| `docs/23-CHANGELOG.md` | Corrections made during this consolidation |
| `docs/24-PACKAGE-INVENTORY.md` | This complete package map |

## 4. Data and configuration

| File | Purpose |
|---|---|
| `data/real-findings.json` | 25 pinned real-world source observations |
| `data/real-corpus-manifest.json` | Repository/commit manifest for the reference corpus |
| `data/benchmark-sources.json` | Verified benchmark-source metadata |
| `data/enterprise-lab-spec.json` | Controlled ground-truth lab specification |
| `data/claim-status.json` | Status of externally supported vs unverified claims |
| `config/pqc-registry.example.json` | Versioned PQC/hybrid registry example |
| `config/risk.example.yaml` | Risk-model configuration example |
| `schemas/real-finding.schema.json` | JSON Schema for real finding records |

## 5. Reference material

| File | Purpose |
|---|---|
| `reference/README.md` | Explains the purpose and status of preserved originals |
| `reference/assets/architecture.png` | Architecture image retained from earlier project work |
| `reference/assets/workflow.png` | Workflow image retained from earlier project work |
| `reference/originals/ECDAT_Demo_Product_Architecture_PRD.docx` | Earlier source document, preserved unchanged |
| `reference/originals/ECDAT_Demo_Product_Architecture_PRD.md` | Earlier source markdown, preserved unchanged |
| `reference/originals/ECDAT_SIH26164_36-Hour_Execution_Plan.pdf` | Earlier 36-hour plan, preserved unchanged |
| `reference/originals/ECDAT_SIH26164_Technical_Report.docx` | Earlier technical report, preserved unchanged |
| `reference/originals/Pasted markdown(20260922-135642).md` | Earlier pasted technical material, preserved unchanged |
| `reference/originals/Pasted markdown(20260922-145839).md` | Earlier pasted project material, preserved unchanged |

## 6. Project control files

| File | Purpose |
|---|---|
| `CLAUDE.md` | Working instructions for implementation agents |
| `PACKAGE-METADATA.json` | Package metadata and directory map |
| `SHA256SUMS.txt` | Integrity hashes for every delivered file |

## 7. Important interpretation of the package

The 25 real findings are **reference evidence**, not a balanced benchmark and not automatically ECDAT-generated results. The controlled Enterprise Lab is the source of exact synthetic ground truth. A small hand-labelled real Python + Java set must be added before making language-level precision/recall claims for those two V1 languages.

Binary and container support is bounded V1 coverage. It does not mean deep reverse engineering, execution of uploaded binaries, container entrypoint execution, or complete enterprise cloud discovery.

Replay mode is the primary demo fallback. It uses the same API/UI path as live mode and exposes the snapshot identity; screen recording remains only an emergency archive.

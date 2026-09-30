# 01 — Project Overview

## 1. Problem

Large organizations can have cryptographic primitives spread across source repositories, dependencies, certificates, binaries, container filesystems, protocols and infrastructure. The hard problem is not only finding strings that look cryptographic; it is determining **what is actually used, why it matters, what evidence supports the claim, and what changes when the crypto is migrated**.

SIH26164 asks for discovery/cataloguing, quantum-risk assessment, classification by type/lifetime/business criticality, Mosca-style analysis, PQC/hybrid recommendations, a standardized CBOM report and an interactive GUI.

## 2. Solution

ECDAT treats cryptography as an enterprise graph rather than a flat list:

```text
Artifacts → Evidence → Claims → Crypto Assets → Dependencies → Business Context
                                     ↓
                                 Risk Model
                                     ↓
                           Migration Alternatives
                                     ↓
                             Blast Radius / Waves
                                     ↓
                                Validation
```

## 3. Core product questions

| Question | ECDAT answer |
|---|---|
| What crypto exists? | Evidence-backed inventory |
| Is it capability or actual use? | Five evidence roles + fusion |
| Where is it connected? | Cryptographic dependency graph |
| What is at quantum risk? | Mosca baseline + probability model + context |
| What happens if it changes? | Blast radius + simulator + wave plan |
| What can an auditor inspect? | Provenance, evidence and CBOM |

## 4. Research hypothesis

A useful research hypothesis is:

> Fusing heterogeneous cryptographic evidence into a provenance-preserving graph can improve crypto-usage classification, quantum-risk prioritization and migration-impact prediction compared with independent scanner outputs.

A second hypothesis is:

> Crypto-agility indicators can explain part of the variation in migration effort and blast radius.

These are hypotheses to test, not claims of proven superiority.

## 5. Competitive-positioning discipline

Do **not** claim novelty for generic CBOM generation, source scanning, certificate inventory, basic Mosca scoring or generic LLM assistance. Existing projects and research overlap with those capabilities.

The research emphasis should remain on evidence fusion, provenance, role resolution, graph-based impact, uncertainty and validated migration simulation.

## 6. Honest limitations

Static analysis can miss dynamic loading, reflection, generated code, obfuscated binaries and runtime-only configuration. A dependency is not usage. A certificate exposes a certificate property, not necessarily every protocol choice. A PQC-capable implementation does not prove PQC negotiation. Business criticality and data lifetime require context supplied by the user or enterprise manifest.

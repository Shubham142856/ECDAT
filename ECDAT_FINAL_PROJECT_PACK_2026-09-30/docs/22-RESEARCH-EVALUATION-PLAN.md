# 22 — Research Evaluation Plan

## 1. Research question

Can heterogeneous cryptographic evidence from source, dependencies, certificates, bounded binaries and containers be fused into a provenance-preserving graph that improves cryptographic usage classification, quantum-risk prioritization and migration-impact prediction over independent detector outputs?

## 2. Research hypotheses

**H1:** Evidence fusion improves capability-vs-usage classification on ambiguous cases.

**H2:** Graph context improves prioritization of assets that affect more downstream services.

**H3:** Crypto-agility features explain part of migration effort variance.

**H4:** Migration simulation can predict affected components with useful recall before code changes occur.

## 3. Experimental conditions

### Detector ablation

- regex baseline
- AST only
- AST + dependency
- full multimodal evidence

### Context ablation

- asset-only risk
- asset + graph context
- asset + graph + agility

### Risk ablation

- fixed-Z Mosca
- distributional Z

## 4. Metrics

Detection:

- precision
- recall
- F1
- false-positive rate
- role accuracy

Reasoning:

- evidence completeness
- claim confidence calibration
- contradiction detection rate

Impact:

- blast-radius recall
- blast-radius precision
- impact-set Jaccard similarity
- migration wave ordering error

Operational:

- scan latency
- memory usage
- replay load time

## 5. Ground-truth protocol

Synthetic fixtures provide exact labels. Real Python/Java cases are manually labelled with source path, commit SHA, line, expected role and reviewer rationale.

The 25 existing real findings remain a **reference corpus**, not a balanced benchmark.

## 6. Statistical discipline

Report sample sizes and confidence intervals where the dataset supports them. Avoid reporting a single percentage without the denominator and label composition.

## 7. Result provenance

Every published result should point to:

- commit SHA
- corpus version
- rule version
- configuration hash
- random seed
- hardware
- software version

## 8. Paper structure

1. Introduction
2. Background and prior art
3. Evidence ontology
4. Fusion method
5. Cryptographic graph
6. Quantum-risk model
7. Migration-impact model
8. Experimental setup
9. Results
10. Threats to validity
11. Conclusion

# 12 — Testing and Benchmarking

## 1. Test layers

```text
Unit → scanner fixtures → fusion tests → graph/risk tests → API integration → UI E2E → security → benchmark
```

## 2. Benchmark corpus

Use:

1. Enterprise Lab synthetic ground truth.
2. Small hand-labelled Python + Java real-world corpus.
3. External Java/Python benchmark datasets where licensing and labels permit.
4. 25-finding reference corpus for rule seeding and cross-language stress cases.

## 3. Benchmark configurations

- C0: regex/string baseline.
- C1: AST/source rules.
- C2: AST + dependency evidence.
- C3: AST + dependency + certificate/binary/container evidence.
- C4: full evidence fusion + graph context.

## 4. Metrics

Report separately:

- precision
- recall
- F1
- false-positive rate
- capability-vs-usage classification accuracy
- role classification accuracy
- confidence calibration (when enough labelled data exists)
- scan latency
- evidence completeness
- blast-radius prediction error
- migration-impact prediction error

Do not pool incomparable tasks into one headline number.

## 5. Ablations

Compare:

- no fusion vs fusion
- no graph context vs graph context
- deterministic Z vs distributional Z
- no crypto-agility features vs agility features

## 6. Negative cases

Must include:

- OpenSSL dependency without application RSA call.
- library method definition without caller usage.
- certificate algorithm without matching key-exchange inference.
- PQC implementation without observed negotiation.
- irrelevant string constants that look like algorithms.

## 7. Reproducibility

Persist:

- input SHA-256
- repo commit SHA
- detector version
- registry version
- config hash
- RNG seed
- benchmark version
- environment/hardware

## 8. Exit criteria

No benchmark number goes into the pitch deck until the result artifact is saved and the test runner can reproduce it.

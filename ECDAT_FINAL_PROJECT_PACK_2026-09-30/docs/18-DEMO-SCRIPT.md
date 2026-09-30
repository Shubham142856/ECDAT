# 18 — 5-Minute Demo Script

## 0:00–0:30 — Problem

“Organizations know that quantum-safe migration is required, but first they need to know where their cryptography actually is. ECDAT turns scattered crypto evidence into an auditable cryptographic digital twin.”

## 0:30–1:10 — Start scan

Click **New Scan → Enterprise Lab**.

Say:

“ECDAT is scanning source, dependencies, certificates and bounded binary/container evidence. Every result carries provenance.”

## 1:10–1:50 — Inventory

Filter to a classical public-key algorithm.

Open one asset.

Point to:

- algorithm
- usage role
- detector
- source path
- line
- confidence

Say:

“The important difference is that ECDAT tells us whether this is capability, implementation, usage, configuration or an observed fact.”

## 1:50–2:30 — Evidence

Open a capability-only control case.

Say:

“A dependency does not automatically mean application usage. The evidence panel makes that distinction visible.”

## 2:30–3:05 — Graph

Open graph and select the asset.

Show blast radius.

Say:

“Before migrating, we need to know what depends on this asset. ECDAT calculates the transitive impact from the graph.”

## 3:05–3:40 — Risk

Open Risk.

Show X, Y, Z distribution and probability.

Say:

“We do not hard-code a Q-Day. Z is a scenario distribution, so this is a probability under explicit assumptions.”

## 3:40–4:25 — Migration

Open Migration Simulator.

Choose a role-correct PQC/hybrid candidate.

Show predicted impacts and migration waves.

Say:

“The output is not simply ‘replace RSA with PQC’. The engine considers role, compatibility, graph dependencies and migration impact.”

## 4:25–4:45 — CBOM

Download the CycloneDX 1.7 CBOM.

Say:

“The result is exportable in a current standardized BOM format and can be validated before download.”

## 4:45–5:00 — Research hook

Say:

“Our research question is whether evidence fusion plus graph context improves crypto-usage classification and migration-impact prediction over independent detector outputs.”

## Fallback

If live workers fail:

- switch to replay mode
- show the same UI sequence
- point out the replay banner and snapshot hash

Do not apologize or start changing the database live.

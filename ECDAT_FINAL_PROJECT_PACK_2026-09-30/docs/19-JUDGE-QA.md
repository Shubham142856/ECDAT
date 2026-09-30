# 19 — Judge Q&A Card

## What is the core idea?

ECDAT builds an evidence-backed cryptographic digital twin: inventory → evidence → graph → risk → migration impact.

## Why not just a CBOM scanner?

A CBOM is an inventory/output format. ECDAT adds evidence-role resolution, graph context, uncertainty-aware risk and migration-impact simulation. Those layers must be evaluated rather than advertised as automatically superior.

## Why not use an LLM to detect crypto directly?

The core detector is deterministic and evidence-oriented so every claim has a source location and reproducible rule. An LLM can be added later for explanation/orchestration, but it should not replace provenance or validation.

## How do you avoid false positives?

By separating capability from implementation, usage, configuration and observed evidence, then fusing corroborating signals and retaining contradictions.

## What if a library contains RSA but the application never calls it?

It is shown as capability/implementation evidence. It is not promoted to application usage unless a usage path is proven.

## How do you calculate quantum risk?

Baseline: `X + Y > Z`. Extended model: sample Z from a configured distribution and report `P(X + Y > Z)`. The number is scenario-dependent and assumptions are shown.

## Why include binaries and containers if the analysis is shallow?

Because SIH26164 names them as scan surfaces. V1 covers them at bounded static depth and labels the resulting evidence honestly. Deep reverse engineering is a later extension.

## What is the research novelty?

The research focus is not generic crypto scanning. It is the measurable chain of evidence fusion → role resolution → graph context → uncertain risk → migration impact.

## How do you validate migration impact?

First as graph-based prediction; then with a validation plan covering compile/test/crypto/protocol/security regression. Predicted impact is never presented as guaranteed.

## How is the demo reliable?

Live and replay use the same API/UI contract. The replay snapshot is loaded into Postgres, so the UI remains interactive even if the live pipeline fails.

## Why not blockchain?

Blockchain is not needed for the core discovery problem. ECDAT can provide integrity using hashes/signatures and optionally a signed/hash-linked evidence chain without forcing a ledger into the architecture.

## What is not built yet?

Deep binary reverse engineering, live protocol probing, cloud/HSM adapters, advanced optimization and autonomous production migration are roadmap items.

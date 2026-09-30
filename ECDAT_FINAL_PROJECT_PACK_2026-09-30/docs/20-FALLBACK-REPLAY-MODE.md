# 20 — Fallback Replay Mode

## Goal

Keep the demo fully interactive when the live scanning pipeline is unavailable.

This is better than relying only on a screen recording because the judge can still click inventory, evidence, graph, risk and migration screens.

## Design

```text
KNOWN-GOOD LIVE SCAN
        ↓
NORMALIZED RESULT SNAPSHOT
        ↓
SHA-256 + metadata
        ↓
PostgreSQL replay dataset
        ↓
SAME FASTAPI ENDPOINTS
        ↓
SAME NEXT.JS UI
```

## Snapshot contents

Store:

- snapshot ID
- source description
- input SHA-256
- scanner version
- registry version
- config hash
- creation time
- scan summary
- assets
- evidence
- graph nodes/edges
- risk results
- migration plans
- CBOM JSON

## API behavior

The API response shapes are the same in live and replay mode. Add only a metadata field such as:

```json
{
  "mode": "replay",
  "snapshot_id": "demo-001",
  "snapshot_sha256": "..."
}
```

## UI behavior

Show a small persistent badge:

`REPLAY MODE · SNAPSHOT demo-001`

The user-facing result pages should remain otherwise identical.

## Operational procedure

1. Perform a known-good live scan.
2. Verify results and CBOM.
3. Export normalized snapshot.
4. Load snapshot into Postgres.
5. Compute snapshot SHA-256.
6. Test all demo screens using replay mode.
7. Record the snapshot ID in `07-MEMORY.md` before freeze.

## Fallback hierarchy

1. Live scan.
2. Replay mode.
3. Short local recording as emergency archive.

Do not make the recording the primary fallback.

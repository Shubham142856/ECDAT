# 21 — API Contract Freeze

**Purpose:** stop frontend/backend drift before demo day.

## Contract rules

- All endpoints JSON.
- Every response includes `request_id`.
- IDs are strings/UUIDs.
- Pagination uses `page`, `page_size`, `total`.
- Error shape follows `10-ERROR-HANDLING.md`.
- Live and replay use the same endpoint paths and payload shapes.

## Core endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/projects` | create project |
| POST | `/api/projects/{id}/artifacts` | register/upload artifact |
| POST | `/api/scans` | start scan |
| GET | `/api/scans/{id}` | scan state |
| GET | `/api/scans/{id}/assets` | inventory |
| GET | `/api/assets/{id}` | asset + evidence |
| GET | `/api/scans/{id}/graph` | graph |
| GET | `/api/assets/{id}/blast-radius` | blast radius |
| GET | `/api/scans/{id}/risk` | risk summary |
| POST | `/api/assets/{id}/simulate` | migration simulation |
| GET | `/api/scans/{id}/plan` | migration waves |
| GET | `/api/scans/{id}/cbom` | CBOM |
| GET | `/api/replay/{snapshot_id}` | replay metadata |

## Standard response envelope

```json
{
  "request_id": "uuid",
  "data": {},
  "meta": {
    "mode": "live",
    "scan_id": "uuid"
  }
}
```

## Asset detail example

```json
{
  "request_id": "uuid",
  "data": {
    "asset_id": "uuid",
    "algorithm": "RSA",
    "usage_role": "signature",
    "quantum_status": "vulnerable",
    "claim_state": "supported",
    "confidence": 0.94,
    "evidence": [
      {
        "evidence_id": "uuid",
        "role": ["implementation", "usage"],
        "detector": "python.ast.rsa_sign",
        "source_location": "service.py:84",
        "raw_signal": "..."
      }
    ]
  },
  "meta": {"mode":"live","scan_id":"uuid"}
}
```

## Risk response example

```json
{
  "request_id":"uuid",
  "data": {
    "mosca": {"x":15,"y":4,"z":22,"at_risk":false},
    "probability": {
      "p_x_plus_y_gt_z": 0.18,
      "samples": 10000,
      "seed": 20260930
    },
    "assumptions": ["Z is triangular scenario distribution"]
  },
  "meta":{"mode":"live","scan_id":"uuid"}
}
```

## Freeze procedure

1. Generate OpenAPI from backend.
2. Review endpoint list.
3. Save example JSON.
4. Frontend consumes only frozen response types.
5. No breaking response changes after freeze.

## Breaking-change rule

Any renamed field, changed enum or changed nesting after freeze requires:

- contract document update
- frontend update
- E2E test rerun
- demo reset + replay rerun

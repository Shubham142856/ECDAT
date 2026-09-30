# 06 — Engineering Rules

## Naming

- Python modules: `snake_case`.
- API models: explicit names (`CryptoAssetResponse`, not `AssetResp`).
- Evidence roles: lower-case enums.
- IDs: UUID for runtime entities; stable content digests for reproducibility.

## Code structure

- Keep detection, normalization, fusion and risk logic separate.
- Detectors emit evidence; fusion decides claims.
- Registry data lives in JSON/YAML, not scattered constants.
- API handlers orchestrate; domain logic stays in `ecdat/`.
- Every scanner has a bounded resource policy.

## Git

- Small commits.
- No secret material.
- No generated benchmark output committed unless it is the benchmark artifact for a tagged release.
- API changes require a contract update in `21-API-CONTRACT-FREEZE.md`.

## Review

A reviewer should ask:

1. What evidence proves this claim?
2. What stronger claim is deliberately **not** made?
3. Can the result be reproduced from the pinned input?
4. What happens if this scanner fails?
5. Does the UI show the assumption or hide it?

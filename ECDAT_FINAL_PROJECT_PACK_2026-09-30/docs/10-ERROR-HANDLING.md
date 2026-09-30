# 10 — Error Handling

## Principles

- Fail the smallest possible unit.
- Preserve partial evidence.
- Tell the user exactly what failed.
- Never silently substitute stronger claims.
- Make replay mode available when computation is unavailable.

## Core error codes

| Code | Meaning | User behavior |
|---|---|---|
| E-1001 | invalid archive | reject and explain |
| E-1002 | archive/resource limit | reject or cap safely |
| E-1003 | path traversal/symlink escape | reject entry/archive |
| E-1004 | invalid enterprise manifest | show field-level error |
| E-1005 | unsupported input | show supported types |
| E-2001 | scanner exception | keep other scanner results |
| E-2002 | scanner timeout | keep partial results |
| E-2003 | parse failure | skip file, log stage event |
| E-3001 | registry failure | block migration stage |
| E-3002 | config failure | use explicitly labelled safe default or mark insufficient |
| E-4001 | fusion unresolved | retain evidence, claim unresolved |
| E-4002 | graph inconsistency | drop invalid edge, preserve node |
| E-4003 | missing risk context | mark insufficient-context |
| E-4004 | no migration candidate | show no recommendation available |
| E-5001 | CBOM validation failure | block download |
| E-5002 | signing failure | offer unsigned export with visible warning |
| E-6001 | replay snapshot missing | show fallback unavailable |
| E-9001 | DB unavailable | live scan blocked; replay may continue if local snapshot is available |
| E-9002 | queue unavailable | move to replay or show degraded mode |

## Scan state

```text
QUEUED → RUNNING → COMPLETED
                   ↘ COMPLETED_WITH_WARNINGS
RUNNING → FAILED
```

A replay scan should use a separate state flag `mode = replay`, not pretend that a live scan ran.

## Frontend

Every page needs loading, empty, warning, error and replay states.

# 11 — Security Architecture

## Security goals

1. Do not execute uploaded code.
2. Do not persist private keys or secrets.
3. Contain hostile archives.
4. Keep the demo offline.
5. Preserve CBOM/report integrity.
6. Leave an audit trail.
7. Protect the scanner itself from untrusted input.

## Threats and controls

| Threat | Control |
|---|---|
| Zip bomb | file count, size and compression-ratio limits |
| Path traversal | canonical path check before extraction |
| Symlink escape | reject unsafe symlinks |
| Malicious parser input | isolated worker, timeout, memory limits |
| Secret leakage | secret-pattern tests; no private-key persistence |
| Container escape | non-root, no privileged mode, read-only where possible |
| Network exfiltration | no outbound network in demo |
| Tampered export | digest + optional signature |
| Prompt-injection-style repo content | deterministic scanner core; AI never controls security policy |

## Binary/container safety

Treat binary and container artifacts as opaque hostile input. Do not execute binaries, invoke package install scripts or run container entrypoints. Container handling is filesystem/package inspection only.

## Secret handling

A certificate may be parsed. A private key should be detected and classified but not stored. The UI should show a redacted finding such as `private-key-material-present` without the key bytes.

# 04 — Data Sources, Corpus and Verification

## 1. SIH source status

The currently indexed SIH26164 record identifies:

- NTRO as organization
- Software category
- Blockchain & Cybersecurity theme
- discovery of cryptographic artefacts across applications/infrastructure
- source repositories, binaries, libraries and container images as scan surfaces
- quantum-risk assessment using Mosca-style timing
- PQC/hybrid recommendations
- standardized reporting and an interactive GUI

A direct `sih.gov.in` capture was not available during this refresh. The indexed mirror is therefore cited as the working textual source, not represented as a direct official-portal capture.

## 2. Three-layer data strategy

### Layer A — Real-world corpus

Pinned upstream repositories with exact commit SHAs and source locations. These are genuine source observations and are not synthetic ECDAT output.

### Layer B — Controlled Enterprise Lab

Purpose-built fixtures with known ground truth for:

- straightforward API calls
- aliases
- wrappers
- configuration-selected algorithms
- capability-only dependencies
- contradictory evidence
- negative cases
- PQC/hybrid positives
- certificate-vs-usage separation

### Layer C — Enterprise composition

Synthetic topology that connects real component observations into a controlled enterprise-shaped graph. The topology is synthetic and must be labeled as such.

## 3. Verified real corpus

The package contains 25 pinned findings across these projects:

- `openssl/openssl`
- `aws/s2n-tls`
- `rustls/rustls`
- `openssh/openssh-portable`
- `FiloSottile/age`
- `WireGuard/wireguard-go`
- `jedisct1/libsodium`
- `golang-jwt/jwt`
- `cert-manager/cert-manager`
- `smallstep/certificates`
- `open-quantum-safe/liboqs`
- `open-quantum-safe/oqs-provider`
- `curl/curl`
- `aws/aws-lc`

See `data/real-findings.json` for the exact finding records, paths and commits.

## 4. Critical interpretation examples

- OpenSSL RSA generation code is library implementation evidence, not proof that every consuming application uses RSA.
- `golang-jwt/jwt` defines RSA/JWS signing methods; that is capability/method evidence unless a caller path is proven.
- `s2n-tls` hybrid KEM entries demonstrate implementation/configuration capability, not runtime negotiation by an arbitrary deployed endpoint.
- `curl` OpenSSL backend integration is intentionally a control case: backend dependency is not specific algorithm usage proof.
- `age` gives an application-level mixed classical/PQ example with ML-KEM-768 + X25519 plus symmetric primitives.

## 5. Benchmark sources

### CamBench

Real Java applications with manually labeled usages, synthetic capability cases and a heuristic coverage set. Use for Java detection research; do not treat it as a complete enterprise CBOM benchmark.

### CryptoAPI-Bench

A Java crypto-misuse benchmark describing 16 vulnerability cases in its README. Use for regression and misuse-oriented tests.

### Python Crypto Misuses study dataset

A historical study dataset covering top Python GitHub repositories by stars plus dependencies. Use as a historical real-world corpus, not current ecosystem prevalence.

### pqc-sig-bench-c

A benchmark harness for PQ signature and traditional signature operations. Example values in the upstream project are not ECDAT measurements.

### RSL PQC Benchmarks

Methodology/scaffolding source; do not import measurement claims unless ECDAT reproduces them locally.

## 6. Required new benchmark addition

The verified real corpus is weighted toward C/Go/Rust and supporting libraries. Because V1 source analysis is Python + Java, ECDAT should add a **small hand-labelled Python + Java real-world set** before reporting language-level benchmark scores.

This set should record:

`repo + commit + file + line + evidence role + expected finding + manual label rationale`

Do not replace the 25-finding reference corpus; use both.

## 7. Source status vocabulary

```text
AUTHORITATIVE       official standard/specification/source
PRIMARY-REPO        pinned upstream repository observation
EXTERNAL-STUDY      published external benchmark/study
SELF-REPORTED       metric claimed by a tool/project itself
SYNTHETIC-GT        ECDAT-controlled ground truth
UNVERIFIED          not used as factual support
```

## 8. Important standards snapshot

- NIST FIPS 203: ML-KEM, final 2024; NIST page also carries an errata planning note.
- NIST FIPS 204: ML-DSA, final 2024; NIST page carries a 2026 errata planning note.
- NIST FIPS 205: SLH-DSA, final 2024.
- RFC 10024: TLS 1.3 PQ/T hybrid key agreement, Standards Track, published August 2026.
- RFC 10042: SSH PQ/T hybrid key exchange, Informational, published August 2026.
- CycloneDX 1.7: current released version in the checked specification overview; 2.0 was announced as expected in fall 2026 but is not treated here as released.
- FIPS 140-2: CMVP says modules remain active through September 21, 2026 and move to Historical status from September 22, 2026; FIPS 140-3 remains the active path.

Exact URLs are in `14-VERIFICATION-REGISTER.md` and the machine-readable configuration files.

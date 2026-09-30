# 14 — Verification Register

**Verification date:** 2026-09-30

## 1. SIH26164

Working source: `https://sih2026.vuce.in/ps/SIH26164`

The indexed record identifies SIH26164 as Enterprise Cryptographic Discovery & Analysis Tool (ECDAT), NTRO, Software, Blockchain & Cybersecurity, and describes discovery of cryptographic artefacts, quantum-risk assessment, Mosca-style timing, PQC/hybrid recommendations, source/binary/library/container scanning, standardized reporting and an interactive GUI.

**Limitation:** this refresh did not retrieve the official `sih.gov.in` page directly; the indexed mirror is therefore a working textual source rather than an official-portal capture.

## 2. Standards / protocol sources

| Item | Status checked | URL |
|---|---|---|
| NIST FIPS 203 | Final, Aug 13 2024; errata planning note on page | https://csrc.nist.gov/pubs/fips/203/final |
| NIST FIPS 204 | Final, Aug 13 2024; 2026 errata planning note | https://csrc.nist.gov/pubs/fips/204/final |
| NIST FIPS 205 | Final, Aug 13 2024 | https://csrc.nist.gov/pubs/fips/205/final |
| NIST CSWP 39-upd1 | Crypto-agility reference | https://csrc.nist.gov/pubs/cswp/39/upd1/considerations-for-achieving-crypto-agility/final |
| NIST CMVP | FIPS 140-2 active through Sep 21 2026; Historical from Sep 22 2026 | https://csrc.nist.gov/projects/cryptographic-module-validation-program |
| RFC 10024 | Standards Track; TLS 1.3 PQ/T hybrid KEX; Aug 2026 | https://www.rfc-editor.org/rfc/rfc10024.html |
| RFC 10042 | Informational; SSH PQ/T hybrid KEX; Aug 2026 | https://www.rfc-editor.org/rfc/rfc10042.html |
| CycloneDX 1.7 | Current released version in checked overview; released 2025-10-21 | https://cyclonedx.org/specification/overview/ |
| CycloneDX 2.0 | Announcement says expected fall 2026; not treated as released here | https://cyclonedx.org/news/ |

## 3. Real repository corpus

See `data/real-findings.json`. It contains 25 records tied to exact paths and 40-character commit SHAs. The findings are source observations, not ECDAT benchmark results.

## 4. Benchmark sources

See `data/benchmark-sources.json`. Current package uses CamBench, CryptoAPI-Bench, the Python crypto-misuse study dataset, pqc-sig-bench-c and RSL PQC Benchmarks as documented external sources.

## 5. Claims intentionally not made

- No fixed CRQC arrival year.
- No claim that the 25 real findings are a statistically representative sample.
- No claim that the 25 findings equal ECDAT benchmark ground truth.
- No exact 2026 PQC adoption percentage imported from a student poster as project ground truth.
- No AutoPQC claim; it remains unverified in this documentation set.
- No copied upstream benchmark number presented as an ECDAT measurement.

# ECDAT Real-Corpus & Dataset Manifest

The real-corpus clones and benchmark datasets are **not stored in this repository**
(they are large external codebases). Follow the instructions below to recreate them locally.

---

## Real-Corpus (4 Pinned Repositories)

These are the production open-source codebases scanned during SIH26164 evidence collection.
Each is pinned to a specific commit to ensure reproducibility (Rule 23).

```bash
mkdir -p real-corpus && cd real-corpus

# PyJWT — Python JWT library
git clone https://github.com/jpadilla/pyjwt.git PyJWT
git -C PyJWT checkout b5bd6fe

# Certbot — ACME client with heavy X.509 usage
git clone https://github.com/certbot/certbot.git certbot
git -C certbot checkout 4856493

# Paramiko — Python SSH2 library
git clone https://github.com/paramiko/paramiko.git paramiko
git -C paramiko checkout 142f593

# JJWT — Java JWT library (Gradle/Maven project)
git clone https://github.com/jwtk/jjwt.git jjwt
git -C jjwt checkout fb71496
```

---

## Benchmark Datasets (2 Academic Benchmarks)

```bash
mkdir -p datasets && cd datasets

# CamBench — Cambridge cryptography misuse benchmark
git clone https://github.com/CryptoAnalysisTargets/CamBench.git cambench

# CryptoAPI-Bench — Java cryptographic API misuse benchmark
git clone https://github.com/CryptoGuardOSS/cryptoapi-bench.git cryptoapi-bench
```

---

## Scan Results

Pre-computed scan reports are stored in `reports/` (excluded from git by size).
To re-run all scans from scratch:

```bash
# From the repository root
& ".venv\Scripts\python.exe" scratch_rescan.py
```

Output will be written to `reports/rescan_<corpus>/`.

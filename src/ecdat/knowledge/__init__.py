"""
ECDAT Knowledge — Algorithm aliases table and crypto package registry.

This file is the authoritative source for:
  - Normalizing algorithm names from scanner output
  - Identifying packages that provide cryptographic capability
  - Mapping package → capability evidence (never usage)
"""
from __future__ import annotations
from typing import Optional
from ecdat.ontology import AlgorithmFamily, QuantumStatus, Lifecycle


# ---------------------------------------------------------------------------
# Algorithm name alias table
# Normalize raw detector strings → canonical names used throughout ECDAT.
# Source: NIST FIPS 203/204/205, IETF RFCs, common library API conventions.
# ---------------------------------------------------------------------------

ALGORITHM_ALIASES: dict[str, dict] = {
    # RSA variants
    "rsa":               {"canonical": "RSA",    "family": AlgorithmFamily.ASYMMETRIC_CIPHER, "quantum_status": QuantumStatus.VULNERABLE},
    "rsa-pkcs1":         {"canonical": "RSA",    "family": AlgorithmFamily.ASYMMETRIC_CIPHER, "quantum_status": QuantumStatus.VULNERABLE},
    "rsa-oaep":          {"canonical": "RSA-OAEP","family": AlgorithmFamily.ASYMMETRIC_CIPHER,"quantum_status": QuantumStatus.VULNERABLE},
    "rsa-pss":           {"canonical": "RSA-PSS","family": AlgorithmFamily.DIGITAL_SIGNATURE, "quantum_status": QuantumStatus.VULNERABLE},
    "sha256withrsa":     {"canonical": "RSA",    "family": AlgorithmFamily.DIGITAL_SIGNATURE, "quantum_status": QuantumStatus.VULNERABLE},
    "sha384withrsa":     {"canonical": "RSA",    "family": AlgorithmFamily.DIGITAL_SIGNATURE, "quantum_status": QuantumStatus.VULNERABLE},
    "sha512withrsa":     {"canonical": "RSA",    "family": AlgorithmFamily.DIGITAL_SIGNATURE, "quantum_status": QuantumStatus.VULNERABLE},
    "sha256withrsa/pss": {"canonical": "RSA-PSS","family": AlgorithmFamily.DIGITAL_SIGNATURE, "quantum_status": QuantumStatus.VULNERABLE},
    "rs256":             {"canonical": "RSA",    "family": AlgorithmFamily.DIGITAL_SIGNATURE, "quantum_status": QuantumStatus.VULNERABLE},
    "rs384":             {"canonical": "RSA",    "family": AlgorithmFamily.DIGITAL_SIGNATURE, "quantum_status": QuantumStatus.VULNERABLE},
    "rs512":             {"canonical": "RSA",    "family": AlgorithmFamily.DIGITAL_SIGNATURE, "quantum_status": QuantumStatus.VULNERABLE},
    "ps256":             {"canonical": "RSA-PSS","family": AlgorithmFamily.DIGITAL_SIGNATURE, "quantum_status": QuantumStatus.VULNERABLE},
    "ps384":             {"canonical": "RSA-PSS","family": AlgorithmFamily.DIGITAL_SIGNATURE, "quantum_status": QuantumStatus.VULNERABLE},
    "ps512":             {"canonical": "RSA-PSS","family": AlgorithmFamily.DIGITAL_SIGNATURE, "quantum_status": QuantumStatus.VULNERABLE},

    # ECC variants
    "ecdsa":             {"canonical": "ECDSA",   "family": AlgorithmFamily.DIGITAL_SIGNATURE, "quantum_status": QuantumStatus.VULNERABLE},
    "ecdsawithsha256":   {"canonical": "ECDSA",   "family": AlgorithmFamily.DIGITAL_SIGNATURE, "quantum_status": QuantumStatus.VULNERABLE},
    "ecdsawithsha384":   {"canonical": "ECDSA",   "family": AlgorithmFamily.DIGITAL_SIGNATURE, "quantum_status": QuantumStatus.VULNERABLE},
    "ecdh":              {"canonical": "ECDH",    "family": AlgorithmFamily.KEY_AGREEMENT,     "quantum_status": QuantumStatus.VULNERABLE},
    "p-256":             {"canonical": "ECDSA",   "family": AlgorithmFamily.DIGITAL_SIGNATURE, "quantum_status": QuantumStatus.VULNERABLE, "variant": "P-256"},
    "p-384":             {"canonical": "ECDSA",   "family": AlgorithmFamily.DIGITAL_SIGNATURE, "quantum_status": QuantumStatus.VULNERABLE, "variant": "P-384"},
    "secp256r1":         {"canonical": "ECDSA",   "family": AlgorithmFamily.DIGITAL_SIGNATURE, "quantum_status": QuantumStatus.VULNERABLE, "variant": "secp256r1"},
    "secp384r1":         {"canonical": "ECDSA",   "family": AlgorithmFamily.DIGITAL_SIGNATURE, "quantum_status": QuantumStatus.VULNERABLE, "variant": "secp384r1"},

    # Curve25519 family
    "x25519":            {"canonical": "X25519",     "family": AlgorithmFamily.KEY_AGREEMENT,    "quantum_status": QuantumStatus.VULNERABLE},
    "curve25519":        {"canonical": "Curve25519",  "family": AlgorithmFamily.KEY_AGREEMENT,    "quantum_status": QuantumStatus.VULNERABLE},
    "ed25519":           {"canonical": "Ed25519",     "family": AlgorithmFamily.DIGITAL_SIGNATURE,"quantum_status": QuantumStatus.VULNERABLE},

    # AES variants
    "aes":               {"canonical": "AES",        "family": AlgorithmFamily.SYMMETRIC_CIPHER, "quantum_status": QuantumStatus.CONDITIONALLY_SAFE},
    "aes-128-gcm":       {"canonical": "AES",        "family": AlgorithmFamily.SYMMETRIC_CIPHER, "quantum_status": QuantumStatus.CONDITIONALLY_SAFE, "variant": "128-GCM"},
    "aes-256-gcm":       {"canonical": "AES",        "family": AlgorithmFamily.SYMMETRIC_CIPHER, "quantum_status": QuantumStatus.SAFE,               "variant": "256-GCM"},
    "aes-128-cbc":       {"canonical": "AES",        "family": AlgorithmFamily.SYMMETRIC_CIPHER, "quantum_status": QuantumStatus.CONDITIONALLY_SAFE, "variant": "128-CBC"},
    "aes-256-cbc":       {"canonical": "AES",        "family": AlgorithmFamily.SYMMETRIC_CIPHER, "quantum_status": QuantumStatus.SAFE,               "variant": "256-CBC"},
    "aes256":            {"canonical": "AES",        "family": AlgorithmFamily.SYMMETRIC_CIPHER, "quantum_status": QuantumStatus.SAFE,               "variant": "256"},
    "aes128":            {"canonical": "AES",        "family": AlgorithmFamily.SYMMETRIC_CIPHER, "quantum_status": QuantumStatus.CONDITIONALLY_SAFE, "variant": "128"},

    # ChaCha20
    "chacha20-poly1305":    {"canonical": "ChaCha20-Poly1305",   "family": AlgorithmFamily.SYMMETRIC_CIPHER, "quantum_status": QuantumStatus.SAFE},
    "xchacha20-poly1305":   {"canonical": "XChaCha20-Poly1305",  "family": AlgorithmFamily.SYMMETRIC_CIPHER, "quantum_status": QuantumStatus.SAFE},
    "chacha20poly1305":     {"canonical": "ChaCha20-Poly1305",   "family": AlgorithmFamily.SYMMETRIC_CIPHER, "quantum_status": QuantumStatus.SAFE},

    # Hash algorithms
    "sha-256":           {"canonical": "SHA-256", "family": AlgorithmFamily.HASH, "quantum_status": QuantumStatus.SAFE},
    "sha256":            {"canonical": "SHA-256", "family": AlgorithmFamily.HASH, "quantum_status": QuantumStatus.SAFE},
    "sha-384":           {"canonical": "SHA-384", "family": AlgorithmFamily.HASH, "quantum_status": QuantumStatus.SAFE},
    "sha384":            {"canonical": "SHA-384", "family": AlgorithmFamily.HASH, "quantum_status": QuantumStatus.SAFE},
    "sha-512":           {"canonical": "SHA-512", "family": AlgorithmFamily.HASH, "quantum_status": QuantumStatus.SAFE},
    "sha512":            {"canonical": "SHA-512", "family": AlgorithmFamily.HASH, "quantum_status": QuantumStatus.SAFE},
    "sha-1":             {"canonical": "SHA-1",   "family": AlgorithmFamily.HASH, "quantum_status": QuantumStatus.VULNERABLE, "lifecycle": Lifecycle.DEPRECATED},
    "sha1":              {"canonical": "SHA-1",   "family": AlgorithmFamily.HASH, "quantum_status": QuantumStatus.VULNERABLE, "lifecycle": Lifecycle.DEPRECATED},
    "md5":               {"canonical": "MD5",     "family": AlgorithmFamily.HASH, "quantum_status": QuantumStatus.VULNERABLE, "lifecycle": Lifecycle.DEPRECATED},
    "blake2s":           {"canonical": "BLAKE2s", "family": AlgorithmFamily.HASH, "quantum_status": QuantumStatus.SAFE},
    "blake2b":           {"canonical": "BLAKE2b", "family": AlgorithmFamily.HASH, "quantum_status": QuantumStatus.SAFE},

    # MAC
    "hmac":              {"canonical": "HMAC",    "family": AlgorithmFamily.MAC, "quantum_status": QuantumStatus.SAFE},
    "hmac-sha256":       {"canonical": "HMAC",    "family": AlgorithmFamily.MAC, "quantum_status": QuantumStatus.SAFE, "variant": "SHA-256"},
    "poly1305":          {"canonical": "Poly1305","family": AlgorithmFamily.MAC, "quantum_status": QuantumStatus.SAFE},

    # KDF
    "hkdf":              {"canonical": "HKDF",    "family": AlgorithmFamily.KDF, "quantum_status": QuantumStatus.SAFE},
    "pbkdf2":            {"canonical": "PBKDF2",  "family": AlgorithmFamily.KDF, "quantum_status": QuantumStatus.CONDITIONALLY_SAFE},
    "scrypt":            {"canonical": "scrypt",  "family": AlgorithmFamily.KDF, "quantum_status": QuantumStatus.CONDITIONALLY_SAFE},
    "argon2":            {"canonical": "Argon2",  "family": AlgorithmFamily.KDF, "quantum_status": QuantumStatus.CONDITIONALLY_SAFE},

    # --- PQC STANDARDS (NIST FIPS 203/204/205 — final 2024) ---
    "ml-kem":            {"canonical": "ML-KEM",  "family": AlgorithmFamily.PQC_KEM,       "quantum_status": QuantumStatus.SAFE, "standard": "NIST FIPS 203"},
    "ml-kem-512":        {"canonical": "ML-KEM",  "family": AlgorithmFamily.PQC_KEM,       "quantum_status": QuantumStatus.SAFE, "variant": "512",  "standard": "NIST FIPS 203"},
    "ml-kem-768":        {"canonical": "ML-KEM",  "family": AlgorithmFamily.PQC_KEM,       "quantum_status": QuantumStatus.SAFE, "variant": "768",  "standard": "NIST FIPS 203"},
    "ml-kem-1024":       {"canonical": "ML-KEM",  "family": AlgorithmFamily.PQC_KEM,       "quantum_status": QuantumStatus.SAFE, "variant": "1024", "standard": "NIST FIPS 203"},
    "mlkem768":          {"canonical": "ML-KEM",  "family": AlgorithmFamily.PQC_KEM,       "quantum_status": QuantumStatus.SAFE, "variant": "768",  "standard": "NIST FIPS 203"},
    "mlkem1024":         {"canonical": "ML-KEM",  "family": AlgorithmFamily.PQC_KEM,       "quantum_status": QuantumStatus.SAFE, "variant": "1024", "standard": "NIST FIPS 203"},
    "kyber":             {"canonical": "ML-KEM",  "family": AlgorithmFamily.PQC_KEM,       "quantum_status": QuantumStatus.SAFE, "note": "Kyber is ML-KEM draft name"},

    "ml-dsa":            {"canonical": "ML-DSA",  "family": AlgorithmFamily.PQC_SIGNATURE, "quantum_status": QuantumStatus.SAFE, "standard": "NIST FIPS 204"},
    "ml-dsa-44":         {"canonical": "ML-DSA",  "family": AlgorithmFamily.PQC_SIGNATURE, "quantum_status": QuantumStatus.SAFE, "variant": "44",   "standard": "NIST FIPS 204"},
    "ml-dsa-65":         {"canonical": "ML-DSA",  "family": AlgorithmFamily.PQC_SIGNATURE, "quantum_status": QuantumStatus.SAFE, "variant": "65",   "standard": "NIST FIPS 204"},
    "ml-dsa-87":         {"canonical": "ML-DSA",  "family": AlgorithmFamily.PQC_SIGNATURE, "quantum_status": QuantumStatus.SAFE, "variant": "87",   "standard": "NIST FIPS 204"},
    "dilithium":         {"canonical": "ML-DSA",  "family": AlgorithmFamily.PQC_SIGNATURE, "quantum_status": QuantumStatus.SAFE, "note": "Dilithium is ML-DSA draft name"},

    "slh-dsa":           {"canonical": "SLH-DSA", "family": AlgorithmFamily.PQC_SIGNATURE, "quantum_status": QuantumStatus.SAFE, "standard": "NIST FIPS 205"},
    "sphincs+":          {"canonical": "SLH-DSA", "family": AlgorithmFamily.PQC_SIGNATURE, "quantum_status": QuantumStatus.SAFE, "note": "SPHINCS+ is SLH-DSA draft name"},

    # --- PQC Hybrid KEX (IETF RFC 10024 — Standards Track, August 2026) ---
    "x25519mlkem768":    {"canonical": "X25519MLKEM768",    "family": AlgorithmFamily.HYBRID_KEM, "quantum_status": QuantumStatus.HYBRID, "standard": "IETF RFC 10024"},
    "x25519mlkem768-sha256": {"canonical": "X25519MLKEM768","family": AlgorithmFamily.HYBRID_KEM,"quantum_status": QuantumStatus.HYBRID, "standard": "IETF RFC 10024"},
    "secp256r1mlkem768": {"canonical": "SecP256r1MLKEM768", "family": AlgorithmFamily.HYBRID_KEM, "quantum_status": QuantumStatus.HYBRID, "standard": "IETF RFC 10024"},
    "secp384r1mlkem1024":{"canonical": "SecP384r1MLKEM1024","family": AlgorithmFamily.HYBRID_KEM, "quantum_status": QuantumStatus.HYBRID, "standard": "IETF RFC 10024"},

    # SSH hybrid (RFC 10042 — Informational, August 2026)
    "mlkem768x25519-sha256":   {"canonical": "mlkem768x25519-sha256",  "family": AlgorithmFamily.HYBRID_KEM, "quantum_status": QuantumStatus.HYBRID, "standard": "IETF RFC 10042"},
    "sntrup761x25519-sha512":  {"canonical": "sntrup761x25519-sha512", "family": AlgorithmFamily.HYBRID_KEM, "quantum_status": QuantumStatus.HYBRID},

    # TLS Protocol
    "tls": {"canonical": "TLS",  "family": AlgorithmFamily.UNKNOWN, "quantum_status": QuantumStatus.UNKNOWN},
    "ssl": {"canonical": "SSL",  "family": AlgorithmFamily.UNKNOWN, "quantum_status": QuantumStatus.VULNERABLE, "lifecycle": Lifecycle.DEPRECATED},
}


def normalize_algorithm(raw: str) -> dict:
    """Return canonical metadata for a raw algorithm name.

    Returns a dict with keys: canonical, family, quantum_status, and optional variant, standard, note.
    If the raw name is not in the alias table, the canonical name is the
    original string (title-cased) and family/status are UNKNOWN.
    """
    key = raw.strip().lower().replace(" ", "-").replace("_", "-")
    if key in ALGORITHM_ALIASES:
        return dict(ALGORITHM_ALIASES[key])
    # Not found — return as-is with UNKNOWN metadata
    return {
        "canonical": raw.strip(),
        "family": AlgorithmFamily.UNKNOWN,
        "quantum_status": QuantumStatus.UNKNOWN,
    }


# ---------------------------------------------------------------------------
# Crypto package capability registry
# Maps package name → dict describing what crypto capability it brings.
# A package in this list produces CAPABILITY evidence ONLY.
# Source evidence (Python AST / Java rules) may independently produce
# IMPLEMENTATION / USAGE evidence for the same algorithm.
# ---------------------------------------------------------------------------

CRYPTO_PACKAGES: dict[str, dict] = {
    # Python packages
    "cryptography":        {"canonical_algorithms": ["RSA", "ECDSA", "AES", "ChaCha20-Poly1305", "X25519", "Ed25519"], "ecosystem": "python"},
    "pycryptodome":        {"canonical_algorithms": ["RSA", "ECDSA", "AES", "MD5", "SHA-256"], "ecosystem": "python"},
    "pycrypto":            {"canonical_algorithms": ["RSA", "AES", "MD5"], "ecosystem": "python", "lifecycle": Lifecycle.DEPRECATED},
    "pyca":                {"canonical_algorithms": ["RSA", "ECDSA", "AES"], "ecosystem": "python"},
    "rsa":                 {"canonical_algorithms": ["RSA"], "ecosystem": "python"},
    "ecdsa":               {"canonical_algorithms": ["ECDSA"], "ecosystem": "python"},
    "pyotp":               {"canonical_algorithms": ["HMAC", "SHA-1", "SHA-256"], "ecosystem": "python"},
    "paramiko":            {"canonical_algorithms": ["RSA", "ECDSA", "Ed25519", "AES"], "ecosystem": "python"},
    "pyopenssl":           {"canonical_algorithms": ["RSA", "ECDSA", "AES", "TLS"], "ecosystem": "python"},
    "ssl":                 {"canonical_algorithms": ["TLS"], "ecosystem": "python-stdlib"},
    "hashlib":             {"canonical_algorithms": ["SHA-256", "SHA-384", "SHA-512", "SHA-1", "MD5", "BLAKE2s", "BLAKE2b"], "ecosystem": "python-stdlib"},
    "hmac":                {"canonical_algorithms": ["HMAC"], "ecosystem": "python-stdlib"},
    "secrets":             {"canonical_algorithms": ["RANDOM"], "ecosystem": "python-stdlib"},
    "pynacl":              {"canonical_algorithms": ["X25519", "Ed25519", "ChaCha20-Poly1305", "BLAKE2b"], "ecosystem": "python"},
    "liboqs-python":       {"canonical_algorithms": ["ML-KEM", "ML-DSA", "SLH-DSA"], "ecosystem": "python"},
    "oqs":                 {"canonical_algorithms": ["ML-KEM", "ML-DSA", "SLH-DSA"], "ecosystem": "python"},
    "bcrypt":              {"canonical_algorithms": ["bcrypt"], "ecosystem": "python"},
    "argon2-cffi":         {"canonical_algorithms": ["Argon2"], "ecosystem": "python"},
    "jwcrypto":            {"canonical_algorithms": ["RSA", "ECDSA", "AES"], "ecosystem": "python"},
    "authlib":             {"canonical_algorithms": ["RSA", "ECDSA", "Ed25519", "AES"], "ecosystem": "python"},

    # Java / Maven artifacts
    "bouncy-castle":       {"canonical_algorithms": ["RSA", "ECDSA", "AES", "ML-KEM", "ML-DSA"], "ecosystem": "java"},
    "bouncycastle":        {"canonical_algorithms": ["RSA", "ECDSA", "AES", "ML-KEM", "ML-DSA"], "ecosystem": "java"},
    "bcprov-jdk":          {"canonical_algorithms": ["RSA", "ECDSA", "AES", "ML-KEM", "ML-DSA"], "ecosystem": "java"},
    "conscrypt":           {"canonical_algorithms": ["RSA", "ECDSA", "AES", "TLS"], "ecosystem": "java"},
    "amazon-corretto-crypto": {"canonical_algorithms": ["RSA", "ECDSA", "AES", "ML-KEM"], "ecosystem": "java"},
    "tink":                {"canonical_algorithms": ["AES", "ECDSA", "Ed25519", "HKDF"], "ecosystem": "java"},

    # C/system libraries (appear in container/binary scans)
    "libssl":              {"canonical_algorithms": ["RSA", "ECDSA", "AES", "TLS"], "ecosystem": "system"},
    "libcrypto":           {"canonical_algorithms": ["RSA", "ECDSA", "AES", "SHA-256"], "ecosystem": "system"},
    "openssl":             {"canonical_algorithms": ["RSA", "ECDSA", "AES", "SHA-256", "TLS"], "ecosystem": "system"},
    "libsodium":           {"canonical_algorithms": ["X25519", "Ed25519", "ChaCha20-Poly1305", "BLAKE2b"], "ecosystem": "system"},
    "libgcrypt":           {"canonical_algorithms": ["RSA", "ECDSA", "AES", "SHA-256"], "ecosystem": "system"},
    "nss":                 {"canonical_algorithms": ["RSA", "ECDSA", "AES", "TLS"], "ecosystem": "system"},
    "mbedtls":             {"canonical_algorithms": ["RSA", "ECDSA", "AES", "TLS"], "ecosystem": "system"},
    "wolfssl":             {"canonical_algorithms": ["RSA", "ECDSA", "AES", "TLS"], "ecosystem": "system"},
    "liboqs":              {"canonical_algorithms": ["ML-KEM", "ML-DSA", "SLH-DSA"], "ecosystem": "system"},

    # Container package names
    "openssl-dev":         {"canonical_algorithms": ["RSA", "ECDSA", "AES", "SHA-256"], "ecosystem": "system"},
    "libssl-dev":          {"canonical_algorithms": ["RSA", "ECDSA", "AES", "TLS"], "ecosystem": "system"},
    "python3-cryptography": {"canonical_algorithms": ["RSA", "ECDSA", "AES", "TLS"], "ecosystem": "system"},
}


def get_package_capability(package_name: str) -> Optional[dict]:
    """Return capability metadata for a package name, or None if not a known crypto package.

    The caller must emit CAPABILITY evidence only — never USAGE.
    """
    key = package_name.strip().lower().replace("_", "-")
    # Try direct match first
    if key in CRYPTO_PACKAGES:
        return dict(CRYPTO_PACKAGES[key])
    # Try prefix match (e.g. 'bcprov-jdk18on' → 'bcprov-jdk')
    for pkg_key, meta in CRYPTO_PACKAGES.items():
        if key.startswith(pkg_key):
            return dict(meta)
    return None

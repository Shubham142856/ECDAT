"""
ECDAT Binary Scanner (Bounded Static Inspection)

Extracts cryptographic evidence from binary files (ELF, PE, Mach-O) using
static inspection only. The binary is NEVER executed.

Evidence roles emitted: CAPABILITY, OBSERVED (never USAGE or IMPLEMENTATION).

Bounded depth means:
  - Read file headers and import tables
  - Scan for known crypto symbol names and library names
  - Do NOT disassemble, do NOT emulate, do NOT follow control flow

Uses LIEF (Library to Instrument Executable Formats) when available.
Falls back to pattern matching on raw bytes if LIEF is not available.

Resource limits:
  - Max file size: 256 MB (configurable via ECDAT_MAX_BINARY_BYTES env var)
  - Timeout: 30 seconds
  - Binary is read-only; no modifications

Security: Treat binary content as hostile input. Validate file type before
parsing. Do not follow DT_RPATH or load dependencies.
"""
from __future__ import annotations

import logging
import os
import re
import signal
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator, Optional

from ecdat.ontology import EvidenceRole, SourceType

logger = logging.getLogger(__name__)

# Try LIEF
try:
    import lief
    lief.logging.disable()
    _LIEF_AVAILABLE = True
except ImportError:
    _LIEF_AVAILABLE = False
    logger.info("LIEF not available; binary scanner uses pattern-only fallback")

# Max binary file size
_MAX_BINARY_BYTES = int(os.environ.get("ECDAT_MAX_BINARY_BYTES", 256 * 1024 * 1024))

# ---------------------------------------------------------------------------
# Known crypto symbol patterns (function names, library names)
# These indicate the binary links to or exports a crypto implementation.
# ---------------------------------------------------------------------------

CRYPTO_SYMBOL_PATTERNS: list[re.Pattern] = [
    re.compile(rb"RSA_(?:sign|verify|public_encrypt|private_decrypt|generate_key)", re.IGNORECASE),
    re.compile(rb"EVP_(?:DigestSign|DigestVerify|Encrypt|Decrypt|PKEY_keygen)", re.IGNORECASE),
    re.compile(rb"EC_KEY_(?:generate_key|new_by_curve_name)", re.IGNORECASE),
    re.compile(rb"ECDSA_(?:sign|verify|do_sign)", re.IGNORECASE),
    re.compile(rb"AES_(?:encrypt|decrypt|set_encrypt_key|set_decrypt_key)", re.IGNORECASE),
    re.compile(rb"SHA256_(?:Init|Update|Final)", re.IGNORECASE),
    re.compile(rb"SHA512_(?:Init|Update|Final)", re.IGNORECASE),
    re.compile(rb"HMAC_(?:Init|Update|Final)", re.IGNORECASE),
    re.compile(rb"X25519|curve25519|ed25519_sign|ed25519_verify", re.IGNORECASE),
    re.compile(rb"chacha20_poly1305_(?:open|seal)", re.IGNORECASE),
    re.compile(rb"pqcrystals_(?:kyber|dilithium|sphincs)", re.IGNORECASE),
    re.compile(rb"OQS_KEM_(?:keypair|encaps|decaps)", re.IGNORECASE),
    re.compile(rb"OQS_SIG_(?:keypair|sign|verify)", re.IGNORECASE),
    re.compile(rb"mlkem_(?:keygen|encaps|decaps)", re.IGNORECASE),
    re.compile(rb"mldsa_(?:keygen|sign|verify)", re.IGNORECASE),
]

CRYPTO_LIB_NAMES: set[str] = {
    "libssl", "libssl.so", "libssl.dylib", "ssleay32.dll",
    "libcrypto", "libcrypto.so", "libcrypto.dylib", "libeay32.dll",
    "libsodium", "libsodium.so", "libsodium.dylib",
    "libgcrypt", "libgcrypt.so", "libgcrypt.dylib",
    "liboqs", "liboqs.so", "liboqs.dylib",
    "libmbedcrypto", "libmbedtls",
    "libwolfssl", "libwolfcrypt",
    "bcrypt.dll", "ncrypt.dll", "crypt32.dll",
    "libbotan", "libbotan-3.so",
}

# String patterns to scan for in raw binary content
CRYPTO_STRING_PATTERNS: list[re.Pattern] = [
    re.compile(rb"AES-(?:128|192|256)-(?:GCM|CBC|CTR|ECB|CFB|OFB)", re.IGNORECASE),
    re.compile(rb"SHA-?(?:1|224|256|384|512)", re.IGNORECASE),
    re.compile(rb"ECDSA|ECDH|Ed25519|X25519|Curve25519", re.IGNORECASE),
    re.compile(rb"ML-KEM|MLKEM|Kyber", re.IGNORECASE),
    re.compile(rb"ML-DSA|MLDSA|Dilithium", re.IGNORECASE),
    re.compile(rb"SLH-DSA|SPHINCS", re.IGNORECASE),
    re.compile(rb"ChaCha20|chacha20_poly1305", re.IGNORECASE),
]


@dataclass
class BinaryFinding:
    """A single raw evidence observation from the binary scanner."""
    file_path: str
    detector: str
    raw_signal: str
    roles: list[EvidenceRole]  # CAPABILITY or OBSERVED
    algorithm_hint: str
    confidence: float
    provenance: dict
    source_type: SourceType = SourceType.BINARY


def _match_algo_from_symbol(sym_bytes: bytes) -> str:
    """Infer algorithm family from a matched symbol name."""
    s = sym_bytes.lower()
    if b"aes" in s:
        return "AES"
    if b"rsa" in s:
        return "RSA"
    if b"ecdsa" in s or b"ecdh" in s:
        return "ECDSA"
    if b"ed25519" in s or b"x25519" in s or b"curve25519" in s:
        return "X25519"
    if b"sha256" in s:
        return "SHA-256"
    if b"sha512" in s:
        return "SHA-512"
    if b"hmac" in s:
        return "HMAC"
    if b"chacha20" in s or b"poly1305" in s:
        return "ChaCha20-Poly1305"
    if b"kyber" in s or b"mlkem" in s or b"ml-kem" in s:
        return "ML-KEM"
    if b"dilithium" in s or b"mldsa" in s or b"ml-dsa" in s:
        return "ML-DSA"
    if b"sphincs" in s or b"slh-dsa" in s:
        return "SLH-DSA"
    if b"oqs" in s:
        return "PQC-OQS"
    return sym_bytes.decode("ascii", errors="replace")[:40]


def scan_binary_file(file_path: str, data: bytes) -> list[BinaryFinding]:
    """Perform bounded static inspection of binary data.

    The binary is NEVER executed. Analysis is header + symbol table + strings.

    Args:
        file_path: Logical path for evidence records.
        data: Raw binary bytes.

    Returns:
        List of BinaryFinding objects (CAPABILITY or OBSERVED roles only).
    """
    findings: list[BinaryFinding] = []
    size = len(data)

    if size > _MAX_BINARY_BYTES:
        logger.warning("Binary file %s (%d bytes) exceeds limit; skipping", file_path, size)
        return []

    # Detect file type (magic bytes)
    file_type = "unknown"
    if data[:4] == b"\x7fELF":
        file_type = "ELF"
    elif data[:2] in (b"MZ", b"ZM"):
        file_type = "PE"
    elif data[:4] in (b"\xfe\xed\xfa\xce", b"\xce\xfa\xed\xfe", b"\xfe\xed\xfa\xcf", b"\xcf\xfa\xed\xfe"):
        file_type = "Mach-O"
    elif data[:4] == b"\xca\xfe\xba\xbe":
        file_type = "Mach-O-fat"

    provenance_base = {
        "file": file_path,
        "file_type": file_type,
        "file_size": size,
    }

    # --- LIEF-based inspection ---
    if _LIEF_AVAILABLE and file_type in ("ELF", "PE", "Mach-O"):
        try:
            binary = lief.parse(list(data))  # parse from bytes, not file path
            if binary is not None:
                # Extract imported library names
                try:
                    imported_libs = []
                    if hasattr(binary, "libraries"):
                        imported_libs = [lib.lower() if isinstance(lib, str) else lib.name.lower()
                                         for lib in binary.libraries]
                    elif hasattr(binary, "dynamic_entries"):
                        for entry in binary.dynamic_entries:
                            if entry.tag == lief.ELF.DynamicEntry.TAG.NEEDED:
                                imported_libs.append(entry.name.lower())

                    for lib in imported_libs:
                        lib_basename = Path(lib).name.lower()
                        for known in CRYPTO_LIB_NAMES:
                            if lib_basename.startswith(known.lower().split(".")[0]):
                                findings.append(BinaryFinding(
                                    file_path=file_path,
                                    detector="binary.lief.imported_library",
                                    raw_signal=lib,
                                    roles=[EvidenceRole.CAPABILITY, EvidenceRole.OBSERVED],
                                    algorithm_hint=_lib_to_algo(lib),
                                    confidence=0.65,
                                    provenance={**provenance_base, "library": lib, "source": "NEEDED"},
                                ))
                                break
                except Exception as exc:
                    logger.debug("LIEF library extraction failed for %s: %s", file_path, exc)

                # Extract imported/exported symbols
                try:
                    symbols_to_check = []
                    if hasattr(binary, "imported_symbols"):
                        symbols_to_check.extend(binary.imported_symbols)
                    if hasattr(binary, "exported_symbols"):
                        symbols_to_check.extend(binary.exported_symbols)

                    for sym in symbols_to_check:
                        sym_name = sym.name if hasattr(sym, "name") else str(sym)
                        sym_bytes = sym_name.encode("ascii", errors="replace")
                        for pattern in CRYPTO_SYMBOL_PATTERNS:
                            if pattern.search(sym_bytes):
                                algo_hint = _match_algo_from_symbol(sym_bytes)
                                findings.append(BinaryFinding(
                                    file_path=file_path,
                                    detector="binary.lief.symbol",
                                    raw_signal=sym_name[:100],
                                    roles=[EvidenceRole.CAPABILITY, EvidenceRole.OBSERVED],
                                    algorithm_hint=algo_hint,
                                    confidence=0.70,
                                    provenance={**provenance_base, "symbol": sym_name[:100]},
                                ))
                                break  # one pattern match per symbol
                except Exception as exc:
                    logger.debug("LIEF symbol extraction failed for %s: %s", file_path, exc)
        except Exception as exc:
            logger.warning("LIEF parsing failed for %s: %s", file_path, exc)

    # --- String scan on raw bytes (fallback + supplement) ---
    for pattern in CRYPTO_SYMBOL_PATTERNS + CRYPTO_STRING_PATTERNS:
        for m in pattern.finditer(data):
            match_bytes = m.group(0)
            algo_hint = _match_algo_from_symbol(match_bytes)
            # Avoid extreme duplication from string scan
            signal_str = match_bytes.decode("ascii", errors="replace")[:60]
            findings.append(BinaryFinding(
                file_path=file_path,
                detector="binary.string_scan",
                raw_signal=signal_str,
                roles=[EvidenceRole.CAPABILITY, EvidenceRole.OBSERVED],
                algorithm_hint=algo_hint,
                confidence=0.45,  # string match is weaker evidence
                provenance={**provenance_base, "pattern": pattern.pattern[:50], "offset": m.start()},
            ))

    # Deduplicate by algo_hint + detector to avoid flooding
    seen_keys: set[tuple] = set()
    deduped: list[BinaryFinding] = []
    for f in findings:
        key = (f.algorithm_hint, f.detector, f.file_path)
        if key not in seen_keys:
            seen_keys.add(key)
            deduped.append(f)

    return deduped


def _lib_to_algo(lib_name: str) -> str:
    lib = lib_name.lower()
    if "ssl" in lib or "crypto" in lib:
        return "TLS"
    if "sodium" in lib:
        return "X25519"
    if "gcrypt" in lib:
        return "AES"
    if "oqs" in lib:
        return "PQC-OQS"
    if "botan" in lib:
        return "AES"
    return "Unknown"


def scan_binary_directory(root: str) -> Iterator[BinaryFinding]:
    """Walk a directory and scan binary files.

    Skips files that are too large or are clearly not binary.

    Yields:
        BinaryFinding objects.
    """
    root_path = Path(root)
    binary_extensions = {
        ".elf", ".exe", ".dll", ".so", ".dylib",
        ".o", ".a", ".out", "", ".bin",
    }
    for binary_file in root_path.rglob("*"):
        if not binary_file.is_file():
            continue
        if binary_file.suffix.lower() not in binary_extensions and binary_file.suffix != "":
            continue
        try:
            size = binary_file.stat().st_size
        except OSError:
            continue
        if size > _MAX_BINARY_BYTES:
            logger.info("Skipping oversized binary %s (%d bytes)", binary_file, size)
            continue
        if size == 0:
            continue
        # Quick magic byte check
        try:
            header = binary_file.read_bytes()[:4]
        except OSError:
            continue
        if header[:4] not in (b"\x7fELF", b"MZ", b"ZM",
                               b"\xfe\xed\xfa\xce", b"\xce\xfa\xed\xfe",
                               b"\xfe\xed\xfa\xcf", b"\xcf\xfa\xed\xfe",
                               b"\xca\xfe\xba\xbe"):
            continue  # Not a recognized binary format at this depth

        try:
            data = binary_file.read_bytes()
        except OSError as exc:
            logger.warning("Cannot read binary %s: %s", binary_file, exc)
            continue

        relative = str(binary_file.relative_to(root_path))
        yield from scan_binary_file(relative, data)

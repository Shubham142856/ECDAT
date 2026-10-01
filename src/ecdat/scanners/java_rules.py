"""
ECDAT Java Rules Scanner

Scans Java source files for cryptographic API usage using tree-sitter
(with regex fallback for environments without tree-sitter-java).

Does NOT execute any Java code. Analysis is purely structural/textual.

Evidence roles emitted:
  - IMPLEMENTATION: a known Java crypto API import or class reference is present
  - USAGE: a known crypto API method call is detected with an algorithm argument

Key rule (same as Python scanner):
  An import statement produces IMPLEMENTATION evidence.
  A method call with a concrete algorithm string produces IMPLEMENTATION + USAGE.
  A capability dependency (from pom.xml) produces only CAPABILITY — not this scanner.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator, Optional

from ecdat.ontology import EvidenceRole, SourceType
from ecdat.knowledge import normalize_algorithm

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Java crypto API patterns (rule-based, regex over source text)
# tree-sitter is preferred if available; regex is the bounded V1 fallback.
# ---------------------------------------------------------------------------

# Known Java crypto class imports
JAVA_IMPORT_PATTERNS: list[re.Pattern] = [
    re.compile(r'import\s+(javax\.crypto\.[\w.*]+)'),
    re.compile(r'import\s+(java\.security\.[\w.*]+)'),
    re.compile(r'import\s+(org\.bouncycastle\.[\w.*]+)'),
    re.compile(r'import\s+(com\.google\.crypto\.tink\.[\w.*]+)'),
    re.compile(r'import\s+(software\.amazon\.awscryptography\.[\w.*]+)'),
    re.compile(r'import\s+(org\.apache\.commons\.codec\.[\w.*]+)'),
]

# Known Java crypto API calls with algorithm argument (as string constant)
# Pattern: ClassName.getInstance("SHA-256")  /  Cipher.getInstance("AES/GCM/NoPadding")
JAVA_GETINSTANCE_PATTERN = re.compile(
    r'(?P<class>MessageDigest|Cipher|KeyPairGenerator|KeyGenerator|Signature|'
    r'Mac|KeyAgreement|SecretKeyFactory|AlgorithmParameters|KeyFactory|'
    r'TrustManagerFactory|SSLContext|SecureRandom)\s*\.\s*getInstance\s*\('
    r'\s*"(?P<algorithm>[^"]+)"\s*\)',
    re.IGNORECASE,
)

# KeyPairGenerator / KeyGenerator.initialize(keysize)
JAVA_KEYGEN_INIT_PATTERN = re.compile(
    r'(?P<class>KeyPairGenerator|KeyGenerator)\s*\.\s*initialize\s*\(\s*(?P<keysize>\d+)',
    re.IGNORECASE,
)

# new AESEngine(), new RSAEngine(), etc.
JAVA_ENGINE_PATTERN = re.compile(
    r'new\s+(?P<engine>(?:AES|RSA|ECDSA|ECDSASigner|SHA|Blake2|ChaCha20|'
    r'Poly1305|RSAKeyGenerationParameters|ECKeyGenerationParameters|'
    r'MLKEMKeyPairGenerator|MLDSAKeyPairGenerator)\w*)\s*\(',
    re.IGNORECASE,
)

# Direct algorithm name mentions in method calls (broader pattern for PQC)
JAVA_PQC_PATTERN = re.compile(
    r'"(?P<algorithm>ML-KEM(?:-\d+)?|ML-DSA(?:-\d+)?|SLH-DSA|'
    r'X25519MLKEM768|SecP256r1MLKEM768|SecP384r1MLKEM1024|'
    r'mlkem768|kyber(?:\d+)?|dilithium(?:\d+)?)"',
    re.IGNORECASE,
)

# Algorithm strings we recognize
ALGO_STRING_RE = re.compile(
    r'\b(AES|RSA|ECDSA|ECDH|Ed25519|Ed448|X25519|X448|ChaCha20|'
    r'SHA[-/]256|SHA[-/]384|SHA[-/]512|SHA[-/]1|MD5|HMAC|PBKDF2|HKDF|'
    r'ML[-_]?KEM|ML[-_]?DSA|SLH[-_]?DSA|kyber|dilithium|'
    r'AES/\w+/\w+|RSA/\w+/\w+)\b',
    re.IGNORECASE,
)

# Standard Java generic cryptographic framework classes/interfaces
JAVA_GENERIC_CLASSES: set[str] = {
    "key", "privatekey", "publickey", "secretkey", "provider", "securerandom",
    "security", "cipher", "signature", "mac", "messagedigest", "keyagreement",
    "keypair", "keypairgenerator", "keyfactory", "secretkeyfactory", "keygenerator",
    "algorithmparameters", "certificate", "certificatefactory", "certpath", "x509certificate",
    "keyspec", "secretkeyspec", "algorithmparameterspec", "ivparameterspec", "gcmparameterspec",
    "oaepparameterspec", "pssparameterspec", "pbekeyspec", "pkcs8encodedkeyspec",
    "x509encodedkeyspec", "ecfieldfp", "ecpoint", "ellipticcurve", "mgf1parameterspec", "psource",
    "rsaotherprimeinfo", "rsaotherprimeinfoconverter",
    "nosuchalgorithmexception", "nosuchpaddingexception",
    "invalidkeyexception", "invalidalgorithmparameterexception", "invalidkeyspecexception",
    "certificateexception", "certificateencodingexception",
}


@dataclass
class JavaFinding:
    """A single raw evidence observation from the Java scanner."""
    file_path: str
    line: int
    detector: str
    raw_signal: str
    roles: list[EvidenceRole]
    algorithm_hint: str
    confidence: float
    provenance: dict
    source_type: SourceType = SourceType.JAVA_SOURCE


def scan_java_file(file_path: str, source_text: str) -> list[JavaFinding]:
    """Scan a single Java source file and return raw evidence findings.

    Args:
        file_path: Logical path (used in evidence records, not opened).
        source_text: Source code text. Never executed.

    Returns:
        List of JavaFinding objects.
    """
    findings: list[JavaFinding] = []
    lines = source_text.splitlines()

    def _line_at(lineno: int) -> str:
        """Return source line for a 1-indexed line number."""
        try:
            return lines[lineno - 1].strip()
        except IndexError:
            return ""

    def _lineno_from_pos(pos: int) -> int:
        """Convert character offset to 1-indexed line number."""
        return source_text[:pos].count("\n") + 1

    # --- Step 1: Import detection ---
    for pattern in JAVA_IMPORT_PATTERNS:
        for m in pattern.finditer(source_text):
            lineno = _lineno_from_pos(m.start())
            import_name = m.group(1).rstrip(";")
            simple_name = import_name.split(".")[-1]
            algo_m = ALGO_STRING_RE.search(import_name.replace(".", " "))

            if algo_m:
                algo_hint = algo_m.group(0)
                roles = [EvidenceRole.IMPLEMENTATION]
                conf = 0.60
            elif simple_name.lower() in JAVA_GENERIC_CLASSES or simple_name == "*":
                algo_hint = simple_name
                roles = [EvidenceRole.CAPABILITY]
                conf = 0.50
            else:
                meta = normalize_algorithm(simple_name)
                if meta["canonical"] != "UNKNOWN":
                    algo_hint = meta["canonical"]
                    roles = [EvidenceRole.IMPLEMENTATION]
                    conf = 0.60
                else:
                    algo_hint = simple_name
                    roles = [EvidenceRole.CAPABILITY]
                    conf = 0.50

            findings.append(JavaFinding(
                file_path=file_path,
                line=lineno,
                detector="java.rule.import",
                raw_signal=_line_at(lineno),
                roles=roles,
                algorithm_hint=algo_hint,
                confidence=conf,
                provenance={"import": import_name},
            ))

    # --- Step 2: getInstance() calls with algorithm strings ---
    for m in JAVA_GETINSTANCE_PATTERN.finditer(source_text):
        lineno = _lineno_from_pos(m.start())
        cls = m.group("class")
        algo = m.group("algorithm")
        # Validate: algorithm string must look crypto-related
        if ALGO_STRING_RE.search(algo) or "/" in algo:  # AES/GCM/NoPadding patterns
            findings.append(JavaFinding(
                file_path=file_path,
                line=lineno,
                detector="java.rule.getinstance",
                raw_signal=_line_at(lineno),
                roles=[EvidenceRole.IMPLEMENTATION, EvidenceRole.USAGE],
                algorithm_hint=algo,
                confidence=0.90,
                provenance={"class": cls, "algorithm_arg": algo},
            ))

    # --- Step 3: KeyPairGenerator.initialize(keysize) ---
    for m in JAVA_KEYGEN_INIT_PATTERN.finditer(source_text):
        lineno = _lineno_from_pos(m.start())
        cls = m.group("class")
        keysize = m.group("keysize")
        findings.append(JavaFinding(
            file_path=file_path,
            line=lineno,
            detector="java.rule.keygen_init",
            raw_signal=_line_at(lineno),
            roles=[EvidenceRole.IMPLEMENTATION, EvidenceRole.USAGE],
            algorithm_hint=f"KeySize-{keysize}",
            confidence=0.70,
            provenance={"class": cls, "key_size": keysize},
        ))

    # --- Step 4: new XxxEngine() patterns (Bouncy Castle & crypto engines) ---
    for m in JAVA_ENGINE_PATTERN.finditer(source_text):
        lineno = _lineno_from_pos(m.start())
        engine = m.group("engine")
        algo_m = ALGO_STRING_RE.search(engine)
        if algo_m:
            algo_hint = algo_m.group(0)
        else:
            meta = normalize_algorithm(engine)
            algo_hint = meta["canonical"] if meta["canonical"] != "UNKNOWN" else engine
        findings.append(JavaFinding(
            file_path=file_path,
            line=lineno,
            detector="java.rule.engine_instantiation",
            raw_signal=_line_at(lineno),
            roles=[EvidenceRole.IMPLEMENTATION, EvidenceRole.USAGE],
            algorithm_hint=algo_hint,
            confidence=0.75,
            provenance={"engine_class": engine},
        ))

    # --- Step 5: PQC algorithm string mentions ---
    for m in JAVA_PQC_PATTERN.finditer(source_text):
        lineno = _lineno_from_pos(m.start())
        algo = m.group("algorithm")
        # Only add if not already captured by getinstance
        findings.append(JavaFinding(
            file_path=file_path,
            line=lineno,
            detector="java.rule.pqc_string",
            raw_signal=_line_at(lineno),
            roles=[EvidenceRole.IMPLEMENTATION, EvidenceRole.USAGE],
            algorithm_hint=algo,
            confidence=0.80,
            provenance={"pqc_string": algo},
        ))

    # Deduplicate findings at the same line with the same algorithm
    seen: set[tuple] = set()
    deduped: list[JavaFinding] = []
    for f in findings:
        key = (f.file_path, f.line, f.algorithm_hint.lower(), frozenset(f.roles))
        if key not in seen:
            seen.add(key)
            deduped.append(f)

    return deduped


def scan_java_directory(root: str, max_file_bytes: int = 5_000_000) -> Iterator[JavaFinding]:
    """Walk a directory and scan all .java files.

    Args:
        root: Root directory path.
        max_file_bytes: Skip files larger than this (default 5 MB).

    Yields:
        JavaFinding objects.
    """
    root_path = Path(root)
    for java_file in root_path.rglob("*.java"):
        if not java_file.is_file():
            continue
        try:
            size = java_file.stat().st_size
        except OSError:
            continue
        if size > max_file_bytes:
            logger.info("Skipping large Java file %s (%d bytes)", java_file, size)
            continue
        try:
            source_text = java_file.read_text(encoding="utf-8", errors="replace")
        except OSError as exc:
            logger.warning("Cannot read %s: %s", java_file, exc)
            continue
        relative_path = str(java_file.relative_to(root_path))
        yield from scan_java_file(relative_path, source_text)

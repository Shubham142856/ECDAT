"""
ECDAT Config Scanner

Scans YAML, JSON, and .properties configuration files for algorithm name
constants that select or constrain cryptographic behavior.

Evidence role emitted: CONFIGURATION (always).

This scanner identifies settings like:
  algorithm: AES-256-GCM
  tls_version: TLSv1.3
  hash: SHA-256
  cipher: ECDHE-RSA-AES256-GCM-SHA384

IMPORTANT: A config file saying algorithm=RSA is CONFIGURATION evidence.
It does NOT prove the code actually calls RSA unless a source scanner
also finds that call path. Fusion handles the combination.
"""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterator, Optional

from ecdat.ontology import EvidenceRole, SourceType
from ecdat.knowledge import normalize_algorithm

logger = logging.getLogger(__name__)

# Keys in config files that are likely to hold algorithm names
CONFIG_KEY_PATTERNS = re.compile(
    r"(?:algorithm|algo|cipher|hash|digest|signature|encryption|tls_cipher|"
    r"ssl_cipher|crypto|key_type|mac|key_algorithm|signature_algorithm|"
    r"asymmetric_key_type|symmetric_key|kdf|key_derivation)\s*[=:]",
    re.IGNORECASE,
)

# Algorithm value pattern
ALGO_VALUE_RE = re.compile(
    r"\b(AES|RSA|ECDSA|ECDH|Ed25519|X25519|ChaCha20|"
    r"SHA[-_]?256|SHA[-_]?384|SHA[-_]?512|SHA[-_]?1|MD5|HMAC|PBKDF2|HKDF|"
    r"ML-KEM|ML-DSA|SLH-DSA|kyber|dilithium|"
    r"TLSv1\.[23]|AES[-/]\d+[-/](?:GCM|CBC|CTR|ECB)|"
    r"ECDHE-RSA-\S+|ECDHE-ECDSA-\S+)\b",
    re.IGNORECASE,
)


@dataclass
class ConfigFinding:
    """Evidence observation from a config file."""
    file_path: str
    line: int
    detector: str
    raw_signal: str
    roles: list[EvidenceRole]  # always [CONFIGURATION]
    key_name: str
    algorithm_hint: str
    confidence: float
    provenance: dict
    source_type: SourceType = SourceType.CONFIG


def _scan_config_text(file_path: str, text: str) -> list[ConfigFinding]:
    """Scan plain text (YAML/properties) config for algorithm references."""
    findings: list[ConfigFinding] = []
    lines = text.splitlines()
    for lineno, line in enumerate(lines, start=1):
        stripped = line.strip()
        if not stripped or stripped.startswith(("#", "//")):
            continue
        # Check if this line has a recognized config key
        if not CONFIG_KEY_PATTERNS.search(stripped):
            continue
        # Check if the value contains an algorithm name
        m = ALGO_VALUE_RE.search(stripped)
        if m:
            algo = m.group(0)
            # Extract key name from line
            parts = re.split(r"[=:]", stripped, maxsplit=1)
            key_name = parts[0].strip() if parts else "unknown"
            findings.append(ConfigFinding(
                file_path=file_path,
                line=lineno,
                detector="config.text_scan",
                raw_signal=stripped[:200],
                roles=[EvidenceRole.CONFIGURATION],
                key_name=key_name,
                algorithm_hint=algo,
                confidence=0.70,
                provenance={
                    "file": file_path,
                    "key": key_name,
                    "value_hint": algo,
                },
            ))
    return findings


def _scan_json_object(file_path: str, obj: Any, path: str = "") -> list[ConfigFinding]:
    """Recursively scan a JSON/dict object for algorithm values."""
    findings: list[ConfigFinding] = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            current_path = f"{path}.{k}" if path else k
            if CONFIG_KEY_PATTERNS.search(k + ":"):
                if isinstance(v, str):
                    m = ALGO_VALUE_RE.search(v)
                    if m:
                        findings.append(ConfigFinding(
                            file_path=file_path,
                            line=0,
                            detector="config.json_scan",
                            raw_signal=f"{current_path}: {v}",
                            roles=[EvidenceRole.CONFIGURATION],
                            key_name=k,
                            algorithm_hint=m.group(0),
                            confidence=0.70,
                            provenance={"file": file_path, "json_path": current_path, "value": v},
                        ))
            findings.extend(_scan_json_object(file_path, v, current_path))
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            findings.extend(_scan_json_object(file_path, item, f"{path}[{i}]"))
    return findings


def scan_config_file(file_path: str, text: str) -> list[ConfigFinding]:
    """Scan a configuration file (YAML / JSON / .properties) for algorithm settings."""
    findings: list[ConfigFinding] = []
    filename = Path(file_path).name.lower()

    if filename.endswith(".json"):
        try:
            obj = json.loads(text)
            findings.extend(_scan_json_object(file_path, obj))
        except json.JSONDecodeError:
            logger.debug("JSON parse failed for %s, falling back to text scan", file_path)
            findings.extend(_scan_config_text(file_path, text))
    else:
        # YAML / .properties / generic text scan
        findings.extend(_scan_config_text(file_path, text))

    return findings


def scan_config_directory(root: str) -> Iterator[ConfigFinding]:
    """Walk a directory and scan YAML/JSON/properties config files."""
    root_path = Path(root)
    config_extensions = {".yaml", ".yml", ".json", ".properties", ".ini", ".conf", ".env", ".cfg"}
    for config_file in root_path.rglob("*"):
        if not config_file.is_file():
            continue
        if config_file.suffix.lower() not in config_extensions:
            continue
        # Skip large files
        try:
            if config_file.stat().st_size > 1_000_000:
                continue
        except OSError:
            continue
        try:
            text = config_file.read_text(encoding="utf-8", errors="replace")
        except OSError as exc:
            logger.warning("Cannot read config file %s: %s", config_file, exc)
            continue
        relative = str(config_file.relative_to(root_path))
        yield from scan_config_file(relative, text)

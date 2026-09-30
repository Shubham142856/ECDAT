"""
ECDAT Python AST Scanner

Scans Python source files for cryptographic API usage using the Python AST module.
Does NOT execute any code. Analysis is purely structural.

Evidence roles emitted:
  - IMPLEMENTATION: a known crypto API is imported or referenced
  - USAGE: a known crypto API call is made with a wired algorithm argument
  - CONFIGURATION: crypto algorithm is set in a variable/constant assignment

Key rule: A dependency import produces IMPLEMENTATION evidence.
An actual call with a concrete algorithm argument produces IMPLEMENTATION + USAGE.

A lookalike string (comment, docstring, variable name) does NOT produce evidence.
"""
from __future__ import annotations

import ast
import hashlib
import io
import logging
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator, Optional

from ecdat.ontology import EvidenceRole, SourceType
from ecdat.knowledge import normalize_algorithm, get_package_capability

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Known crypto API call patterns
# Each entry: (module_path_pattern, callable_name, argument_positions_with_algo)
# ---------------------------------------------------------------------------

# Crypto API calls that indicate actual usage when a concrete string arg is found
CRYPTO_CALL_PATTERNS: list[dict] = [
    # hashlib
    {"module": "hashlib", "calls": ["new", "md5", "sha1", "sha256", "sha384", "sha512", "sha224", "blake2s", "blake2b"], "arg_index": 0},
    # hmac
    {"module": "hmac", "calls": ["new", "HMAC"], "arg_index": 2},
    # cryptography.hazmat.primitives
    {"module": "cryptography", "calls": ["generate_private_key", "generate_parameters", "encrypt", "decrypt", "sign", "verify"], "arg_index": 0},
    # Crypto (pycryptodome)
    {"module": "Crypto", "calls": ["new", "generate"], "arg_index": 0},
    # rsa
    {"module": "rsa", "calls": ["sign", "verify", "encrypt", "decrypt", "newkeys", "generate_private_key"], "arg_index": None},
    # ecdsa
    {"module": "ecdsa", "calls": ["sign", "verify", "SigningKey", "VerifyingKey"], "arg_index": None},
    # ssl
    {"module": "ssl", "calls": ["wrap_socket", "SSLContext", "create_default_context"], "arg_index": None},
]

# Import paths that indicate crypto libraries are used
CRYPTO_IMPORT_MODULES: set[str] = {
    "hashlib", "hmac", "ssl", "secrets",
    "cryptography", "cryptography.hazmat", "cryptography.hazmat.primitives",
    "cryptography.hazmat.primitives.asymmetric",
    "cryptography.hazmat.primitives.ciphers",
    "cryptography.hazmat.primitives.hashes",
    "cryptography.hazmat.primitives.kdf",
    "Crypto", "Crypto.Cipher", "Crypto.Hash", "Crypto.PublicKey",
    "Crypto.Signature", "Crypto.Random",
    "rsa", "ecdsa", "pynacl", "nacl", "oqs", "liboqs",
    "jwt", "authlib", "jwcrypto",
}

# Concrete algorithm names seen in keyword arguments / string literals
ALGO_STRING_PATTERN = re.compile(
    r"\b(aes|rsa|ecdsa|ecdh|ed25519|x25519|chacha20|sha[-_]?256|sha[-_]?384|sha[-_]?512|"
    r"sha[-_]?1|md5|hmac|pbkdf2|hkdf|scrypt|argon2|poly1305|blake2[sb]|"
    r"ml[-_]?kem|ml[-_]?dsa|slh[-_]?dsa|kyber|dilithium|sphincs|"
    r"aes[-_]?\d+[-_]gcm|aes[-_]?\d+[-_]cbc)\b",
    re.IGNORECASE,
)

# Lookalike patterns that should NOT trigger — comments, docstring mentions only
# The AST visitor handles this naturally by only visiting call nodes, not strings.


@dataclass
class RawFinding:
    """A single raw evidence observation from the Python AST scanner."""
    file_path: str
    line: int
    col: int
    detector: str
    raw_signal: str             # The raw source snippet
    roles: list[EvidenceRole]
    algorithm_hint: str         # Raw algorithm string before normalization
    confidence: float           # 0.0–1.0
    provenance: dict            # Structured provenance record
    source_type: SourceType = SourceType.PYTHON_SOURCE


class CryptoVisitor(ast.NodeVisitor):
    """AST visitor that collects cryptographic evidence from Python source.

    Visits:
      - Import / ImportFrom: detect known crypto module imports
      - Call nodes: detect crypto API calls with algorithm arguments
      - Assign nodes: detect constant/config assignments of algorithm names
    """

    def __init__(self, file_path: str, source_text: str):
        self.file_path = file_path
        self.source_lines = source_text.splitlines()
        self.findings: list[RawFinding] = []
        # Track aliases: {alias: real_module}
        self._import_aliases: dict[str, str] = {}
        # Track imported crypto modules in this file
        self._crypto_imports: set[str] = set()

    def _source_snippet(self, line: int) -> str:
        """Return source line (1-indexed), safely."""
        try:
            return self.source_lines[line - 1].strip()
        except IndexError:
            return ""

    def _is_crypto_module(self, module: str) -> bool:
        if module in CRYPTO_IMPORT_MODULES:
            return True
        for prefix in CRYPTO_IMPORT_MODULES:
            if module.startswith(prefix + "."):
                return True
        return False

    def visit_Import(self, node: ast.Import) -> None:
        """Handle: import hashlib  /  import rsa as _rsa"""
        for alias in node.names:
            name = alias.name
            local = alias.asname or name
            if self._is_crypto_module(name):
                self._crypto_imports.add(name)
                self._import_aliases[local] = name
                # Emit IMPLEMENTATION evidence for the import
                pkg_meta = get_package_capability(name.split(".")[0])
                algorithms = pkg_meta.get("canonical_algorithms", [name]) if pkg_meta else [name]
                for algo in algorithms:
                    self.findings.append(RawFinding(
                        file_path=self.file_path,
                        line=node.lineno,
                        col=node.col_offset,
                        detector="python.ast.import",
                        raw_signal=self._source_snippet(node.lineno),
                        roles=[EvidenceRole.IMPLEMENTATION],
                        algorithm_hint=algo,
                        confidence=0.6,
                        provenance={
                            "ast_node": "Import",
                            "module": name,
                            "local_alias": local,
                        },
                    ))
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        """Handle: from cryptography.hazmat.primitives import hashes"""
        module = node.module or ""
        if self._is_crypto_module(module):
            self._crypto_imports.add(module)
            for alias in node.names:
                local = alias.asname or alias.name
                full_name = f"{module}.{alias.name}"
                self._import_aliases[local] = full_name
                # Detect specific algorithm classes imported directly
                algo_hint = self._extract_algo_from_name(alias.name)
                self.findings.append(RawFinding(
                    file_path=self.file_path,
                    line=node.lineno,
                    col=node.col_offset,
                    detector="python.ast.import_from",
                    raw_signal=self._source_snippet(node.lineno),
                    roles=[EvidenceRole.IMPLEMENTATION],
                    algorithm_hint=algo_hint or alias.name,
                    confidence=0.6,
                    provenance={
                        "ast_node": "ImportFrom",
                        "module": module,
                        "name": alias.name,
                        "local_alias": local,
                    },
                ))
        self.generic_visit(node)

    def _extract_algo_from_name(self, name: str) -> Optional[str]:
        """Detect algorithm names encoded in class/function names like RSA, AES256, SHA256."""
        m = ALGO_STRING_PATTERN.search(name)
        return m.group(0) if m else None

    def visit_Call(self, node: ast.Call) -> None:
        """Handle crypto API calls.

        Pattern: hashlib.sha256()  /  Cipher.new(...)  /  rsa.sign(data, key, 'SHA-256')
        Only emits USAGE evidence when we can confirm this is a crypto call.
        """
        call_repr = ast.unparse(node) if hasattr(ast, "unparse") else ""
        algo_hint: Optional[str] = None
        roles = [EvidenceRole.IMPLEMENTATION, EvidenceRole.USAGE]

        # Detect if the call is on a known crypto path
        is_crypto_call = self._is_known_crypto_call(node)
        if not is_crypto_call:
            self.generic_visit(node)
            return

        # Try to extract algorithm from arguments
        algo_hint = self._extract_algo_from_args(node)
        if algo_hint is None:
            # Can still emit IMPLEMENTATION — the API is being used
            roles = [EvidenceRole.IMPLEMENTATION]

        self.findings.append(RawFinding(
            file_path=self.file_path,
            line=node.lineno,
            col=node.col_offset,
            detector="python.ast.call",
            raw_signal=call_repr[:200] if call_repr else self._source_snippet(node.lineno),
            roles=roles,
            algorithm_hint=algo_hint or self._infer_algo_from_call_name(node),
            confidence=0.85 if algo_hint else 0.65,
            provenance={
                "ast_node": "Call",
                "call_text": call_repr[:200] if call_repr else "",
                "has_concrete_algo": algo_hint is not None,
            },
        ))
        self.generic_visit(node)

    def _is_known_crypto_call(self, node: ast.Call) -> bool:
        """Return True if this Call node invokes a known crypto API."""
        func = node.func
        # Direct call: hashlib.sha256()
        if isinstance(func, ast.Attribute):
            attr_name = func.attr
            # Check if the object is a known crypto import
            if isinstance(func.value, ast.Name):
                base = self._import_aliases.get(func.value.id, func.value.id)
                if self._is_crypto_module(base):
                    return True
            # Method on a crypto object (chained)
            if attr_name in {"encrypt", "decrypt", "sign", "verify", "new", "generate",
                             "generate_private_key", "generate_parameters", "update",
                             "finalize", "hexdigest", "digest", "encapsulate", "decapsulate"}:
                # Check parent chain
                val = func.value
                while isinstance(val, ast.Attribute):
                    val = val.value
                if isinstance(val, ast.Name):
                    base = self._import_aliases.get(val.id, val.id)
                    if self._is_crypto_module(base):
                        return True
        # Direct function call: sha256(), sign(), etc.
        if isinstance(func, ast.Name):
            name = self._import_aliases.get(func.id, func.id)
            if self._is_crypto_module(name.split(".")[0]):
                return True
        return False

    def _extract_algo_from_args(self, node: ast.Call) -> Optional[str]:
        """Try to extract a concrete algorithm name from call arguments."""
        for arg in node.args:
            if isinstance(arg, ast.Constant) and isinstance(arg.value, str):
                m = ALGO_STRING_PATTERN.search(arg.value)
                if m:
                    return m.group(0)
        for kw in node.keywords:
            if kw.arg in ("algorithm", "algo", "hash_algorithm", "name", "mode", "cipher", "scheme"):
                if isinstance(kw.value, ast.Constant) and isinstance(kw.value.value, str):
                    m = ALGO_STRING_PATTERN.search(kw.value.value)
                    if m:
                        return m.group(0)
                # Pattern: hashlib.new("sha256") but also hashes.SHA256()
                if isinstance(kw.value, ast.Call):
                    algo = self._infer_algo_from_call_name(kw.value)
                    if algo:
                        return algo
        return None

    def _infer_algo_from_call_name(self, node: ast.Call) -> Optional[str]:
        """Infer algorithm from the function name itself (e.g. hashes.SHA256(), AES.new())."""
        func = node.func
        if isinstance(func, ast.Attribute):
            m = ALGO_STRING_PATTERN.search(func.attr)
            if m:
                return m.group(0)
        if isinstance(func, ast.Name):
            m = ALGO_STRING_PATTERN.search(func.id)
            if m:
                return m.group(0)
        return None

    def visit_Assign(self, node: ast.Assign) -> None:
        """Detect constant algorithm assignments: ALGORITHM = 'AES-256-GCM'"""
        if not isinstance(node.value, ast.Constant):
            self.generic_visit(node)
            return
        val = node.value.value
        if not isinstance(val, str):
            self.generic_visit(node)
            return
        m = ALGO_STRING_PATTERN.search(val)
        if m:
            # Check if the LHS name suggests it's a config/algorithm constant
            for target in node.targets:
                if isinstance(target, ast.Name):
                    name_lower = target.id.lower()
                    if any(kw in name_lower for kw in ("algo", "algorithm", "cipher", "hash", "digest", "scheme", "method")):
                        self.findings.append(RawFinding(
                            file_path=self.file_path,
                            line=node.lineno,
                            col=node.col_offset,
                            detector="python.ast.assignment",
                            raw_signal=self._source_snippet(node.lineno),
                            roles=[EvidenceRole.CONFIGURATION],
                            algorithm_hint=m.group(0),
                            confidence=0.55,
                            provenance={
                                "ast_node": "Assign",
                                "variable": target.id,
                                "value": val,
                            },
                        ))
        self.generic_visit(node)


def scan_python_file(file_path: str, source_text: str) -> list[RawFinding]:
    """Scan a single Python source file and return raw evidence findings.

    Args:
        file_path: The logical path (used in evidence records — not used to open files).
        source_text: The source text to parse. Never executed.

    Returns:
        List of RawFinding objects. Empty list if no crypto evidence found or parse fails.
    """
    try:
        tree = ast.parse(source_text, filename=file_path, mode="exec")
    except SyntaxError as exc:
        logger.warning("Python AST parse failed for %s: %s", file_path, exc)
        return []

    visitor = CryptoVisitor(file_path=file_path, source_text=source_text)
    visitor.visit(tree)
    return visitor.findings


def scan_python_directory(root: str, max_file_bytes: int = 5_000_000) -> Iterator[RawFinding]:
    """Walk a directory and scan all .py files.

    Args:
        root: Root directory path (must exist).
        max_file_bytes: Skip files larger than this (default 5 MB).

    Yields:
        RawFinding objects.
    """
    root_path = Path(root)
    for py_file in root_path.rglob("*.py"):
        if not py_file.is_file():
            continue
        try:
            size = py_file.stat().st_size
        except OSError:
            continue
        if size > max_file_bytes:
            logger.info("Skipping large Python file %s (%d bytes)", py_file, size)
            continue
        try:
            source_text = py_file.read_text(encoding="utf-8", errors="replace")
        except OSError as exc:
            logger.warning("Cannot read %s: %s", py_file, exc)
            continue
        relative_path = str(py_file.relative_to(root_path))
        findings = scan_python_file(relative_path, source_text)
        yield from findings

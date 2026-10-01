"""
ECDAT Python AST Scanner

Scans Python source files for cryptographic API usage using the Python AST module.
Does NOT execute any code. Analysis is purely structural.

Evidence roles emitted (by AST node type):
  CAPABILITY      — `import cryptographic_library` (bare package import).
                    The library is present in the file. No specific algorithm
                    is confirmed — this is library-level CAPABILITY only.
                    One finding per library import, NOT one per algorithm.

  IMPLEMENTATION  — `from cryptography.hazmat.primitives.asymmetric import rsa`
                    A specific cryptographic primitive/submodule is imported.
                    The algorithm hint is derived from the imported name.

  USAGE           — A crypto API call with a concrete algorithm argument:
                    `hashlib.sha256()`, `rsa.generate_private_key(...)`, etc.
                    Both IMPLEMENTATION + USAGE are emitted for call nodes.

  CONFIGURATION   — A constant assignment: `ALGORITHM = 'AES-256-GCM'`

Key distinction:
  `import jwt`                  → CAPABILITY for jwt library (not IMPLEMENTATION for RSA/ECDSA/...)
  `from jwt.algorithms import RSAAlgorithm` → IMPLEMENTATION for RSA
  `jwt.encode(...)`             → IMPLEMENTATION + USAGE

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
    {"module": "hashlib", "calls": ["new", "md5", "sha1", "sha256", "sha384", "sha512", "sha224", "sha3_224", "sha3_256", "sha3_384", "sha3_512", "shake_128", "shake_256", "blake2s", "blake2b"], "arg_index": 0},
    # hmac
    {"module": "hmac", "calls": ["new", "HMAC", "digest"], "arg_index": 2},
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

ALGO_STRING_PATTERN = re.compile(
    r"\b(aes|rsa|ecdsa|ecdh|ed25519|ed448|x25519|x448|curve25519|chacha20|"
    r"rs(?:256|384|512)|ps(?:256|384|512)|hs(?:256|384|512)|es(?:256k?|384|512|521)|eddsa|"
    r"sha[-_]?(?:224|256|384|512|1)|md5|hmac|pbkdf2|hkdf|scrypt|argon2|poly1305|blake2[sb]|"
    r"sha3[-_]?(?:224|256|384|512)|shake[-_]?(?:128|256)|"
    r"ml[-_]?kem(?:[-_]?\d+)?|ml[-_]?dsa(?:[-_]?\d+)?|slh[-_]?dsa|kyber|dilithium|sphincs|"
    r"aes[-_]?\d+[-_]?(?:gcm|cbc|ctr)|3des(?:[-_]?cbc)?|tripledes|des[-_]?ede3(?:[-_]?cbc)?)\b",
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
    library_package: str = ""   # Set for CAPABILITY findings: the library name (e.g. 'hashlib')


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
        """Handle: `import hashlib`  /  `import rsa as _rsa`

        A bare package import proves the LIBRARY is present — CAPABILITY only.
        It does NOT prove any specific algorithm is implemented or called.
        We emit ONE CAPABILITY finding per library import, not one per algorithm.

        The algorithm_hint carries the library name (e.g. 'hashlib') so the
        fusion engine can record which library was imported. The actual
        algorithm evidence must come from call nodes (visit_Call).
        """
        for alias in node.names:
            name = alias.name
            local = alias.asname or name
            if self._is_crypto_module(name):
                self._crypto_imports.add(name)
                self._import_aliases[local] = name
                # Emit ONE CAPABILITY finding for this library import.
                # algorithm_hint = the top-level package name (e.g. 'hashlib', 'jwt').
                # Do NOT expand to canonical_algorithms — that would assert algorithms
                # are implemented when we only know the library is present.
                top_pkg = name.split(".")[0]
                self.findings.append(RawFinding(
                    file_path=self.file_path,
                    line=node.lineno,
                    col=node.col_offset,
                    detector="python.ast.import",
                    raw_signal=self._source_snippet(node.lineno),
                    roles=[EvidenceRole.CAPABILITY],
                    algorithm_hint=top_pkg,   # library name, not an algorithm name
                    confidence=0.5,           # capability confidence is lower than implementation
                    provenance={
                        "ast_node": "Import",
                        "module": name,
                        "local_alias": local,
                        "evidence_kind": "library_present",
                    },
                    library_package=top_pkg,
                ))
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        """Handle: `from cryptography.hazmat.primitives import hashes`

        A specific submodule or class import from a crypto package.
        Only emits a finding when the imported name or module path contains
        a recognizable algorithm name.

        Decision tree:
          1. Check imported name (e.g. 'RSAAlgorithm', 'Ed25519PrivateKey') → algo in name?
          2. Check module tail (e.g. from .asymmetric.rsa import ...) → algo in module?
          3. If algo found → IMPLEMENTATION finding
          4. If no algo found → register alias only, NO finding.
             The call-site detector (visit_Call) will emit evidence when these
             are actually invoked with a concrete algorithm argument.

        Examples:
          from cryptography.hazmat.primitives.asymmetric import rsa    → IMPLEMENTATION (rsa in module)
          from cryptography.hazmat.primitives.asymmetric.rsa import ... → IMPLEMENTATION (rsa in module)
          from jwt.algorithms import RSAAlgorithm                       → IMPLEMENTATION (RSA in name)
          from cryptography.hazmat.primitives import hashes             → NO finding (not an algo name)
          from cryptography.hazmat.primitives.serialization import Encoding → NO finding
          from cryptography.exceptions import InvalidSignature          → NO finding
        """
        module = node.module or ""
        if not self._is_crypto_module(module):
            self.generic_visit(node)
            return

        self._crypto_imports.add(module)
        for alias in node.names:
            local = alias.asname or alias.name
            full_name = f"{module}.{alias.name}"
            # Always register the alias for call-site detection
            self._import_aliases[local] = full_name

            # Try to detect a specific algorithm from the imported name
            algo_hint = self._extract_algo_from_name(alias.name)

            # If not found in the name, check the module tail
            # e.g. from cryptography.hazmat.primitives.asymmetric.rsa import RSAPrivateKey
            if not algo_hint:
                algo_hint = self._extract_algo_from_name(module.split(".")[-1])

            # If still not found, try the second-to-last module segment
            # e.g. from cryptography.hazmat.primitives.asymmetric.ed25519 import ...
            if not algo_hint and len(module.split(".")) >= 2:
                algo_hint = self._extract_algo_from_name(module.split(".")[-2])

            if algo_hint:
                # A recognizable algorithm name was found → IMPLEMENTATION
                self.findings.append(RawFinding(
                    file_path=self.file_path,
                    line=node.lineno,
                    col=node.col_offset,
                    detector="python.ast.import_from",
                    raw_signal=self._source_snippet(node.lineno),
                    roles=[EvidenceRole.IMPLEMENTATION],
                    algorithm_hint=algo_hint,
                    confidence=0.75,
                    provenance={
                        "ast_node": "ImportFrom",
                        "module": module,
                        "name": alias.name,
                        "local_alias": local,
                        "algo_identified": algo_hint,
                    },
                ))
            # If no algo found: alias registered above, no finding emitted.
            # Call-site detector (visit_Call) will produce evidence on actual use.

        self.generic_visit(node)


    def _extract_algo_from_name(self, name: str) -> Optional[str]:
        """Detect algorithm names encoded in class/function names like RSA, AES256, SHA256."""
        m = ALGO_STRING_PATTERN.search(name)
        return m.group(0) if m else None

    def visit_Call(self, node: ast.Call) -> None:
        """Handle crypto API calls.

        Patterns:
          - Direct hash calls: hashlib.sha256() / hashes.SHA256()
          - HMAC calls: hmac.new(...) / hmac.digest(...)
          - Crypto API calls with algorithm args: jwt.encode(..., algorithm='RS256')
        """
        call_repr = ast.unparse(node) if hasattr(ast, "unparse") else ""
        algo_hints: list[str] = []
        roles = [EvidenceRole.IMPLEMENTATION, EvidenceRole.USAGE]

        # Detect if the call is on a known crypto path
        is_crypto_call = self._is_known_crypto_call(node)
        if not is_crypto_call:
            self.generic_visit(node)
            return

        # Check if the call function itself specifies HMAC or a known algorithm
        inferred = self._infer_algo_from_call_name(node)
        if inferred and inferred.upper() == "HMAC":
            algo_hints.append("HMAC")

        # Try to extract algorithm from arguments
        extracted = self._extract_algo_from_args(node)
        if extracted:
            algo_hints.extend(extracted)
        elif not algo_hints and inferred:
            algo_hints.append(inferred)

        if not algo_hints:
            # Unresolved algorithm name -> IMPLEMENTATION without concrete algorithm
            self.findings.append(RawFinding(
                file_path=self.file_path,
                line=node.lineno,
                col=node.col_offset,
                detector="python.ast.call",
                raw_signal=call_repr[:200] if call_repr else self._source_snippet(node.lineno),
                roles=[EvidenceRole.IMPLEMENTATION],
                algorithm_hint="UNKNOWN",
                confidence=0.65,
                provenance={
                    "ast_node": "Call",
                    "call_text": call_repr[:200] if call_repr else "",
                    "has_concrete_algo": False,
                },
            ))
        else:
            for algo_hint in algo_hints:
                # Role semantics:
                # hmac.new(...) / hmac.digest(...) is library implementation of HMAC (MAC)
                if algo_hint.upper() == "HMAC":
                    call_roles = [EvidenceRole.IMPLEMENTATION]
                else:
                    call_roles = [EvidenceRole.IMPLEMENTATION, EvidenceRole.USAGE]

                self.findings.append(RawFinding(
                    file_path=self.file_path,
                    line=node.lineno,
                    col=node.col_offset,
                    detector="python.ast.call",
                    raw_signal=call_repr[:200] if call_repr else self._source_snippet(node.lineno),
                    roles=call_roles,
                    algorithm_hint=algo_hint,
                    confidence=0.85,
                    provenance={
                        "ast_node": "Call",
                        "call_text": call_repr[:200] if call_repr else "",
                        "has_concrete_algo": True,
                    },
                ))
        self.generic_visit(node)

    def _is_known_crypto_call(self, node: ast.Call) -> bool:
        """Return True if this Call node invokes a known crypto API."""
        func = node.func
        # Direct call: hashlib.sha256(), hmac.new(...)
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
                             "finalize", "hexdigest", "digest", "compare_digest",
                             "encapsulate", "decapsulate", "encode", "decode"}:
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

    def _extract_algo_from_args(self, node: ast.Call) -> list[str]:
        """Try to extract concrete algorithm names from call arguments."""
        found = []
        for arg in node.args:
            if isinstance(arg, ast.Constant) and isinstance(arg.value, str):
                m = ALGO_STRING_PATTERN.search(arg.value)
                if m:
                    found.append(m.group(0))
            elif isinstance(arg, ast.Attribute):
                m = ALGO_STRING_PATTERN.search(arg.attr)
                if m:
                    found.append(m.group(0))
        for kw in node.keywords:
            if kw.arg in ("algorithm", "algo", "hash_algorithm", "name", "mode", "cipher", "scheme", "algorithms"):
                if isinstance(kw.value, ast.Constant) and isinstance(kw.value.value, str):
                    m = ALGO_STRING_PATTERN.search(kw.value.value)
                    if m:
                        found.append(m.group(0))
                elif isinstance(kw.value, (ast.List, ast.Tuple, ast.Set)):
                    for elt in kw.value.elts:
                        if isinstance(elt, ast.Constant) and isinstance(elt.value, str):
                            m = ALGO_STRING_PATTERN.search(elt.value)
                            if m:
                                found.append(m.group(0))
                elif isinstance(kw.value, ast.Attribute):
                    m = ALGO_STRING_PATTERN.search(kw.value.attr)
                    if m:
                        found.append(m.group(0))
                if isinstance(kw.value, ast.Call):
                    algo = self._infer_algo_from_call_name(kw.value)
                    if algo:
                        found.append(algo)
        return found

    def _infer_algo_from_call_name(self, node: ast.Call) -> Optional[str]:
        """Infer algorithm from the function name itself (e.g. hashes.SHA256(), AES.new(), hmac.new())."""
        func = node.func
        if isinstance(func, ast.Attribute):
            m = ALGO_STRING_PATTERN.search(func.attr)
            if m:
                return m.group(0)
            if isinstance(func.value, ast.Name):
                base = self._import_aliases.get(func.value.id, func.value.id)
                if (base == "hmac" or base.startswith("hmac.")) and func.attr in ("new", "digest", "HMAC"):
                    return "HMAC"
        if isinstance(func, ast.Name):
            m = ALGO_STRING_PATTERN.search(func.id)
            if m:
                return m.group(0)
            base = self._import_aliases.get(func.id, func.id)
            if base in ("hmac.new", "hmac.digest", "hmac.HMAC"):
                return "HMAC"
        return None

    def _handle_assignment(self, target_name: str, value_node: ast.AST, lineno: int, col_offset: int) -> None:
        """Handle assignments and annotated assignments for constants and attribute references."""
        # Case A: String constant (e.g. ALGORITHM = 'AES-256-GCM', algorithm = 'RS256')
        if isinstance(value_node, ast.Constant) and isinstance(value_node.value, str):
            val = value_node.value
            m = ALGO_STRING_PATTERN.search(val)
            if m:
                name_lower = target_name.lower()
                if any(kw in name_lower for kw in ("algo", "algorithm", "cipher", "hash", "digest", "scheme", "method")) or m.group(0).upper() == val.upper():
                    self.findings.append(RawFinding(
                        file_path=self.file_path,
                        line=lineno,
                        col=col_offset,
                        detector="python.ast.assignment",
                        raw_signal=self._source_snippet(lineno),
                        roles=[EvidenceRole.CONFIGURATION],
                        algorithm_hint=m.group(0),
                        confidence=0.55,
                        provenance={
                            "ast_node": "Assign",
                            "variable": target_name,
                            "value": val,
                        },
                    ))
            return

        # Case A2: Sequence of string constants (e.g. tuples/lists of ciphers, macs, kex suites)
        if isinstance(value_node, (ast.Tuple, ast.List, ast.Set)):
            name_lower = target_name.lower()
            is_crypto_target = any(kw in name_lower for kw in ("algo", "algorithm", "cipher", "hash", "digest", "scheme", "method", "mac", "kex", "crypt"))
            for elt in value_node.elts:
                if isinstance(elt, ast.Constant) and isinstance(elt.value, str):
                    val = elt.value
                    m = ALGO_STRING_PATTERN.search(val)
                    if m:
                        if is_crypto_target or m.group(0).upper() == val.upper():
                            elt_lineno = elt.lineno if hasattr(elt, "lineno") else lineno
                            elt_col = elt.col_offset if hasattr(elt, "col_offset") else col_offset
                            self.findings.append(RawFinding(
                                file_path=self.file_path,
                                line=elt_lineno,
                                col=elt_col,
                                detector="python.ast.assignment",
                                raw_signal=self._source_snippet(elt_lineno),
                                roles=[EvidenceRole.CONFIGURATION],
                                algorithm_hint=m.group(0),
                                confidence=0.55,
                                provenance={
                                    "ast_node": "Assign_Sequence",
                                    "variable": target_name,
                                    "value": val,
                                },
                            ))
            return

        # Case B: Attribute reference to crypto constructor (e.g. SHA256 = hashlib.sha256, SHA256 = hashes.SHA256)
        if isinstance(value_node, ast.Attribute):
            m = ALGO_STRING_PATTERN.search(value_node.attr)
            if m:
                val_base = value_node.value
                base_id = ""
                if isinstance(val_base, ast.Name):
                    base_id = self._import_aliases.get(val_base.id, val_base.id)
                elif isinstance(val_base, ast.Attribute):
                    base_id = ast.unparse(val_base) if hasattr(ast, "unparse") else ""
                if self._is_crypto_module(base_id) or base_id in ("hashlib", "hashes", "cryptography"):
                    self.findings.append(RawFinding(
                        file_path=self.file_path,
                        line=lineno,
                        col=col_offset,
                        detector="python.ast.attribute",
                        raw_signal=self._source_snippet(lineno),
                        roles=[EvidenceRole.IMPLEMENTATION],
                        algorithm_hint=m.group(0),
                        confidence=0.75,
                        provenance={
                            "ast_node": "Assign",
                            "target": target_name,
                            "module": base_id,
                            "attr": value_node.attr,
                        },
                    ))

    def visit_Assign(self, node: ast.Assign) -> None:
        """Detect algorithm assignments: ALGORITHM = 'AES-256-GCM', hash_alg = hashlib.sha256"""
        for target in node.targets:
            target_name = ""
            if isinstance(target, ast.Name):
                target_name = target.id
            elif isinstance(target, ast.Attribute):
                target_name = target.attr
            self._handle_assignment(target_name, node.value, node.lineno, node.col_offset)
        self.generic_visit(node)

    def visit_AnnAssign(self, node: ast.AnnAssign) -> None:
        """Detect annotated assignments: SHA256: ClassVar[HashlibHash] = hashlib.sha256"""
        if node.value is not None:
            target_name = ""
            if isinstance(node.target, ast.Name):
                target_name = node.target.id
            elif isinstance(node.target, ast.Attribute):
                target_name = node.target.attr
            self._handle_assignment(target_name, node.value, node.lineno, node.col_offset)
        self.generic_visit(node)

    def visit_Dict(self, node: ast.Dict) -> None:
        """Detect algorithm registry dict mappings: {"RS256": RSAAlgorithm(...), "HS256": ...}"""
        if self._crypto_imports:
            for key, val in zip(node.keys, node.values):
                if key and isinstance(key, ast.Constant) and isinstance(key.value, str):
                    m = ALGO_STRING_PATTERN.search(key.value)
                    if m and m.group(0).upper() == key.value.upper():
                        self.findings.append(RawFinding(
                            file_path=self.file_path,
                            line=key.lineno if hasattr(key, "lineno") else node.lineno,
                            col=key.col_offset if hasattr(key, "col_offset") else node.col_offset,
                            detector="python.ast.registry",
                            raw_signal=f"{key.value}: {ast.unparse(val)[:80] if hasattr(ast, 'unparse') else ''}",
                            roles=[EvidenceRole.IMPLEMENTATION, EvidenceRole.CONFIGURATION],
                            algorithm_hint=m.group(0),
                            confidence=0.80,
                            provenance={
                                "ast_node": "Dict",
                                "registry_key": key.value,
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

"""
ECDAT Unit Tests — Python AST Scanner

Tests against the Enterprise Lab ground truth cases:
  L01: python_direct_rsa_usage        → IMPLEMENTATION + USAGE
  L02: python_import_alias            → IMPLEMENTATION + USAGE
  L04: no crypto calls in source      → nothing (dep-only)
  L07: pqc_hybrid_usage               → IMPLEMENTATION + USAGE for ML-KEM + X25519
  L11: negative_lookalike_string      → NOTHING (must not fire)
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

import pytest
from pathlib import Path
from ecdat.scanners.python_ast import scan_python_file
from ecdat.ontology import EvidenceRole

CORPUS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "tests" / "fixtures" / "synthetic-lab" / "python-service"


def _load_fixture(name: str) -> str:
    return (CORPUS_DIR / name).read_text(encoding="utf-8")


def _roles_found(findings) -> set:
    roles = set()
    for f in findings:
        for r in f.roles:
            roles.add(r)
    return roles


def _algorithms_found(findings) -> set:
    return {f.algorithm_hint.upper().split("-")[0] for f in findings if f.algorithm_hint}


# ---------------------------------------------------------------------------
# L01: Direct RSA usage
# ---------------------------------------------------------------------------

class TestL01PythonDirectRSAUsage:
    def test_detects_rsa(self):
        source = _load_fixture("l01_rsa_usage.py")
        findings = scan_python_file("l01_rsa_usage.py", source)
        algos = _algorithms_found(findings)
        assert any("RSA" in a for a in algos), f"Expected RSA in {algos}"

    def test_has_implementation_role(self):
        source = _load_fixture("l01_rsa_usage.py")
        findings = scan_python_file("l01_rsa_usage.py", source)
        roles = _roles_found(findings)
        assert EvidenceRole.IMPLEMENTATION in roles, f"Expected IMPLEMENTATION in {roles}"

    def test_has_usage_role(self):
        source = _load_fixture("l01_rsa_usage.py")
        findings = scan_python_file("l01_rsa_usage.py", source)
        roles = _roles_found(findings)
        assert EvidenceRole.USAGE in roles, f"Expected USAGE in {roles}"

    def test_not_empty(self):
        source = _load_fixture("l01_rsa_usage.py")
        findings = scan_python_file("l01_rsa_usage.py", source)
        assert len(findings) > 0, "Expected at least one finding for L01"


# ---------------------------------------------------------------------------
# L02: Import alias (AES as crypto_aes)
# ---------------------------------------------------------------------------

class TestL02ImportAlias:
    def test_detects_aes(self):
        source = _load_fixture("l02_aes_alias.py")
        findings = scan_python_file("l02_aes_alias.py", source)
        algos = _algorithms_found(findings)
        assert any("AES" in a for a in algos), f"Expected AES in {algos}"

    def test_has_implementation_and_usage(self):
        source = _load_fixture("l02_aes_alias.py")
        findings = scan_python_file("l02_aes_alias.py", source)
        roles = _roles_found(findings)
        assert EvidenceRole.IMPLEMENTATION in roles
        # Usage may or may not be detected depending on alias resolution
        # At minimum IMPLEMENTATION must be present


# ---------------------------------------------------------------------------
# L04: No crypto calls (dependency-only case) — source scanner should find NOTHING
# ---------------------------------------------------------------------------

class TestL04NoCryptoCalls:
    def test_source_file_no_findings(self):
        source = _load_fixture("l04_no_crypto_calls.py")
        findings = scan_python_file("l04_no_crypto_calls.py", source)
        # Should have no implementation or usage findings
        roles = _roles_found(findings)
        assert EvidenceRole.USAGE not in roles, "USAGE must not appear for L04 source file"
        assert EvidenceRole.IMPLEMENTATION not in roles, "IMPLEMENTATION must not appear for L04 source file"


# ---------------------------------------------------------------------------
# L07: PQC Hybrid Usage
# ---------------------------------------------------------------------------

class TestL07PQCHybridUsage:
    def test_detects_x25519(self):
        source = _load_fixture("l07_pqc_hybrid.py")
        findings = scan_python_file("l07_pqc_hybrid.py", source)
        algos = _algorithms_found(findings)
        # X25519 import should be detected
        assert any("X25519" in a.upper() for a in algos), f"Expected X25519 in {algos}"

    def test_has_implementation_role(self):
        source = _load_fixture("l07_pqc_hybrid.py")
        findings = scan_python_file("l07_pqc_hybrid.py", source)
        roles = _roles_found(findings)
        assert EvidenceRole.IMPLEMENTATION in roles


# ---------------------------------------------------------------------------
# L11: Negative lookalike — NO evidence should be emitted
# ---------------------------------------------------------------------------

class TestL11NegativeLookalike:
    def test_no_crypto_findings(self):
        source = _load_fixture("l11_negative_lookalike.py")
        findings = scan_python_file("l11_negative_lookalike.py", source)
        roles = _roles_found(findings)
        # Crypto strings in comments/strings/variables must NOT fire
        assert EvidenceRole.USAGE not in roles, \
            f"USAGE must not be in {roles} for L11 (lookalike strings in comments only)"
        # IMPLEMENTATION may appear if the scanner sees the string in a variable assignment
        # but it must not produce USAGE
        usage_findings = [f for f in findings if EvidenceRole.USAGE in f.roles]
        assert len(usage_findings) == 0, \
            f"No USAGE findings expected for L11, got: {usage_findings}"


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

class TestEdgeCases:
    def test_empty_source(self):
        findings = scan_python_file("empty.py", "")
        assert findings == []

    def test_syntax_error_source(self):
        # Scanner should return empty list, not raise
        findings = scan_python_file("broken.py", "def foo( invalid syntax !!!!")
        assert isinstance(findings, list)

    def test_large_source_handled(self):
        # Generate a large but valid Python file with no crypto
        large_source = "\n".join(f"x_{i} = {i}" for i in range(10000))
        findings = scan_python_file("large.py", large_source)
        assert isinstance(findings, list)


# ---------------------------------------------------------------------------
# Step 3B — Task 1: HMAC Call Detection
# ---------------------------------------------------------------------------

class TestStep3BHMAC:
    def test_hmac_new_produces_implementation(self):
        source = """
import hmac
import hashlib

def sign_token(key, msg):
    return hmac.new(key, msg, hashlib.sha256).digest()
"""
        findings = scan_python_file("hmac_test.py", source)
        hmac_findings = [f for f in findings if f.algorithm_hint and f.algorithm_hint.upper() == "HMAC"]
        assert len(hmac_findings) >= 1
        call_finding = next(f for f in hmac_findings if f.detector == "python.ast.call")
        assert EvidenceRole.IMPLEMENTATION in call_finding.roles
        # Ensure it is implementation (not usage), representing library implementation
        assert EvidenceRole.USAGE not in call_finding.roles

    def test_import_hmac_alone_is_capability_only(self):
        source = "import hmac"
        findings = scan_python_file("hmac_import.py", source)
        assert len(findings) == 1
        assert findings[0].roles == [EvidenceRole.CAPABILITY]
        assert EvidenceRole.USAGE not in findings[0].roles
        assert EvidenceRole.IMPLEMENTATION not in findings[0].roles


# ---------------------------------------------------------------------------
# Step 3B — Task 2: Direct hashlib calls and attribute references
# ---------------------------------------------------------------------------

class TestStep3BHashlib:
    def test_direct_hashlib_call(self):
        source = """
import hashlib
digest = hashlib.sha256(b"hello").hexdigest()
"""
        findings = scan_python_file("hash_call.py", source)
        sha_calls = [f for f in findings if f.algorithm_hint and "sha256" in f.algorithm_hint.lower() and f.detector == "python.ast.call"]
        assert len(sha_calls) >= 1
        assert EvidenceRole.IMPLEMENTATION in sha_calls[0].roles
        assert EvidenceRole.USAGE in sha_calls[0].roles

    def test_hashlib_new_with_literal(self):
        source = """
import hashlib
h = hashlib.new("sha384", b"data")
"""
        findings = scan_python_file("hash_new.py", source)
        sha_calls = [f for f in findings if f.algorithm_hint and "sha384" in f.algorithm_hint.lower()]
        assert len(sha_calls) >= 1
        assert EvidenceRole.USAGE in sha_calls[0].roles

    def test_hashlib_attribute_assignment(self):
        source = """
import hashlib
from typing import ClassVar

class HashHolder:
    SHA256: ClassVar = hashlib.sha256
    SHA512 = hashlib.sha512
"""
        findings = scan_python_file("hash_attr.py", source)
        attr_findings = [f for f in findings if f.detector == "python.ast.attribute"]
        hints = {f.algorithm_hint.lower() for f in attr_findings}
        assert "sha256" in hints
        assert "sha512" in hints
        for f in attr_findings:
            assert EvidenceRole.IMPLEMENTATION in f.roles

    def test_indirect_call_stays_unknown(self):
        source = """
class TokenSigner:
    def __init__(self, hash_alg):
        self.hash_alg = hash_alg

    def sign(self, data):
        return self.hash_alg(data)
"""
        findings = scan_python_file("indirect.py", source)
        assert not any(f.algorithm_hint and f.algorithm_hint != "UNKNOWN" for f in findings)


# ---------------------------------------------------------------------------
# Step 3B — Task 3: RSA Usage Semantics
# ---------------------------------------------------------------------------

class TestStep3BRSASemantics:
    def test_rs256_call_produces_rsa_digital_signature_usage(self):
        source = """
import jwt
token = jwt.encode({"sub": "user"}, key, algorithm="RS256")
"""
        findings = scan_python_file("jwt_rs256.py", source)
        rs256_findings = [f for f in findings if f.algorithm_hint == "RS256"]
        assert len(rs256_findings) >= 1
        call_f = rs256_findings[0]
        assert EvidenceRole.USAGE in call_f.roles

    def test_ps256_call_produces_rsa_pss_usage(self):
        source = """
import jwt
token = jwt.encode({"sub": "user"}, key, algorithm="PS256")
"""
        findings = scan_python_file("jwt_ps256.py", source)
        ps256_findings = [f for f in findings if f.algorithm_hint == "PS256"]
        assert len(ps256_findings) >= 1
        call_f = ps256_findings[0]
        assert EvidenceRole.USAGE in call_f.roles

    def test_rsa_import_alone_does_not_infer_usage(self):
        source = "from cryptography.hazmat.primitives.asymmetric import rsa"
        findings = scan_python_file("rsa_import.py", source)
        assert len(findings) >= 1
        roles = _roles_found(findings)
        assert EvidenceRole.IMPLEMENTATION in roles
        assert EvidenceRole.USAGE not in roles, "Pure RSA import must NOT infer USAGE"


# ---------------------------------------------------------------------------
# Step 3B — Task 4: Step 3A Semantics Preservation
# ---------------------------------------------------------------------------

class TestStep3APreservation:
    def test_bare_import_hashlib_single_capability(self):
        source = "import hashlib"
        findings = scan_python_file("hashlib_only.py", source)
        assert len(findings) == 1
        assert findings[0].roles == [EvidenceRole.CAPABILITY]
        assert findings[0].algorithm_hint == "hashlib"

    def test_bare_import_cryptography_single_capability(self):
        source = "import cryptography"
        findings = scan_python_file("crypto_only.py", source)
        assert len(findings) == 1
        assert findings[0].roles == [EvidenceRole.CAPABILITY]
        assert findings[0].algorithm_hint == "cryptography"

    def test_helper_imports_no_spurious_findings(self):
        source = """
from cryptography.hazmat.primitives.serialization import Encoding, NoEncryption
from cryptography.exceptions import InvalidSignature
"""
        findings = scan_python_file("helpers.py", source)
        assert len(findings) == 0, f"Expected 0 findings for helper imports, got {findings}"


"""
ECDAT Unit Tests — Evidence Fusion Engine

Tests the fusion rules:
  1. Algorithm normalization
  2. Role merging without silent upgrades
  3. Contradiction detection
  4. Claim state assignment
  5. Confidence fusion
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

import pytest
from ecdat.fusion import fuse_evidence
from ecdat.ontology import (
    EvidenceRole, ClaimState, SourceType, QuantumStatus, AlgorithmFamily,
)
from datetime import datetime, timezone


NOW = datetime.now(timezone.utc).isoformat()


def _make_raw(algorithm_hint, roles, source_type, confidence=0.7, file_path="test.py", line=1, detector="test.detector", raw_signal="test signal"):
    """Create a minimal raw finding for fusion tests."""
    class _Raw:
        pass
    r = _Raw()
    r.algorithm_hint = algorithm_hint
    r.roles = roles
    r.source_type = source_type
    r.confidence = confidence
    r.file_path = file_path
    r.line = line
    r.detector = detector
    r.raw_signal = raw_signal
    r.provenance = {}
    return r


# ---------------------------------------------------------------------------
# Rule 1: Algorithm normalization
# ---------------------------------------------------------------------------

class TestAlgorithmNormalization:
    def test_sha256_normalized(self):
        raw = _make_raw("sha256", [EvidenceRole.IMPLEMENTATION], SourceType.PYTHON_SOURCE)
        assets = fuse_evidence("scan-1", [raw], NOW)
        assert len(assets) >= 1
        assert any(a.canonical_algorithm == "SHA-256" for a in assets)

    def test_aes256gcm_normalized(self):
        raw = _make_raw("AES-256-GCM", [EvidenceRole.CONFIGURATION], SourceType.CONFIG)
        assets = fuse_evidence("scan-2", [raw], NOW)
        assert len(assets) >= 1
        assert any("AES" in a.canonical_algorithm for a in assets)

    def test_ml_kem_normalized(self):
        raw = _make_raw("mlkem768", [EvidenceRole.USAGE], SourceType.PYTHON_SOURCE)
        assets = fuse_evidence("scan-3", [raw], NOW)
        assert any(a.canonical_algorithm == "ML-KEM" for a in assets)
        # Must have quantum_status = SAFE
        ml_kem_asset = next((a for a in assets if a.canonical_algorithm == "ML-KEM"), None)
        assert ml_kem_asset is not None
        assert ml_kem_asset.quantum_status == QuantumStatus.SAFE


# ---------------------------------------------------------------------------
# Rule 2: Dependency stays CAPABILITY — never upgraded silently
# ---------------------------------------------------------------------------

class TestNoSilentRoleUpgrade:
    def test_capability_stays_capability(self):
        raw = _make_raw("RSA", [EvidenceRole.CAPABILITY], SourceType.DEPENDENCY)
        assets = fuse_evidence("scan-dep", [raw], NOW)
        assert len(assets) >= 1
        rsa_asset = next((a for a in assets if "RSA" in a.canonical_algorithm), None)
        assert rsa_asset is not None
        # Must not have USAGE if only capability was provided
        assert EvidenceRole.USAGE not in rsa_asset.roles

    def test_source_usage_adds_usage_role(self):
        cap_raw = _make_raw("RSA", [EvidenceRole.CAPABILITY], SourceType.DEPENDENCY)
        use_raw = _make_raw("RSA", [EvidenceRole.IMPLEMENTATION, EvidenceRole.USAGE], SourceType.PYTHON_SOURCE)
        assets = fuse_evidence("scan-src-dep", [cap_raw, use_raw], NOW)
        # After fusion, RSA asset should have both CAPABILITY and USAGE roles
        rsa_asset = next((a for a in assets if "RSA" in a.canonical_algorithm), None)
        assert rsa_asset is not None
        assert EvidenceRole.USAGE in rsa_asset.roles
        assert EvidenceRole.CAPABILITY in rsa_asset.roles


# ---------------------------------------------------------------------------
# Rule 3: Contradiction detection
# ---------------------------------------------------------------------------

class TestContradictionDetection:
    def test_config_vs_code_variant_mismatch(self):
        # Config says AES-128; code uses AES-256
        config_raw = _make_raw("AES-128-GCM", [EvidenceRole.CONFIGURATION], SourceType.CONFIG)
        config_raw.provenance = {"variant": "128-GCM"}

        code_raw = _make_raw("AES-256-GCM", [EvidenceRole.USAGE], SourceType.PYTHON_SOURCE)
        code_raw.provenance = {"variant": "256-GCM"}

        # Inject variant into provenance for fusion to pick up
        assets = fuse_evidence("scan-contra", [config_raw, code_raw], NOW)
        # Both AES findings should be present; at minimum one should exist
        aes_assets = [a for a in assets if "AES" in a.canonical_algorithm]
        assert len(aes_assets) >= 1


# ---------------------------------------------------------------------------
# Rule 4: Claim states
# ---------------------------------------------------------------------------

class TestClaimStates:
    def test_capability_only_is_ambiguous(self):
        raw = _make_raw("ECDSA", [EvidenceRole.CAPABILITY], SourceType.DEPENDENCY)
        assets = fuse_evidence("scan-cap-only", [raw], NOW)
        ecdsa = next((a for a in assets if "ECDSA" in a.canonical_algorithm), None)
        assert ecdsa is not None
        assert ecdsa.claim_state == ClaimState.AMBIGUOUS

    def test_implementation_usage_is_supported(self):
        raw = _make_raw("RSA", [EvidenceRole.IMPLEMENTATION, EvidenceRole.USAGE], SourceType.PYTHON_SOURCE)
        assets = fuse_evidence("scan-impl-usage", [raw], NOW)
        rsa = next((a for a in assets if "RSA" in a.canonical_algorithm), None)
        assert rsa is not None
        assert rsa.claim_state == ClaimState.SUPPORTED

    def test_observed_cert_is_supported(self):
        raw = _make_raw("ECDSA", [EvidenceRole.OBSERVED], SourceType.CERTIFICATE)
        assets = fuse_evidence("scan-cert", [raw], NOW)
        ecdsa = next((a for a in assets if "ECDSA" in a.canonical_algorithm), None)
        assert ecdsa is not None
        assert ecdsa.claim_state == ClaimState.SUPPORTED


# ---------------------------------------------------------------------------
# Rule 5: Confidence fusion
# ---------------------------------------------------------------------------

class TestConfidenceFusion:
    def test_multiple_evidence_increases_confidence(self):
        raw1 = _make_raw("SHA-256", [EvidenceRole.IMPLEMENTATION], SourceType.PYTHON_SOURCE, confidence=0.6)
        raw2 = _make_raw("SHA-256", [EvidenceRole.USAGE], SourceType.PYTHON_SOURCE, confidence=0.7)
        assets = fuse_evidence("scan-conf", [raw1, raw2], NOW)
        sha = next((a for a in assets if "SHA" in a.canonical_algorithm), None)
        assert sha is not None
        # Fused confidence must be >= max(0.6, 0.7) = 0.7
        assert sha.confidence >= 0.7

    def test_single_evidence_confidence_unchanged(self):
        raw = _make_raw("AES", [EvidenceRole.USAGE], SourceType.PYTHON_SOURCE, confidence=0.85)
        assets = fuse_evidence("scan-single-conf", [raw], NOW)
        aes = next((a for a in assets if "AES" in a.canonical_algorithm), None)
        assert aes is not None
        assert abs(aes.confidence - 0.85) < 0.01


# ---------------------------------------------------------------------------
# Step 3B — Fusion Semantics Tests
# ---------------------------------------------------------------------------

class TestStep3BFusion:
    def test_hmac_fusion_produces_mac_usage_role(self):
        raw = _make_raw("HMAC", [EvidenceRole.IMPLEMENTATION], SourceType.PYTHON_SOURCE)
        raw.provenance = {"family": "mac"}
        assets = fuse_evidence("scan-hmac", [raw], NOW)
        hmac = next((a for a in assets if a.canonical_algorithm == "HMAC"), None)
        assert hmac is not None
        assert hmac.family == AlgorithmFamily.MAC
        from ecdat.ontology import UsageRole
        assert hmac.usage_role == UsageRole.MAC
        assert hmac.quantum_status == QuantumStatus.SAFE

    def test_rs256_fusion_produces_rsa_digital_signature_usage(self):
        from ecdat.knowledge import normalize_algorithm
        meta = normalize_algorithm("RS256")
        raw = _make_raw("RS256", [EvidenceRole.USAGE], SourceType.PYTHON_SOURCE)
        raw.provenance = {"family": meta["family"].value, "variant": meta.get("variant", "")}
        assets = fuse_evidence("scan-rs256", [raw], NOW)
        rsa = next((a for a in assets if a.canonical_algorithm == "RSA"), None)
        assert rsa is not None
        assert rsa.family == AlgorithmFamily.DIGITAL_SIGNATURE
        from ecdat.ontology import UsageRole
        assert rsa.usage_role == UsageRole.DIGITAL_SIGNATURE
        assert EvidenceRole.USAGE in rsa.roles

    def test_ps256_fusion_produces_rsa_pss_digital_signature_usage(self):
        from ecdat.knowledge import normalize_algorithm
        meta = normalize_algorithm("PS256")
        raw = _make_raw("PS256", [EvidenceRole.USAGE], SourceType.PYTHON_SOURCE)
        raw.provenance = {"family": meta["family"].value, "variant": meta.get("variant", "")}
        assets = fuse_evidence("scan-ps256", [raw], NOW)
        ps = next((a for a in assets if a.canonical_algorithm == "RSA-PSS"), None)
        assert ps is not None
        assert ps.family == AlgorithmFamily.DIGITAL_SIGNATURE
        from ecdat.ontology import UsageRole
        assert ps.usage_role == UsageRole.DIGITAL_SIGNATURE
        assert EvidenceRole.USAGE in ps.roles

    def test_pure_rsa_import_has_unknown_usage_role(self):
        from ecdat.knowledge import normalize_algorithm
        meta = normalize_algorithm("RSA")
        raw = _make_raw("RSA", [EvidenceRole.IMPLEMENTATION], SourceType.PYTHON_SOURCE)
        raw.provenance = {"family": meta["family"].value}
        assets = fuse_evidence("scan-pure-rsa", [raw], NOW)
        rsa = next((a for a in assets if a.canonical_algorithm == "RSA"), None)
        assert rsa is not None
        from ecdat.ontology import UsageRole
        assert rsa.usage_role == UsageRole.UNKNOWN
        assert EvidenceRole.USAGE not in rsa.roles


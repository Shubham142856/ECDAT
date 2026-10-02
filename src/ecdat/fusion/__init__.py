"""
ECDAT Evidence Fusion Engine

Takes raw findings from all scanners and fuses them into normalized CryptoAsset claims.

Fusion rules (from 03-ARCHITECTURE.md § 5):
  1. Normalize algorithm names using the alias table.
  2. Merge corroborating evidence from multiple detectors → one asset, multiple evidence records.
  3. NEVER silently upgrade a weaker role to a stronger claim.
  4. Preserve contradictions — do not hide conflicting signals.
  5. Compute confidence from contributing evidence.
  6. Assign claim_state: supported | ambiguous | insufficient-context | contradictory.

Role hierarchy (for contradiction detection):
  OBSERVED <= CAPABILITY < CONFIGURATION < IMPLEMENTATION <= USAGE

A dependency-only finding stays CAPABILITY even when source code also mentions
the same algorithm (the source code finding is a separate, stronger claim).
"""
from __future__ import annotations

import hashlib
import logging
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional

from ecdat.ontology import (
    AlgorithmFamily, ClaimState, EvidenceRole,
    QuantumStatus, SourceType, UsageRole, Lifecycle,
)
from ecdat.knowledge import normalize_algorithm

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Normalized Evidence Record (the unit stored in DB)
# ---------------------------------------------------------------------------

@dataclass
class NormalizedEvidence:
    """A single, normalized evidence record — the atomic provenance unit."""
    evidence_id: str           # UUID
    scan_id: str
    source_type: SourceType
    source_location: str       # file_path[:line] or URL
    detector: str
    raw_signal: str
    normalized_claim: str      # canonical algorithm name
    roles: list[EvidenceRole]
    confidence: float
    provenance: dict           # arbitrary structured provenance
    observation_time: str      # ISO datetime
    validity: str = "valid"    # valid | expired | redacted


# ---------------------------------------------------------------------------
# Fused CryptoAsset (output of fusion, one per unique algorithm per scan)
# ---------------------------------------------------------------------------

@dataclass
class FusedAsset:
    """A fused crypto asset claim — represents one cryptographic entity with all evidence."""
    asset_id: str
    scan_id: str
    # Core crypto identity
    canonical_algorithm: str
    family: AlgorithmFamily
    variant: Optional[str]
    parameters: dict
    # Evidence roles and claim status
    roles: set[EvidenceRole]
    claim_state: ClaimState
    confidence: float           # fused confidence
    # Quantum/lifecycle status
    quantum_status: QuantumStatus
    lifecycle: Lifecycle
    # Usage context
    usage_role: UsageRole
    # All contributing evidence records
    evidence_records: list[NormalizedEvidence]
    # Detected contradictions
    contradictions: list[dict]


# ---------------------------------------------------------------------------
# Role strength ordering (for contradiction detection)
# ---------------------------------------------------------------------------

_ROLE_STRENGTH: dict[EvidenceRole, int] = {
    EvidenceRole.OBSERVED:        1,
    EvidenceRole.CAPABILITY:      2,
    EvidenceRole.CONFIGURATION:   3,
    EvidenceRole.IMPLEMENTATION:  4,
    EvidenceRole.USAGE:           5,
}


def _max_role_strength(roles: list[EvidenceRole]) -> int:
    return max((_ROLE_STRENGTH.get(r, 0) for r in roles), default=0)


# ---------------------------------------------------------------------------
# Fusion confidence formula
#
# Confidence is computed as:
#   base = max single-finding confidence
#   bonus = 0.05 * log2(1 + additional_corroborating_findings)
#   capped at 1.0
# ---------------------------------------------------------------------------

import math


def _fuse_confidence(confidences: list[float]) -> float:
    if not confidences:
        return 0.0
    base = max(confidences)
    n_extra = max(0, len(confidences) - 1)
    bonus = 0.05 * math.log2(1 + n_extra) if n_extra > 0 else 0.0
    return min(1.0, base + bonus)


# ---------------------------------------------------------------------------
# Claim state determination
# ---------------------------------------------------------------------------

def _determine_claim_state(
    roles: set[EvidenceRole],
    contradictions: list[dict],
    has_business_context: bool,
) -> ClaimState:
    if contradictions:
        return ClaimState.CONTRADICTORY
    if not has_business_context and EvidenceRole.USAGE not in roles:
        # Only capability without context → ambiguous
        if roles == {EvidenceRole.CAPABILITY}:
            return ClaimState.AMBIGUOUS
    if EvidenceRole.USAGE in roles or EvidenceRole.IMPLEMENTATION in roles:
        return ClaimState.SUPPORTED
    if EvidenceRole.CONFIGURATION in roles:
        return ClaimState.SUPPORTED
    if EvidenceRole.OBSERVED in roles:
        return ClaimState.SUPPORTED
    if EvidenceRole.CAPABILITY in roles:
        return ClaimState.AMBIGUOUS
    return ClaimState.AMBIGUOUS


# ---------------------------------------------------------------------------
# Key for grouping findings into the same asset
# Two findings belong to the same asset if they share (scan_id, canonical_algorithm).
# ---------------------------------------------------------------------------

def _asset_key(scan_id: str, canonical: str, source_type: SourceType) -> str:
    """Generate a stable grouping key.

    Certificate observations are kept separate from source-code observations
    for the same algorithm — they represent different evidence surfaces.
    """
    surface = "cert" if source_type == SourceType.CERTIFICATE else "code"
    return f"{scan_id}::{canonical}::{surface}"


# ---------------------------------------------------------------------------
# Infer usage role from algorithm family
# ---------------------------------------------------------------------------

def _infer_usage_role(family: AlgorithmFamily, canonical: str) -> UsageRole:
    canon_lower = canonical.lower()
    if family in (AlgorithmFamily.KEM, AlgorithmFamily.PQC_KEM, AlgorithmFamily.HYBRID_KEM):
        return UsageRole.KEY_ENCAPSULATION
    if family == AlgorithmFamily.KEY_AGREEMENT:
        return UsageRole.KEY_ESTABLISHMENT
    if family in (AlgorithmFamily.DIGITAL_SIGNATURE, AlgorithmFamily.PQC_SIGNATURE, AlgorithmFamily.HYBRID_SIGNATURE):
        return UsageRole.DIGITAL_SIGNATURE
    if family == AlgorithmFamily.SYMMETRIC_CIPHER:
        return UsageRole.ENCRYPTION
    if family == AlgorithmFamily.HASH:
        return UsageRole.HASHING
    if family == AlgorithmFamily.MAC:
        return UsageRole.MAC
    if family == AlgorithmFamily.KDF:
        return UsageRole.KEY_DERIVATION
    if family == AlgorithmFamily.RANDOM:
        return UsageRole.RANDOM_GENERATION
    if "tls" in canon_lower:
        return UsageRole.TLS_KEX
    if "ssh" in canon_lower:
        return UsageRole.SSH_KEX
    return UsageRole.UNKNOWN


# ---------------------------------------------------------------------------
# Contradiction detection
#
# A contradiction exists when two evidence records for the same canonical
# algorithm disagree on an observable property (e.g. config says AES-128,
# code calls AES-256).
# ---------------------------------------------------------------------------

def _detect_contradictions(
    canonical: str,
    records: list[NormalizedEvidence],
) -> list[dict]:
    contradictions = []
    # Check for config vs code disagreement on variant
    config_variants: set[str] = set()
    code_variants: set[str] = set()
    for rec in records:
        variant = rec.provenance.get("variant", "")
        if not variant:
            continue
        if EvidenceRole.CONFIGURATION in rec.roles:
            config_variants.add(variant)
        elif EvidenceRole.USAGE in rec.roles or EvidenceRole.IMPLEMENTATION in rec.roles:
            code_variants.add(variant)

    if config_variants and code_variants and not config_variants.intersection(code_variants):
        contradictions.append({
            "type": "variant_mismatch",
            "config_variants": list(config_variants),
            "code_variants": list(code_variants),
            "description": f"Config specifies {', '.join(config_variants)} but code uses {', '.join(code_variants)}",
        })

    return contradictions


# ---------------------------------------------------------------------------
# Main fusion function
# ---------------------------------------------------------------------------

def fuse_evidence(
    scan_id: str,
    raw_findings: list,
    observation_time: str,
    has_business_context: bool = False,
) -> list[FusedAsset]:
    """Fuse raw scanner findings into normalized, deduplicated crypto asset claims.

    Args:
        scan_id: The scan identifier.
        raw_findings: List of raw finding objects from all scanners.
                      Each must have: file_path/source_location, detector, raw_signal,
                      roles (list of EvidenceRole), algorithm_hint, confidence.
        observation_time: ISO datetime string for this fusion run.
        has_business_context: True if enterprise.yaml provides business metadata.

    Returns:
        List of FusedAsset objects.
    """
    # Step 1: Normalize all raw findings
    normalized: list[NormalizedEvidence] = []
    for raw in raw_findings:
        # Get source location
        source_loc = getattr(raw, "file_path", "") or getattr(raw, "tarball_path", "unknown")
        line = getattr(raw, "line", 0)
        if line:
            source_loc = f"{source_loc}:{line}"

        # Normalize algorithm
        algo_hint = getattr(raw, "algorithm_hint", "")
        if not algo_hint and hasattr(raw, "algorithm_hints") and raw.algorithm_hints:
            algo_hint = raw.algorithm_hints[0]
        algo_meta = normalize_algorithm(algo_hint)

        # Determine source type
        source_type = getattr(raw, "source_type", SourceType.PYTHON_SOURCE)

        ev = NormalizedEvidence(
            evidence_id=str(uuid.uuid4()),
            scan_id=scan_id,
            source_type=source_type,
            source_location=source_loc,
            detector=getattr(raw, "detector", "unknown"),
            raw_signal=getattr(raw, "raw_signal", "")[:500],
            normalized_claim=algo_meta["canonical"],
            roles=list(getattr(raw, "roles", [EvidenceRole.CAPABILITY])),
            confidence=float(getattr(raw, "confidence", 0.5)),
            provenance={
                **getattr(raw, "provenance", {}),
                "canonical": algo_meta["canonical"],
                "family": algo_meta["family"].value if hasattr(algo_meta["family"], "value") else str(algo_meta["family"]),
                "quantum_status": algo_meta["quantum_status"].value if hasattr(algo_meta["quantum_status"], "value") else str(algo_meta["quantum_status"]),
                "variant": algo_meta.get("variant", ""),
                "standard": algo_meta.get("standard", ""),
            },
            observation_time=observation_time,
        )
        normalized.append(ev)

    # Step 2: Filter non-algorithm evidence records before grouping.
    #
    # Two filter rules:
    #
    # Rule A — Library-presence CAPABILITY records:
    #   A CAPABILITY finding whose normalized_claim is UNKNOWN represents a bare
    #   package import (e.g. `import jwt` → algo_hint='jwt' → normalize → UNKNOWN).
    #   The library name is NOT a cryptographic algorithm. Preserve for audit trail
    #   but exclude from asset grouping.
    #
    # Rule B — Unresolved API call IMPLEMENTATION records:
    #   An IMPLEMENTATION finding whose normalized_claim is UNKNOWN and whose
    #   source is python.ast.call or python.ast.import_from represents a call
    #   to a function/class in a crypto module that we couldn't map to a named
    #   algorithm (e.g. `decode_dss_signature()`, `load_pem_private_key()`).
    #   These are valid crypto operations but are not standalone algorithm assets.
    #   They are preserved for audit and will contribute to the asset evidence
    #   when the same file has other corroborating evidence (e.g. RSA from the
    #   import above).
    library_capability_evidence: list[NormalizedEvidence] = []
    unresolved_api_evidence: list[NormalizedEvidence] = []
    algorithm_evidence: list[NormalizedEvidence] = []
    _call_detectors = {
        "python.ast.call", "python.ast.import_from", "python.ast.attribute", "python.ast.registry",
        "java.rule.import", "java.rule.engine_instantiation", "java.rule.getinstance",
        "java.rule.keygen_init", "java.rule.pqc_string",
    }

    for ev in normalized:
        is_capability_only = (ev.roles == [EvidenceRole.CAPABILITY])
        algo_family = ev.provenance.get("family", "unknown")
        claim_meta = normalize_algorithm(ev.normalized_claim)
        is_unknown_algo = (ev.normalized_claim == "UNKNOWN" or claim_meta.get("family") == AlgorithmFamily.UNKNOWN)
        is_library_presence = is_capability_only and (is_unknown_algo or algo_family == "unknown")

        if is_library_presence:
            # Rule A: Library-presence record (e.g. `import hashlib`, `import cryptography`)
            library_capability_evidence.append(ev)
        elif is_unknown_algo and ev.detector in _call_detectors:
            # Rule B: Unresolved API call — preserves for audit, skip as standalone asset
            unresolved_api_evidence.append(ev)
        else:
            algorithm_evidence.append(ev)

    logger.debug(
        "Fusion filter: %d algorithm evidence, %d library-presence (Rule A), %d unresolved-API (Rule B) — excluded from asset grouping",
        len(algorithm_evidence), len(library_capability_evidence), len(unresolved_api_evidence),
    )

    # Step 3: Group by asset key
    groups: dict[str, list[NormalizedEvidence]] = defaultdict(list)
    for ev in algorithm_evidence:
        source_type_val = ev.source_type
        key = _asset_key(scan_id, ev.normalized_claim, source_type_val)
        groups[key].append(ev)


    # Step 3: Build FusedAsset for each group
    fused_assets: list[FusedAsset] = []
    for group_key, records in groups.items():
        canonical = records[0].normalized_claim
        algo_meta = normalize_algorithm(canonical)
        family = algo_meta.get("family", AlgorithmFamily.UNKNOWN)
        if isinstance(family, str):
            try:
                family = AlgorithmFamily(family)
            except ValueError:
                family = AlgorithmFamily.UNKNOWN

        # Refine family if contributing evidence provides more specific role evidence (e.g. DIGITAL_SIGNATURE from RS256)
        for rec in records:
            rec_family = rec.provenance.get("family")
            if rec_family in (AlgorithmFamily.DIGITAL_SIGNATURE, "digital_signature"):
                family = AlgorithmFamily.DIGITAL_SIGNATURE
                break
            elif rec_family in (AlgorithmFamily.MAC, "mac"):
                family = AlgorithmFamily.MAC
                break

        quantum_status = algo_meta.get("quantum_status", QuantumStatus.UNKNOWN)
        if isinstance(quantum_status, str):
            try:
                quantum_status = QuantumStatus(quantum_status)
            except ValueError:
                quantum_status = QuantumStatus.UNKNOWN

        # Aggregate roles
        all_roles: set[EvidenceRole] = set()
        for rec in records:
            all_roles.update(rec.roles)

        # Fuse confidence
        confidences = [rec.confidence for rec in records]
        fused_conf = _fuse_confidence(confidences)

        # Detect contradictions
        contradictions = _detect_contradictions(canonical, records)

        # Determine claim state
        claim_state = _determine_claim_state(all_roles, contradictions, has_business_context)

        # Infer usage role
        usage_role = _infer_usage_role(family, canonical)

        # Get variant from provenance
        variant = None
        for rec in records:
            v = rec.provenance.get("variant", "")
            if v:
                variant = v
                break

        # Determine lifecycle
        lifecycle_hint = algo_meta.get("lifecycle", Lifecycle.UNKNOWN)
        if isinstance(lifecycle_hint, str):
            try:
                lifecycle = Lifecycle(lifecycle_hint)
            except ValueError:
                lifecycle = Lifecycle.UNKNOWN
        else:
            lifecycle = lifecycle_hint

        asset = FusedAsset(
            asset_id=str(uuid.uuid4()),
            scan_id=scan_id,
            canonical_algorithm=canonical,
            family=family,
            variant=variant,
            parameters={
                "standard": algo_meta.get("standard", ""),
                "note": algo_meta.get("note", ""),
            },
            roles=all_roles,
            claim_state=claim_state,
            confidence=fused_conf,
            quantum_status=quantum_status,
            lifecycle=lifecycle,
            usage_role=usage_role,
            evidence_records=records,
            contradictions=contradictions,
        )
        fused_assets.append(asset)

    logger.info(
        "Fusion: %d raw findings -> %d normalized (%d algorithm, %d library-capability, %d unresolved-API) -> %d fused assets",
        len(raw_findings), len(normalized), len(algorithm_evidence),
        len(library_capability_evidence), len(unresolved_api_evidence), len(fused_assets),
    )
    return fused_assets

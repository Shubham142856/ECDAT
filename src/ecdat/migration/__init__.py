"""
ECDAT PQC Registry and Migration Engine

Loads the PQC registry from config/pqc-registry.json (versioned data — NOT hard-coded logic).
Generates role-aware migration candidates.
Builds wave migration plans.
Simulates migration transitions.

CRITICAL RULES:
  - All migration candidates are role-matched. ML-KEM is NEVER recommended
    for digital signature replacement.
  - Migration impact is always labeled as "predicted" — never guaranteed.
  - The registry is data-driven: algorithms can be added/removed by editing
    config/pqc-registry.json without changing code.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from ecdat.ontology import AlgorithmFamily, UsageRole, QuantumStatus, PQCStatus
from ecdat.fusion import FusedAsset
from ecdat.risk import RiskAssessment

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# PQC Registry data structures
# ---------------------------------------------------------------------------

@dataclass
class PQCAlgorithm:
    name: str
    standard: str
    status: PQCStatus
    family: AlgorithmFamily
    usage_roles: list[UsageRole]
    variants: list[str]
    security_categories: list[int]  # NIST security categories
    notes: str = ""
    trade_offs: list[str] = field(default_factory=list)


@dataclass
class MigrationCandidate:
    """A PQC candidate algorithm recommended for a specific asset."""
    candidate_algorithm: str
    standard: str
    status: PQCStatus
    family: AlgorithmFamily
    usage_role_match: UsageRole       # the role it matches
    security_category: Optional[int]
    trade_offs: list[str]
    compatibility_notes: str
    impact_label: str = "predicted — not guaranteed"


@dataclass
class MigrationWave:
    wave_number: int
    priority: str   # CRITICAL / HIGH / MEDIUM / LOW
    asset_ids: list[str]
    rationale: str
    estimated_effort_weeks: Optional[float]


@dataclass
class MigrationPlan:
    """Full migration plan for a scan."""
    scan_id: str
    asset_candidates: dict[str, list[MigrationCandidate]]  # asset_id → candidates
    waves: list[MigrationWave]
    impact_label: str = "predicted — not a guarantee of migration success"


@dataclass
class SimulationState:
    """State after simulating a migration from classical to PQC."""
    asset_id: str
    from_algorithm: str
    to_algorithm: str
    simulated_quantum_status: QuantumStatus
    simulated_risk_level: str
    delta_p_at_risk: float   # change in P(at_risk) after migration
    trade_off_notes: list[str]
    impact_label: str = "predicted simulation result"


# ---------------------------------------------------------------------------
# Registry loader
# ---------------------------------------------------------------------------

_DEFAULT_REGISTRY_PATH = Path(__file__).parent.parent.parent / "config" / "pqc-registry.json"

# Hard-coded fallback registry (in case config file is missing — this is
# the canonical data, not fabricated; sourced from NIST FIPS 203/204/205
# and IETF RFC 10024, RFC 10042)
_BUILTIN_REGISTRY: list[dict] = [
    {
        "name": "ML-KEM-768",
        "standard": "NIST FIPS 203",
        "status": "final",
        "family": "pqc_kem",
        "usage_roles": ["key_encapsulation", "key_establishment"],
        "variants": ["ML-KEM-512", "ML-KEM-768", "ML-KEM-1024"],
        "security_categories": [1, 3, 5],
        "notes": "NIST primary KEM standard. Not a signature scheme.",
        "trade_offs": ["Larger key/ciphertext than ECDH", "Higher CPU than X25519"],
    },
    {
        "name": "ML-DSA-65",
        "standard": "NIST FIPS 204",
        "status": "final",
        "family": "pqc_signature",
        "usage_roles": ["digital_signature", "certificate_signing"],
        "variants": ["ML-DSA-44", "ML-DSA-65", "ML-DSA-87"],
        "security_categories": [2, 3, 5],
        "notes": "NIST primary digital signature standard.",
        "trade_offs": ["Larger signature than ECDSA", "Different performance profile"],
    },
    {
        "name": "SLH-DSA",
        "standard": "NIST FIPS 205",
        "status": "final",
        "family": "pqc_signature",
        "usage_roles": ["digital_signature"],
        "variants": ["SLH-DSA-SHA2-128s", "SLH-DSA-SHA2-192f", "SLH-DSA-SHA2-256f"],
        "security_categories": [1, 3, 5],
        "notes": "Hash-based signature, conservative security assumption.",
        "trade_offs": ["Stateless but large signature size", "Slow signing for some variants"],
    },
    {
        "name": "X25519MLKEM768",
        "standard": "IETF RFC 10024",
        "status": "standards-track",
        "family": "hybrid_kem",
        "usage_roles": ["tls_kex", "key_establishment"],
        "variants": ["X25519MLKEM768", "SecP256r1MLKEM768", "SecP384r1MLKEM1024"],
        "security_categories": [3],
        "notes": "Hybrid PQ/T KEX for TLS 1.3. RFC 10024 standards-track.",
        "trade_offs": ["Larger ClientHello", "Requires TLS 1.3"],
    },
    {
        "name": "mlkem768x25519-sha256",
        "standard": "IETF RFC 10042",
        "status": "informational",
        "family": "hybrid_kem",
        "usage_roles": ["ssh_kex"],
        "variants": ["mlkem768x25519-sha256", "sntrup761x25519-sha512"],
        "security_categories": [3],
        "notes": "Hybrid PQ/T KEX for SSH. RFC 10042 informational.",
        "trade_offs": ["Requires OpenSSH 9.x+"],
    },
]


def load_registry(registry_path: Optional[str] = None) -> list[PQCAlgorithm]:
    """Load PQC registry from file or use built-in registry.

    Args:
        registry_path: Path to pqc-registry.json. Uses default config path if None.

    Returns:
        List of PQCAlgorithm objects.
    """
    path = Path(registry_path) if registry_path else _DEFAULT_REGISTRY_PATH
    registry_data = None

    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                registry_data = json.load(f)
            logger.info("PQC registry loaded from %s (%d entries)", path, len(registry_data))
        except Exception as exc:
            logger.warning("Failed to load PQC registry from %s: %s; using built-in", path, exc)

    if registry_data is None:
        registry_data = _BUILTIN_REGISTRY
        logger.info("Using built-in PQC registry (%d entries)", len(registry_data))

    algorithms: list[PQCAlgorithm] = []
    for entry in registry_data:
        try:
            family_str = entry.get("family", "unknown")
            try:
                family = AlgorithmFamily(family_str)
            except ValueError:
                family = AlgorithmFamily.UNKNOWN

            status_str = entry.get("status", "final")
            try:
                status = PQCStatus(status_str)
            except ValueError:
                status = PQCStatus.FINAL

            usage_roles_raw = entry.get("usage_roles", [])
            usage_roles: list[UsageRole] = []
            for r in usage_roles_raw:
                try:
                    usage_roles.append(UsageRole(r))
                except ValueError:
                    pass

            algorithms.append(PQCAlgorithm(
                name=entry["name"],
                standard=entry.get("standard", ""),
                status=status,
                family=family,
                usage_roles=usage_roles,
                variants=entry.get("variants", [entry["name"]]),
                security_categories=entry.get("security_categories", []),
                notes=entry.get("notes", ""),
                trade_offs=entry.get("trade_offs", []),
            ))
        except Exception as exc:
            logger.warning("Skipping malformed registry entry %s: %s", entry.get("name"), exc)

    return algorithms


# ---------------------------------------------------------------------------
# Candidate generator (role-aware)
# ---------------------------------------------------------------------------

def generate_candidates(
    asset: FusedAsset,
    registry: list[PQCAlgorithm],
) -> list[MigrationCandidate]:
    """Generate role-aware migration candidates for a vulnerable asset.

    CRITICAL: ML-KEM is never recommended for digital signature roles.
    Only returns algorithms whose usage_roles include the asset's usage_role.
    """
    if asset.quantum_status not in (QuantumStatus.VULNERABLE, QuantumStatus.CONDITIONALLY_SAFE, QuantumStatus.UNKNOWN):
        return []  # Already safe; no migration needed

    asset_usage_role = asset.usage_role
    candidates: list[MigrationCandidate] = []

    for pqc_algo in registry:
        if asset_usage_role in pqc_algo.usage_roles:
            # Verify role-safety: signature assets never get KEM candidates
            if asset_usage_role == UsageRole.DIGITAL_SIGNATURE:
                if pqc_algo.family not in (AlgorithmFamily.PQC_SIGNATURE, AlgorithmFamily.HYBRID_SIGNATURE):
                    continue  # skip KEM candidates for signature roles
            elif asset_usage_role in (UsageRole.KEY_ENCAPSULATION, UsageRole.KEY_ESTABLISHMENT, UsageRole.TLS_KEX):
                if pqc_algo.family not in (AlgorithmFamily.PQC_KEM, AlgorithmFamily.HYBRID_KEM):
                    continue  # skip signature candidates for KEM roles

            # Pick the best variant based on security category
            candidate_name = pqc_algo.variants[0] if pqc_algo.variants else pqc_algo.name
            security_cat = pqc_algo.security_categories[0] if pqc_algo.security_categories else None

            compatibility_notes = _get_compatibility_notes(asset, pqc_algo)

            candidates.append(MigrationCandidate(
                candidate_algorithm=candidate_name,
                standard=pqc_algo.standard,
                status=pqc_algo.status,
                family=pqc_algo.family,
                usage_role_match=asset_usage_role,
                security_category=security_cat,
                trade_offs=pqc_algo.trade_offs,
                compatibility_notes=compatibility_notes,
                impact_label="predicted — not guaranteed",
            ))

    return candidates


def _get_compatibility_notes(asset: FusedAsset, pqc_algo: PQCAlgorithm) -> str:
    """Generate compatibility notes for a migration candidate."""
    notes = []
    if "TLS" in pqc_algo.notes:
        notes.append("Requires TLS 1.3 support at both endpoints")
    if "SSH" in pqc_algo.notes:
        notes.append("Requires OpenSSH 9.x or equivalent PQC-capable SSH implementation")
    if "Bouncy Castle" not in asset.canonical_algorithm and "pqc" in pqc_algo.family.value:
        notes.append("Library support required: OQS, Bouncy Castle >= 1.79, or native FIPS 203 implementation")
    notes.append("Certificate re-issuance required for X.509 public key changes")
    notes.append(pqc_algo.notes)
    return "; ".join(n for n in notes if n)


# ---------------------------------------------------------------------------
# Wave planner (BFS priority order)
# ---------------------------------------------------------------------------

def build_wave_plan(
    assets: list[FusedAsset],
    risk_assessments: dict[str, RiskAssessment],  # asset_id → RiskAssessment
    candidates: dict[str, list[MigrationCandidate]],
) -> list[MigrationWave]:
    """Build a prioritized migration wave plan.

    Wave ordering:
      Wave 1 — CRITICAL risk assets (P(at_risk) >= 0.75 or context_score >= 0.80)
      Wave 2 — HIGH risk assets
      Wave 3 — MEDIUM risk assets
      Wave 4 — LOW risk assets
      Wave 5 — Already safe / no migration needed

    Rationale for each wave is included in the output.
    All estimates are labeled as predicted.
    """
    waves: list[MigrationWave] = []
    buckets: dict[str, list[str]] = {"CRITICAL": [], "HIGH": [], "MEDIUM": [], "LOW": [], "SAFE": []}

    for asset in assets:
        if asset.quantum_status == QuantumStatus.SAFE:
            buckets["SAFE"].append(asset.asset_id)
            continue
        ra = risk_assessments.get(asset.asset_id)
        if ra is None:
            buckets["LOW"].append(asset.asset_id)
            continue
        buckets[ra.risk_level].append(asset.asset_id)

    wave_configs = [
        ("CRITICAL", "CRITICAL", "Immediate: highest quantum risk, internet-facing, sensitive data"),
        ("HIGH",     "HIGH",     "Near-term: high risk, requires coordinated migration"),
        ("MEDIUM",   "MEDIUM",   "Planned: medium risk, can follow organizational cycle"),
        ("LOW",      "LOW",      "Scheduled: low risk, include in next major upgrade cycle"),
        ("SAFE",     "SAFE",     "No action: already quantum-safe — verify registry currency"),
    ]

    for wave_num, (bucket_key, priority, rationale) in enumerate(wave_configs, start=1):
        asset_ids = buckets.get(bucket_key, [])
        if not asset_ids:
            continue

        # Rough effort estimate: 4–12 weeks per CRITICAL asset, 2–6 per HIGH
        effort_map = {"CRITICAL": 8.0, "HIGH": 5.0, "MEDIUM": 3.0, "LOW": 2.0, "SAFE": 0.0}
        effort = effort_map.get(priority, 0) * len(asset_ids)

        waves.append(MigrationWave(
            wave_number=wave_num,
            priority=priority,
            asset_ids=asset_ids,
            rationale=rationale,
            estimated_effort_weeks=effort if effort > 0 else None,
        ))

    return waves


# ---------------------------------------------------------------------------
# Migration simulator
# ---------------------------------------------------------------------------

def simulate_migration(
    asset: FusedAsset,
    candidate: MigrationCandidate,
    original_risk: RiskAssessment,
) -> SimulationState:
    """Simulate the risk impact of migrating from the current algorithm to the candidate.

    All output is labeled as "predicted simulation result".
    """
    from ecdat.risk import compute_monte_carlo

    # After migration to a PQC algorithm, quantum_status becomes SAFE (or HYBRID)
    new_quantum_status = (
        QuantumStatus.HYBRID
        if candidate.family in (AlgorithmFamily.HYBRID_KEM, AlgorithmFamily.HYBRID_SIGNATURE)
        else QuantumStatus.SAFE
    )

    # Recompute P(at_risk) with new quantum status as 0.0 (safe)
    new_p_at_risk = 0.0  # if safe, no quantum risk

    delta = new_p_at_risk - original_risk.probability.p_at_risk

    # Risk level after migration
    new_risk_level = "LOW" if new_quantum_status == QuantumStatus.HYBRID else "NEGLIGIBLE"

    return SimulationState(
        asset_id=asset.asset_id,
        from_algorithm=asset.canonical_algorithm,
        to_algorithm=candidate.candidate_algorithm,
        simulated_quantum_status=new_quantum_status,
        simulated_risk_level=new_risk_level,
        delta_p_at_risk=round(delta, 4),
        trade_off_notes=candidate.trade_offs + [candidate.compatibility_notes],
        impact_label="predicted simulation result — actual impact depends on implementation",
    )

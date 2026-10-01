"""
ECDAT Risk Engine

Implements the Mosca-style quantum risk model plus Monte Carlo extension.

From 03-ARCHITECTURE.md § 7 (Risk model):

  X = required data secrecy lifetime (years)
  Y = estimated migration time (years)
  Z = CRQC arrival scenario parameter

  Baseline: X + Y > Z (boolean risk condition)

  Extended: Z ~ Triangular(low, mode, high)
            P(X + Y > Z) computed by seeded Monte Carlo

CRITICAL RULES:
  - Z is NEVER a hard-coded year or fixed constant. It is always a
    scenario distribution parameter supplied by the user/config.
  - Results are labeled as "scenario-model results" not forecasts.
  - The RNG seed is from config (default: 20260930) for reproducibility.
  - Context weights are ECDAT policy defaults, NOT NIST-prescribed.

Context weights (from config/risk.example.yaml):
  quantum_exposure:     0.35
  data_sensitivity:     0.20
  business_criticality: 0.20
  internet_exposure:    0.10
  blast_radius:         0.10
  migration_difficulty: 0.05
"""
from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from typing import Optional

import numpy as np

from ecdat.ontology import QuantumStatus
from ecdat.fusion import FusedAsset
from ecdat.graph import BlastRadiusResult

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Default context weights (ECDAT policy defaults — not NIST-prescribed)
# ---------------------------------------------------------------------------

DEFAULT_CONTEXT_WEIGHTS: dict[str, float] = {
    "quantum_exposure":     0.35,
    "data_sensitivity":     0.20,
    "business_criticality": 0.20,
    "internet_exposure":    0.10,
    "blast_radius":         0.10,
    "migration_difficulty": 0.05,
}

# Quantum exposure weights by algorithm status
_QUANTUM_EXPOSURE_BY_STATUS: dict[QuantumStatus, float] = {
    QuantumStatus.VULNERABLE:         1.00,
    QuantumStatus.CONDITIONALLY_SAFE: 0.40,
    QuantumStatus.UNKNOWN:            0.60,
    QuantumStatus.HYBRID:             0.20,
    QuantumStatus.SAFE:               0.00,
}

# Data sensitivity levels → score
_SENSITIVITY_SCORES: dict[str, float] = {
    "top_secret":   1.00,
    "secret":       0.85,
    "confidential": 0.65,
    "internal":     0.40,
    "public":       0.10,
    "unknown":      0.50,
}

# Business criticality → score
_CRITICALITY_SCORES: dict[str, float] = {
    "critical":   1.00,
    "high":       0.75,
    "medium":     0.50,
    "low":        0.25,
    "unknown":    0.50,
}


@dataclass
class MoscaResult:
    """Result of the Mosca baseline analysis."""
    x: float                     # data secrecy lifetime (years)
    y: float                     # migration time estimate (years)
    z_mode: float                # mode of Z distribution (scenario, NOT a CRQC date forecast)
    at_risk_baseline: bool       # X + Y > Z_mode
    assumptions: list[str]       # explicit list of all assumptions


@dataclass
class MonteCarloResult:
    """Result of the probabilistic Mosca extension."""
    p_at_risk: float             # P(X + Y > Z)
    samples: int
    seed: int
    z_distribution: str          # distribution name
    z_low: float
    z_mode: float
    z_high: float
    assumptions: list[str]


@dataclass
class RiskAssessment:
    """Full risk assessment for a single crypto asset."""
    asset_id: str
    canonical_algorithm: str
    quantum_status: QuantumStatus
    mosca: Optional[MoscaResult]
    probability: Optional[MonteCarloResult]
    context_score: float         # 0.0–1.0 composite context risk score
    context_breakdown: dict      # per-component context scores
    risk_level: str              # CRITICAL / HIGH / MEDIUM / LOW / UNKNOWN / INSUFFICIENT CONTEXT
    risk_label: str              # "scenario-model result, not a forecast" or "insufficient context"
    blast_radius_count: int      # number of affected nodes (predicted)


def compute_mosca(
    x: float,
    y: float,
    z_mode: float,
) -> MoscaResult:
    """Compute the Mosca baseline condition X + Y > Z.

    Args:
        x: Data secrecy lifetime in years (user-supplied or enterprise default).
        y: Estimated migration time in years (from context model).
        z_mode: Mode of the CRQC arrival scenario distribution. NOT a forecast date.

    Returns:
        MoscaResult with at_risk_baseline boolean.
    """
    at_risk = (x + y) > z_mode
    return MoscaResult(
        x=x,
        y=y,
        z_mode=z_mode,
        at_risk_baseline=at_risk,
        assumptions=[
            f"X (data lifetime) = {x} years — user-supplied or enterprise-default",
            f"Y (migration time) = {y} years — estimated from algorithm complexity and context",
            f"Z mode = {z_mode} years — scenario parameter, not a CRQC arrival forecast",
            "Mosca condition: X + Y > Z",
        ],
    )


def compute_monte_carlo(
    x: float,
    y: float,
    z_low: float,
    z_mode: float,
    z_high: float,
    samples: int = 10_000,
    seed: int = 20260930,
) -> MonteCarloResult:
    """Compute P(X + Y > Z) using seeded Monte Carlo with triangular Z distribution.

    Args:
        x: Data secrecy lifetime (years).
        y: Migration time (years).
        z_low: Lower bound of Z triangular distribution.
        z_mode: Mode of Z triangular distribution.
        z_high: Upper bound of Z triangular distribution.
        samples: Number of Monte Carlo samples.
        seed: RNG seed for reproducibility.

    Returns:
        MonteCarloResult with probability and all parameters visible.
    """
    rng = np.random.default_rng(seed=seed)
    z_samples = rng.triangular(left=z_low, mode=z_mode, right=z_high, size=samples)
    p_at_risk = float(np.mean((x + y) > z_samples))

    return MonteCarloResult(
        p_at_risk=round(p_at_risk, 4),
        samples=samples,
        seed=seed,
        z_distribution="triangular",
        z_low=z_low,
        z_mode=z_mode,
        z_high=z_high,
        assumptions=[
            "Z ~ Triangular distribution — scenario model, not a CRQC arrival forecast",
            f"Z range: [{z_low}, {z_mode}, {z_high}] years (user-configured)",
            f"RNG seed: {seed} (reproducible)",
            f"Monte Carlo samples: {samples}",
            f"P(X + Y > Z) = {p_at_risk:.4f} — interpret as scenario probability, not prediction",
        ],
    )


def compute_context_score(
    quantum_status: QuantumStatus,
    data_sensitivity: str = "unknown",
    business_criticality: str = "unknown",
    internet_exposure: bool = False,
    blast_radius_count: int = 0,
    migration_difficulty: float = 0.5,
    weights: Optional[dict] = None,
) -> tuple[float, dict]:
    """Compute a composite context risk score.

    Args:
        quantum_status: The quantum vulnerability status of the algorithm.
        data_sensitivity: Data sensitivity level string.
        business_criticality: Business criticality level string.
        internet_exposure: Whether the service is internet-facing.
        blast_radius_count: Number of dependent nodes (from graph).
        migration_difficulty: 0.0–1.0 estimate of migration effort.
        weights: Optional override for context weights.

    Returns:
        (context_score, breakdown_dict)
    """
    w = weights or DEFAULT_CONTEXT_WEIGHTS

    qe_score = _QUANTUM_EXPOSURE_BY_STATUS.get(quantum_status, 0.5)
    ds_score = _SENSITIVITY_SCORES.get(data_sensitivity.lower(), 0.5)
    bc_score = _CRITICALITY_SCORES.get(business_criticality.lower(), 0.5)
    ie_score = 1.0 if internet_exposure else 0.2
    # Normalize blast radius: log scale, capped
    br_score = min(1.0, math.log2(1 + blast_radius_count) / 10.0) if blast_radius_count > 0 else 0.0
    md_score = float(migration_difficulty)

    breakdown = {
        "quantum_exposure":     qe_score,
        "data_sensitivity":     ds_score,
        "business_criticality": bc_score,
        "internet_exposure":    ie_score,
        "blast_radius":         br_score,
        "migration_difficulty": md_score,
    }

    composite = (
        w["quantum_exposure"]     * qe_score +
        w["data_sensitivity"]     * ds_score +
        w["business_criticality"] * bc_score +
        w["internet_exposure"]    * ie_score +
        w["blast_radius"]         * br_score +
        w["migration_difficulty"] * md_score
    )
    return round(composite, 4), breakdown


def _risk_level_from_scores(p_at_risk: float, context_score: float) -> str:
    """Determine qualitative risk level from probability and context score."""
    combined = 0.6 * p_at_risk + 0.4 * context_score
    if combined >= 0.75:
        return "CRITICAL"
    if combined >= 0.55:
        return "HIGH"
    if combined >= 0.30:
        return "MEDIUM"
    return "LOW"


def assess_asset_risk(
    asset: FusedAsset,
    blast_radius: BlastRadiusResult,
    x: Optional[float] = None,
    y_estimate: Optional[float] = None,
    z_low: float = 5.0,
    z_mode: float = 12.0,
    z_high: float = 20.0,
    samples: int = 10_000,
    seed: int = 20260930,
    data_sensitivity: str = "unknown",
    business_criticality: str = "unknown",
    internet_exposure: bool = False,
    migration_difficulty: float = 0.5,
    context_weights: Optional[dict] = None,
) -> RiskAssessment:
    """Full risk assessment for a single crypto asset.

    If X (required data secrecy lifetime) or Y (migration time) is omitted,
    the risk assessment reports 'INSUFFICIENT CONTEXT' — no hidden defaults.
    """
    context_score, breakdown = compute_context_score(
        asset.quantum_status,
        data_sensitivity=data_sensitivity,
        business_criticality=business_criticality,
        internet_exposure=internet_exposure,
        blast_radius_count=blast_radius.affected_count if blast_radius is not None else 0,
        migration_difficulty=migration_difficulty,
        weights=context_weights,
    )

    if x is None or y_estimate is None:
        return RiskAssessment(
            asset_id=asset.asset_id,
            canonical_algorithm=asset.canonical_algorithm,
            quantum_status=asset.quantum_status,
            mosca=None,
            probability=None,
            context_score=context_score,
            context_breakdown=breakdown,
            risk_level="INSUFFICIENT CONTEXT",
            risk_label="insufficient context — analyst inputs X (secrecy lifetime) and Y (migration time) must be provided",
            blast_radius_count=blast_radius.affected_count,
        )

    mosca = compute_mosca(x, y_estimate, z_mode)
    mc = compute_monte_carlo(x, y_estimate, z_low, z_mode, z_high, samples, seed)
    risk_level = _risk_level_from_scores(mc.p_at_risk, context_score)

    return RiskAssessment(
        asset_id=asset.asset_id,
        canonical_algorithm=asset.canonical_algorithm,
        quantum_status=asset.quantum_status,
        mosca=mosca,
        probability=mc,
        context_score=context_score,
        context_breakdown=breakdown,
        risk_level=risk_level,
        risk_label="scenario-model result — not a forecast of CRQC arrival",
        blast_radius_count=blast_radius.affected_count,
    )

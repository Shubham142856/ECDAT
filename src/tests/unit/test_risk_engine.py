"""
ECDAT Unit Tests — Risk Engine

Tests the Mosca baseline and Monte Carlo extension.
Seed is fixed (20260930) for reproducibility.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

import pytest
from ecdat.risk import compute_mosca, compute_monte_carlo, compute_context_score
from ecdat.ontology import QuantumStatus


# ---------------------------------------------------------------------------
# Mosca baseline
# ---------------------------------------------------------------------------

class TestMoscaBaseline:
    def test_at_risk_when_x_plus_y_greater_than_z(self):
        result = compute_mosca(x=10.0, y=5.0, z_mode=12.0)
        # X + Y = 15 > Z = 12 → at risk
        assert result.at_risk_baseline is True

    def test_not_at_risk_when_x_plus_y_less_than_z(self):
        result = compute_mosca(x=3.0, y=2.0, z_mode=12.0)
        # X + Y = 5 < Z = 12 → not at risk
        assert result.at_risk_baseline is False

    def test_assumptions_always_present(self):
        result = compute_mosca(x=5.0, y=5.0, z_mode=15.0)
        assert len(result.assumptions) >= 3
        # Must document that Z is a scenario parameter, not a forecast
        assert any("scenario" in a.lower() or "not a crqc" in a.lower() for a in result.assumptions)

    def test_z_is_scenario_mode_not_date(self):
        # The z_mode is a scenario parameter — the label must not say "year"
        result = compute_mosca(x=10.0, y=5.0, z_mode=12.0)
        # Mosca result stores z as a scenario value, not a specific calendar year
        assert result.z_mode == 12.0


# ---------------------------------------------------------------------------
# Monte Carlo extension
# ---------------------------------------------------------------------------

class TestMonteCarlo:
    def test_reproducible_with_seed(self):
        r1 = compute_monte_carlo(10.0, 5.0, z_low=5.0, z_mode=12.0, z_high=20.0, seed=20260930)
        r2 = compute_monte_carlo(10.0, 5.0, z_low=5.0, z_mode=12.0, z_high=20.0, seed=20260930)
        assert r1.p_at_risk == r2.p_at_risk, "Monte Carlo must be reproducible with same seed"

    def test_different_seeds_may_differ(self):
        r1 = compute_monte_carlo(10.0, 5.0, z_low=5.0, z_mode=12.0, z_high=20.0, seed=20260930)
        r2 = compute_monte_carlo(10.0, 5.0, z_low=5.0, z_mode=12.0, z_high=20.0, seed=12345678)
        # With different seeds, results may differ (though not guaranteed for every set of params)
        # Just verify both are valid probabilities
        assert 0.0 <= r1.p_at_risk <= 1.0
        assert 0.0 <= r2.p_at_risk <= 1.0

    def test_probability_range(self):
        r = compute_monte_carlo(10.0, 5.0, z_low=5.0, z_mode=12.0, z_high=20.0, seed=20260930)
        assert 0.0 <= r.p_at_risk <= 1.0

    def test_assumptions_contain_scenario_label(self):
        r = compute_monte_carlo(10.0, 5.0, z_low=5.0, z_mode=12.0, z_high=20.0, seed=20260930)
        all_text = " ".join(r.assumptions).lower()
        assert "scenario" in all_text or "not a forecast" in all_text, \
            "Monte Carlo assumptions must include scenario/forecast label"

    def test_highly_vulnerable_algo_high_probability(self):
        # X+Y very large relative to Z → p_at_risk should be high
        r = compute_monte_carlo(15.0, 10.0, z_low=5.0, z_mode=8.0, z_high=12.0, seed=20260930)
        assert r.p_at_risk > 0.8, f"Expected high p_at_risk, got {r.p_at_risk}"

    def test_safe_algo_low_probability(self):
        # X+Y very small → p_at_risk should be low
        r = compute_monte_carlo(1.0, 1.0, z_low=15.0, z_mode=20.0, z_high=30.0, seed=20260930)
        assert r.p_at_risk < 0.2, f"Expected low p_at_risk, got {r.p_at_risk}"


# ---------------------------------------------------------------------------
# Context score
# ---------------------------------------------------------------------------

class TestContextScore:
    def test_vulnerable_algo_high_score(self):
        score, breakdown = compute_context_score(
            QuantumStatus.VULNERABLE,
            data_sensitivity="top_secret",
            business_criticality="critical",
            internet_exposure=True,
            blast_radius_count=50,
        )
        assert score > 0.7, f"Expected high context score for vulnerable + critical, got {score}"

    def test_safe_algo_low_score(self):
        score, breakdown = compute_context_score(
            QuantumStatus.SAFE,
            data_sensitivity="public",
            business_criticality="low",
            internet_exposure=False,
            blast_radius_count=0,
        )
        assert score < 0.3, f"Expected low context score for safe + public, got {score}"

    def test_score_range(self):
        score, _ = compute_context_score(QuantumStatus.VULNERABLE)
        assert 0.0 <= score <= 1.0

    def test_breakdown_keys_present(self):
        _, breakdown = compute_context_score(QuantumStatus.VULNERABLE)
        required_keys = {"quantum_exposure", "data_sensitivity", "business_criticality",
                         "internet_exposure", "blast_radius", "migration_difficulty"}
        assert required_keys.issubset(set(breakdown.keys()))

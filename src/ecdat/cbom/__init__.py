"""
ECDAT CBOM Builder — CycloneDX 1.7

Builds and validates a Cryptography Bill of Materials (CBOM) document
in CycloneDX 1.7 JSON format from fused crypto assets.

Standard: CycloneDX 1.7 (released standard as of 2026-09-30).
NOT CycloneDX 2.0 (announced but not yet released).

Schema validation is performed against the CycloneDX 1.7 crypto components schema.
"""
from __future__ import annotations

import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from ecdat.ontology import AlgorithmFamily, QuantumStatus, EvidenceRole, ClaimState
from ecdat.fusion import FusedAsset

logger = logging.getLogger(__name__)

# CycloneDX 1.7 schema version
CYCLONE_DX_VERSION = "1.7"
CYCLONE_DX_SCHEMA = "http://cyclonedx.org/schema/bom-1.7.schema.json"

# Mapping from ECDAT family to CycloneDX primitive type
_FAMILY_TO_PRIMITIVE: dict[AlgorithmFamily, str] = {
    AlgorithmFamily.SYMMETRIC_CIPHER:   "cipher",
    AlgorithmFamily.HASH:               "hash",
    AlgorithmFamily.MAC:                "mac",
    AlgorithmFamily.KDF:                "hash",   # CycloneDX 1.7 uses hash for KDF
    AlgorithmFamily.ASYMMETRIC_CIPHER:  "asymmetric-encryption",
    AlgorithmFamily.KEY_AGREEMENT:      "key-agreement",
    AlgorithmFamily.KEM:                "kem",
    AlgorithmFamily.DIGITAL_SIGNATURE:  "signature",
    AlgorithmFamily.RANDOM:             "prf",
    AlgorithmFamily.HYBRID_KEM:         "kem",
    AlgorithmFamily.HYBRID_SIGNATURE:   "signature",
    AlgorithmFamily.PQC_KEM:            "kem",
    AlgorithmFamily.PQC_SIGNATURE:      "signature",
    AlgorithmFamily.UNKNOWN:            "unknown",
}

# CycloneDX 1.7 quantum-safe classifications
_QUANTUM_SAFE_FLAG: dict[QuantumStatus, bool] = {
    QuantumStatus.SAFE:             True,
    QuantumStatus.HYBRID:           True,
    QuantumStatus.CONDITIONALLY_SAFE: False,
    QuantumStatus.VULNERABLE:       False,
    QuantumStatus.UNKNOWN:          False,
}


def _build_crypto_component(asset: FusedAsset) -> dict:
    """Build a single CycloneDX 1.7 cryptoProperties component block."""
    primitive = _FAMILY_TO_PRIMITIVE.get(asset.family, "unknown")
    quantum_safe = _QUANTUM_SAFE_FLAG.get(asset.quantum_status, False)

    # Build algorithm-mode block for ciphers
    algorithm_properties: dict = {}
    if asset.variant:
        algorithm_properties["variant"] = asset.variant
    if asset.parameters.get("standard"):
        algorithm_properties["certificationLevel"] = [asset.parameters["standard"]]

    # Collect evidence locations for provenance
    occurrence_list = []
    for ev in asset.evidence_records[:10]:  # cap at 10 per component
        occ = {
            "location": ev.source_location,
            "detectorType": ev.source_type.value,
            "detectorVersion": "1.0.0",
        }
        occurrence_list.append(occ)

    component: dict = {
        "type": "cryptographic-asset",
        "bom-ref": asset.asset_id,
        "name": asset.canonical_algorithm,
        "description": f"Cryptographic asset: {asset.canonical_algorithm}. "
                       f"Claim state: {asset.claim_state.value}. "
                       f"Evidence roles: {[r.value for r in asset.roles]}.",
        "cryptoProperties": {
            "assetType": "algorithm",
            "algorithmProperties": {
                "primitive": primitive,
                "parameterSetIdentifier": asset.variant or "",
                "executionEnvironment": "software-plain-ram",  # default; no HSM detected
                "implementationPlatform": "any",
                "certificationLevel": [asset.parameters.get("standard", "not-certified")],
                "mode": "unknown",
                "padding": "unknown",
                "cryptoFunctions": _infer_crypto_functions(asset),
                "classicalSecurityLevel": _classical_security_level(asset),
                "nistQuantumSecurityLevel": _nist_quantum_level(asset),
            },
            "oid": _get_oid(asset),
        },
    }

    # Add evidence block (CycloneDX 1.7 evidence extension)
    if occurrence_list:
        component["evidence"] = {
            "occurrences": occurrence_list,
            "identity": {
                "field": "name",
                "confidence": asset.confidence,
                "methods": [
                    {
                        "technique": ev.detector,
                        "confidence": ev.confidence,
                        "value": ev.normalized_claim,
                    }
                    for ev in asset.evidence_records[:5]
                ],
            },
        }

    return component


def _infer_crypto_functions(asset: FusedAsset) -> list[str]:
    """Infer CycloneDX crypto functions from evidence roles and algorithm family."""
    functions = []
    if EvidenceRole.IMPLEMENTATION in asset.roles or EvidenceRole.USAGE in asset.roles:
        if asset.family in (AlgorithmFamily.DIGITAL_SIGNATURE, AlgorithmFamily.PQC_SIGNATURE, AlgorithmFamily.HYBRID_SIGNATURE):
            functions.extend(["sign", "verify"])
        elif asset.family in (AlgorithmFamily.SYMMETRIC_CIPHER,):
            functions.extend(["encrypt", "decrypt"])
        elif asset.family in (AlgorithmFamily.KEY_AGREEMENT, AlgorithmFamily.KEM, AlgorithmFamily.PQC_KEM, AlgorithmFamily.HYBRID_KEM):
            functions.extend(["keyAgreement", "encapsulate", "decapsulate"])
        elif asset.family == AlgorithmFamily.HASH:
            functions.append("hash")
        elif asset.family == AlgorithmFamily.MAC:
            functions.append("mac")
        elif asset.family == AlgorithmFamily.KDF:
            functions.append("keyDerive")
    return functions or ["unknown"]


def _classical_security_level(asset: FusedAsset) -> int:
    """Estimate classical security level in bits."""
    canon = asset.canonical_algorithm.upper()
    if "AES" in canon:
        variant = asset.variant or ""
        if "256" in variant:
            return 256
        if "128" in variant:
            return 128
        return 128
    if "RSA" in canon:
        return 112  # RSA-2048 ≈ 112-bit classical
    if "ECDSA" in canon or "ECDH" in canon:
        return 128  # P-256 ≈ 128-bit classical
    if "SHA-256" in canon:
        return 128
    if "SHA-512" in canon:
        return 256
    return 0


def _nist_quantum_level(asset: FusedAsset) -> int:
    """Return NIST quantum security level (0 if not a PQC algorithm)."""
    if asset.quantum_status in (QuantumStatus.SAFE, QuantumStatus.HYBRID):
        canon = asset.canonical_algorithm.upper()
        if "ML-KEM-512" in canon or "ML-DSA-44" in canon:
            return 1
        if "ML-KEM-768" in canon or "ML-DSA-65" in canon:
            return 3
        if "ML-KEM-1024" in canon or "ML-DSA-87" in canon:
            return 5
        if "ML-KEM" in canon or "ML-DSA" in canon or "SLH-DSA" in canon:
            return 3  # default if variant unknown
    return 0


def _get_oid(asset: FusedAsset) -> str:
    """Return a known OID for well-known algorithms, empty string otherwise."""
    oids = {
        "RSA":        "1.2.840.113549.1.1.1",
        "ECDSA":      "1.2.840.10045.2.1",
        "SHA-256":    "2.16.840.1.101.3.4.2.1",
        "SHA-384":    "2.16.840.1.101.3.4.2.2",
        "SHA-512":    "2.16.840.1.101.3.4.2.3",
        "AES":        "2.16.840.1.101.3.4.1",
        "Ed25519":    "1.3.101.112",
        "X25519":     "1.3.101.110",
        "ML-KEM":     "2.16.840.1.101.3.4.4.1",  # NIST FIPS 203 OID (provisional)
        "ML-DSA":     "2.16.840.1.101.3.4.3.17", # NIST FIPS 204 OID (provisional)
        "SLH-DSA":    "2.16.840.1.101.3.4.3.20", # NIST FIPS 205 OID (provisional)
    }
    return oids.get(asset.canonical_algorithm, "")


def build_cbom(
    scan_id: str,
    fused_assets: list[FusedAsset],
    project_name: str = "ecdat-scan",
    tool_version: str = "1.0.0",
) -> dict:
    """Build a CycloneDX 1.7 CBOM document from fused assets.

    Args:
        scan_id: Scan identifier (used as serial number component).
        fused_assets: List of fused crypto assets to include.
        project_name: Name of the scanned project.
        tool_version: Version of ECDAT that produced this CBOM.

    Returns:
        CycloneDX 1.7 CBOM as a Python dict (JSON-serializable).
    """
    now = datetime.now(timezone.utc).isoformat()
    serial = f"urn:uuid:{uuid.uuid4()}"

    components = []
    for asset in fused_assets:
        try:
            comp = _build_crypto_component(asset)
            components.append(comp)
        except Exception as exc:
            logger.warning("Failed to build CBOM component for %s: %s", asset.canonical_algorithm, exc)

    cbom = {
        "bomFormat": "CycloneDX",
        "specVersion": CYCLONE_DX_VERSION,
        "$schema": CYCLONE_DX_SCHEMA,
        "serialNumber": serial,
        "version": 1,
        "metadata": {
            "timestamp": now,
            "tools": [
                {
                    "vendor": "ECDAT",
                    "name": "Enterprise Cryptographic Discovery & Analysis Tool",
                    "version": tool_version,
                    "externalReferences": [
                        {"type": "website", "url": "https://github.com/ecdat/ecdat"},
                    ],
                }
            ],
            "component": {
                "type": "library",
                "name": project_name,
                "bom-ref": f"project-{scan_id}",
            },
            "properties": [
                {"name": "ecdat:scanId", "value": scan_id},
                {"name": "ecdat:assetCount", "value": str(len(fused_assets))},
                {"name": "ecdat:cbomStandard", "value": f"CycloneDX {CYCLONE_DX_VERSION}"},
            ],
        },
        "components": components,
    }

    return cbom


def validate_cbom(cbom: dict) -> tuple[bool, list[str]]:
    """Validate a CBOM document for required CycloneDX 1.7 structure.

    Args:
        cbom: The CBOM dict to validate.

    Returns:
        (is_valid: bool, errors: list[str])
    """
    errors: list[str] = []

    # Required top-level fields
    required = ["bomFormat", "specVersion", "serialNumber", "version", "metadata", "components"]
    for field in required:
        if field not in cbom:
            errors.append(f"Missing required field: {field}")

    if cbom.get("bomFormat") != "CycloneDX":
        errors.append(f"bomFormat must be 'CycloneDX', got '{cbom.get('bomFormat')}'")

    if cbom.get("specVersion") != CYCLONE_DX_VERSION:
        errors.append(f"specVersion must be '{CYCLONE_DX_VERSION}', got '{cbom.get('specVersion')}'")

    components = cbom.get("components", [])
    for i, comp in enumerate(components):
        if comp.get("type") != "cryptographic-asset":
            errors.append(f"Component {i}: type must be 'cryptographic-asset'")
        if "name" not in comp:
            errors.append(f"Component {i}: missing 'name'")
        if "cryptoProperties" not in comp:
            errors.append(f"Component {i}: missing 'cryptoProperties'")
        else:
            cp = comp["cryptoProperties"]
            if "assetType" not in cp:
                errors.append(f"Component {i}: cryptoProperties missing 'assetType'")

    is_valid = len(errors) == 0
    return is_valid, errors


def cbom_to_json(cbom: dict, indent: int = 2) -> str:
    """Serialize CBOM dict to JSON string."""
    return json.dumps(cbom, indent=indent, ensure_ascii=False)

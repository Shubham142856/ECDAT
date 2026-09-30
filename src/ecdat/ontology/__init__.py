"""
ECDAT Ontology — core enumerations, type definitions, and data models.

These are the canonical vocabulary for all ECDAT components.
No aliases. No magic strings. Import from here everywhere.
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Optional
import uuid
from datetime import datetime


# ---------------------------------------------------------------------------
# Evidence Roles (the five defined in 00-README.md § 5)
# ---------------------------------------------------------------------------

class EvidenceRole(str, Enum):
    """Five evidence roles that must accompany every finding.

    CAPABILITY      — component *can* provide a cryptographic function.
                      A dependency or backend is at most CAPABILITY unless
                      a usage path is proven.
    IMPLEMENTATION  — crypto implementation / API is *present* in code.
    USAGE           — application code *actually invokes or wires* the path.
    CONFIGURATION   — settings *select or constrain* the crypto path.
    OBSERVED        — artifact/protocol/runtime observation *directly shows*
                      presence (e.g., a parsed X.509 certificate property).
    """
    CAPABILITY     = "capability"
    IMPLEMENTATION = "implementation"
    USAGE          = "usage"
    CONFIGURATION  = "configuration"
    OBSERVED       = "observed"


# ---------------------------------------------------------------------------
# Claim States
# ---------------------------------------------------------------------------

class ClaimState(str, Enum):
    """The resolved state of a fused crypto asset claim."""
    SUPPORTED            = "supported"             # corroborating evidence, no contradictions
    AMBIGUOUS            = "ambiguous"             # weak signals / capability-only
    INSUFFICIENT_CONTEXT = "insufficient-context"  # missing business context for risk
    CONTRADICTORY        = "contradictory"         # evidence signals conflict


# ---------------------------------------------------------------------------
# Source Types (what kind of artifact was scanned)
# ---------------------------------------------------------------------------

class SourceType(str, Enum):
    PYTHON_SOURCE  = "python_source"
    JAVA_SOURCE    = "java_source"
    DEPENDENCY     = "dependency"     # manifest / lockfile
    CERTIFICATE    = "certificate"    # X.509 PEM/DER
    BINARY         = "binary"         # ELF / PE / Mach-O
    CONTAINER      = "container"      # container tarball / package manifest
    CONFIG         = "config"         # YAML / JSON / .properties config file
    ENTERPRISE_MAP = "enterprise_map" # enterprise.yaml topology


# ---------------------------------------------------------------------------
# Algorithm Families
# ---------------------------------------------------------------------------

class AlgorithmFamily(str, Enum):
    SYMMETRIC_CIPHER   = "symmetric_cipher"
    HASH               = "hash"
    MAC                = "mac"
    KDF                = "kdf"
    ASYMMETRIC_CIPHER  = "asymmetric_cipher"
    KEY_AGREEMENT      = "key_agreement"
    KEM                = "kem"
    DIGITAL_SIGNATURE  = "digital_signature"
    RANDOM             = "random"
    HYBRID_KEM         = "hybrid_kem"
    HYBRID_SIGNATURE   = "hybrid_signature"
    PQC_KEM            = "pqc_kem"
    PQC_SIGNATURE      = "pqc_signature"
    UNKNOWN            = "unknown"


# ---------------------------------------------------------------------------
# Quantum Status
# ---------------------------------------------------------------------------

class QuantumStatus(str, Enum):
    VULNERABLE        = "vulnerable"      # classical algo, breaks with CRQC
    SAFE              = "safe"            # quantum-safe (PQC standard or symmetric large key)
    HYBRID            = "hybrid"          # classical + PQC hybrid
    CONDITIONALLY_SAFE= "conditionally_safe"  # safe under some threat models
    UNKNOWN           = "unknown"


# ---------------------------------------------------------------------------
# Scan Mode and State
# ---------------------------------------------------------------------------

class ScanMode(str, Enum):
    LIVE   = "live"
    REPLAY = "replay"


class ScanState(str, Enum):
    QUEUED                 = "queued"
    RUNNING                = "running"
    COMPLETED              = "completed"
    COMPLETED_WITH_WARNINGS= "completed_with_warnings"
    FAILED                 = "failed"


# ---------------------------------------------------------------------------
# Scan Stages
# ---------------------------------------------------------------------------

class ScanStage(str, Enum):
    INGEST       = "ingest"
    DISCOVER     = "discover"
    NORMALIZE    = "normalize"
    FUSE         = "fuse"
    GRAPH        = "graph"
    RISK         = "risk"
    MIGRATE      = "migrate"
    VALIDATE     = "validate"
    EXPORT       = "export"


# ---------------------------------------------------------------------------
# Node types for the cryptographic dependency graph
# ---------------------------------------------------------------------------

class NodeType(str, Enum):
    PROJECT     = "project"
    SERVICE     = "service"
    REPOSITORY  = "repository"
    SOURCE_FILE = "source_file"
    LIBRARY     = "library"
    BINARY      = "binary"
    CONTAINER   = "container"
    ALGORITHM   = "algorithm"
    CERTIFICATE = "certificate"
    PROTOCOL    = "protocol"
    DATA_ASSET  = "data_asset"
    KMS         = "kms"
    HSM         = "hsm"


# ---------------------------------------------------------------------------
# Edge types for the cryptographic dependency graph
# ---------------------------------------------------------------------------

class EdgeType(str, Enum):
    USES        = "USES"
    DEPENDS_ON  = "DEPENDS_ON"
    IMPLEMENTS  = "IMPLEMENTS"
    PROVIDES    = "PROVIDES"
    PROTECTS    = "PROTECTS"
    SIGNS       = "SIGNS"
    ENCRYPTS    = "ENCRYPTS"
    NEGOTIATES  = "NEGOTIATES"
    DEPLOYED_ON = "DEPLOYED_ON"
    ISSUED_BY   = "ISSUED_BY"
    STORED_IN   = "STORED_IN"
    CALLS       = "CALLS"


# ---------------------------------------------------------------------------
# PQC Registry Status (per NIST/IETF)
# ---------------------------------------------------------------------------

class PQCStatus(str, Enum):
    FINAL            = "final"           # NIST FIPS (203, 204, 205)
    STANDARDS_TRACK  = "standards-track" # IETF RFC on standards track
    INFORMATIONAL    = "informational"   # IETF Informational RFC
    EXPERIMENTAL     = "experimental"   # experimental / draft


# ---------------------------------------------------------------------------
# Usage roles for migration (crypto function the asset serves)
# ---------------------------------------------------------------------------

class UsageRole(str, Enum):
    KEY_ESTABLISHMENT    = "key_establishment"
    KEY_ENCAPSULATION    = "key_encapsulation"
    DIGITAL_SIGNATURE    = "digital_signature"
    AUTHENTICATION       = "authentication"
    ENCRYPTION           = "encryption"
    DECRYPTION           = "decryption"
    KEY_DERIVATION       = "key_derivation"
    HASHING              = "hashing"
    MAC                  = "mac"
    TLS_KEX              = "tls_kex"
    SSH_KEX              = "ssh_kex"
    CERTIFICATE_SIGNING  = "certificate_signing"
    RANDOM_GENERATION    = "random_generation"
    UNKNOWN              = "unknown"


# ---------------------------------------------------------------------------
# Lifecycle stages
# ---------------------------------------------------------------------------

class Lifecycle(str, Enum):
    ACTIVE      = "active"
    DEPRECATED  = "deprecated"
    LEGACY      = "legacy"
    FIPS_ACTIVE = "fips_active"
    HISTORICAL  = "historical"    # e.g. FIPS 140-2 modules post Sep 22, 2026
    UNKNOWN     = "unknown"


# ---------------------------------------------------------------------------
# Error codes (from 10-ERROR-HANDLING.md)
# ---------------------------------------------------------------------------

class ErrorCode(str, Enum):
    INVALID_ARCHIVE        = "E-1001"
    RESOURCE_LIMIT         = "E-1002"
    PATH_TRAVERSAL         = "E-1003"
    INVALID_ENTERPRISE_MAP = "E-1004"
    UNSUPPORTED_INPUT      = "E-1005"
    SCANNER_EXCEPTION      = "E-2001"
    SCANNER_TIMEOUT        = "E-2002"
    PARSE_FAILURE          = "E-2003"
    REGISTRY_FAILURE       = "E-3001"
    CONFIG_FAILURE         = "E-3002"
    FUSION_UNRESOLVED      = "E-4001"
    GRAPH_INCONSISTENCY    = "E-4002"
    MISSING_RISK_CONTEXT   = "E-4003"
    NO_MIGRATION_CANDIDATE = "E-4004"
    CBOM_VALIDATION_FAIL   = "E-5001"
    SIGNING_FAILURE        = "E-5002"
    REPLAY_SNAPSHOT_MISSING= "E-6001"
    DB_UNAVAILABLE         = "E-9001"
    QUEUE_UNAVAILABLE      = "E-9002"

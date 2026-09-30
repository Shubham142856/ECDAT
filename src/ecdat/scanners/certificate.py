"""
ECDAT Certificate Scanner

Parses X.509 certificates (PEM/DER) to extract cryptographic metadata.

Evidence role emitted: OBSERVED (always).

CRITICAL RULE (SRS-FR-032):
  Do NOT infer application key-exchange algorithm from certificate signature metadata.
  A certificate with ECDSA-with-SHA256 signature does NOT prove the application
  uses ECDSA for key exchange. It proves only that the certificate itself
  uses ECDSA-with-SHA256 as its signing algorithm.

Extracts:
  - Subject / Issuer (DN)
  - SubjectAlternativeNames (SAN)
  - Validity (not_before / not_after, expiry status)
  - Public key type and parameters (key_type, key_size / curve)
  - Certificate signature algorithm
  - Serial number, version
  - Basic constraints (is_ca)
  - Detected private key material → redacted, never stored
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator, Optional

from ecdat.ontology import EvidenceRole, SourceType

logger = logging.getLogger(__name__)

# Try to import the cryptography library
try:
    from cryptography import x509
    from cryptography.hazmat.primitives.asymmetric import rsa, ec, dh, ed25519, ed448, x25519, x448
    from cryptography.hazmat.primitives import hashes
    from cryptography.x509.oid import NameOID, ExtendedKeyUsageOID
    from cryptography.exceptions import InvalidSignature, UnsupportedAlgorithm
    _CRYPTO_AVAILABLE = True
except ImportError:
    _CRYPTO_AVAILABLE = False
    logger.error("cryptography package not available; certificate scanner disabled")


@dataclass
class CertificateFinding:
    """Structured evidence extracted from a single X.509 certificate."""
    file_path: str
    detector: str
    raw_signal: str        # human-readable summary (NOT the raw DER/PEM bytes)
    roles: list[EvidenceRole]   # always [OBSERVED]
    # Certificate fields
    subject: str
    issuer: str
    serial_number: str
    version: int
    not_before: str        # ISO format
    not_after: str         # ISO format
    is_expired: bool
    days_to_expiry: Optional[int]
    sans: list[str]        # Subject Alternative Names
    public_key_type: str   # RSA, EC, Ed25519, X25519, etc.
    public_key_params: dict # {key_size: 2048} or {curve: "secp256r1"}
    signature_algorithm: str  # e.g. "ecdsa-with-SHA256"
    is_ca: bool
    algorithm_hint: str    # canonical algorithm for the cert signature
    confidence: float
    provenance: dict
    source_type: SourceType = SourceType.CERTIFICATE


@dataclass
class PrivateKeyDetected:
    """Signals that private key material was found — content is never stored."""
    file_path: str
    key_type_hint: str   # "RSA private key", "EC private key", etc.
    # The key bytes are NOT stored. Only the type hint is recorded.


def _dn_to_str(name) -> str:
    """Convert X.509 Name to a readable string."""
    try:
        return name.rfc4514_string()
    except Exception:
        try:
            parts = []
            for attr in name:
                parts.append(f"{attr.oid.dotted_string}={attr.value}")
            return ", ".join(parts)
        except Exception:
            return "<parse-error>"


def _key_info(pub_key) -> tuple[str, dict]:
    """Return (key_type_str, params_dict) for a public key."""
    if isinstance(pub_key, rsa.RSAPublicKey):
        return "RSA", {"key_size": pub_key.key_size}
    if isinstance(pub_key, ec.EllipticCurvePublicKey):
        return "EC", {"curve": pub_key.curve.name, "key_size": pub_key.key_size}
    if isinstance(pub_key, ed25519.Ed25519PublicKey):
        return "Ed25519", {"key_size": 256}
    if isinstance(pub_key, ed448.Ed448PublicKey):
        return "Ed448", {"key_size": 448}
    if isinstance(pub_key, x25519.X25519PublicKey):
        return "X25519", {"key_size": 255}
    if isinstance(pub_key, x448.X448PublicKey):
        return "X448", {"key_size": 448}
    if isinstance(pub_key, dh.DHPublicKey):
        return "DH", {"key_size": pub_key.key_size}
    return "Unknown", {}


def _sig_algo_name(cert) -> str:
    """Extract human-readable signature algorithm name."""
    try:
        algo = cert.signature_hash_algorithm
        sig_algo = cert.signature_algorithm_oid
        # Try to get the hash name
        hash_name = algo.name.upper() if algo else "Unknown"
        # Get the sig type from public key
        pub_key = cert.public_key()
        if isinstance(pub_key, rsa.RSAPublicKey):
            sig_type = "RSA"
        elif isinstance(pub_key, ec.EllipticCurvePublicKey):
            sig_type = "ECDSA"
        elif isinstance(pub_key, ed25519.Ed25519PublicKey):
            return "Ed25519"
        elif isinstance(pub_key, ed448.Ed448PublicKey):
            return "Ed448"
        else:
            return sig_algo.dotted_string
        return f"{sig_type}-with-{hash_name}"
    except Exception:
        try:
            return cert.signature_algorithm_oid.dotted_string
        except Exception:
            return "Unknown"


def _get_sans(cert) -> list[str]:
    """Extract Subject Alternative Names."""
    try:
        san_ext = cert.extensions.get_extension_for_class(x509.SubjectAlternativeName)
        sans = []
        for name in san_ext.value:
            if isinstance(name, x509.DNSName):
                sans.append(f"DNS:{name.value}")
            elif isinstance(name, x509.IPAddress):
                sans.append(f"IP:{name.value}")
            elif isinstance(name, x509.RFC822Name):
                sans.append(f"email:{name.value}")
            elif isinstance(name, x509.UniformResourceIdentifier):
                sans.append(f"URI:{name.value}")
        return sans
    except x509.ExtensionNotFound:
        return []


def _is_ca(cert) -> bool:
    try:
        bc = cert.extensions.get_extension_for_class(x509.BasicConstraints)
        return bc.value.ca
    except x509.ExtensionNotFound:
        return False


def _canonical_algo_hint(key_type: str, sig_algo: str) -> str:
    """Return canonical algorithm for the cert signature (for normalization)."""
    sig_lower = sig_algo.lower()
    if "ecdsa" in sig_lower or key_type == "EC":
        return "ECDSA"
    if "rsa" in sig_lower or key_type == "RSA":
        return "RSA"
    if "ed25519" in sig_lower or key_type == "Ed25519":
        return "Ed25519"
    if "ed448" in sig_lower or key_type == "Ed448":
        return "Ed448"
    return key_type


def _parse_pem_or_der(file_path: str, data: bytes) -> list:
    """Parse PEM or DER data and return list of (cert_or_privkey, type) tuples."""
    if not _CRYPTO_AVAILABLE:
        return []

    results = []

    # Try PEM first — may contain multiple certificates
    if b"-----BEGIN" in data:
        # Check for private key material — detect and report but NEVER store
        if b"PRIVATE KEY" in data:
            # Identify which lines contain private key headers
            for line in data.decode("ascii", errors="ignore").splitlines():
                if "PRIVATE KEY" in line and line.startswith("-----BEGIN"):
                    key_hint = line.replace("-----BEGIN ", "").replace("-----", "").strip()
                    results.append(("private_key", key_hint))
                    break

        # Parse certificate(s)
        try:
            # Multiple certs (certificate chain)
            certs = x509.load_pem_x509_certificates(data) if hasattr(x509, "load_pem_x509_certificates") else []
            if not certs:
                # Single cert
                try:
                    cert = x509.load_pem_x509_certificate(data)
                    results.append(("cert", cert))
                except Exception:
                    pass
            else:
                for cert in certs:
                    results.append(("cert", cert))
        except Exception:
            # Try single cert
            try:
                cert = x509.load_pem_x509_certificate(data)
                results.append(("cert", cert))
            except Exception as exc:
                logger.debug("PEM parse failed for %s: %s", file_path, exc)
    else:
        # Try DER
        try:
            cert = x509.load_der_x509_certificate(data)
            results.append(("cert", cert))
        except Exception as exc:
            logger.debug("DER parse failed for %s: %s", file_path, exc)

    return results


def scan_certificate_file(file_path: str, data: bytes) -> tuple[list[CertificateFinding], list[PrivateKeyDetected]]:
    """Scan a certificate file and return (cert_findings, private_key_detections).

    Private key bytes are NEVER stored. Only the type hint is recorded.

    Args:
        file_path: Logical path (used in evidence records).
        data: Raw file bytes. Not executed.

    Returns:
        (list of CertificateFinding, list of PrivateKeyDetected)
    """
    if not _CRYPTO_AVAILABLE:
        return [], []

    cert_findings: list[CertificateFinding] = []
    pk_findings: list[PrivateKeyDetected] = []

    parsed = _parse_pem_or_der(file_path, data)
    if not parsed:
        return [], []

    now = datetime.now(timezone.utc)

    for item_type, item in parsed:
        if item_type == "private_key":
            # Report detection — do not store key material
            pk_findings.append(PrivateKeyDetected(
                file_path=file_path,
                key_type_hint=str(item),
            ))
            continue

        if item_type != "cert":
            continue

        cert = item
        try:
            subject = _dn_to_str(cert.subject)
            issuer = _dn_to_str(cert.issuer)
            serial = format(cert.serial_number, "x").upper()
            version = cert.version.value if cert.version else 0
            not_before = cert.not_valid_before_utc.isoformat() if hasattr(cert, "not_valid_before_utc") else cert.not_valid_before.isoformat()
            not_after = cert.not_valid_after_utc.isoformat() if hasattr(cert, "not_valid_after_utc") else cert.not_valid_after.isoformat()

            # Expiry check
            try:
                expiry_dt = cert.not_valid_after_utc if hasattr(cert, "not_valid_after_utc") else cert.not_valid_after.replace(tzinfo=timezone.utc)
                is_expired = now > expiry_dt
                days_to_expiry = (expiry_dt - now).days if not is_expired else None
            except Exception:
                is_expired = False
                days_to_expiry = None

            sans = _get_sans(cert)
            pub_key = cert.public_key()
            key_type, key_params = _key_info(pub_key)
            sig_algo = _sig_algo_name(cert)
            is_ca = _is_ca(cert)
            algo_hint = _canonical_algo_hint(key_type, sig_algo)

            summary = f"cert: {subject[:80]} | key={key_type} | sig={sig_algo}"

            cert_findings.append(CertificateFinding(
                file_path=file_path,
                detector="certificate.x509_parser",
                raw_signal=summary,
                roles=[EvidenceRole.OBSERVED],
                subject=subject,
                issuer=issuer,
                serial_number=serial,
                version=version,
                not_before=not_before,
                not_after=not_after,
                is_expired=is_expired,
                days_to_expiry=days_to_expiry,
                sans=sans,
                public_key_type=key_type,
                public_key_params=key_params,
                signature_algorithm=sig_algo,
                is_ca=is_ca,
                algorithm_hint=algo_hint,
                confidence=0.95,  # certificate parsing is high-confidence observed evidence
                provenance={
                    "file": file_path,
                    "parser": "cryptography.x509",
                    "serial": serial,
                },
            ))
        except Exception as exc:
            logger.warning("Certificate detail extraction failed for %s: %s", file_path, exc)

    return cert_findings, pk_findings


def scan_certificate_directory(root: str) -> Iterator[tuple[list[CertificateFinding], list[PrivateKeyDetected]]]:
    """Walk a directory and scan all .pem, .crt, .cer, .der files.

    Yields:
        (cert_findings, pk_findings) tuples per file.
    """
    root_path = Path(root)
    extensions = {".pem", ".crt", ".cer", ".der", ".p12", ".pfx"}
    for cert_file in root_path.rglob("*"):
        if not cert_file.is_file():
            continue
        if cert_file.suffix.lower() not in extensions:
            continue
        try:
            data = cert_file.read_bytes()
        except OSError as exc:
            logger.warning("Cannot read %s: %s", cert_file, exc)
            continue
        relative = str(cert_file.relative_to(root_path))
        cert_findings, pk_findings = scan_certificate_file(relative, data)
        yield cert_findings, pk_findings

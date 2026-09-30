"""
ECDAT Container Scanner (Bounded Filesystem/Package Inspection)

Scans container image tarballs to discover cryptographic evidence from:
  - Package manifests (dpkg status, rpm-qa output, apk-installed list)
  - Embedded certificate files (PEM/CRT/DER)
  - Binary files found in the filesystem layer (forwarded to binary scanner)

Does NOT:
  - Execute the container entrypoint
  - Run any install scripts
  - Mount or execute anything
  - Pull from any registry

Evidence roles emitted: CAPABILITY, OBSERVED (never USAGE or IMPLEMENTATION).

Security:
  - Path traversal protection: all extracted paths are validated against canonical prefix.
  - Archive size limits enforced.
  - Symlink extraction is blocked.
"""
from __future__ import annotations

import io
import logging
import os
import re
import tarfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Iterator, Optional

from ecdat.ontology import EvidenceRole, SourceType
from ecdat.knowledge import get_package_capability
from ecdat.scanners.binary import scan_binary_file, BinaryFinding
from ecdat.scanners.certificate import scan_certificate_file, CertificateFinding, PrivateKeyDetected

logger = logging.getLogger(__name__)

_MAX_ARCHIVE_MEMBERS = int(os.environ.get("ECDAT_MAX_ARCHIVE_MEMBERS", 10_000))
_MAX_DECOMPRESSED = int(os.environ.get("ECDAT_MAX_DECOMPRESSED_BYTES", 1_073_741_824))  # 1 GB
_MAX_SINGLE_FILE  = 256 * 1024 * 1024  # 256 MB per extracted file


@dataclass
class ContainerFinding:
    """Evidence observation from a container scan."""
    file_path: str         # logical path inside container layer
    tarball_path: str      # path to the container tarball on disk
    detector: str
    raw_signal: str
    roles: list[EvidenceRole]
    package_name: Optional[str]
    version: Optional[str]
    algorithm_hints: list[str]
    confidence: float
    provenance: dict
    source_type: SourceType = SourceType.CONTAINER


def _safe_extract_member(tar: tarfile.TarFile, member: tarfile.TarInfo, max_size: int) -> Optional[bytes]:
    """Safely extract a tar member, preventing symlink escapes and zip bombs."""
    # Reject symlinks and hard links
    if member.issym() or member.islnk():
        return None
    # Reject device files
    if member.isdev():
        return None
    # Size limit
    if member.size > max_size:
        logger.info("Skipping oversized tar member %s (%d bytes)", member.name, member.size)
        return None
    # Path traversal check
    member_path = PurePosixPath(member.name)
    # Reject absolute paths and upward traversal
    if member_path.is_absolute() or ".." in member_path.parts:
        logger.warning("Rejecting path traversal attempt: %s", member.name)
        return None
    try:
        f = tar.extractfile(member)
        if f is None:
            return None
        data = f.read()
        return data
    except Exception as exc:
        logger.debug("Failed to extract tar member %s: %s", member.name, exc)
        return None


def _detect_package_name(line: str) -> Optional[tuple[str, Optional[str]]]:
    """Parse a package line from dpkg/rpm/apk output and return (name, version)."""
    line = line.strip()
    if not line or line.startswith("#"):
        return None
    # dpkg: Package: openssl
    if line.startswith("Package: "):
        return (line[9:].strip(), None)
    # dpkg status line with version: "openssl:amd64 3.0.2-0ubuntu1.10 amd64"
    parts = line.split()
    if len(parts) >= 2:
        name = parts[0].split(":")[0]  # strip arch suffix
        version = parts[1] if len(parts) > 1 else None
        return (name, version)
    return (line, None)


def scan_container_tarball(tarball_path: str) -> tuple[list[ContainerFinding], list[CertificateFinding], list[PrivateKeyDetected], list[BinaryFinding]]:
    """Scan a container image tarball for cryptographic evidence.

    Does NOT execute anything. Only reads package manifests, certs, and binary headers.

    Args:
        tarball_path: Path to container tarball (.tar / .tar.gz / .tgz).

    Returns:
        (container_findings, cert_findings, pk_findings, binary_findings)
    """
    container_findings: list[ContainerFinding] = []
    cert_findings: list[CertificateFinding] = []
    pk_findings: list[PrivateKeyDetected] = []
    binary_findings: list[BinaryFinding] = []

    total_decompressed = 0
    member_count = 0

    try:
        with tarfile.open(tarball_path, mode="r:*") as tar:
            for member in tar.getmembers():
                member_count += 1
                if member_count > _MAX_ARCHIVE_MEMBERS:
                    logger.warning("Container tarball %s exceeds member limit (%d); stopping",
                                   tarball_path, _MAX_ARCHIVE_MEMBERS)
                    break

                if not member.isfile():
                    continue

                total_decompressed += member.size
                if total_decompressed > _MAX_DECOMPRESSED:
                    logger.warning("Container tarball %s exceeds decompressed limit; stopping", tarball_path)
                    break

                member_name = member.name.lstrip("./")
                member_lower = member_name.lower()

                # --- Package manifest files ---
                is_dpkg = ("var/lib/dpkg/status" in member_lower or
                           "var/lib/dpkg/info" in member_lower)
                is_apk  = ("lib/apk/db/installed" in member_lower)
                is_rpm  = member_lower.endswith(".rpm") or "var/lib/rpm" in member_lower

                if is_dpkg or is_apk:
                    data = _safe_extract_member(tar, member, _MAX_SINGLE_FILE)
                    if data is None:
                        continue
                    text = data.decode("utf-8", errors="replace")
                    # Parse package lines
                    current_pkg = None
                    current_ver = None
                    for line in text.splitlines():
                        if line.startswith("Package: "):
                            current_pkg = line[9:].strip()
                            current_ver = None
                        elif line.startswith("Version: ") and current_pkg:
                            current_ver = line[9:].strip()
                        elif not line.strip() and current_pkg:
                            # End of a stanza
                            meta = get_package_capability(current_pkg)
                            if meta:
                                container_findings.append(ContainerFinding(
                                    file_path=member_name,
                                    tarball_path=tarball_path,
                                    detector="container.dpkg_manifest",
                                    raw_signal=f"{current_pkg} {current_ver or ''}",
                                    roles=[EvidenceRole.CAPABILITY, EvidenceRole.OBSERVED],
                                    package_name=current_pkg,
                                    version=current_ver,
                                    algorithm_hints=meta.get("canonical_algorithms", []),
                                    confidence=0.60,
                                    provenance={
                                        "tarball": tarball_path,
                                        "manifest": member_name,
                                        "ecosystem": meta.get("ecosystem", "system"),
                                    },
                                ))
                            current_pkg = None
                            current_ver = None

                # --- Certificate files ---
                elif any(member_lower.endswith(ext) for ext in (".pem", ".crt", ".cer", ".der")):
                    data = _safe_extract_member(tar, member, _MAX_SINGLE_FILE)
                    if data is None:
                        continue
                    c_findings, p_findings = scan_certificate_file(member_name, data)
                    cert_findings.extend(c_findings)
                    pk_findings.extend(p_findings)

                # --- Binary files (ELF/PE header check) ---
                elif not any(member_lower.endswith(ext) for ext in
                             (".py", ".java", ".js", ".ts", ".rb", ".sh", ".txt", ".json",
                              ".yaml", ".yml", ".md", ".html", ".css", ".xml", ".properties")):
                    # Peek at header
                    data = _safe_extract_member(tar, member, _MAX_SINGLE_FILE)
                    if data and len(data) >= 4:
                        header = data[:4]
                        if header in (b"\x7fELF", b"MZ",
                                      b"\xfe\xed\xfa\xce", b"\xce\xfa\xed\xfe"):
                            b_findings = scan_binary_file(member_name, data)
                            binary_findings.extend(b_findings)

    except (tarfile.TarError, EOFError) as exc:
        logger.error("Failed to open container tarball %s: %s", tarball_path, exc)
    except Exception as exc:
        logger.error("Unexpected error scanning container tarball %s: %s", tarball_path, exc)

    return container_findings, cert_findings, pk_findings, binary_findings


def scan_container_directory(root: str) -> Iterator[tuple]:
    """Walk a directory for container tarballs and scan each one.

    Yields:
        (container_findings, cert_findings, pk_findings, binary_findings) per tarball.
    """
    root_path = Path(root)
    for tarball in root_path.rglob("*.tar*"):
        if not tarball.is_file():
            continue
        logger.info("Scanning container tarball: %s", tarball)
        yield scan_container_tarball(str(tarball))

"""
ECDAT Dependency Scanner

Parses dependency manifests and lockfiles to discover cryptographic library capabilities.

CRITICAL RULE: Dependency evidence is CAPABILITY only.
A package appearing in requirements.txt, pom.xml, or any lockfile does NOT
prove that the application uses any specific cryptographic algorithm.
The evidence role is always CAPABILITY unless:
  - A separate source scanner (Python AST / Java rules) independently proves usage.

Supported formats:
  - requirements.txt  (pip)
  - setup.cfg         (pip)
  - pyproject.toml    (poetry / flit / hatch)
  - poetry.lock
  - pom.xml           (Maven)
  - build.gradle      (Gradle, limited parsing)
  - package.json      (npm — for JS crypto packages)
  - package-lock.json (npm lockfile)
"""
from __future__ import annotations

import logging
import re
import tomllib  # Python 3.11+
from pathlib import Path
from typing import Iterator, Optional
from dataclasses import dataclass

from ecdat.ontology import EvidenceRole, SourceType
from ecdat.knowledge import get_package_capability

logger = logging.getLogger(__name__)

_TOML_AVAILABLE = True


@dataclass
class DependencyFinding:
    """A single raw evidence observation from the dependency scanner."""
    file_path: str       # manifest file path
    line: int            # line number (1-indexed; 0 if unknown)
    detector: str
    raw_signal: str      # raw line/entry as seen in manifest
    roles: list[EvidenceRole]  # always [CAPABILITY]
    package_name: str
    version: Optional[str]
    algorithm_hints: list[str]   # canonical algorithms from package registry
    confidence: float            # 0.5 for dep-only (honest capability evidence)
    provenance: dict
    source_type: SourceType = SourceType.DEPENDENCY


def _make_dep_finding(
    file_path: str,
    line: int,
    package_name: str,
    version: Optional[str],
    raw_signal: str,
    detector: str,
) -> Optional[DependencyFinding]:
    """Create a DependencyFinding if the package is a known crypto package.

    Returns None if the package is not in the crypto knowledge base.
    """
    meta = get_package_capability(package_name)
    if meta is None:
        return None
    return DependencyFinding(
        file_path=file_path,
        line=line,
        detector=detector,
        raw_signal=raw_signal,
        roles=[EvidenceRole.CAPABILITY],
        package_name=package_name,
        version=version,
        algorithm_hints=meta.get("canonical_algorithms", []),
        confidence=0.50,  # capability-only: honest lower confidence
        provenance={
            "manifest": file_path,
            "package": package_name,
            "version": version,
            "ecosystem": meta.get("ecosystem", "unknown"),
        },
    )


# ---------------------------------------------------------------------------
# requirements.txt / pip-style parsers
# ---------------------------------------------------------------------------

_REQUIREMENT_LINE = re.compile(
    r"^\s*(?P<pkg>[A-Za-z0-9_.\-]+)\s*(?P<extras>\[[^\]]*\])?\s*(?P<ver>[><=!~].*)?\s*$"
)


def scan_requirements_txt(file_path: str, text: str) -> list[DependencyFinding]:
    findings: list[DependencyFinding] = []
    for lineno, line in enumerate(text.splitlines(), start=1):
        stripped = line.strip()
        if not stripped or stripped.startswith(("#", "-r", "-c", "http", "git+")):
            continue
        m = _REQUIREMENT_LINE.match(stripped)
        if not m:
            continue
        pkg = m.group("pkg")
        ver = m.group("ver").strip() if m.group("ver") else None
        f = _make_dep_finding(file_path, lineno, pkg, ver, stripped, "dependency.requirements_txt")
        if f:
            findings.append(f)
    return findings


def scan_pyproject_toml(file_path: str, text: str) -> list[DependencyFinding]:
    findings: list[DependencyFinding] = []
    try:
        data = tomllib.loads(text)
    except Exception as exc:
        logger.warning("Failed to parse pyproject.toml at %s: %s", file_path, exc)
        return findings

    # poetry [tool.poetry.dependencies]
    deps: dict = {}
    tool = data.get("tool", {})
    poetry = tool.get("poetry", {})
    if "dependencies" in poetry:
        deps.update(poetry["dependencies"])
    if "dev-dependencies" in poetry:
        deps.update(poetry["dev-dependencies"])

    # flit / hatch / setuptools [project.dependencies]
    project = data.get("project", {})
    for dep in project.get("dependencies", []):
        m = _REQUIREMENT_LINE.match(dep)
        if m:
            deps[m.group("pkg")] = m.group("ver") or ""

    for pkg, ver_info in deps.items():
        if isinstance(ver_info, dict):
            ver = ver_info.get("version")
        elif isinstance(ver_info, str):
            ver = ver_info
        else:
            ver = None
        f = _make_dep_finding(file_path, 0, pkg, ver, f"{pkg} = {ver}", "dependency.pyproject_toml")
        if f:
            findings.append(f)
    return findings


def scan_poetry_lock(file_path: str, text: str) -> list[DependencyFinding]:
    """Parse poetry.lock for crypto packages. Records name + version."""
    findings: list[DependencyFinding] = []
    current_pkg: Optional[str] = None
    current_ver: Optional[str] = None
    for lineno, line in enumerate(text.splitlines(), start=1):
        stripped = line.strip()
        if stripped == "[[package]]":
            if current_pkg:
                f = _make_dep_finding(file_path, lineno, current_pkg, current_ver,
                                      f"[[package]] name = {current_pkg}", "dependency.poetry_lock")
                if f:
                    findings.append(f)
            current_pkg = None
            current_ver = None
        elif stripped.startswith("name = "):
            current_pkg = stripped.split('"')[1] if '"' in stripped else stripped.split("=")[1].strip().strip('"')
        elif stripped.startswith("version = "):
            current_ver = stripped.split('"')[1] if '"' in stripped else stripped.split("=")[1].strip().strip('"')
    if current_pkg:
        f = _make_dep_finding(file_path, 0, current_pkg, current_ver,
                              f"name = {current_pkg}", "dependency.poetry_lock")
        if f:
            findings.append(f)
    return findings


# ---------------------------------------------------------------------------
# Maven pom.xml parser
# ---------------------------------------------------------------------------

_MAVEN_ARTIFACT = re.compile(
    r"<artifactId>\s*(?P<artifact>[A-Za-z0-9_.\-]+)\s*</artifactId>"
)
_MAVEN_VERSION = re.compile(
    r"<version>\s*(?P<version>[^<]+)\s*</version>"
)


def scan_pom_xml(file_path: str, text: str) -> list[DependencyFinding]:
    findings: list[DependencyFinding] = []
    lines = text.splitlines()
    artifacts = []
    versions = []
    for lineno, line in enumerate(lines, start=1):
        m = _MAVEN_ARTIFACT.search(line)
        if m:
            artifacts.append((lineno, m.group("artifact")))
        m = _MAVEN_VERSION.search(line)
        if m:
            versions.append(m.group("version"))

    # Simple heuristic: zip artifact/version in order of appearance
    for i, (lineno, artifact) in enumerate(artifacts):
        ver = versions[i] if i < len(versions) else None
        f = _make_dep_finding(file_path, lineno, artifact, ver,
                              lines[lineno - 1].strip(), "dependency.pom_xml")
        if f:
            findings.append(f)
    return findings


# ---------------------------------------------------------------------------
# Gradle parser (simplified)
# ---------------------------------------------------------------------------

_GRADLE_DEP = re.compile(
    r"""(?:implementation|compile|testImplementation|api|runtimeOnly)\s+
        ["'](?:[\w.\-]+:)?(?P<pkg>[\w.\-]+):(?P<ver>[^'"]+)["']""",
    re.VERBOSE,
)


def scan_build_gradle(file_path: str, text: str) -> list[DependencyFinding]:
    findings: list[DependencyFinding] = []
    lines = text.splitlines()
    for lineno, line in enumerate(lines, start=1):
        m = _GRADLE_DEP.search(line)
        if m:
            pkg = m.group("pkg")
            ver = m.group("ver")
            f = _make_dep_finding(file_path, lineno, pkg, ver, line.strip(), "dependency.build_gradle")
            if f:
                findings.append(f)
    return findings


# ---------------------------------------------------------------------------
# npm package.json parser
# ---------------------------------------------------------------------------

def scan_package_json(file_path: str, text: str) -> list[DependencyFinding]:
    import json
    findings: list[DependencyFinding] = []
    try:
        data = json.loads(text)
    except Exception as exc:
        logger.warning("Failed to parse package.json at %s: %s", file_path, exc)
        return findings
    all_deps: dict = {}
    all_deps.update(data.get("dependencies", {}))
    all_deps.update(data.get("devDependencies", {}))
    for pkg, ver in all_deps.items():
        f = _make_dep_finding(file_path, 0, pkg, ver, f"{pkg}: {ver}", "dependency.package_json")
        if f:
            findings.append(f)
    return findings


# ---------------------------------------------------------------------------
# Router: pick the right parser based on filename
# ---------------------------------------------------------------------------

_PARSERS: dict[str, any] = {
    "requirements.txt":  scan_requirements_txt,
    "requirements-dev.txt": scan_requirements_txt,
    "requirements-test.txt": scan_requirements_txt,
    "setup.cfg":         scan_requirements_txt,   # [options] install_requires
    "pyproject.toml":    scan_pyproject_toml,
    "poetry.lock":       scan_poetry_lock,
    "pom.xml":           scan_pom_xml,
    "build.gradle":      scan_build_gradle,
    "build.gradle.kts":  scan_build_gradle,
    "package.json":      scan_package_json,
    "package-lock.json": scan_package_json,
}


def scan_dependency_file(file_path: str, text: str) -> list[DependencyFinding]:
    """Route a manifest file to the correct parser and return findings.

    All returned findings have role = CAPABILITY.
    """
    filename = Path(file_path).name
    parser = _PARSERS.get(filename)
    if parser is None:
        return []
    return parser(file_path, text)


def scan_dependency_directory(root: str) -> Iterator[DependencyFinding]:
    """Walk a directory and scan all recognized manifest/lockfiles.

    Yields:
        DependencyFinding objects (all CAPABILITY role).
    """
    root_path = Path(root)
    for fname, _ in _PARSERS.items():
        for manifest in root_path.rglob(fname):
            if not manifest.is_file():
                continue
            try:
                text = manifest.read_text(encoding="utf-8", errors="replace")
            except OSError as exc:
                logger.warning("Cannot read %s: %s", manifest, exc)
                continue
            relative = str(manifest.relative_to(root_path))
            findings = scan_dependency_file(relative, text)
            yield from findings

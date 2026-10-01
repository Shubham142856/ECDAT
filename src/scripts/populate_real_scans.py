"""
ECDAT Real Corpus Scanner & Database Populator.

Runs the complete 7-stage pipeline on all real repositories:
  1. Python AST & Java Rules Scanners
  2. Dependency Manifest Scanner
  3. Evidence Fusion Engine
  4. Cryptographic Dependency Graph Builder
  5. Quantum Risk Assessment Engine (Mosca X+Y>Z, Monte Carlo, 3 scenarios)
  6. Role-Correct PQC Migration Engine (KEM for KEX, DSA for signatures, Wave plan)
  7. CycloneDX 1.6 Cryptographic Bill of Materials (CBOM) Generation & Validation

Saves all results into PostgreSQL so the API and Dashboard are immediately live
with authentic real-world cryptographic evidence.
"""
from __future__ import annotations

import datetime
import hashlib
import json
import logging
import os
import sys
import uuid
from pathlib import Path

# Setup paths
SRC_DIR = Path(r"d:\ecdat\src")
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ecdat.populate")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from services.api.models import (
    Base, Project, Artifact, Scan, Evidence, CryptoAsset,
    GraphNode, GraphEdge, RiskResult, MigrationPlan, ReplaySnapshot,
)

from ecdat.scanners.python_ast import scan_python_file
from ecdat.scanners.java_rules import scan_java_file
from ecdat.scanners.dependency import scan_dependency_file
from ecdat.scanners.certificate import scan_certificate_file
from ecdat.scanners.container import scan_dockerfile
from ecdat.scanners.config_scan import scan_config_file
from ecdat.fusion import fuse_evidence
from ecdat.graph import build_graph_from_assets
from ecdat.risk import assess_asset_risk, compute_monte_carlo
from ecdat.migration import load_registry, generate_candidates, build_wave_plan
from ecdat.cbom import build_cbom, validate_cbom
from ecdat.ontology import ScanState

SYNC_DB_URL = os.environ.get("SYNC_DATABASE_URL", "sqlite:///D:/ecdat/ecdat.db")
if SYNC_DB_URL.startswith("postgresql://"):
    SYNC_DB_URL = SYNC_DB_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
RISK_SEED = int(os.environ.get("ECDAT_RISK_SEED", 20260930))

CORPUS_TARGETS = [
    {
        "name": "PyJWT",
        "description": "JSON Web Token library in Python (RFC 7519)",
        "commit": "b5bd6fe",
        "path": Path(r"d:\ecdat\real-corpus\PyJWT"),
        "primary_lang": "python",
    },
    {
        "name": "paramiko",
        "description": "Pure-Python implementation of the SSHv2 protocol",
        "commit": "142f593",
        "path": Path(r"d:\ecdat\real-corpus\paramiko"),
        "primary_lang": "python",
    },
    {
        "name": "certbot",
        "description": "EFF Automated ACME client / TLS certificate manager",
        "commit": "4856493",
        "path": Path(r"d:\ecdat\real-corpus\certbot"),
        "primary_lang": "python",
    },
    {
        "name": "jjwt",
        "description": "Java JWT (JJWT) JSON Web Token library for Java and Android",
        "commit": "fb71496",
        "path": Path(r"d:\ecdat\real-corpus\jjwt"),
        "primary_lang": "java",
    },
]

SKIP_DIRS = {
    "__pycache__", ".git", "build", "dist", ".eggs", ".tox",
    "_ecdat_scan_output", "node_modules", ".pytest_cache", ".idea",
}


def scan_target(target: dict, db) -> dict:
    repo_name = target["name"]
    repo_path = target["path"]
    commit = target["commit"]
    logger.info("=" * 60)
    logger.info(f"Scanning target: {repo_name} @ {commit}")
    logger.info(f"Path: {repo_path}")
    logger.info("=" * 60)

    if not repo_path.exists():
        logger.warning(f"Target path does not exist: {repo_path}")
        return {}

    output_dir = repo_path / "_ecdat_scan_output"
    output_dir.mkdir(exist_ok=True)
    scan_time = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # 1. Project in DB
    existing_project = db.query(Project).filter_by(name=repo_name).first()
    if existing_project:
        project = existing_project
        logger.info(f"Using existing project record {project.project_id}")
    else:
        project = Project(
            project_id=str(uuid.uuid4()),
            name=repo_name,
            description=f"{target['description']} (pinned commit {commit})",
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        logger.info(f"Created project record {project.project_id}")

    # 2. Source & Manifest Discovery
    raw_findings = []
    scanned_files = 0
    scanned_errors = 0

    # Python files
    if target["primary_lang"] == "python" or any(repo_path.rglob("*.py")):
        for py_file in repo_path.rglob("*.py"):
            rel = py_file.relative_to(repo_path)
            if any(p in SKIP_DIRS for p in rel.parts):
                continue
            try:
                content = py_file.read_text(encoding="utf-8", errors="replace")
                findings = scan_python_file(str(rel), content)
                scanned_files += 1
                raw_findings.extend(findings)
            except Exception as e:
                scanned_errors += 1
                logger.debug(f"Error scanning {rel}: {e}")

    # Java files
    if target["primary_lang"] == "java" or any(repo_path.rglob("*.java")):
        for j_file in repo_path.rglob("*.java"):
            rel = j_file.relative_to(repo_path)
            if any(p in SKIP_DIRS for p in rel.parts):
                continue
            try:
                content = j_file.read_text(encoding="utf-8", errors="replace")
                findings = scan_java_file(str(rel), content)
                scanned_files += 1
                raw_findings.extend(findings)
            except Exception as e:
                scanned_errors += 1
                logger.debug(f"Error scanning {rel}: {e}")

    # Dependency manifests
    dep_patterns = [
        "requirements*.txt", "setup.cfg", "pyproject.toml", "setup.py",
        "poetry.lock", "pom.xml", "package.json",
    ]
    for pat in dep_patterns:
        for dep_file in repo_path.rglob(pat):
            rel = dep_file.relative_to(repo_path)
            if any(p in SKIP_DIRS for p in rel.parts):
                continue
            try:
                content = dep_file.read_text(encoding="utf-8", errors="replace")
                findings = scan_dependency_file(str(rel), content)
                scanned_files += 1
                raw_findings.extend(findings)
            except Exception as e:
                logger.debug(f"Error scanning dep {rel}: {e}")

    # Container / Dockerfile definitions
    dockerfile_patterns = ["Dockerfile*", "Containerfile*", "*.dockerfile"]
    for pat in dockerfile_patterns:
        for d_file in repo_path.rglob(pat):
            rel = d_file.relative_to(repo_path)
            if any(p in SKIP_DIRS for p in rel.parts):
                continue
            try:
                content = d_file.read_text(encoding="utf-8", errors="replace")
                findings = scan_dockerfile(str(rel), content)
                scanned_files += 1
                raw_findings.extend(findings)
            except Exception as e:
                logger.debug(f"Error scanning Dockerfile {rel}: {e}")

    # X.509 Certificates
    cert_patterns = ["*.pem", "*.crt", "*.cer", "*.der"]
    for pat in cert_patterns:
        for c_file in repo_path.rglob(pat):
            rel = c_file.relative_to(repo_path)
            if any(p in SKIP_DIRS for p in rel.parts):
                continue
            try:
                data = c_file.read_bytes()
                cert_f, pk_f = scan_certificate_file(str(rel), data)
                scanned_files += 1
                raw_findings.extend(cert_f)
            except Exception as e:
                logger.debug(f"Error scanning cert {rel}: {e}")

    # Filter out findings with empty/None algorithm hints (Noise reduction & provenance integrity)
    valid_findings = []
    for f in raw_findings:
        algo = getattr(f, "algorithm_hint", "")
        if not algo and hasattr(f, "algorithm_hints") and f.algorithm_hints:
            algo = f.algorithm_hints[0]
        if algo and str(algo).strip() and str(algo).strip().upper() != "UNKNOWN":
            valid_findings.append(f)

    logger.info(f"Discovery: {scanned_files} files scanned, {len(raw_findings)} raw findings -> {len(valid_findings)} valid crypto claims")

    # 3. Create Scan in DB (deterministic UUID for PostgreSQL UUID column)
    scan_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"ecdat-{repo_name.lower()}-{commit}"))
    # Delete old scan if re-running
    try:
        old_scan = db.query(Scan).filter_by(scan_id=scan_id).first()
        if old_scan:
            logger.info(f"Removing previous scan {scan_id} to ensure clean re-scan")
            db.delete(old_scan)
            db.commit()
    except Exception:
        db.rollback()

    scan = Scan(
        scan_id=scan_id,
        project_id=project.project_id,
        mode="live",
        state=ScanState.RUNNING.value,
        stages={
            "ingest": {"state": "done"},
            "discover": {"state": "done", "files_scanned": scanned_files},
            "normalize": {"state": "running"},
            "fuse": {"state": "running"},
            "graph": {"state": "pending"},
            "risk": {"state": "pending"},
            "migrate": {"state": "pending"},
            "validate": {"state": "pending"},
            "export": {"state": "pending"},
        },
        started_at=datetime.datetime.now(datetime.timezone.utc),
    )
    db.add(scan)
    db.commit()

    # 4. Evidence Fusion
    fused_assets = fuse_evidence(scan_id, valid_findings, observation_time=scan_time)
    logger.info(f"Fusion: {len(valid_findings)} raw findings -> {len(fused_assets)} fused unique assets")

    # Persist assets and evidence
    for fa in fused_assets:
        asset_row = CryptoAsset(
            asset_id=fa.asset_id,
            scan_id=scan_id,
            family=fa.family.value if hasattr(fa.family, "value") else str(fa.family),
            canonical_algorithm=fa.canonical_algorithm,
            variant=fa.variant,
            parameters=fa.parameters,
            usage_role=fa.usage_role.value if hasattr(fa.usage_role, "value") else str(fa.usage_role),
            lifecycle=fa.lifecycle.value if hasattr(fa.lifecycle, "value") else str(fa.lifecycle),
            quantum_status=fa.quantum_status.value if hasattr(fa.quantum_status, "value") else str(fa.quantum_status),
            claim_state=fa.claim_state.value if hasattr(fa.claim_state, "value") else str(fa.claim_state),
            confidence=fa.confidence,
            roles=[r.value if hasattr(r, "value") else str(r) for r in fa.roles],
            contradictions=fa.contradictions,
            context={"repository": repo_name, "commit": commit},
        )
        db.add(asset_row)

        for ev in fa.evidence_records:
            ev_row = Evidence(
                evidence_id=ev.evidence_id,
                scan_id=scan_id,
                asset_id=fa.asset_id,
                source_type=ev.source_type.value if hasattr(ev.source_type, "value") else str(ev.source_type),
                source_location=ev.source_location,
                detector=ev.detector,
                raw_signal=ev.raw_signal,
                normalized_claim=ev.normalized_claim,
                roles=[r.value if hasattr(r, "value") else str(r) for r in ev.roles],
                confidence=ev.confidence,
                provenance=ev.provenance,
            )
            db.add(ev_row)

    db.commit()

    # 5. Dependency Graph
    graph = build_graph_from_assets(scan_id, fused_assets)
    node_ids = set()
    for node in graph._nodes.values():
        db.add(GraphNode(
            node_id=node.node_id,
            scan_id=scan_id,
            node_type=node.node_type.value if hasattr(node.node_type, "value") else str(node.node_type),
            label=node.label[:500],
            properties=node.properties,
        ))
        node_ids.add(node.node_id)
    db.flush()

    for edge in graph._edges.values():
        if edge.source_node_id in node_ids and edge.target_node_id in node_ids:
            db.add(GraphEdge(
                edge_id=edge.edge_id,
                scan_id=scan_id,
                source_node_id=edge.source_node_id,
                target_node_id=edge.target_node_id,
                edge_type=edge.edge_type.value if hasattr(edge.edge_type, "value") else str(edge.edge_type),
                properties=edge.properties,
            ))
    db.commit()
    logger.info(f"Graph: {len(graph._nodes)} nodes, {len(graph._edges)} edges created")

    # 6. Quantum Risk Assessment (Mosca X+Y>Z + Monte Carlo)
    risk_assessments = {}
    for fa in fused_assets:
        algo_node_id = None
        for nid, n in graph._nodes.items():
            if n.properties.get("asset_id") == fa.asset_id or (n.label == fa.canonical_algorithm and getattr(n.node_type, "value", str(n.node_type)) == "algorithm"):
                algo_node_id = nid
                break
        blast = graph.blast_radius(algo_node_id) if algo_node_id else None

        ra = assess_asset_risk(
            asset=fa,
            blast_radius=blast,
            x=10.0,
            y_estimate=3.0,
            z_low=5.0,
            z_mode=12.0,
            z_high=20.0,
            samples=10000,
            seed=RISK_SEED,
            data_sensitivity="high" if fa.quantum_status.value == "vulnerable" else "medium",
            business_criticality="tier-1",
            internet_exposure=True,
        )
        risk_assessments[fa.asset_id] = ra

        db.add(RiskResult(
            result_id=str(uuid.uuid4()),
            scan_id=scan_id,
            asset_id=fa.asset_id,
            mosca_x=ra.mosca.x if ra.mosca else None,
            mosca_y=ra.mosca.y if ra.mosca else None,
            mosca_z=ra.mosca.z_mode if ra.mosca else None,
            at_risk_baseline=ra.mosca.at_risk_baseline if ra.mosca else None,
            probability=ra.probability.p_at_risk if ra.probability else None,
            samples=ra.probability.samples if ra.probability else None,
            seed=ra.probability.seed if ra.probability else None,
            context_score=ra.context_score,
            risk_level=ra.risk_level,
            assumptions=(ra.mosca.assumptions + ra.probability.assumptions) if (ra.mosca and ra.probability) else [],
            context_breakdown=ra.context_breakdown,
        ))

    db.commit()
    logger.info(f"Risk: Evaluated {len(risk_assessments)} assets under Mosca's Theorem & Monte Carlo")

    # 7. Role-Correct Migration Planning
    registry = load_registry()
    candidates_by_asset = {}
    for fa in fused_assets:
        candidates_by_asset[fa.asset_id] = generate_candidates(fa, registry)

    waves = build_wave_plan(fused_assets, risk_assessments, candidates_by_asset)
    waves_data = [
        {
            "wave_number": w.wave_number,
            "priority": w.priority,
            "asset_ids": w.asset_ids,
            "rationale": w.rationale,
            "estimated_effort_weeks": w.estimated_effort_weeks,
        }
        for w in waves
    ]

    for fa in fused_assets:
        candidates = candidates_by_asset.get(fa.asset_id, [])
        fa_node_id = None
        for nid, n in graph._nodes.items():
            if n.properties.get("asset_id") == fa.asset_id:
                fa_node_id = nid
                break
        blast = graph.blast_radius(fa_node_id) if fa_node_id else None

        db.add(MigrationPlan(
            plan_id=str(uuid.uuid4()),
            scan_id=scan_id,
            asset_id=fa.asset_id,
            candidates=[
                {
                    "candidate_algorithm": c.candidate_algorithm,
                    "standard": c.standard,
                    "status": c.status.value,
                    "family": c.family.value,
                    "usage_role_match": c.usage_role_match.value,
                    "trade_offs": c.trade_offs,
                    "compatibility_notes": c.compatibility_notes,
                    "impact_label": c.impact_label,
                }
                for c in candidates
            ],
            waves=waves_data,
            blast_radius={
                "affected_count": blast.affected_count if blast else 0,
                "affected_nodes": blast.affected_nodes if blast else [],
                "max_depth": blast.max_depth if blast else 0,
                "is_prediction": True,
            },
        ))

    db.commit()
    logger.info(f"Migration: {len(waves)} waves planned with role-correct PQC replacements")

    # 8. CycloneDX 1.6 CBOM
    cbom = build_cbom(scan_id=scan_id, fused_assets=fused_assets, project_name=repo_name, tool_version="1.0.0")
    is_valid, validation_errors = validate_cbom(cbom)
    logger.info(f"CBOM: Generated CycloneDX 1.6 CBOM with {len(cbom.get('components', []))} components. Valid: {is_valid}")

    # 9. Update Scan to Completed
    scan.state = ScanState.COMPLETED.value
    scan.completed_at = datetime.datetime.now(datetime.timezone.utc)
    scan.stages = {
        "ingest": {"state": "done"},
        "discover": {"state": "done", "files": scanned_files},
        "normalize": {"state": "done"},
        "fuse": {"state": "done", "assets": len(fused_assets)},
        "graph": {"state": "done", "nodes": len(graph._nodes), "edges": len(graph._edges)},
        "risk": {"state": "done"},
        "migrate": {"state": "done", "waves": len(waves)},
        "validate": {"state": "done", "cbom_valid": is_valid},
        "export": {"state": "done"},
    }
    db.commit()

    # 10. Write Snapshot for Replay
    snapshot_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"snapshot-{repo_name.lower()}-{commit}"))
    try:
        old_snap = db.query(ReplaySnapshot).filter_by(snapshot_id=snapshot_id).first()
        if old_snap:
            db.delete(old_snap)
            db.commit()
    except Exception:
        db.rollback()

    snap = ReplaySnapshot(
        snapshot_id=snapshot_id,
        source_description=f"Authentic scan of {repo_name} @ {commit}",
        scanner_version="1.0.0",
        registry_version="2026.1",
        config_hash=hashlib.sha256(f"{repo_name}-{commit}".encode()).hexdigest()[:16],
        summary={
            "source_scan_id": scan_id,
            "project_name": repo_name,
            "commit": commit,
            "assets_count": len(fused_assets),
            "files_scanned": scanned_files,
            "cbom_valid": is_valid,
        },
    )
    db.add(snap)
    db.commit()

    # Write files to disk for audit
    (output_dir / "01_raw_findings.json").write_text(
        json.dumps({"scan_id": scan_id, "findings_count": len(valid_findings)}, indent=2), encoding="utf-8"
    )
    (output_dir / "02_fused_assets.json").write_text(
        json.dumps([
            {
                "canonical_algorithm": a.canonical_algorithm,
                "family": a.family.value,
                "quantum_status": a.quantum_status.value,
                "claim_state": a.claim_state.value,
                "usage_role": a.usage_role.value,
                "confidence": a.confidence,
                "roles": [r.value for r in a.roles],
            }
            for a in fused_assets
        ], indent=2), encoding="utf-8"
    )
    (output_dir / "06_cbom.json").write_text(json.dumps(cbom, indent=2), encoding="utf-8")

    logger.info(f"Scan complete for {repo_name}! Output artifacts in {output_dir}")
    return {
        "repo": repo_name,
        "scan_id": scan_id,
        "assets": len(fused_assets),
        "files": scanned_files,
        "cbom_valid": is_valid,
    }


def main():
    connect_args = {"check_same_thread": False} if "sqlite" in SYNC_DB_URL else {}
    engine = create_engine(SYNC_DB_URL, pool_pre_ping=True, connect_args=connect_args)
    Session = sessionmaker(engine)
    db = Session()

    logger.info(f"Connecting to DB at: {SYNC_DB_URL}")
    Base.metadata.create_all(engine)

    results = []
    for target in CORPUS_TARGETS:
        try:
            r = scan_target(target, db)
            if r:
                results.append(r)
        except Exception as e:
            db.rollback()
            logger.error(f"Failed scanning {target['name']}: {e}", exc_info=True)

    db.close()
    logger.info("=" * 60)
    logger.info("REAL CORPUS SCAN SUMMARY:")
    for r in results:
        logger.info(f"  - {r['repo']:<10}: {r['assets']} crypto assets from {r['files']} files (CBOM Valid: {r['cbom_valid']}) [Scan ID: {r['scan_id']}]")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()

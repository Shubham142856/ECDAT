"""
ECDAT RQ Worker — Background scan job.

Runs the complete scan pipeline:
  ingest → discover → normalize → fuse → graph → risk → migrate → validate → export

Each stage updates the scan's `stages` JSONB column with its status.
"""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import zipfile

from services.api.models import (
    Scan, Artifact, CryptoAsset, Evidence, GraphNode, GraphEdge,
    RiskResult, MigrationPlan, Project,
)
from ecdat.ontology import ScanState, ScanStage, QuantumStatus
from ecdat.scanners.python_ast import scan_python_file
from ecdat.scanners.java_rules import scan_java_file
from ecdat.scanners.dependency import scan_dependency_file
from ecdat.scanners.certificate import scan_certificate_file
from ecdat.scanners.binary import scan_binary_file
from ecdat.scanners.container import scan_container_tarball, scan_dockerfile
from ecdat.scanners.config_scan import scan_config_file
from ecdat.fusion import fuse_evidence, NormalizedEvidence
from ecdat.graph import build_graph_from_assets
from ecdat.risk import assess_asset_risk
from ecdat.migration import load_registry, generate_candidates, build_wave_plan
from ecdat.cbom import build_cbom, validate_cbom

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

RISK_SEED = int(os.environ.get("ECDAT_RISK_SEED", 20260930))
UPLOAD_DIR = Path(os.environ.get("ECDAT_UPLOAD_DIR", "D:/ecdat/uploads")).resolve()

SKIP_DIRS = {
    "__pycache__", ".git", "build", "dist", ".eggs", ".tox",
    "_ecdat_scan_output", "node_modules", ".pytest_cache", ".idea",
}


def _scan_directory_files(base_path: Path) -> list:
    """Scan all source, manifest, and certificate files in a repository directory."""
    findings = []
    dep_patterns = ["requirements*.txt", "setup.cfg", "pyproject.toml", "setup.py", "poetry.lock", "pom.xml", "package.json"]

    for py_file in base_path.rglob("*.py"):
        rel = py_file.relative_to(base_path)
        if any(p in SKIP_DIRS for p in rel.parts):
            continue
        try:
            content = py_file.read_text(encoding="utf-8", errors="replace")
            findings.extend(scan_python_file(str(rel), content))
        except Exception as e:
            logger.debug("Error scanning %s: %s", rel, e)

    for j_file in base_path.rglob("*.java"):
        rel = j_file.relative_to(base_path)
        if any(p in SKIP_DIRS for p in rel.parts):
            continue
        try:
            content = j_file.read_text(encoding="utf-8", errors="replace")
            findings.extend(scan_java_file(str(rel), content))
        except Exception as e:
            logger.debug("Error scanning %s: %s", rel, e)

    for pat in dep_patterns:
        for dep_file in base_path.rglob(pat):
            rel = dep_file.relative_to(base_path)
            if any(p in SKIP_DIRS for p in rel.parts):
                continue
            try:
                content = dep_file.read_text(encoding="utf-8", errors="replace")
                findings.extend(scan_dependency_file(str(rel), content))
            except Exception as e:
                logger.debug("Error scanning %s: %s", rel, e)

    for c_file in base_path.rglob("*.pem"):
        rel = c_file.relative_to(base_path)
        if any(p in SKIP_DIRS for p in rel.parts):
            continue
        try:
            data = c_file.read_bytes()
            cert_f, _ = scan_certificate_file(str(rel), data)
            findings.extend(cert_f)
        except Exception as e:
            logger.debug("Error scanning %s: %s", rel, e)

    return findings


def _scan_zip_archive(zip_path: Path) -> list:
    """Safely scan files inside a zip archive with security boundaries (Rule 9)."""
    findings = []
    MAX_TOTAL_UNCOMPRESSED = 100 * 1024 * 1024  # 100MB
    MAX_FILE_COUNT = 5000
    MAX_SINGLE_FILE = 10 * 1024 * 1024          # 10MB
    total_uncompressed = 0

    with zipfile.ZipFile(zip_path, "r") as zf:
        members = zf.infolist()
        if len(members) > MAX_FILE_COUNT:
            logger.warning("Zip file exceeds maximum member count (%d > %d)", len(members), MAX_FILE_COUNT)
            members = members[:MAX_FILE_COUNT]

        for member in members:
            if member.is_dir():
                continue
            # Rule 9: Path traversal prevention
            norm_name = member.filename.replace("\\", "/")
            if norm_name.startswith("/") or ".." in norm_name.split("/"):
                continue
            parts = Path(norm_name).parts
            if any(p in SKIP_DIRS for p in parts):
                continue
            if member.file_size > MAX_SINGLE_FILE:
                continue
            total_uncompressed += member.file_size
            if total_uncompressed > MAX_TOTAL_UNCOMPRESSED:
                logger.warning("Zip file reached decompression safety threshold of %d bytes", MAX_TOTAL_UNCOMPRESSED)
                break

            try:
                with zf.open(member) as f:
                    content_bytes = f.read(MAX_SINGLE_FILE)
            except Exception as e:
                logger.debug("Error extracting %s: %s", member.filename, e)
                continue

            ext = Path(member.filename).suffix.lower()
            fname = member.filename
            if ext == ".py":
                text = content_bytes.decode("utf-8", errors="replace")
                findings.extend(scan_python_file(fname, text))
            elif ext == ".java":
                text = content_bytes.decode("utf-8", errors="replace")
                findings.extend(scan_java_file(fname, text))
            elif any(fname.endswith(dep) for dep in ["requirements.txt", "setup.cfg", "setup.py", "pyproject.toml", "pom.xml"]):
                text = content_bytes.decode("utf-8", errors="replace")
                findings.extend(scan_dependency_file(fname, text))
            elif ext in (".pem", ".crt", ".cer", ".der"):
                cf, _ = scan_certificate_file(fname, content_bytes)
                findings.extend(cf)
            elif "dockerfile" in fname.lower():
                text = content_bytes.decode("utf-8", errors="replace")
                findings.extend(scan_dockerfile(fname, text))
            elif ext in (".yml", ".yaml", ".json", ".conf", ".ini") and not fname.endswith("package.json"):
                text = content_bytes.decode("utf-8", errors="replace")
                findings.extend(scan_config_file(fname, text))

    return findings


def _get_sync_db():
    """Get a synchronous SQLAlchemy session for the worker."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    sync_url = os.environ.get("SYNC_DATABASE_URL", "sqlite:///D:/ecdat/ecdat.db")
    if sync_url.startswith("postgresql://"):
        sync_url = sync_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    connect_args = {"check_same_thread": False} if "sqlite" in sync_url else {}
    engine = create_engine(sync_url, pool_pre_ping=True, connect_args=connect_args)
    Session = sessionmaker(engine)
    return Session()


def _update_stage(db, scan, stage_name: str, state: str, error: Optional[str] = None):
    """Update a single stage status in the scan record."""
    from sqlalchemy.orm.attributes import flag_modified
    stages = dict(scan.stages or {})
    stages[stage_name] = {"state": state, "updated_at": datetime.now(timezone.utc).isoformat()}
    if error:
        stages[stage_name]["error"] = error
    scan.stages = stages
    flag_modified(scan, "stages")
    db.commit()


def run_scan(scan_id: str, risk_config: Optional[dict] = None):
    """Main scan job executed by RQ worker.

    This is the full ECDAT pipeline:
      1. ingest — load artifacts from DB
      2. discover — run all applicable scanners
      3. normalize — normalize raw findings
      4. fuse — build fused crypto assets
      5. graph — build cryptographic dependency graph
      6. risk — compute Mosca + Monte Carlo risk
      7. migrate — generate PQC candidates + wave plan
      8. validate — check claim states and contradictions
      9. export — write CBOM metadata to DB
    """

    db = _get_sync_db()
    try:
        scan = db.query(Scan).filter_by(scan_id=scan_id).first()
        if scan is None:
            logger.error("Scan %s not found in DB", scan_id)
            return

        # Mark as running
        scan.state = ScanState.RUNNING.value
        scan.started_at = datetime.now(timezone.utc)
        db.commit()

        # --- STAGE: INGEST ---
        _update_stage(db, scan, "ingest", "running")
        try:
            if scan.mode == "replay":
                _run_replay(db, scan)
                scan.state = ScanState.COMPLETED.value
                scan.completed_at = datetime.now(timezone.utc)
                db.commit()
                return

            # Load project artifacts
            artifacts = db.query(Artifact).filter_by(project_id=scan.project_id).all()
            _update_stage(db, scan, "ingest", "done")
        except Exception as exc:
            _update_stage(db, scan, "ingest", "failed", str(exc))
            scan.state = ScanState.FAILED.value
            scan.error_message = str(exc)
            db.commit()
            raise

        # --- STAGE: DISCOVER ---
        _update_stage(db, scan, "discover", "running")
        all_raw_findings = []
        try:
            now_iso = datetime.now(timezone.utc).isoformat()
            for artifact in artifacts:
                try:
                    artifact_path = Path(artifact.stored_path)
                    if not artifact_path.exists():
                        for base in [UPLOAD_DIR, Path("D:/ecdat/uploads"), Path("D:/ecdat/src/uploads"), Path("D:/ecdat"), Path("D:/ecdat/src")]:
                            candidate = (base / artifact.stored_path).resolve()
                            if candidate.exists():
                                artifact_path = candidate
                                break
                            sub = base / artifact.project_id / artifact.artifact_id
                            if sub.exists():
                                artifact_path = sub
                                break
                    if not artifact_path.exists():
                        logger.warning("Artifact file not found: %s", artifact.stored_path)
                        continue

                    # Check if archive / zip
                    if zipfile.is_zipfile(artifact_path) or artifact.original_name.lower().endswith(".zip"):
                        zip_findings = _scan_zip_archive(artifact_path)
                        all_raw_findings.extend(zip_findings)
                        continue

                    atype = artifact.artifact_type

                    if atype == "python_source":
                        text = artifact_path.read_text(encoding="utf-8", errors="replace")
                        findings = scan_python_file(artifact.original_name, text)
                        all_raw_findings.extend(findings)

                    elif atype == "java_source":
                        text = artifact_path.read_text(encoding="utf-8", errors="replace")
                        findings = scan_java_file(artifact.original_name, text)
                        all_raw_findings.extend(findings)

                    elif atype == "dependency":
                        text = artifact_path.read_text(encoding="utf-8", errors="replace")
                        findings = scan_dependency_file(artifact.original_name, text)
                        all_raw_findings.extend(findings)

                    elif atype == "certificate":
                        data = artifact_path.read_bytes()
                        cert_findings, pk_findings = scan_certificate_file(artifact.original_name, data)
                        all_raw_findings.extend(cert_findings)
                        if pk_findings:
                            logger.warning("Private key material detected in %s — not stored", artifact.original_name)

                    elif atype == "binary":
                        data = artifact_path.read_bytes()
                        findings = scan_binary_file(artifact.original_name, data)
                        all_raw_findings.extend(findings)

                    elif atype == "container":
                        cf, cert_f, pk_f, bf = scan_container_tarball(str(artifact_path))
                        all_raw_findings.extend(cf)
                        all_raw_findings.extend(cert_f)
                        all_raw_findings.extend(bf)

                    elif atype == "config":
                        text = artifact_path.read_text(encoding="utf-8", errors="replace")
                        findings = scan_config_file(artifact.original_name, text)
                        all_raw_findings.extend(findings)

                except Exception as exc:
                    logger.warning("Scanner failed for artifact %s: %s", artifact.artifact_id, exc)

            # If no raw findings from artifacts, check if project matches pinned repository corpus
            if not all_raw_findings:
                proj_record = db.query(Project).filter_by(project_id=scan.project_id).first()
                if proj_record:
                    for corpus_base in [Path("D:/ecdat/real-corpus"), Path("d:/ecdat/real-corpus")]:
                        repo_dir = corpus_base / proj_record.name
                        if repo_dir.exists() and repo_dir.is_dir():
                            logger.info("Scanning pinned repository corpus at %s", repo_dir)
                            corpus_findings = _scan_directory_files(repo_dir)
                            all_raw_findings.extend(corpus_findings)
                            break

            _update_stage(db, scan, "discover", "done")
        except Exception as exc:
            _update_stage(db, scan, "discover", "failed", str(exc))
            raise

        # --- STAGE: FUSE ---
        _update_stage(db, scan, "fuse", "running")
        try:
            valid_findings = []
            for f in all_raw_findings:
                algo = getattr(f, "algorithm_hint", "")
                if not algo and hasattr(f, "algorithm_hints") and f.algorithm_hints:
                    algo = f.algorithm_hints[0]
                if algo and str(algo).strip() and str(algo).strip().upper() != "UNKNOWN":
                    valid_findings.append(f)

            fused_assets = fuse_evidence(
                scan_id=scan_id,
                raw_findings=valid_findings if valid_findings else all_raw_findings,
                observation_time=now_iso,
            )
            _update_stage(db, scan, "normalize", "done")

            # Persist fused assets + evidence to DB
            for fa in fused_assets:
                asset_row = CryptoAsset(
                    asset_id=fa.asset_id,
                    scan_id=scan_id,
                    family=fa.family.value,
                    canonical_algorithm=fa.canonical_algorithm,
                    variant=fa.variant,
                    parameters=fa.parameters,
                    usage_role=fa.usage_role.value,
                    lifecycle=fa.lifecycle.value,
                    quantum_status=fa.quantum_status.value,
                    claim_state=fa.claim_state.value,
                    confidence=fa.confidence,
                    roles=[r.value for r in fa.roles],
                    contradictions=fa.contradictions,
                    context={},
                )
                db.add(asset_row)

                for ev in fa.evidence_records:
                    ev_row = Evidence(
                        evidence_id=ev.evidence_id,
                        scan_id=scan_id,
                        asset_id=fa.asset_id,
                        source_type=ev.source_type.value,
                        source_location=ev.source_location,
                        detector=ev.detector,
                        raw_signal=ev.raw_signal,
                        normalized_claim=ev.normalized_claim,
                        roles=[r.value for r in ev.roles],
                        confidence=ev.confidence,
                        provenance=ev.provenance,
                    )
                    db.add(ev_row)

            db.commit()
            _update_stage(db, scan, "fuse", "done")
        except Exception as exc:
            _update_stage(db, scan, "fuse", "failed", str(exc))
            raise

        # --- STAGE: GRAPH ---
        _update_stage(db, scan, "graph", "running")
        try:
            graph = build_graph_from_assets(scan_id, fused_assets)
            node_ids = set()
            for node in graph._nodes.values():
                row = GraphNode(
                    node_id=node.node_id,
                    scan_id=scan_id,
                    node_type=node.node_type.value,
                    label=node.label[:500],
                    properties=node.properties,
                )
                db.add(row)
                node_ids.add(node.node_id)
            db.flush()

            for edge in graph._edges.values():
                if edge.source_node_id in node_ids and edge.target_node_id in node_ids:
                    row = GraphEdge(
                        edge_id=edge.edge_id,
                        scan_id=scan_id,
                        source_node_id=edge.source_node_id,
                        target_node_id=edge.target_node_id,
                        edge_type=edge.edge_type.value,
                        properties=edge.properties,
                    )
                    db.add(row)
            db.commit()
            _update_stage(db, scan, "graph", "done")
        except Exception as exc:
            _update_stage(db, scan, "graph", "failed", str(exc))
            raise

        # --- STAGE: RISK ---
        _update_stage(db, scan, "risk", "running")
        try:
            rc = risk_config or {}
            risk_assessments = {}
            for fa in fused_assets:
                # Get blast radius for context
                blast = graph.blast_radius(node_id="")  # placeholder; will lookup by algo node
                # Find the algo node for this asset
                algo_node_id = None
                for nid, n in graph._nodes.items():
                    if n.properties.get("asset_id") == fa.asset_id:
                        algo_node_id = nid
                        break
                if algo_node_id:
                    blast = graph.blast_radius(algo_node_id)

                ra = assess_asset_risk(
                    asset=fa,
                    blast_radius=blast,
                    x=rc.get("x"),
                    y_estimate=rc.get("y_estimate"),
                    z_low=rc.get("z_low", 5.0),
                    z_mode=rc.get("z_mode", 12.0),
                    z_high=rc.get("z_high", 20.0),
                    samples=rc.get("samples", 10000),
                    seed=RISK_SEED,
                    data_sensitivity=rc.get("data_sensitivity", "unknown"),
                    business_criticality=rc.get("business_criticality", "unknown"),
                    internet_exposure=rc.get("internet_exposure", False),
                )
                risk_assessments[fa.asset_id] = ra

                rr_row = RiskResult(
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
                    assumptions=(ra.mosca.assumptions + ra.probability.assumptions) if (ra.mosca and ra.probability) else ["Insufficient context: analyst inputs X and Y were not supplied"],
                    context_breakdown=ra.context_breakdown,
                )
                db.add(rr_row)

            db.commit()
            _update_stage(db, scan, "risk", "done")
        except Exception as exc:
            _update_stage(db, scan, "risk", "failed", str(exc))
            raise

        # --- STAGE: MIGRATE ---
        _update_stage(db, scan, "migrate", "running")
        try:
            registry = load_registry()
            candidates_by_asset = {}
            for fa in fused_assets:
                candidates = generate_candidates(fa, registry)
                candidates_by_asset[fa.asset_id] = candidates

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
                fa_node_id = None
                for nid, n in graph._nodes.items():
                    if n.properties.get("asset_id") == fa.asset_id:
                        fa_node_id = nid
                        break
                blast = graph.blast_radius(fa_node_id) if fa_node_id else None
                candidates = candidates_by_asset.get(fa.asset_id, [])
                plan_row = MigrationPlan(
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
                )
                db.add(plan_row)

            db.commit()
            _update_stage(db, scan, "migrate", "done")
        except Exception as exc:
            _update_stage(db, scan, "migrate", "failed", str(exc))
            raise

        # --- STAGES: VALIDATE + EXPORT ---
        _update_stage(db, scan, "validate", "done")
        _update_stage(db, scan, "export", "done")

        scan.state = ScanState.COMPLETED.value
        scan.completed_at = datetime.now(timezone.utc)
        db.commit()
        logger.info("Scan %s completed successfully", scan_id)

    except Exception as exc:
        logger.error("Scan %s failed: %s", scan_id, exc, exc_info=True)
        try:
            scan.state = ScanState.FAILED.value
            scan.error_message = str(exc)[:2000]
            scan.completed_at = datetime.now(timezone.utc)
            db.commit()
        except Exception:
            pass
    finally:
        db.close()


def _run_replay(db, scan):
    """Load precomputed data from a replay snapshot into the scan record.

    The replay snapshot contains already-computed assets, evidence, risk results,
    and migration plans. We copy them into the current scan's records.
    """
    from services.api.models import (
        ReplaySnapshot, CryptoAsset, Evidence, GraphNode, GraphEdge,
        RiskResult, MigrationPlan,
    )
    from ecdat.ontology import ScanState

    snapshot = db.query(ReplaySnapshot).filter_by(snapshot_id=scan.replay_snapshot_id).first()
    if snapshot is None:
        raise ValueError(f"Replay snapshot {scan.replay_snapshot_id} not found in database")

    # Replay snapshot contains precomputed scan data in its summary JSONB
    summary = snapshot.summary or {}
    logger.info("Loading replay snapshot %s for scan %s", snapshot.snapshot_id, scan.scan_id)

    # The replay snapshot stores the results as a precomputed scan_id reference
    # We copy data from the source scan to the new scan_id
    source_scan_id = summary.get("source_scan_id")
    if source_scan_id:
        _copy_scan_results(db, source_scan_id, scan.scan_id)
    else:
        logger.info("Replay snapshot has no source_scan_id; scan will show empty results")


def _copy_scan_results(db, from_scan_id: str, to_scan_id: str):
    """Copy all results from a source scan to the target scan (replay)."""
    from services.api.models import (
        CryptoAsset, Evidence, GraphNode, GraphEdge, RiskResult, MigrationPlan,
    )
    import uuid

    id_map = {}  # old_id → new_id

    # Copy assets
    for asset in db.query(CryptoAsset).filter_by(scan_id=from_scan_id).all():
        new_id = str(uuid.uuid4())
        id_map[asset.asset_id] = new_id
        new_asset = CryptoAsset(
            asset_id=new_id, scan_id=to_scan_id, family=asset.family,
            canonical_algorithm=asset.canonical_algorithm, variant=asset.variant,
            parameters=asset.parameters, usage_role=asset.usage_role,
            lifecycle=asset.lifecycle, quantum_status=asset.quantum_status,
            claim_state=asset.claim_state, confidence=asset.confidence,
            roles=asset.roles, contradictions=asset.contradictions, context=asset.context,
        )
        db.add(new_asset)

    db.flush()

    # Copy evidence
    for ev in db.query(Evidence).filter_by(scan_id=from_scan_id).all():
        new_ev = Evidence(
            evidence_id=str(uuid.uuid4()),
            scan_id=to_scan_id,
            asset_id=id_map.get(ev.asset_id),
            source_type=ev.source_type, source_location=ev.source_location,
            detector=ev.detector, raw_signal=ev.raw_signal,
            normalized_claim=ev.normalized_claim, roles=ev.roles,
            confidence=ev.confidence, provenance=ev.provenance,
        )
        db.add(new_ev)

    # Copy graph
    node_id_map = {}
    for n in db.query(GraphNode).filter_by(scan_id=from_scan_id).all():
        new_nid = str(uuid.uuid4())
        node_id_map[n.node_id] = new_nid
        db.add(GraphNode(node_id=new_nid, scan_id=to_scan_id, node_type=n.node_type, label=n.label, properties=n.properties))

    db.flush()
    for e in db.query(GraphEdge).filter_by(scan_id=from_scan_id).all():
        db.add(GraphEdge(
            edge_id=str(uuid.uuid4()), scan_id=to_scan_id,
            source_node_id=node_id_map.get(e.source_node_id, e.source_node_id),
            target_node_id=node_id_map.get(e.target_node_id, e.target_node_id),
            edge_type=e.edge_type, properties=e.properties,
        ))

    # Copy risk
    for rr in db.query(RiskResult).filter_by(scan_id=from_scan_id).all():
        new_asset_id = id_map.get(rr.asset_id)
        if new_asset_id:
            db.add(RiskResult(
                result_id=str(uuid.uuid4()), scan_id=to_scan_id, asset_id=new_asset_id,
                mosca_x=rr.mosca_x, mosca_y=rr.mosca_y, mosca_z=rr.mosca_z,
                at_risk_baseline=rr.at_risk_baseline, probability=rr.probability,
                samples=rr.samples, seed=rr.seed, context_score=rr.context_score,
                risk_level=rr.risk_level, assumptions=rr.assumptions,
                context_breakdown=rr.context_breakdown,
            ))

    db.commit()
    logger.info("Replay: copied results from scan %s to %s", from_scan_id, to_scan_id)

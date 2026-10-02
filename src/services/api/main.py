"""
ECDAT FastAPI — Main application.

Implements all 14 endpoints from the frozen API contract (21-API-CONTRACT-FREEZE.md).
"""
from __future__ import annotations

import hashlib
import io
import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select, func as sqlfunc
from sqlalchemy.orm import selectinload

from services.api.models import (
    Base, Project, Artifact, Scan, Evidence, CryptoAsset,
    GraphNode, GraphEdge, RiskResult, MigrationPlan, ReplaySnapshot,
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# ---------------------------------------------------------------------------
# Database setup
# ---------------------------------------------------------------------------

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///D:/ecdat/ecdat.db")
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True, connect_args=connect_args)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

UPLOAD_DIR = Path(os.environ.get("ECDAT_UPLOAD_DIR", "./uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD_BYTES = int(os.environ.get("ECDAT_MAX_UPLOAD_BYTES", 256 * 1024 * 1024))

# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="ECDAT API",
    version="1.0.0",
    description="Enterprise Cryptographic Discovery & Analysis Tool — Evidence-First Platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Dependency: DB session
# ---------------------------------------------------------------------------

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

# ---------------------------------------------------------------------------
# Pydantic schemas (request/response)
# ---------------------------------------------------------------------------

class ProjectCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None


class ProjectOut(BaseModel):
    project_id: str
    name: str
    description: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class ScanCreate(BaseModel):
    project_id: str
    mode: str = "live"  # live | replay
    replay_snapshot_id: Optional[str] = None
    risk_config: Optional[dict] = None


class ScanOut(BaseModel):
    scan_id: str
    project_id: str
    mode: str
    state: str
    stages: dict
    started_at: Optional[str]
    completed_at: Optional[str]
    error_message: Optional[str]


class SimulateRequest(BaseModel):
    candidate_algorithm: str
    x: float = 10.0
    y_estimate: float = 3.0


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _iso(dt) -> Optional[str]:
    if dt is None:
        return None
    if hasattr(dt, "isoformat"):
        return dt.isoformat()
    return str(dt)


def _not_found(detail: str):
    raise HTTPException(status_code=404, detail=detail)


def _scan_out(scan: Scan) -> dict:
    return {
        "scan_id": scan.scan_id,
        "project_id": scan.project_id,
        "mode": scan.mode,
        "state": scan.state,
        "stages": scan.stages or {},
        "started_at": _iso(scan.started_at),
        "completed_at": _iso(scan.completed_at),
        "error_message": scan.error_message,
        "replay_snapshot_id": scan.replay_snapshot_id,
    }


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health", tags=["system"])
async def health(db: AsyncSession = Depends(get_db)):
    """Health check — verifies API and database connectivity."""
    try:
        await db.execute(select(sqlfunc.now()))
        db_ok = True
    except Exception:
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "error",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------

@app.post("/api/projects", status_code=status.HTTP_201_CREATED, tags=["projects"])
async def create_project(body: ProjectCreate, db: AsyncSession = Depends(get_db)):
    project = Project(
        project_id=str(uuid.uuid4()),
        name=body.name,
        description=body.description,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return {
        "project_id": project.project_id,
        "name": project.name,
        "description": project.description,
        "created_at": _iso(project.created_at),
    }


@app.get("/api/projects", tags=["projects"])
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).order_by(Project.created_at.desc()))
    projects = result.scalars().all()
    return [
        {
            "project_id": p.project_id,
            "name": p.name,
            "description": p.description,
            "created_at": _iso(p.created_at),
        }
        for p in projects
    ]


# ---------------------------------------------------------------------------
# Artifacts
# ---------------------------------------------------------------------------

@app.post("/api/projects/{project_id}/artifacts", status_code=status.HTTP_201_CREATED, tags=["artifacts"])
async def upload_artifact(
    project_id: str,
    file: UploadFile = File(...),
    artifact_type: str = Query(..., description="python_source | java_source | dependency | certificate | binary | container | config"),
    db: AsyncSession = Depends(get_db),
):
    """Upload an artifact for scanning. The file is stored server-side; path is never exposed."""
    # Verify project exists
    result = await db.execute(select(Project).where(Project.project_id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        _not_found(f"Project {project_id} not found")

    # Read with size limit
    data = b""
    chunk_size = 65536
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        data += chunk
        if len(data) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail=f"File exceeds maximum upload size ({MAX_UPLOAD_BYTES} bytes)")

    sha256 = hashlib.sha256(data).hexdigest()
    artifact_id = str(uuid.uuid4())

    # Store file
    stored_path = UPLOAD_DIR / project_id / artifact_id
    stored_path.parent.mkdir(parents=True, exist_ok=True)
    stored_path.write_bytes(data)

    artifact = Artifact(
        artifact_id=artifact_id,
        project_id=project_id,
        artifact_type=artifact_type,
        original_name=file.filename or "unknown",
        stored_path=str(stored_path),
        sha256=sha256,
        size_bytes=len(data),
    )
    db.add(artifact)
    await db.commit()
    await db.refresh(artifact)

    return {
        "artifact_id": artifact.artifact_id,
        "original_name": artifact.original_name,
        "artifact_type": artifact.artifact_type,
        "sha256": artifact.sha256,
        "size_bytes": artifact.size_bytes,
        "uploaded_at": _iso(artifact.uploaded_at),
    }


# ---------------------------------------------------------------------------
# Scans
# ---------------------------------------------------------------------------

@app.post("/api/scans", status_code=status.HTTP_201_CREATED, tags=["scans"])
async def start_scan(body: ScanCreate, db: AsyncSession = Depends(get_db)):
    """Start a new scan (live or replay). Enqueues background job."""
    # Verify project
    result = await db.execute(select(Project).where(Project.project_id == body.project_id))
    project = result.scalar_one_or_none()
    if project is None:
        _not_found(f"Project {body.project_id} not found")

    if body.mode not in ("live", "replay"):
        raise HTTPException(status_code=422, detail="mode must be 'live' or 'replay'")

    if body.mode == "replay" and not body.replay_snapshot_id:
        raise HTTPException(status_code=422, detail="replay_snapshot_id required for replay mode")

    stages = {
        "ingest":    {"state": "pending"},
        "discover":  {"state": "pending"},
        "normalize": {"state": "pending"},
        "fuse":      {"state": "pending"},
        "graph":     {"state": "pending"},
        "risk":      {"state": "pending"},
        "migrate":   {"state": "pending"},
        "validate":  {"state": "pending"},
        "export":    {"state": "pending"},
    }

    scan = Scan(
        scan_id=str(uuid.uuid4()),
        project_id=body.project_id,
        mode=body.mode,
        state="queued",
        stages=stages,
        replay_snapshot_id=body.replay_snapshot_id,
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)

    # Enqueue background job
    try:
        from redis import Redis
        from rq import Queue
        redis_conn = Redis.from_url(os.environ.get("REDIS_URL", "redis://redis:6379/0"))
        q = Queue("ecdat", connection=redis_conn)
        q.enqueue(
            "services.worker.jobs.run_scan",
            scan.scan_id,
            body.risk_config,
            job_timeout=3600,
        )
    except Exception as exc:
        logger.info("Redis queue not available (%s); executing scan in local background worker thread", exc)
        import threading
        from services.worker.jobs import run_scan
        t = threading.Thread(target=run_scan, args=(scan.scan_id, body.risk_config), daemon=True)
        t.start()

    return _scan_out(scan)


@app.get("/api/scans", tags=["scans"])
async def list_scans(project_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """List scans, optionally filtered by project_id."""
    query = select(Scan).order_by(Scan.created_at.desc())
    if project_id:
        query = query.where(Scan.project_id == project_id)
    result = await db.execute(query)
    scans = result.scalars().all()
    return [_scan_out(s) for s in scans]


@app.get("/api/scans/{scan_id}", tags=["scans"])
async def get_scan(scan_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Scan).where(Scan.scan_id == scan_id))
    scan = result.scalar_one_or_none()
    if scan is None:
        _not_found(f"Scan {scan_id} not found")
    return _scan_out(scan)


@app.get("/api/scans/{scan_id}/assets", tags=["scans"])
async def get_scan_assets(
    scan_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    algorithm: Optional[str] = Query(None),
    quantum_status: Optional[str] = Query(None),
    claim_state: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Paginated inventory of crypto assets in a scan."""
    query = select(CryptoAsset).where(CryptoAsset.scan_id == scan_id)
    if algorithm:
        query = query.where(CryptoAsset.canonical_algorithm.ilike(f"%{algorithm}%"))
    if quantum_status:
        query = query.where(CryptoAsset.quantum_status == quantum_status)
    if claim_state:
        query = query.where(CryptoAsset.claim_state == claim_state)
    if role:
        query = query.where(CryptoAsset.roles.contains([role]))

    count_result = await db.execute(select(sqlfunc.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    assets = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "asset_id": a.asset_id,
                "canonical_algorithm": a.canonical_algorithm,
                "family": a.family,
                "variant": a.variant,
                "usage_role": a.usage_role,
                "lifecycle": a.lifecycle,
                "quantum_status": a.quantum_status,
                "claim_state": a.claim_state,
                "confidence": a.confidence,
                "roles": a.roles,
                "contradictions_count": len(a.contradictions) if a.contradictions else 0,
            }
            for a in assets
        ],
    }


@app.get("/api/assets/{asset_id}", tags=["assets"])
async def get_asset(asset_id: str, db: AsyncSession = Depends(get_db)):
    """Get full asset detail including all evidence records."""
    result = await db.execute(
        select(CryptoAsset)
        .options(selectinload(CryptoAsset.evidence_records))
        .where(CryptoAsset.asset_id == asset_id)
    )
    asset = result.scalar_one_or_none()
    if asset is None:
        _not_found(f"Asset {asset_id} not found")

    evidence = [
        {
            "evidence_id": e.evidence_id,
            "source_type": e.source_type,
            "source_location": e.source_location,
            "detector": e.detector,
            "raw_signal": e.raw_signal,
            "normalized_claim": e.normalized_claim,
            "roles": e.roles,
            "confidence": e.confidence,
            "provenance": e.provenance,
            "observation_time": _iso(e.observation_time),
            "validity": e.validity,
        }
        for e in asset.evidence_records
    ]

    return {
        "asset_id": asset.asset_id,
        "scan_id": asset.scan_id,
        "canonical_algorithm": asset.canonical_algorithm,
        "family": asset.family,
        "variant": asset.variant,
        "parameters": asset.parameters,
        "usage_role": asset.usage_role,
        "lifecycle": asset.lifecycle,
        "quantum_status": asset.quantum_status,
        "claim_state": asset.claim_state,
        "confidence": asset.confidence,
        "roles": asset.roles,
        "contradictions": asset.contradictions,
        "context": asset.context,
        "evidence": evidence,
    }


# ---------------------------------------------------------------------------
# Graph
# ---------------------------------------------------------------------------

@app.get("/api/scans/{scan_id}/graph", tags=["graph"])
async def get_scan_graph(scan_id: str, db: AsyncSession = Depends(get_db)):
    """Get all graph nodes and edges for a scan."""
    nodes_result = await db.execute(select(GraphNode).where(GraphNode.scan_id == scan_id))
    edges_result = await db.execute(select(GraphEdge).where(GraphEdge.scan_id == scan_id))
    nodes = nodes_result.scalars().all()
    edges = edges_result.scalars().all()

    return {
        "nodes": [
            {"node_id": n.node_id, "label": n.label, "node_type": n.node_type, **n.properties}
            for n in nodes
        ],
        "edges": [
            {
                "edge_id": e.edge_id,
                "source": e.source_node_id,
                "target": e.target_node_id,
                "edge_type": e.edge_type,
                **e.properties,
            }
            for e in edges
        ],
    }


@app.get("/api/assets/{asset_id}/blast-radius", tags=["graph"])
async def get_blast_radius(
    asset_id: str,
    max_depth: int = Query(10, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    """BFS blast radius from an asset node. Result is labeled as PREDICTED."""
    # Look up the asset
    asset_result = await db.execute(select(CryptoAsset).where(CryptoAsset.asset_id == asset_id))
    asset = asset_result.scalar_one_or_none()
    if asset is None:
        _not_found(f"Asset {asset_id} not found")

    # Get all graph nodes/edges for this scan
    nodes_result = await db.execute(select(GraphNode).where(GraphNode.scan_id == asset.scan_id))
    edges_result = await db.execute(select(GraphEdge).where(GraphEdge.scan_id == asset.scan_id))
    nodes = nodes_result.scalars().all()
    edges = edges_result.scalars().all()

    # Rebuild graph in memory for BFS
    import networkx as nx
    G = nx.DiGraph()
    node_labels = {}
    node_types = {}
    for n in nodes:
        G.add_node(n.node_id)
        node_labels[n.node_id] = n.label
        node_types[n.node_id] = n.node_type
    for e in edges:
        G.add_edge(e.source_node_id, e.target_node_id)

    # Find the algorithm node for this asset
    origin_node = None
    for n in nodes:
        if n.properties.get("asset_id") == asset_id:
            origin_node = n.node_id
            break

    if origin_node is None:
        return {
            "asset_id": asset_id,
            "origin_node_id": None,
            "affected_nodes": [],
            "affected_count": 0,
            "impact_label": "predicted — not guaranteed",
            "note": "No graph node found for this asset; run a complete scan first",
        }

    # BFS on reversed graph (find who depends on this asset)
    reversed_G = G.reverse(copy=False)
    visited = {origin_node}
    queue = [(origin_node, 0)]
    affected = []

    while queue:
        current, depth = queue.pop(0)
        if depth >= max_depth:
            continue
        for neighbor in reversed_G.successors(current):
            if neighbor not in visited:
                visited.add(neighbor)
                affected.append({
                    "node_id": neighbor,
                    "label": node_labels.get(neighbor, neighbor),
                    "node_type": node_types.get(neighbor, "unknown"),
                    "depth": depth + 1,
                })
                queue.append((neighbor, depth + 1))

    return {
        "asset_id": asset_id,
        "canonical_algorithm": asset.canonical_algorithm,
        "origin_node_id": origin_node,
        "affected_nodes": affected,
        "affected_count": len(affected),
        "max_depth": max_depth,
        "impact_label": "predicted — not guaranteed",
    }


# ---------------------------------------------------------------------------
# Risk
# ---------------------------------------------------------------------------

@app.get("/api/scans/{scan_id}/risk", tags=["risk"])
async def get_scan_risk(scan_id: str, db: AsyncSession = Depends(get_db)):
    """Get all risk results for a scan. All results include scenario-model label."""
    result = await db.execute(
        select(RiskResult, CryptoAsset.canonical_algorithm, CryptoAsset.quantum_status)
        .join(CryptoAsset, RiskResult.asset_id == CryptoAsset.asset_id)
        .where(RiskResult.scan_id == scan_id)
        .order_by(RiskResult.probability.desc())
    )
    rows = result.all()

    return {
        "scan_id": scan_id,
        "risk_label": "scenario-model results — not forecasts of CRQC arrival",
        "assets": [
            {
                "asset_id": rr.asset_id,
                "canonical_algorithm": canonical_algorithm,
                "quantum_status": quantum_status,
                "mosca_x": rr.mosca_x,
                "mosca_y": rr.mosca_y,
                "mosca_z": rr.mosca_z,
                "at_risk_baseline": rr.at_risk_baseline,
                "probability": rr.probability,
                "context_score": rr.context_score,
                "risk_level": rr.risk_level,
                "context_breakdown": rr.context_breakdown,
                "assumptions": rr.assumptions,
            }
            for rr, canonical_algorithm, quantum_status in rows
        ],
    }


# ---------------------------------------------------------------------------
# Migration
# ---------------------------------------------------------------------------

@app.post("/api/assets/{asset_id}/simulate", tags=["migration"])
async def simulate_migration(asset_id: str, body: SimulateRequest, db: AsyncSession = Depends(get_db)):
    """Simulate migrating an asset to a PQC candidate. Result labeled as predicted."""
    asset_result = await db.execute(
        select(CryptoAsset)
        .options(selectinload(CryptoAsset.evidence_records))
        .where(CryptoAsset.asset_id == asset_id)
    )
    asset = asset_result.scalar_one_or_none()
    if asset is None:
        _not_found(f"Asset {asset_id} not found")

    # Get existing risk result
    rr_result = await db.execute(select(RiskResult).where(RiskResult.asset_id == asset_id))
    rr = rr_result.scalar_one_or_none()

    original_p = rr.probability if rr else 0.5

    # Simulate: migration to a PQC/hybrid algo brings P to near 0
    from ecdat.ontology import QuantumStatus as QS
    candidate_lower = body.candidate_algorithm.lower()
    if "hybrid" in candidate_lower or "x25519" in candidate_lower:
        new_status = "hybrid"
        new_p = 0.05
    else:
        new_status = "safe"
        new_p = 0.0

    return {
        "asset_id": asset_id,
        "from_algorithm": asset.canonical_algorithm,
        "to_algorithm": body.candidate_algorithm,
        "simulated_quantum_status": new_status,
        "original_probability": original_p,
        "simulated_probability": new_p,
        "delta_p_at_risk": round(new_p - original_p, 4),
        "impact_label": "predicted simulation result — not a guarantee of migration success",
    }


@app.get("/api/scans/{scan_id}/plan", tags=["migration"])
async def get_migration_plan(scan_id: str, db: AsyncSession = Depends(get_db)):
    """Get the migration wave plan for a scan."""
    result = await db.execute(
        select(MigrationPlan, CryptoAsset.canonical_algorithm)
        .join(CryptoAsset, MigrationPlan.asset_id == CryptoAsset.asset_id)
        .where(MigrationPlan.scan_id == scan_id)
    )
    rows = result.all()

    return {
        "scan_id": scan_id,
        "impact_label": "predicted — not a guarantee of migration success",
        "plans": [
            {
                "asset_id": plan.asset_id,
                "canonical_algorithm": canonical_algorithm,
                "candidates": plan.candidates,
                "waves": plan.waves,
                "blast_radius": plan.blast_radius,
                "simulation_state": plan.simulation_state,
            }
            for plan, canonical_algorithm in rows
        ],
    }


# ---------------------------------------------------------------------------
# CBOM
# ---------------------------------------------------------------------------

@app.get("/api/scans/{scan_id}/cbom", tags=["cbom"])
async def get_cbom(scan_id: str, db: AsyncSession = Depends(get_db)):
    """Export CycloneDX 1.7 CBOM for a scan."""
    scan_result = await db.execute(
        select(Scan)
        .options(selectinload(Scan.assets).selectinload(CryptoAsset.evidence_records))
        .where(Scan.scan_id == scan_id)
    )
    scan = scan_result.scalar_one_or_none()
    if scan is None:
        _not_found(f"Scan {scan_id} not found")

    # Get project name
    project_result = await db.execute(select(Project).where(Project.project_id == scan.project_id))
    project = project_result.scalar_one_or_none()
    project_name = project.name if project else "unknown-project"

    # Build CBOM from assets
    from ecdat.cbom import build_cbom, cbom_to_json
    from ecdat.fusion import FusedAsset
    from ecdat.ontology import (
        AlgorithmFamily, ClaimState, EvidenceRole, QuantumStatus,
        UsageRole, Lifecycle,
    )
    from ecdat.fusion import NormalizedEvidence
    from ecdat.ontology import SourceType

    fused_assets = []
    for asset in scan.assets:
        # Reconstruct minimal FusedAsset for CBOM builder
        try:
            family = AlgorithmFamily(asset.family)
        except ValueError:
            family = AlgorithmFamily.UNKNOWN
        try:
            qs = QuantumStatus(asset.quantum_status)
        except ValueError:
            qs = QuantumStatus.UNKNOWN
        try:
            cs = ClaimState(asset.claim_state)
        except ValueError:
            cs = ClaimState.AMBIGUOUS
        try:
            ur = UsageRole(asset.usage_role)
        except ValueError:
            ur = UsageRole.UNKNOWN
        try:
            lc = Lifecycle(asset.lifecycle)
        except ValueError:
            lc = Lifecycle.UNKNOWN

        roles = set()
        for r in (asset.roles or []):
            try:
                roles.add(EvidenceRole(r))
            except ValueError:
                pass

        evidence_records = []
        for ev in asset.evidence_records:
            try:
                st = SourceType(ev.source_type)
            except ValueError:
                st = SourceType.PYTHON_SOURCE
            ev_roles = []
            for r in (ev.roles or []):
                try:
                    ev_roles.append(EvidenceRole(r))
                except ValueError:
                    pass
            evidence_records.append(NormalizedEvidence(
                evidence_id=ev.evidence_id,
                scan_id=ev.scan_id,
                source_type=st,
                source_location=ev.source_location,
                detector=ev.detector,
                raw_signal=ev.raw_signal or "",
                normalized_claim=ev.normalized_claim,
                roles=ev_roles,
                confidence=ev.confidence,
                provenance=ev.provenance or {},
                observation_time=_iso(ev.observation_time) or "",
            ))

        fused_assets.append(FusedAsset(
            asset_id=asset.asset_id,
            scan_id=asset.scan_id,
            canonical_algorithm=asset.canonical_algorithm,
            family=family,
            variant=asset.variant,
            parameters=asset.parameters or {},
            roles=roles,
            claim_state=cs,
            confidence=asset.confidence,
            quantum_status=qs,
            lifecycle=lc,
            usage_role=ur,
            evidence_records=evidence_records,
            contradictions=asset.contradictions or [],
        ))

    cbom = build_cbom(scan_id=scan_id, fused_assets=fused_assets, project_name=project_name)
    cbom_json = cbom_to_json(cbom)

    from ecdat.cbom import validate_cbom
    is_valid, errors = validate_cbom(cbom)

    return JSONResponse(content={
        "cbom": cbom,
        "validation": {
            "is_valid": is_valid,
            "errors": errors,
        },
    })


# ---------------------------------------------------------------------------
# Replay
# ---------------------------------------------------------------------------

@app.get("/api/replay/{snapshot_id}", tags=["replay"])
async def get_replay_snapshot(snapshot_id: str, db: AsyncSession = Depends(get_db)):
    """Get metadata about a replay snapshot."""
    result = await db.execute(select(ReplaySnapshot).where(ReplaySnapshot.snapshot_id == snapshot_id))
    snapshot = result.scalar_one_or_none()
    if snapshot is None:
        _not_found(f"Replay snapshot {snapshot_id} not found")
    return {
        "snapshot_id": snapshot.snapshot_id,
        "source_description": snapshot.source_description,
        "scanner_version": snapshot.scanner_version,
        "registry_version": snapshot.registry_version,
        "config_hash": snapshot.config_hash,
        "summary": snapshot.summary,
        "created_at": _iso(snapshot.created_at),
        "mode_label": "REPLAY MODE",
    }

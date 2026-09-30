"""
ECDAT FastAPI — Database models (SQLAlchemy 2.x + Alembic).

All 10 tables defined here. Column names match the frozen API contract.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, Float, ForeignKey,
    Integer, String, Text, UniqueConstraint, Index,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


def _uuid() -> str:
    return str(uuid.uuid4())


class Project(Base):
    __tablename__ = "projects"

    project_id   = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    name         = Column(String(255), nullable=False)
    description  = Column(Text, nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at   = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    artifacts = relationship("Artifact", back_populates="project", cascade="all, delete-orphan")
    scans     = relationship("Scan",     back_populates="project", cascade="all, delete-orphan")


class Artifact(Base):
    __tablename__ = "artifacts"

    artifact_id  = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    project_id   = Column(UUID(as_uuid=False), ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False)
    artifact_type= Column(String(50), nullable=False)  # python_source | java_source | dependency | certificate | binary | container | config
    original_name= Column(String(500), nullable=False)
    stored_path  = Column(Text, nullable=False)         # path on server filesystem (never exposed to client)
    sha256       = Column(String(64), nullable=False)
    size_bytes   = Column(BigInteger, nullable=False)
    uploaded_at  = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="artifacts")

    __table_args__ = (
        Index("ix_artifacts_project_id", "project_id"),
        Index("ix_artifacts_sha256", "sha256"),
    )


class Scan(Base):
    __tablename__ = "scans"

    scan_id        = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    project_id     = Column(UUID(as_uuid=False), ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False)
    mode           = Column(String(10), nullable=False, default="live")  # live | replay
    state          = Column(String(40), nullable=False, default="queued")
    stages         = Column(JSONB, nullable=False, default=dict)
    started_at     = Column(DateTime(timezone=True), nullable=True)
    completed_at   = Column(DateTime(timezone=True), nullable=True)
    error_message  = Column(Text, nullable=True)
    replay_snapshot_id = Column(UUID(as_uuid=False), ForeignKey("replay_snapshots.snapshot_id"), nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    project   = relationship("Project", back_populates="scans")
    assets    = relationship("CryptoAsset",  back_populates="scan", cascade="all, delete-orphan")
    evidence  = relationship("Evidence",     back_populates="scan", cascade="all, delete-orphan")
    graph_nodes = relationship("GraphNode",  back_populates="scan", cascade="all, delete-orphan")
    graph_edges = relationship("GraphEdge",  back_populates="scan", cascade="all, delete-orphan")
    risk_results = relationship("RiskResult", back_populates="scan", cascade="all, delete-orphan")
    migration_plans = relationship("MigrationPlan", back_populates="scan", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_scans_project_id", "project_id"),
        Index("ix_scans_state", "state"),
    )


class Evidence(Base):
    __tablename__ = "evidence"

    evidence_id       = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    scan_id           = Column(UUID(as_uuid=False), ForeignKey("scans.scan_id", ondelete="CASCADE"), nullable=False)
    asset_id          = Column(UUID(as_uuid=False), ForeignKey("crypto_assets.asset_id", ondelete="CASCADE"), nullable=True)
    source_type       = Column(String(40), nullable=False)
    source_location   = Column(Text, nullable=False)
    detector          = Column(String(100), nullable=False)
    raw_signal        = Column(Text, nullable=True)
    normalized_claim  = Column(String(200), nullable=False)
    roles             = Column(ARRAY(String), nullable=False, default=list)
    confidence        = Column(Float, nullable=False, default=0.5)
    provenance        = Column(JSONB, nullable=False, default=dict)
    observation_time  = Column(DateTime(timezone=True), server_default=func.now())
    validity          = Column(String(20), nullable=False, default="valid")

    scan  = relationship("Scan", back_populates="evidence")
    asset = relationship("CryptoAsset", back_populates="evidence_records", foreign_keys=[asset_id])

    __table_args__ = (
        Index("ix_evidence_scan_id", "scan_id"),
        Index("ix_evidence_asset_id", "asset_id"),
    )


class CryptoAsset(Base):
    __tablename__ = "crypto_assets"

    asset_id         = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    scan_id          = Column(UUID(as_uuid=False), ForeignKey("scans.scan_id", ondelete="CASCADE"), nullable=False)
    family           = Column(String(50), nullable=False)
    canonical_algorithm = Column(String(200), nullable=False)
    variant          = Column(String(100), nullable=True)
    parameters       = Column(JSONB, nullable=False, default=dict)
    usage_role       = Column(String(50), nullable=False, default="unknown")
    lifecycle        = Column(String(30), nullable=False, default="unknown")
    quantum_status   = Column(String(30), nullable=False, default="unknown")
    claim_state      = Column(String(30), nullable=False, default="ambiguous")
    confidence       = Column(Float, nullable=False, default=0.0)
    roles            = Column(ARRAY(String), nullable=False, default=list)
    contradictions   = Column(JSONB, nullable=False, default=list)
    context          = Column(JSONB, nullable=False, default=dict)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    scan            = relationship("Scan", back_populates="assets")
    evidence_records= relationship("Evidence", back_populates="asset", foreign_keys="Evidence.asset_id")
    risk_result     = relationship("RiskResult", back_populates="asset", uselist=False)
    migration_plan  = relationship("MigrationPlan", back_populates="asset", uselist=False)

    __table_args__ = (
        Index("ix_crypto_assets_scan_id", "scan_id"),
        Index("ix_crypto_assets_algorithm", "canonical_algorithm"),
        Index("ix_crypto_assets_quantum", "quantum_status"),
    )


class GraphNode(Base):
    __tablename__ = "graph_nodes"

    node_id      = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    scan_id      = Column(UUID(as_uuid=False), ForeignKey("scans.scan_id", ondelete="CASCADE"), nullable=False)
    node_type    = Column(String(50), nullable=False)
    label        = Column(Text, nullable=False)
    properties   = Column(JSONB, nullable=False, default=dict)

    scan = relationship("Scan", back_populates="graph_nodes")

    __table_args__ = (
        Index("ix_graph_nodes_scan_id", "scan_id"),
    )


class GraphEdge(Base):
    __tablename__ = "graph_edges"

    edge_id        = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    scan_id        = Column(UUID(as_uuid=False), ForeignKey("scans.scan_id", ondelete="CASCADE"), nullable=False)
    source_node_id = Column(UUID(as_uuid=False), ForeignKey("graph_nodes.node_id", ondelete="CASCADE"), nullable=False)
    target_node_id = Column(UUID(as_uuid=False), ForeignKey("graph_nodes.node_id", ondelete="CASCADE"), nullable=False)
    edge_type      = Column(String(50), nullable=False)
    properties     = Column(JSONB, nullable=False, default=dict)

    scan = relationship("Scan", back_populates="graph_edges")

    __table_args__ = (
        Index("ix_graph_edges_scan_id", "scan_id"),
        Index("ix_graph_edges_source", "source_node_id"),
        Index("ix_graph_edges_target", "target_node_id"),
    )


class RiskResult(Base):
    __tablename__ = "risk_results"

    result_id       = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    scan_id         = Column(UUID(as_uuid=False), ForeignKey("scans.scan_id", ondelete="CASCADE"), nullable=False)
    asset_id        = Column(UUID(as_uuid=False), ForeignKey("crypto_assets.asset_id", ondelete="CASCADE"), nullable=False, unique=True)
    mosca_x         = Column(Float, nullable=False)
    mosca_y         = Column(Float, nullable=False)
    mosca_z         = Column(Float, nullable=False)
    at_risk_baseline= Column(Boolean, nullable=False)
    probability     = Column(Float, nullable=False)
    samples         = Column(Integer, nullable=False)
    seed            = Column(Integer, nullable=False)
    context_score   = Column(Float, nullable=False)
    risk_level      = Column(String(20), nullable=False)
    assumptions     = Column(JSONB, nullable=False, default=list)
    context_breakdown = Column(JSONB, nullable=False, default=dict)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    scan  = relationship("Scan", back_populates="risk_results")
    asset = relationship("CryptoAsset", back_populates="risk_result")

    __table_args__ = (
        Index("ix_risk_results_scan_id", "scan_id"),
    )


class MigrationPlan(Base):
    __tablename__ = "migration_plans"

    plan_id          = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    scan_id          = Column(UUID(as_uuid=False), ForeignKey("scans.scan_id", ondelete="CASCADE"), nullable=False)
    asset_id         = Column(UUID(as_uuid=False), ForeignKey("crypto_assets.asset_id", ondelete="CASCADE"), nullable=False, unique=True)
    candidates       = Column(JSONB, nullable=False, default=list)
    waves            = Column(JSONB, nullable=False, default=list)
    blast_radius     = Column(JSONB, nullable=False, default=dict)
    simulation_state = Column(JSONB, nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    scan  = relationship("Scan", back_populates="migration_plans")
    asset = relationship("CryptoAsset", back_populates="migration_plan")

    __table_args__ = (
        Index("ix_migration_plans_scan_id", "scan_id"),
    )


class ReplaySnapshot(Base):
    __tablename__ = "replay_snapshots"

    snapshot_id      = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    source_description = Column(Text, nullable=False)
    input_sha256     = Column(String(64), nullable=True)
    scanner_version  = Column(String(50), nullable=False)
    registry_version = Column(String(50), nullable=False)
    config_hash      = Column(String(64), nullable=True)
    summary          = Column(JSONB, nullable=False, default=dict)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    scans = relationship("Scan", backref="replay_snapshot_ref",
                         primaryjoin="ReplaySnapshot.snapshot_id == Scan.replay_snapshot_id",
                         foreign_keys="Scan.replay_snapshot_id")

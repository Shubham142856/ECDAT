"""
ECDAT Cryptographic Graph Engine

Builds and queries the cryptographic dependency graph using NetworkX.

Nodes: Project, Service, Repository, SourceFile, Library, Binary, Container,
       Algorithm, Certificate, Protocol, DataAsset, KMS, HSM

Edges: USES, DEPENDS_ON, IMPLEMENTS, PROVIDES, PROTECTS, SIGNS, ENCRYPTS,
       NEGOTIATES, DEPLOYED_ON, ISSUED_BY, STORED_IN, CALLS

Core operations:
  - build_graph(): construct graph from fused assets + enterprise topology
  - blast_radius(): BFS to find all dependents of a given asset node
  - reachability(): transitive closure for a node
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from typing import Any, Iterator, Optional

import networkx as nx

from ecdat.ontology import NodeType, EdgeType
from ecdat.fusion import FusedAsset

logger = logging.getLogger(__name__)


@dataclass
class GraphNode:
    node_id: str
    node_type: NodeType
    label: str
    properties: dict = field(default_factory=dict)


@dataclass
class GraphEdge:
    edge_id: str
    source_node_id: str
    target_node_id: str
    edge_type: EdgeType
    properties: dict = field(default_factory=dict)


@dataclass
class BlastRadiusResult:
    """Result of a blast-radius BFS query."""
    origin_node_id: str
    origin_label: str
    affected_nodes: list[dict]   # {node_id, label, node_type, depth}
    affected_count: int
    max_depth: int
    is_prediction: bool = True   # always labeled as predicted


class CryptoGraph:
    """The cryptographic dependency graph for a single scan."""

    def __init__(self, scan_id: str):
        self.scan_id = scan_id
        self._graph = nx.DiGraph()
        self._nodes: dict[str, GraphNode] = {}
        self._edges: dict[str, GraphEdge] = {}

    def add_node(self, node: GraphNode) -> str:
        """Add a node to the graph. Returns the node_id."""
        self._nodes[node.node_id] = node
        self._graph.add_node(
            node.node_id,
            label=node.label,
            node_type=node.node_type.value,
            **node.properties,
        )
        return node.node_id

    def add_edge(self, edge: GraphEdge) -> str:
        """Add a directed edge. Returns the edge_id."""
        self._edges[edge.edge_id] = edge
        self._graph.add_edge(
            edge.source_node_id,
            edge.target_node_id,
            edge_id=edge.edge_id,
            edge_type=edge.edge_type.value,
            **edge.properties,
        )
        return edge.edge_id

    def get_or_create_node(self, node_type: NodeType, label: str, properties: dict = None) -> str:
        """Find an existing node by label+type or create a new one."""
        for nid, node in self._nodes.items():
            if node.label == label and node.node_type == node_type:
                return nid
        new_node = GraphNode(
            node_id=str(uuid.uuid4()),
            node_type=node_type,
            label=label,
            properties=properties or {},
        )
        return self.add_node(new_node)

    def blast_radius(self, node_id: str, max_depth: int = 10) -> BlastRadiusResult:
        """Compute blast radius: all nodes reachable from node_id via outgoing edges.

        Uses BFS. In the graph, an edge A→B means A depends on B.
        Blast radius = all A's that transitively depend on the target.
        So we use the REVERSE graph: nodes reachable from target in reversed edges.

        Args:
            node_id: The asset node to compute blast radius for.
            max_depth: Maximum BFS depth to prevent unbounded traversal.

        Returns:
            BlastRadiusResult with all affected nodes labeled as PREDICTED.
        """
        if node_id not in self._graph:
            logger.warning("blast_radius: node %s not in graph", node_id)
            return BlastRadiusResult(
                origin_node_id=node_id,
                origin_label="unknown",
                affected_nodes=[],
                affected_count=0,
                max_depth=max_depth,
            )

        # Reverse graph: edges point from dependents back to dependencies
        # In original graph: Service→Algorithm (USES); reversed: Algorithm→Service
        reversed_graph = self._graph.reverse(copy=False)
        origin_node = self._nodes.get(node_id)
        origin_label = origin_node.label if origin_node else node_id

        affected: list[dict] = []
        visited = {node_id}
        queue = [(node_id, 0)]

        while queue:
            current_id, depth = queue.pop(0)
            if depth >= max_depth:
                continue
            for neighbor in reversed_graph.successors(current_id):
                if neighbor not in visited:
                    visited.add(neighbor)
                    neighbor_node = self._nodes.get(neighbor)
                    affected.append({
                        "node_id": neighbor,
                        "label": neighbor_node.label if neighbor_node else neighbor,
                        "node_type": neighbor_node.node_type.value if neighbor_node else "unknown",
                        "depth": depth + 1,
                    })
                    queue.append((neighbor, depth + 1))

        return BlastRadiusResult(
            origin_node_id=node_id,
            origin_label=origin_label,
            affected_nodes=affected,
            affected_count=len(affected),
            max_depth=max_depth,
            is_prediction=True,
        )

    def to_serializable(self) -> dict:
        """Return graph as JSON-serializable dict for API responses."""
        nodes = [
            {
                "node_id": nid,
                "label": n.label,
                "node_type": n.node_type.value,
                **n.properties,
            }
            for nid, n in self._nodes.items()
        ]
        edges = [
            {
                "edge_id": e.edge_id,
                "source": e.source_node_id,
                "target": e.target_node_id,
                "edge_type": e.edge_type.value,
                **e.properties,
            }
            for e in self._edges.values()
        ]
        return {"nodes": nodes, "edges": edges}


def build_graph_from_assets(
    scan_id: str,
    fused_assets: list[FusedAsset],
    enterprise_topology: Optional[dict] = None,
) -> CryptoGraph:
    """Build the cryptographic dependency graph from fused assets.

    Creates:
      - One Algorithm node per FusedAsset
      - SourceFile nodes for every evidence source location
      - Service/Library nodes based on evidence provenance
      - USES edges from source files to algorithms
      - DEPENDS_ON edges for capability-only library findings

    If enterprise_topology (from enterprise.yaml) is provided, additional
    Service, DataAsset, and DEPLOYED_ON/PROTECTS edges are created.
    """
    graph = CryptoGraph(scan_id=scan_id)

    for asset in fused_assets:
        # Create the Algorithm node
        algo_props = {
            "canonical_algorithm": asset.canonical_algorithm,
            "family": asset.family.value,
            "quantum_status": asset.quantum_status.value,
            "claim_state": asset.claim_state.value,
            "confidence": asset.confidence,
            "usage_role": asset.usage_role.value,
            "roles": [r.value for r in asset.roles],
            "asset_id": asset.asset_id,
        }
        if asset.variant:
            algo_props["variant"] = asset.variant

        algo_node_id = graph.get_or_create_node(
            NodeType.ALGORITHM,
            label=asset.canonical_algorithm,
            properties=algo_props,
        )

        # Create edges from evidence sources to this algorithm
        for ev in asset.evidence_records:
            source_location = ev.source_location
            source_type = ev.source_type

            # Map source_type to node type
            if source_type.value in ("python_source", "java_source"):
                node_type = NodeType.SOURCE_FILE
                edge_type = EdgeType.IMPLEMENTS if "implementation" in [r.value for r in ev.roles] else EdgeType.USES
            elif source_type.value == "dependency":
                node_type = NodeType.LIBRARY
                edge_type = EdgeType.PROVIDES
            elif source_type.value == "certificate":
                node_type = NodeType.CERTIFICATE
                edge_type = EdgeType.SIGNS
            elif source_type.value == "binary":
                node_type = NodeType.BINARY
                edge_type = EdgeType.IMPLEMENTS
            elif source_type.value == "container":
                node_type = NodeType.CONTAINER
                edge_type = EdgeType.PROVIDES
            elif source_type.value == "config":
                node_type = NodeType.SOURCE_FILE
                edge_type = EdgeType.USES
            else:
                node_type = NodeType.SOURCE_FILE
                edge_type = EdgeType.USES

            source_node_id = graph.get_or_create_node(
                node_type,
                label=source_location,
                properties={"source_type": source_type.value, "detector": ev.detector},
            )

            edge = GraphEdge(
                edge_id=str(uuid.uuid4()),
                source_node_id=source_node_id,
                target_node_id=algo_node_id,
                edge_type=edge_type,
                properties={"evidence_id": ev.evidence_id, "confidence": ev.confidence},
            )
            graph.add_edge(edge)

    # If enterprise topology is provided, add service/data-asset nodes
    if enterprise_topology:
        _apply_enterprise_topology(graph, enterprise_topology, fused_assets)

    return graph


def _apply_enterprise_topology(
    graph: CryptoGraph,
    topology: dict,
    fused_assets: list[FusedAsset],
) -> None:
    """Apply enterprise.yaml topology to the graph.

    Adds Service nodes, DataAsset nodes, and DEPLOYED_ON / PROTECTS edges.
    The topology is labeled as user-supplied context (SYNTHETIC-GT or user input).
    """
    services = topology.get("services", [])
    for svc in services:
        svc_name = svc.get("name", "unnamed-service")
        svc_node_id = graph.get_or_create_node(
            NodeType.SERVICE,
            label=svc_name,
            properties={
                "business_criticality": svc.get("business_criticality", "unknown"),
                "internet_exposure": svc.get("internet_exposure", False),
                "data_lifetime": svc.get("data_lifetime_years"),
                "source": "enterprise_yaml",
            },
        )

        # Connect service to the algorithms it uses (by repo/path prefix match)
        for algo_asset in fused_assets:
            svc_repos = svc.get("repositories", [])
            for ev in algo_asset.evidence_records:
                src = ev.source_location or ""
                for repo in svc_repos:
                    if repo in src or src.startswith(repo.lstrip("/")):
                        algo_node_id = graph.get_or_create_node(
                            NodeType.ALGORITHM,
                            label=algo_asset.canonical_algorithm,
                        )
                        edge = GraphEdge(
                            edge_id=str(uuid.uuid4()),
                            source_node_id=svc_node_id,
                            target_node_id=algo_node_id,
                            edge_type=EdgeType.USES,
                            properties={"source": "enterprise_yaml_inference"},
                        )
                        graph.add_edge(edge)
                        break

        # Connect service to data assets it protects
        for data_asset in svc.get("data_assets", []):
            da_node_id = graph.get_or_create_node(
                NodeType.DATA_ASSET,
                label=data_asset.get("name", "unnamed-data"),
                properties={
                    "sensitivity": data_asset.get("sensitivity", "unknown"),
                    "lifetime_years": data_asset.get("lifetime_years"),
                    "source": "enterprise_yaml",
                },
            )
            edge = GraphEdge(
                edge_id=str(uuid.uuid4()),
                source_node_id=svc_node_id,
                target_node_id=da_node_id,
                edge_type=EdgeType.PROTECTS,
                properties={"source": "enterprise_yaml"},
            )
            graph.add_edge(edge)

"use client";

import React, { useEffect, useState, useCallback } from "react";
import ReactFlow, {
  Node, Edge, Background, Controls, MiniMap,
  BackgroundVariant, useNodesState, useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { Network, Info, Zap, RefreshCw, AlertCircle } from "lucide-react";
import { getProjects, getScans, getScanGraph } from "@/lib/api";
import { ProjectItem, ScanSummaryItem } from "@/lib/types";

export default function GraphPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [activeScan, setActiveScan] = useState<ScanSummaryItem | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        setLoading(true);
        const projList = await getProjects();
        if (!mounted) return;
        setProjects(projList);

        if (projList.length > 0) {
          const first = projList[0];
          setSelectedProjectId(first.project_id);
          await loadGraphForProject(first.project_id);
        }
      } catch (err) {
        console.warn("Failed to load projects:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => { mounted = false; };
  }, []);

  async function loadGraphForProject(projId: string) {
    try {
      setLoading(true);
      const scans = await getScans(projId);
      if (scans && scans.length > 0) {
        const latest = scans[0];
        setActiveScan(latest);
        const graphData = await getScanGraph(latest.scan_id);

        // Layout nodes in clean grid/hierarchical layout
        const rawNodes = graphData.nodes || [];
        const rawEdges = graphData.edges || [];

        const rfNodes: Node[] = rawNodes.map((n, i) => {
          const isAlgo = n.node_type === "algorithm" || n.node_type === "asset";
          const isFile = n.node_type === "file" || n.node_type === "source_location";
          const isProject = n.node_type === "project" || n.node_type === "repository";

          let borderColor = "#3B82F6";
          let bgColor = "#07112F";
          let textColor = "#93C5FD";

          if (isProject) {
            borderColor = "#22D3EE";
            bgColor = "#082F49";
            textColor = "#22D3EE";
          } else if (isAlgo) {
            borderColor = "#F43F5E";
            bgColor = "#2D0A14";
            textColor = "#FDA4AF";
          } else if (isFile) {
            borderColor = "#10B981";
            bgColor = "#042012";
            textColor = "#6EE7B7";
          }

          const col = i % 8;
          const row = Math.floor(i / 8);

          return {
            id: n.node_id,
            type: "default",
            position: { x: 50 + col * 220, y: 50 + row * 120 },
            data: { label: `${n.label}\n(${n.node_type || "node"})` },
            style: {
              background: bgColor,
              border: `1px solid ${borderColor}`,
              color: textColor,
              borderRadius: 10,
              fontSize: 10,
              padding: "6px 10px",
              fontFamily: "monospace",
              fontWeight: isProject || isAlgo ? "bold" : "normal",
              maxWidth: 180,
              wordBreak: "break-word",
            },
          };
        });

        const rfEdges: Edge[] = rawEdges.map((e, idx) => ({
          id: e.edge_id || `edge-${idx}`,
          source: (e as any).source_node_id || e.source,
          target: (e as any).target_node_id || e.target,
          label: e.edge_type,
          style: { stroke: "#22D3EE", strokeWidth: 1.2 },
          animated: false,
        }));

        setNodes(rfNodes);
        setEdges(rfEdges);
      } else {
        setActiveScan(null);
        setNodes([]);
        setEdges([]);
      }
    } catch (err) {
      console.warn("Failed to load graph for project:", err);
      setNodes([]);
      setEdges([]);
    } finally {
      setLoading(false);
    }
  }

  const handleProjectChange = async (projId: string) => {
    setSelectedProjectId(projId);
    await loadGraphForProject(projId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Network className="w-4 h-4 text-cyber-cyan" />
            <span className="text-xs font-mono font-bold tracking-widest text-cyber-cyan uppercase">Cryptographic Graph</span>
          </div>
          <h1 className="text-2xl font-black text-text-bright">Enterprise Dependency Topology</h1>
          <p className="text-xs text-text-dim mt-1">
            Live directed graph linking project artifacts to cryptographic primitives. Drag and zoom to inspect.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedProjectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#050A1F] border border-cyan-500/30 text-xs font-mono text-cyber-cyan focus:outline-none"
          >
            {projects.map((p) => (
              <option key={p.project_id} value={p.project_id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="hidden sm:flex items-center gap-4 text-xs font-mono">
            {[
              { color: "bg-cyan-400", label: "PROJECT" },
              { color: "bg-rose-500", label: "CRYPTO ASSET" },
              { color: "bg-emerald-500", label: "SOURCE FILE" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                <span className="text-text-dim text-[11px]">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Graph Canvas */}
      <div className="h-[600px] rounded-2xl overflow-hidden border border-cyan-500/20 bg-[#020617] relative">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center text-sm font-mono text-text-dim gap-3">
            <RefreshCw className="w-4 h-4 animate-spin text-cyber-cyan" />
            Loading live topology from PostgreSQL...
          </div>
        ) : nodes.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-sm font-mono text-text-dim gap-3 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-amber-400" />
            <div className="font-bold text-text-bright">No Graph Nodes Available</div>
            <p className="text-xs max-w-sm">No completed scans with graph topology found for this project.</p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            className="bg-[#020617]"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color="rgba(34, 211, 238, 0.1)"
            />
            <Controls className="bg-[#050A1F] border border-cyan-500/20 rounded-xl overflow-hidden" />
            <MiniMap
              className="bg-[#050A1F] border border-cyan-500/20 rounded-xl"
              nodeColor={(n) => {
                const style = n.style as React.CSSProperties;
                const border = style?.border as string || "";
                if (border.includes("F43F5E")) return "#F43F5E";
                if (border.includes("10B981")) return "#10B981";
                return "#22D3EE";
              }}
            />
          </ReactFlow>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Graph Nodes", value: nodes.length, icon: Network },
          { label: "Graph Edges", value: edges.length, icon: Zap },
          { label: "Connected Primitives", value: nodes.filter(n => (n.data?.label || "").includes("asset") || (n.data?.label || "").includes("algorithm")).length, icon: Network },
          { label: "Active Project", value: selectedProjectId || "None", icon: Zap },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-2xl bg-[#050A1F]/60 border border-white/10 flex items-center gap-4">
            <s.icon className="w-8 h-8 text-cyber-cyan/40" />
            <div>
              <div className="text-xl font-black text-text-bright">{s.value}</div>
              <div className="text-[10px] font-mono text-text-dim">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

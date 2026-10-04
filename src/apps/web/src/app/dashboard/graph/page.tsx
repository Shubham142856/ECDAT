"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Network, Zap, RefreshCw, AlertCircle } from "lucide-react";
import { getProjects, getScans, getScanGraph } from "@/lib/api";
import { ProjectItem, ScanSummaryItem } from "@/lib/types";
import { getStoredProjectId, setStoredProjectId } from "@/lib/projectContext";

// Lazy-load ReactFlow only on the client, never during SSR or initial bundle compile.
// This prevents the 2MB ReactFlow bundle from blowing up dev-server memory.
const ReactFlowCanvas = dynamic(() => import("./ReactFlowCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-sm font-mono text-text-dim gap-3">
      <RefreshCw className="w-4 h-4 animate-spin text-primary" />
      Loading graph canvas...
    </div>
  ),
});

export type RFNode = {
  id: string; type: string;
  position: { x: number; y: number };
  data: { label: string };
  style: React.CSSProperties;
};
export type RFEdge = {
  id: string; source: string; target: string;
  label?: string; style?: React.CSSProperties; animated?: boolean;
};

export default function GraphPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [activeScan, setActiveScan] = useState<ScanSummaryItem | null>(null);
  const [nodes, setNodes] = useState<RFNode[]>([]);
  const [edges, setEdges] = useState<RFEdge[]>([]);
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
          const stored = getStoredProjectId();
          const target = projList.find(p => p.project_id === stored) || projList[0];
          setSelectedProjectId(target.project_id);
          setStoredProjectId(target.project_id);
          await loadGraphForProject(target.project_id);
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
        const rawNodes = graphData.nodes || [];
        const rawEdges = graphData.edges || [];

        const rfNodes: RFNode[] = rawNodes.map((n, i) => {
          const isAlgo = n.node_type === "algorithm" || n.node_type === "asset";
          const isFile = n.node_type === "file" || n.node_type === "source_location";
          const isProject = n.node_type === "project" || n.node_type === "repository";
          let borderColor = "#3B82F6", bgColor = "#07112F", textColor = "#93C5FD";
          if (isProject) { borderColor = "#22D3EE"; bgColor = "#082F49"; textColor = "#22D3EE"; }
          else if (isAlgo) { borderColor = "#F43F5E"; bgColor = "#2D0A14"; textColor = "#FDA4AF"; }
          else if (isFile) { borderColor = "#10B981"; bgColor = "#042012"; textColor = "#6EE7B7"; }
          const col = i % 8, row = Math.floor(i / 8);
          return {
            id: n.node_id, type: "default",
            position: { x: 50 + col * 220, y: 50 + row * 120 },
            data: { label: `${n.label}\n(${n.node_type || "node"})` },
            style: {
              background: bgColor, border: `1px solid ${borderColor}`,
              color: textColor, borderRadius: 10, fontSize: 10,
              padding: "6px 10px", fontFamily: "monospace",
              fontWeight: isProject || isAlgo ? "bold" : "normal",
              maxWidth: 180, wordBreak: "break-word" as const,
            },
          };
        });

        const rfEdges: RFEdge[] = rawEdges.map((e: any, idx: number) => ({
          id: e.edge_id || `edge-${idx}`,
          source: e.source_node_id || e.source,
          target: e.target_node_id || e.target,
          label: e.edge_type,
          style: { stroke: "#22D3EE", strokeWidth: 1.2 },
          animated: false,
        }));

        setNodes(rfNodes);
        setEdges(rfEdges);
      } else {
        setActiveScan(null); setNodes([]); setEdges([]);
      }
    } catch (err) {
      console.warn("Failed to load graph:", err);
      setNodes([]); setEdges([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#c8b4a0]/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Network className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono font-bold tracking-widest text-primary uppercase">Cryptographic Graph</span>
          </div>
          <h1 className="text-2xl font-black text-text-bright">Enterprise Dependency Topology</h1>
          <p className="text-xs text-text-dim mt-1">
            Directed graph linking artifacts to cryptographic primitives. Drag and zoom to inspect.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              setStoredProjectId(e.target.value);
              loadGraphForProject(e.target.value);
            }}
            className="px-3 py-2 rounded-xl bg-[#1a1d18] border border-[#c8b4a0]/20 text-xs font-mono text-primary focus:outline-none"
          >
            {projects.map((p) => (
              <option key={p.project_id} value={p.project_id}>{p.name}</option>
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

      <div className="h-[600px] rounded-2xl overflow-hidden border border-[#c8b4a0]/20 bg-[#020617] relative">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center text-sm font-mono text-text-dim gap-3">
            <RefreshCw className="w-4 h-4 animate-spin text-primary" />
            Loading topology...
          </div>
        ) : nodes.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-sm font-mono text-text-dim gap-3 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-amber-400" />
            <div className="font-bold text-text-bright">No Graph Data</div>
            <p className="text-xs max-w-sm">Run a scan first to populate the graph topology.</p>
          </div>
        ) : (
          <ReactFlowCanvas nodes={nodes} edges={edges} />
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Graph Nodes", value: nodes.length },
          { label: "Graph Edges", value: edges.length },
          { label: "Crypto Assets", value: nodes.filter(n => (n.data?.label || "").includes("asset") || (n.data?.label || "").includes("algorithm")).length },
          { label: "Active Scan", value: activeScan ? activeScan.scan_id.slice(0, 8) : "None" },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-2xl bg-[#1a1d18]/60 border border-white/10 flex items-center gap-4">
            <Network className="w-8 h-8 text-primary/40" />
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

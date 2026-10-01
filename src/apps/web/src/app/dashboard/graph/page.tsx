"use client";

import React, { useCallback, useState } from "react";
import ReactFlow, {
  Node, Edge, Background, Controls, MiniMap,
  BackgroundVariant, useNodesState, useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { Network, Info, Zap } from "lucide-react";

const NODE_COLORS: Record<string, string> = {
  repo: "#22D3EE",
  vulnerable: "#F43F5E",
  monitoring: "#F59E0B",
  safe: "#10B981",
};

const INITIAL_NODES: Node[] = [
  // Repo nodes
  { id: "pyjwt", type: "default", position: { x: 80, y: 250 }, data: { label: "PyJWT\nb5bd6fe" }, style: { background: "#07112F", border: "1px solid #22D3EE", color: "#22D3EE", borderRadius: 12, fontSize: 11, padding: "8px 12px", fontFamily: "monospace", fontWeight: "bold" } },
  { id: "certbot", type: "default", position: { x: 80, y: 480 }, data: { label: "Certbot\n4856493" }, style: { background: "#07112F", border: "1px solid #22D3EE", color: "#22D3EE", borderRadius: 12, fontSize: 11, padding: "8px 12px", fontFamily: "monospace", fontWeight: "bold" } },
  { id: "paramiko", type: "default", position: { x: 680, y: 250 }, data: { label: "Paramiko\n142f593" }, style: { background: "#07112F", border: "1px solid #22D3EE", color: "#22D3EE", borderRadius: 12, fontSize: 11, padding: "8px 12px", fontFamily: "monospace", fontWeight: "bold" } },
  { id: "jjwt", type: "default", position: { x: 680, y: 480 }, data: { label: "JJWT\nfb71496" }, style: { background: "#07112F", border: "1px solid #22D3EE", color: "#22D3EE", borderRadius: 12, fontSize: 11, padding: "8px 12px", fontFamily: "monospace", fontWeight: "bold" } },

  // Vulnerable assets — center-left
  { id: "rsa", type: "default", position: { x: 280, y: 150 }, data: { label: "RSA\nSIGNATURE" }, style: { background: "#2D0A14", border: "1px solid #F43F5E", color: "#F43F5E", borderRadius: 10, fontSize: 10, padding: "6px 10px", fontFamily: "monospace" } },
  { id: "ecdsa", type: "default", position: { x: 280, y: 250 }, data: { label: "ECDSA\nSIGNATURE" }, style: { background: "#2D0A14", border: "1px solid #F43F5E", color: "#F43F5E", borderRadius: 10, fontSize: 10, padding: "6px 10px", fontFamily: "monospace" } },
  { id: "rsa2048", type: "default", position: { x: 280, y: 400 }, data: { label: "RSA-2048\nKEY_EST" }, style: { background: "#2D0A14", border: "1px solid #F43F5E", color: "#F43F5E", borderRadius: 10, fontSize: 10, padding: "6px 10px", fontFamily: "monospace" } },
  { id: "ecdsap256", type: "default", position: { x: 280, y: 480 }, data: { label: "ECDSA P-256\nSIGNATURE" }, style: { background: "#2D0A14", border: "1px solid #F43F5E", color: "#F43F5E", borderRadius: 10, fontSize: 10, padding: "6px 10px", fontFamily: "monospace" } },
  { id: "tls12", type: "default", position: { x: 280, y: 560 }, data: { label: "TLS 1.2\nPROTOCOL" }, style: { background: "#2D0A14", border: "1px solid #F43F5E", color: "#F43F5E", borderRadius: 10, fontSize: 10, padding: "6px 10px", fontFamily: "monospace" } },
  { id: "ecdh", type: "default", position: { x: 500, y: 200 }, data: { label: "ECDH P-256\nKEY_EST" }, style: { background: "#2D0A14", border: "1px solid #F43F5E", color: "#F43F5E", borderRadius: 10, fontSize: 10, padding: "6px 10px", fontFamily: "monospace" } },
  { id: "rsaoaep", type: "default", position: { x: 500, y: 480 }, data: { label: "RSA-OAEP\nKEY_EST" }, style: { background: "#2D0A14", border: "1px solid #F43F5E", color: "#F43F5E", borderRadius: 10, fontSize: 10, padding: "6px 10px", fontFamily: "monospace" } },

  // Monitoring assets
  { id: "ed25519py", type: "default", position: { x: 500, y: 280 }, data: { label: "Ed25519\nSIGNATURE" }, style: { background: "#2A1800", border: "1px solid #F59E0B", color: "#F59E0B", borderRadius: 10, fontSize: 10, padding: "6px 10px", fontFamily: "monospace" } },
  { id: "aesctr", type: "default", position: { x: 500, y: 360 }, data: { label: "AES-CTR\nENCRYPTION" }, style: { background: "#2A1800", border: "1px solid #F59E0B", color: "#F59E0B", borderRadius: 10, fontSize: 10, padding: "6px 10px", fontFamily: "monospace" } },
  { id: "aesgcm", type: "default", position: { x: 500, y: 440 }, data: { label: "AES-GCM\nENCRYPTION" }, style: { background: "#2A1800", border: "1px solid #F59E0B", color: "#F59E0B", borderRadius: 10, fontSize: 10, padding: "6px 10px", fontFamily: "monospace" } },

  // Safe assets
  { id: "sha256", type: "default", position: { x: 280, y: 30 }, data: { label: "SHA-256\nHASH" }, style: { background: "#042012", border: "1px solid #10B981", color: "#10B981", borderRadius: 10, fontSize: 10, padding: "6px 10px", fontFamily: "monospace" } },
  { id: "sha512", type: "default", position: { x: 400, y: 30 }, data: { label: "SHA-512\nHASH" }, style: { background: "#042012", border: "1px solid #10B981", color: "#10B981", borderRadius: 10, fontSize: 10, padding: "6px 10px", fontFamily: "monospace" } },
];

const INITIAL_EDGES: Edge[] = [
  // PyJWT → assets
  { id: "e1", source: "pyjwt", target: "rsa", style: { stroke: "#F43F5E", strokeWidth: 1.5 }, animated: false },
  { id: "e2", source: "pyjwt", target: "ecdsa", style: { stroke: "#F43F5E", strokeWidth: 1.5 }, animated: false },
  { id: "e3", source: "pyjwt", target: "ed25519py", style: { stroke: "#F59E0B", strokeWidth: 1.5 }, animated: false },
  { id: "e4", source: "pyjwt", target: "sha256", style: { stroke: "#10B981", strokeWidth: 1.5 }, animated: false },
  { id: "e5", source: "pyjwt", target: "sha512", style: { stroke: "#10B981", strokeWidth: 1.5 }, animated: false },
  // Certbot → assets
  { id: "e6", source: "certbot", target: "rsa2048", style: { stroke: "#F43F5E", strokeWidth: 1.5 }, animated: false },
  { id: "e7", source: "certbot", target: "ecdsap256", style: { stroke: "#F43F5E", strokeWidth: 1.5 }, animated: false },
  { id: "e8", source: "certbot", target: "tls12", style: { stroke: "#F43F5E", strokeWidth: 1.5 }, animated: false },
  // Paramiko → assets
  { id: "e9", source: "paramiko", target: "ecdh", style: { stroke: "#F43F5E", strokeWidth: 1.5 }, animated: false },
  { id: "e10", source: "paramiko", target: "aesctr", style: { stroke: "#F59E0B", strokeWidth: 1.5 }, animated: false },
  { id: "e11", source: "paramiko", target: "aesgcm", style: { stroke: "#F59E0B", strokeWidth: 1.5 }, animated: false },
  // JJWT → assets
  { id: "e12", source: "jjwt", target: "rsaoaep", style: { stroke: "#F43F5E", strokeWidth: 1.5 }, animated: false },
  { id: "e13", source: "jjwt", target: "aesgcm", style: { stroke: "#F59E0B", strokeWidth: 1.5 }, animated: false },
  // Cross-repo shared assets
  { id: "e14", source: "pyjwt", target: "sha512", style: { stroke: "#10B981", strokeWidth: 1, strokeDasharray: "4,4" }, animated: false },
  { id: "e15", source: "rsa", target: "rsa2048", label: "SHARED ROLE", style: { stroke: "#F43F5E", strokeWidth: 1, strokeDasharray: "4,4" }, animated: true },
];

export default function GraphPage() {
  const [nodes, , onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, , onEdgesChange] = useEdgesState(INITIAL_EDGES);

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
            BFS blast-radius graph linking repositories to cryptographic assets. Drag to explore.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          {[
            { color: "bg-rose-500", label: "VULNERABLE" },
            { color: "bg-amber-500", label: "MONITORING" },
            { color: "bg-emerald-500", label: "SAFE" },
            { color: "bg-cyan-400", label: "REPO" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
              <span className="text-text-dim">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Graph Canvas */}
      <div className="h-[600px] rounded-2xl overflow-hidden border border-cyan-500/20 bg-[#020617]">
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
              if (border.includes("F59E0B")) return "#F59E0B";
              if (border.includes("10B981")) return "#10B981";
              return "#22D3EE";
            }}
          />
        </ReactFlow>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Graph Nodes", value: INITIAL_NODES.length, icon: Network },
          { label: "Graph Edges", value: INITIAL_EDGES.length, icon: Zap },
          { label: "Cross-repo Links", value: 2, icon: Network },
          { label: "Blast Radius (BFS)", value: "4 repos", icon: Zap },
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

"use client";

/**
 * ReactFlowCanvas — isolated component so the heavy ReactFlow bundle
 * (2MB+) is only bundled/loaded when this file is dynamically imported.
 * Never import this directly; use next/dynamic with ssr:false.
 */
import React from "react";
import ReactFlow, {
  Background, Controls, MiniMap, BackgroundVariant,
  useNodesState, useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import type { RFNode, RFEdge } from "./page";

interface Props {
  nodes: RFNode[];
  edges: RFEdge[];
}

export default function ReactFlowCanvas({ nodes: initialNodes, edges: initialEdges }: Props) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      className="bg-[#020617]"
    >
      <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(200, 180, 160, 0.08)" />
      <Controls className="bg-[#1a1d18] border border-[#c8b4a0]/20 rounded-xl overflow-hidden" />
      <MiniMap
        className="bg-[#1a1d18] border border-[#c8b4a0]/20 rounded-xl"
        nodeColor={(n) => {
          const border = ((n.style as React.CSSProperties)?.border as string) || "";
          if (border.includes("F43F5E")) return "#F43F5E";
          if (border.includes("10B981")) return "#10B981";
          return "#22D3EE";
        }}
      />
    </ReactFlow>
  );
}

"use client";

import React, { useState } from "react";
import { 
  Network, 
  AlertTriangle, 
  ArrowRight, 
  Layers, 
  ShieldAlert, 
  Zap, 
  CheckCircle2, 
  ArrowDown
} from "lucide-react";

interface StepNode {
  id: string;
  name: string;
  type: string;
  detail: string;
  impactLevel: "ORIGIN" | "DIRECT" | "TRANSITIVE" | "LEAF";
  affectedCount: number;
}

const BLAST_CASCADE: StepNode[] = [
  {
    id: "step-1",
    name: "Legacy RSA-2048 Certificate",
    type: "ROOT CRYPTOGRAPHIC ASSET",
    detail: "CN=*.enterprise.gov.in (Expires in 18 mo, SHA-256 with RSA)",
    impactLevel: "ORIGIN",
    affectedCount: 0,
  },
  {
    id: "step-2",
    name: "Edge API Gateway Cluster",
    type: "INFRASTRUCTURE SERVICE",
    detail: "Terminates inbound TLS 1.2/1.3 sessions and handles SNI dispatch",
    impactLevel: "DIRECT",
    affectedCount: 4,
  },
  {
    id: "step-3",
    name: "Authentication Microservice",
    type: "INTERNAL APPLICATION",
    detail: "Signs & verifies JWS tokens using private key bound to gateway certificate",
    impactLevel: "DIRECT",
    affectedCount: 9,
  },
  {
    id: "step-4",
    name: "Payment & Core Settlement",
    type: "CRITICAL SERVICE",
    detail: "Validates incoming payload signatures and forwards encrypted credit payloads",
    impactLevel: "TRANSITIVE",
    affectedCount: 18,
  },
  {
    id: "step-5",
    name: "Customer Mobile & Web Apps",
    type: "EDGE CONSUMER CLIENTS",
    detail: "Pinned certificate bundles requiring client app store updates upon rotation",
    impactLevel: "LEAF",
    affectedCount: 120,
  },
];

export function BlastRadiusInteractive() {
  const [selectedStep, setSelectedStep] = useState<number>(0);

  const activeNode = BLAST_CASCADE[selectedStep];

  return (
    <div className="w-full max-w-5xl mx-auto rounded-3xl border border-cyan-500/25 bg-gradient-to-b from-[#050A1F] to-[#020617] p-6 sm:p-10 shadow-2xl shadow-cyan-950/40">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-[11px] font-mono text-cyber-cyan mb-2">
            <Network className="w-3.5 h-3.5" />
            DEPENDENCY BLAST RADIUS ANALYSIS
          </div>
          <h3 className="text-2xl font-bold text-text-bright">
            Cryptographic Cascade & Impact Radius
          </h3>
          <p className="text-sm text-text-dim max-w-2xl mt-1">
            Changing a single cryptographic primitive without dependency intelligence breaks downstream services. ECDAT traces full multi-hop reachability across the enterprise graph.
          </p>
        </div>

        {/* Aggregate KPI */}
        <div className="bg-[#030712] px-5 py-3 rounded-2xl border border-amber-500/30 flex items-center gap-4">
          <AlertTriangle className="w-7 h-7 text-amber-400 animate-pulse" />
          <div className="font-mono">
            <div className="text-[10px] uppercase text-text-dim">PREDICTED BLAST RADIUS</div>
            <div className="text-xl font-black text-amber-400">151 Systems</div>
            <div className="text-[10px] text-text-muted">4 Transitive Hops</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 items-center">
        {/* The 5-Step Visual Chain */}
        <div className="lg:col-span-7 space-y-3">
          {BLAST_CASCADE.map((node, idx) => {
            const isSelected = selectedStep === idx;
            return (
              <div key={node.id} className="relative">
                <div
                  onClick={() => setSelectedStep(idx)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "bg-[#07112F] border-cyber-cyan shadow-glow-cyan"
                      : "bg-[#030712]/70 border-white/10 hover:border-cyan-500/30 hover:bg-[#050A1F]"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono text-xs font-bold ${
                        node.impactLevel === "ORIGIN"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : node.impactLevel === "DIRECT"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-blue-500/20 text-cyber-cyan border border-blue-500/30"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-xs font-mono text-text-dim uppercase tracking-wider">
                        {node.type}
                      </div>
                      <div className="text-sm font-bold text-text-bright">{node.name}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase border ${
                        node.impactLevel === "ORIGIN"
                          ? "bg-rose-950/80 text-rose-300 border-rose-500/40"
                          : "bg-slate-900 text-text-muted border-white/10"
                      }`}
                    >
                      {node.impactLevel}
                    </span>
                  </div>
                </div>

                {/* Connecting arrow down */}
                {idx < BLAST_CASCADE.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown className="w-3.5 h-3.5 text-cyan-500/40" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-5 bg-[#030712]/90 rounded-2xl border border-cyan-500/30 p-6 backdrop-blur-xl space-y-5">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <span className="text-xs font-mono text-text-dim uppercase">HOP {selectedStep + 1} TELEMETRY</span>
            <span className="text-[10px] font-mono text-cyber-cyan bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-500/30">
              REACHABILITY VALIDATED
            </span>
          </div>

          <div>
            <h4 className="text-base font-bold text-text-bright">{activeNode.name}</h4>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">{activeNode.detail}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-[#050A1F] border border-white/10">
              <span className="text-[10px] text-text-dim block">DOWNSTREAM IMPACT</span>
              <span className="text-base font-bold text-amber-400">
                {activeNode.affectedCount > 0 ? `+${activeNode.affectedCount} Services` : "Origin Asset"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#050A1F] border border-white/10">
              <span className="text-[10px] text-text-dim block">RECOMMENDED WAVE</span>
              <span className="text-base font-bold text-cyber-cyan">Wave 1 (Urgent)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 space-y-1.5 text-xs">
            <div className="text-cyber-cyan font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Predicted Mitigation Advice
            </div>
            <div className="text-text-muted text-[11px] leading-relaxed">
              Do not perform in-place certificate swap without deploying hybrid dual-handshake support in Gateway Cluster first. Verify mobile client certificate pinning rules before deprecating classical root.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu, CheckCircle2, Clock, ArrowRight, Layers, Zap,
  AlertTriangle, ChevronRight, Play, Shield, GitBranch, RefreshCw,
  Gauge, DollarSign, Activity, AlertCircle
} from "lucide-react";
import { getProjects, getScans, getScanMigrationPlan } from "@/lib/api";
import { ProjectItem, ScanSummaryItem } from "@/lib/types";
import { getStoredProjectId, setStoredProjectId } from "@/lib/projectContext";

export default function MigrationPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [activeScan, setActiveScan] = useState<ScanSummaryItem | null>(null);
  const [planData, setPlanData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanIdx, setSelectedPlanIdx] = useState(0);

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
          await loadPlanForProject(target.project_id);
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

  async function loadPlanForProject(projId: string) {
    try {
      setLoading(true);
      const scans = await getScans(projId);
      if (scans && scans.length > 0) {
        const latest = scans[0];
        setActiveScan(latest);
        const planRes = await getScanMigrationPlan(latest.scan_id);
        setPlanData(planRes.plans || []);
        setSelectedPlanIdx(0);
      } else {
        setActiveScan(null);
        setPlanData([]);
      }
    } catch (err) {
      console.warn("Failed to load migration plan for project:", err);
      setPlanData([]);
    } finally {
      setLoading(false);
    }
  }

  const handleProjectChange = async (projId: string) => {
    setSelectedProjectId(projId);
    setStoredProjectId(projId);
    await loadPlanForProject(projId);
  };

  const currentPlan = planData[selectedPlanIdx] || null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-4 h-4 text-cyber-cyan" />
            <span className="text-xs font-mono font-bold tracking-widest text-cyber-cyan uppercase">PQC Migration Planner</span>
          </div>
          <h1 className="text-2xl font-black text-text-bright">Post-Quantum Migration & Cost/Latency Assessment</h1>
          <p className="text-xs text-text-dim mt-1">
            Role-correct alternatives based on risk, key sizes, handshake overhead, and cost tier.
          </p>
        </div>
        <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            HUMAN-IN-THE-LOOP APPROVAL REQUIRED
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-text-dim flex items-center justify-center gap-3">
          <RefreshCw className="w-4 h-4 animate-spin text-cyber-cyan" />
          Loading live migration plans & latency benchmarks from PostgreSQL...
        </div>
      ) : planData.length === 0 ? (
        <div className="p-12 text-center border border-white/10 rounded-2xl bg-[#050A1F]/40 space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <div className="text-base font-bold text-text-bright">No Migration Plans Available</div>
          <p className="text-xs text-text-dim max-w-md mx-auto">
            Run a full discovery scan on this project to generate role-correct PQC migration plans and latency metrics.
          </p>
        </div>
      ) : (
        <>
          {/* Asset Plan Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {planData.map((p, i) => (
              <button
                key={p.asset_id}
                onClick={() => setSelectedPlanIdx(i)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl border text-left transition-all ${
                  selectedPlanIdx === i
                    ? "bg-[#07112F] border-cyan-500/50 shadow-glow-cyan"
                    : "bg-[#050A1F]/60 border-white/10 hover:border-cyan-500/30"
                }`}
              >
                <div className="text-[10px] font-mono text-text-dim">ASSET {i + 1}</div>
                <div className="text-xs font-bold text-text-bright">{p.canonical_algorithm}</div>
                <div className="text-[10px] text-cyber-cyan mt-1">
                  {(p.candidates || []).length} PQC candidate(s)
                </div>
              </button>
            ))}
          </div>

          {/* Current Asset Detail */}
          {currentPlan && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Candidates & Performance */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-[#050A1F]/60 border border-cyan-500/20 rounded-2xl p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-text-dim uppercase tracking-wider">Migration Candidates For</div>
                      <h2 className="text-xl font-black text-text-bright mt-0.5">{currentPlan.canonical_algorithm}</h2>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyber-cyan text-xs font-mono font-bold">
                      Predicted Blast Radius: {(currentPlan.blast_radius || {}).affected_count || 1} node(s)
                    </span>
                  </div>

                  <div className="space-y-4">
                    {(currentPlan.candidates || []).map((cand: any, idx: number) => {
                      const lat = cand.latency || {};
                      const cost = cand.cost || {};
                      return (
                        <div key={idx} className="p-4 rounded-xl bg-[#030712] border border-white/10 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-cyber-cyan font-mono">{cand.candidate_algorithm}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-text-dim">
                                {cand.standard || "NIST FIPS"}
                              </span>
                            </div>
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              {cand.usage_role_match}
                            </span>
                          </div>

                          <p className="text-xs text-text-dim">{cand.compatibility_notes}</p>

                          {/* Latency and Overhead Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-[11px] font-mono">
                            <div className="p-2 rounded bg-white/[0.02]">
                              <div className="text-[9px] text-text-dim">PUBKEY SIZE</div>
                              <div className="font-bold text-text-bright">{lat.public_key_bytes ? `${lat.public_key_bytes} B` : "N/A"}</div>
                            </div>
                            <div className="p-2 rounded bg-white/[0.02]">
                              <div className="text-[9px] text-text-dim">CIPHER/SIG SIZE</div>
                              <div className="font-bold text-text-bright">
                                {lat.ciphertext_bytes ? `${lat.ciphertext_bytes} B` : lat.signature_bytes ? `${lat.signature_bytes} B` : "N/A"}
                              </div>
                            </div>
                            <div className="p-2 rounded bg-white/[0.02]">
                              <div className="text-[9px] text-text-dim">HANDSHAKE OVERHEAD</div>
                              <div className="font-bold text-amber-400">
                                {lat.estimated_handshake_overhead_ms ? `+${lat.estimated_handshake_overhead_ms} ms` : "Minimal"}
                              </div>
                            </div>
                            <div className="p-2 rounded bg-white/[0.02]">
                              <div className="text-[9px] text-text-dim">COST TIER</div>
                              <div className="font-bold text-emerald-400">
                                {cost.estimated_cost_tier || "LOW"}
                              </div>
                            </div>
                          </div>

                          {/* Trade-offs */}
                          {(cand.trade_offs || []).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {cand.trade_offs.map((t: string, tidx: number) => (
                                <span key={tidx} className="text-[9px] px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/20 text-cyan-300 font-mono">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Wave Priority & Simulation */}
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-[#050A1F]/60 border border-white/10 space-y-3">
                  <div className="text-[10px] font-mono text-text-dim uppercase tracking-wider">Migration Wave Sequence</div>
                  {(currentPlan.waves || []).map((w: any, widx: number) => (
                    <div key={widx} className="p-3 rounded-xl bg-[#030712] border border-white/10 space-y-1 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-cyber-cyan">Wave {w.wave_number}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          w.priority === "URGENT" ? "bg-rose-950 text-rose-400 border border-rose-500/30" : "bg-blue-950 text-blue-400 border border-blue-500/30"
                        }`}>{w.priority}</span>
                      </div>
                      <div className="text-[11px] text-text-dim">{w.rationale}</div>
                      <div className="text-[10px] text-text-muted">Estimated Effort: {w.estimated_effort_weeks || 2} weeks</div>
                    </div>
                  ))}
                </div>

                <div className="p-5 rounded-2xl bg-[#050A1F]/60 border border-white/10 space-y-3 font-mono text-xs">
                  <div className="text-[10px] font-mono text-text-dim uppercase tracking-wider">Infrastructure Impact</div>
                  <div className="text-text-dim leading-relaxed">
                    Migration to lattice-based primitives increases public key and ciphertext sizes over wire. Verify MTU fragmentation thresholds and TLS session resumption caches before production cutover.
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

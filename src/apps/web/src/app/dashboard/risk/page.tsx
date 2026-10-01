"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle, Info, Sliders, TrendingUp, Clock, Zap,
  RefreshCw, ChevronRight, ShieldAlert, BarChart3, AlertCircle
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart, Legend
} from "recharts";
import { getProjects, getScans, getScanRisk } from "@/lib/api";
import { ProjectItem, ScanSummaryItem } from "@/lib/types";

// Mosca's theorem: P(Harvest Now Decrypt Later) meaningful if X + Y > Z
// X = time to relevant CRQC; Y = migration time; Z = data security shelf life

const DEFAULT_X = 8;   // years to CRQC
const DEFAULT_Y = 3;   // migration years
const DEFAULT_Z = 6;   // data lifetime years

function generateMoscaData(x: number, y: number, z: number) {
  const data = [];
  for (let t = 0; t <= 15; t++) {
    const remainingX = Math.max(0, x - t);
    const migrationProgress = Math.min(100, (t / Math.max(1, y)) * 100);
    const threatLevel = Math.max(0, 100 - (remainingX / Math.max(1, x)) * 100);
    const riskWindow = x + y > z ? Math.min(100, Math.max(0, (t - (z - y)) * 20)) : 0;
    data.push({
      year: `Y+${t}`,
      threat: Math.round(threatLevel),
      migration: Math.round(migrationProgress),
      riskWindow: Math.round(riskWindow),
    });
  }
  return data;
}

const STATUS_STYLE: Record<string, string> = {
  critical: "text-rose-400 bg-rose-950/50 border-rose-500/30",
  high: "text-amber-400 bg-amber-950/50 border-amber-500/30",
  medium: "text-blue-400 bg-blue-950/50 border-blue-500/30",
  low: "text-emerald-400 bg-emerald-950/50 border-emerald-500/30",
  safe: "text-emerald-400 bg-emerald-950/50 border-emerald-500/30",
};

export default function RiskPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [activeScan, setActiveScan] = useState<ScanSummaryItem | null>(null);
  const [riskAssets, setRiskAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [X, setX] = useState(DEFAULT_X);
  const [Y, setY] = useState(DEFAULT_Y);
  const [Z, setZ] = useState(DEFAULT_Z);

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
          await loadRiskForProject(first.project_id);
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

  async function loadRiskForProject(projId: string) {
    try {
      setLoading(true);
      const scans = await getScans(projId);
      if (scans && scans.length > 0) {
        const latest = scans[0];
        setActiveScan(latest);
        const riskData = await getScanRisk(latest.scan_id);
        setRiskAssets(riskData.assets || riskData.results || []);
      } else {
        setActiveScan(null);
        setRiskAssets([]);
      }
    } catch (err) {
      console.warn("Failed to load risk for project:", err);
      setRiskAssets([]);
    } finally {
      setLoading(false);
    }
  }

  const handleProjectChange = async (projId: string) => {
    setSelectedProjectId(projId);
    await loadRiskForProject(projId);
  };

  const moscaData = generateMoscaData(X, Y, Z);
  const atRisk = X + Y > Z;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-cyber-cyan" />
            <span className="text-xs font-mono font-bold tracking-widest text-cyber-cyan uppercase">Quantum Risk Engine</span>
          </div>
          <h1 className="text-2xl font-black text-text-bright">Mosca Theorem Risk Assessment</h1>
          <p className="text-xs text-text-dim mt-1">
            P(HNDL risk) is meaningful when <span className="font-mono text-cyber-cyan">X + Y {">"} Z</span>. Rule 5: Scenario variables modeled dynamically.
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
          <div className={`px-4 py-2 rounded-xl border font-mono text-xs font-bold ${
            atRisk ? "bg-rose-950/60 border-rose-500/50 text-rose-300" : "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
          }`}>
            {atRisk ? "⚠ HNDL RISK WINDOW OPEN" : "✓ WITHIN SAFE MARGIN"}
          </div>
        </div>
      </div>

      {/* Mosca Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "X — Time to Relevant CRQC", value: X, setter: setX, min: 3, max: 20, color: "text-rose-400", desc: "Years until a Cryptographically Relevant Quantum Computer emerges" },
          { label: "Y — Migration Duration", value: Y, setter: setY, min: 1, max: 10, color: "text-amber-400", desc: "Years needed to fully migrate your crypto estate" },
          { label: "Z — Data Security Lifetime", value: Z, setter: setZ, min: 1, max: 20, color: "text-cyan-400", desc: "Years your sensitive data must remain protected" },
        ].map((p) => (
          <div key={p.label} className="p-5 rounded-2xl bg-[#050A1F]/60 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-text-bright">{p.label}</span>
              <span className={`text-2xl font-black ${p.color}`}>{p.value}y</span>
            </div>
            <input
              type="range"
              min={p.min}
              max={p.max}
              value={p.value}
              onChange={(e) => p.setter(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
            <p className="text-[10px] text-text-dim">{p.desc}</p>
          </div>
        ))}
      </div>

      {/* Mosca Theorem Result */}
      <div className={`p-5 rounded-2xl border ${atRisk ? "bg-rose-950/30 border-rose-500/30" : "bg-emerald-950/30 border-emerald-500/30"}`}>
        <div className="flex items-center gap-3">
          <ShieldAlert className={`w-6 h-6 ${atRisk ? "text-rose-400" : "text-emerald-400"}`} />
          <div>
            <div className="font-mono text-sm font-bold text-text-bright">
              X + Y = {X + Y} years &nbsp;|&nbsp; Z = {Z} years &nbsp;→&nbsp;
              <span className={atRisk ? "text-rose-400" : "text-emerald-400"}>
                {X + Y} {atRisk ? ">" : "≤"} {Z} — {atRisk ? "RISK WINDOW OPEN" : "WITHIN SAFE MARGIN"}
              </span>
            </div>
            <p className="text-xs text-text-dim mt-1">
              {atRisk
                ? `An adversary harvesting encrypted data today could decrypt it after Y=${Y}y migration + remaining X=${X}y CRQC timeline. Begin migration planning immediately.`
                : `Your current migration timeline (Y=${Y}y) keeps assets protected within the CRQC window (X=${X}y) for data with Z=${Z}y lifetime.`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Mosca Curve Chart */}
      <div className="bg-[#050A1F]/60 border border-white/10 rounded-2xl p-6">
        <h2 className="text-sm font-bold font-mono text-text-bright mb-4">Mosca Curve — Threat vs Migration Progress</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={moscaData}>
            <defs>
              <linearGradient id="threatGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="migGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22D3EE" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,211,238,0.08)" />
            <XAxis dataKey="year" tick={{ fill: "#64748B", fontSize: 10, fontFamily: "monospace" }} />
            <YAxis tick={{ fill: "#64748B", fontSize: 10, fontFamily: "monospace" }} unit="%" />
            <Tooltip
              contentStyle={{ background: "#050A1F", border: "1px solid rgba(34,211,238,0.2)", borderRadius: 8, fontFamily: "monospace", fontSize: 11 }}
              labelStyle={{ color: "#22D3EE" }}
            />
            <Legend wrapperStyle={{ fontFamily: "monospace", fontSize: 11 }} />
            <ReferenceLine x={`Y+${Z}`} stroke="#F59E0B" strokeDasharray="4,4" label={{ value: "Z (data lifetime)", fill: "#F59E0B", fontSize: 9 }} />
            <ReferenceLine x={`Y+${X}`} stroke="#F43F5E" strokeDasharray="4,4" label={{ value: "X (CRQC)", fill: "#F43F5E", fontSize: 9 }} />
            <Area type="monotone" dataKey="threat" name="Quantum Threat" stroke="#F43F5E" fill="url(#threatGrad)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="migration" name="Migration Progress" stroke="#22D3EE" fill="url(#migGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Per-asset Live Risk Table */}
      <div className="bg-[#050A1F]/60 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-bold font-mono text-text-bright">Live Per-Asset Mosca & Monte Carlo Classification</h2>
          <span className="text-[10px] font-mono text-text-dim">Scenario model results · Not guaranteed CRQC forecasts</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-xs font-mono text-text-dim flex items-center justify-center gap-3">
            <RefreshCw className="w-4 h-4 animate-spin text-cyber-cyan" />
            Loading live risk calculations from PostgreSQL...
          </div>
        ) : riskAssets.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-text-dim space-y-2">
            <AlertCircle className="w-6 h-6 text-amber-400 mx-auto" />
            <div>No risk assessment data available for this project.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10">
                  {["Asset / Algorithm", "Quantum Status", "Baseline (X+Y>Z)", "Monte Carlo P(Risk)", "Context Score", "Risk Tier"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold tracking-wider text-text-dim uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {riskAssets.map((a, i) => {
                  const riskLevel = (a.risk_level || "low").toLowerCase();
                  return (
                    <tr key={i} className="hover:bg-white/[0.025] transition-colors">
                      <td className="px-4 py-3 font-bold text-text-bright">{a.canonical_algorithm}</td>
                      <td className="px-4 py-3 text-text-dim">{a.quantum_status}</td>
                      <td className="px-4 py-3">
                        <span className={a.at_risk_baseline ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                          {a.at_risk_baseline ? "AT RISK" : "PROTECTED"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 bg-[#07112F] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${a.probability > 0.6 ? "bg-rose-500" : a.probability > 0.3 ? "bg-amber-500" : "bg-emerald-500"}`}
                              style={{ width: `${Math.round((a.probability || 0) * 100)}%` }}
                            />
                          </div>
                          <span className="font-bold text-text-bright">
                            {typeof a.probability === "number" ? (a.probability * 100).toFixed(1) + "%" : "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-cyan-400 font-bold">
                        {typeof a.context_score === "number" ? a.context_score.toFixed(2) : "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${STATUS_STYLE[riskLevel] || "text-text-dim border-white/10"}`}>
                          {(a.risk_level || "UNKNOWN").toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

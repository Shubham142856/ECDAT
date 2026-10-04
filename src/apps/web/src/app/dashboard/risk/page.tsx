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
import { getStoredProjectId, setStoredProjectId } from "@/lib/projectContext";

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
  critical: "text-white bg-white/15 border-white/30",
  high: "text-slate-200 bg-white/10 border-white/20",
  medium: "text-slate-300 bg-white/5 border-white/15",
  low: "text-slate-400 bg-white/5 border-white/10",
  safe: "text-slate-400 bg-white/5 border-white/10",
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
          const stored = getStoredProjectId();
          const target = projList.find(p => p.project_id === stored) || projList[0];
          setSelectedProjectId(target.project_id);
          setStoredProjectId(target.project_id);
          await loadRiskForProject(target.project_id);
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
    setStoredProjectId(projId);
    await loadRiskForProject(projId);
  };

  const moscaData = generateMoscaData(X, Y, Z);
  const atRisk = X + Y > Z;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-white" />
            <span className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">Risk Engine</span>
          </div>
          <h1 className="text-2xl font-black text-white">Mosca Theorem Risk Assessment</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Dynamic scenario variables: P(X + Y &gt; Z).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="px-3 py-2 rounded-xl bg-black border border-white/20 text-xs font-mono text-white focus:outline-none"
          >
            {projects.map((p) => (
              <option key={p.project_id} value={p.project_id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className={`px-4 py-2 rounded-xl border font-mono text-xs font-bold ${
            atRisk ? "bg-white/15 border-white/30 text-white" : "bg-white/5 border-white/15 text-slate-300"
          }`}>
            {atRisk ? "⚠ HNDL RISK WINDOW OPEN" : "✓ SAFE MARGIN"}
          </div>
        </div>
      </div>

      {/* Mosca Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "X — Time to CRQC", value: X, setter: setX, min: 3, max: 20, desc: "Years until CRQC emerges" },
          { label: "Y — Migration Duration", value: Y, setter: setY, min: 1, max: 10, desc: "Years needed to migrate estate" },
          { label: "Z — Data Shelf Life", value: Z, setter: setZ, min: 1, max: 20, desc: "Years data must remain secret" },
        ].map((p) => (
          <div key={p.label} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white">{p.label}</span>
              <span className="text-2xl font-black text-white">{p.value}y</span>
            </div>
            <input
              type="range"
              min={p.min}
              max={p.max}
              value={p.value}
              onChange={(e) => p.setter(Number(e.target.value))}
              className="w-full accent-white"
            />
            <p className="text-[10px] text-slate-400 font-mono">{p.desc}</p>
          </div>
        ))}
      </div>

      {/* Mosca Theorem Result */}
      <div className="p-5 rounded-2xl border border-white/15 bg-white/[0.03] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-white flex-shrink-0" />
          <div>
            <div className="font-mono text-sm font-bold text-white">
              X + Y = {X + Y}y &nbsp;|&nbsp; Z = {Z}y &nbsp;→&nbsp;
              <span className="font-bold underline decoration-white/40 ml-1">
                {X + Y} {atRisk ? ">" : "≤"} {Z} ({atRisk ? "RISK WINDOW OPEN" : "SAFE MARGIN"})
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              {atRisk
                ? "Harvest Now Decrypt Later threat active. Prioritize migration for high-criticality assets."
                : "Current cryptographic shelf life remains protected within standard migration margin."
              }
            </p>
          </div>
        </div>
      </div>

      {/* Mosca Curve Chart */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
        <h2 className="text-sm font-bold font-mono text-white mb-4">Threat vs Migration Timeline</h2>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={moscaData}>
            <defs>
              <linearGradient id="threatGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="migGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#94A3B8" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="year" tick={{ fill: "#94A3B8", fontSize: 10, fontFamily: "monospace" }} />
            <YAxis tick={{ fill: "#94A3B8", fontSize: 10, fontFamily: "monospace" }} unit="%" />
            <Tooltip
              contentStyle={{ background: "#000000", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, fontFamily: "monospace", fontSize: 11 }}
              labelStyle={{ color: "#FFFFFF" }}
            />
            <Legend wrapperStyle={{ fontFamily: "monospace", fontSize: 11 }} />
            <ReferenceLine x={`Y+${Z}`} stroke="#E2E8F0" strokeDasharray="4,4" label={{ value: "Z (shelf life)", fill: "#94A3B8", fontSize: 9 }} />
            <ReferenceLine x={`Y+${X}`} stroke="#FFFFFF" strokeDasharray="4,4" label={{ value: "X (CRQC)", fill: "#FFFFFF", fontSize: 9 }} />
            <Area type="monotone" dataKey="threat" name="Quantum Threat" stroke="#FFFFFF" fill="url(#threatGrad)" strokeWidth={1.5} dot={false} />
            <Area type="monotone" dataKey="migration" name="Migration Progress" stroke="#94A3B8" fill="url(#migGrad)" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Per-asset Live Risk Table */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-bold font-mono text-white">Live Per-Asset Risk Classification</h2>
          <span className="text-[10px] font-mono text-slate-400">Deterministic scenario models</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-xs font-mono text-slate-400 flex items-center justify-center gap-3">
            <RefreshCw className="w-4 h-4 animate-spin text-white" />
            Loading live risk calculations from API...
          </div>
        ) : riskAssets.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-slate-400 space-y-2">
            <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
            <div>No risk assessment data available for this project.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10">
                  {["Asset / Algorithm", "Quantum Status", "Baseline", "Probability", "Context Score", "Risk Tier"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold tracking-wider text-slate-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {riskAssets.map((a, i) => {
                  const riskLevel = (a.risk_level || "low").toLowerCase();
                  return (
                    <tr key={i} className="hover:bg-white/[0.025] transition-colors">
                      <td className="px-4 py-3 font-bold text-white">{a.canonical_algorithm}</td>
                      <td className="px-4 py-3 text-slate-400">{a.quantum_status}</td>
                      <td className="px-4 py-3">
                        <span className={a.at_risk_baseline ? "text-white font-bold" : "text-slate-400"}>
                          {a.at_risk_baseline ? "AT RISK" : "PROTECTED"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-white"
                              style={{ width: `${Math.round((a.probability || 0) * 100)}%` }}
                            />
                          </div>
                          <span className="font-bold text-white">
                            {typeof a.probability === "number" ? (a.probability * 100).toFixed(1) + "%" : "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white font-bold">
                        {typeof a.context_score === "number" ? a.context_score.toFixed(2) : "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${STATUS_STYLE[riskLevel] || "text-slate-400 border-white/10"}`}>
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

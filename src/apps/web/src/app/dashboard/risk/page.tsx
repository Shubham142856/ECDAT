"use client";

import React, { useState } from "react";
import {
  AlertTriangle, Info, Sliders, TrendingUp, Clock, Zap,
  RefreshCw, ChevronRight, ShieldAlert, BarChart3
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart, Legend
} from "recharts";

// Mosca's theorem: P(Harvest Now Decrypt Later) meaningful if X + Y > Z
// X = time to relevant CRQC; Y = migration time; Z = data security shelf life

const DEFAULT_X = 8;   // years to CRQC
const DEFAULT_Y = 3;   // migration years
const DEFAULT_Z = 6;   // data lifetime years

function generateMoscaData(x: number, y: number, z: number) {
  const data = [];
  for (let t = 0; t <= 15; t++) {
    const remainingX = Math.max(0, x - t);
    const migrationProgress = Math.min(100, (t / y) * 100);
    const threatLevel = Math.max(0, 100 - (remainingX / x) * 100);
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

const ASSET_MOSCA = [
  { name: "RSA-2048", x: 8, y: 3, z: 5, status: "URGENT" },
  { name: "ECDSA P-256", x: 9, y: 3, z: 5, status: "URGENT" },
  { name: "RSA-OAEP (JJWT)", x: 8, y: 2, z: 4, status: "URGENT" },
  { name: "ECDH P-256 (SSH)", x: 9, y: 3, z: 6, status: "URGENT" },
  { name: "Ed25519 (PyJWT)", x: 12, y: 2, z: 5, status: "PLAN" },
  { name: "Ed25519 (Paramiko)", x: 12, y: 2, z: 5, status: "PLAN" },
  { name: "AES-CTR", x: 20, y: 1, z: 10, status: "MONITOR" },
  { name: "AES-GCM", x: 20, y: 1, z: 10, status: "MONITOR" },
  { name: "SHA-256", x: 30, y: 0.5, z: 15, status: "SAFE" },
  { name: "SHA-512", x: 30, y: 0.5, z: 15, status: "SAFE" },
];

const STATUS_STYLE: Record<string, string> = {
  URGENT: "text-rose-400 bg-rose-950/50 border-rose-500/30",
  PLAN: "text-amber-400 bg-amber-950/50 border-amber-500/30",
  MONITOR: "text-blue-400 bg-blue-950/50 border-blue-500/30",
  SAFE: "text-emerald-400 bg-emerald-950/50 border-emerald-500/30",
};

export default function RiskPage() {
  const [X, setX] = useState(DEFAULT_X);
  const [Y, setY] = useState(DEFAULT_Y);
  const [Z, setZ] = useState(DEFAULT_Z);

  const moscaData = generateMoscaData(X, Y, Z);
  const atRisk = X + Y > Z;
  const urgentCount = ASSET_MOSCA.filter(a => a.status === "URGENT").length;

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
            P(HNDL risk) is meaningful when <span className="font-mono text-cyber-cyan">X + Y {">"} Z</span>. Adjust sliders to model enterprise scenarios.
          </p>
        </div>
        <div className={`px-4 py-2 rounded-xl border font-mono text-xs font-bold ${
          atRisk ? "bg-rose-950/60 border-rose-500/50 text-rose-300" : "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
        }`}>
          {atRisk ? "⚠ HARVEST-NOW DECRYPT-LATER RISK WINDOW OPEN" : "✓ CURRENTLY OUTSIDE RISK WINDOW"}
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
                ? `An adversary harvesting encrypted data today could decrypt it after Y=${Y}y migration + remaining X=${X}y CRQC timeline. Begin migration immediately.`
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

      {/* Per-asset Mosca Table */}
      <div className="bg-[#050A1F]/60 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-sm font-bold font-mono text-text-bright">Per-Asset Mosca Classification</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10">
                {["Asset", "X (CRQC)", "Y (Migration)", "Z (Data Life)", "X+Y vs Z", "Priority"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold tracking-wider text-text-dim uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {ASSET_MOSCA.map((a, i) => {
                const risk = a.x + a.y > a.z;
                return (
                  <tr key={i} className="hover:bg-white/[0.025] transition-colors">
                    <td className="px-4 py-3 font-bold text-text-bright">{a.name}</td>
                    <td className="px-4 py-3 text-rose-400">{a.x}y</td>
                    <td className="px-4 py-3 text-amber-400">{a.y}y</td>
                    <td className="px-4 py-3 text-cyan-400">{a.z}y</td>
                    <td className="px-4 py-3">
                      <span className={risk ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                        {a.x + a.y} {risk ? ">" : "≤"} {a.z} — {risk ? "AT RISK" : "OK"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${STATUS_STYLE[a.status]}`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

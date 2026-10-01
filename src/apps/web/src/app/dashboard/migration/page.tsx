"use client";

import React, { useState } from "react";
import {
  Cpu, CheckCircle2, Clock, ArrowRight, Layers, Zap,
  AlertTriangle, ChevronRight, Play, Shield, GitBranch, RefreshCw
} from "lucide-react";

const MIGRATION_WAVES = [
  {
    wave: 1,
    label: "CRITICAL KEY ESTABLISHMENT",
    deadline: "Q1 2026",
    assets: ["RSA-2048 → ML-KEM-768 (CRYSTALS-Kyber)", "ECDH P-256 → ML-KEM-768 (SSH transport)", "RSA-OAEP (JJWT) → ML-KEM-768"],
    repos: ["Certbot", "Paramiko", "JJWT"],
    status: "PLAN",
    pqcStandard: "NIST FIPS 203 (ML-KEM)",
    riskReduction: 42,
    effort: "HIGH",
    notes: "Key establishment algorithms are the highest priority — HNDL threat applies immediately."
  },
  {
    wave: 2,
    label: "DIGITAL SIGNATURES",
    deadline: "Q3 2026",
    assets: ["RSA → ML-DSA-44 (CRYSTALS-Dilithium)", "ECDSA P-256 → ML-DSA-44", "RSA-PSS → ML-DSA-44"],
    repos: ["PyJWT", "Certbot"],
    status: "PLAN",
    pqcStandard: "NIST FIPS 204 (ML-DSA)",
    riskReduction: 31,
    effort: "HIGH",
    notes: "JWT signing algorithms must migrate. Backward compatibility via hybrid signature period."
  },
  {
    wave: 3,
    label: "HASH FUNCTION UPGRADES",
    deadline: "Q4 2026",
    assets: ["SHA-256 → SHA-3-256 / SHAKE256", "SHA-384 → SHA-3-384", "SHA-512 → SHA-3-512"],
    repos: ["PyJWT", "Certbot"],
    status: "MONITOR",
    pqcStandard: "NIST FIPS 202 (SHA-3)",
    riskReduction: 12,
    effort: "LOW",
    notes: "SHA-2 retains 128-bit PQC security with doubled output length. SHA-3 preferred for new deployments."
  },
  {
    wave: 4,
    label: "ED25519 / HYBRID TRANSITION",
    deadline: "Q1 2027",
    assets: ["Ed25519 (PyJWT) → SLH-DSA-128f (SPHINCS+)", "Ed25519 (Paramiko SSH) → SLH-DSA-128f + Ed25519 hybrid"],
    repos: ["PyJWT", "Paramiko"],
    status: "MONITOR",
    pqcStandard: "NIST FIPS 205 (SLH-DSA)",
    riskReduction: 10,
    effort: "MEDIUM",
    notes: "Ed25519 is less urgent than RSA/ECDH. Hybrid mode preserves backward compatibility."
  },
  {
    wave: 5,
    label: "SYMMETRIC & PROTOCOL",
    deadline: "Q2 2027",
    assets: ["AES-CTR → AES-256-CTR (key size upgrade)", "AES-CBC → AES-256-GCM (JJWT)", "TLS 1.2 → TLS 1.3 + Kyber hybrid"],
    repos: ["Paramiko", "JJWT", "Certbot"],
    status: "MONITOR",
    pqcStandard: "NIST SP 800-175B + TLS hybrid",
    riskReduction: 5,
    effort: "LOW",
    notes: "Symmetric ciphers with 256-bit keys are quantum-resistant. Protocol upgrades for defense in depth."
  },
];

const STATUS_STYLE: Record<string, string> = {
  DONE: "text-emerald-400 bg-emerald-950/50 border-emerald-500/30",
  PLAN: "text-rose-400 bg-rose-950/50 border-rose-500/30",
  MONITOR: "text-amber-400 bg-amber-950/50 border-amber-500/30",
};

const EFFORT_STYLE: Record<string, string> = {
  HIGH: "text-rose-400",
  MEDIUM: "text-amber-400",
  LOW: "text-emerald-400",
};

export default function MigrationPage() {
  const [selectedWave, setSelectedWave] = useState(0);
  const wave = MIGRATION_WAVES[selectedWave];
  const totalRisk = MIGRATION_WAVES.reduce((s, w) => s + w.riskReduction, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-4 h-4 text-cyber-cyan" />
            <span className="text-xs font-mono font-bold tracking-widest text-cyber-cyan uppercase">PQC Migration Planner</span>
          </div>
          <h1 className="text-2xl font-black text-text-bright">Post-Quantum Migration Waves</h1>
          <p className="text-xs text-text-dim mt-1">
            Sequenced migration plan aligned with NIST FIPS 203/204/205. Human approval required before execution.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
          <AlertTriangle className="w-3.5 h-3.5" />
          SIMULATE ONLY — NO AUTO-EXECUTION
        </div>
      </div>

      {/* Wave Timeline */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {MIGRATION_WAVES.map((w, i) => (
          <button
            key={i}
            onClick={() => setSelectedWave(i)}
            className={`flex-shrink-0 px-4 py-3 rounded-xl border text-left transition-all min-w-[160px] ${
              selectedWave === i
                ? "bg-[#07112F] border-cyan-500/50 shadow-glow-cyan"
                : "bg-[#050A1F]/60 border-white/10 hover:border-cyan-500/30"
            }`}
          >
            <div className="text-[10px] font-mono text-text-dim mb-1">WAVE {w.wave}</div>
            <div className="text-xs font-bold text-text-bright leading-tight">{w.label}</div>
            <div className="text-[10px] text-text-dim mt-1.5">{w.deadline}</div>
            <div className={`mt-2 text-[10px] px-1.5 py-0.5 rounded border inline-block ${STATUS_STYLE[w.status]}`}>
              {w.status}
            </div>
          </button>
        ))}
      </div>

      {/* Selected Wave Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#050A1F]/60 border border-cyan-500/20 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-text-dim uppercase tracking-wider">Wave {wave.wave}</div>
              <h2 className="text-lg font-black text-text-bright mt-0.5">{wave.label}</h2>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-text-dim font-mono">TARGET DEADLINE</div>
              <div className="text-sm font-bold text-cyber-cyan font-mono">{wave.deadline}</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#030712] border border-white/10 font-mono text-xs text-text-dim">
            <div className="text-[10px] text-amber-400 font-bold mb-1">ANALYST NOTE</div>
            {wave.notes}
          </div>

          <div>
            <div className="text-[10px] font-mono text-text-dim uppercase tracking-wider mb-2">Migration Targets</div>
            <div className="space-y-2">
              {wave.assets.map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[#030712] border border-white/[0.07]">
                  <ArrowRight className="w-3.5 h-3.5 text-cyber-cyan flex-shrink-0" />
                  <span className="font-mono text-xs text-text-bright">{a}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {wave.repos.map((r) => (
              <span key={r} className="px-2.5 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/20 text-cyber-cyan font-mono text-[10px] font-bold">
                {r}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#050A1F]/60 border border-white/10 space-y-3">
            <div className="text-[10px] font-mono text-text-dim uppercase tracking-wider">Wave Metadata</div>
            {[
              { label: "PQC Standard", value: wave.pqcStandard, color: "text-cyber-cyan" },
              { label: "Effort Level", value: wave.effort, color: EFFORT_STYLE[wave.effort] },
              { label: "Risk Reduction", value: `${wave.riskReduction}%`, color: "text-emerald-400" },
              { label: "Status", value: wave.status, color: STATUS_STYLE[wave.status].split(" ")[0] },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between text-xs font-mono">
                <span className="text-text-dim">{m.label}</span>
                <span className={`font-bold ${m.color}`}>{m.value}</span>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-2xl bg-[#050A1F]/60 border border-white/10 space-y-3">
            <div className="text-[10px] font-mono text-text-dim uppercase tracking-wider">Total Risk Reduction</div>
            <div className="text-3xl font-black text-emerald-400">{totalRisk}%</div>
            <div className="h-2 bg-[#07112F] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full" style={{ width: `${totalRisk}%` }} />
            </div>
            <div className="text-[10px] text-text-dim">Predicted post-migration quantum risk reduction across all 5 waves</div>
          </div>

          <button className="w-full py-3 rounded-xl bg-[#050A1F] border border-amber-500/30 text-amber-300 font-mono text-xs font-bold flex items-center justify-center gap-2 hover:bg-amber-950/30 transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
            Simulate This Wave
          </button>
          <div className="text-[10px] text-text-dim text-center font-mono">Simulation only — human approval required before any code change</div>
        </div>
      </div>

      {/* Wave Summary Table */}
      <div className="bg-[#050A1F]/60 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-sm font-bold font-mono text-text-bright">All Waves Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10">
                {["Wave", "Label", "Standard", "Deadline", "Effort", "Risk ↓", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold tracking-wider text-text-dim uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {MIGRATION_WAVES.map((w, i) => (
                <tr
                  key={i}
                  className={`hover:bg-white/[0.025] transition-colors cursor-pointer ${selectedWave === i ? "bg-cyan-950/20" : ""}`}
                  onClick={() => setSelectedWave(i)}
                >
                  <td className="px-4 py-3 font-black text-cyber-cyan">{w.wave}</td>
                  <td className="px-4 py-3 font-bold text-text-bright">{w.label}</td>
                  <td className="px-4 py-3 text-text-dim text-[10px]">{w.pqcStandard}</td>
                  <td className="px-4 py-3 text-text-muted">{w.deadline}</td>
                  <td className={`px-4 py-3 font-bold ${EFFORT_STYLE[w.effort]}`}>{w.effort}</td>
                  <td className="px-4 py-3 text-emerald-400 font-bold">{w.riskReduction}%</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${STATUS_STYLE[w.status]}`}>
                      {w.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Cpu, 
  AlertTriangle, 
  TrendingUp, 
  ArrowRight, 
  Database, 
  Network, 
  Activity, 
  Zap, 
  FileJson,
  CheckCircle2,
  Clock,
  Radio
} from "lucide-react";
import { REAL_ASSETS, MIGRATION_WAVES } from "@/lib/data";

export default function DashboardOverviewPage() {
  const totalAssets = 54;
  const vulnerableAssets = 36; // 66.7%
  const pqcReadyAssets = 11; // 20.3%
  const criticalRiskAssets = 14;

  return (
    <div className="space-y-8">
      {/* Top Banner / Headline */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-cyan animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-widest text-cyber-cyan uppercase">
              ENTERPRISE SECURITY OPERATIONS CENTER
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-text-bright tracking-tight mt-1">
            Cryptographic Posture &amp; Quantum Risk Overview
          </h1>
          <p className="text-xs sm:text-sm text-text-dim mt-1">
            Continuous discovery telemetry across 4 enterprise corpora: <span className="text-cyber-cyan font-mono">PyJWT</span>, <span className="text-cyber-cyan font-mono">Certbot</span>, <span className="text-cyber-cyan font-mono">Paramiko</span>, and <span className="text-cyber-cyan font-mono">JJWT</span>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/discovery"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyber-blue to-cyber-cyan text-[#020617] font-mono text-xs font-bold shadow-glow-cyan hover:scale-105 transition-all flex items-center gap-2"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            Trigger New Discovery
          </Link>
          <Link
            href="/dashboard/reports"
            className="px-4 py-2.5 rounded-xl bg-[#050A1F] border border-cyan-500/30 text-cyber-cyan font-mono text-xs font-bold hover:bg-cyan-950/40 transition-all flex items-center gap-2"
          >
            <FileJson className="w-3.5 h-3.5" />
            CBOM Export
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Assets */}
        <div className="p-5 rounded-2xl bg-[#050A1F] border border-white/10 relative overflow-hidden">
          <div className="text-[10px] font-mono uppercase text-text-dim">TOTAL CRYPTO ASSETS</div>
          <div className="text-3xl font-black font-mono text-white mt-1">{totalAssets}</div>
          <div className="text-[11px] text-text-muted mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan" />
            Across 4 pinned repos
          </div>
        </div>

        {/* Quantum Vulnerable */}
        <div className="p-5 rounded-2xl bg-[#050A1F] border border-rose-500/30 relative overflow-hidden shadow-glow-rose">
          <div className="text-[10px] font-mono uppercase text-rose-400">QUANTUM VULNERABLE</div>
          <div className="text-3xl font-black font-mono text-rose-400 mt-1">{vulnerableAssets}</div>
          <div className="text-[11px] text-text-muted mt-2">
            RSA, ECDSA, 3DES, DH (66.7%)
          </div>
        </div>

        {/* Mosca Critical Risk */}
        <div className="p-5 rounded-2xl bg-[#050A1F] border border-amber-500/30 relative overflow-hidden">
          <div className="text-[10px] font-mono uppercase text-amber-400">MOSCA CRITICAL (X+Y &gt; Z)</div>
          <div className="text-3xl font-black font-mono text-amber-400 mt-1">{criticalRiskAssets}</div>
          <div className="text-[11px] text-text-muted mt-2">
            Urgent SNDL Exposure Window
          </div>
        </div>

        {/* Hybrid / PQC Ready */}
        <div className="p-5 rounded-2xl bg-[#050A1F] border border-emerald-500/30 relative overflow-hidden">
          <div className="text-[10px] font-mono uppercase text-emerald-400">PQC / HYBRID READY</div>
          <div className="text-3xl font-black font-mono text-emerald-400 mt-1">{pqcReadyAssets}</div>
          <div className="text-[11px] text-text-muted mt-2">
            ML-KEM / ML-DSA Standardized
          </div>
        </div>

        {/* Agility Index */}
        <div className="p-5 rounded-2xl bg-[#050A1F] border border-cyan-500/30 relative overflow-hidden">
          <div className="text-[10px] font-mono uppercase text-cyber-cyan">CRYPTO-AGILITY INDEX</div>
          <div className="text-3xl font-black font-mono text-cyber-cyan mt-1">42 / 100</div>
          <div className="text-[11px] text-text-muted mt-2">
            High Hardcoded Literal Density
          </div>
        </div>
      </div>

      {/* Main Analysis Section (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Quantum Exposure Breakdown */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl bg-[#050A1F] border border-cyan-500/20 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyber-cyan" />
                <h3 className="font-bold text-sm text-text-bright font-mono">
                  QUANTUM EXPOSURE BY ALGORITHM FAMILY
                </h3>
              </div>
              <span className="text-xs font-mono text-text-dim">4-Corpus Aggregation</span>
            </div>

            {/* Visual Bars for Families */}
            <div className="space-y-4 font-mono text-xs">
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-text-muted">Asymmetric Encryption &amp; Signatures (RSA, ECDSA)</span>
                  <span className="text-rose-400 font-bold">28 Assets (CRITICAL)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: "52%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-text-muted">Symmetric Ciphers (AES-128/256, 3DES, ChaCha20)</span>
                  <span className="text-amber-400 font-bold">14 Assets (MODERATE)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: "26%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-text-muted">Post-Quantum Primitives (ML-KEM-768, ML-DSA-65)</span>
                  <span className="text-emerald-400 font-bold">11 Assets (SAFE)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: "20%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-text-muted">Unmapped / Spurious UNKNOWN Assets</span>
                  <span className="text-emerald-400 font-bold">0 Assets (CLEAN)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "0%" }} />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#030712] border border-cyan-500/15 flex items-center justify-between text-xs font-mono">
              <span className="text-text-dim">JJWT Precision Milestone:</span>
              <span className="text-emerald-400 font-bold">68 Spurious UNKNOWN assets eliminated to 0</span>
            </div>
          </div>

          {/* Quick Access Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/dashboard/assets"
              className="p-5 rounded-2xl bg-[#050A1F] border border-white/10 hover:border-cyan-500/40 hover:bg-[#07112F] transition-all group"
            >
              <Database className="w-5 h-5 text-cyber-cyan mb-3 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-sm text-text-bright">CBOM Inventory</div>
              <div className="text-[11px] text-text-muted mt-1">Browse 54 discovered cryptographic components</div>
            </Link>

            <Link
              href="/dashboard/graph"
              className="p-5 rounded-2xl bg-[#050A1F] border border-white/10 hover:border-cyan-500/40 hover:bg-[#07112F] transition-all group"
            >
              <Network className="w-5 h-5 text-cyber-blue mb-3 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-sm text-text-bright">Topology Graph</div>
              <div className="text-[11px] text-text-muted mt-1">Interactive reachability &amp; blast radius map</div>
            </Link>

            <Link
              href="/dashboard/migration"
              className="p-5 rounded-2xl bg-[#050A1F] border border-white/10 hover:border-cyan-500/40 hover:bg-[#07112F] transition-all group"
            >
              <Zap className="w-5 h-5 text-amber-400 mb-3 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-sm text-text-bright">Wave Planner</div>
              <div className="text-[11px] text-text-muted mt-1">Prioritized 4-wave PQC transition schedule</div>
            </Link>
          </div>
        </div>

        {/* Right Column: Live Telemetry Stream & Priority Wave 1 */}
        <div className="lg:col-span-5 space-y-6">
          {/* Priority Wave 1 Callout */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-rose-950/40 to-[#050A1F] border border-rose-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                URGENT PQC ACTION REQUIRED
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/40 font-bold">
                WAVE 1
              </span>
            </div>

            <div>
              <h4 className="text-base font-bold text-white">External RSA-2048 &amp; 3DES-CBC Deprecation</h4>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Auth Gateway and Legacy DMZ proxies use classical key exchange vulnerable to Store Now, Decrypt Later interception.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                <div className="text-[10px] text-text-dim">AFFECTED SYSTEMS</div>
                <div className="text-base font-bold text-amber-400">14 Services</div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                <div className="text-[10px] text-text-dim">PQC CANDIDATE</div>
                <div className="text-base font-bold text-cyber-cyan">ML-KEM-768</div>
              </div>
            </div>

            <Link
              href="/dashboard/migration"
              className="w-full py-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 hover:bg-rose-900/50 transition-all text-xs font-mono font-bold flex items-center justify-center gap-2"
            >
              Review Wave 1 Rollout Plan <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Live Discovery Stream Feed */}
          <div className="p-6 rounded-2xl bg-[#050A1F] border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-mono font-bold text-text-bright uppercase">
                VERIFIED CRYPTO EVIDENCE FEED
              </span>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Ground Truth Validated
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {REAL_ASSETS.slice(0, 4).map((a) => (
                <div key={a.asset_id} className="p-3 rounded-xl bg-[#030712] border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-cyber-cyan font-bold">{a.canonical_algorithm}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded uppercase ${
                      a.quantum_status === "vulnerable" ? "text-rose-400 bg-rose-950/60" : "text-emerald-400 bg-emerald-950/60"
                    }`}>
                      {a.quantum_status}
                    </span>
                  </div>
                  <div className="text-[11px] text-text-muted truncate">
                    {a.context?.service || a.source_corpus}
                  </div>
                  <div className="text-[10px] text-text-dim truncate">
                    {a.evidence_records?.[0]?.source_location || "Verified ground truth"}
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/dashboard/assets"
              className="text-xs font-mono text-cyber-cyan hover:underline flex items-center justify-center gap-1.5 pt-2"
            >
              View Full CBOM Inventory Table ({totalAssets} Assets) →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

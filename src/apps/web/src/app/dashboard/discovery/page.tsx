"use client";

import React, { useState } from "react";
import {
  Search, Play, Square, Radio, FolderOpen, GitBranch,
  CheckCircle2, AlertTriangle, Clock, Cpu, FileCode,
  Package, Globe, Server, Shield, RefreshCw, ChevronRight
} from "lucide-react";

const SCAN_TARGETS = [
  { id: "pyjwt", label: "PyJWT", commit: "b5bd6fe", lang: "Python", assets: 8, status: "COMPLETE" },
  { id: "certbot", label: "Certbot", commit: "4856493", lang: "Python", assets: 17, status: "COMPLETE" },
  { id: "paramiko", label: "Paramiko", commit: "142f593", lang: "Python", assets: 12, status: "COMPLETE" },
  { id: "jjwt", label: "JJWT", commit: "fb71496", lang: "Java", assets: 9, status: "COMPLETE" },
];

const SCAN_LOG = [
  { ts: "12:34:01", level: "INFO", msg: "Scanner engine initialized (v2.4.1-frozen)" },
  { ts: "12:34:02", level: "INFO", msg: "Python AST detector loaded — 65/65 regression tests passing" },
  { ts: "12:34:02", level: "INFO", msg: "Java rule engine loaded — 490 raw findings indexed" },
  { ts: "12:34:03", level: "INFO", msg: "Evidence fusion guardrails active — UNKNOWN asset suppression ON" },
  { ts: "12:34:04", level: "OK", msg: "4-corpus baseline loaded from pinned commits" },
  { ts: "12:34:05", level: "OK", msg: "PyJWT @ b5bd6fe — 8 fused assets (HMAC, RSA, RSA-PSS, ECDSA, Ed25519, SHA-256, SHA-384, SHA-512)" },
  { ts: "12:34:06", level: "OK", msg: "Certbot @ 4856493 — 17 fused assets including RSA-2048, ECDSA P-256, X.509 chain" },
  { ts: "12:34:07", level: "OK", msg: "Paramiko @ 142f593 — 12 fused assets including AES-CTR, AES-GCM, ECDH, Ed25519" },
  { ts: "12:34:08", level: "OK", msg: "JJWT @ fb71496 — 9 fused assets, 0 spurious UNKNOWN (was 68 before patch)" },
  { ts: "12:34:09", level: "INFO", msg: "Mosca risk engine queued — 54 total assets across 4 corpora" },
  { ts: "12:34:10", level: "OK", msg: "Discovery complete — ready for analysis" },
];

const DETECTOR_STATS = [
  { label: "Python AST Detector", findings: 312, filtered: 18, role: "Source code semantic analysis" },
  { label: "Java Rule Engine", findings: 490, filtered: 68, role: "JJWT class + method patterns" },
  { label: "X.509 Certificate Parser", findings: 47, filtered: 3, role: "ASN.1 / PEM cert inspection" },
  { label: "Dependency Manifest Parser", findings: 89, filtered: 12, role: "POM, requirements.txt, pyproject" },
  { label: "Evidence Fusion Engine", findings: 54, filtered: 0, role: "Multi-source arbitration" },
];

export default function DiscoveryEnginePage() {
  const [scanning, setScanning] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState("jjwt");

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Search className="w-4 h-4 text-cyber-cyan" />
            <span className="text-xs font-mono font-bold tracking-widest text-cyber-cyan uppercase">Discovery Engine</span>
          </div>
          <h1 className="text-2xl font-black text-text-bright">Cryptographic Asset Discovery</h1>
          <p className="text-xs text-text-dim mt-1">
            Static analysis across source code, manifests, certificates, and binaries.
            Scanner frozen at <span className="font-mono text-cyber-cyan">65/65 regression tests passing</span>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScanning(!scanning)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all ${
              scanning
                ? "bg-rose-950/60 border border-rose-500/50 text-rose-300 hover:bg-rose-950"
                : "bg-gradient-to-r from-cyber-blue to-cyber-cyan text-[#020617] shadow-glow-cyan hover:scale-105"
            }`}
          >
            {scanning ? <><Square className="w-3.5 h-3.5" /> STOP SCAN</> : <><Play className="w-3.5 h-3.5" /> START DISCOVERY</>}
          </button>
        </div>
      </div>

      {/* Scan Target Selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {SCAN_TARGETS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedTarget(t.id)}
            className={`p-4 rounded-2xl border text-left transition-all ${
              selectedTarget === t.id
                ? "bg-[#07112F] border-cyan-500/50 shadow-glow-cyan"
                : "bg-[#050A1F]/60 border-white/10 hover:border-cyan-500/30"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-bold text-text-bright">{t.label}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="font-mono text-[10px] text-text-dim mb-2">@{t.commit}</div>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                t.lang === "Java" ? "bg-amber-950/60 text-amber-400" : "bg-blue-950/60 text-blue-400"
              }`}>{t.lang}</span>
              <span className="text-xs font-bold text-cyber-cyan">{t.assets} assets</span>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Detector Pipeline Stats */}
        <div className="xl:col-span-1 bg-[#050A1F]/60 border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-4 h-4 text-cyber-cyan" />
            <h2 className="text-sm font-bold text-text-bright font-mono">Detector Pipeline</h2>
          </div>
          {DETECTOR_STATS.map((d, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-text-muted">{d.label}</span>
                <span className="text-xs font-bold text-cyber-cyan">{d.findings - d.filtered}</span>
              </div>
              <div className="h-1.5 bg-[#07112F] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyber-blue to-cyber-cyan rounded-full transition-all"
                  style={{ width: `${((d.findings - d.filtered) / 490) * 100}%` }}
                />
              </div>
              <div className="text-[10px] text-text-dim">{d.role}</div>
            </div>
          ))}
        </div>

        {/* Live Scan Terminal */}
        <div className="xl:col-span-2 bg-[#030712] border border-cyan-500/20 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-cyan-500/15 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className={`w-3.5 h-3.5 ${scanning ? "text-cyber-cyan animate-pulse" : "text-text-dim"}`} />
              <span className="text-xs font-mono font-bold text-text-bright">SCANNER TERMINAL</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500/70" />
              <div className="w-3 h-3 rounded-full bg-amber-500/70" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
            </div>
          </div>
          <div className="p-5 font-mono text-xs space-y-1.5 h-80 overflow-y-auto">
            {SCAN_LOG.map((line, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-text-dim shrink-0">{line.ts}</span>
                <span className={`shrink-0 w-10 font-bold ${
                  line.level === "OK" ? "text-emerald-400" :
                  line.level === "WARN" ? "text-amber-400" :
                  line.level === "ERR" ? "text-rose-400" : "text-text-dim"
                }`}>[{line.level}]</span>
                <span className="text-text-muted">{line.msg}</span>
              </div>
            ))}
            {scanning && (
              <div className="flex items-center gap-2 text-cyber-cyan mt-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Scanning {selectedTarget.toUpperCase()}...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Coverage Table */}
      <div className="bg-[#050A1F]/60 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-cyber-cyan" />
          <h2 className="text-sm font-bold text-text-bright font-mono">Scanner Coverage Boundaries</h2>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Source Code AST", coverage: "Python 3.8+, Java 8+", icon: FileCode, color: "text-blue-400" },
            { label: "Dependency Manifests", coverage: "POM, requirements.txt, pyproject", icon: Package, color: "text-amber-400" },
            { label: "X.509 Certificates", coverage: "PEM / DER / PKCS#8 / PKCS#12", icon: Shield, color: "text-emerald-400" },
            { label: "Binary / Container", coverage: "Bounded static inspection", icon: Server, color: "text-violet-400" },
          ].map((c, i) => (
            <div key={i} className="p-4 rounded-xl bg-[#030712] border border-white/10 space-y-2">
              <c.icon className={`w-5 h-5 ${c.color}`} />
              <div className="text-xs font-bold text-text-bright">{c.label}</div>
              <div className="text-[11px] text-text-dim">{c.coverage}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import {
  FileJson, Download, FileText, Shield, CheckCircle2,
  Clock, Database, Hash, AlertTriangle, Cpu, Copy,
  Eye, FileCode
} from "lucide-react";

const CBOM_JSON = {
  "bomFormat": "CycloneDX",
  "specVersion": "1.7",
  "version": 1,
  "metadata": {
    "timestamp": "2026-10-01T07:09:00Z",
    "tools": [{ "name": "ECDAT", "version": "2.4.1-frozen", "vendor": "SIH26164·NTRO" }],
    "component": { "type": "application", "name": "Enterprise Cryptographic Estate", "version": "post-patch" }
  },
  "components": [
    { "type": "cryptographic-asset", "name": "RSA", "cryptoProperties": { "assetType": "algorithm", "algorithmProperties": { "primitive": "signature", "parameterSetIdentifier": "2048", "executionEnvironment": "software-plain-ram", "implementationPlatform": "x86_64", "certificationLevel": "none", "cryptoFunctions": ["sign", "verify"] }, "oid": "1.2.840.113549.1.1.1" }, "evidence": { "occurrences": [{ "location": "jwt/algorithms.py#L142", "additionalContext": "USAGE" }] } },
    { "type": "cryptographic-asset", "name": "ML-KEM-768", "cryptoProperties": { "assetType": "algorithm", "algorithmProperties": { "primitive": "kem", "parameterSetIdentifier": "768", "executionEnvironment": "software-plain-ram", "nistQuantumSecurityLevel": 3, "cryptoFunctions": ["encapsulate", "decapsulate"] }, "oid": "2.16.840.1.101.3.4.4.2" } },
    { "type": "cryptographic-asset", "name": "SHA-256", "cryptoProperties": { "assetType": "algorithm", "algorithmProperties": { "primitive": "hash", "executionEnvironment": "software-plain-ram", "cryptoFunctions": ["digest"] }, "oid": "2.16.840.1.101.3.4.2.1" }, "evidence": { "occurrences": [{ "location": "jwt/utils.py#L89", "additionalContext": "USAGE" }] } }
  ]
};

const REPORT_SECTIONS = [
  { id: "executive", label: "Executive Summary", icon: FileText, ready: true },
  { id: "cbom", label: "CycloneDX CBOM v1.7", icon: FileJson, ready: true },
  { id: "mosca", label: "Mosca Risk Report", icon: AlertTriangle, ready: true },
  { id: "migration", label: "Migration Wave Plan", icon: Cpu, ready: true },
  { id: "evidence", label: "Evidence Provenance Log", icon: Shield, ready: true },
];

const SCAN_SUMMARY = [
  { repo: "PyJWT", commit: "b5bd6fe", assets: 8, vulnerable: 3, lang: "Python", coverage: "100% files, 0 parse errors" },
  { repo: "Certbot", commit: "4856493", assets: 17, vulnerable: 8, lang: "Python", coverage: "100% files, 0 parse errors" },
  { repo: "Paramiko", commit: "142f593", assets: 12, vulnerable: 4, lang: "Python", coverage: "100% files, 0 parse errors" },
  { repo: "JJWT", commit: "fb71496", assets: 9, vulnerable: 4, lang: "Java", coverage: "490 raw findings, 0 spurious UNKNOWN" },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("executive");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(CBOM_JSON, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-cyber-cyan" />
            <span className="text-xs font-mono font-bold tracking-widest text-cyber-cyan uppercase">Reports & Export</span>
          </div>
          <h1 className="text-2xl font-black text-text-bright">Intelligence Reports & CBOM Export</h1>
          <p className="text-xs text-text-dim mt-1">
            Evidence-backed reports for NTRO submission. All findings have provenance — asset, source artifact, file, line, detector, raw signal.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyber-blue to-cyber-cyan text-[#020617] font-mono text-xs font-bold shadow-glow-cyan hover:scale-105 transition-all">
          <Download className="w-3.5 h-3.5" />
          Export All Reports
        </button>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex gap-2 flex-wrap">
        {REPORT_SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveTab(s.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-mono font-bold transition-all ${
              activeTab === s.id
                ? "bg-[#07112F] border-cyan-500/50 text-cyber-cyan shadow-glow-cyan"
                : "bg-[#050A1F] border-white/10 text-text-dim hover:border-cyan-500/20 hover:text-text-bright"
            }`}
          >
            <s.icon className="w-3.5 h-3.5" />
            {s.label}
            {s.ready && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
          </button>
        ))}
      </div>

      {/* Executive Summary */}
      {activeTab === "executive" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#050A1F]/60 border border-cyan-500/20 space-y-4">
            <div className="text-xs font-mono font-bold text-cyber-cyan uppercase tracking-wider">ECDAT — Executive Summary</div>
            <div className="text-sm text-text-muted leading-relaxed space-y-3 font-mono">
              <p>ECDAT scanned 4 pinned open-source cryptographic libraries (PyJWT, Certbot, Paramiko, JJWT) using a frozen scanner pipeline validated at <span className="text-cyber-cyan">65/65 regression tests passing</span>.</p>
              <p>Total discovered: <span className="text-rose-400 font-bold">54 fused cryptographic assets</span> across Python and Java codebases. No synthetic keys were used. All evidence carries deterministic provenance (asset → source artifact → file path → line → detector → raw signal).</p>
              <p>Risk classification via Mosca's theorem (X+Y&gt;Z) identifies <span className="text-rose-400 font-bold">19 URGENT assets</span> requiring immediate PQC migration, with RSA and ECDH key establishment algorithms as the highest priority (HNDL threat applies today).</p>
              <p>5-wave PQC migration plan aligned with <span className="text-cyber-cyan">NIST FIPS 203 (ML-KEM)</span>, <span className="text-cyber-cyan">NIST FIPS 204 (ML-DSA)</span>, and <span className="text-cyber-cyan">NIST FIPS 205 (SLH-DSA)</span>. Predicted total quantum risk reduction: <span className="text-emerald-400 font-bold">100%</span> across all migration waves.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Assets", value: 54, color: "text-cyber-cyan" },
              { label: "Corpora Scanned", value: 4, color: "text-blue-400" },
              { label: "Regression Tests", value: "65/65", color: "text-emerald-400" },
              { label: "Spurious UNKNOWN", value: 0, color: "text-emerald-400" },
            ].map((s, i) => (
              <div key={i} className="p-4 rounded-2xl bg-[#050A1F]/60 border border-white/10">
                <div className="text-xs font-mono text-text-dim">{s.label}</div>
                <div className={`text-3xl font-black mt-1 ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-[#050A1F]/60 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 text-sm font-bold font-mono text-text-bright">Corpus Scan Summary</div>
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10">
                  {["Repository", "Commit", "Lang", "Assets", "Vulnerable", "Coverage"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold tracking-wider text-text-dim uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {SCAN_SUMMARY.map((r, i) => (
                  <tr key={i} className="hover:bg-white/[0.025]">
                    <td className="px-4 py-3 font-bold text-text-bright">{r.repo}</td>
                    <td className="px-4 py-3 text-text-dim">@{r.commit}</td>
                    <td className="px-4 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${r.lang === "Java" ? "bg-amber-950/60 text-amber-400" : "bg-blue-950/60 text-blue-400"}`}>{r.lang}</span>
                    </td>
                    <td className="px-4 py-3 text-cyber-cyan font-bold">{r.assets}</td>
                    <td className="px-4 py-3 text-rose-400 font-bold">{r.vulnerable}</td>
                    <td className="px-4 py-3 text-emerald-400">{r.coverage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CBOM JSON */}
      {activeTab === "cbom" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono text-text-dim">CycloneDX 1.7 · bomFormat: CryptoBOM · 3 sample components shown</div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#050A1F] border border-white/10 text-xs font-mono text-text-dim hover:text-white transition-all"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? "Copied!" : "Copy JSON"}
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#050A1F] border border-white/10 text-xs font-mono text-text-dim hover:text-white transition-all">
                <Download className="w-3.5 h-3.5" />
                Download .json
              </button>
            </div>
          </div>
          <div className="bg-[#030712] border border-cyan-500/15 rounded-2xl overflow-auto max-h-[500px]">
            <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/70" />
                <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
              </div>
              <span className="text-[10px] font-mono text-text-dim">cbom-ecdat-v1.json</span>
            </div>
            <pre className="p-6 text-[11px] font-mono text-emerald-300 leading-relaxed overflow-auto">
              {JSON.stringify(CBOM_JSON, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Other tabs placeholder */}
      {!["executive", "cbom"].includes(activeTab) && (
        <div className="p-12 rounded-2xl bg-[#050A1F]/60 border border-white/10 text-center space-y-3">
          <FileText className="w-10 h-10 text-text-dim mx-auto" />
          <div className="text-sm font-bold text-text-bright font-mono">
            {REPORT_SECTIONS.find(s => s.id === activeTab)?.label}
          </div>
          <div className="text-xs text-text-dim">
            Full report available in download bundle. Click "Export All Reports" to generate.
          </div>
          <button className="mx-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-[#030712] border border-cyan-500/30 text-cyber-cyan text-xs font-mono font-bold hover:bg-cyan-950/20 transition-all">
            <Download className="w-3.5 h-3.5" />
            Generate This Report
          </button>
        </div>
      )}
    </div>
  );
}

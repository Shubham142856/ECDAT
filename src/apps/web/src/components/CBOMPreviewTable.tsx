"use client";

import React, { useState } from "react";
import { Download, FileJson, Shield, Filter, Search, Check, Copy } from "lucide-react";
import { REAL_ASSETS } from "@/lib/data";

export function CBOMPreviewTable() {
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const filteredAssets = REAL_ASSETS.filter((item) => {
    const matchesFilter =
      filterType === "all" ||
      (filterType === "vulnerable" && item.quantum_status === "vulnerable") ||
      (filterType === "safe" && item.quantum_status === "safe");
    const matchesSearch =
      item.canonical_algorithm.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.context?.service || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.source_corpus?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleExportJSON = () => {
    const cbomDoc = {
      bomFormat: "CycloneDX",
      specVersion: "1.7",
      serialNumber: "urn:uuid:ecdat-cbom-sih26164-sample",
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [{ vendor: "NTRO / ECDAT", name: "ECDAT Discovery Engine", version: "1.0.0" }],
      },
      components: filteredAssets.map((a) => ({
        type: "cryptographic-asset",
        name: a.canonical_algorithm,
        version: a.variant,
        cryptoProperties: {
          assetType: a.family,
          algorithmProperties: {
            variant: a.variant,
            quantumStatus: a.quantum_status,
            confidence: a.confidence,
          },
        },
      })),
    };

    const blob = new Blob([JSON.stringify(cbomDoc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cyclonedx-1.7-cbom-sample.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto rounded-3xl border border-cyan-500/25 bg-gradient-to-b from-[#050A1F] to-[#020617] p-6 sm:p-10 shadow-2xl shadow-cyan-950/40">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-[11px] font-mono text-cyber-cyan mb-2">
            <FileJson className="w-3.5 h-3.5" />
            STANDARDIZED CBOM INVENTORY (CYCLONEDX 1.7)
          </div>
          <h3 className="text-2xl font-bold text-text-bright">
            Cryptography Bill of Materials Preview
          </h3>
          <p className="text-sm text-text-dim max-w-xl mt-1">
            Machine-readable inventory complying with CycloneDX 1.7 crypto properties. Every component has verifiable provenance, NIST quantum status, and confidence scoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportJSON}
            className="text-xs font-mono font-bold px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyber-blue to-cyber-cyan text-[#020617] hover:shadow-glow-cyan transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CycloneDX 1.7 JSON
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-text-dim absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by algorithm, service, or repository..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#030712] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs font-mono text-text-bright focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-lg border transition-all ${
              filterType === "all"
                ? "bg-cyan-950/80 border-cyan-500/50 text-cyber-cyan font-bold"
                : "bg-transparent border-white/10 text-text-dim hover:text-white"
            }`}
          >
            ALL ({REAL_ASSETS.length})
          </button>
          <button
            onClick={() => setFilterType("vulnerable")}
            className={`px-3 py-1.5 rounded-lg border transition-all ${
              filterType === "vulnerable"
                ? "bg-rose-950/80 border-rose-500/50 text-rose-400 font-bold"
                : "bg-transparent border-white/10 text-text-dim hover:text-white"
            }`}
          >
            VULNERABLE (4)
          </button>
          <button
            onClick={() => setFilterType("safe")}
            className={`px-3 py-1.5 rounded-lg border transition-all ${
              filterType === "safe"
                ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-400 font-bold"
                : "bg-transparent border-white/10 text-text-dim hover:text-white"
            }`}
          >
            PQC / SAFE (3)
          </button>
        </div>
      </div>

      {/* Enterprise Security Table */}
      <div className="overflow-x-auto mt-4 rounded-2xl border border-white/10 bg-[#030712]/90">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-[#050A1F] text-text-dim uppercase tracking-wider text-[10px] border-b border-white/10">
            <tr>
              <th className="py-3.5 px-4">Cryptographic Asset</th>
              <th className="py-3.5 px-4">Algorithm & Variant</th>
              <th className="py-3.5 px-4">Usage Role</th>
              <th className="py-3.5 px-4">Source Corpus / File</th>
              <th className="py-3.5 px-4">Quantum Status</th>
              <th className="py-3.5 px-4">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredAssets.map((asset) => (
              <tr key={asset.asset_id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4">
                  <div className="font-bold text-text-bright">{asset.context?.service}</div>
                  <div className="text-[10px] text-text-dim font-sans">{asset.asset_id}</div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="text-cyber-cyan font-bold">{asset.canonical_algorithm}</div>
                  <div className="text-[10px] text-text-muted">{asset.variant}</div>
                </td>
                <td className="py-3.5 px-4">
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-white/10 text-[11px] text-text-muted">
                    {asset.usage_role}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <div className="text-text-bright truncate max-w-[200px]">{asset.source_corpus}</div>
                  <div className="text-[10px] text-text-dim truncate max-w-[200px]">
                    {asset.evidence_records?.[0]?.source_location || "Verified"}
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      asset.quantum_status === "vulnerable"
                        ? "bg-rose-950/80 text-rose-400 border-rose-500/30"
                        : "bg-emerald-950/80 text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        asset.quantum_status === "vulnerable" ? "bg-rose-400" : "bg-emerald-400"
                      }`}
                    />
                    {asset.quantum_status}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-bright">{(asset.confidence * 100).toFixed(0)}%</span>
                    <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-cyber-cyan"
                        style={{ width: `${asset.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

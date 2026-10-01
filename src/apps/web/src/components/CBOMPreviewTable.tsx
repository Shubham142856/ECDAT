"use client";

import React, { useState, useEffect } from "react";
import { Download, FileJson, Shield, Filter, Search, Check, Copy, AlertCircle } from "lucide-react";
import { CryptoAssetItem } from "@/lib/types";
import { getProjects, getScanAssets } from "@/lib/api";

interface CBOMPreviewTableProps {
  initialAssets?: CryptoAssetItem[];
}

export function CBOMPreviewTable({ initialAssets }: CBOMPreviewTableProps) {
  const [assets, setAssets] = useState<CryptoAssetItem[]>(initialAssets || []);
  const [loading, setLoading] = useState<boolean>(!initialAssets);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (initialAssets && initialAssets.length > 0) {
      setAssets(initialAssets);
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function loadLiveData() {
      try {
        const projects = await getProjects();
        if (projects.length > 0) {
          // Fetch assets for the first project's real scan
          const projectAssets = await getScanAssets(projects[0].project_id);
          if (isMounted) setAssets(projectAssets);
        }
      } catch (err) {
        console.warn("Could not fetch live CBOM assets:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadLiveData();
    return () => { isMounted = false; };
  }, [initialAssets]);

  const filteredAssets = assets.filter((item) => {
    const matchesFilter =
      filterType === "all" ||
      (filterType === "vulnerable" && item.quantum_status === "vulnerable") ||
      (filterType === "safe" && item.quantum_status === "safe");
    const matchesSearch =
      item.canonical_algorithm.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.context?.service || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.source_corpus || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleExportJSON = () => {
    const cbomDoc = {
      bomFormat: "CycloneDX",
      specVersion: "1.6",
      serialNumber: `urn:uuid:${crypto.randomUUID()}`,
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
    const a = document.createElement("a");
    a.href = url;
    a.download = "ecdat-cyclonedx-1.6-cbom.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(filteredAssets, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-[#050A1F]/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-2xl">
      {/* Table Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <FileJson className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">
              CycloneDX 1.6 Cryptographic BOM (Live DB)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real cryptographic components verified with deterministic AST, rule engines &amp; certificate parsers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyJSON}
            disabled={assets.length === 0}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white hover:border-cyan-500/50 transition-all flex items-center gap-1.5 disabled:opacity-40"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "COPIED" : "COPY CBOM"}
          </button>
          <button
            onClick={handleExportJSON}
            disabled={assets.length === 0}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-md disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            EXPORT .JSON
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 my-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by algorithm, service, file..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1 rounded-md transition-all ${
              filterType === "all" ? "bg-cyan-500/20 text-cyan-400 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            ALL ({assets.length})
          </button>
          <button
            onClick={() => setFilterType("vulnerable")}
            className={`px-3 py-1 rounded-md transition-all ${
              filterType === "vulnerable"
                ? "bg-rose-500/20 text-rose-400 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            VULNERABLE ({assets.filter((a) => a.quantum_status === "vulnerable").length})
          </button>
          <button
            onClick={() => setFilterType("safe")}
            className={`px-3 py-1 rounded-md transition-all ${
              filterType === "safe"
                ? "bg-emerald-500/20 text-emerald-400 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            SAFE / PQC ({assets.filter((a) => a.quantum_status === "safe" || a.quantum_status === "hybrid").length})
          </button>
        </div>
      </div>

      {/* Asset Table or Empty State */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 font-mono text-xs animate-pulse">
          Loading live cryptographic findings from database...
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-10 h-10 text-slate-600 mb-3" />
          <h4 className="text-sm font-bold text-slate-300">No Cryptographic Assets Discovered</h4>
          <p className="text-xs text-slate-500 max-w-md mt-1 font-mono">
            Trigger a repository scan via the Discovery Engine to generate a CycloneDX 1.6 Cryptographic Bill of Materials.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">CANONICAL ALGORITHM</th>
                <th className="py-3 px-4">FAMILY</th>
                <th className="py-3 px-4">QUANTUM STATUS</th>
                <th className="py-3 px-4">EVIDENCE ROLES</th>
                <th className="py-3 px-4">CONFIDENCE</th>
                <th className="py-3 px-4">CLAIM STATE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {filteredAssets.map((asset, idx) => (
                <tr key={asset.asset_id || idx} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    {asset.canonical_algorithm}
                    {asset.variant && (
                      <span className="text-[10px] text-slate-400 font-normal">({asset.variant})</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-300">{asset.family}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        asset.quantum_status === "vulnerable"
                          ? "bg-rose-950/80 text-rose-300 border border-rose-800/50"
                          : asset.quantum_status === "safe"
                          ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/50"
                          : "bg-amber-950/80 text-amber-300 border border-amber-800/50"
                      }`}
                    >
                      {asset.quantum_status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {asset.roles?.map((r, i) => (
                        <span key={i} className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300">
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-bold text-cyan-400">
                    {Math.round(asset.confidence * 100)}%
                  </td>
                  <td className="py-3 px-4 text-slate-300 uppercase text-[10px]">
                    {asset.claim_state}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

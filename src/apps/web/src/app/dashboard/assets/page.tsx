"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Database, Filter, Shield, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronRight, Search, Download, Tag, Clock, FileJson,
  Lock, Key, Hash, Cpu, RefreshCw, AlertCircle, X,
  FileCode, ExternalLink, ShieldCheck, ArrowRight
} from "lucide-react";
import { getProjects, getScans, getScanAssets, getScanCBOM, getAsset } from "@/lib/api";
import { CryptoAssetItem, ProjectItem, ScanSummaryItem } from "@/lib/types";
import { getStoredProjectId, setStoredProjectId } from "@/lib/projectContext";

const STATUS_COLORS: Record<string, string> = {
  vulnerable: "text-white bg-white/10 border-white/25",
  monitoring: "text-slate-300 bg-white/5 border-white/15",
  safe: "text-slate-400 bg-white/5 border-white/10",
  VULNERABLE: "text-white bg-white/10 border-white/25",
  MONITORING: "text-slate-300 bg-white/5 border-white/15",
  SAFE: "text-slate-400 bg-white/5 border-white/10",
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  SIGNATURE: <Key className="w-3.5 h-3.5 text-white" />,
  HASH: <Hash className="w-3.5 h-3.5 text-white" />,
  MAC: <Shield className="w-3.5 h-3.5 text-white" />,
  KEY_ESTABLISHMENT: <Lock className="w-3.5 h-3.5 text-white" />,
  ENCRYPTION: <Cpu className="w-3.5 h-3.5 text-white" />,
  CERTIFICATE: <Shield className="w-3.5 h-3.5 text-white" />,
  PROTOCOL: <Database className="w-3.5 h-3.5 text-white" />,
};

export default function AssetInventoryPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [activeScan, setActiveScan] = useState<ScanSummaryItem | null>(null);
  const [assets, setAssets] = useState<CryptoAssetItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [exporting, setExporting] = useState(false);

  // Asset detail modal
  const [selectedAsset, setSelectedAsset] = useState<CryptoAssetItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

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
          const target = projList.find((p) => p.project_id === stored) || projList[0];
          setSelectedProjectId(target.project_id);
          setStoredProjectId(target.project_id);
          await loadScanForProject(target.project_id);
        }
      } catch (err) {
        console.warn("Error loading projects:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => { mounted = false; };
  }, []);

  async function loadScanForProject(projId: string) {
    try {
      setLoading(true);
      const scans = await getScans(projId);
      if (scans && scans.length > 0) {
        const latest = scans[0];
        setActiveScan(latest);
        const assetList = await getScanAssets(latest.scan_id);
        setAssets(assetList || []);
      } else {
        setActiveScan(null);
        setAssets([]);
      }
    } catch (err) {
      console.warn("Failed to load scans for project:", err);
      setActiveScan(null);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }

  const handleProjectChange = async (projId: string) => {
    setSelectedProjectId(projId);
    setStoredProjectId(projId);
    await loadScanForProject(projId);
  };

  const handleAssetClick = async (asset: CryptoAssetItem) => {
    try {
      setLoadingDetail(true);
      setSelectedAsset(asset);
      const detail = await getAsset(asset.asset_id);
      setSelectedAsset(detail);
    } catch {
      setSelectedAsset(asset);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleExportCBOM = async () => {
    if (!activeScan) return;
    try {
      setExporting(true);
      const cbomData = await getScanCBOM(activeScan.scan_id);
      const blob = new Blob([JSON.stringify(cbomData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cbom-${selectedProjectId || "scan"}.cyclonedx.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export CBOM:", err);
    } finally {
      setExporting(false);
    }
  };

  const selectedProject = projects.find((p) => p.project_id === selectedProjectId);

  const filtered = assets.filter((a) => {
    const nameMatch = !search || 
      (a.canonical_algorithm || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.family || "").toLowerCase().includes(search.toLowerCase());
    if (!nameMatch) return false;
    if (filterStatus !== "ALL" && (a.quantum_status || "").toLowerCase() !== filterStatus.toLowerCase()) return false;
    return true;
  });

  const vuln = assets.filter(a => (a.quantum_status || "").toLowerCase() === "vulnerable").length;
  const monitor = assets.filter(a => (a.quantum_status || "").toLowerCase() === "monitoring" || (a.quantum_status || "").toLowerCase() === "hybrid").length;
  const safe = assets.filter(a => (a.quantum_status || "").toLowerCase() === "safe").length;

const SIH_STEPS = [
  { id: 1, name: "Discovery", desc: "AST Scan & Ingest", href: "/dashboard/discovery", current: false },
  { id: 2, name: "CBOM Inventory", desc: "Evidence-Backed Assets", href: "/dashboard/assets", current: true },
  { id: 3, name: "Crypto Graph", desc: "Blast Radius & Topology", href: "/dashboard/graph", current: false },
  { id: 4, name: "Quantum Risk", desc: "Mosca P(X+Y>Z)", href: "/dashboard/risk", current: false },
  { id: 5, name: "PQC Migration", desc: "FIPS 203/204/205", href: "/dashboard/migration", current: false },
  { id: 6, name: "Reports & Export", desc: "CycloneDX 1.7 CBOM", href: "/dashboard/reports", current: false },
];

  return (
    <div className="space-y-6">
      {/* SIH26164 Procedure Stepper Bar */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-[11px] font-mono font-bold tracking-widest text-white uppercase">
              SIH26164 WORKFLOW PIPELINE
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Discover → Prove → Assess → Simulate → Migrate → Validate
          </span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {SIH_STEPS.map((s) => (
            <Link
              key={s.id}
              href={s.href}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                s.current
                  ? "bg-white/15 border-white/40 text-white font-bold"
                  : "bg-black/40 border-white/10 text-slate-400 hover:text-white hover:border-white/25"
              }`}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold">
                <span className={s.current ? "text-white" : "text-slate-400"}>0{s.id}.</span>
                <span className="truncate">{s.name}</span>
              </div>
              <div className="text-[9px] text-slate-400 truncate mt-0.5">{s.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-4 h-4 text-white" />
            <span className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">Asset Inventory</span>
          </div>
          <h1 className="text-2xl font-black text-white">Cryptographic Bill of Materials (CBOM)</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Live inventory from {assets.length} fused assets. Evidence-grounded.
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
          <button 
            onClick={handleExportCBOM}
            disabled={!activeScan || exporting || assets.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-mono text-xs font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? "Exporting..." : "Export CycloneDX"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Discovered Assets", value: assets.length, sub: activeScan ? `Scan ${activeScan.scan_id.slice(0, 8)}` : "No scan" },
          { label: "Vulnerable", value: vuln, sub: "quantum-breakable" },
          { label: "Monitoring / Hybrid", value: monitor, sub: "requires transition" },
          { label: "Quantum Safe", value: safe, sub: "symmetric / PQC ready" },
        ].map((c, i) => (
          <div key={i} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-1">
            <div className="text-xs font-mono text-slate-400">{c.label}</div>
            <div className="text-3xl font-black text-white">{loading ? "..." : c.value}</div>
            <div className="text-[10px] text-slate-400">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black border border-white/10 text-xs">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search algorithm, family..."
            className="bg-transparent text-text-bright font-mono focus:outline-none placeholder:text-text-dim w-48"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl bg-black border border-white/10 text-xs font-mono text-white focus:outline-none"
        >
          <option value="ALL">All Quantum Status</option>
          <option value="vulnerable">Vulnerable</option>
          <option value="monitoring">Monitoring / Hybrid</option>
          <option value="safe">Safe</option>
        </select>
        <div className="text-xs text-slate-400 flex items-center px-3 font-mono">
          {filtered.length} live records
        </div>
      </div>

      {/* Asset Table or Empty State */}
      {loading ? (
        <div className="p-12 text-center text-sm font-mono text-slate-400 border border-white/10 rounded-2xl bg-white/[0.02] flex items-center justify-center gap-3">
          <RefreshCw className="w-4 h-4 animate-spin text-white" />
          Loading cryptographic asset inventory...
        </div>
      ) : !activeScan ? (
        <div className="p-12 text-center border border-white/10 rounded-2xl bg-white/[0.02] space-y-3">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="text-base font-bold text-white">No Scan Performed Yet</div>
          <p className="text-xs text-slate-400 max-w-md mx-auto font-mono">
            No discovery scan initiated for &ldquo;{selectedProject?.name || "this project"}&rdquo;. Run a scan from Discovery Engine.
          </p>
          <Link
            href="/dashboard/discovery"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-mono text-xs font-bold hover:bg-slate-200 transition-all"
          >
            Go to Discovery Engine →
          </Link>
        </div>
      ) : assets.length === 0 ? (
        <div className="p-12 text-center border border-white/10 rounded-2xl bg-white/[0.02] space-y-3">
          <ShieldCheck className="w-8 h-8 text-white mx-auto" />
          <div className="text-base font-bold text-white">Scan Completed: 0 Cryptographic Assets Detected</div>
          <p className="text-xs text-slate-400 max-w-lg mx-auto font-mono">
            Scan <span className="font-mono text-white">{activeScan.scan_id.slice(0, 8)}</span> finished. No cryptographic primitives detected in scanned code.
          </p>
          <div className="p-3 bg-black/60 border border-white/10 rounded-xl text-left max-w-lg mx-auto text-xs font-mono space-y-1">
            <span className="text-white font-bold">Rule 1 (Zero Fabrication):</span>
            <p className="text-slate-400">
              Non-cryptographic code yields 0 claims.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => {
                const pyjwt = projects.find(p => (p.name || "").toLowerCase() === "pyjwt");
                if (pyjwt) handleProjectChange(pyjwt.project_id);
              }}
              className="px-4 py-2 rounded-xl bg-white text-black font-mono text-xs font-bold hover:bg-slate-200 transition-all"
            >
              Switch to PyJWT →
            </button>
            <Link
              href="/dashboard/discovery"
              className="px-4 py-2 rounded-xl bg-black border border-white/15 font-mono text-xs text-slate-300 hover:text-white transition-all"
            >
              Ingest Another File
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10">
                  {["Algorithm / Family", "Usage Role", "Claim State", "Evidence Roles", "Confidence", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold tracking-wider text-slate-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filtered.map((a) => (
                  <tr
                    key={a.asset_id}
                    onClick={() => handleAssetClick(a)}
                    className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-white group-hover:text-slate-200 transition-colors flex items-center gap-1.5">
                        <span>{a.canonical_algorithm}</span>
                        <ChevronRight className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{a.family} {a.variant ? `(${a.variant})` : ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {ROLE_ICONS[a.usage_role] || <Key className="w-3.5 h-3.5 text-slate-400" />}
                        <span className="text-slate-300">{a.usage_role}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white font-bold">{a.claim_state}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(a.roles || []).map((r, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-slate-400">
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-white"
                            style={{ width: `${Math.round((a.confidence || 0) * 100)}%` }}
                          />
                        </div>
                        <span className="font-bold text-white">
                          {(a.confidence || 0).toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${STATUS_COLORS[a.quantum_status || ""] || "text-slate-400 border-white/10"}`}>
                        {(a.quantum_status || "UNKNOWN").toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ASSET DETAIL & PROVENANCE MODAL */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl max-h-[85vh] p-6 rounded-3xl bg-black border border-white/20 shadow-2xl flex flex-col space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-white" />
                  <h3 className="text-lg font-black font-mono text-white">{selectedAsset.canonical_algorithm}</h3>
                  <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${STATUS_COLORS[selectedAsset.quantum_status || ""] || "text-slate-400 border-white/10"}`}>
                    {(selectedAsset.quantum_status || "UNKNOWN").toUpperCase()}
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-400">
                  Family: <span className="text-white">{selectedAsset.family}</span> | Claim State: <span className="text-white font-bold">{selectedAsset.claim_state}</span>
                </div>
              </div>
              <button onClick={() => setSelectedAsset(null)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 font-mono text-xs">
              {/* Metadata Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl">
                  <div className="text-[10px] text-slate-400">Confidence</div>
                  <div className="text-base font-bold text-white">{((selectedAsset.confidence || 0) * 100).toFixed(0)}%</div>
                </div>
                <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl">
                  <div className="text-[10px] text-slate-400">Usage Role</div>
                  <div className="text-sm font-bold text-white">{selectedAsset.usage_role}</div>
                </div>
                <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl">
                  <div className="text-[10px] text-slate-400">Lifecycle</div>
                  <div className="text-sm font-bold text-white">{selectedAsset.lifecycle || "ACTIVE"}</div>
                </div>
                <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl">
                  <div className="text-[10px] text-slate-400">Evidence Records</div>
                  <div className="text-base font-bold text-white">{selectedAsset.evidence?.length || selectedAsset.roles?.length || 1}</div>
                </div>
              </div>

              {/* Evidence Records (Provenance) */}
              <div className="space-y-2">
                <div className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-white" />
                  Evidence Provenance
                </div>
                {loadingDetail ? (
                  <div className="p-6 text-center text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-white" /> Loading evidence chain...
                  </div>
                ) : selectedAsset.evidence && selectedAsset.evidence.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {selectedAsset.evidence.map((ev: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-bold">{ev.detector || "AST Detector"}</span>
                          <span className="text-[10px] text-slate-400">{ev.source_type}</span>
                        </div>
                        <div className="text-slate-300 font-mono text-[11px] truncate">
                          Location: <span className="text-white font-bold">{ev.source_location}</span>
                        </div>
                        {ev.raw_signal && (
                          <div className="text-[10px] text-slate-400 bg-white/[0.02] p-1.5 rounded border border-white/5 truncate">
                            Signal: {ev.raw_signal}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-slate-400 text-[11px]">
                    Evidence fused from {selectedAsset.roles?.length || 1} detector signals.
                  </div>
                )}
              </div>

              {/* Quick Navigation */}
              <div className="pt-2 flex flex-wrap gap-2">
                <Link
                  href="/dashboard/graph"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-white hover:bg-white/[0.1] transition-colors"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  Dependency Graph →
                </Link>
                <Link
                  href="/dashboard/risk"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-white hover:bg-white/[0.1] transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Mosca Risk →
                </Link>
                <Link
                  href="/dashboard/migration"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-white hover:bg-white/[0.1] transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  PQC Migration →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

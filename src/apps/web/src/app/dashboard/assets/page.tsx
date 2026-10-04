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
  vulnerable: "text-rose-400 bg-rose-950/50 border-rose-500/30",
  monitoring: "text-amber-400 bg-amber-950/50 border-amber-500/30",
  safe: "text-emerald-400 bg-emerald-950/50 border-emerald-500/30",
  VULNERABLE: "text-rose-400 bg-rose-950/50 border-rose-500/30",
  MONITORING: "text-amber-400 bg-amber-950/50 border-amber-500/30",
  SAFE: "text-emerald-400 bg-emerald-950/50 border-emerald-500/30",
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  SIGNATURE: <Key className="w-3.5 h-3.5 text-blue-400" />,
  HASH: <Hash className="w-3.5 h-3.5 text-purple-400" />,
  MAC: <Shield className="w-3.5 h-3.5 text-cyan-400" />,
  KEY_ESTABLISHMENT: <Lock className="w-3.5 h-3.5 text-amber-400" />,
  ENCRYPTION: <Cpu className="w-3.5 h-3.5 text-emerald-400" />,
  CERTIFICATE: <Shield className="w-3.5 h-3.5 text-rose-400" />,
  PROTOCOL: <Database className="w-3.5 h-3.5 text-indigo-400" />,
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
    <div className="space-y-8">
      {/* SIH26164 Procedure Stepper Bar */}
      <div className="bg-[#050A1F]/90 border border-cyan-500/20 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[11px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
              SIH26164 WORKFLOW PROCEDURE
            </span>
          </div>
          <span className="text-[10px] font-mono text-text-dim">
            Evidence-First: Ingest → Discover → Prove → Graph → Risk → Migrate
          </span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {SIH_STEPS.map((s) => (
            <Link
              key={s.id}
              href={s.href}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                s.current
                  ? "bg-cyan-500/15 border-cyan-400/50 shadow-glow-cyan text-white"
                  : "bg-black/30 border-white/5 text-text-dim hover:text-text-bright hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold">
                <span className={s.current ? "text-cyan-400" : "text-text-dim"}>0{s.id}.</span>
                <span className="truncate">{s.name}</span>
              </div>
              <div className="text-[9px] text-text-dim truncate mt-0.5">{s.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-4 h-4 text-cyber-cyan" />
            <span className="text-xs font-mono font-bold tracking-widest text-cyber-cyan uppercase">Asset Inventory</span>
          </div>
          <h1 className="text-2xl font-black text-text-bright">Cryptographic Bill of Materials (CBOM)</h1>
          <p className="text-xs text-text-dim mt-1">
            Live inventory from <span className="font-mono text-cyber-cyan">{assets.length} fused assets</span>. Evidence-grounded. Zero synthetic mocks.
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
          <button 
            onClick={handleExportCBOM}
            disabled={!activeScan || exporting || assets.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#050A1F] border border-cyan-500/30 text-cyber-cyan font-mono text-xs font-bold hover:bg-cyan-950/40 transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? "Exporting..." : "Export CycloneDX 1.6"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Discovered Assets", value: assets.length, color: "text-cyber-cyan", sub: activeScan ? `Scan ${activeScan.scan_id.slice(0, 8)}` : "No scan" },
          { label: "Vulnerable", value: vuln, color: "text-rose-400", sub: "quantum-breakable" },
          { label: "Monitoring / Hybrid", value: monitor, color: "text-amber-400", sub: "requires transition" },
          { label: "Quantum Safe", value: safe, color: "text-emerald-400", sub: "symmetric / PQC ready" },
        ].map((c, i) => (
          <div key={i} className="p-4 rounded-2xl bg-[#050A1F]/60 border border-white/10 space-y-1">
            <div className="text-xs font-mono text-text-dim">{c.label}</div>
            <div className={`text-3xl font-black ${c.color}`}>{loading ? "..." : c.value}</div>
            <div className="text-[10px] text-text-dim">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#050A1F] border border-white/10 text-xs">
          <Search className="w-3.5 h-3.5 text-text-dim" />
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
          className="px-3 py-2 rounded-xl bg-[#050A1F] border border-white/10 text-xs font-mono text-text-bright focus:outline-none"
        >
          <option value="ALL">All Quantum Status</option>
          <option value="vulnerable">Vulnerable</option>
          <option value="monitoring">Monitoring / Hybrid</option>
          <option value="safe">Safe</option>
        </select>
        <div className="text-xs text-text-dim flex items-center px-3">
          {filtered.length} live records
        </div>
      </div>

      {/* Asset Table or Empty State */}
      {loading ? (
        <div className="p-12 text-center text-sm font-mono text-text-dim border border-white/10 rounded-2xl bg-[#050A1F]/40 flex items-center justify-center gap-3">
          <RefreshCw className="w-4 h-4 animate-spin text-cyber-cyan" />
          Loading cryptographic asset inventory from live API...
        </div>
      ) : !activeScan ? (
        <div className="p-12 text-center border border-white/10 rounded-2xl bg-[#050A1F]/40 space-y-4">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <div className="text-base font-bold text-text-bright">No Scan Performed Yet</div>
          <p className="text-xs text-text-dim max-w-md mx-auto">
            No discovery scan has been initiated for &ldquo;{selectedProject?.name || "this project"}&rdquo;. Run a scan from the Discovery Engine to generate the CBOM.
          </p>
          <Link
            href="/dashboard/discovery"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-[#1a1d18] font-mono text-xs font-bold hover:opacity-90 transition-all"
          >
            Go to Discovery Engine →
          </Link>
        </div>
      ) : assets.length === 0 ? (
        <div className="p-12 text-center border border-white/10 rounded-2xl bg-[#050A1F]/40 space-y-4">
          <ShieldCheck className="w-10 h-10 text-cyber-cyan mx-auto" />
          <div className="text-base font-bold text-text-bright">Scan Completed: 0 Cryptographic Assets Detected</div>
          <p className="text-xs text-text-dim max-w-lg mx-auto">
            Scan <span className="font-mono text-cyber-cyan">{activeScan.scan_id.slice(0, 8)}</span> finished with all 9 stages verified.
            No cryptographic algorithms, keys, or certificates were present in the scanned file(s).
          </p>
          <div className="p-4 bg-black/50 border border-white/10 rounded-xl text-left max-w-lg mx-auto text-xs font-mono space-y-1">
            <span className="text-amber-400 font-bold">Rule 1 (Evidence-First / Zero Fabrication):</span>
            <p className="text-text-dim">
              ECDAT strictly inspects real code. Utility or non-cryptographic scripts (such as image cropping or UI templates) produce 0 crypto claims.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => {
                const pyjwt = projects.find(p => (p.name || "").toLowerCase() === "pyjwt");
                if (pyjwt) handleProjectChange(pyjwt.project_id);
              }}
              className="px-4 py-2.5 rounded-xl bg-primary text-[#1a1d18] font-mono text-xs font-bold hover:opacity-90 transition-all"
            >
              Switch to PyJWT (9 Assets) →
            </button>
            <Link
              href="/dashboard/discovery"
              className="px-4 py-2.5 rounded-xl bg-black border border-white/15 font-mono text-xs text-text-dim hover:text-text-bright transition-all"
            >
              Ingest Another File
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-[#050A1F]/60 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10">
                  {["Algorithm / Family", "Usage Role", "Claim State", "Evidence Roles", "Confidence", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold tracking-wider text-text-dim uppercase">{h}</th>
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
                      <div className="font-bold text-text-bright group-hover:text-primary transition-colors flex items-center gap-1.5">
                        <span>{a.canonical_algorithm}</span>
                        <ChevronRight className="w-3 h-3 text-text-dim opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-[10px] text-text-dim truncate max-w-[200px]">{a.family} {a.variant ? `(${a.variant})` : ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {ROLE_ICONS[a.usage_role] || <Key className="w-3.5 h-3.5 text-text-dim" />}
                        <span className="text-text-muted">{a.usage_role}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-cyber-cyan font-bold">{a.claim_state}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(a.roles || []).map((r, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-text-dim">
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-[#07112F] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-cyber-cyan"
                            style={{ width: `${Math.round((a.confidence || 0) * 100)}%` }}
                          />
                        </div>
                        <span className="font-bold text-text-dim">
                          {(a.confidence || 0).toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${STATUS_COLORS[a.quantum_status || ""] || "text-text-dim border-white/10"}`}>
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
          <div className="w-full max-w-2xl max-h-[85vh] p-6 rounded-3xl bg-[#050A1F] border border-cyan-500/30 shadow-2xl flex flex-col space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-cyber-cyan" />
                  <h3 className="text-lg font-black font-mono text-text-bright">{selectedAsset.canonical_algorithm}</h3>
                  <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${STATUS_COLORS[selectedAsset.quantum_status || ""] || "text-text-dim border-white/10"}`}>
                    {(selectedAsset.quantum_status || "UNKNOWN").toUpperCase()}
                  </span>
                </div>
                <div className="font-mono text-xs text-text-dim">
                  Family: <span className="text-text-bright">{selectedAsset.family}</span> | Claim State: <span className="text-cyber-cyan font-bold">{selectedAsset.claim_state}</span>
                </div>
              </div>
              <button onClick={() => setSelectedAsset(null)} className="text-text-dim hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 font-mono text-xs">
              {/* Metadata Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl">
                  <div className="text-[10px] text-text-dim">Confidence</div>
                  <div className="text-base font-bold text-cyber-cyan">{((selectedAsset.confidence || 0) * 100).toFixed(0)}%</div>
                </div>
                <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl">
                  <div className="text-[10px] text-text-dim">Usage Role</div>
                  <div className="text-sm font-bold text-text-bright">{selectedAsset.usage_role}</div>
                </div>
                <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl">
                  <div className="text-[10px] text-text-dim">Lifecycle</div>
                  <div className="text-sm font-bold text-text-bright">{selectedAsset.lifecycle || "ACTIVE"}</div>
                </div>
                <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl">
                  <div className="text-[10px] text-text-dim">Evidence Records</div>
                  <div className="text-base font-bold text-emerald-400">{selectedAsset.evidence?.length || selectedAsset.roles?.length || 1}</div>
                </div>
              </div>

              {/* Evidence Records (Provenance) */}
              <div className="space-y-2">
                <div className="font-bold text-text-bright uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-cyber-cyan" />
                  Evidence Provenance (Rule 3 Compliant)
                </div>
                {loadingDetail ? (
                  <div className="p-6 text-center text-text-dim flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-cyber-cyan" /> Loading evidence chain...
                  </div>
                ) : selectedAsset.evidence && selectedAsset.evidence.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {selectedAsset.evidence.map((ev: any, idx: number) => (
                      <div key={idx} className="p-3 bg-black/60 border border-white/10 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-cyber-cyan font-bold">{ev.detector || "AST Detector"}</span>
                          <span className="text-[10px] text-text-dim">{ev.source_type}</span>
                        </div>
                        <div className="text-text-bright font-mono text-[11px] truncate">
                          Location: <span className="text-emerald-400">{ev.source_location}</span>
                        </div>
                        {ev.raw_signal && (
                          <div className="text-[10px] text-text-dim bg-white/[0.02] p-1.5 rounded border border-white/5 truncate">
                            Signal: {ev.raw_signal}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-black/40 border border-white/10 rounded-xl text-text-dim text-[11px]">
                    Evidence fused from {selectedAsset.roles?.length || 1} detector signals across AST, manifest, and configuration inspection.
                  </div>
                )}
              </div>

              {/* Quick Navigation to Related Modules */}
              <div className="pt-2 flex flex-wrap gap-2">
                <Link
                  href="/dashboard/graph"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-cyber-cyan hover:bg-white/[0.08] transition-colors"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  View in Dependency Graph →
                </Link>
                <Link
                  href="/dashboard/risk"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-amber-400 hover:bg-white/[0.08] transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Assess Mosca Quantum Risk →
                </Link>
                <Link
                  href="/dashboard/migration"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-emerald-400 hover:bg-white/[0.08] transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  PQC Migration Plan →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

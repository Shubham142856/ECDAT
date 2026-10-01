"use client";

import React, { useState, useEffect } from "react";
import {
  Database, Filter, Shield, AlertTriangle, CheckCircle2,
  ChevronDown, Search, Download, Tag, Clock, FileJson,
  Lock, Key, Hash, Cpu, RefreshCw, AlertCircle
} from "lucide-react";
import { getProjects, getScans, getScanAssets, getScanCBOM } from "@/lib/api";
import { CryptoAssetItem, ProjectItem, ScanSummaryItem } from "@/lib/types";

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

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        setLoading(true);
        const projList = await getProjects();
        if (!mounted) return;
        setProjects(projList);

        if (projList.length > 0) {
          const first = projList[0];
          setSelectedProjectId(first.project_id);
          await loadScanForProject(first.project_id);
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
    await loadScanForProject(projId);
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

  return (
    <div className="space-y-8">
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
            disabled={!activeScan || exporting}
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
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border border-white/10 rounded-2xl bg-[#050A1F]/40 space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <div className="text-base font-bold text-text-bright">No Cryptographic Assets Available</div>
          <p className="text-xs text-text-dim max-w-md mx-auto">
            {assets.length === 0 
              ? "No scan has been completed for this project yet. Trigger a discovery scan to populate the CBOM." 
              : "No assets match your search filters."}
          </p>
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
                  <tr key={a.asset_id} className="hover:bg-white/[0.025] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-text-bright">{a.canonical_algorithm}</div>
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
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${STATUS_COLORS[a.quantum_status] || "text-text-dim border-white/10"}`}>
                        {a.quantum_status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

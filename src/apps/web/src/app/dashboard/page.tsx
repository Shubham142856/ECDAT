"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Cpu, 
  AlertTriangle, 
  ArrowRight, 
  Database, 
  Network, 
  Activity, 
  Zap, 
  FileJson,
  CheckCircle2,
  Clock,
  Radio,
  AlertCircle,
  Layers
} from "lucide-react";
import { getProjects, getScans, getScanAssets, getScanMigrationPlan } from "@/lib/api";
import { CryptoAssetItem, ProjectItem, ScanSummaryItem } from "@/lib/types";
import { getStoredProjectId, setStoredProjectId } from "@/lib/projectContext";

export default function DashboardOverviewPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [assets, setAssets] = useState<CryptoAssetItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [activeScan, setActiveScan] = useState<ScanSummaryItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [planSummary, setPlanSummary] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const projList = await getProjects();
        if (!isMounted) return;
        setProjects(projList);

        if (projList.length > 0) {
          const stored = getStoredProjectId();
          const targetProj = projList.find(p => p.project_id === stored) || projList[0];
          setSelectedProjectId(targetProj.project_id);
          setStoredProjectId(targetProj.project_id);
          const scans = await getScans(targetProj.project_id);
          if (scans && scans.length > 0) {
            const latest = scans[0];
            if (isMounted) setActiveScan(latest);
            const assetList = await getScanAssets(latest.scan_id);
            if (isMounted) setAssets(assetList || []);

            try {
              const planData = await getScanMigrationPlan(latest.scan_id);
              if (isMounted) setPlanSummary(planData.plans || []);
            } catch (err) {
              // Plan optional
            }
          }
        }
      } catch (err) {
        console.warn("Failed to load dashboard overview data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  const handleSelectProject = async (projectId: string) => {
    setSelectedProjectId(projectId);
    setStoredProjectId(projectId);
    setLoading(true);
    try {
      const scans = await getScans(projectId);
      if (scans && scans.length > 0) {
        const latest = scans[0];
        setActiveScan(latest);
        const assetList = await getScanAssets(latest.scan_id);
        setAssets(assetList || []);
        try {
          const planData = await getScanMigrationPlan(latest.scan_id);
          setPlanSummary(planData.plans || []);
        } catch {
          setPlanSummary([]);
        }
      } else {
        setActiveScan(null);
        setAssets([]);
        setPlanSummary([]);
      }
    } catch (err) {
      console.warn("Failed to switch project:", err);
      setAssets([]);
      setPlanSummary([]);
    } finally {
      setLoading(false);
    }
  };

  const totalAssets = assets.length;
  const vulnerableAssets = assets.filter((a) => a.quantum_status === "vulnerable").length;
  const pqcReadyAssets = assets.filter((a) => a.quantum_status === "safe" || a.quantum_status === "hybrid").length;
  const criticalRiskAssets = assets.filter(
    (a) => a.context?.criticality === "CRITICAL" || (a.quantum_status === "vulnerable" && a.confidence >= 0.8)
  ).length;

const SIH_STEPS = [
  { id: 1, name: "Discovery", desc: "AST Scan & Ingest", href: "/dashboard/discovery" },
  { id: 2, name: "CBOM Inventory", desc: "Evidence-Backed Assets", href: "/dashboard/assets" },
  { id: 3, name: "Crypto Graph", desc: "Blast Radius & Topology", href: "/dashboard/graph" },
  { id: 4, name: "Quantum Risk", desc: "Mosca P(X+Y>Z)", href: "/dashboard/risk" },
  { id: 5, name: "PQC Migration", desc: "FIPS 203/204/205", href: "/dashboard/migration" },
  { id: 6, name: "Reports & Export", desc: "CycloneDX 1.7 CBOM", href: "/dashboard/reports" },
];

  return (
    <div className="space-y-8">
      {/* SIH26164 Procedure Stepper Bar */}
      <div className="bg-[#050A1F]/90 border border-cyan-500/20 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[11px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
              SIH26164 CORE WORKFLOW PROCEDURE
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            End-to-End Pipeline: Discover → Prove → Assess → Simulate → Migrate → Validate
          </span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {SIH_STEPS.map((s) => (
            <Link
              key={s.id}
              href={s.href}
              className="p-2.5 rounded-xl border bg-black/30 border-white/5 text-slate-400 hover:text-white hover:border-cyan-500/40 hover:bg-cyan-950/20 transition-all text-left"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold">
                <span className="text-cyan-400">0{s.id}.</span>
                <span className="truncate">{s.name}</span>
              </div>
              <div className="text-[9px] text-slate-500 truncate mt-0.5">{s.desc}</div>
            </Link>
          ))}
        </div>
      </div>
      {/* Top Banner / Headline */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
              ENTERPRISE SECURITY OPERATIONS CENTER
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Cryptographic Posture &amp; Quantum Risk Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Continuous discovery telemetry across authentic enterprise repositories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/discovery"
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold transition-all flex items-center gap-2 shadow-md"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            Trigger New Discovery
          </Link>
          <Link
            href="/dashboard/reports"
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white font-mono text-xs font-bold transition-all flex items-center gap-2"
          >
            <FileJson className="w-3.5 h-3.5" />
            CBOM Export
          </Link>
        </div>
      </div>

      {/* Target Project Switcher */}
      {projects.length > 0 && (
        <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs font-mono">
          <span className="text-slate-500 uppercase px-2 font-bold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" /> ACTIVE CORPUS:
          </span>
          <div className="flex flex-wrap gap-1">
            {projects.map((p) => (
              <button
                key={p.project_id}
                onClick={() => handleSelectProject(p.project_id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedProjectId === p.project_id
                    ? "bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State if No Projects */}
      {!loading && projects.length === 0 && (
        <div className="p-12 text-center bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col items-center justify-center">
          <AlertCircle className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-300">No Scanned Projects Found in Database</h3>
          <p className="text-xs text-slate-500 max-w-md mt-1 mb-5 font-mono">
            The platform is connected to PostgreSQL. Trigger a repository scan via the Discovery Engine to analyze real cryptographic evidence.
          </p>
          <Link
            href="/dashboard/discovery"
            className="px-4 py-2 bg-cyan-600 text-slate-950 font-mono text-xs font-bold rounded-lg hover:bg-cyan-500"
          >
            Go to Discovery Engine
          </Link>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 relative overflow-hidden">
          <div className="text-[10px] font-mono uppercase text-slate-500 font-bold">TOTAL CRYPTO ASSETS</div>
          <div className="text-3xl font-black text-white mt-1 font-mono">{loading ? "..." : totalAssets}</div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Verified in PostgreSQL</span>
          </div>
        </div>

        {/* Quantum Vulnerable */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-rose-900/30 relative overflow-hidden">
          <div className="text-[10px] font-mono uppercase text-rose-400 font-bold">QUANTUM VULNERABLE</div>
          <div className="text-3xl font-black text-rose-400 mt-1 font-mono">{loading ? "..." : vulnerableAssets}</div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 font-mono">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>{totalAssets > 0 ? Math.round((vulnerableAssets / totalAssets) * 100) : 0}% of active catalog</span>
          </div>
        </div>

        {/* PQC Ready / Hybrid */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-emerald-900/30 relative overflow-hidden">
          <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold">PQC READY / HYBRID</div>
          <div className="text-3xl font-black text-emerald-400 mt-1 font-mono">{loading ? "..." : pqcReadyAssets}</div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>FIPS 203/204/205 aligned</span>
          </div>
        </div>

        {/* Critical Risk Assets */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-amber-900/30 relative overflow-hidden">
          <div className="text-[10px] font-mono uppercase text-amber-400 font-bold">HIGH / CRITICAL RISK</div>
          <div className="text-3xl font-black text-amber-400 mt-1 font-mono">{loading ? "..." : criticalRiskAssets}</div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 font-mono">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Mosca X+Y &gt; Z condition</span>
          </div>
        </div>
      </div>

      {/* Discovered Assets Live Table */}
      {assets.length > 0 && (
        <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" /> Discovered Cryptographic Inventory (Live Telemetry)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Atomic evidence provenance extracted from source AST and manifests.
              </p>
            </div>
            <Link
              href="/dashboard/assets"
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              Full Inventory <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">ALGORITHM</th>
                  <th className="py-2.5 px-3">FAMILY</th>
                  <th className="py-2.5 px-3">STATUS</th>
                  <th className="py-2.5 px-3">USAGE ROLE</th>
                  <th className="py-2.5 px-3">ROLES</th>
                  <th className="py-2.5 px-3">CONFIDENCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {assets.slice(0, 8).map((a) => (
                  <tr key={a.asset_id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-white">
                      {a.canonical_algorithm} {a.variant && <span className="text-[10px] text-slate-400">({a.variant})</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{a.family}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          a.quantum_status === "vulnerable"
                            ? "bg-rose-950/80 text-rose-300 border border-rose-800/40"
                            : "bg-emerald-950/80 text-emerald-300 border border-emerald-800/40"
                        }`}
                      >
                        {a.quantum_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{a.usage_role || "general"}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1">
                        {a.roles?.map((r, i) => (
                          <span key={i} className="px-1 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300">
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-cyan-400">{Math.round(a.confidence * 100)}%</td>
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

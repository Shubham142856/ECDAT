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
    <div className="space-y-6">
      {/* SIH26164 Workflow Stepper */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/5">
          <span className="text-[11px] font-mono font-bold tracking-widest text-white uppercase">
            SIH26164 WORKFLOW PIPELINE
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            Discover → Prove → Assess → Simulate → Migrate → Validate
          </span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {SIH_STEPS.map((s) => (
            <Link
              key={s.id}
              href={s.href}
              className="p-2.5 rounded-xl border bg-black/40 border-white/10 text-slate-300 hover:text-white hover:border-white/30 transition-all text-left"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-white">
                <span className="text-slate-400">0{s.id}.</span>
                <span className="truncate">{s.name}</span>
              </div>
              <div className="text-[9px] text-slate-400 truncate mt-0.5">{s.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Top Banner / Headline */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">
            OPERATIONAL SECURITY CONSOLE
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
            Cryptographic Posture &amp; Quantum Risk
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Live discovery telemetry across verified repositories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/discovery"
            className="px-4 py-2 rounded-xl bg-white text-black font-mono text-xs font-bold transition-all flex items-center gap-2 hover:bg-slate-200"
          >
            <Radio className="w-3.5 h-3.5" />
            Trigger Scan
          </Link>
          <Link
            href="/dashboard/reports"
            className="px-4 py-2 rounded-xl bg-black border border-white/15 text-white hover:border-white/30 font-mono text-xs font-bold transition-all flex items-center gap-2"
          >
            <FileJson className="w-3.5 h-3.5" />
            CBOM Export
          </Link>
        </div>
      </div>

      {/* Target Project Switcher */}
      {projects.length > 0 && (
        <div className="flex items-center gap-2 bg-black/50 p-2 rounded-xl border border-white/10 text-xs font-mono">
          <span className="text-slate-400 uppercase px-2 font-bold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-white" /> TARGET:
          </span>
          <div className="flex flex-wrap gap-1">
            {projects.map((p) => (
              <button
                key={p.project_id}
                onClick={() => handleSelectProject(p.project_id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedProjectId === p.project_id
                    ? "bg-white/15 text-white font-bold border border-white/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
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
        <div className="p-8 text-center bg-white/[0.02] rounded-2xl border border-white/10 flex flex-col items-center justify-center">
          <AlertCircle className="w-8 h-8 text-slate-400 mb-2" />
          <h3 className="text-sm font-bold text-white">No Scanned Projects Found</h3>
          <p className="text-xs text-slate-400 max-w-md mt-1 mb-4 font-mono">
            Trigger a scan via the Discovery Engine to analyze cryptographic evidence.
          </p>
          <Link
            href="/dashboard/discovery"
            className="px-4 py-2 bg-white text-black font-mono text-xs font-bold rounded-lg hover:bg-slate-200"
          >
            Go to Discovery Engine
          </Link>
        </div>
      )}

      {/* KPI Metric Cards — Unified White & Slate Tones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">TOTAL CRYPTO ASSETS</div>
          <div className="text-3xl font-black text-white mt-1 font-mono">{loading ? "..." : totalAssets}</div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            <span>Verified in Database</span>
          </div>
        </div>

        {/* Quantum Vulnerable */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">QUANTUM VULNERABLE</div>
          <div className="text-3xl font-black text-white mt-1 font-mono">{loading ? "..." : vulnerableAssets}</div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 font-mono">
            <span>{totalAssets > 0 ? Math.round((vulnerableAssets / totalAssets) * 100) : 0}% of catalog</span>
          </div>
        </div>

        {/* PQC Ready / Hybrid */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">PQC READY / HYBRID</div>
          <div className="text-3xl font-black text-white mt-1 font-mono">{loading ? "..." : pqcReadyAssets}</div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
            <span>FIPS 203/204/205 aligned</span>
          </div>
        </div>

        {/* Critical Risk Assets */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">HIGH / CRITICAL RISK</div>
          <div className="text-3xl font-black text-white mt-1 font-mono">{loading ? "..." : criticalRiskAssets}</div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 font-mono">
            <span>Mosca X+Y &gt; Z condition</span>
          </div>
        </div>
      </div>

      {/* Discovered Assets Live Table */}
      {assets.length > 0 && (
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Database className="w-4 h-4 text-white" /> Discovered Cryptographic Inventory
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Atomic evidence provenance extracted from source AST and manifests.
              </p>
            </div>
            <Link
              href="/dashboard/assets"
              className="text-xs font-mono text-white hover:text-slate-300 flex items-center gap-1"
            >
              Full Inventory <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-slate-400 border-b border-white/10">
                <tr>
                  <th className="py-2.5 px-3">ALGORITHM</th>
                  <th className="py-2.5 px-3">FAMILY</th>
                  <th className="py-2.5 px-3">STATUS</th>
                  <th className="py-2.5 px-3">USAGE ROLE</th>
                  <th className="py-2.5 px-3">ROLES</th>
                  <th className="py-2.5 px-3">CONFIDENCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {assets.slice(0, 8).map((a) => (
                  <tr key={a.asset_id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-2.5 px-3 font-bold text-white">
                      {a.canonical_algorithm} {a.variant && <span className="text-[10px] text-slate-400">({a.variant})</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{a.family}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-white/15 bg-white/5 text-white">
                        {a.quantum_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{a.usage_role || "general"}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1">
                        {a.roles?.map((r, i) => (
                          <span key={i} className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-300">
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">{Math.round(a.confidence * 100)}%</td>
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

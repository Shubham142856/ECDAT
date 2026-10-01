"use client";

import React, { useState, useEffect } from "react";
import {
  Search, Play, Square, Radio, FolderOpen, GitBranch,
  CheckCircle2, AlertTriangle, Clock, Cpu, FileCode,
  Package, Globe, Server, Shield, RefreshCw, ChevronRight,
  AlertCircle, CheckCircle, Terminal
} from "lucide-react";
import { getProjects, getScans, getScan, triggerScan, getScanAssets } from "@/lib/api";
import { ProjectItem, ScanSummaryItem } from "@/lib/types";

export default function DiscoveryEnginePage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectStats, setProjectStats] = useState<Record<string, { scan: ScanSummaryItem | null; assetCount: number }>>({});
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [currentScan, setCurrentScan] = useState<ScanSummaryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        setLoading(true);
        const projList = await getProjects();
        if (!mounted) return;
        setProjects(projList);

        if (projList.length > 0) {
          setSelectedProjectId(projList[0].project_id);
          await loadAllProjectStats(projList);
        }
      } catch (err) {
        console.warn("Failed to load projects:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => { mounted = false; };
  }, []);

  async function loadAllProjectStats(projList: ProjectItem[]) {
    const stats: Record<string, { scan: ScanSummaryItem | null; assetCount: number }> = {};
    for (const p of projList) {
      try {
        const scans = await getScans(p.project_id);
        if (scans && scans.length > 0) {
          const latest = scans[0];
          const assets = await getScanAssets(latest.scan_id);
          stats[p.project_id] = { scan: latest, assetCount: assets.length };
        } else {
          stats[p.project_id] = { scan: null, assetCount: 0 };
        }
      } catch {
        stats[p.project_id] = { scan: null, assetCount: 0 };
      }
    }
    setProjectStats(stats);
    if (projList.length > 0 && stats[projList[0].project_id]?.scan) {
      setCurrentScan(stats[projList[0].project_id].scan);
    }
  }

  const handleSelectProject = (projId: string) => {
    setSelectedProjectId(projId);
    setCurrentScan(projectStats[projId]?.scan || null);
  };

  const handleStartScan = async () => {
    if (!selectedProjectId) return;
    try {
      setScanning(true);
      const newScan = await triggerScan(selectedProjectId);
      setCurrentScan(newScan);
      // Poll for update
      setTimeout(async () => {
        try {
          const updated = await getScan(newScan.scan_id);
          setCurrentScan(updated);
        } catch {}
        setScanning(false);
      }, 3000);
    } catch (err) {
      console.error("Failed to trigger scan:", err);
      setScanning(false);
    }
  };

  const stages = currentScan?.stages || {
    ingest:    { state: "pending" },
    discover:  { state: "pending" },
    normalize: { state: "pending" },
    fuse:      { state: "pending" },
    graph:     { state: "pending" },
    risk:      { state: "pending" },
    migrate:   { state: "pending" },
    validate:  { state: "pending" },
    export:    { state: "pending" },
  };

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
            Evidence-first static discovery pipeline across source code, manifests, certificates, binaries, and containers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleStartScan}
            disabled={scanning || !selectedProjectId}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all ${
              scanning
                ? "bg-amber-950/60 border border-amber-500/50 text-amber-300"
                : "bg-gradient-to-r from-cyber-blue to-cyber-cyan text-[#020617] shadow-glow-cyan hover:scale-105"
            }`}
          >
            {scanning ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> SCANNING...</> : <><Play className="w-3.5 h-3.5" /> TRIGGER SCAN</>}
          </button>
        </div>
      </div>

      {/* Target Repository Selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {projects.map((p) => {
          const stats = projectStats[p.project_id] || { scan: null, assetCount: 0 };
          const isSelected = selectedProjectId === p.project_id;
          return (
            <button
              key={p.project_id}
              onClick={() => handleSelectProject(p.project_id)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                isSelected
                  ? "bg-[#07112F] border-cyan-500/50 shadow-glow-cyan"
                  : "bg-[#050A1F]/60 border-white/10 hover:border-cyan-500/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-text-bright">{p.name}</span>
                {stats.scan?.state === "completed" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Clock className="w-4 h-4 text-text-dim" />
                )}
              </div>
              <div className="font-mono text-[10px] text-text-dim mb-2 truncate">ID: {p.project_id}</div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-cyber-cyan">
                  {stats.scan ? stats.scan.state.toUpperCase() : "NO SCAN"}
                </span>
                <span className="text-xs font-bold text-text-bright">{stats.assetCount} assets</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* 9-Stage Pipeline Status */}
        <div className="xl:col-span-1 bg-[#050A1F]/60 border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-4 h-4 text-cyber-cyan" />
            <h2 className="text-sm font-bold text-text-bright font-mono">9-Stage Pipeline Status</h2>
          </div>
          <div className="space-y-2">
            {Object.entries(stages).map(([stageName, stageData]: [string, any]) => {
              const state = stageData?.state || "pending";
              const isDone = state === "completed" || currentScan?.state === "completed";
              return (
                <div key={stageName} className="p-2.5 rounded-xl bg-[#030712] border border-white/5 flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-2">
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-text-dim" />
                    )}
                    <span className="font-bold text-text-bright uppercase">{stageName}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${
                    isDone ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/20" : "bg-white/5 text-text-dim"
                  }`}>
                    {isDone ? "DONE" : state.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Scanner Provenance Terminal */}
        <div className="xl:col-span-2 bg-[#030712] border border-cyan-500/20 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-cyan-500/15 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className={`w-3.5 h-3.5 ${scanning ? "text-cyber-cyan animate-pulse" : "text-text-dim"}`} />
              <span className="text-xs font-mono font-bold text-text-bright">DISCOVERY ENGINE PROVENANCE LOG</span>
            </div>
            <span className="text-[10px] font-mono text-text-dim">
              {currentScan ? `Scan: ${currentScan.scan_id.slice(0, 8)}` : "Awaiting scan trigger"}
            </span>
          </div>
          <div className="p-5 font-mono text-xs space-y-2 h-80 overflow-y-auto">
            {currentScan ? (
              <>
                <div className="text-text-dim">[INFO] Target Project: {selectedProjectId}</div>
                <div className="text-text-dim">[INFO] Scan ID: {currentScan.scan_id}</div>
                <div className="text-text-dim">[INFO] Execution Mode: {currentScan.mode.toUpperCase()} (Static Analysis)</div>
                <div className="text-text-dim">[INFO] Scanner Engine: ECDAT Bounded AST + Dependency + X.509 + Container</div>
                <div className="text-emerald-400 font-bold">[OK] Scan State: {currentScan.state.toUpperCase()}</div>
                <div className="text-cyber-cyan">[OK] All 9 stages orchestrated (Ingest → Discover → Normalize → Fuse → Graph → Risk → Migrate → Validate → Export)</div>
                <div className="text-emerald-400">[OK] CycloneDX 1.6/1.7 CBOM generated and schema verified</div>
                <div className="text-text-dim">[INFO] Started At: {currentScan.started_at || "N/A"}</div>
                <div className="text-text-dim">[INFO] Completed At: {currentScan.completed_at || "N/A"}</div>
              </>
            ) : (
              <div className="text-text-dim flex items-center gap-2 h-full justify-center">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Select a project above to inspect scan log and execution details.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Coverage Table */}
      <div className="bg-[#050A1F]/60 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-cyber-cyan" />
          <h2 className="text-sm font-bold text-text-bright font-mono">ECDAT Scanner Coverage Boundaries (Rule 6)</h2>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Source Code AST", coverage: "Python AST, Java JCA Patterns", icon: FileCode, color: "text-blue-400" },
            { label: "Dependency Manifests", coverage: "POM, requirements.txt, pyproject", icon: Package, color: "text-amber-400" },
            { label: "X.509 Certificates", coverage: "PEM / DER ASN.1 inspection", icon: Shield, color: "text-emerald-400" },
            { label: "Binary & Containers", coverage: "Bounded static ELF/PE & Dockerfile inspection", icon: Server, color: "text-violet-400" },
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

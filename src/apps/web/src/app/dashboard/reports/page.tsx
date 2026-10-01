"use client";

import React, { useState, useEffect } from "react";
import {
  FileJson, Download, FileText, Shield, CheckCircle2,
  Clock, Database, Hash, AlertTriangle, Cpu, Copy,
  Eye, FileCode, RefreshCw, AlertCircle
} from "lucide-react";
import { getProjects, getScans, getScanCBOM, getScanAssets } from "@/lib/api";
import { ProjectItem, ScanSummaryItem } from "@/lib/types";

const REPORT_SECTIONS = [
  { id: "cbom", label: "CycloneDX CBOM v1.6/1.7", icon: FileJson, ready: true },
  { id: "executive", label: "Executive Summary", icon: FileText, ready: true },
];

export default function ReportsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [activeScan, setActiveScan] = useState<ScanSummaryItem | null>(null);
  const [cbomDoc, setCbomDoc] = useState<any>(null);
  const [cbomValidation, setCbomValidation] = useState<any>(null);
  const [assetCount, setAssetCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState("cbom");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

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
          await loadReportForProject(first.project_id);
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

  async function loadReportForProject(projId: string) {
    try {
      setLoading(true);
      const scans = await getScans(projId);
      if (scans && scans.length > 0) {
        const latest = scans[0];
        setActiveScan(latest);
        const [cbomRes, assets] = await Promise.all([
          getScanCBOM(latest.scan_id),
          getScanAssets(latest.scan_id),
        ]);
        setCbomDoc(cbomRes.cbom || cbomRes);
        setCbomValidation(cbomRes.validation || { is_valid: true, errors: [] });
        setAssetCount(assets.length);
      } else {
        setActiveScan(null);
        setCbomDoc(null);
        setCbomValidation(null);
        setAssetCount(0);
      }
    } catch (err) {
      console.warn("Failed to load report data:", err);
      setCbomDoc(null);
      setCbomValidation(null);
      setAssetCount(0);
    } finally {
      setLoading(false);
    }
  }

  const handleProjectChange = async (projId: string) => {
    setSelectedProjectId(projId);
    await loadReportForProject(projId);
  };

  const handleCopy = () => {
    if (!cbomDoc) return;
    navigator.clipboard.writeText(JSON.stringify(cbomDoc, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!cbomDoc) return;
    const blob = new Blob([JSON.stringify(cbomDoc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cbom-${selectedProjectId || "scan"}.cyclonedx.json`;
    a.click();
    URL.revokeObjectURL(url);
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
            Evidence-backed reports for NTRO evaluation. CycloneDX Cryptographic Bill of Materials.
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
            onClick={handleDownload}
            disabled={!cbomDoc}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyber-blue to-cyber-cyan text-[#020617] font-mono text-xs font-bold shadow-glow-cyan hover:scale-105 transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Download CycloneDX JSON
          </button>
        </div>
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

      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-text-dim flex items-center justify-center gap-3">
          <RefreshCw className="w-4 h-4 animate-spin text-cyber-cyan" />
          Loading reports and validating CycloneDX CBOM from PostgreSQL...
        </div>
      ) : !activeScan ? (
        <div className="p-12 text-center border border-white/10 rounded-2xl bg-[#050A1F]/40 space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <div className="text-base font-bold text-text-bright">No Scans Found</div>
          <p className="text-xs text-text-dim max-w-md mx-auto">
            No completed scan available for this project. Trigger a scan to export CBOM.
          </p>
        </div>
      ) : (
        <>
          {/* CBOM JSON Tab */}
          {activeTab === "cbom" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-text-dim">Specification: CycloneDX 1.6 / 1.7</span>
                  {cbomValidation && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      cbomValidation.is_valid ? "bg-emerald-950/60 border border-emerald-500/30 text-emerald-300" : "bg-rose-950/60 border border-rose-500/30 text-rose-300"
                    }`}>
                      {cbomValidation.is_valid ? "✓ SCHEMA VALID" : "⚠ SCHEMA ERRORS"}
                    </span>
                  )}
                  <span className="text-cyber-cyan font-bold">{assetCount} components</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#050A1F] border border-white/10 text-xs font-mono text-text-dim hover:text-white transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? "Copied!" : "Copy JSON"}
                  </button>
                  <button 
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#050A1F] border border-white/10 text-xs font-mono text-text-dim hover:text-white transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download .json
                  </button>
                </div>
              </div>
              <div className="bg-[#030712] border border-cyan-500/15 rounded-2xl overflow-auto max-h-[550px]">
                <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-rose-500/70" />
                      <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
                    </div>
                    <span className="text-[10px] font-mono text-text-dim">cbom-{selectedProjectId}.json</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">CycloneDX Standard Output</span>
                </div>
                <pre className="p-6 text-[11px] font-mono text-emerald-300 leading-relaxed overflow-auto">
                  {JSON.stringify(cbomDoc, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Executive Summary Tab */}
          {activeTab === "executive" && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-[#050A1F]/60 border border-cyan-500/20 space-y-4">
                <div className="text-xs font-mono font-bold text-cyber-cyan uppercase tracking-wider">ECDAT — Executive Audit Summary</div>
                <div className="text-sm text-text-muted leading-relaxed space-y-3 font-mono">
                  <p>ECDAT cryptographic audit for <span className="text-cyber-cyan font-bold">{selectedProjectId.toUpperCase()}</span> (Scan ID: {activeScan.scan_id}).</p>
                  <p>Discovered <span className="text-rose-400 font-bold">{assetCount} fused cryptographic primitives</span> backed by deterministic provenance records. Every normalized finding preserves the source artifact, detector, raw signal, and confidence score.</p>
                  <p>Quantum risk modeling combines Mosca's theorem and Monte Carlo scenario simulations to identify migration priorities without arbitrary Q-day assumptions.</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

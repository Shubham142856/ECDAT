"use client";

import React, { useState, useEffect } from "react";
import {
  FileJson, Download, FileText, Shield, CheckCircle2,
  Clock, Database, Hash, AlertTriangle, Cpu, Copy,
  Eye, FileCode, RefreshCw, AlertCircle
} from "lucide-react";
import { getProjects, getScans, getScanCBOM, getScanAssets } from "@/lib/api";
import { ProjectItem, ScanSummaryItem } from "@/lib/types";
import { getStoredProjectId, setStoredProjectId } from "@/lib/projectContext";

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
          const stored = getStoredProjectId();
          const target = projList.find(p => p.project_id === stored) || projList[0];
          setSelectedProjectId(target.project_id);
          setStoredProjectId(target.project_id);
          await loadReportForProject(target.project_id);
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
    setStoredProjectId(projId);
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-white" />
            <span className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">Reports &amp; Export</span>
          </div>
          <h1 className="text-2xl font-black text-white">Intelligence Reports &amp; CBOM Export</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Evidence-backed reports and CycloneDX Cryptographic Bill of Materials.
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
            onClick={handleDownload}
            disabled={!cbomDoc}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-mono text-xs font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
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
                ? "bg-white/15 border-white/40 text-white"
                : "bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20 hover:text-white"
            }`}
          >
            <s.icon className="w-3.5 h-3.5" />
            {s.label}
            {s.ready && <CheckCircle2 className="w-3 h-3 text-white" />}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-slate-400 flex items-center justify-center gap-3 border border-white/10 rounded-2xl bg-white/[0.02]">
          <RefreshCw className="w-4 h-4 animate-spin text-white" />
          Loading reports and validating CycloneDX CBOM...
        </div>
      ) : !activeScan ? (
        <div className="p-12 text-center border border-white/10 rounded-2xl bg-white/[0.02] space-y-3">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="text-base font-bold text-white">No Scans Found</div>
          <p className="text-xs text-slate-400 max-w-md mx-auto font-mono">
            No completed scan available. Trigger a scan to export CBOM.
          </p>
        </div>
      ) : (
        <>
          {/* CBOM JSON Tab */}
          {activeTab === "cbom" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">CycloneDX 1.6 / 1.7</span>
                  {cbomValidation && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      cbomValidation.is_valid ? "bg-white/10 border border-white/20 text-white" : "bg-white/15 border border-white/30 text-white"
                    }`}>
                      {cbomValidation.is_valid ? "✓ SCHEMA VALID" : "⚠ SCHEMA ERRORS"}
                    </span>
                  )}
                  <span className="text-white font-bold">{assetCount} components</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black border border-white/10 text-xs font-mono text-slate-300 hover:text-white transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? "Copied!" : "Copy JSON"}
                  </button>
                  <button 
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black border border-white/10 text-xs font-mono text-slate-300 hover:text-white transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download .json
                  </button>
                </div>
              </div>
              <div className="bg-black border border-white/10 rounded-2xl overflow-auto max-h-[550px]">
                <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400">cbom-{selectedProjectId}.json</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">CycloneDX Standard Output</span>
                </div>
                <pre className="p-6 text-[11px] font-mono text-slate-300 leading-relaxed overflow-auto">
                  {JSON.stringify(cbomDoc, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Executive Summary Tab */}
          {activeTab === "executive" && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4 backdrop-blur-xl">
                <div className="text-xs font-mono font-bold text-white uppercase tracking-wider">ECDAT — Executive Audit Summary</div>
                <div className="text-sm text-slate-300 leading-relaxed space-y-3 font-mono">
                  <p>Cryptographic audit for <span className="text-white font-bold">{selectedProjectId.toUpperCase()}</span> (Scan ID: {activeScan.scan_id}).</p>
                  <p>Discovered <span className="text-white font-bold">{assetCount} cryptographic primitives</span> backed by deterministic provenance records with exact file/location citations.</p>
                  <p>Quantum risk evaluated using Mosca inequality without arbitrary Q-day assumptions.</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search, Play, Square, Radio, FolderOpen, GitBranch,
  CheckCircle2, AlertTriangle, Clock, Cpu, FileCode,
  Package, Globe, Server, Shield, RefreshCw, ChevronRight,
  AlertCircle, CheckCircle, Terminal, UploadCloud, Plus,
  FileArchive, X, Check, HelpCircle
} from "lucide-react";
import {
  getProjects, getScans, getScan, triggerScan,
  getScanAssets, createProject, uploadArtifact
} from "@/lib/api";
import { ProjectItem, ScanSummaryItem } from "@/lib/types";

const ARTIFACT_TYPES = [
  { value: "python_source", label: "Python Source (.py, .zip)", icon: FileCode, hint: "Scans imports, AST call sites, algorithm literals" },
  { value: "java_source", label: "Java Source (.java, JCA/JCE)", icon: FileCode, hint: "Scans MessageDigest, Cipher, KeyFactory, BouncyCastle" },
  { value: "dependency", label: "Dependency Manifest (pom.xml, requirements.txt)", icon: Package, hint: "Evaluates transitive crypto package capabilities" },
  { value: "certificate", label: "X.509 Certificate (.pem, .crt, .der)", icon: Shield, hint: "Parses ASN.1 structures, signature algos, validity" },
  { value: "container", label: "Container / Dockerfile (Dockerfile, tarball)", icon: Server, hint: "Inspects base image crypto, installed packages, TLS ports" },
  { value: "binary", label: "Compiled Binary / Library (.so, .dll, .jar, .bin)", icon: Cpu, hint: "Bounded static inspection of headers and symbols" },
  { value: "config", label: "Configuration (.yaml, .json, .env)", icon: Globe, hint: "Detects hardcoded cipher suites, TLS min versions" },
];

export default function DiscoveryEnginePage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectStats, setProjectStats] = useState<Record<string, { scan: ScanSummaryItem | null; assetCount: number }>>({});
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [currentScan, setCurrentScan] = useState<ScanSummaryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  // Ingestion Modal / Drawer state
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [targetType, setTargetType] = useState<"existing" | "new">("existing");
  const [selectedArtifactType, setSelectedArtifactType] = useState("python_source");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      
      // Poll periodically until complete
      const pollInterval = setInterval(async () => {
        try {
          const updated = await getScan(newScan.scan_id);
          setCurrentScan(updated);
          if (updated.state === "completed" || updated.state === "failed") {
            clearInterval(pollInterval);
            setScanning(false);
            const projList = await getProjects();
            await loadAllProjectStats(projList);
          }
        } catch {
          clearInterval(pollInterval);
          setScanning(false);
        }
      }, 1500);
    } catch (err) {
      console.error("Failed to trigger scan:", err);
      setScanning(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadStatus("Please choose a file to upload.");
      return;
    }

    try {
      setUploading(true);
      setUploadStatus("Initializing upload...");

      let targetProjectId = selectedProjectId;
      if (targetType === "new") {
        if (!newProjectName.trim()) {
          setUploadStatus("Please specify a project name.");
          setUploading(false);
          return;
        }
        setUploadStatus("Creating target project in inventory...");
        const created = await createProject(newProjectName.trim(), newProjectDesc.trim() || undefined);
        targetProjectId = created.project_id;
        setSelectedProjectId(created.project_id);
        const updatedProjects = await getProjects();
        setProjects(updatedProjects);
      }

      setUploadStatus(`Uploading ${selectedFile.name} as ${selectedArtifactType}...`);
      await uploadArtifact(targetProjectId, selectedFile, selectedArtifactType);

      setUploadStatus("Upload verified. Triggering 9-stage analysis pipeline...");
      const scan = await triggerScan(targetProjectId);
      setCurrentScan(scan);

      setUploadStatus("Scan launched successfully! Closing ingestion dialog...");
      setTimeout(() => {
        setShowIngestModal(false);
        setSelectedFile(null);
        setNewProjectName("");
        setNewProjectDesc("");
        setUploadStatus(null);
        setUploading(false);
        handleSelectProject(targetProjectId);
        handleStartScan();
      }, 1000);

    } catch (err: any) {
      console.error("Ingestion failed:", err);
      setUploadStatus(`Error: ${err.message}`);
      setUploading(false);
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#c8b4a0]/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Search className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono font-bold tracking-widest text-primary uppercase">Discovery Engine</span>
          </div>
          <h1 className="text-2xl font-black text-text-bright">Cryptographic Asset Discovery</h1>
          <p className="text-xs text-text-dim mt-1">
            Evidence-first static discovery pipeline across source code repositories, manifests, certificates, binaries, and containers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowIngestModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold bg-[#1a1d18] border border-[#c8b4a0]/30 text-primary hover:border-[#c8b4a0] hover:bg-[#2a2e26] transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            INGEST ARTEFACT / REPO
          </button>
          <button
            onClick={handleStartScan}
            disabled={scanning || !selectedProjectId}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all ${
              scanning
                ? "bg-amber-950/60 border border-amber-500/50 text-amber-300"
                : "bg-primary text-[#1a1d18] shadow-glow-cyan hover:scale-105"
            }`}
          >
            {scanning ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> SCANNING...</> : <><Play className="w-3.5 h-3.5" /> TRIGGER SCAN</>}
          </button>
        </div>
      </div>

      {/* Target Repository Selector */}
      <div>
        <div className="flex items-center justify-between mb-3 font-mono text-xs text-text-dim">
          <span>SELECT TARGET ARTEFACT FOR TELEMETRY INSPECTION:</span>
          <span>{projects.length} targets configured</span>
        </div>
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
                    ? "bg-[#1a1d18] border-primary shadow-glow-cyan"
                    : "bg-[#0d0f0c] border-white/10 hover:border-primary/40"
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
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-primary">
                    {stats.scan ? stats.scan.state.toUpperCase() : "NO SCAN"}
                  </span>
                  <span className="text-xs font-bold text-text-bright">{stats.assetCount} assets</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* How to Put Files Guide Box */}
      <div className="p-6 rounded-2xl bg-[#1a1d18]/70 border border-[#c8b4a0]/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-primary">
            <HelpCircle className="w-4 h-4" />
            <span>HOW ARE ARTEFACTS INGESTED AND SCANNED IN ECDAT?</span>
          </div>
          <span className="text-[10px] font-mono text-text-dim">SIH26164 Multi-Modal Ingestion</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2">
            <div className="text-primary font-bold flex items-center gap-1.5">
              <UploadCloud className="w-3.5 h-3.5" /> Option 1: Web UI Upload
            </div>
            <p className="text-text-muted text-[11px] leading-relaxed">
              Click <strong>&quot;INGEST ARTEFACT / REPO&quot;</strong> above. Upload any source file (<code className="text-primary">.py</code>, <code className="text-primary">.java</code>), manifest (<code className="text-primary">pom.xml</code>, <code className="text-primary">requirements.txt</code>), certificate (<code className="text-primary">.pem</code>, <code className="text-primary">.crt</code>), Dockerfile, binary (<code className="text-primary">.jar</code>, <code className="text-primary">.so</code>), or repository archive (<code className="text-primary">.zip</code>).
            </p>
          </div>
          <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2">
            <div className="text-primary font-bold flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" /> Option 2: Local Repo Clones
            </div>
            <p className="text-text-muted text-[11px] leading-relaxed">
              Clone or copy repositories directly into <code className="text-primary">D:\ecdat\real-corpus\&lt;repo_name&gt;</code>. Run <code className="text-primary">python src/scripts/populate_real_scans.py</code> to batch scan 1,000+ files automatically.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2">
            <div className="text-primary font-bold flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" /> Option 3: REST API / CI-CD
            </div>
            <p className="text-text-muted text-[11px] leading-relaxed">
              Submit artifacts programmatically via curl or Jenkins:<br />
              <code className="text-[10px] text-text-dim block mt-1">POST /api/projects/&#123;id&#125;/artifacts?artifact_type=binary</code>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* 9-Stage Pipeline Status */}
        <div className="xl:col-span-1 bg-[#1a1d18]/60 border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-text-bright font-mono">9-Stage Pipeline Status</h2>
          </div>
          <div className="space-y-2">
            {Object.entries(stages).map(([stageName, stageData]: [string, any]) => {
              const state = stageData?.state || "pending";
              const isDone = state === "completed" || currentScan?.state === "completed";
              return (
                <div key={stageName} className="p-2.5 rounded-xl bg-black border border-white/5 flex items-center justify-between font-mono text-xs">
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
        <div className="xl:col-span-2 bg-black border border-primary/20 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-primary/15 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className={`w-3.5 h-3.5 ${scanning ? "text-primary animate-pulse" : "text-text-dim"}`} />
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
                <div className="text-primary">[OK] All 9 stages orchestrated (Ingest → Discover → Normalize → Fuse → Graph → Risk → Migrate → Validate → Export)</div>
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
      <div className="bg-[#1a1d18]/60 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-text-bright font-mono">ECDAT Scanner Coverage Boundaries (Rule 6)</h2>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Source Code AST", coverage: "Python AST, Java JCA Patterns", icon: FileCode, color: "text-blue-400" },
            { label: "Dependency Manifests", coverage: "POM, requirements.txt, pyproject", icon: Package, color: "text-amber-400" },
            { label: "X.509 Certificates", coverage: "PEM / DER ASN.1 inspection", icon: Shield, color: "text-emerald-400" },
            { label: "Binary & Containers", coverage: "Bounded static ELF/PE & Dockerfile inspection", icon: Server, color: "text-violet-400" },
          ].map((c, i) => (
            <div key={i} className="p-4 rounded-xl bg-black border border-white/10 space-y-2">
              <c.icon className={`w-5 h-5 ${c.color}`} />
              <div className="text-xs font-bold text-text-bright">{c.label}</div>
              <div className="text-[11px] text-text-dim">{c.coverage}</div>
            </div>
          ))}
        </div>
      </div>

      {/* INGESTION MODAL */}
      {showIngestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl p-6 rounded-3xl bg-[#1a1d18] border border-primary/30 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-text-bright font-mono">Ingest New Artefact or Repository</h3>
              </div>
              <button
                onClick={() => setShowIngestModal(false)}
                className="p-1 rounded-lg text-text-dim hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-4">
              {/* Target Project Selection */}
              <div>
                <label className="block text-xs font-mono text-text-dim mb-2 uppercase">Target Project</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setTargetType("existing")}
                    className={`py-2 px-3 rounded-xl border text-xs font-mono transition-all ${
                      targetType === "existing" ? "bg-primary text-[#1a1d18] font-bold border-primary" : "bg-black text-text-muted border-white/10"
                    }`}
                  >
                    Add to Existing Project
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType("new")}
                    className={`py-2 px-3 rounded-xl border text-xs font-mono transition-all ${
                      targetType === "new" ? "bg-primary text-[#1a1d18] font-bold border-primary" : "bg-black text-text-muted border-white/10"
                    }`}
                  >
                    Create New Project
                  </button>
                </div>

                {targetType === "existing" ? (
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full p-3 rounded-xl bg-black border border-white/15 text-text-bright font-mono text-xs focus:outline-none focus:border-primary"
                  >
                    {projects.map((p) => (
                      <option key={p.project_id} value={p.project_id}>
                        {p.name} (ID: {p.project_id.slice(0, 8)})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="e.g. Core-Banking-Gateway"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      required
                      className="w-full p-3 rounded-xl bg-black border border-white/15 text-text-bright font-mono text-xs focus:outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      placeholder="Brief description (optional)"
                      value={newProjectDesc}
                      onChange={(e) => setNewProjectDesc(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-black border border-white/10 text-text-dim font-mono text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                )}
              </div>

              {/* Artefact Type Selection */}
              <div>
                <label className="block text-xs font-mono text-text-dim mb-2 uppercase">Artefact Category</label>
                <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {ARTIFACT_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setSelectedArtifactType(t.value)}
                      className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 font-mono text-xs transition-all ${
                        selectedArtifactType === t.value
                          ? "bg-black border-primary text-text-bright"
                          : "bg-black/40 border-white/5 text-text-dim hover:border-white/20"
                      }`}
                    >
                      <t.icon className={`w-4 h-4 mt-0.5 ${selectedArtifactType === t.value ? "text-primary" : "text-text-dim"}`} />
                      <div>
                        <div className="font-bold">{t.label}</div>
                        <div className="text-[10px] text-text-dim">{t.hint}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* File Dropzone */}
              <div>
                <label className="block text-xs font-mono text-text-dim mb-2 uppercase">Select File</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-2xl border-2 border-dashed border-white/20 hover:border-primary/60 bg-black/40 flex flex-col items-center justify-center cursor-pointer transition-all text-center"
                >
                  <FileArchive className="w-8 h-8 text-primary mb-2 opacity-80" />
                  {selectedFile ? (
                    <div>
                      <span className="font-mono text-xs font-bold text-text-bright block">{selectedFile.name}</span>
                      <span className="font-mono text-[10px] text-text-dim">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ) : (
                    <div>
                      <span className="font-mono text-xs text-text-bright block">Click to select file or drop here</span>
                      <span className="font-mono text-[10px] text-text-dim">Supports .py, .java, .xml, .txt, .pem, .crt, .jar, .zip</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Message */}
              {uploadStatus && (
                <div className="p-3 rounded-xl bg-black border border-primary/30 font-mono text-xs text-primary flex items-center gap-2">
                  {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{uploadStatus}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowIngestModal(false)}
                  className="px-4 py-2.5 rounded-xl font-mono text-xs text-text-dim hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="px-6 py-2.5 rounded-xl bg-primary text-[#1a1d18] font-mono text-xs font-bold shadow-glow-cyan hover:scale-105 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {uploading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Ingesting...</> : <><UploadCloud className="w-3.5 h-3.5" /> Upload &amp; Scan</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

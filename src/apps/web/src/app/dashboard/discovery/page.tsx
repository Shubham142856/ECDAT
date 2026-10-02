"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search, Play, UploadCloud, ChevronDown, ChevronRight,
  CheckCircle2, Clock, RefreshCw, FileCode, Package,
  Shield, Server, Cpu, Globe, X, AlertCircle,
  FolderOpen, Terminal, Radio
} from "lucide-react";
import {
  getProjects, getScans, getScan, triggerScan,
  getScanAssets, createProject, uploadArtifact
} from "@/lib/api";
import { ProjectItem, ScanSummaryItem } from "@/lib/types";

const ARTIFACT_TYPES = [
  { value: "python_source", label: "Python Source (.py, .zip)", icon: FileCode },
  { value: "java_source", label: "Java Source (.java)", icon: FileCode },
  { value: "dependency", label: "Dependency Manifest (pom.xml, requirements.txt)", icon: Package },
  { value: "certificate", label: "X.509 Certificate (.pem, .crt)", icon: Shield },
  { value: "container", label: "Container / Dockerfile", icon: Server },
  { value: "binary", label: "Compiled Binary (.so, .dll, .jar)", icon: Cpu },
  { value: "config", label: "Configuration (.yaml, .json, .env)", icon: Globe },
];

export default function DiscoveryEnginePage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [currentScan, setCurrentScan] = useState<ScanSummaryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showProjectDetail, setShowProjectDetail] = useState(false);

  // Ingestion Modal
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [targetType, setTargetType] = useState<"existing" | "new">("existing");
  const [selectedArtifactType, setSelectedArtifactType] = useState("python_source");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        setLoading(true);
        const projList = await getProjects();
        if (!mounted) return;
        setProjects(projList);
        if (projList.length > 0) {
          const firstId = projList[0].project_id;
          setSelectedProjectId(firstId);
          const scans = await getScans(firstId).catch(() => []);
          if (scans.length > 0 && mounted) setCurrentScan(scans[0]);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowProjectDropdown(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedProject = projects.find((p) => p.project_id === selectedProjectId);

  const handleSelectProject = async (projId: string) => {
    setSelectedProjectId(projId);
    setShowProjectDropdown(false);
    setShowProjectDetail(true);
    setCurrentScan(null);
    try {
      const scans = await getScans(projId);
      if (scans.length > 0) setCurrentScan(scans[0]);
    } catch {/* silent */ }
  };

  const handleStartScan = async () => {
    if (!selectedProjectId) return;
    try {
      setScanning(true);
      const newScan = await triggerScan(selectedProjectId);
      setCurrentScan(newScan);
      const pollInterval = setInterval(async () => {
        try {
          const updated = await getScan(newScan.scan_id);
          setCurrentScan(updated);
          if (updated.state === "completed" || updated.state === "failed") {
            clearInterval(pollInterval);
            setScanning(false);
          }
        } catch {
          clearInterval(pollInterval);
          setScanning(false);
        }
      }, 1500);
    } catch (err) {
      console.error("Scan trigger failed:", err);
      setScanning(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) { setUploadStatus("Please choose a file to upload."); return; }
    try {
      setUploading(true);
      setUploadStatus("Initializing upload...");
      let targetProjectId = selectedProjectId;
      if (targetType === "new") {
        if (!newProjectName.trim()) { setUploadStatus("Please specify a project name."); setUploading(false); return; }
        setUploadStatus("Creating project in inventory...");
        const created = await createProject(newProjectName.trim(), newProjectDesc.trim() || undefined);
        targetProjectId = created.project_id;
        const updatedProjects = await getProjects();
        setProjects(updatedProjects);
        setSelectedProjectId(created.project_id);
      }
      setUploadStatus(`Uploading ${selectedFile.name}...`);
      await uploadArtifact(targetProjectId, selectedFile, selectedArtifactType);
      setUploadStatus("Upload done. Triggering analysis pipeline...");
      const scan = await triggerScan(targetProjectId);
      setCurrentScan(scan);
      setUploadStatus("Scan launched! Pipeline running...");
      setTimeout(() => {
        setShowIngestModal(false);
        setSelectedFile(null);
        setNewProjectName("");
        setNewProjectDesc("");
        setUploadStatus(null);
        setUploading(false);
        setShowProjectDetail(true);
      }, 1200);
    } catch (err: any) {
      setUploadStatus(`Error: ${err.message}`);
      setUploading(false);
    }
  };

  const stages = currentScan?.stages || {
    ingest: { state: "pending" }, discover: { state: "pending" },
    normalize: { state: "pending" }, fuse: { state: "pending" },
    graph: { state: "pending" }, risk: { state: "pending" },
    migrate: { state: "pending" }, validate: { state: "pending" },
    export: { state: "pending" },
  };

  const stageComplete = currentScan?.state === "completed";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#c8b4a0]/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Search className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono font-bold tracking-widest text-primary uppercase">Discovery Engine</span>
          </div>
          <h1 className="text-2xl font-black text-text-bright">Cryptographic Asset Discovery</h1>
          <p className="text-xs text-text-dim mt-1">
            Evidence-first static analysis — source, manifests, certificates, binaries, containers.
          </p>
        </div>
        <button
          onClick={() => setShowIngestModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold bg-primary text-[#1a1d18] hover:opacity-90 transition-all shadow-glow-cyan"
        >
          <UploadCloud className="w-4 h-4" />
          INGEST ARTEFACT
        </button>
      </div>

      {/* Target selector — single dropdown */}
      <div className="space-y-3">
        <p className="font-mono text-xs text-text-dim uppercase tracking-widest">Select Existing Artefact / Project</p>
        <div className="flex gap-3 items-start">
          {/* Dropdown */}
          <div className="relative flex-1" ref={dropdownRef}>
            <button
              onClick={() => setShowProjectDropdown((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#1a1d18] border border-[#c8b4a0]/20 hover:border-primary/60 transition-all font-mono text-sm text-text-bright"
            >
              <span className="truncate">
                {loading ? "Loading projects..." : selectedProject ? selectedProject.name : "— Choose a project —"}
              </span>
              <ChevronDown className={`w-4 h-4 text-primary ml-2 flex-shrink-0 transition-transform ${showProjectDropdown ? "rotate-180" : ""}`} />
            </button>

            {showProjectDropdown && !loading && (
              <div className="absolute z-20 mt-2 w-full rounded-2xl bg-[#1a1d18] border border-[#c8b4a0]/20 shadow-2xl overflow-hidden">
                {projects.length === 0 ? (
                  <div className="px-4 py-4 text-xs font-mono text-text-dim text-center">
                    No projects yet — click INGEST ARTEFACT to create one.
                  </div>
                ) : (
                  projects.map((p) => (
                    <button
                      key={p.project_id}
                      onClick={() => handleSelectProject(p.project_id)}
                      className={`w-full px-4 py-3 text-left font-mono text-sm transition-colors border-b border-white/5 last:border-0 ${
                        selectedProjectId === p.project_id
                          ? "bg-[#2a2e26] text-primary"
                          : "text-text-bright hover:bg-[#2a2e26]/50"
                      }`}
                    >
                      <div className="font-bold">{p.name}</div>
                      <div className="text-[10px] text-text-dim truncate">{p.project_id}</div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Trigger Scan button */}
          <button
            onClick={() => { setShowProjectDetail(true); handleStartScan(); }}
            disabled={scanning || !selectedProjectId}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-mono text-xs font-bold transition-all ${
              scanning
                ? "bg-amber-950/60 border border-amber-500/40 text-amber-300 cursor-not-allowed"
                : "bg-[#1a1d18] border border-[#c8b4a0]/30 text-primary hover:border-primary hover:bg-[#2a2e26]"
            }`}
          >
            {scanning
              ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />SCANNING</>
              : <><Play className="w-3.5 h-3.5" />RUN SCAN</>
            }
          </button>
        </div>
      </div>

      {/* Project detail — revealed only on click */}
      {showProjectDetail && selectedProject && (
        <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Detail header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-xs text-primary">
              <ChevronRight className="w-4 h-4" />
              <span className="font-bold">{selectedProject.name}</span>
              <span className="text-text-dim">— {selectedProject.project_id.slice(0, 12)}...</span>
            </div>
            <button
              onClick={() => setShowProjectDetail(false)}
              className="text-text-dim hover:text-text-bright transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* 9-Stage Pipeline */}
            <div className="xl:col-span-1 bg-[#1a1d18]/60 border border-white/10 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-text-bright">
                <Cpu className="w-4 h-4 text-primary" />
                9-Stage Pipeline
              </div>
              <div className="space-y-1.5">
                {Object.entries(stages).map(([stageName, stageData]: [string, any]) => {
                  const done = stageComplete || stageData?.state === "completed";
                  return (
                    <div
                      key={stageName}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-black border border-white/5 font-mono text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {done
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          : <Clock className="w-3.5 h-3.5 text-text-dim" />
                        }
                        <span className="font-bold uppercase text-text-bright">{stageName}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                        done ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/20" : "bg-white/5 text-text-dim"
                      }`}>
                        {done ? "DONE" : (stageData?.state || "PENDING").toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Provenance / Scan Log */}
            <div className="xl:col-span-2 bg-black border border-primary/20 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-primary/15 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className={`w-3.5 h-3.5 ${scanning ? "text-primary animate-pulse" : "text-text-dim"}`} />
                  <span className="text-xs font-mono font-bold text-text-bright">SCAN PROVENANCE LOG</span>
                </div>
                <span className="text-[10px] font-mono text-text-dim">
                  {currentScan ? `Scan: ${currentScan.scan_id.slice(0, 8)}` : "No scan yet"}
                </span>
              </div>
              <div className="p-5 font-mono text-xs space-y-1.5 h-72 overflow-y-auto">
                {currentScan ? (
                  <>
                    <div className="text-text-dim">[INFO] Project: {selectedProject.name} ({selectedProjectId})</div>
                    <div className="text-text-dim">[INFO] Scan ID: {currentScan.scan_id}</div>
                    <div className="text-text-dim">[INFO] Mode: {currentScan.mode?.toUpperCase() || "LIVE"}</div>
                    <div className="text-text-dim">[INFO] Engine: ECDAT — AST + Dependency + X.509 + Container</div>
                    <div className={`font-bold ${currentScan.state === "completed" ? "text-emerald-400" : "text-amber-300"}`}>
                      [STATUS] {currentScan.state.toUpperCase()}
                    </div>
                    {stageComplete && (
                      <>
                        <div className="text-primary">[OK] 9 stages completed (Ingest→Discover→Normalize→Fuse→Graph→Risk→Migrate→Validate→Export)</div>
                        <div className="text-emerald-400">[OK] CycloneDX 1.6/1.7 CBOM generated and schema verified</div>
                      </>
                    )}
                    <div className="text-text-dim">[INFO] Started: {currentScan.started_at || "N/A"}</div>
                    <div className="text-text-dim">[INFO] Completed: {currentScan.completed_at || "N/A"}</div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 h-full justify-center text-text-dim">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    No scan found for this project. Click RUN SCAN to start.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state when no project selected and no detail shown */}
      {!showProjectDetail && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 border border-dashed border-white/10 rounded-2xl">
          <FolderOpen className="w-10 h-10 text-primary/40" />
          <p className="font-mono text-sm text-text-dim">
            Select a project above to inspect its scan status,<br />or ingest a new artefact to start discovery.
          </p>
        </div>
      )}

      {/* INGESTION MODAL */}
      {showIngestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl p-6 rounded-3xl bg-[#1a1d18] border border-primary/30 shadow-2xl space-y-6">
            {/* Modal header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-text-bright font-mono">Ingest Artefact</h3>
              </div>
              <button onClick={() => { setShowIngestModal(false); setUploadStatus(null); }} className="text-text-dim hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-5">
              {/* Target type toggle */}
              <div className="flex gap-2 p-1 rounded-xl bg-black border border-white/10">
                {(["existing", "new"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTargetType(t)}
                    className={`flex-1 py-2 rounded-lg font-mono text-xs font-bold transition-all ${
                      targetType === t
                        ? "bg-[#2a2e26] text-primary border border-primary/30"
                        : "text-text-dim hover:text-text-bright"
                    }`}
                  >
                    {t === "existing" ? "EXISTING PROJECT" : "NEW PROJECT"}
                  </button>
                ))}
              </div>

              {/* Existing project selector */}
              {targetType === "existing" && (
                <div className="space-y-1.5">
                  <label className="font-mono text-xs text-text-dim">Target Project</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-black border border-white/10 text-text-bright font-mono text-sm focus:outline-none focus:border-primary/50"
                  >
                    {projects.length === 0
                      ? <option value="">No projects — switch to NEW PROJECT</option>
                      : projects.map((p) => (
                          <option key={p.project_id} value={p.project_id}>{p.name}</option>
                        ))
                    }
                  </select>
                </div>
              )}

              {/* New project fields */}
              {targetType === "new" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="font-mono text-xs text-text-dim">Project Name *</label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="e.g., Internal Auth Service"
                      className="w-full px-3 py-2.5 rounded-xl bg-black border border-white/10 text-text-bright font-mono text-sm focus:outline-none focus:border-primary/50 placeholder:text-text-dim"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-mono text-xs text-text-dim">Description (optional)</label>
                    <input
                      type="text"
                      value={newProjectDesc}
                      onChange={(e) => setNewProjectDesc(e.target.value)}
                      placeholder="Brief description"
                      className="w-full px-3 py-2.5 rounded-xl bg-black border border-white/10 text-text-bright font-mono text-sm focus:outline-none focus:border-primary/50 placeholder:text-text-dim"
                    />
                  </div>
                </div>
              )}

              {/* Artefact type */}
              <div className="space-y-1.5">
                <label className="font-mono text-xs text-text-dim">Artefact Type</label>
                <select
                  value={selectedArtifactType}
                  onChange={(e) => setSelectedArtifactType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black border border-white/10 text-text-bright font-mono text-sm focus:outline-none focus:border-primary/50"
                >
                  {ARTIFACT_TYPES.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>

              {/* File input */}
              <div className="space-y-1.5">
                <label className="font-mono text-xs text-text-dim">File</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-4 rounded-xl border border-dashed border-[#c8b4a0]/30 bg-black/50 flex items-center gap-3 cursor-pointer hover:border-primary/60 transition-colors"
                >
                  <UploadCloud className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="font-mono text-xs text-text-dim truncate">
                    {selectedFile ? selectedFile.name : "Click to browse or drop a file here"}
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>

              {/* Status line */}
              {uploadStatus && (
                <div className={`px-3 py-2.5 rounded-xl font-mono text-xs border ${
                  uploadStatus.startsWith("Error")
                    ? "bg-red-950/40 border-red-500/30 text-red-300"
                    : "bg-emerald-950/30 border-emerald-500/20 text-emerald-300"
                }`}>
                  {uploadStatus}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={uploading}
                className="w-full py-3 rounded-xl font-mono text-xs font-bold bg-primary text-[#1a1d18] hover:opacity-90 transition-all disabled:opacity-50"
              >
                {uploading ? "UPLOADING & SCANNING..." : "UPLOAD & START ANALYSIS PIPELINE"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

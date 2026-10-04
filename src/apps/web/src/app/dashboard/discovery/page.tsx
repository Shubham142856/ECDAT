"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, Play, UploadCloud, ChevronDown, ChevronRight,
  CheckCircle2, Clock, RefreshCw, FileCode, Package,
  Shield, Server, Cpu, Globe, X, AlertCircle,
  FolderOpen, Terminal, Radio, Sparkles, ArrowRight,
  ShieldCheck, Network, AlertTriangle, Layers, FileText
} from "lucide-react";
import {
  getProjects, getScans, getScan, triggerScan,
  getScanAssets, createProject, uploadArtifact
} from "@/lib/api";
import { CryptoAssetItem, ProjectItem, ScanSummaryItem } from "@/lib/types";
import { getStoredProjectId, setStoredProjectId } from "@/lib/projectContext";

const ARTIFACT_TYPES = [
  { value: "python_source", label: "Python Source (.py, .zip)", icon: FileCode },
  { value: "java_source", label: "Java Source (.java)", icon: FileCode },
  { value: "dependency", label: "Dependency Manifest (pom.xml, requirements.txt)", icon: Package },
  { value: "certificate", label: "X.509 Certificate (.pem, .crt)", icon: Shield },
  { value: "container", label: "Container / Dockerfile", icon: Server },
  { value: "binary", label: "Compiled Binary (.so, .dll, .jar)", icon: Cpu },
  { value: "config", label: "Configuration (.yaml, .json, .env)", icon: Globe },
];

const SIH_STEPS = [
  { id: 1, name: "Discovery", desc: "AST Scan & Ingest", href: "/dashboard/discovery", current: true },
  { id: 2, name: "CBOM Inventory", desc: "Evidence-Backed Assets", href: "/dashboard/assets", current: false },
  { id: 3, name: "Crypto Graph", desc: "Blast Radius & Topology", href: "/dashboard/graph", current: false },
  { id: 4, name: "Quantum Risk", desc: "Mosca P(X+Y>Z)", href: "/dashboard/risk", current: false },
  { id: 5, name: "PQC Migration", desc: "FIPS 203/204/205", href: "/dashboard/migration", current: false },
  { id: 6, name: "Reports & Export", desc: "CycloneDX 1.7 CBOM", href: "/dashboard/reports", current: false },
];

export default function DiscoveryEnginePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  
  // Baseline scan info (saved in DB from previous run)
  const [baselineScan, setBaselineScan] = useState<ScanSummaryItem | null>(null);
  const [baselineAssetCount, setBaselineAssetCount] = useState<number | null>(null);
  
  // Live session scan state (only populated when user actively clicks RUN SCAN or uploads)
  const [liveScan, setLiveScan] = useState<ScanSummaryItem | null>(null);
  const [liveAssets, setLiveAssets] = useState<CryptoAssetItem[]>([]);
  const [scanSessionState, setScanSessionState] = useState<"idle" | "running" | "completed" | "failed">("idle");
  const [scanning, setScanning] = useState(false);

  const [loading, setLoading] = useState(true);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

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
          const stored = getStoredProjectId();
          const target = projList.find((p) => p.project_id === stored) || projList[0];
          setSelectedProjectId(target.project_id);
          setStoredProjectId(target.project_id);
          await loadBaselineForProject(target.project_id, mounted);
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

  async function loadBaselineForProject(projId: string, mounted = true) {
    try {
      const scans = await getScans(projId).catch(() => []);
      if (scans.length > 0 && mounted) {
        const latest = scans[0];
        setBaselineScan(latest);
        if (latest.state === "completed") {
          const assets = await getScanAssets(latest.scan_id).catch(() => []);
          if (mounted) setBaselineAssetCount(assets.length);
        } else {
          if (mounted) setBaselineAssetCount(null);
        }
      } else {
        if (mounted) {
          setBaselineScan(null);
          setBaselineAssetCount(null);
        }
      }
    } catch {
      if (mounted) {
        setBaselineScan(null);
        setBaselineAssetCount(null);
      }
    }
  }

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
    setStoredProjectId(projId);
    setShowProjectDropdown(false);
    // Reset active scan session state so we don't display old results as fresh scan
    setScanSessionState("idle");
    setLiveScan(null);
    setLiveAssets([]);
    await loadBaselineForProject(projId);
  };

  const startPolling = (scanId: string) => {
    setScanning(true);
    setScanSessionState("running");
    setLiveAssets([]);
    
    const pollInterval = setInterval(async () => {
      try {
        const updated = await getScan(scanId);
        setLiveScan(updated);
        if (updated.state === "completed" || updated.state === "failed") {
          clearInterval(pollInterval);
          setScanning(false);
          if (updated.state === "completed") {
            setScanSessionState("completed");
            const assets = await getScanAssets(updated.scan_id).catch(() => []);
            setLiveAssets(assets);
            setBaselineAssetCount(assets.length);
            setBaselineScan(updated);
          } else {
            setScanSessionState("failed");
          }
        }
      } catch {
        clearInterval(pollInterval);
        setScanning(false);
        setScanSessionState("failed");
      }
    }, 1000);
  };

  const handleStartScan = async () => {
    if (!selectedProjectId) return;
    try {
      setScanning(true);
      setScanSessionState("running");
      setLiveScan(null);
      setLiveAssets([]);
      const newScan = await triggerScan(selectedProjectId);
      setLiveScan(newScan);
      startPolling(newScan.scan_id);
    } catch (err) {
      console.error("Scan trigger failed:", err);
      setScanning(false);
      setScanSessionState("failed");
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadStatus("Please choose or select a sample file to upload.");
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
        setUploadStatus("Registering project in inventory...");
        const created = await createProject(newProjectName.trim(), newProjectDesc.trim() || undefined);
        targetProjectId = created.project_id;
        const updatedProjects = await getProjects();
        setProjects(updatedProjects);
        setSelectedProjectId(created.project_id);
        setStoredProjectId(created.project_id);
      } else {
        setStoredProjectId(targetProjectId);
      }

      setUploadStatus(`Uploading ${selectedFile.name}...`);
      await uploadArtifact(targetProjectId, selectedFile, selectedArtifactType);
      setUploadStatus("Upload complete. Triggering 9-stage analysis pipeline...");
      
      const scan = await triggerScan(targetProjectId);
      setLiveScan(scan);
      setUploadStatus("Pipeline started! Processing AST & crypto primitives...");
      
      setTimeout(() => {
        setShowIngestModal(false);
        setSelectedFile(null);
        setNewProjectName("");
        setNewProjectDesc("");
        setUploadStatus(null);
        setUploading(false);
        startPolling(scan.scan_id);
      }, 600);
    } catch (err: any) {
      setUploadStatus(`Error: ${err.message}`);
      setUploading(false);
    }
  };

  // Sample 1: Auth crypto service (RSA-2048 + AES-256 + SHA-256/512)
  const handleLoadSampleAuthCrypto = () => {
    const code = `# ECDAT Sample Cryptographic Authentication Service
import hashlib
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

def auth_service(payload: bytes):
    # RSA Key Generation (Asymmetric - Quantum Breakable)
    priv_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    
    # SHA-256 / SHA-512 Digests (Hashing - Quantum Safe)
    digest256 = hashlib.sha256(payload).hexdigest()
    digest512 = hashlib.sha512(payload).hexdigest()
    
    # AES-256-CBC Encryption (Symmetric - Quantum Safe)
    key = b"0123456789abcdef0123456789abcdef"
    iv = b"0123456789abcdef"
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    
    return priv_key, digest256, digest512, cipher
`;
    const blob = new Blob([code], { type: "text/x-python" });
    const file = new File([blob], "auth_crypto_service.py", { type: "text/x-python" });
    setSelectedFile(file);
    setSelectedArtifactType("python_source");
    if (targetType === "new" && !newProjectName) {
      setNewProjectName("crypto-auth-microservice");
      setNewProjectDesc("Authentication microservice with RSA-2048, SHA-256/512, and AES-256");
    }
  };

  // Sample 2: JWT & Token Verification (ECDSA + HMAC-SHA256 + SHA-384)
  const handleLoadSampleJWTCrypto = () => {
    const code = `# ECDAT Sample JWT Token Verification & ECDSA Signer
import hmac
import hashlib
from cryptography.hazmat.primitives.asymmetric import ec

def jwt_crypto_service(token_data: bytes):
    # ECDSA (Elliptic Curve P-256 / secp256r1 - Quantum Vulnerable)
    ec_key = ec.generate_private_key(ec.SECP256R1())
    
    # HMAC-SHA256 Token Signature (MAC - Quantum Safe)
    secret = b"enterprise-hmac-secret-key-32bytes"
    sig = hmac.new(secret, token_data, hashlib.sha256).digest()
    
    # SHA-384 Digest
    sha384_val = hashlib.sha384(token_data).hexdigest()
    return ec_key, sig, sha384_val
`;
    const blob = new Blob([code], { type: "text/x-python" });
    const file = new File([blob], "jwt_token_service.py", { type: "text/x-python" });
    setSelectedFile(file);
    setSelectedArtifactType("python_source");
    if (targetType === "new" && !newProjectName) {
      setNewProjectName("jwt-token-service");
      setNewProjectDesc("Token verification service with ECDSA P-256, HMAC-SHA256, and SHA-384");
    }
  };

  // Current active stages display:
  // If scanning or just completed, show liveScan stages.
  // Otherwise show standby stages.
  const displayScan = scanSessionState !== "idle" ? liveScan : null;
  const stages = displayScan?.stages || {
    ingest: { state: "pending" }, discover: { state: "pending" },
    normalize: { state: "pending" }, fuse: { state: "pending" },
    graph: { state: "pending" }, risk: { state: "pending" },
    migrate: { state: "pending" }, validate: { state: "pending" },
    export: { state: "pending" },
  };

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
            <Search className="w-4 h-4 text-white" />
            <span className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">
              Step 1 — Discovery Engine
            </span>
          </div>
          <h1 className="text-2xl font-black text-white">Cryptographic Asset Discovery</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Deterministic static AST analysis, dependencies, and certificates.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowIngestModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-bold bg-white text-black hover:bg-slate-200 transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            Ingest Artefact
          </button>
        </div>
      </div>

      {/* Target Selector & Action Hub */}
      <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              ACTIVE TARGET
            </span>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowProjectDropdown((v) => !v)}
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-black border border-white/20 hover:border-white/40 transition-all font-mono text-sm text-white font-bold"
              >
                <span>{loading ? "Loading..." : selectedProject ? selectedProject.name : "— Select Target —"}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showProjectDropdown ? "rotate-180" : ""}`} />
              </button>

              {showProjectDropdown && !loading && (
                <div className="absolute z-30 mt-2 w-72 rounded-2xl bg-black border border-white/20 shadow-2xl overflow-hidden">
                  <div className="p-2 border-b border-white/10 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    Available Projects
                  </div>
                  {projects.map((p) => (
                    <button
                      key={p.project_id}
                      onClick={() => handleSelectProject(p.project_id)}
                      className={`w-full px-4 py-2.5 text-left font-mono text-xs transition-colors border-b border-white/5 last:border-0 ${
                        selectedProjectId === p.project_id
                          ? "bg-white/15 text-white font-bold"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{p.name}</span>
                      </div>
                      <div className="text-[9px] text-slate-500 truncate mt-0.5">{p.project_id.slice(0, 18)}...</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {baselineAssetCount !== null && (
              <Link
                href="/dashboard/assets"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black border border-white/15 text-white hover:border-white/30 font-mono text-xs font-bold transition-all"
              >
                <ShieldCheck className="w-4 h-4 text-white" />
                <span>CBOM Inventory ({baselineAssetCount} Assets) →</span>
              </Link>
            )}

            <button
              onClick={handleStartScan}
              disabled={scanning || !selectedProjectId}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all ${
                scanning
                  ? "bg-white/10 border border-white/20 text-white cursor-not-allowed"
                  : "bg-white text-black hover:bg-slate-200"
              }`}
            >
              {scanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ANALYZING...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  {baselineScan ? "RUN DISCOVERY SCAN" : "START FIRST SCAN"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Target Details */}
        {selectedProject && (
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="text-slate-400 flex items-center gap-2">
              <span className="text-white font-bold">{selectedProject.name}</span>
              <span>—</span>
              <span className="text-slate-400">{selectedProject.description || "Project artefact"}</span>
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              {baselineScan ? (
                <span className="text-white flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  Verified Baseline ({baselineAssetCount ?? 0} Assets)
                </span>
              ) : (
                <span className="text-slate-400 flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Ready to scan
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* DISCOVERY SCAN RESULTS CARD */}
      {scanSessionState === "completed" && (
        <div className="p-5 rounded-2xl border border-white/20 bg-white/[0.03] backdrop-blur-xl shadow-2xl space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-white" />
                <h3 className="text-base font-bold font-mono text-white">
                  {liveAssets.length > 0
                    ? `Scan Completed: ${liveAssets.length} Cryptographic Assets Discovered`
                    : "Scan Completed: 0 Cryptographic Operations Detected"}
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-mono max-w-2xl">
                {liveAssets.length > 0
                  ? "Verified cryptographic primitives, key usages, and parameters fused into database."
                  : "Deterministic scan completed. Non-cryptographic source code yields 0 claims."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {liveAssets.length > 0 ? (
                <>
                  <Link
                    href="/dashboard/assets"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-mono text-xs font-bold hover:bg-slate-200 transition-all"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Open Inventory ({liveAssets.length}) →
                  </Link>
                  <Link
                    href="/dashboard/graph"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black border border-white/15 font-mono text-xs text-white hover:border-white/30 transition-all"
                  >
                    <Network className="w-3.5 h-3.5" />
                    Graph
                  </Link>
                  <Link
                    href="/dashboard/risk"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black border border-white/15 font-mono text-xs text-white hover:border-white/30 transition-all"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Risk
                  </Link>
                </>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const pyjwt = projects.find(p => (p.name || "").toLowerCase() === "pyjwt");
                      if (pyjwt) handleSelectProject(pyjwt.project_id);
                    }}
                    className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 font-mono text-xs font-bold text-white hover:bg-white/20 transition-all"
                  >
                    Switch to PyJWT →
                  </button>
                  <button
                    onClick={() => setShowIngestModal(true)}
                    className="px-3 py-2 rounded-xl bg-black border border-white/15 font-mono text-xs text-slate-300 hover:text-white transition-all"
                  >
                    Ingest File
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Discovered Asset Chips */}
          {liveAssets.length > 0 && (
            <div className="pt-3 border-t border-white/10 space-y-2">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">
                Discovered Cryptographic Primitives:
              </div>
              <div className="flex flex-wrap gap-2">
                {liveAssets.map((asset) => (
                  <div
                    key={asset.asset_id}
                    className="px-3 py-1.5 rounded-xl font-mono text-xs border border-white/15 bg-white/5 text-white flex items-center gap-2"
                  >
                    <span className="font-bold">{asset.canonical_algorithm}</span>
                    <span className="text-[10px] text-slate-400">({asset.usage_role})</span>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/10 text-white">
                      {asset.quantum_status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 9-Stage Pipeline & Live Terminal Inspection */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* 9-Stage Pipeline Card */}
        <div className="xl:col-span-1 bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-3 backdrop-blur-xl">
          <div className="flex items-center justify-between font-mono text-xs font-bold text-white">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-white" />
              <span>9-Stage Pipeline Engine</span>
            </div>
            {scanning ? (
              <span className="text-[10px] text-white font-bold animate-pulse">RUNNING</span>
            ) : scanSessionState === "completed" ? (
              <span className="text-[10px] text-white font-bold">VERIFIED</span>
            ) : (
              <span className="text-[10px] text-slate-400 font-bold">STANDBY</span>
            )}
          </div>

          <div className="space-y-1.5">
            {Object.entries(stages).map(([stageName, stageData]: [string, any], idx) => {
              const isDone = scanSessionState === "completed" || stageData?.state === "completed" || stageData?.state === "done";
              const isRunning = scanning && stageData?.state === "running";
              
              return (
                <div
                  key={stageName}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/50 border border-white/5 font-mono text-xs"
                >
                  <div className="flex items-center gap-2">
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    ) : isRunning ? (
                      <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                    ) : (
                      <span className="text-[10px] text-slate-500 font-bold w-3.5 text-center">{idx + 1}</span>
                    )}
                    <span className="font-bold uppercase text-white">{stageName}</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      isDone
                        ? "bg-white/10 text-white border border-white/20"
                        : isRunning
                        ? "bg-white/15 text-white border border-white/30 animate-pulse"
                        : "bg-white/5 text-slate-500"
                    }`}
                  >
                    {isDone ? "VERIFIED" : isRunning ? "RUNNING" : "READY"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Terminal & Provenance Log */}
        <div className="xl:col-span-2 bg-black border border-white/10 rounded-2xl overflow-hidden flex flex-col justify-between">
          <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <Terminal className={`w-3.5 h-3.5 ${scanning ? "text-white animate-pulse" : "text-slate-400"}`} />
              <span className="text-xs font-mono font-bold text-white">SCAN PROVENANCE LOG</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {liveScan
                ? `Active Scan: ${liveScan.scan_id.slice(0, 8)}`
                : baselineScan
                ? `Saved Baseline: ${baselineScan.scan_id.slice(0, 8)}`
                : "Standby"}
            </span>
          </div>

          <div className="p-5 font-mono text-xs space-y-1.5 h-72 overflow-y-auto bg-black text-slate-300">
            {scanning ? (
              <>
                <div className="text-white font-bold">[SYSTEM] Executing pipeline for target {selectedProject?.name}...</div>
                <div className="text-slate-300">[STAGE 1] Ingesting files into sandbox...</div>
                <div className="text-slate-300">[STAGE 2] AST visitor traversing parse trees...</div>
                <div className="text-slate-400">[STAGE 3] Algorithm parameter normalization...</div>
                <div className="text-slate-400">[STAGE 4] Fusing evidence into claims matrix...</div>
                <div className="text-white animate-pulse">[PROCESSING] Analyzing...</div>
              </>
            ) : scanSessionState === "completed" && liveScan ? (
              <>
                <div className="text-white font-bold">[SUCCESS] Scan {liveScan.scan_id.slice(0, 8)} completed</div>
                <div className="text-white">[INVENTORY] Discovered {liveAssets.length} cryptographic assets</div>
                <div className="text-slate-400">[EVIDENCE] Claims verified with AST source locations</div>
                <div className="text-slate-400">[CBOM] CycloneDX 1.7 generated and schema validated</div>
                <div className="text-white font-bold">[READY] Inspect inventory, graph, or risk</div>
              </>
            ) : baselineScan ? (
              <>
                <div className="text-slate-400">[SYSTEM] Target loaded: {selectedProject?.name}</div>
                <div className="text-slate-400">[BASELINE] Scan {baselineScan.scan_id.slice(0, 8)} on record</div>
                <div className="text-white">[INVENTORY] {baselineAssetCount ?? 0} cryptographic assets in inventory</div>
                <div className="text-slate-300">[READY] Click "RUN DISCOVERY SCAN" to re-scan</div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-2">
                <AlertCircle className="w-6 h-6 text-slate-400" />
                <p>Engine standby. Select target and click "RUN DISCOVERY SCAN".</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* INGESTION MODAL WITH INSTANT TEST TEMPLATES */}
      {showIngestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-xl p-6 rounded-3xl bg-black border border-white/10 shadow-2xl space-y-5">
            {/* Modal header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-white" />
                <h3 className="text-base font-bold text-white font-mono">Ingest &amp; Analyze Artefact</h3>
              </div>
              <button
                onClick={() => { setShowIngestModal(false); setUploadStatus(null); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-4">
              {/* Target type toggle */}
              <div className="flex gap-2 p-1 rounded-xl bg-black border border-white/10">
                {(["existing", "new"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTargetType(t)}
                    className={`flex-1 py-2 rounded-lg font-mono text-xs font-bold transition-all ${
                      targetType === t
                        ? "bg-white/15 text-white border border-white/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {t === "existing" ? "ADD TO EXISTING PROJECT" : "CREATE NEW PROJECT"}
                  </button>
                ))}
              </div>

              {/* Target Project Selector */}
              {targetType === "existing" ? (
                <div className="space-y-1">
                  <label className="font-mono text-[11px] text-slate-400">Target Project</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      setStoredProjectId(e.target.value);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-black border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-white/40"
                  >
                    {projects.map((p) => (
                      <option key={p.project_id} value={p.project_id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <label className="font-mono text-[11px] text-slate-400">Project Name *</label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="e.g., auth-microservice"
                      className="w-full px-3 py-2 rounded-xl bg-black border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-white/40"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[11px] text-slate-400">Description</label>
                    <input
                      type="text"
                      value={newProjectDesc}
                      onChange={(e) => setNewProjectDesc(e.target.value)}
                      placeholder="e.g., RSA & AES crypto provider"
                      className="w-full px-3 py-2 rounded-xl bg-black border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-white/40"
                    />
                  </div>
                </div>
              )}

              {/* Artefact Type */}
              <div className="space-y-1">
                <label className="font-mono text-[11px] text-slate-400">Artefact Type</label>
                <select
                  value={selectedArtifactType}
                  onChange={(e) => setSelectedArtifactType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-white/40"
                >
                  {ARTIFACT_TYPES.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>

              {/* Quick Sample Templates */}
              <div className="space-y-1.5 p-3 rounded-xl bg-black/60 border border-white/10">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-white font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Test Samples:</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleLoadSampleAuthCrypto}
                    className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-[10px] font-mono text-white hover:bg-white/20 transition-colors"
                  >
                    Sample 1: RSA-2048 + AES-256 + SHA-256
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadSampleJWTCrypto}
                    className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-[10px] font-mono text-white hover:bg-white/20 transition-colors"
                  >
                    Sample 2: ECDSA P-256 + HMAC-SHA256
                  </button>
                </div>
              </div>

              {/* File upload drag/drop */}
              <div className="space-y-1">
                <label className="font-mono text-[11px] text-slate-400">Upload Source File (.py, .java, etc.)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-4 rounded-xl border border-dashed border-white/20 bg-black/50 flex items-center gap-3 cursor-pointer hover:border-white/40 transition-colors"
                >
                  <UploadCloud className="w-5 h-5 text-white flex-shrink-0" />
                  <span className="font-mono text-xs text-slate-400 truncate">
                    {selectedFile ? selectedFile.name : "Click to select a file"}
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>

              {/* Upload Status */}
              {uploadStatus && (
                <div className="px-3 py-2 rounded-xl font-mono text-xs border bg-white/5 border-white/15 text-white">
                  {uploadStatus}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={uploading}
                className="w-full py-2.5 rounded-xl font-mono text-xs font-bold bg-white text-black hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                {uploading ? "UPLOADING & ANALYZING..." : "UPLOAD & RUN DISCOVERY SCAN"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

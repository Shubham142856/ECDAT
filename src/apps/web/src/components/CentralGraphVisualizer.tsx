"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Cpu, 
  Key, 
  FileCode, 
  Server, 
  Layers, 
  Box, 
  Cloud, 
  Lock, 
  Sparkles,
  ExternalLink,
  Activity,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

interface NodeData {
  id: string;
  label: string;
  type: string;
  algorithm: string;
  usage: string;
  risk: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "SAFE";
  dependencies: number;
  evidence: string;
  confidence: number;
  icon: any;
  angle: number; // in degrees
  distance: number; // radius from center
  color: string;
}

const NODES: NodeData[] = [
  {
    id: "node-app",
    label: "Core Banking Portal",
    type: "APPLICATIONS",
    algorithm: "RSA-2048 / ECDSA P-256",
    usage: "Client Authentication & JWS Session",
    risk: "CRITICAL",
    dependencies: 14,
    evidence: "Python AST Call + Java JCA Engine",
    confidence: 0.98,
    icon: Server,
    angle: 0,
    distance: 190,
    color: "#F43F5E",
  },
  {
    id: "node-cert",
    label: "Wildcard TLS Certificate",
    type: "CERTIFICATES",
    algorithm: "RSA-4096 with SHA-256",
    usage: "Ingress TLS Handshake & Termination",
    risk: "HIGH",
    dependencies: 22,
    evidence: "X.509 ASN.1 Parser (Valid to 2027)",
    confidence: 1.0,
    icon: Lock,
    angle: 36,
    distance: 215,
    color: "#F59E0B",
  },
  {
    id: "node-key",
    label: "Master Vault SecretKey",
    type: "KEYS",
    algorithm: "AES-256-GCM / PBKDF2",
    usage: "Database Column Envelope Encryption",
    risk: "SAFE",
    dependencies: 6,
    evidence: "AESWrapKeyAlgorithm Implementation",
    confidence: 0.95,
    icon: Key,
    angle: 72,
    distance: 180,
    color: "#10B981",
  },
  {
    id: "node-algo",
    label: "ML-KEM-768 Provider",
    type: "ALGORITHMS",
    algorithm: "NIST FIPS 203 (PQC KEM)",
    usage: "Post-Quantum Key Exchange Pilot",
    risk: "SAFE",
    dependencies: 4,
    evidence: "BouncyCastle 1.80 Module Capability",
    confidence: 0.92,
    icon: Cpu,
    angle: 108,
    distance: 225,
    color: "#22D3EE",
  },
  {
    id: "node-lib",
    label: "BouncyCastle / PyCryptodome",
    type: "LIBRARIES",
    algorithm: "Multi-Cipher Suite Provider",
    usage: "Core Cryptographic Primitives",
    risk: "MEDIUM",
    dependencies: 38,
    evidence: "Maven POM + pyproject.toml Manifest",
    confidence: 0.88,
    icon: Layers,
    angle: 144,
    distance: 185,
    color: "#8B5CF6",
  },
  {
    id: "node-svc",
    label: "Payment Token Service",
    type: "SERVICES",
    algorithm: "HMAC-SHA256 & 3DES-CBC",
    usage: "Legacy Interbank Settlement",
    risk: "CRITICAL",
    dependencies: 19,
    evidence: "Paramiko SSH + Python AST Match",
    confidence: 0.94,
    icon: Activity,
    angle: 180,
    distance: 220,
    color: "#F43F5E",
  },
  {
    id: "node-cnt",
    label: "Nginx Ingress Container",
    type: "CONTAINERS",
    algorithm: "OpenSSL 3.0.2 Binary Image",
    usage: "Border Proxy Edge Gateway",
    risk: "HIGH",
    dependencies: 12,
    evidence: "Tarball Static Header + Cert Extraction",
    confidence: 0.90,
    icon: Box,
    angle: 216,
    distance: 195,
    color: "#F59E0B",
  },
  {
    id: "node-cloud",
    label: "AWS / Azure Cloud KMS",
    type: "CLOUD",
    algorithm: "ECC secp256k1 & Curve25519",
    usage: "Cloud Identity Token Signing",
    risk: "MEDIUM",
    dependencies: 9,
    evidence: "Terraform HCL + Config Scan",
    confidence: 0.86,
    icon: Cloud,
    angle: 252,
    distance: 225,
    color: "#38BDF8",
  },
  {
    id: "node-proto",
    label: "SSHv2 & TLS 1.3 Stack",
    type: "PROTOCOLS",
    algorithm: "ECDHE-RSA / ChaCha20-Poly1305",
    usage: "Administrative Remote Execution",
    risk: "SAFE",
    dependencies: 16,
    evidence: "Paramiko Transport Preference Tuple",
    confidence: 0.96,
    icon: FileCode,
    angle: 288,
    distance: 180,
    color: "#10B981",
  },
  {
    id: "node-hsm",
    label: "FIPS 140-3 Level 4 HSM",
    type: "HSM / KMS",
    algorithm: "Hardware Dilithium / ML-DSA Ready",
    usage: "Root CA Hardware Security Module",
    risk: "SAFE",
    dependencies: 3,
    evidence: "PKCS#11 Provider Token Signature",
    confidence: 0.99,
    icon: Sparkles,
    angle: 324,
    distance: 210,
    color: "#22D3EE",
  },
];

export function CentralGraphVisualizer() {
  const [activeNode, setActiveNode] = useState<NodeData>(NODES[0]);
  const [pulseDegree, setPulseDegree] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulseDegree((prev) => (prev + 0.5) % 360);
    }, 40);
    return () => clearInterval(timer);
  }, []);

  const centerX = 340;
  const centerY = 320;

  return (
    <div className="relative w-full max-w-6xl mx-auto rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-[#050A1F]/90 to-[#020617]/95 backdrop-blur-2xl p-6 sm:p-10 shadow-2xl shadow-cyan-950/60 overflow-hidden">
      {/* Background Orbital Rings and Grid */}
      <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full border border-cyan-500/10 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full border border-blue-500/15 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-dashed border-indigo-500/10 pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-white/10 gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-widest text-cyber-cyan font-semibold">
              LIVE CRYPTOGRAPHIC TOPOLOGY MAP
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-text-bright mt-1">
            Enterprise Cryptographic Intelligence Fabric
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-text-dim bg-[#07112F]/80 px-4 py-2 rounded-xl border border-cyan-500/20">
          <span>NODES: 10 ACTIVE</span>
          <span className="text-cyan-400">|</span>
          <span>EDGES: 38 MONITORED</span>
          <span className="text-cyan-400">|</span>
          <span className="text-rose-400">CRITICAL: 2</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mt-6 relative z-10">
        {/* Interactive SVG Radar / Network View */}
        <div className="lg:col-span-7 flex items-center justify-center relative min-h-[460px]">
          <svg
            viewBox="0 0 680 640"
            className="w-full h-auto max-w-[580px] drop-shadow-[0_0_35px_rgba(34,211,238,0.15)]"
          >
            <defs>
              <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.4" />
                <stop offset="60%" stopColor="#2563EB" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#050A1F" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#6366F1" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* Pulsing Central Orbit */}
            <circle
              cx={centerX}
              cy={centerY}
              r={70}
              fill="url(#centerGlow)"
              className="animate-pulse"
            />

            {/* Connecting Edges with Animated Particles */}
            {NODES.map((node) => {
              const rad = (node.angle * Math.PI) / 180;
              const nx = centerX + node.distance * Math.cos(rad);
              const ny = centerY + node.distance * Math.sin(rad);
              const isSelected = activeNode.id === node.id;

              return (
                <g key={`edge-${node.id}`}>
                  <line
                    x1={centerX}
                    y1={centerY}
                    x2={nx}
                    y2={ny}
                    stroke={isSelected ? node.color : "rgba(34, 211, 238, 0.25)"}
                    strokeWidth={isSelected ? 2.5 : 1}
                    strokeDasharray={isSelected ? "none" : "3,3"}
                  />
                  {/* Flow particle */}
                  <circle
                    cx={
                      centerX +
                      ((nx - centerX) * ((pulseDegree + node.angle) % 100)) / 100
                    }
                    cy={
                      centerY +
                      ((ny - centerY) * ((pulseDegree + node.angle) % 100)) / 100
                    }
                    r={isSelected ? 3 : 1.8}
                    fill={node.color}
                    opacity={isSelected ? 0.9 : 0.6}
                  />
                </g>
              );
            })}

            {/* Center ECDAT Master Node */}
            <g className="cursor-pointer">
              <circle
                cx={centerX}
                cy={centerY}
                r={44}
                fill="#050A1F"
                stroke="#22D3EE"
                strokeWidth={3}
                className="filter drop-shadow-[0_0_15px_#22D3EE]"
              />
              <circle
                cx={centerX}
                cy={centerY}
                r={48}
                fill="none"
                stroke="#3B82F6"
                strokeWidth={1}
                strokeDasharray="4,4"
                className="animate-spin"
                style={{ transformOrigin: `${centerX}px ${centerY}px`, animationDuration: "25s" }}
              />
              <text
                x={centerX}
                y={centerY - 6}
                textAnchor="middle"
                fill="#F8FAFC"
                fontSize="13"
                fontWeight="900"
                letterSpacing="1.5"
                fontFamily="monospace"
              >
                ECDAT
              </text>
              <text
                x={centerX}
                y={centerY + 12}
                textAnchor="middle"
                fill="#22D3EE"
                fontSize="8.5"
                fontWeight="700"
                fontFamily="monospace"
              >
                FUSION HUB
              </text>
            </g>

            {/* Peripheral Nodes */}
            {NODES.map((node) => {
              const rad = (node.angle * Math.PI) / 180;
              const nx = centerX + node.distance * Math.cos(rad);
              const ny = centerY + node.distance * Math.sin(rad);
              const isSelected = activeNode.id === node.id;

              return (
                <g
                  key={node.id}
                  onClick={() => setActiveNode(node)}
                  onMouseEnter={() => setActiveNode(node)}
                  className="cursor-pointer transition-all duration-200"
                >
                  <circle
                    cx={nx}
                    cy={ny}
                    r={isSelected ? 26 : 20}
                    fill="#050A1F"
                    stroke={isSelected ? node.color : "rgba(255, 255, 255, 0.2)"}
                    strokeWidth={isSelected ? 3 : 1.5}
                    style={{
                      filter: isSelected
                        ? `drop-shadow(0 0 16px ${node.color})`
                        : "drop-shadow(0 0 5px rgba(0,0,0,0.8))",
                    }}
                  />
                  <text
                    x={nx}
                    y={ny + 4}
                    textAnchor="middle"
                    fill={isSelected ? "#FFFFFF" : "#CBD5E1"}
                    fontSize="9"
                    fontWeight="800"
                    fontFamily="monospace"
                  >
                    {node.type.substring(0, 3)}
                  </text>
                  <text
                    x={nx}
                    y={ny + (ny > centerY ? 28 : -20)}
                    textAnchor="middle"
                    fill={isSelected ? node.color : "#94A3B8"}
                    fontSize="9.5"
                    fontWeight="600"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Node Telemetry Inspector Console */}
        <div className="lg:col-span-5 bg-[#030712]/90 rounded-2xl border border-cyan-500/25 p-6 backdrop-blur-xl relative">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: activeNode.color }}
              />
              <span className="font-mono text-xs uppercase tracking-wider text-text-dim">
                NODE INSPECTION CONSOLE
              </span>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                activeNode.risk === "CRITICAL"
                  ? "bg-rose-950/80 text-rose-400 border-rose-500/40"
                  : activeNode.risk === "HIGH"
                  ? "bg-amber-950/80 text-amber-400 border-amber-500/40"
                  : "bg-emerald-950/80 text-emerald-400 border-emerald-500/40"
              }`}
            >
              {activeNode.risk} RISK
            </span>
          </div>

          <div className="space-y-4 font-mono text-xs">
            <div>
              <span className="text-text-dim text-[11px] block">ASSET CLASSIFICATION</span>
              <span className="text-sm font-bold text-text-bright">{activeNode.label}</span>
              <span className="text-xs text-cyber-cyan block mt-0.5 font-semibold">
                Category: {activeNode.type}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#050A1F] border border-white/10 space-y-2">
              <div className="flex justify-between">
                <span className="text-text-dim">Canonical Primitive:</span>
                <span className="text-text-bright font-semibold">{activeNode.algorithm}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-dim">Operational Usage:</span>
                <span className="text-text-muted">{activeNode.usage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-dim">Downstream Blast:</span>
                <span className="text-amber-400 font-bold">{activeNode.dependencies} Dependent Services</span>
              </div>
            </div>

            <div>
              <span className="text-text-dim text-[11px] block">EVIDENCE & PROVENANCE</span>
              <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/15 text-[11px] text-text-muted font-sans mt-1">
                {activeNode.evidence}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-text-dim">Detection Confidence:</span>
                <span className="text-cyber-cyan font-bold">{(activeNode.confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyber-blue to-cyber-cyan rounded-full transition-all duration-500"
                  style={{ width: `${activeNode.confidence * 100}%` }}
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-white/10 text-[11px]">
              <span className="text-text-dim flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Evidence Provenance Verified
              </span>
              <span className="text-cyber-cyan underline hover:text-white cursor-pointer flex items-center gap-1">
                Deep Trace <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

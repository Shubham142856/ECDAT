"use client";

import React, { useState } from "react";
import {
  Database, Filter, Shield, AlertTriangle, CheckCircle2,
  ChevronDown, Search, Download, Tag, Clock, FileJson,
  Lock, Key, Hash, Cpu
} from "lucide-react";

const ALL_ASSETS = [
  // PyJWT
  { id: 1, name: "HMAC", repo: "PyJWT", commit: "b5bd6fe", role: "MAC", status: "VULNERABLE", riskScore: 0.74, pqcAlgo: "N/A (symmetric)", lang: "Python", file: "jwt/algorithms.py", evidence: "USAGE" },
  { id: 2, name: "RSA", repo: "PyJWT", commit: "b5bd6fe", role: "SIGNATURE", status: "VULNERABLE", riskScore: 0.91, pqcAlgo: "ML-DSA (CRYSTALS-Dilithium)", lang: "Python", file: "jwt/algorithms.py", evidence: "USAGE" },
  { id: 3, name: "RSA-PSS", repo: "PyJWT", commit: "b5bd6fe", role: "SIGNATURE", status: "VULNERABLE", riskScore: 0.91, pqcAlgo: "ML-DSA (CRYSTALS-Dilithium)", lang: "Python", file: "jwt/algorithms.py", evidence: "USAGE" },
  { id: 4, name: "ECDSA", repo: "PyJWT", commit: "b5bd6fe", role: "SIGNATURE", status: "VULNERABLE", riskScore: 0.88, pqcAlgo: "ML-DSA (CRYSTALS-Dilithium)", lang: "Python", file: "jwt/algorithms.py", evidence: "USAGE" },
  { id: 5, name: "Ed25519", repo: "PyJWT", commit: "b5bd6fe", role: "SIGNATURE", status: "MONITORING", riskScore: 0.55, pqcAlgo: "SLH-DSA (SPHINCS+)", lang: "Python", file: "jwt/algorithms.py", evidence: "USAGE" },
  { id: 6, name: "SHA-256", repo: "PyJWT", commit: "b5bd6fe", role: "HASH", status: "SAFE", riskScore: 0.22, pqcAlgo: "SHA-3 / SHAKE256", lang: "Python", file: "jwt/utils.py", evidence: "USAGE" },
  { id: 7, name: "SHA-384", repo: "PyJWT", commit: "b5bd6fe", role: "HASH", status: "SAFE", riskScore: 0.20, pqcAlgo: "SHA-3 / SHAKE256", lang: "Python", file: "jwt/utils.py", evidence: "USAGE" },
  { id: 8, name: "SHA-512", repo: "PyJWT", commit: "b5bd6fe", role: "HASH", status: "SAFE", riskScore: 0.18, pqcAlgo: "SHA-3 / SHAKE256", lang: "Python", file: "jwt/utils.py", evidence: "USAGE" },
  // Certbot
  { id: 9, name: "RSA-2048", repo: "Certbot", commit: "4856493", role: "KEY_ESTABLISHMENT", status: "VULNERABLE", riskScore: 0.93, pqcAlgo: "ML-KEM (CRYSTALS-Kyber)", lang: "Python", file: "certbot/crypto_util.py", evidence: "IMPLEMENTATION" },
  { id: 10, name: "ECDSA P-256", repo: "Certbot", commit: "4856493", role: "SIGNATURE", status: "VULNERABLE", riskScore: 0.88, pqcAlgo: "ML-DSA (CRYSTALS-Dilithium)", lang: "Python", file: "certbot/crypto_util.py", evidence: "IMPLEMENTATION" },
  { id: 11, name: "X.509 (RSA)", repo: "Certbot", commit: "4856493", role: "CERTIFICATE", status: "VULNERABLE", riskScore: 0.89, pqcAlgo: "PQC hybrid cert (draft-ounsworth)", lang: "Python", file: "certbot/crypto_util.py", evidence: "IMPLEMENTATION" },
  { id: 12, name: "TLS 1.2", repo: "Certbot", commit: "4856493", role: "PROTOCOL", status: "VULNERABLE", riskScore: 0.82, pqcAlgo: "TLS 1.3 + Kyber hybrid", lang: "Python", file: "certbot/ocsp.py", evidence: "CONFIGURATION" },
  { id: 13, name: "ACME (JOSE)", repo: "Certbot", commit: "4856493", role: "PROTOCOL", status: "MONITORING", riskScore: 0.60, pqcAlgo: "ACME + PQC KEM (proposed)", lang: "Python", file: "acme/jws.py", evidence: "IMPLEMENTATION" },
  // Paramiko
  { id: 14, name: "AES-CTR", repo: "Paramiko", commit: "142f593", role: "ENCRYPTION", status: "MONITORING", riskScore: 0.48, pqcAlgo: "AES-256-CTR (symmetric, keep)", lang: "Python", file: "paramiko/packet.py", evidence: "IMPLEMENTATION" },
  { id: 15, name: "AES-GCM", repo: "Paramiko", commit: "142f593", role: "ENCRYPTION", status: "MONITORING", riskScore: 0.45, pqcAlgo: "AES-256-GCM (symmetric, keep)", lang: "Python", file: "paramiko/packet.py", evidence: "IMPLEMENTATION" },
  { id: 16, name: "ECDH (P-256)", repo: "Paramiko", commit: "142f593", role: "KEY_ESTABLISHMENT", status: "VULNERABLE", riskScore: 0.86, pqcAlgo: "ML-KEM (CRYSTALS-Kyber)", lang: "Python", file: "paramiko/kex_ecdh.py", evidence: "IMPLEMENTATION" },
  { id: 17, name: "Ed25519 (SSH)", repo: "Paramiko", commit: "142f593", role: "SIGNATURE", status: "MONITORING", riskScore: 0.52, pqcAlgo: "SLH-DSA (SPHINCS+)", lang: "Python", file: "paramiko/ed25519key.py", evidence: "IMPLEMENTATION" },
  // JJWT
  { id: 18, name: "HMAC-SHA256", repo: "JJWT", commit: "fb71496", role: "MAC", status: "VULNERABLE", riskScore: 0.72, pqcAlgo: "N/A (symmetric)", lang: "Java", file: "impl/crypto/MacProvider.java", evidence: "IMPLEMENTATION" },
  { id: 19, name: "RSA-OAEP", repo: "JJWT", commit: "fb71496", role: "KEY_ESTABLISHMENT", status: "VULNERABLE", riskScore: 0.92, pqcAlgo: "ML-KEM (CRYSTALS-Kyber)", lang: "Java", file: "impl/crypto/RsaProvider.java", evidence: "IMPLEMENTATION" },
  { id: 20, name: "AES-CBC", repo: "JJWT", commit: "fb71496", role: "ENCRYPTION", status: "MONITORING", riskScore: 0.50, pqcAlgo: "AES-256-GCM (upgrade)", lang: "Java", file: "impl/crypto/AesProvider.java", evidence: "IMPLEMENTATION" },
];

const STATUS_COLORS: Record<string, string> = {
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
  const [search, setSearch] = useState("");
  const [filterRepo, setFilterRepo] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const filtered = ALL_ASSETS.filter((a) => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) &&
        !a.file.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterRepo !== "ALL" && a.repo !== filterRepo) return false;
    if (filterStatus !== "ALL" && a.status !== filterStatus) return false;
    return true;
  });

  const vuln = ALL_ASSETS.filter(a => a.status === "VULNERABLE").length;
  const monitor = ALL_ASSETS.filter(a => a.status === "MONITORING").length;
  const safe = ALL_ASSETS.filter(a => a.status === "SAFE").length;

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
            <span className="font-mono text-cyber-cyan">{ALL_ASSETS.length} fused assets</span> across 4 pinned corpora. Zero synthetic keys. Evidence-backed.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#050A1F] border border-cyan-500/30 text-cyber-cyan font-mono text-xs font-bold hover:bg-cyan-950/40 transition-all">
          <Download className="w-3.5 h-3.5" />
          Export CycloneDX 1.7
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Assets", value: ALL_ASSETS.length, color: "text-cyber-cyan", sub: "across 4 corpora" },
          { label: "Vulnerable", value: vuln, color: "text-rose-400", sub: "quantum-breakable" },
          { label: "Monitoring", value: monitor, color: "text-amber-400", sub: "risk assessed" },
          { label: "PQC Safe", value: safe, color: "text-emerald-400", sub: "or symmetric" },
        ].map((c, i) => (
          <div key={i} className="p-4 rounded-2xl bg-[#050A1F]/60 border border-white/10 space-y-1">
            <div className="text-xs font-mono text-text-dim">{c.label}</div>
            <div className={`text-3xl font-black ${c.color}`}>{c.value}</div>
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
            placeholder="Search assets, files..."
            className="bg-transparent text-text-bright font-mono focus:outline-none placeholder:text-text-dim w-48"
          />
        </div>
        <select
          value={filterRepo}
          onChange={(e) => setFilterRepo(e.target.value)}
          className="px-3 py-2 rounded-xl bg-[#050A1F] border border-white/10 text-xs font-mono text-text-bright focus:outline-none"
        >
          <option value="ALL">All Repos</option>
          <option value="PyJWT">PyJWT</option>
          <option value="Certbot">Certbot</option>
          <option value="Paramiko">Paramiko</option>
          <option value="JJWT">JJWT</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl bg-[#050A1F] border border-white/10 text-xs font-mono text-text-bright focus:outline-none"
        >
          <option value="ALL">All Status</option>
          <option value="VULNERABLE">Vulnerable</option>
          <option value="MONITORING">Monitoring</option>
          <option value="SAFE">Safe</option>
        </select>
        <div className="text-xs text-text-dim flex items-center px-3">
          {filtered.length} results
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-[#050A1F]/60 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10">
                {["Asset", "Repo", "Role", "Evidence", "Risk Score", "PQC Migration Target", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold tracking-wider text-text-dim uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-white/[0.025] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-text-bright">{a.name}</div>
                    <div className="text-[10px] text-text-dim truncate max-w-[160px]">{a.file}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      a.lang === "Java" ? "bg-amber-950/60 text-amber-400" : "bg-blue-950/60 text-blue-400"
                    }`}>{a.repo}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {ROLE_ICONS[a.role]}
                      <span className="text-text-muted">{a.role}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-cyber-cyan">{a.evidence}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-[#07112F] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${a.riskScore > 0.75 ? "bg-rose-500" : a.riskScore > 0.5 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${a.riskScore * 100}%` }}
                        />
                      </div>
                      <span className={`font-bold ${a.riskScore > 0.75 ? "text-rose-400" : a.riskScore > 0.5 ? "text-amber-400" : "text-emerald-400"}`}>
                        {a.riskScore.toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[10px] text-text-dim max-w-[180px]">{a.pqcAlgo}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${STATUS_COLORS[a.status]}`}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

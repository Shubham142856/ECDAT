"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  Cpu, 
  ArrowRight, 
  Terminal, 
  Key, 
  Layers, 
  FileCode, 
  Search, 
  AlertTriangle, 
  TrendingUp, 
  ExternalLink, 
  CheckCircle2, 
  Network, 
  Database, 
  Lock, 
  Server, 
  Sparkles,
  Zap,
  Activity,
  FileJson,
  Boxes,
  Compass,
  GitBranch,
  ShieldAlert,
  HelpCircle
} from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { QuantumBackground } from "@/components/QuantumBackground";
import { CentralGraphVisualizer } from "@/components/CentralGraphVisualizer";
import { MoscaCurveVisualizer } from "@/components/MoscaCurveVisualizer";
import { BlastRadiusInteractive } from "@/components/BlastRadiusInteractive";
import { CBOMPreviewTable } from "@/components/CBOMPreviewTable";

export default function LandingPage() {
  const [activePipelineStep, setActivePipelineStep] = useState<number>(0);

  const PIPELINE_STAGES = [
    { title: "SOURCE CODE AST", desc: "Python AST & Java rule engines inspect algorithm strings, imports, and calls." },
    { title: "DEPENDENCY MANIFESTS", desc: "Evaluates POM, requirements.txt, pyproject.toml with property resolution." },
    { title: "X.509 CERTIFICATES", desc: "Parses ASN.1 structures, validity windows, and public key parameter sets." },
    { title: "BINARY & CONTAINER", desc: "Bounded static inspection of headers, shared libraries, and embedded certs." },
    { title: "EVIDENCE FUSION", desc: "Multi-source evidence arbitration distinguishing CAPABILITY from USAGE." },
    { title: "CRYPTOGRAPHIC GRAPH", desc: "Constructs enterprise dependency topology and calculates BFS blast radius." },
  ];

  return (
    <div className="relative min-h-screen bg-[#020617] text-text-bright selection:bg-cyan-500/30 selection:text-cyan-200">
      <QuantumBackground />
      <Navbar />

      {/* =========================================================================
          HERO SECTION
          ========================================================================= */}
      <section className="relative pt-36 pb-24 px-6 sm:px-12 max-w-7xl mx-auto flex flex-col items-center text-center z-10">
        {/* Subtle pill badges */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-xs font-mono text-cyber-cyan shadow-glow-cyan mb-8">
          <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "8s" }} />
          <span>CRYPTOGRAPHIC DISCOVERY · POST-QUANTUM READINESS · CRYPTO-AGILITY</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-5xl leading-[1.1] mb-6">
          Know Your Cryptography <br />
          <span className="bg-gradient-to-r from-cyber-cyan via-cyber-blue to-indigo-400 bg-clip-text text-transparent">
            Before the Quantum Era.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-text-muted max-w-3xl leading-relaxed mb-10">
          ECDAT discovers, inventories, and analyzes cryptographic assets across enterprise infrastructure — turning fragmented cryptographic evidence into actionable post-quantum migration intelligence.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyber-blue via-blue-600 to-cyber-cyan text-white font-bold text-sm shadow-glow-blue hover:shadow-glow-cyan hover:scale-[1.02] transition-all flex items-center justify-center gap-3 group"
          >
            Explore ECDAT Platform
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </Link>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#050A1F]/80 border border-cyan-500/30 text-cyber-cyan font-semibold text-sm hover:bg-cyan-950/40 hover:border-cyan-400 transition-all flex items-center justify-center gap-2"
          >
            View Architecture &amp; Methodology
          </a>
        </div>

        {/* Hero Telemetry Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 w-full max-w-4xl text-left">
          <div className="p-4 rounded-2xl bg-[#050A1F]/60 border border-white/10 backdrop-blur-md">
            <div className="text-[10px] font-mono uppercase text-text-dim">4-Corpus Pinned Baseline</div>
            <div className="text-xl font-bold font-mono text-cyber-cyan mt-1">PyJWT · Certbot</div>
            <div className="text-[11px] text-text-muted">Paramiko · JJWT (Clean)</div>
          </div>
          <div className="p-4 rounded-2xl bg-[#050A1F]/60 border border-white/10 backdrop-blur-md">
            <div className="text-[10px] font-mono uppercase text-text-dim">Detection Precision</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">0 Spurious Assets</div>
            <div className="text-[11px] text-text-muted">Generic Java imports filtered</div>
          </div>
          <div className="p-4 rounded-2xl bg-[#050A1F]/60 border border-white/10 backdrop-blur-md">
            <div className="text-[10px] font-mono uppercase text-text-dim">Evidence Grounding</div>
            <div className="text-xl font-bold font-mono text-indigo-400 mt-1">Deterministic AST</div>
            <div className="text-[11px] text-text-muted">Strict provenance on every line</div>
          </div>
          <div className="p-4 rounded-2xl bg-[#050A1F]/60 border border-white/10 backdrop-blur-md">
            <div className="text-[10px] font-mono uppercase text-text-dim">Unit Regression Suite</div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">65/65 Passing</div>
            <div className="text-[11px] text-text-muted">Consolidated patch verified</div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          TRUST / CAPABILITY STRIP
          ========================================================================= */}
      <section className="px-6 sm:px-12 max-w-6xl mx-auto mb-24 z-10 relative">
        <div className="p-6 rounded-2xl bg-[#050A1F]/80 backdrop-blur-xl border border-cyan-500/20 shadow-xl grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
          <div className="space-y-1">
            <div className="text-xs font-mono font-bold text-cyber-cyan uppercase tracking-wider">DISCOVER</div>
            <div className="text-xs text-text-dim">Cryptographic Asset Discovery</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono font-bold text-cyber-blue uppercase tracking-wider">INVENTORY</div>
            <div className="text-xs text-text-dim">CycloneDX 1.7 CBOM Generation</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">ANALYZE</div>
            <div className="text-xs text-text-dim">Dependency Intelligence &amp; Graph</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">ASSESS</div>
            <div className="text-xs text-text-dim">Probabilistic Mosca Quantum Risk</div>
          </div>
          <div className="space-y-1 col-span-2 md:col-span-1">
            <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">PRIORITIZE</div>
            <div className="text-xs text-text-dim">Role-Correct PQC Migration</div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION — THE PROBLEM: CRYPTOGRAPHIC BLIND SPOT
          ========================================================================= */}
      <section id="platform" className="py-20 px-6 sm:px-12 max-w-7xl mx-auto z-10 relative">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/30 text-xs font-mono text-rose-400 mb-3">
            <AlertTriangle className="w-3.5 h-3.5" />
            THE ENTERPRISE VISIBILITY CRISIS
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Cryptography Is Everywhere. <br />
            <span className="text-rose-400">Visibility Isn&apos;t.</span>
          </h2>
          <p className="text-text-muted text-sm sm:text-base mt-4 leading-relaxed">
            Enterprise systems run thousands of cryptographic algorithms embedded across source code, dependencies, certificates, binaries, containers, and cloud KMS vaults. Most security teams cannot answer: <em>Where is RSA used? What will break if we migrate?</em>
          </p>
        </div>

        {/* Scattered Assets Feeding Blind Spot Diagram */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-4xl mx-auto mb-10 text-center font-mono text-xs">
          {[
            "Source Code AST", "Dependencies", "X.509 Certificates", "APIs & Tokens", "Containers",
            "ELF/PE Binaries", "TLS Stacks", "Cloud KMS", "Hardware HSM", "Protocols (SSH/TLS)"
          ].map((item, i) => (
            <div key={i} className="p-3 rounded-xl bg-[#030712] border border-white/10 text-text-muted hover:border-cyan-500/30 transition-all">
              {item}
            </div>
          ))}
        </div>

        {/* Blind spot warning box */}
        <div className="max-w-2xl mx-auto p-6 rounded-3xl bg-gradient-to-b from-rose-950/40 to-[#020617] border border-rose-500/30 text-center shadow-glow-rose">
          <div className="text-rose-400 font-mono text-xs uppercase tracking-widest font-bold">
            TRADITIONAL ENTERPRISE VULNERABILITY
          </div>
          <div className="text-2xl font-black text-white mt-1">THE CRYPTOGRAPHIC BLIND SPOT</div>
          <p className="text-xs text-text-muted mt-2 max-w-lg mx-auto">
            Without automated multi-source evidence fusion, organizations risk severe outages during cipher rotation, or remain unaware of Store Now, Decrypt Later (SNDL) interception.
          </p>
          <div className="mt-4 pt-4 border-t border-rose-500/20 text-xs font-mono text-cyber-cyan flex items-center justify-center gap-2">
            <span>ECDAT SOLUTION:</span>
            <span className="text-white font-bold">Evidence Grounding → Graph Traversal → PQC Readiness</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION — WHAT IS ECDAT? (6 STAGES)
          ========================================================================= */}
      <section id="how-it-works" className="py-20 px-6 sm:px-12 max-w-7xl mx-auto z-10 relative">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-xs font-mono text-cyber-cyan mb-3">
            <Compass className="w-3.5 h-3.5" />
            CORE METHODOLOGY
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            From Cryptographic Inventory <br />
            <span className="text-cyber-cyan">to Cryptographic Intelligence.</span>
          </h2>
          <p className="text-text-muted text-sm mt-3">
            ECDAT is not a passive scanner. It transforms raw repository and infrastructure telemetry through six rigorous deterministic stages.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            {
              stage: "01",
              name: "DISCOVER",
              icon: Search,
              color: "text-cyber-cyan",
              desc: "Multi-modal AST inspection, dependency parsing, certificates, and binaries.",
            },
            {
              stage: "02",
              name: "VERIFY",
              icon: ShieldCheck,
              color: "text-cyber-blue",
              desc: "Semantic role separation: CAPABILITY vs. IMPLEMENTATION vs. USAGE.",
            },
            {
              stage: "03",
              name: "GRAPH",
              icon: Network,
              color: "text-indigo-400",
              desc: "Constructs dependency graph linking code, services, certs, and algorithms.",
            },
            {
              stage: "04",
              name: "ASSESS",
              icon: AlertTriangle,
              color: "text-amber-400",
              desc: "Calculates Mosca condition X + Y > Z and Monte Carlo quantum risk.",
            },
            {
              stage: "05",
              name: "PRIORITIZE",
              icon: TrendingUp,
              color: "text-rose-400",
              desc: "Ranks assets by blast radius, quantum vulnerability, and secrecy lifespan.",
            },
            {
              stage: "06",
              name: "MIGRATE",
              icon: Zap,
              color: "text-emerald-400",
              desc: "Role-correct PQC candidate matching and staged multi-wave rollout planning.",
            },
          ].map((s, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-[#050A1F]/70 border border-white/10 hover:border-cyan-500/40 hover:bg-[#07112F] transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between font-mono text-xs text-text-dim mb-4">
                  <span className="font-bold text-cyber-cyan">{s.stage}</span>
                  <s.icon className={`w-5 h-5 ${s.color} group-hover:scale-110 transition-transform`} />
                </div>
                <h3 className="font-bold text-sm text-text-bright mb-2">{s.name}</h3>
                <p className="text-xs text-text-muted leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION — CENTRAL ECDAT VISUALIZATION (THE HERO VISUAL)
          ========================================================================= */}
      <section className="py-20 px-6 sm:px-12 max-w-7xl mx-auto z-10 relative">
        <CentralGraphVisualizer />
      </section>

      {/* =========================================================================
          SECTION — CORE CAPABILITIES (8 CARDS)
          ========================================================================= */}
      <section id="capabilities" className="py-20 px-6 sm:px-12 max-w-7xl mx-auto z-10 relative">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-xs font-mono text-cyber-cyan mb-3">
            <Layers className="w-3.5 h-3.5" />
            ENTERPRISE CAPABILITIES
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Engineered for Mission-Critical Defense.
          </h2>
          <p className="text-text-muted text-sm mt-3">
            Eight foundational pillars built specifically to satisfy SIH26164 requirements for NTRO and large enterprises.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              title: "1. Cryptographic Discovery",
              desc: "Deep AST identification of algorithms, keys, certificates, protocols, and cryptographic libraries without executing unknown binaries.",
              icon: Search,
            },
            {
              title: "2. CycloneDX 1.7 CBOM",
              desc: "Generates standardized Cryptography Bill of Materials with full cryptoProperties, algorithm variants, and NIST categories.",
              icon: FileJson,
            },
            {
              title: "3. Evidence & Provenance",
              desc: "Every finding links directly to file paths, line numbers, detector names, and confidence scores — zero fabricated claims.",
              icon: CheckCircle2,
            },
            {
              title: "4. Dependency Intelligence",
              desc: "Traces how cryptographic components impact parent microservices, database columns, and border reverse proxies.",
              icon: GitBranch,
            },
            {
              title: "5. Quantum Risk Modeling",
              desc: "Evaluates cryptographic exposure using Mosca-style theorem X + Y > Z with Monte Carlo uncertainty distributions.",
              icon: Activity,
            },
            {
              title: "6. Migration Blast Radius",
              desc: "Multi-hop BFS graph traversal predicts every downstream service, queue, and client affected by cipher rotation.",
              icon: Network,
            },
            {
              title: "7. Crypto-Agility Scoring",
              desc: "Measures hardcoded algorithm literals vs. abstract factory patterns to evaluate how quickly systems can adopt PQC.",
              icon: Zap,
            },
            {
              title: "8. PQC Migration Planner",
              desc: "Role-correct algorithm recommendations (KEMs for key exchange, DSAs for digital signatures) organized in prioritized waves.",
              icon: Cpu,
            },
          ].map((card, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-[#050A1F]/70 border border-white/10 hover:border-cyan-500/40 hover:shadow-glow-cyan hover:bg-[#07112F] transition-all group"
            >
              <card.icon className="w-6 h-6 text-cyber-cyan mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-base font-bold text-text-bright mb-2">{card.title}</h3>
              <p className="text-xs text-text-muted leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION — DISCOVERY PIPELINE
          ========================================================================= */}
      <section className="py-20 px-6 sm:px-12 max-w-7xl mx-auto z-10 relative">
        <div className="w-full max-w-5xl mx-auto rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-[#050A1F] to-[#020617] p-8 sm:p-12">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-mono text-cyber-cyan font-bold uppercase tracking-wider">
              END-TO-END TELEMETRY INGESTION
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              Multi-Modal Evidence Discovery Pipeline
            </h3>
            <p className="text-xs text-text-dim mt-2">
              Continuous deterministic extraction across enterprise codebases and deployment artifacts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 font-mono text-xs">
            {PIPELINE_STAGES.map((stg, i) => (
              <div
                key={i}
                onClick={() => setActivePipelineStep(i)}
                className={`p-4 rounded-xl border text-center cursor-pointer transition-all ${
                  activePipelineStep === i
                    ? "bg-[#07112F] border-cyber-cyan shadow-glow-cyan text-white"
                    : "bg-[#030712] border-white/10 text-text-muted hover:border-cyan-500/30"
                }`}
              >
                <div className="text-[10px] text-text-dim mb-1">STAGE 0{i + 1}</div>
                <div className="font-bold text-[11px] truncate">{stg.title}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-5 rounded-2xl bg-[#030712] border border-cyan-500/25 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-cyber-cyan animate-pulse" />
              <div>
                <span className="text-cyber-cyan font-bold block">
                  {PIPELINE_STAGES[activePipelineStep].title}
                </span>
                <span className="text-text-muted text-[11px]">
                  {PIPELINE_STAGES[activePipelineStep].desc}
                </span>
              </div>
            </div>
            <Link
              href="/dashboard/discovery"
              className="px-4 py-2 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyber-cyan text-xs font-bold hover:bg-cyan-900/40 whitespace-nowrap"
            >
              Simulate Pipeline →
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION — MOSCA + UNCERTAINTY CURVE
          ========================================================================= */}
      <section className="py-20 px-6 sm:px-12 max-w-7xl mx-auto z-10 relative">
        <MoscaCurveVisualizer />
      </section>

      {/* =========================================================================
          SECTION — MIGRATION BLAST RADIUS CASCADE
          ========================================================================= */}
      <section className="py-20 px-6 sm:px-12 max-w-7xl mx-auto z-10 relative">
        <BlastRadiusInteractive />
      </section>

      {/* =========================================================================
          SECTION — PQC MIGRATION ROADMAP
          ========================================================================= */}
      <section className="py-20 px-6 sm:px-12 max-w-7xl mx-auto z-10 relative">
        <div className="w-full max-w-5xl mx-auto rounded-3xl border border-cyan-500/25 bg-gradient-to-b from-[#050A1F] to-[#020617] p-8 sm:p-12 shadow-2xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
              STRUCTURED ADOPTION PATHWAY
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              Role-Matched PQC Migration Framework
            </h3>
            <p className="text-xs text-text-dim mt-2">
              Aligning NIST FIPS 203, 204, and 205 without compromising backward compatibility.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 font-mono text-xs">
            {[
              { step: "CURRENT STATE", sub: "Classical Cryptography", tech: "RSA, ECDSA, DH", color: "border-rose-500/30 bg-rose-950/20 text-rose-300" },
              { step: "ASSESS", sub: "Inventory & Mosca Risk", tech: "CBOM + Evidence", color: "border-amber-500/30 bg-amber-950/20 text-amber-300" },
              { step: "PRIORITIZE", sub: "Wave Rollout Planning", tech: "Blast Radius Rank", color: "border-blue-500/30 bg-blue-950/20 text-blue-300" },
              { step: "HYBRID", sub: "Classical + PQC Dual", tech: "X25519MLKEM768", color: "border-indigo-500/30 bg-indigo-950/20 text-indigo-300" },
              { step: "PQC READY", sub: "Post-Quantum Standards", tech: "ML-KEM / ML-DSA", color: "border-emerald-500/30 bg-emerald-950/20 text-emerald-300" },
            ].map((p, idx) => (
              <div key={idx} className={`p-4 rounded-2xl border ${p.color} flex flex-col justify-between`}>
                <div>
                  <div className="text-[10px] text-text-dim font-bold">PHASE 0{idx + 1}</div>
                  <div className="text-sm font-bold mt-1 text-white">{p.step}</div>
                  <div className="text-[11px] text-text-muted mt-0.5">{p.sub}</div>
                </div>
                <div className="mt-4 pt-2 border-t border-white/10 text-[10px] font-bold">
                  {p.tech}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION — CBOM PREVIEW TABLE
          ========================================================================= */}
      <section className="py-20 px-6 sm:px-12 max-w-7xl mx-auto z-10 relative">
        <CBOMPreviewTable />
      </section>

      {/* =========================================================================
          SECTION — DASHBOARD MOCK PREVIEW (BROWSER SHELL)
          ========================================================================= */}
      <section className="py-20 px-6 sm:px-12 max-w-7xl mx-auto z-10 relative">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-mono text-cyber-cyan font-bold uppercase tracking-wider">
            OPERATIONAL SECURITY CONSOLE
          </span>
          <h3 className="text-2xl sm:text-4xl font-black text-white mt-1">
            Enterprise Cryptographic Security Operations
          </h3>
          <p className="text-xs text-text-dim mt-2">
            Inspect real live telemetry, trigger scans, and simulate cipher migration in the dedicated console.
          </p>
        </div>

        {/* Browser Mock Window */}
        <div className="w-full max-w-6xl mx-auto rounded-3xl border border-cyan-500/30 bg-[#050A1F] shadow-2xl shadow-cyan-950/60 overflow-hidden">
          {/* Window Header */}
          <div className="bg-[#030712] px-6 py-3.5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-3 font-mono text-xs text-text-dim">ecdat://console.enterprise.gov.in/dashboard</span>
            </div>
            <Link
              href="/dashboard"
              className="text-xs font-mono font-bold text-cyber-cyan hover:underline flex items-center gap-1.5"
            >
              Launch Full Screen <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Quick Metrics Bar inside Mock */}
          <div className="p-6 bg-gradient-to-b from-[#050A1F] to-[#020617] border-b border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#030712] border border-white/10">
              <div className="text-[10px] font-mono uppercase text-text-dim">Discovered Cryptographic Assets</div>
              <div className="text-2xl font-bold font-mono text-white mt-1">54 Assets</div>
              <div className="text-[10px] text-text-muted">4 Monitored Corpora</div>
            </div>
            <div className="p-4 rounded-xl bg-[#030712] border border-rose-500/20">
              <div className="text-[10px] font-mono uppercase text-rose-400">Quantum Vulnerable</div>
              <div className="text-2xl font-bold font-mono text-rose-400 mt-1">36 (66.7%)</div>
              <div className="text-[10px] text-text-muted">RSA, ECC, Diffie-Hellman</div>
            </div>
            <div className="p-4 rounded-xl bg-[#030712] border border-emerald-500/20">
              <div className="text-[10px] font-mono uppercase text-emerald-400">PQC / Hybrid Ready</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">11 (20.3%)</div>
              <div className="text-[10px] text-text-muted">ML-KEM / ML-DSA Verified</div>
            </div>
            <div className="p-4 rounded-xl bg-[#030712] border border-cyan-500/20">
              <div className="text-[10px] font-mono uppercase text-cyber-cyan">Regression Suite</div>
              <div className="text-2xl font-bold font-mono text-cyber-cyan mt-1">65/65 Passing</div>
              <div className="text-[10px] text-text-muted">Scanner Logic Frozen</div>
            </div>
          </div>

          {/* Embedded Call-to-Action to visit actual Dashboard */}
          <div className="p-12 text-center bg-[#020617] flex flex-col items-center justify-center">
            <ShieldCheck className="w-12 h-12 text-cyber-cyan mb-3 animate-pulse" />
            <h4 className="text-xl font-bold text-white">Access the Live ECDAT Security Operations Center</h4>
            <p className="text-xs text-text-muted max-w-md mt-1 mb-6">
              Complete with full asset drawer, interactive ReactFlow graph, live Mosca risk sliders, and one-click CycloneDX 1.7 CBOM downloads.
            </p>
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyber-blue to-cyber-cyan text-[#020617] font-bold text-xs shadow-glow-cyan hover:scale-105 transition-all flex items-center gap-2"
            >
              Open Authenticated SOC Dashboard →
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION — RESEARCH FOUNDATIONS
          ========================================================================= */}
      <section id="research" className="py-20 px-6 sm:px-12 max-w-7xl mx-auto z-10 relative">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-xs font-mono text-cyber-cyan mb-3">
            <Terminal className="w-3.5 h-3.5" />
            RESEARCH &amp; SCIENTIFIC INTEGRITY
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Built on Rigorous Cryptographic Standards.
          </h2>
          <p className="text-text-muted text-sm mt-3">
            ECDAT strictly rejects marketing exaggerations. Our discovery, risk modeling, and CBOM architectures strictly adhere to authoritative peer-reviewed foundations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#050A1F] border border-white/10 space-y-3">
            <h3 className="text-sm font-bold text-cyber-cyan font-mono">1. NIST PQC Standards (2024)</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Fully compliant with FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), and FIPS 205 (SLH-DSA). Recommendations are strictly role-correct (e.g. ML-KEM is never assigned as a digital signature).
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-[#050A1F] border border-white/10 space-y-3">
            <h3 className="text-sm font-bold text-cyber-cyan font-mono">2. CycloneDX 1.7 CBOM Specification</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Standardized Cryptography Bill of Materials schema natively representing primitive types, key lengths, certificates, and post-quantum readiness flags.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-[#050A1F] border border-white/10 space-y-3">
            <h3 className="text-sm font-bold text-cyber-cyan font-mono">3. Mosca Probabilistic Theorem</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Replaces hardcoded &quot;Q-Day 2035&quot; predictions with probability distributions P(X + Y &gt; Z) calculated via seeded Monte Carlo simulation over secrecy lifetime X and migration lead time Y.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION — 4. ENQUIRIES & DEPLOYMENT
          ========================================================================= */}
      <section id="deployment" className="py-24 px-6 sm:px-12 max-w-7xl mx-auto z-10 relative">
        <div className="text-left mb-12">
          <div className="inline-flex items-center gap-2 font-mono text-xs text-white uppercase tracking-widest mb-3">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-bold">4. ENQUIRIES &amp; DEPLOYMENT</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Enterprise Deployment &amp; SIH Enquiries
          </h2>
          <p className="text-slate-300 text-sm mt-3 max-w-2xl leading-relaxed">
            Deploy ECDAT natively into your secure enclaves, request air-gapped packages, or schedule a cryptographic migration readiness pilot.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Card 1 */}
          <div className="p-8 rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-cyan-400/50 hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                Air-Gapped &amp; On-Premise
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Zero external dependencies. Fully air-gapped Docker Compose and Kubernetes Helm deployments verified for classified defense and sovereign infrastructure enclaves.
              </p>
              <div className="pt-2 text-[10px] font-mono text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Zero Telemetry / No Phoning Home
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="w-3 h-3 text-cyan-400" /> Offline AST &amp; Dependency DB
                </div>
              </div>
            </div>
            <Link
              href="/dashboard/discovery"
              className="mt-6 flex items-center justify-between text-xs font-mono font-bold text-cyan-400 hover:text-white transition-colors"
            >
              <span>Explore Offline Scanner</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-cyan-400/50 hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                SIH26164 Evaluation Kit
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Evaluation bundle tailored for NTRO jury and technical reviewers: includes ground-truth benchmark corpora (PyJWT, paramiko, certbot, jjwt), reproducible seeds, and CycloneDX 1.7 schema verifier.
              </p>
              <div className="pt-2 text-[10px] font-mono text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <CheckCircle2 className="w-3 h-3" /> Pinned Commit Reproducibility
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="w-3 h-3 text-cyan-400" /> 65/65 Verified Test Cases
                </div>
              </div>
            </div>
            <Link
              href="/dashboard/compare"
              className="mt-6 flex items-center justify-between text-xs font-mono font-bold text-blue-400 hover:text-white transition-colors"
            >
              <span>View SIH Deliverables</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-cyan-400/50 hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <Server className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                SOC Integration &amp; Pilots
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Integrate continuous cryptographic discovery into your DevSecOps pipelines: GitHub Actions, GitLab CI, syslog outputs, and automated quantum risk thresholds.
              </p>
              <div className="pt-2 text-[10px] font-mono text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-400">
                  <CheckCircle2 className="w-3 h-3" /> REST &amp; CLI Interfaces
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="w-3 h-3 text-cyan-400" /> FIPS 203/204 Wave Roadmap
                </div>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="mt-6 flex items-center justify-between text-xs font-mono font-bold text-indigo-400 hover:text-white transition-colors"
            >
              <span>Open SOC Console</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Interactive Quick Enquiry Box */}
        <div className="p-8 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 hover:border-white/20 transition-all">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                Direct Technical Inquiries
              </div>
              <h3 className="text-xl font-bold text-white">
                Initiate an Evaluation or Enterprise Pilot
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Technical enquiries, on-premise deployment validation, or custom algorithm signatures for SIH26164 (NTRO).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <Link
                href="/dashboard/discovery"
                className="px-6 py-3.5 rounded-xl bg-primary text-[#000000] font-mono text-xs font-bold hover:opacity-90 transition-all shadow-glow-cyan flex items-center gap-2"
              >
                <Terminal className="w-4 h-4" />
                Launch Live Discovery Console
              </Link>
              <Link
                href="/dashboard/reports"
                className="px-6 py-3.5 rounded-xl bg-black border border-white/20 text-white hover:border-cyan-400 font-mono text-xs font-bold transition-all flex items-center gap-2"
              >
                <FileJson className="w-4 h-4 text-cyan-400" />
                Download CycloneDX 1.7 CBOM
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

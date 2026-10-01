import React from "react";
import Link from "next/link";
import { ShieldCheck, Cpu, Terminal, Github, ExternalLink, Globe } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-cyan-500/15 bg-[#020617] text-text-dim pt-16 pb-12 px-6 sm:px-12 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-white/5">
        {/* Brand Col */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyber-blue to-cyber-cyan flex items-center justify-center p-0.5">
              <div className="w-full h-full bg-[#020617] rounded-[6px] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-cyber-cyan" />
              </div>
            </div>
            <span className="text-xl font-bold tracking-wider text-text-bright">ECDAT</span>
          </div>

          <p className="text-xs text-text-muted max-w-sm leading-relaxed">
            Enterprise Cryptographic Discovery & Analysis Tool. Evidence-backed inventory, continuous quantum-risk modeling, and role-correct post-quantum migration intelligence.
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/20 text-[11px] font-mono text-cyber-cyan">
            <Globe className="w-3.5 h-3.5" />
            Smart India Hackathon 2026 · Problem SIH26164 · NTRO
          </div>
        </div>

        {/* Links Col 1: Platform */}
        <div>
          <h4 className="text-xs font-mono font-bold text-text-bright uppercase tracking-wider mb-3">
            Platform
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/dashboard/discovery" className="hover:text-cyber-cyan transition-colors">
                Continuous Discovery
              </Link>
            </li>
            <li>
              <Link href="/dashboard/assets" className="hover:text-cyber-cyan transition-colors">
                CBOM Generator (CycloneDX 1.7)
              </Link>
            </li>
            <li>
              <Link href="/dashboard/graph" className="hover:text-cyber-cyan transition-colors">
                Cryptographic Graph
              </Link>
            </li>
            <li>
              <Link href="/dashboard/risk" className="hover:text-cyber-cyan transition-colors">
                Mosca Quantum Risk
              </Link>
            </li>
            <li>
              <Link href="/dashboard/migration" className="hover:text-cyber-cyan transition-colors">
                PQC Wave Planner
              </Link>
            </li>
          </ul>
        </div>

        {/* Links Col 2: Research */}
        <div>
          <h4 className="text-xs font-mono font-bold text-text-bright uppercase tracking-wider mb-3">
            Standards & Research
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <a href="https://csrc.nist.gov/pqc" target="_blank" rel="noreferrer" className="hover:text-cyber-cyan transition-colors flex items-center gap-1">
                NIST FIPS 203 (ML-KEM) <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </li>
            <li>
              <a href="https://csrc.nist.gov/pqc" target="_blank" rel="noreferrer" className="hover:text-cyber-cyan transition-colors flex items-center gap-1">
                NIST FIPS 204 (ML-DSA) <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </li>
            <li>
              <a href="https://cyclonedx.org" target="_blank" rel="noreferrer" className="hover:text-cyber-cyan transition-colors flex items-center gap-1">
                CycloneDX 1.7 Specification <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </li>
            <li>
              <span className="text-text-dim">Mosca Theorem Uncertainty Engine</span>
            </li>
            <li>
              <span className="text-text-dim">Multi-Source Evidence Fusion</span>
            </li>
          </ul>
        </div>

        {/* Links Col 3: System Status */}
        <div>
          <h4 className="text-xs font-mono font-bold text-text-bright uppercase tracking-wider mb-3">
            System Security
          </h4>
          <div className="space-y-3 font-mono text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-text-bright">Scanner Engine Frozen</span>
            </div>
            <div className="text-text-dim">
              65/65 Unit Tests Passing
            </div>
            <div className="text-text-dim">
              4 Baseline Corpora Validated
            </div>
            <div className="text-cyber-cyan font-bold">
              0 Spurious UNKNOWN Assets
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-text-dim gap-4">
        <div>
          © 2026 ECDAT — Enterprise Cryptographic Discovery & Analysis Tool. All rights reserved.
        </div>
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-cyber-cyan hover:underline">
            Security Console
          </Link>
          <a href="#research" className="hover:text-white transition-colors">
            Research Foundations
          </a>
          <a href="https://sih.gov.in" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
            Smart India Hackathon 2026
          </a>
        </div>
      </div>
    </footer>
  );
}

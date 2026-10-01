"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Search, 
  Database, 
  Network, 
  AlertTriangle, 
  Cpu, 
  FileText, 
  Layers, 
  RotateCcw, 
  Bell, 
  User, 
  Menu, 
  X, 
  ChevronRight,
  ExternalLink,
  Radio,
  CheckCircle2
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Discovery Engine", href: "/dashboard/discovery", icon: Search, badge: "SCAN" },
  { name: "Asset Inventory (CBOM)", href: "/dashboard/assets", icon: Database },
  { name: "Cryptographic Graph", href: "/dashboard/graph", icon: Network },
  { name: "Quantum Risk (Mosca)", href: "/dashboard/risk", icon: AlertTriangle, badge: "P(X+Y>Z)" },
  { name: "PQC Migration", href: "/dashboard/migration", icon: Cpu, badge: "WAVES" },
  { name: "Reports & Export", href: "/dashboard/reports", icon: FileText },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [replayMode, setReplayMode] = useState(false);
  const [activeScan, setActiveScan] = useState("jjwt-postpatch");

  return (
    <div className="min-h-screen bg-[#020617] text-text-bright flex flex-col font-sans">
      {/* Top Global Command Bar */}
      <header className="h-16 border-b border-cyan-500/20 bg-[#050A1F]/90 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between z-40 sticky top-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg border border-white/10 hover:border-cyan-500/40 text-text-dim hover:text-white"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyber-blue to-cyber-cyan p-0.5 shadow-glow-cyan flex items-center justify-center">
              <div className="w-full h-full bg-[#020617] rounded-[6px] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-cyber-cyan" />
              </div>
            </div>
            <div>
              <span className="font-bold text-base tracking-wider text-text-bright">ECDAT</span>
              <span className="text-[10px] font-mono text-cyber-cyan ml-2 hidden sm:inline-block border border-cyan-500/30 px-1.5 py-0.5 rounded">
                SOC CONSOLE
              </span>
            </div>
          </Link>
        </div>

        {/* Center status indicators */}
        <div className="hidden md:flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#030712] border border-cyan-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-text-muted">SCANNER:</span>
            <span className="text-emerald-400 font-bold">FROZEN (65/65 PASSING)</span>
          </div>

          {/* Active Scan Dataset Switcher */}
          <div className="flex items-center gap-1.5 bg-[#030712] px-3 py-1 rounded-full border border-white/10">
            <Radio className="w-3 h-3 text-cyber-cyan" />
            <span className="text-text-dim">DATASET:</span>
            <select
              value={activeScan}
              onChange={(e) => setActiveScan(e.target.value)}
              className="bg-transparent text-cyber-cyan font-bold focus:outline-none cursor-pointer text-xs"
            >
              <option value="jjwt-postpatch" className="bg-[#050A1F] text-white">JJWT @ fb71496 (0 Spurious)</option>
              <option value="certbot-postpatch" className="bg-[#050A1F] text-white">Certbot @ 4856493 (17 Assets)</option>
              <option value="paramiko-postpatch" className="bg-[#050A1F] text-white">Paramiko @ 142f593 (AES-CTR)</option>
              <option value="pyjwt-postpatch" className="bg-[#050A1F] text-white">PyJWT @ b5bd6fe (Ed448)</option>
            </select>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-3">
          {/* Replay Mode Toggle */}
          <button
            onClick={() => setReplayMode(!replayMode)}
            className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all ${
              replayMode
                ? "bg-amber-950/80 border-amber-500/50 text-amber-300 shadow-glow-amber"
                : "bg-[#030712] border-white/10 text-text-dim hover:text-white"
            }`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${replayMode ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">REPLAY MODE:</span>
            <span>{replayMode ? "ACTIVE" : "OFF"}</span>
          </button>

          {/* User profile */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyber-cyan font-mono text-xs font-bold">
              NTRO
            </div>
            <div className="hidden lg:block text-left font-mono">
              <div className="text-xs font-bold text-text-bright">Cryptanalyst</div>
              <div className="text-[10px] text-text-dim">SIH26164 Team</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body Shell */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className={`border-r border-cyan-500/15 bg-[#030712]/95 backdrop-blur-xl transition-all duration-300 flex flex-col justify-between ${
            sidebarOpen ? "w-64" : "w-16"
          }`}
        >
          <div className="p-3 space-y-1">
            <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-text-dim">
              {sidebarOpen ? "PLATFORM MODULES" : "MODULES"}
            </div>

            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-mono transition-all group ${
                    isActive
                      ? "bg-[#07112F] text-cyber-cyan border border-cyan-500/40 font-bold shadow-glow-cyan"
                      : "text-text-dim hover:text-text-bright hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? "text-cyber-cyan" : "text-text-dim group-hover:text-cyber-cyan"
                      }`}
                    />
                    {sidebarOpen && <span className="truncate">{item.name}</span>}
                  </div>

                  {sidebarOpen && item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        isActive
                          ? "bg-cyan-500/20 text-cyber-cyan"
                          : "bg-slate-800 text-text-dim"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Sidebar bottom system telemetry */}
          {sidebarOpen && (
            <div className="p-4 m-3 rounded-2xl bg-[#050A1F] border border-white/10 text-xs font-mono space-y-2">
              <div className="text-[10px] text-text-dim uppercase tracking-wider flex items-center justify-between">
                <span>EVIDENCE INTEGRITY</span>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="text-[11px] text-text-muted">
                Zero synthetic keys. Deterministic ground truth across 4 pinned corpora.
              </div>
              <div className="text-[10px] text-cyber-cyan">
                SIH26164 · NTRO Compliant
              </div>
            </div>
          )}
        </aside>

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto bg-[#020617] p-6 sm:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

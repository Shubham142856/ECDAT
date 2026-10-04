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
  CheckCircle2,
  Scale
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
  { name: "Compare Problem Statement", href: "/dashboard/compare", icon: Scale, badge: "SIH26164" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [replayMode, setReplayMode] = useState(false);
  const [activeScan, setActiveScan] = useState("pyjwt-baseline");

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Top Global Command Bar */}
      <header className="h-16 border-b border-white/10 bg-black/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between z-40 sticky top-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg border border-white/10 hover:border-white/30 text-slate-400 hover:text-white"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white text-black p-0.5 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-black" />
            </div>
            <div>
              <span className="font-bold text-base tracking-wider text-white">ECDAT</span>
              <span className="text-[10px] font-mono text-slate-400 ml-2 hidden sm:inline-block border border-white/20 px-1.5 py-0.5 rounded">
                SOC CONSOLE
              </span>
            </div>
          </Link>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 pl-2">
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white font-mono text-xs font-bold">
              NTRO
            </div>
            <div className="hidden lg:block text-left font-mono">
              <div className="text-xs font-bold text-white">Cryptanalyst</div>
              <div className="text-[10px] text-slate-400">SIH26164 Team</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body Shell */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className={`border-r border-white/10 bg-black/90 backdrop-blur-xl transition-all duration-300 flex flex-col justify-between ${
            sidebarOpen ? "w-64" : "w-16"
          }`}
        >
          <div className="p-3 space-y-1">
            <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-slate-400">
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
                      ? "bg-white/15 text-white border border-white/30 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                      }`}
                    />
                    {sidebarOpen && <span className="truncate">{item.name}</span>}
                  </div>

                  {sidebarOpen && item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-white/5 text-slate-400"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Sidebar bottom telemetry */}
          {sidebarOpen && (
            <div className="p-4 m-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs font-mono space-y-1.5">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>EVIDENCE INTEGRITY</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="text-[11px] text-slate-300">
                Deterministic ground truth across verified corpora.
              </div>
              <div className="text-[10px] text-slate-400">
                SIH26164 · NTRO
              </div>
            </div>
          )}
        </aside>

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto bg-black p-6 sm:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

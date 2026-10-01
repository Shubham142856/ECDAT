"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, Cpu, ArrowRight, Menu, X, Terminal } from "lucide-react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl z-50 transition-all duration-300 rounded-2xl ${
        scrolled
          ? "bg-[#020617]/90 backdrop-blur-xl border border-cyan-500/25 shadow-2xl shadow-cyan-950/40 py-3 px-6"
          : "bg-[#050A1F]/70 backdrop-blur-md border border-white/10 py-4 px-6"
      }`}
    >
      <div className="flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyber-blue to-cyber-cyan p-0.5 shadow-glow-cyan">
            <div className="w-full h-full bg-[#020617] rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-cyber-cyan group-hover:scale-110 transition-transform" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyber-cyan animate-ping" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-wider text-text-bright">
                ECDAT
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyber-cyan border border-cyan-500/30">
                PQC INTELLIGENCE
              </span>
            </div>
            <span className="text-[11px] font-mono text-text-dim tracking-tight hidden sm:block">
              SIH26164 · NTRO Enterprise Security
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#platform"
            className="text-sm font-medium text-text-dim hover:text-cyber-cyan transition-colors"
          >
            Platform
          </a>
          <a
            href="#how-it-works"
            className="text-sm font-medium text-text-dim hover:text-cyber-cyan transition-colors"
          >
            How It Works
          </a>
          <a
            href="#capabilities"
            className="text-sm font-medium text-text-dim hover:text-cyber-cyan transition-colors"
          >
            Capabilities
          </a>
          <a
            href="#research"
            className="text-sm font-medium text-text-dim hover:text-cyber-cyan transition-colors"
          >
            Research
          </a>
          <a
            href="#about"
            className="text-sm font-medium text-text-dim hover:text-cyber-cyan transition-colors"
          >
            About
          </a>
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-cyan-500/30 text-cyber-cyan bg-cyan-950/30 hover:bg-cyan-900/40 hover:border-cyan-400 transition-all flex items-center gap-2"
          >
            <Terminal className="w-3.5 h-3.5" />
            View Demo
          </Link>
          <Link
            href="/dashboard/discovery"
            className="text-xs font-bold px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyber-blue to-cyber-cyan text-[#020617] hover:shadow-glow-cyan transition-all flex items-center gap-2 group"
          >
            Get Started
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-text-muted hover:text-cyber-cyan focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-4 pt-4 border-t border-white/10 flex flex-col gap-3">
          <a
            href="#platform"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm text-text-muted hover:text-cyber-cyan py-1"
          >
            Platform
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm text-text-muted hover:text-cyber-cyan py-1"
          >
            How It Works
          </a>
          <a
            href="#capabilities"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm text-text-muted hover:text-cyber-cyan py-1"
          >
            Capabilities
          </a>
          <a
            href="#research"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm text-text-muted hover:text-cyber-cyan py-1"
          >
            Research
          </a>
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/dashboard"
              className="text-xs text-center font-semibold py-2 rounded-lg border border-cyan-500/30 text-cyber-cyan"
            >
              Security Console Demo
            </Link>
            <Link
              href="/dashboard/discovery"
              className="text-xs text-center font-bold py-2 rounded-lg bg-cyber-blue text-white"
            >
              Start Discovery
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

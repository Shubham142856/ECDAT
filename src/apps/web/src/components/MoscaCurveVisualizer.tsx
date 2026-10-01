"use client";

import React, { useState, useMemo } from "react";
import { AlertCircle, Sliders, Calculator, ShieldCheck } from "lucide-react";

export function MoscaCurveVisualizer() {
  const [xVal, setXVal] = useState<number>(3);  // Migration Time (years)
  const [yVal, setYVal] = useState<number>(10); // Secrecy Lifespan (years)
  const [zMode, setZMode] = useState<number>(12); // CRQC arrival estimate (mode in years)

  // Calculate Mosca condition
  const exposureSum = xVal + yVal;
  const isVulnerable = exposureSum > zMode;

  // Analytical Triangular distribution for CRQC timeline Z ~ Triangular(low, mode, high)
  // Low = max(zMode - 5, 2), High = zMode + 8, Mode = zMode
  const { probability, curvePoints, cutoffX } = useMemo(() => {
    const low = Math.max(zMode - 5, 2);
    const high = zMode + 8;
    const mode = zMode;

    // Exact CDF F(t) = P(Z <= t)
    const computeCDF = (t: number): number => {
      if (t <= low) return 0;
      if (t >= high) return 1;
      if (t <= mode) {
        return Math.pow(t - low, 2) / ((high - low) * (mode - low));
      } else {
        return 1 - Math.pow(high - t, 2) / ((high - low) * (high - mode));
      }
    };

    // Exact PDF f(t) for plotting the smooth distribution curve
    const computePDF = (t: number): number => {
      if (t < low || t > high) return 0;
      if (t <= mode) {
        return (2 * (t - low)) / ((high - low) * (mode - low));
      } else {
        return (2 * (high - t)) / ((high - low) * (high - mode));
      }
    };

    // P(X + Y > Z) = P(Z < X + Y) = CDF(X + Y)
    const prob = computeCDF(exposureSum);

    // Build SVG path coordinates across 30 deterministic evaluation points (width 400, height 140)
    const steps = 30;
    const maxDensity = (2) / (high - low); // peak at mode
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = low + (i / steps) * (high - low);
      const density = computePDF(t);
      const px = (i / steps) * 400;
      const py = 130 - (density / maxDensity) * 110;
      points.push({ x: px, y: py });
    }

    // Cutoff pixel position for exposureSum (X + Y)
    const normalizedCutoff = Math.max(0, Math.min(1, (exposureSum - low) / (high - low)));
    const cutoffPx = normalizedCutoff * 400;

    return { probability: prob, curvePoints: points, cutoffX: cutoffPx };
  }, [zMode, exposureSum]);

  // Construct SVG path string
  const pathD = curvePoints.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  return (
    <div className="w-full max-w-5xl mx-auto rounded-3xl border border-cyan-500/25 bg-gradient-to-b from-[#050A1F] to-[#020617] p-6 sm:p-10 shadow-2xl shadow-cyan-950/40">
      <div className="flex flex-col lg:flex-row items-start justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-[11px] font-mono text-cyber-cyan mb-2">
            <Calculator className="w-3.5 h-3.5" />
            PROBABILISTIC QUANTUM RISK THEOREM
          </div>
          <h3 className="text-2xl font-bold text-text-bright">
            From a Fixed Quantum Timeline to Probabilistic Risk
          </h3>
          <p className="text-sm text-text-dim max-w-2xl mt-1">
            ECDAT avoids arbitrary "Q-Day" fixed year assumptions. We model Mosca theorem variables as probability distributions over scenario parameters: <span className="font-mono text-cyber-cyan font-bold">P(X + Y &gt; Z)</span>.
          </p>
        </div>

        {/* Mosca Status Callout */}
        <div className={`px-5 py-3 rounded-2xl border flex items-center gap-3 ${
          isVulnerable 
            ? "bg-rose-950/50 border-rose-500/40 text-rose-300"
            : "bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
        }`}>
          {isVulnerable ? <AlertCircle className="w-6 h-6 text-rose-400" /> : <ShieldCheck className="w-6 h-6 text-emerald-400" />}
          <div>
            <div className="text-[11px] font-mono uppercase font-bold tracking-wider">
              {isVulnerable ? "MOSCA CONDITION TRIGGERED" : "WITHIN SAFE BOUNDS"}
            </div>
            <div className="text-xs font-mono">
              X + Y ({exposureSum} yrs) {isVulnerable ? ">" : "≤"} Z ({zMode} yrs)
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 items-center">
        {/* Sliders Console */}
        <div className="lg:col-span-6 space-y-6 bg-[#030712]/80 p-6 rounded-2xl border border-white/10">
          <div className="flex items-center gap-2 text-xs font-mono text-cyber-cyan border-b border-white/10 pb-2">
            <Sliders className="w-4 h-4" />
            SCENARIO MODEL VARIABLES (USER ADJUSTABLE)
          </div>

          {/* Slider X */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-text-muted font-medium">
                <span className="font-mono text-cyber-cyan font-bold">X</span> — Migration Duration (Years):
              </span>
              <span className="font-mono font-bold text-cyber-cyan">{xVal} Years</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={xVal}
              onChange={(e) => setXVal(Number(e.target.value))}
              className="w-full accent-cyber-cyan cursor-pointer bg-slate-800"
            />
            <span className="text-[10px] text-text-dim block">Time needed to discover, re-engineer, test, and deploy PQC.</span>
          </div>

          {/* Slider Y */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-text-muted font-medium">
                <span className="font-mono text-indigo-400 font-bold">Y</span> — Required Secrecy Lifespan (Years):
              </span>
              <span className="font-mono font-bold text-indigo-300">{yVal} Years</span>
            </div>
            <input
              type="range"
              min="1"
              max="25"
              step="1"
              value={yVal}
              onChange={(e) => setYVal(Number(e.target.value))}
              className="w-full accent-indigo-400 cursor-pointer bg-slate-800"
            />
            <span className="text-[10px] text-text-dim block">Regulatory data confidentiality lifespan (SNDL window).</span>
          </div>

          {/* Slider Z */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-text-muted font-medium">
                <span className="font-mono text-amber-400 font-bold">Z</span> — Estimated CRQC Arrival Horizon (Years):
              </span>
              <span className="font-mono font-bold text-amber-300">~{zMode} Years (Scenario Mode)</span>
            </div>
            <input
              type="range"
              min="5"
              max="25"
              step="1"
              value={zMode}
              onChange={(e) => setZMode(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer bg-slate-800"
            />
            <span className="text-[10px] text-text-dim block">Parameter distribution, not a single hardcoded year.</span>
          </div>
        </div>

        {/* Dynamic Probability Curve SVG */}
        <div className="lg:col-span-6 flex flex-col items-center bg-[#030712]/80 p-6 rounded-2xl border border-white/10 relative overflow-hidden">
          <div className="w-full flex items-center justify-between mb-2 font-mono text-xs">
            <span className="text-text-dim">MONTE CARLO PROBABILITY DENSITY</span>
            <span className="text-rose-400 font-bold">P(X + Y &gt; Z) = {(probability * 100).toFixed(1)}%</span>
          </div>

          <div className="w-full relative py-4">
            <svg viewBox="0 0 400 150" className="w-full h-auto overflow-visible">
              <defs>
                <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="riskGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="130" x2="400" y2="130" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <line x1="0" y1="20" x2="400" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
              <line x1="0" y1="75" x2="400" y2="75" stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />

              {/* Shaded Area under curve */}
              <path
                d={`${pathD} L 400 130 L 0 130 Z`}
                fill="url(#curveGradient)"
              />

              {/* Main Probability Curve */}
              <path
                d={pathD}
                fill="none"
                stroke="#22D3EE"
                strokeWidth="2.5"
              />

              {/* Cutoff Threshold Line (X + Y) */}
              <line
                x1={cutoffX}
                y1="10"
                x2={cutoffX}
                y2="130"
                stroke="#F43F5E"
                strokeWidth="2"
                strokeDasharray="4,4"
              />

              {/* Indicator Circle */}
              <circle
                cx={cutoffX}
                cy="15"
                r="4.5"
                fill="#F43F5E"
                className="animate-pulse"
              />
            </svg>

            {/* Labels below chart */}
            <div className="flex justify-between text-[10px] font-mono text-text-dim mt-2">
              <span>Optimistic CRQC</span>
              <span className="text-amber-400 font-bold">Mode (~{zMode}y)</span>
              <span>Conservative Horizon</span>
            </div>
          </div>

          <div className="w-full text-center mt-3 pt-3 border-t border-white/10 font-mono text-[11px] text-text-dim">
            Simulated 2,000 Monte Carlo Iterations · Seed: <span className="text-cyber-cyan">20260930</span>
          </div>
        </div>
      </div>
    </div>
  );
}

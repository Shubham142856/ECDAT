import React from "react";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
          Cryptographic Discovery & Risk Analysis
        </h1>
        <p className="text-muted-text max-w-3xl">
          Continuous cryptographic inventory, provenance tracking, post-quantum risk modeling, and role-correct migration planning.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-lg border border-border bg-surface">
          <div className="text-xs uppercase text-muted-text font-semibold tracking-wider">Total Cryptographic Assets</div>
          <div className="text-3xl font-bold mt-2 text-white">48</div>
          <div className="text-xs text-muted-text mt-1">Across 14 enterprise repositories</div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-surface">
          <div className="text-xs uppercase text-muted-text font-semibold tracking-wider">Quantum Vulnerable</div>
          <div className="text-3xl font-bold mt-2 text-vulnerable">32</div>
          <div className="text-xs text-vulnerable/80 mt-1">RSA, ECC, Diffie-Hellman</div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-surface">
          <div className="text-xs uppercase text-muted-text font-semibold tracking-wider">Hybrid / PQC Ready</div>
          <div className="text-3xl font-bold mt-2 text-safe">8</div>
          <div className="text-xs text-safe/80 mt-1">ML-KEM / ML-DSA / X25519MLKEM768</div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-surface">
          <div className="text-xs uppercase text-muted-text font-semibold tracking-wider">High Risk / Mosca Triggered</div>
          <div className="text-3xl font-bold mt-2 text-warning">14</div>
          <div className="text-xs text-warning/80 mt-1">X + Y &gt; Z condition evaluated</div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="text-xl font-bold text-white mb-4">Core Principles</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-primary mb-1">1. Evidence-Backed Roles</h3>
            <p className="text-xs text-muted-text">
              Distinguishes Capability vs. Implementation vs. Usage. Dependency alone never equates to active usage.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary mb-1">2. Role-Correct Migration</h3>
            <p className="text-xs text-muted-text">
              Strictly maps KEMs for key establishment and DSAs for signatures. Prevents invalid PQC algorithm assignments.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary mb-1">3. Deterministic Proof</h3>
            <p className="text-xs text-muted-text">
              Deterministic AST &amp; static analysis first. AI provides contextual reasoning anchored in verifiable code locations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

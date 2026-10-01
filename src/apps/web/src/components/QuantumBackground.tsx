"use client";

import React from "react";

/**
 * EnterpriseBackground — Clean, subdued styling suitable for an NTRO defense audience.
 * Replaces decorative particle-canvas animation with a subtle, professional dark enterprise grid.
 */
export function QuantumBackground() {
  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0 opacity-40"
      aria-hidden="true"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(148, 163, 184, 0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(148, 163, 184, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: "48px 48px",
      }}
    >
      {/* Subtle radial ambient vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 15%, rgba(30, 41, 59, 0.4) 0%, transparent 70%)"
        }}
      />
    </div>
  );
}

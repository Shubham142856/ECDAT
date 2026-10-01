"use client";

import React from "react";

/**
 * QuantumBackground — Sophisticated celestial and ambient backdrop
 * featuring subtle glowing arc and starry coordinate grid.
 */
export function QuantumBackground() {
  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Celestial planet arc & glow backdrop */}
      <div 
        className="absolute inset-0 opacity-25"
        style={{
          background: `
            radial-gradient(60% 55% at 30% 20%, rgba(255,255,255,0.85) 0%, rgba(200,180,160,0.25) 35%, transparent 70%),
            radial-gradient(70% 60% at 15% 100%, #000 0 55%, transparent 56%),
            radial-gradient(40% 40% at 90% 40%, rgba(107,85,69,0.35), transparent 70%),
            #000
          `,
        }}
      />
      {/* Ambient coordinate grid */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(200, 180, 160, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(200, 180, 160, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
    </div>
  );
}

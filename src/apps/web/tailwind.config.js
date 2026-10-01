/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep Space Quantum Cybersecurity Palette
        space: {
          950: "#020617", // slate black
          900: "#030712", // dark cosmic
          850: "#050A1F", // deep space navy
          800: "#07112F", // dark cyan-navy
          700: "#0B1947", // panel surface
          600: "#0F2366", // panel hover
        },
        cyber: {
          blue: "#2563EB",       // Electric Blue (Primary)
          "blue-glow": "#3B82F6",
          cyan: "#22D3EE",       // Cyan (Secondary)
          "cyan-glow": "#67E8F9",
          indigo: "#6366F1",     // Violet Accent
          violet: "#8B5CF6",
          emerald: "#10B981",    // Quantum Safe
          amber: "#F59E0B",      // Medium / Transition
          rose: "#F43F5E",       // Vulnerable / Critical
        },
        text: {
          bright: "#F8FAFC",
          muted: "#CBD5E1",
          dim: "#94A3B8",
          dark: "#64748B",
        },
        // Semantic aliases
        background: "#020617",
        surface: "#050A1F",
        surface2: "#07112F",
        border: "rgba(34, 211, 238, 0.12)",
        "border-bright": "rgba(34, 211, 238, 0.28)",
        primary: "#2563EB",
        secondary: "#22D3EE",
        safe: "#10B981",
        vulnerable: "#F43F5E",
        warning: "#F59E0B",
        hybrid: "#8B5CF6",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"],
      },
      boxShadow: {
        "glow-cyan": "0 0 25px rgba(34, 211, 238, 0.25)",
        "glow-blue": "0 0 25px rgba(37, 99, 235, 0.35)",
        "glow-violet": "0 0 25px rgba(139, 92, 246, 0.25)",
        "glow-rose": "0 0 25px rgba(244, 63, 94, 0.3)",
        "panel": "0 10px 30px -10px rgba(2, 6, 23, 0.8), 0 0 1px 1px rgba(34, 211, 238, 0.1)",
        "panel-hover": "0 15px 35px -10px rgba(2, 6, 23, 0.9), 0 0 15px rgba(34, 211, 238, 0.2)",
      },
      animation: {
        "pulse-glow": "pulse-glow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "orbit-slow": "orbit 30s linear infinite",
        "radar-sweep": "sweep 4s linear infinite",
        "scan-line": "scanline 6s linear infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.03)" },
        },
        orbit: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        sweep: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(1000%)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

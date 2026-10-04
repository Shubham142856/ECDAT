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
        // User design theme colors (Pure black + glassmorphism + white text)
        'bg-0': '#000000',
        'bg-200': '#0a0a0c',
        'bg-300': '#121217',
        'text-100': '#ffffff',
        'text-200': '#f1f5f9',
        'text-300': '#94a3b8',
        'primary-user': '#38bdf8',
        'primary-fg': '#000000',
        'border-user': 'rgba(255, 255, 255, 0.10)',
        'color-1': 'rgb(18, 18, 23)',
        'color-2': 'rgb(30, 30, 38)',
        'color-3': 'rgb(50, 50, 65)',
        'color-4': 'rgb(148, 163, 184)',
        'color-5': 'rgb(241, 245, 249)',

        // Enterprise space palette (pure deep black + subtle slate)
        space: {
          950: "#000000",
          900: "#050508",
          850: "#0a0a0e",
          800: "#101016",
          700: "#181822",
          600: "#222230",
        },
        cyber: {
          blue: "#0284c7",
          "blue-glow": "#38bdf8",
          cyan: "#38bdf8",
          "cyan-glow": "#7dd3fc",
          indigo: "#818cf8",
          violet: "#a78bfa",
          emerald: "#34d399",    // Quantum Safe
          amber: "#fbbf24",      // Transition / Monitoring
          rose: "#f87171",       // Critical / Vulnerable
        },
        text: {
          bright: "#ffffff",
          muted: "#f1f5f9",
          dim: "#94a3b8",
          dark: "#64748b",
        },
        // Semantic aliases
        background: "#000000",
        surface: "#0a0a0e",
        surface2: "#121218",
        border: "rgba(255, 255, 255, 0.10)",
        "border-bright": "rgba(255, 255, 255, 0.25)",
        primary: "#38bdf8",
        secondary: "#94a3b8",
        safe: "#34d399",
        vulnerable: "#f87171",
        warning: "#fbbf24",
        hybrid: "#a78bfa",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        serif: ["var(--font-serif-accent)", "Instrument Serif", "Times New Roman", "serif"],
        "serif-accent": ["var(--font-serif-accent)", "Instrument Serif", "Times New Roman", "serif"],
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"],
      },
      boxShadow: {
        "glow-cyan": "0 0 25px rgba(200, 180, 160, 0.25)",
        "glow-blue": "0 0 25px rgba(200, 180, 160, 0.25)",
        "glow-violet": "0 0 25px rgba(168, 144, 128, 0.25)",
        "glow-rose": "0 0 25px rgba(201, 112, 100, 0.25)",
        "panel": "0 10px 30px -10px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(200, 180, 160, 0.12)",
        "panel-hover": "0 15px 35px -10px rgba(0, 0, 0, 0.9), 0 0 15px rgba(200, 180, 160, 0.22)",
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
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

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
        // User design theme colors
        'bg-0': '#000000',
        'bg-200': '#1a1d18',
        'bg-300': '#2a2e26',
        'text-100': '#f8f7f5',
        'text-200': '#e6e1d7',
        'text-300': '#a89080',
        'primary-user': '#c8b4a0',
        'primary-fg': '#1a1d18',
        'border-user': 'rgba(200, 180, 160, 0.12)',
        'color-1': 'rgb(42, 46, 38)',
        'color-2': 'rgb(66, 58, 48)',
        'color-3': 'rgb(107, 85, 69)',
        'color-4': 'rgb(150, 122, 104)',
        'color-5': 'rgb(200, 180, 160)',

        // Enterprise space palette (warm luxury dark)
        space: {
          950: "#000000",
          900: "#0d0f0c",
          850: "#141712",
          800: "#1a1d18",
          700: "#2a2e26",
          600: "#3d4237",
        },
        cyber: {
          blue: "#c8b4a0",       // Champagne / Bronze Gold
          "blue-glow": "#e6e1d7",
          cyan: "#c8b4a0",       // Warm gold accent
          "cyan-glow": "#e6e1d7",
          indigo: "#a89080",     // Muted bronze
          violet: "#bfa490",
          emerald: "#8cae80",    // Quantum Safe (warm sage)
          amber: "#d4a373",      // Transition (warm amber)
          rose: "#c97064",       // Critical (warm terracotta)
        },
        text: {
          bright: "#f8f7f5",
          muted: "#e6e1d7",
          dim: "#a89080",
          dark: "#7d6a5d",
        },
        // Semantic aliases
        background: "#000000",
        surface: "#1a1d18",
        surface2: "#2a2e26",
        border: "rgba(200, 180, 160, 0.12)",
        "border-bright": "rgba(200, 180, 160, 0.28)",
        primary: "#c8b4a0",
        secondary: "#a89080",
        safe: "#8cae80",
        vulnerable: "#c97064",
        warning: "#d4a373",
        hybrid: "#bfa490",
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

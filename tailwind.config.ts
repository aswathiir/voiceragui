import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Lexend", "sans-serif"],
        mono: ["Fira Code", "monospace"],
        body: ["Lexend", "sans-serif"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Custom Neural Noir palette
        void: "#030307",
        neural: "#0d0d1a",
        "neural-light": "#151528",
        indigo: {
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
        },
        cyan: {
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
        },
        amber: {
          300: "#fcd34d",
          400: "#fbbf24",
        },
        "spektr-cyan-50": "#ecfeff",
        // BeyondForms palette — same hex values previously hardcoded as
        // NAVY/TEAL/SLATE inline-style constants across BF pages, now real
        // theme tokens so those pages can use className instead of style={}.
        "bf-navy": "#0F2C5C",
        "bf-navy-light": "#1A3D73",
        "bf-teal": "#00A693",
        "bf-teal-light": "rgba(0,166,147,0.08)",
        "bf-slate": "#3D5A80",
        "bf-bg": "#F5F7FA",
        "bf-border": "#DDE3EC",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(129, 140, 248, 0.3)" },
          "50%": { boxShadow: "0 0 60px rgba(129, 140, 248, 0.8)" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        ripple: {
          "0%": { transform: "scale(0)", opacity: "0.35" },
          "100%": { transform: "scale(1)", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        glow: "glow 2s ease-in-out infinite",
        scanline: "scanline 8s linear infinite",
        ripple: "ripple var(--ripple-duration, 600ms) ease-out forwards",
      },
      backgroundImage: {
        "neural-grid":
          "radial-gradient(circle at 1px 1px, rgba(129,140,248,0.08) 1px, transparent 0)",
        "radial-glow":
          "radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, transparent 70%)",
      },
      backgroundSize: {
        grid: "32px 32px",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;

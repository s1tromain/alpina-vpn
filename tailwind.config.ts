import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        graphite: {
          50: "#f5f5f6",
          100: "#e6e6e7",
          200: "#c2c2c5",
          300: "#9d9da2",
          400: "#76767c",
          500: "#52525a",
          600: "#3d3d44",
          700: "#28282d",
          800: "#1a1a1d",
          900: "#0d0d0f",
          950: "#050506",
        },
        silver: {
          DEFAULT: "#c0c0c0",
          light: "#e8e8e8",
          dark: "#8a8a8a",
        },
        // Alpina brand palette — cool alpine tones layered on the existing
        // grayscale. `alpine` is the primary accent (a desaturated ice-blue
        // — visible against the dark UI without breaking the monochrome
        // luxury feel). `frost` is a brighter highlight for hover/glow
        // states. `glacier` is the deepest shadow tone for ambient backdrops.
        alpine: {
          50:  "#eef3f7",
          100: "#d6e0ea",
          200: "#aec3d4",
          300: "#85a4be",
          400: "#5d85a7",
          500: "#3f6a8d",
          600: "#305877",
          700: "#26475f",
          800: "#1c3548",
          900: "#13242f",
          DEFAULT: "#85a4be",
        },
        frost: {
          DEFAULT: "#d6e0ea",
          light: "#f0f4f8",
        },
        glacier: {
          DEFAULT: "#0c1218",
          deep: "#070b10",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        serif: ["var(--font-playfair)", "ui-serif", "Georgia"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        "gradient-graphite":
          "linear-gradient(135deg, #1a1a1d 0%, #0d0d0f 60%, #050506 100%)",
        "gradient-silver":
          "linear-gradient(135deg, #e8e8e8 0%, #c0c0c0 50%, #8a8a8a 100%)",
        "gradient-noble":
          "linear-gradient(135deg, rgba(192,192,192,0.12) 0%, rgba(192,192,192,0.03) 50%, rgba(255,255,255,0.06) 100%)",
        "shimmer":
          "linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)",
        // Alpina brand gradients — used sparingly on the wordmark and
        // primary CTAs. Keep monochrome-friendly so they layer cleanly
        // over the existing graphite background.
        "gradient-alpine":
          "linear-gradient(135deg, #f0f4f8 0%, #aec3d4 45%, #5d85a7 100%)",
        "gradient-alpine-ambient":
          "radial-gradient(1200px 600px at 50% -10%, rgba(133,164,190,0.10), transparent 60%), radial-gradient(800px 400px at 100% 100%, rgba(174,195,212,0.06), transparent 70%), linear-gradient(180deg, #0a0a0c 0%, #050506 100%)",
      },
      boxShadow: {
        glass:
          "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        "glass-lg":
          "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
        glow: "0 0 40px rgba(192,192,192,0.15)",
        // Brand glow — soft alpine halo for the primary mark and CTA hovers.
        "glow-alpine":
          "0 0 30px rgba(133,164,190,0.18), 0 0 60px rgba(133,164,190,0.08)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", opacity: "0.6" },
          "70%": { transform: "scale(1.4)", opacity: "0" },
          "100%": { transform: "scale(0.95)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        // Branded glow — slow, ambient breath on the primary mark.
        "brand-breath": {
          "0%, 100%": { opacity: "0.45", transform: "scale(1)" },
          "50%": { opacity: "0.75", transform: "scale(1.05)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "pulse-ring": "pulse-ring 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "brand-breath": "brand-breath 4.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

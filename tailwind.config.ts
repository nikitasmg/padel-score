import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Our named design tokens ──────────────────────────────────────
        bg: "#0a0b0a", surface: "#101210", surface2: "#121412", surface3: "#0c0d0c",
        accent: "#c6f24e", ink: "#f4f5f1", ink2: "#eef0ea", ink3: "#cdd1c9",
        muted: "#8c918a", muted2: "#71766f", muted3: "#5c615a", muted4: "#3a3f38",
        live: "#ff5c38", broadcast: "#070807",
        // ── shadcn semantic tokens (CSS variables) ───────────────────────
        // These map to the @layer base CSS variables so shadcn components
        // compile without error. Opacity modifiers (e.g. /50) are NOT
        // supported for CSS-variable colors in Tailwind v3.
        border: "var(--border)",
        input: "var(--input-border)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" },
        secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
        destructive: { DEFAULT: "var(--destructive)" },
        card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
        popover: { DEFAULT: "var(--popover)", foreground: "var(--popover-foreground)" },
      },
      fontFamily: {
        display: ["var(--font-archivo)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        // shadcn expects font-sans for its base reset
        sans: ["var(--font-archivo)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        pulse2: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".3" } },
        ring: { "0%": { boxShadow: "0 0 0 0 rgba(198,242,78,.45)" }, "100%": { boxShadow: "0 0 0 12px rgba(198,242,78,0)" } },
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
      },
      animation: {
        pulse2: "pulse2 1.8s infinite",
        ring: "ring 2s infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;

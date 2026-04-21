import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        ink: "var(--ink)",
        red: {
          DEFAULT: "var(--red)",
          pale: "var(--red-pale)",
        },
        green: {
          DEFAULT: "var(--green)",
          pale: "var(--green-pale)",
        },
        surface: "var(--surface)",
        rule: "var(--rule)",
        muted: "var(--muted)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "monospace"],
      },
      borderRadius: {
        sm: "8px",
        DEFAULT: "14px",
        lg: "20px",
        pill: "999px",
      },
      fontSize: {
        "2xs": "10px",
        xs: "11px",
        sm: "12px",
        base: "13.5px",
        md: "15px",
      },
      letterSpacing: {
        tight: "-0.04em",
        tighter: "-0.03em",
        wide: "0.06em",
        wider: "0.08em",
        widest: "0.1em",
      },
    },
  },
  plugins: [],
};

export default config;

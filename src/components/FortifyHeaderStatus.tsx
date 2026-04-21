"use client";

import { useFortifyLab } from "./FortifyLabContext";

function statusLabel(s: string): { text: string; color: string } {
  switch (s) {
    case "playing":
      return { text: "LIVE", color: "var(--safe)" };
    case "paused":
      return { text: "PAUSED", color: "var(--warn)" };
    case "won":
      return { text: "SECURED", color: "var(--safe)" };
    case "lost":
      return { text: "BREACH", color: "var(--danger)" };
    default:
      return { text: "STANDBY", color: "var(--sec-muted)" };
  }
}

/** Compact live lab strip for the sticky header — stays in sync with the simulator via context. */
export default function FortifyHeaderStatus() {
  const { state } = useFortifyLab();
  const { text, color } = statusLabel(state.status);
  const scorePct = Math.min(100, (state.score / Math.max(1, state.winTarget)) * 100);

  const aria = `${text}: score ${state.score} of ${state.winTarget}. Go to simulator.`;

  return (
    <a
      href="#fortify-sim"
      aria-label={aria}
      className="fortify-header-status no-print fortify-header-status-link"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        maxWidth: "min(100%, 280px)",
        padding: "6px 12px",
        borderRadius: 999,
        border: "1px solid var(--sec-rule)",
        background: "rgba(139,92,246,0.06)",
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(139,92,246,0.35)";
        e.currentTarget.style.boxShadow = "0 0 20px rgba(139,92,246,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--sec-rule)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            boxShadow: state.status === "playing" ? `0 0 10px ${color}` : "none",
            animation: state.status === "playing" ? "fortifyPulse 1.2s ease-in-out infinite" : "none",
          }}
        />
        {text}
      </span>
      <span style={{ width: 1, height: 14, background: "var(--sec-rule)", flexShrink: 0 }} aria-hidden />
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", fontWeight: 700 }}>
        {state.score}
        <span style={{ color: "var(--sec-muted)", fontWeight: 600 }}>/{state.winTarget}</span>
      </span>
      <span
        style={{
          flex: "1 1 72px",
          minWidth: 56,
          height: 4,
          borderRadius: 999,
          background: "var(--sec-rule)",
          overflow: "hidden",
        }}
        title="Progress toward mission score"
      >
        <span
          style={{
            display: "block",
            height: "100%",
            width: `${scorePct}%`,
            borderRadius: 999,
            background: "linear-gradient(90deg, var(--accent), #c4b5fd)",
            transition: "width 0.35s ease",
          }}
        />
      </span>
      <style>{`
        @keyframes fortifyPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </a>
  );
}

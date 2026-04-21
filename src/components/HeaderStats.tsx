"use client";

import { useFortifyLab } from "./FortifyLabContext";

export default function HeaderStats() {
  const { state } = useFortifyLab();
  const load = state.loadPct;
  const breachRisk = Math.min(100, state.breaches * 15 + load * 0.4);
  
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, fontFamily: "var(--font-mono)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 9, color: "var(--sec-muted)", fontWeight: 700, letterSpacing: "0.1em" }}>STATUS</span>
        <span style={{ 
          fontSize: 10, 
          fontWeight: 800, 
          color: state.status === 'playing' ? 'var(--safe)' : 'var(--accent)',
          textTransform: "uppercase"
        }}>
          {state.status}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 9, color: "var(--sec-muted)", fontWeight: 700, letterSpacing: "0.1em" }}>SCORE</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>
          {state.score}<span style={{ color: "var(--sec-muted)", fontWeight: 600 }}>/500</span>
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 9, color: "var(--sec-muted)", fontWeight: 700, letterSpacing: "0.1em" }}>PRESSURE</span>
        <span style={{ 
          fontSize: 11, 
          fontWeight: 800, 
          color: breachRisk > 60 ? "var(--danger)" : breachRisk > 35 ? "var(--warn)" : "var(--safe)",
          fontVariantNumeric: "tabular-nums"
        }}>
          {Math.round(breachRisk)}%
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, width: 80 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 999, background: "var(--sec-rule)", overflow: "hidden" }}>
          <div style={{ 
             height: "100%", 
             width: `${load}%`, 
             background: "var(--accent)", 
             transition: "width 0.25s ease" 
          }} />
        </div>
      </div>
    </div>
  );
}

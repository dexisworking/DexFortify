"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Gamepad2, Sparkles, X } from "lucide-react";

type Step = {
  stage: string;
  headline: string;
  plain: string;
  tip?: string;
  term?: { label: string; explain: string };
};

const STEPS: Step[] = [
  {
    stage: "Level 1 · The idea",
    headline: "You're in charge of a fake network",
    plain:
      "Think of this page as a toy city map. Boxes are computers or routers, and lines are roads. Nothing here talks to the real internet — it's all pretend so you can learn safely.",
    tip: "If words like “firewall” sound scary, don’t worry — we explain them one at a time below.",
  },
  {
    stage: "Level 2 · What you see",
    headline: "Dots are messages on the move",
    plain:
      "Little circles travel along the lines. Green is harmless traffic (like a normal web page load). Red is trouble (like someone trying something sneaky). Your eyes learn the pattern in seconds.",
  },
  {
    stage: "Level 3 · Start",
    headline: "Press play when you're ready",
    plain:
      "Tap DEPLOY to start the flow of traffic. Use PAUSE if you want to read the map or add rules without stress. RESET starts the round over.",
    tip: "Scroll down to the big map if you tapped “Jump to simulator” from another spot.",
  },
  {
    stage: "Level 4 · Stop traffic by address",
    headline: "Block where it came from",
    plain:
      "In the first box, type an address you see in the log (the numbers like 192.168….) and tap DENY. You're telling the gate: “Don't let messages from this address through.” That's the everyday idea behind a firewall — a bouncer list.",
    term: {
      label: "Firewall (simple)",
      explain:
        "In real life, firewalls can do much more. Here, it's just: block this sender address when traffic reaches the gate.",
    },
  },
  {
    stage: "Level 5 · Look inside the message",
    headline: "Catch bad phrases",
    plain:
      "Some red traffic still moves. In the second box, type a short word that appears in bad messages (the log shows examples). Tap BLOCK. You're asking the system to stop any message containing that text — like a spam filter for network traffic.",
    term: {
      label: "IDS / deep inspection (simple)",
      explain:
        "“IDS” usually means systems that watch traffic for suspicious patterns. Here it's a simple keyword match — enough to feel the idea without reading a textbook.",
    },
  },
  {
    stage: "Level 6 · Win & lose",
    headline: "Points, health, and the goal",
    plain:
      "Stopping bad traffic gives you points. Important boxes have a green health bar — if bad traffic reaches them too often, health hits zero and you lose the round. Reach the score at the top to win. Stars at the end reward a clean run.",
  },
  {
    stage: "Level 7 · Play smarter",
    headline: "Clicks, combos, achievements",
    plain:
      "Tap any box or dot on the map to read details. Blocking several threats in a row builds a combo for bigger points. Achievements are little badges for fun — they don't prove job skills, they're nudges to try everything once.",
  },
];

const STORAGE_COLLAPSE = "fortify-instructions-collapsed";

export default function FortifyInstructionsPanel() {
  const [step, setStep] = useState(0);
  const [showTerm, setShowTerm] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const v = localStorage.getItem(STORAGE_COLLAPSE);
      if (v === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setShowTerm(false);
  }, [step]);

  const persistCollapse = useCallback((next: boolean) => {
    setCollapsed(next);
    try {
      localStorage.setItem(STORAGE_COLLAPSE, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const total = STEPS.length;
  const current = STEPS[step]!;
  const pct = ((step + 1) / total) * 100;

  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, total - 1)), [total]);
  const goPrev = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  if (!mounted) {
    return (
      <div
        style={{
          borderRadius: 16,
          border: "1px solid var(--sec-rule)",
          background: "var(--sec-surface)",
          minHeight: 120,
          marginBottom: 8,
        }}
        aria-hidden
      />
    );
  }

  if (collapsed) {
    return (
      <div style={{ marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => persistCollapse(false)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "12px 16px",
            borderRadius: 999,
            border: "1px dashed var(--sec-rule)",
            background: "rgba(139,92,246,0.06)",
            color: "var(--accent)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          <BookOpen size={16} />
          Show how to play (beginner guide)
        </button>
      </div>
    );
  }

  return (
    <div
      className="fortify-instructions-panel no-print"
      style={{
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid var(--sec-rule)",
        boxShadow: "0 0 40px rgba(139,92,246,0.1), 0 8px 32px rgba(0,0,0,0.45)",
        background: "var(--sec-surface)",
        marginBottom: 24,
        display: "flex",
        flexDirection: "column",
        maxHeight: "85vh"
      }}
    >
      <div
        className="fortify-instr-header"
        style={{
          background: "linear-gradient(180deg, rgba(139,92,246,0.12) 0%, #020602 100%)",
          borderBottom: "1px solid var(--sec-rule)",
          padding: "12px 14px 10px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "var(--accent-pale)",
                border: "1px solid var(--sec-rule)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
                flexShrink: 0,
              }}
            >
              <Gamepad2 size={22} />
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                }}
              >
                Beginner briefing
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 800, color: "#fff", lineHeight: 1.25 }}>
                No security background needed
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--sec-muted)" }}>
              Step {step + 1}/{total}
            </span>
            <button
              type="button"
              aria-label="Hide guide"
              onClick={() => persistCollapse(true)}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--sec-rule)",
                borderRadius: 8,
                padding: 6,
                cursor: "pointer",
                color: "var(--sec-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: "rgba(139,92,246,0.15)", overflow: "hidden", marginBottom: 8 }}>
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              borderRadius: 999,
              background: "linear-gradient(90deg, var(--accent), #c4b5fd)",
              transition: "width 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
              boxShadow: "0 0 12px rgba(139,92,246,0.45)",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to step ${i + 1}`}
              aria-current={i === step ? "step" : undefined}
              onClick={() => setStep(i)}
              style={{
                width: i === step ? 24 : 8,
                height: 8,
                borderRadius: 999,
                border: "none",
                padding: 0,
                cursor: "pointer",
                background: i <= step ? "var(--accent)" : "rgba(139,92,246,0.25)",
                opacity: i === step ? 1 : 0.65,
                transition: "all 0.25s ease",
              }}
            />
          ))}
        </div>
      </div>

      <div
        className="fortify-instr-body"
        style={{
          padding: "16px 14px 14px",
          background: "#020602",
          flex: 1,
          overflowY: "auto"
        }}
      >
        <div
          key={step}
          style={{
            animation: "fortifyInstrIn 0.4s ease-out both",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--warn)",
              margin: "0 0 8px",
            }}
          >
            {current.stage}
          </p>
          <h3
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "clamp(1.2rem, 2.8vw, 1.45rem)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: "#fff",
              margin: "0 0 12px",
              lineHeight: 1.2,
            }}
          >
            {current.headline}
          </h3>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              color: "var(--sec-muted)",
              lineHeight: 1.75,
              margin: 0,
            }}
          >
            {current.plain}
          </p>
          {current.tip && (
            <p
              style={{
                marginTop: 14,
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px dashed var(--sec-rule)",
                background: "rgba(139,92,246,0.06)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--accent)",
                lineHeight: 1.6,
              }}
            >
              <Sparkles size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
              {current.tip}
            </p>
          )}
          {current.term && (
            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                onClick={() => setShowTerm((v) => !v)}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  background: "none",
                  border: "1px solid var(--sec-rule)",
                  borderRadius: 8,
                  padding: "8px 14px",
                  cursor: "pointer",
                }}
              >
                {showTerm ? "▲ Hide" : "▼ What's"} “{current.term.label}”?
              </button>
              {showTerm && (
                <p
                  style={{
                    margin: "12px 0 0",
                    padding: 14,
                    borderRadius: 10,
                    background: "rgba(139,92,246,0.08)",
                    border: "1px solid var(--sec-rule)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--sec-ink)",
                    lineHeight: 1.65,
                  }}
                >
                  {current.term.explain}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className="fortify-instr-footer"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 14px 12px",
          background: "#020602",
          borderTop: "1px solid var(--sec-rule)",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={goPrev}
          disabled={step === 0}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid var(--sec-rule)",
            background: step === 0 ? "transparent" : "rgba(139,92,246,0.08)",
            color: step === 0 ? "var(--sec-muted)" : "var(--sec-ink)",
            cursor: step === 0 ? "not-allowed" : "pointer",
            opacity: step === 0 ? 0.45 : 1,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <ChevronLeft size={16} /> Back
        </button>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--sec-muted)" }}>← → keys</span>
        <a
          href="#fortify-sim"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 700,
            color: "var(--accent)",
            textDecoration: "none",
            borderBottom: "1px solid rgba(139,92,246,0.35)",
            paddingBottom: 2,
          }}
        >
          To simulator ↓
        </a>
        <button
          type="button"
          onClick={goNext}
          disabled={step >= total - 1}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            padding: "8px 18px",
            borderRadius: 999,
            border: "none",
            background: step >= total - 1 ? "var(--sec-rule)" : "var(--accent)",
            color: step >= total - 1 ? "var(--sec-muted)" : "#060a06",
            cursor: step >= total - 1 ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: step >= total - 1 ? "none" : "0 0 24px rgba(139,92,246,0.35)",
          }}
        >
          {step >= total - 1 ? "Done ✓" : "Next"}
          {step < total - 1 && <ChevronRight size={16} />}
        </button>
      </div>

      <div style={{ padding: "12px 18px 14px", background: "var(--sec-surface)", borderTop: "1px solid var(--sec-rule)" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--sec-muted)", margin: 0, lineHeight: 1.55 }}>
          This is a learning toy, not real security advice. Nothing leaves your browser.
        </p>
      </div>

      <style>{`
        @keyframes fortifyInstrIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 520px) {
          .fortify-instr-header { padding: 10px 12px !important; }
          .fortify-instr-body { padding: 12px 12px !important; }
          .fortify-instr-footer { 
            padding: 8px 12px !important;
            flex-direction: row !important; /* Keep buttons on one line but smaller */
            justify-content: space-between !important;
          }
          .fortify-instr-footer a { 
            display: none; /* Hide to simulator link on tiny phones to save space */
          }
          .fortify-instructions-panel h3 {
            font-size: 1.15rem !important;
          }
          .fortify-instructions-panel p {
            font-size: 11px !important;
            line-height: 1.6 !important;
          }
        }
      `}</style>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LEVELS } from "@/lib/levels";
import { NetworkNode, Packet, FirewallRule, IDSRule } from "@/lib/types";
import { 
  generateRandomIp, isAllowedByFirewall, checkIDS, getNextEdge 
} from "@/lib/engine";
import {
  comboMultiplier,
  rankFromXp,
  ACHIEVEMENT_COPY,
  type AchievementId,
} from "@/lib/gamify";
import NetworkGraph from "./NetworkGraph";
import TopologyCanvas from "./TopologyCanvas";
import { useNetworkStore } from "@/store/useNetworkStore";
import type { FloatingPop } from "./NetworkGraph";

import FortifyInstructionsPanel from "./FortifyInstructionsPanel";
import { useFortifyLab, type FortifyLabStatus } from "./FortifyLabContext";
import { Shield, ShieldAlert, Terminal, Play, Pause, RefreshCw, ChevronRight, Crosshair, Sparkles, Zap, RotateCcw, Maximize, Layout } from "lucide-react";
import { ReactFlowProvider, useReactFlow } from "reactflow";
import "reactflow/dist/style.css";

const WIN_SCORE = 500;

const FortifyContent = () => {
  const { fitView } = useReactFlow();
  const { state: labState, setLabState } = useFortifyLab();
  const [levelIdx, setLevelIdx] = useState(0);
  const activeLevel = LEVELS[levelIdx]!;
  
  const {
    packets,
    setNodes,
    setEdges,
    setFirewallRules,
    setIdsRules,
    firewallRules,
    idsRules,
    isRunning,
    setGameState,
    addPacket,
    addLog,
    score,
    blockedCount,
    leakedCount,
    incrementScore,
    incrementBlocked,
    incrementLeaked,
    incrementXp,
    setCombo,
    combo,
    selectedNodeId,
    selectedPacketId,
    setSelectedNode,
    setSelectedPacket,
    resetGame,
    nodes,
    edges,
    logs
  } = useNetworkStore();

  const [appGameState, setAppGameState] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');

  const tryUnlock = useCallback((key: AchievementId) => {
    if (unlockedAchRef.current.has(key)) return;
    unlockedAchRef.current.add(key);
    const toastId = `${key}-${Date.now()}`;
    setAchToasts((t) => [...t.slice(-4), { id: toastId, key }]);
    window.setTimeout(() => {
      setAchToasts((t) => t.filter((x) => x.id !== toastId));
    }, 4200);
  }, []);

  const ipInputRef = useRef<HTMLInputElement>(null);
  const patternInputRef = useRef<HTMLInputElement>(null);

  const [xp, setXp] = useState(0);
  const unlockedAchRef = useRef<Set<string>>(new Set());
  const [achToasts, setAchToasts] = useState<{ id: string; key: AchievementId }[]>([]);

  useEffect(() => {
    setNodes(activeLevel.nodes);
    setEdges(activeLevel.edges);
  }, [levelIdx, setNodes, setEdges, activeLevel]);

  const [firewallRulesLocal, setFirewallRulesLocal] = useState<FirewallRule[]>([]);
  const [idsRulesLocal, setIdsRulesLocal] = useState<IDSRule[]>([]);

  useEffect(() => {
    setFirewallRules(firewallRulesLocal);
  }, [firewallRulesLocal, setFirewallRules]);

  useEffect(() => {
    setIdsRules(idsRulesLocal);
  }, [idsRulesLocal, setIdsRules]);

  useEffect(() => {
    const loadPct = Math.min(100, Math.floor(packets.length * 2));
    let status: FortifyLabStatus = "idle";
    if (appGameState === "won") status = "won";
    else if (appGameState === "lost") status = "lost";
    else if (appGameState === "playing" && !isRunning) status = "paused";
    else if (appGameState === "playing" && isRunning) status = "playing";
    else status = "idle";

    setLabState({
      score,
      blocked: blockedCount,
      breaches: leakedCount,
      loadPct,
      status,
      levelName: activeLevel.title,
      winTarget: WIN_SCORE,
    });
  }, [
    score,
    blockedCount,
    leakedCount,
    isRunning,
    appGameState,
    activeLevel.title,
    setLabState,
    packets.length,
  ]);

  const rank = rankFromXp(xp);
  const selectedPacket = useMemo(
    () => packets.find((p) => p.id === selectedPacketId) ?? null,
    [packets, selectedPacketId]
  );
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  useEffect(() => {
    if (appGameState !== 'playing') return;

    const criticalNode = nodes.find(n => n.type === 'database' || n.type === 'internal');
    if (criticalNode && criticalNode.health <= 0) {
      setAppGameState('lost');
      setGameState(false);
    }

    if (score >= WIN_SCORE) {
      setAppGameState('won');
      setGameState(false);
      
      setLabState(prev => {
        const nextIds = prev.completedLevelIds.includes(activeLevel.id) 
          ? prev.completedLevelIds 
          : [...prev.completedLevelIds, activeLevel.id];
        
        const allDone = LEVELS.every(l => nextIds.includes(l.id));
        return { 
          ...prev, 
          completedLevelIds: nextIds,
          totalGraduated: allDone
        };
      });
    }
  }, [nodes, score, appGameState, activeLevel.id, setLabState, setGameState]);

  const spawnPacket = useCallback(() => {
    const sourceNode = activeLevel.nodes.find(n => n.type === 'internet');
    if (!sourceNode) return;

    const firstEdge = activeLevel.edges.find(e => e.from === sourceNode.id);
    if (!firstEdge) return;

    const isMalicious = Math.random() < (activeLevel.waves[0].maliciousProbability || 0.2);
    const patterns = activeLevel.waves[0].patterns;
    const payload = isMalicious ? patterns[Math.floor(Math.random() * patterns.length)] : "GET /index.html";

    const newPacket: Packet = {
      id: Math.random().toString(36).substr(2, 9),
      sourceIp: generateRandomIp(),
      payload,
      isMalicious,
      status: "moving",
      edgeId: firstEdge.id,
      progress: 0,
      source: firstEdge.from,
      target: firstEdge.to,
      speed: 0.008 + (Math.random() * 0.004)
    };

    addPacket(newPacket);
  }, [activeLevel, addPacket]);

  useEffect(() => {
    if (!isRunning || appGameState !== "playing") return;

    const interval = setInterval(() => {
      spawnPacket();
    }, 1000 / activeLevel.spawnRate);

    return () => clearInterval(interval);
  }, [isRunning, appGameState, spawnPacket, activeLevel.spawnRate]);

  const handleDeploy = useCallback(() => {
    if (appGameState === "idle") {
      setAppGameState("playing");
      setGameState(true);
      addLog("Network defenses active. Monitoring traffic...", "info");
      tryUnlock("first_deploy");
    } else {
      setGameState(!isRunning);
    }
  }, [appGameState, isRunning, setGameState, addLog, tryUnlock]);

  const resetLevel = useCallback(() => {
    resetGame();
    setNodes(activeLevel.nodes);
    setEdges(activeLevel.edges);
    setAppGameState('idle');
    addLog("System reset. Ready for deployment.", "info");
  }, [activeLevel, resetGame, setNodes, setEdges, addLog]);

  useEffect(() => {
    resetLevel();
  }, [levelIdx, resetLevel]);

  return (
    <div className="fortify-root" style={{ background: "var(--sec-bg)", color: "var(--sec-ink)", minHeight: "100vh" }}>
      <div className="fortify-page" style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1600, margin: "0 auto", padding: "0 24px" }}>
        {activeLevel.objective && (
          <div className="fortify-objective-bar" style={{
            background: "rgba(239, 68, 68, 0.15)",
            borderBottom: "1px solid rgba(239, 68, 68, 0.3)",
            padding: "8px 24px",
            margin: "0 -24px 8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12
          }}>
            <ShieldAlert size={14} color="var(--danger)" />
            <span style={{ 
              fontSize: 10, 
              fontWeight: 900, 
              color: "#fff", 
              textTransform: "uppercase", 
              letterSpacing: "0.2em",
              fontFamily: "var(--font-mono)"
            }}>
              MISSION OBJECTIVE: {activeLevel.objective.toUpperCase()}
            </span>
          </div>
        )}

        <section className="fortify-hero">
        <div style={{ textAlign: "left" }}>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--accent)",
              textTransform: "uppercase",
              letterSpacing: "0.4em",
              marginBottom: 16,
              fontWeight: 800
            }}
          >
            NETWORK DEFENSE LAB
          </p>
          <h2
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "clamp(3rem, 10vw, 6.5rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: "#ffffff",
              lineHeight: 0.85,
              marginBottom: 24,
            }}
          >
            Dex<span style={{ color: "var(--accent)" }}>Fortify.</span>
          </h2>
          <h1
            style={{
              fontSize: "clamp(1.4rem, 4vw, 2.4rem)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--sec-ink)",
              lineHeight: 1.1,
              marginBottom: 24,
              maxWidth: 500,
            }}
          >
            Network defense <span style={{ color: "#fff" }}>simulator</span>
            <br />
            <span style={{ opacity: 0.6 }}>in the browser.</span>
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--sec-muted)",
              maxWidth: 580,
              lineHeight: 1.8,
              fontFamily: "var(--font-mono)",
              marginBottom: 40,
            }}
          >
            Configure firewalls and IDS rules in real time to defend your topology from simulated threats — all client-side, no backend traffic.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 220 }}>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 12, 
              padding: "10px 16px", 
              borderRadius: 99, 
              background: "rgba(139,92,246,0.04)", 
              border: "1px solid var(--sec-rule)" 
            }}>
               <span
                aria-hidden="true"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: appGameState === "playing" ? "var(--safe)" : "var(--sec-muted)",
                  boxShadow: appGameState === "playing" ? "0 0 10px var(--safe)" : "none",
                }}
              ></span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, color: "var(--sec-muted)", letterSpacing: "0.1em" }}>
                {appGameState.toUpperCase()}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", fontWeight: 800, marginLeft: "auto" }}>
                {score}<span style={{ opacity: 0.4 }}>/500</span>
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
              <div style={{ 
                height: "100%", 
                width: `${Math.min(100, (score / 500) * 100)}%`, 
                background: "var(--accent)",
                transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
              }} />
            </div>
          </div>
        </div>

        <aside style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.02), rgba(0,0,0,0.4))",
          border: "1px solid var(--sec-rule)",
          borderRadius: 20,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          minHeight: 380
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--accent)", letterSpacing: "0.15em", fontFamily: "var(--font-mono)" }}>
              PERIMETER STATUS
            </span>
            <span style={{ fontSize: 10, color: "var(--sec-muted)", fontFamily: "var(--font-mono)" }}>
              {activeLevel.title}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 10 }}>
            <div>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: "var(--sec-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                THREAT PRESSURE
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 44, fontWeight: 900, color: "var(--safe)", lineHeight: 1 }}>
                {Math.min(100, Math.floor((packets.filter(p => p.isMalicious).length / Math.max(1, packets.length)) * 100))}%
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: "var(--sec-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Blocked
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 900, color: "var(--safe)", lineHeight: 1 }}>
                {blockedCount}
              </p>
            </div>
          </div>

          <div style={{ marginTop: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: "var(--sec-muted)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>Traffic load</span>
              <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 800, fontFamily: "var(--font-mono)" }}>
                {Math.min(100, Math.floor(packets.length * 2))}%
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
              <div style={{ 
                height: "100%", 
                width: `${Math.min(100, Math.floor(packets.length * 2))}%`, 
                background: "linear-gradient(90deg, var(--accent), #c4b5fd)",
                transition: "width 0.3s ease"
              }} />
            </div>
          </div>

          <p style={{ margin: 0, fontSize: 12, color: "var(--sec-muted)", lineHeight: 1.6, fontFamily: "var(--font-mono)", opacity: 0.8 }}>
            Deploy the simulation to generate traffic. Add DENY and IDS rules before threats reach critical nodes.
          </p>

          <a 
            href="#fortify-sim"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 10,
              fontWeight: 800,
              color: "var(--accent)",
              textDecoration: "none",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              fontFamily: "var(--font-mono)",
              borderBottom: "1px solid rgba(139,92,246,0.3)",
              width: "fit-content",
              paddingBottom: 4,
              marginTop: 10
            }}
          >
            JUMP TO SIMULATOR ↓
          </a>
        </aside>
      </section>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {appGameState === "won" && "Mission secured."}
        {appGameState === "lost" && "Critical breach — reset to try again."}
      </div>

      <FortifyInstructionsPanel />

      <div id="fortify-sim" className="fortify-main-layout">
        <div className="fortify-primary-col">
          <div className="fortify-simulator-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{activeLevel.title}</h2>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--sec-muted)", fontFamily: "var(--font-mono)" }}>
                {activeLevel.objective}
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
              <button 
                type="button"
                onClick={handleDeploy}
                style={{
                  padding: "10px 24px",
                  borderRadius: "8px",
                  background: appGameState === "playing" && isRunning ? "#ef4444" : "var(--accent)",
                  color: "#fff",
                  border: "none",
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.05em",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  transition: "all 0.2s ease"
                }}
              >
                {appGameState === "playing" && isRunning ? (
                  <>
                    <Pause size={18} /> PAUSE DEFENSES
                  </>
                ) : (
                  <>
                    <Play size={18} /> {appGameState === "idle" ? "DEPLOY SYSTEM" : "RESUME DEFENSES"}
                  </>
                )}
              </button>
              <button 
                type="button"
                onClick={resetLevel}
                title="Reset level"
                aria-label="Reset level"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                  color: "var(--sec-muted)",
                }}
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          <div
            className="fortify-hud"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 24px",
              background: "rgba(6,10,6,0.96)",
              borderRadius: 16,
              border: "1px solid var(--sec-rule)",
              marginBottom: 20,
              boxShadow: "0 10px 30px rgba(0,0,0,0.4)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Zap size={20} color="var(--warn)" />
              <div>
                <div style={{ fontSize: 9, color: "var(--sec-muted)", letterSpacing: "0.14em", fontWeight: 800 }}>COMBO CHAIN</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "var(--warn)", fontFamily: "var(--font-mono)", lineHeight: 1.1 }}>
                  ×{comboMultiplier(combo).toFixed(2)}
                  <span style={{ fontSize: 11, color: "var(--sec-muted)", marginLeft: 12, opacity: 0.6 }}>{combo}/10</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 0.8 }}>
              <Sparkles size={20} color="var(--accent)" />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: "#fff", fontWeight: 900, letterSpacing: "0.1em" }}>
                    RANK · {rank.title.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 9, color: "var(--accent)", fontFamily: "var(--font-mono)", fontWeight: 800 }}>XP {xp}</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.05)", border: "1px solid var(--sec-rule)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${(xp % 200) / 2}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: "var(--accent)",
                      boxShadow: "0 0 15px var(--accent)",
                      transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="fortify-stats-row" style={{ marginBottom: 24 }}>
            {[
              { label: "DEFENSE SCORE", value: score, color: "var(--accent)" },
              { label: "BLOCKED", value: blockedCount, color: "var(--safe)" },
              { label: "BREACHES", value: leakedCount, color: "var(--danger)" },
              { label: "SYSTEM LOAD", value: `${Math.min(100, Math.floor(packets.length * 2))}%`, color: "var(--sec-ink)" },
            ].map(stat => (
              <div key={stat.label} style={{ 
                background: "var(--sec-surface)", 
                padding: "16px", 
                borderRadius: 12, 
                border: "1px solid var(--sec-rule)",
                textAlign: "center"
              }}>
                <div style={{ fontSize: 9, color: "var(--sec-muted)", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>{stat.label}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="canvas-lighting-wrap" style={{ position: "relative", height: 500 }}>
            <div style={{ height: "100%", width: "100%", opacity: appGameState === 'playing' ? 1 : 0.4, transition: 'opacity 1s ease' }}>
              <TopologyCanvas />
            </div>
          </div>
            
            {appGameState === 'won' && !labState.totalGraduated && (
              <div style={{
                position: "absolute",
                inset: 0,
                background: "rgba(6, 10, 6, 0.88)",
                backdropFilter: "blur(8px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
                borderRadius: 16
              }}>
                <h2 style={{ 
                  fontSize: 48, 
                  fontWeight: 900, 
                  color: "var(--safe)",
                  margin: 0,
                  letterSpacing: "-0.05em"
                }}>
                  MISSION SECURED
                </h2>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--sec-muted)", marginTop: 8 }}>
                  All threats neutralized. System integrity maintained.
                </p>
                <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                  <button 
                    type="button"
                    onClick={resetLevel}
                    style={{
                      padding: "12px 24px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.05)",
                      color: "white",
                      border: "1px solid var(--sec-rule)",
                      fontWeight: 800,
                      cursor: "pointer"
                    }}
                  >
                    REPLAY
                  </button>
                  {levelIdx < LEVELS.length - 1 ? (
                    <button 
                      type="button"
                      onClick={() => {
                        setLevelIdx(levelIdx + 1);
                      }}
                      style={{
                        padding: "12px 24px",
                        borderRadius: 999,
                        background: "var(--accent)",
                        color: "#060a06",
                        border: "none",
                        fontWeight: 800,
                        cursor: "pointer"
                      }}
                    >
                      NEXT MISSION
                    </button>
                  ) : (
                    <div style={{ color: "var(--warn)", fontWeight: 800, fontSize: 12 }}>
                      ALL ROUNDS COMPLETE
                    </div>
                  )}
                </div>
              </div>
            )}

            {labState.totalGraduated && (
              <div style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(45deg, rgba(139,92,246,0.9), rgba(6,10,6,0.95))",
                backdropFilter: "blur(12px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 110,
                borderRadius: 16,
                textAlign: "center",
                padding: 40
              }}>
                <Sparkles size={64} color="var(--warn)" style={{ marginBottom: 20 }} />
                <h2 style={{ fontSize: 56, fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-0.05em", lineHeight: 1 }}>
                  SUITE SECURED
                </h2>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 16, color: "var(--accent)", marginTop: 12, fontWeight: 700 }}>
                  GRADUATION ACHIEVED
                </p>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 20, maxWidth: 400, lineHeight: 1.6 }}>
                  You have successfully implemented edge defenses and content filtering across the entire Dex Security Suite infrastructure.
                </p>
                <button 
                  type="button"
                  onClick={() => setLabState({ totalGraduated: false, completedLevelIds: [] })}
                  style={{
                    marginTop: 32,
                    padding: "14px 32px",
                    borderRadius: 999,
                    background: "#fff",
                    color: "#000",
                    border: "none",
                    fontWeight: 900,
                    cursor: "pointer",
                    boxShadow: "0 0 30px rgba(255,255,255,0.3)"
                  }}
                >
                  RESTART CURRICULUM
                </button>
              </div>
            )}

            {appGameState === 'lost' && (
              <div style={{
                position: "absolute",
                inset: 0,
                background: "rgba(6, 10, 6, 0.88)",
                backdropFilter: "blur(8px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
                borderRadius: 16
              }}>
                <h2 style={{ 
                  fontSize: 48, 
                  fontWeight: 900, 
                  color: "var(--danger)",
                  margin: 0,
                  letterSpacing: "-0.05em"
                }}>
                  CRITICAL BREACH
                </h2>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--sec-muted)", marginTop: 8 }}>
                  Defenses bypassed. Data exfiltration detected.
                </p>
                <button 
                  type="button"
                  onClick={resetLevel}
                  style={{
                    marginTop: 24,
                    padding: "12px 24px",
                    borderRadius: 999,
                    background: "var(--accent)",
                    color: "#060a06",
                    border: "none",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  TRY AGAIN
                </button>
              </div>
            )}

          <div className="fortify-mobile-controls" style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            zIndex: 1000,
            pointerEvents: 'none'
          }}>
            {[
              { id: 'fit', icon: Maximize, action: () => fitView({ duration: 800, padding: 0.2 }), label: 'FIT' },
              { id: 'play', icon: isRunning ? Pause : Play, action: handleDeploy, label: isRunning ? 'STOP' : 'RUN' },
              { id: 'send', icon: Zap, action: spawnPacket, label: 'SEND' }
            ].map((btn) => (
              <button 
                key={btn.id}
                onClick={btn.action}
                className="hover:scale-110 active:scale-95 transition-all"
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'rgba(139, 92, 246, 0.95)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 15px rgba(139, 92, 246, 0.4)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  pointerEvents: 'auto'
                }}
              >
                <btn.icon size={20} />
                <span style={{ fontSize: '8px', fontWeight: 900, marginTop: '2px' }}>{btn.label}</span>
              </button>
            ))}
          </div>
        </div>


        <div className="fortify-support-col" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="fortify-rule-card" style={{
            background: "rgba(6,10,6,0.95)",
            borderRadius: 16,
            border: "1px solid var(--sec-rule)",
            overflow: "hidden",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            flex: 1.4
          }}>
            <div className="fortify-rule-header" style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--sec-rule)",
              background: "rgba(139,92,246,0.03)",
              display: "flex",
              alignItems: "center",
              gap: 10
            }}>
              <Shield size={16} color="var(--accent)" />
              <span style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#fff" }}>Defense Configuration</span>
            </div>
            <div className="fortify-rule-content" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <p style={{ fontSize: 10, color: "var(--accent)", marginBottom: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>L3/L4 Firewall (IP Filtering)</p>
                <div className="fortify-rule-group" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <input 
                    ref={ipInputRef}
                    placeholder="DENY_SOURCE_IP..."
                    style={{
                      flex: 1,
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid var(--sec-rule)",
                      padding: "10px 14px",
                      borderRadius: 8,
                      color: "white",
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                      outline: "none",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--sec-rule)"}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const ip = ipInputRef.current?.value;
                        if (ip) {
                          setFirewallRules([...firewallRules, { id: Math.random().toString(), type: 'DENY', sourceIp: ip }]);
                          ipInputRef.current!.value = '';
                          addLog(`Firewall: Added DENY rule for ${ip}`);
                        }
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const ip = ipInputRef.current?.value;
                      if (ip) {
                        setFirewallRules([...firewallRules, { id: Math.random().toString(), type: 'DENY', sourceIp: ip }]);
                        ipInputRef.current!.value = '';
                        addLog(`Firewall: Added DENY rule for ${ip}`);
                      }
                    }}
                    style={{
                      background: "var(--accent)",
                      color: "#060a06",
                      border: "none",
                      padding: "0 16px",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontWeight: 900,
                      fontSize: 11,
                      textTransform: "uppercase"
                    }}
                  >
                    Set Rule
                  </button>
                </div>

                <div className="firewall-rules-container" style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 160, overflowY: "auto", paddingRight: 4 }}>
                  <AnimatePresence>
                    {firewallRules.map(rule => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        key={rule.id} 
                        style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "center", 
                          padding: "8px 12px", 
                          background: "rgba(239, 68, 68, 0.04)", 
                          border: "1px solid rgba(239, 68, 68, 0.12)", 
                          borderRadius: 8 
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--danger)" }} />
                          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#fff", fontWeight: 600 }}>{rule.sourceIp}</span>
                          <span style={{ fontSize: 8, color: "var(--danger)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>[DENY]</span>
                        </div>
                        <button 
                          onClick={() => setFirewallRules(firewallRules.filter(r => r.id !== rule.id))}
                          style={{ background: "none", border: "none", color: "var(--sec-muted)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center" }}
                        >
                          ×
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {firewallRules.length === 0 && (
                    <div style={{ fontSize: 10, color: "var(--sec-muted)", textAlign: "center", padding: "12px", border: "1px dashed var(--sec-rule)", borderRadius: 8 }}>
                      No active IP blocks
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p style={{ fontSize: 10, color: "var(--accent)", marginBottom: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>IDS/IPS (Packet Inspection)</p>
                <div className="fortify-rule-group" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input 
                    ref={patternInputRef}
                    id="pattern-input"
                    placeholder="BLOCK_PAYLOAD_PATTERN..." 
                    autoComplete="off"
                    style={{ 
                      flex: 1, 
                      background: "rgba(0,0,0,0.4)", 
                      border: "1px solid var(--sec-rule)", 
                      borderRadius: 8, 
                      padding: "10px 14px", 
                      fontSize: 12, 
                      color: "white",
                      fontFamily: "var(--font-mono)",
                      outline: "none"
                    }} 
                    onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--sec-rule)"}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const input = patternInputRef.current;
                      if (input?.value?.trim()) {
                        const v = input.value.trim();
                        setIdsRules([...idsRules, { id: Math.random().toString(), pattern: v, action: "BLOCK" }]);
                        addLog(`IDS Filter enabled: "${v}"`);
                        input.value = "";
                      }
                    }}
                    style={{ background: "var(--accent)", border: "none", borderRadius: 8, color: "#060a06", padding: "0 16px", cursor: "pointer", fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}
                  >
                    Filter
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 160, overflowY: "auto", paddingRight: 4 }}>
                  <AnimatePresence>
                    {idsRules.map(rule => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        key={rule.id} 
                        style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "center", 
                          padding: "8px 12px", 
                          background: "rgba(139,92,246,0.04)", 
                          border: "1px solid rgba(139,92,246,0.12)", 
                          borderRadius: 8 
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <ShieldAlert size={12} color="var(--accent)" />
                          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#fff", fontWeight: 600 }}>&quot;{rule.pattern}&quot;</span>
                          <span style={{ fontSize: 8, color: "var(--accent)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>[BLOCK]</span>
                        </div>
                        <button 
                          onClick={() => setIdsRules(idsRules.filter(r => r.id !== rule.id))}
                          style={{ background: "none", border: "none", color: "var(--sec-muted)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center" }}
                        >
                          ×
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {idsRules.length === 0 && (
                    <div style={{ fontSize: 10, color: "var(--sec-muted)", textAlign: "center", padding: "12px", border: "1px dashed var(--sec-rule)", borderRadius: 8 }}>
                      No active content filters
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        <div style={{ 
          height: 401, 
          background: "rgba(6,10,6,0.98)", 
          borderRadius: 16, 
          border: "1px solid var(--sec-rule)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)"
        }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--sec-rule)", background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 8 }}>
            <Terminal size={12} color="var(--accent)" />
            <span style={{ fontSize: 10, fontWeight: 700 }}>LIVE_TRAFFIC_LOG</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px", fontFamily: "var(--font-mono)", fontSize: 10 }}>
            {logs.length === 0 && <div style={{ color: "var(--sec-muted)" }}>Waiting for traffic...</div>}
            {logs.map((log, i) => (
              <div key={i} style={{ 
                marginBottom: 4, 
                color: log.type === 'error' ? 'var(--danger)' : log.type === 'warn' ? 'var(--warn)' : 'var(--sec-muted)',
                opacity: 1 - (i * 0.05)
              }}>
                <span style={{ marginRight: 8 }}>[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                {log.msg}
              </div>
            ))}
          </div>
          </div>
        </div>

        <div className="fortify-intel-section" style={{ minHeight: 120 }}>
          <AnimatePresence mode="wait">
            {(selectedNode || selectedPacket) ? (
              <motion.div
                key={selectedNode ? `node-${selectedNode.id}` : `packet-${selectedPacketId}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{
                  marginTop: 12,
                  padding: "16px 20px",
                  borderRadius: 16,
                  border: "1px solid var(--accent)",
                  background: "rgba(2, 6, 2, 0.95)",
                  backdropFilter: "blur(12px)",
                  fontFamily: "var(--font-mono)",
                  color: "var(--sec-ink)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  boxShadow: "0 10px 40px rgba(0,0,0,0.5), 0 0 20px rgba(139,92,246,0.1)",
                  zIndex: 200,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Crosshair size={16} color="var(--accent)" />
                  <div>
                    <div style={{ fontSize: 9, color: "var(--sec-muted)", letterSpacing: "0.2em", fontWeight: 700 }}>TACTICAL_INTEL_REVEAL</div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: "#fff" }}>
                      {selectedNode ? selectedNode.label : `STREAM: ${selectedPacketId?.toUpperCase().slice(0,8)}`}
                    </div>
                  </div>
                  <button 
                    onClick={() => { setSelectedNode(null); setSelectedPacket(null); }}
                    style={{ marginLeft: "auto", background: "rgba(255,255,255,0.05)", border: "none", padding: 6, borderRadius: 6, color: "var(--sec-muted)", cursor: "pointer" }}
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
                  {selectedNode && (
                    <>
                      <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid var(--sec-rule)" }}>
                        <div style={{ fontSize: 8, color: "var(--sec-muted)", marginBottom: 2 }}>NODE_ID</div>
                        <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700 }}>{selectedNode.id}</div>
                      </div>
                      <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid var(--sec-rule)" }}>
                        <div style={{ fontSize: 8, color: "var(--sec-muted)", marginBottom: 2 }}>CORE_SYSTEM</div>
                        <div style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>{selectedNode.type.toUpperCase()}</div>
                      </div>
                      <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid var(--sec-rule)" }}>
                        <div style={{ fontSize: 8, color: "var(--sec-muted)", marginBottom: 2 }}>INTEGRITY</div>
                        <div style={{ fontSize: 10, color: selectedNode.health > 50 ? "var(--safe)" : "var(--danger)", fontWeight: 700 }}>{selectedNode.health}%</div>
                      </div>
                      <div style={{ gridColumn: "1 / -1", fontSize: 10, color: "var(--sec-muted)", opacity: 0.8, lineHeight: 1.4 }}>
                         {selectedNode.type === "firewall" && "L3/L4 inspection active. Evaluating packets against configured DENY table."}
                         {selectedNode.type === "database" && "Target node. Integrity breach detected upon impact of malicious payloads."}
                         {!["firewall", "database"].includes(selectedNode.type) && "Infrastructure node transmitting traffic within network segments."}
                      </div>
                    </>
                  )}
                  {selectedPacket && (
                    <>
                      <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid var(--sec-rule)" }}>
                        <div style={{ fontSize: 8, color: "var(--sec-muted)", marginBottom: 2 }}>SOURCE_IP</div>
                        <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700 }}>{selectedPacket.sourceIp}</div>
                      </div>
                      <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid var(--sec-rule)" }}>
                        <div style={{ fontSize: 8, color: "var(--sec-muted)", marginBottom: 2 }}>THREAT_SCAN</div>
                        <div style={{ fontSize: 10, color: selectedPacket.isMalicious ? "var(--danger)" : "var(--safe)", fontWeight: 700 }}>
                          {selectedPacket.isMalicious ? "MALICIOUS" : "SAFE_TRAFFIC"}
                        </div>
                      </div>
                      <div style={{ gridColumn: "1 / -1", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid var(--sec-rule)" }}>
                        <div style={{ fontSize: 8, color: "var(--sec-muted)", marginBottom: 2 }}>PAYLOAD_STREAM</div>
                        <div style={{ fontSize: 10, color: "#fff", fontWeight: 700, wordBreak: "break-all" }}>{selectedPacket.payload}</div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            ) : (
              <div style={{ 
                marginTop: 12, 
                height: 120, 
                display: "flex", 
                flexDirection: "column",
                alignItems: "center", 
                justifyContent: "center", 
                borderRadius: 16, 
                border: "1px dashed var(--sec-rule)",
                color: "var(--sec-muted)",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                opacity: 0.5,
                width: "100%"
              }}>
                <Crosshair size={24} style={{ marginBottom: 12, opacity: 0.3 }} />
                SELECT A NODE OR PACKET FOR TACTICAL ANALYSIS
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

        <div className="fortify-mission-selection" style={{ 
          background: "rgba(6,10,6,0.95)", 
          padding: "24px", 
          borderRadius: 16, 
          border: "1px solid var(--sec-rule)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          marginTop: 48,
          marginBottom: 32,
          width: "100%"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Layout size={16} color="var(--accent)" />
            <p style={{ margin: 0, fontSize: 11, fontWeight: 900, color: "#fff", textTransform: "uppercase", letterSpacing: "0.15em" }}>MISSION COMMAND ARCHIVE</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, width: "100%" }}>
            {LEVELS.map((l, i) => {
              const isCompleted = labState.completedLevelIds.includes(l.id);
              const isLocked = !(i === 0 || (labState.completedLevelIds && labState.completedLevelIds.includes(LEVELS[i-1]?.id)));
              return (
                <button
                  type="button"
                  key={l.id}
                  onClick={() => { setLevelIdx(i); }}
                  style={{
                    padding: "16px",
                    borderRadius: 12,
                    background: levelIdx === i ? "rgba(139, 92, 246, 0.1)" : "rgba(255,255,255,0.02)",
                    border: levelIdx === i ? "1px solid var(--accent)" : "1px solid var(--sec-rule)",
                    color: levelIdx === i ? "var(--accent)" : "var(--sec-muted)",
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    cursor: isLocked ? "not-allowed" : "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "all 0.2s",
                    opacity: isLocked ? 0.3 : 1
                  }}
                  disabled={isLocked}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ opacity: 0.4, fontSize: 10 }}>0{i+1}</span>
                    {l.title.toUpperCase()}
                    {isCompleted && <Sparkles size={14} color="var(--warn)" />}
                  </span>
                  <ChevronRight size={16} />
                </button>
              );
            })}
          </div>
          
          <button
            type="button"
            onClick={() => {
              const allIds = LEVELS.map(l => l.id);
              setLabState({ ...labState, completedLevelIds: allIds, totalGraduated: true });
              addLog("DEBUG: Training curriculum bypassed. Graduation triggered.", "info");
            }}
            style={{
              marginTop: 12,
              padding: "10px",
              borderRadius: 8,
              border: "1px dashed var(--sec-rule)",
              background: "none",
              color: "var(--sec-muted)",
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
              opacity: 0.4,
              width: "fit-content"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.4")}
          >
            FORCE GRADUATION (DEBUG)
          </button>
        </div>

      <div
        aria-live="polite"
        className="fortify-toast-stack"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: 300,
          pointerEvents: "none",
        }}
      >
        {achToasts.map((t) => (
          <div
            key={t.id}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid var(--accent)",
              background: "rgba(6,10,6,0.96)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
            }}
          >
            <div style={{ fontSize: 9, fontWeight: 800, color: "var(--accent)", letterSpacing: "0.18em" }}>UNLOCKED</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#fff", marginTop: 4, fontFamily: "var(--font-inter), sans-serif" }}>
              {ACHIEVEMENT_COPY[t.key].title}
            </div>
            <div style={{ fontSize: 11, color: "var(--sec-muted)", marginTop: 4, lineHeight: 1.45 }}>{ACHIEVEMENT_COPY[t.key].desc}</div>
          </div>
        ))}
      </div>

      <style>{`
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        .fortify-hero {
          width: 100%;
          padding: 80px 0 40px;
          display: grid;
          grid-template-columns: 1fr 420px;
          gap: 40px;
          align-items: start;
        }
        .fortify-simulator-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .fortify-hud {
          margin-bottom: 24px;
        }
        .fortify-main-layout {
          display: grid;
          grid-template-columns: 1fr 420px;
          grid-template-rows: auto auto;
          gap: 32px;
          align-items: start;
        }
        .fortify-intel-section {
          grid-column: 1 / -1;
          width: 100%;
          margin-top: -12px; /* Pull closer to components above */
        }
        .fortify-primary-col {
          grid-column: 1;
        }
        .fortify-support-col {
          grid-column: 2;
        }
        .canvas-lighting-wrap {
          border: 1px solid rgba(168, 85, 247, 0.4);
          border-radius: 16px;
          box-shadow: 0 0 30px rgba(168, 85, 247, 0.15), inset 0 0 20px rgba(168, 85, 247, 0.05);
          background: rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(8px);
          overflow: hidden;
        }
        .fortify-stats-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 768px) {
          .fortify-stats-row {
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
          }
        }
        .firewall-rules-container {
          max-height: 200px;
          overflow-y: auto;
        }
        @media (max-width: 1100px) {
          .fortify-hero, .fortify-main-layout {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .fortify-hero {
            padding: 40px 0 20px;
          }
          .fortify-stats-row {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
        }

        @media (max-width: 900px) {
          .fortify-hero h2 {
            font-size: clamp(2.8rem, 12vw, 4rem) !important;
            margin-bottom: 12px !important;
          }
          .fortify-main-layout {
            display: flex !important;
            flex-direction: column !important;
            gap: 20px !important;
          }
          .fortify-primary-col { order: 1 !important; }
          .fortify-intel-section { order: 2 !important; }
          .fortify-support-col { order: 3 !important; }
          
          .fortify-support-col {
            position: relative !important;
            top: 0 !important;
            gap: 16px !important;
          }
        }

        @media (max-width: 640px) {
          .fortify-page {
            padding: 0 16px !important;
            gap: 16px !important;
          }
          .fortify-hero {
            padding-top: 24px !important;
            padding-bottom: 16px !important;
          }
          .fortify-hero h1 {
            font-size: 1.4rem !important;
          }
          .fortify-stats-row {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
          }
          .canvas-lighting-wrap {
            height: 380px !important;
          }
          .fortify-rule-card, .fortify-intel-section {
            border-radius: 12px !important;
          }
          .fortify-rule-content, .fortify-intel-section > div {
            padding: 14px !important;
          }
          .fortify-rule-group input, .fortify-rule-group button {
            font-size: 16px !important; /* Touch/iOS Zoom optimization */
          }
          #report {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .fortify-toast-stack {
            left: 12px !important;
            right: 12px !important;
            bottom: 12px !important;
          }
          .fortify-mobile-controls {
            display: flex !important;
            transform: scale(0.7) !important;
            bottom: 8px !important;
            right: 8px !important;
            opacity: 0.9;
          }
        }
        @keyframes fortifyToastIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fortify-toast-stack > div {
          animation: fortifyToastIn 0.35s ease;
        }
      `}</style>
    </div>
  </div>
);
};

export default function FortifyClient() {
  return (
    <ReactFlowProvider>
      <FortifyContent />
    </ReactFlowProvider>
  );
}

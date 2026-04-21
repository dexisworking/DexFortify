"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { NetworkNode, NetworkEdge, Packet } from "@/lib/types";
import {
  Globe,
  Shield,
  Server,
  Database,
  Monitor,
  Activity,
  Plus,
  Minus,
  Maximize,
  RotateCcw,
  Play,
  Pause,
} from "lucide-react";

export const FORTIFY_CANVAS = { w: 800, h: 600 };

export type FloatingPop = { id: string; x: number; y: number; text: string; tone: "gain" | "loss" | "neutral" };

interface Props {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  packets: Packet[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  selectedPacketId: string | null;
  onSelectPacket: (id: string | null) => void;
  activeEdgeIds: Set<string>;
  pulseNodeIds: Set<string>;
  floatingPops: FloatingPop[];
  threatPulse?: number;
  isPlaying: boolean;
  onNodeDrag: (nodeId: string, newPosition: { x: number; y: number }) => void;
  onDeploy: () => void;
}

const ICON_MAP: Record<string, typeof Globe> = {
  internet: Globe,
  firewall: Shield,
  dmz: Activity,
  internal: Monitor,
  database: Database,
  server: Server,
};

/**
 * Schematic Perfection Helpers
 */

interface Point { x: number; y: number }

/** Calculates a 3-segment orthogonal path between two points */
function getOrthoPathPoints(start: Point, end: Point): Point[] {
  // Pure Z-step path (X -> MidX -> Y -> End)
  const midX = (start.x + end.x) / 2;
  return [
    start,
    { x: midX, y: start.y },
    { x: midX, y: end.y },
    end
  ];
}

/** Generates an SVG path string from points (with rounded corners) */
function generatePathString(points: Point[], radius = 16): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    if (next && radius > 0) {
      // Calculate bend
      const distPrev = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      const distNext = Math.hypot(next.x - curr.x, next.y - curr.y);
      const actualRadius = Math.min(radius, distPrev / 2, distNext / 2);

      // Point before corner
      const beforeX = curr.x - (curr.x - prev.x) / distPrev * actualRadius;
      const beforeY = curr.y - (curr.y - prev.y) / distPrev * actualRadius;
      
      // Point after corner
      const afterX = curr.x + (next.x - curr.x) / distNext * actualRadius;
      const afterY = curr.y + (next.y - curr.y) / distNext * actualRadius;

      d += ` L ${beforeX} ${beforeY} Q ${curr.x} ${curr.y} ${afterX} ${afterY}`;
    } else {
      d += ` L ${curr.x} ${curr.y}`;
    }
  }
  return d;
}

/** Calculates position on a multi-segment path [0..1] */
function getPointOnPath(progress: number, points: Point[]): Point {
  if (points.length < 2) return points[0] || { x: 0, y: 0 };
  
  const segments = [];
  let totalLen = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const len = Math.hypot(points[i+1].x - points[i].x, points[i+1].y - points[i].y);
    segments.push({ start: points[i], end: points[i+1], len });
    totalLen += len;
  }

  let targetLen = progress * totalLen;
  let accumulated = 0;

  for (const seg of segments) {
    if (accumulated + seg.len >= targetLen || targetLen === totalLen) {
      const segProgress = seg.len === 0 ? 0 : (targetLen - accumulated) / seg.len;
      return {
        x: seg.start.x + (seg.end.x - seg.start.x) * segProgress,
        y: seg.start.y + (seg.end.y - seg.start.y) * segProgress
      };
    }
    accumulated += seg.len;
  }

  return points[points.length - 1];
}

function pct(x: number, axis: "x" | "y") {
  return axis === "x" ? `${(x / FORTIFY_CANVAS.w) * 100}%` : `${(x / FORTIFY_CANVAS.h) * 100}%`;
}

export default function NetworkGraph({
  nodes,
  edges,
  packets,
  selectedNodeId,
  onSelectNode,
  selectedPacketId,
  onSelectPacket,
  activeEdgeIds,
  pulseNodeIds,
  floatingPops,
  threatPulse = 0,
  isPlaying,
  onNodeDrag,
  onDeploy,
}: Props) {
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const lastTouch = useRef<{ x: number; y: number } | null>(null);
  const lastDist = useRef<number | null>(null);

  const resetView = useCallback(() => {
    if (containerRef.current) {
      const { clientWidth } = containerRef.current;
      const initialScale = Math.min(1, clientWidth / FORTIFY_CANVAS.w);
      setViewport({ x: 0, y: 0, scale: initialScale });
    } else {
      setViewport({ x: 0, y: 0, scale: 1 });
    }
  }, []);

  useEffect(() => {
    resetView();
    // Re-calculate on window resize
    window.addEventListener("resize", resetView);
    return () => window.removeEventListener("resize", resetView);
  }, [resetView]);

  const adjustScale = useCallback((delta: number, centerX?: number, centerY?: number) => {
    setViewport((prev) => {
      const nextScale = Math.min(Math.max(prev.scale + delta, 0.5), 3);
      if (nextScale === prev.scale) return prev;

      // If we have a center point (cursor), we try to zoom towards it
      // though simple scale is often safer for this implementation
      return { ...prev, scale: nextScale };
    });
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    
    // Check if we're clicking a node (handled by the node itself)
    // If not, it's a pan drag
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, vx: viewport.x, vy: viewport.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNodeId && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - viewport.x) / viewport.scale;
      const canvasY = (e.clientY - rect.top - viewport.y) / viewport.scale;
      
      // Clamp to canvas bounds
      const clampedX = Math.max(40, Math.min(FORTIFY_CANVAS.w - 40, canvasX));
      const clampedY = Math.max(40, Math.min(FORTIFY_CANVAS.h - 40, canvasY));
      
      onNodeDrag(draggedNodeId, { x: clampedX, y: clampedY });
      return;
    }

    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setViewport((prev) => ({
      ...prev,
      x: dragStart.current.vx + dx,
      y: dragStart.current.vy + dy,
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedNodeId(null);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    adjustScale(delta);
  };

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      if (t) {
        lastTouch.current = { x: t.clientX, y: t.clientY };
        dragStart.current = { x: t.clientX, y: t.clientY, vx: viewport.x, vy: viewport.y };
      }
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      if (t1 && t2) {
        lastDist.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      }
    }
  }, [viewport.x, viewport.y]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (draggedNodeId && containerRef.current && e.touches.length === 1) {
      const t = e.touches[0]!;
      const rect = containerRef.current.getBoundingClientRect();
      const canvasX = (t.clientX - rect.left - viewport.x) / viewport.scale;
      const canvasY = (t.clientY - rect.top - viewport.y) / viewport.scale;
      
      const clampedX = Math.max(40, Math.min(FORTIFY_CANVAS.w - 40, canvasX));
      const clampedY = Math.max(40, Math.min(FORTIFY_CANVAS.h - 40, canvasY));
      
      onNodeDrag(draggedNodeId, { x: clampedX, y: clampedY });
      return;
    }

    if (e.touches.length === 1 && lastTouch.current) {
      const t = e.touches[0];
      if (t) {
        const dx = t.clientX - dragStart.current.x;
        const dy = t.clientY - dragStart.current.y;
        setViewport((prev) => ({
          ...prev,
          x: dragStart.current.vx + dx,
          y: dragStart.current.vy + dy,
        }));
      }
    } else if (e.touches.length === 2 && lastDist.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      if (t1 && t2) {
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const delta = (dist - lastDist.current) * 0.01;
        adjustScale(delta);
        lastDist.current = dist;
      }
    }
  }, [viewport.x, viewport.y, viewport.scale, draggedNodeId, onNodeDrag, adjustScale]);

  const handleTouchEnd = useCallback(() => {
    lastTouch.current = null;
    lastDist.current = null;
    setIsDragging(false);
    setDraggedNodeId(null);
  }, []);

  // Prevent default scroll when interacting with the canvas
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const preventDefault = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 0) e.preventDefault();
    };
    el.addEventListener("wheel", preventDefault, { passive: false });
    return () => el.removeEventListener("wheel", preventDefault);
  }, []);

  return (
    <div
      ref={containerRef}
      className="fortify-canvas-wrap"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "relative",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--accent-pale)",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid var(--sec-rule)",
        boxShadow: isPlaying
          ? `0 0 0 1px rgba(139,92,246,${0.15 + threatPulse * 0.25}), 0 0 48px rgba(139,92,246,${0.08 + threatPulse * 0.12})`
          : undefined,
        transition: "box-shadow 0.4s ease",
      }}
    >
      <style>{`
        .fortify-canvas-wrap {
          aspect-ratio: ${FORTIFY_CANVAS.w} / ${FORTIFY_CANVAS.h};
          max-height: min(70vh, 640px);
        }
        @media (max-width: 900px) {
          .fortify-canvas-wrap {
            aspect-ratio: 9 / 16 !important;
            max-height: min(85vh, 800px) !important;
          }
        }
      `}</style>
      {/* Interactive Layer — aspect-locked and panned */}
      <div
        style={{
          width: FORTIFY_CANVAS.w,
          height: FORTIFY_CANVAS.h,
          position: "relative",
          flexShrink: 0,
          transformOrigin: "center center",
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          transition: isDragging ? "none" : "transform 0.1s ease",
          pointerEvents: "none",
        }}
      >
        {/* Grid backdrop — moved inside to stay anchored to nodes */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.35,
            backgroundImage: `
              linear-gradient(rgba(139,92,246,0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139,92,246,0.06) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            pointerEvents: "none",
          }}
        />

        <svg
          viewBox={`0 0 ${FORTIFY_CANVAS.w} ${FORTIFY_CANVAS.h}`}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            cursor: "default",
            zIndex: 2,
            pointerEvents: "none",
          }}
        >
          <defs>
            <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(139,92,246,0.15)" />
              <stop offset="100%" stopColor="rgba(139,92,246,0.45)" />
            </linearGradient>
          </defs>

          {edges.map((edge) => {
            const fromNode = nodes.find((n) => n.id === edge.from);
            const toNode = nodes.find((n) => n.id === edge.to);
            if (!fromNode || !toNode) return null;
            
            const points = getOrthoPathPoints(fromNode, toNode);
            const pathD = generatePathString(points, 20);
            const hot = activeEdgeIds.has(edge.id);
            
            return (
              <g key={edge.id} style={{ pointerEvents: "none" }}>
                {/* Glow/Bloom layer */}
                <motion.path
                  d={pathD}
                  fill="none"
                  stroke={hot ? "var(--accent)" : "rgba(139,92,246,0.15)"}
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  animate={{ opacity: hot ? 0.4 : 0.05 }}
                  style={{ filter: "blur(4px)" }}
                />
                
                {/* Core wire layer */}
                <motion.path
                  d={pathD}
                  fill="none"
                  stroke={hot ? "var(--accent)" : "var(--sec-rule)"}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  animate={{ 
                    stroke: hot ? "var(--accent)" : "var(--sec-rule)",
                    opacity: hot ? 0.9 : 0.4
                  }}
                />
                
                {/* Moving signal pulse (dash array) */}
                <motion.path
                  d={pathD}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  strokeDasharray="4 20"
                  animate={{ strokeDashoffset: [0, -24], opacity: hot ? 1 : 0 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  strokeLinecap="round"
                />

                {/* Junction terminals */}
                <circle cx={fromNode.x} cy={fromNode.y} r={2.5} fill="var(--sec-rule)" />
                <circle cx={toNode.x} cy={toNode.y} r={2.5} fill="var(--sec-rule)" />
              </g>
            );
          })}

          <AnimatePresence>
            {packets.map((packet) => {
              const edge = edges.find((e) => e.id === packet.edgeId);
              if (!edge) return null;
              const fromNode = nodes.find((n) => n.id === edge.from);
              const toNode = nodes.find((n) => n.id === edge.to);
              if (!fromNode || !toNode) return null;

              const points = getOrthoPathPoints(fromNode, toNode);
              const { x: cx, y: cy } = getPointOnPath(packet.progress, points);
              const sel = selectedPacketId === packet.id;

              return (
                <motion.g key={packet.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {/* Trailing tail */}
                  <motion.path
                    d={generatePathString([
                      getPointOnPath(Math.max(0, packet.progress - 0.05), points),
                      { x: cx, y: cy }
                    ], 0)}
                    fill="none"
                    stroke={packet.isMalicious ? "var(--danger)" : "var(--safe)"}
                    strokeWidth={4}
                    strokeLinecap="round"
                    animate={{ opacity: [0.1, 0.4, 0.1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    style={{ filter: "blur(2px)", pointerEvents: "none" }}
                  />

                  <circle
                    cx={cx}
                    cy={cy}
                    r={sel ? 10 : 7}
                    fill={packet.isMalicious ? "var(--danger)" : "var(--safe)"}
                    stroke={sel ? "#fff" : "rgba(255,255,255,0.3)"}
                    strokeWidth={sel ? 2 : 1}
                    style={{
                      cursor: "pointer",
                      pointerEvents: "auto",
                      filter: packet.isMalicious
                        ? "drop-shadow(0 0 12px rgba(239,68,68,0.9))"
                        : "drop-shadow(0 0 10px rgba(34,197,94,0.7))",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPacket(sel ? null : packet.id);
                    }}
                  />
                  <title>
                    {packet.isMalicious ? "Malicious" : "Benign"} · {packet.payload.slice(0, 40)}
                    {packet.payload.length > 40 ? "…" : ""} · {packet.sourceIp}
                  </title>
                </motion.g>
              );
            })}
          </AnimatePresence>
        </svg>

        {/* HTML nodes — keyboard + pointer accessible */}
        {nodes.map((node) => {
          const Icon = ICON_MAP[node.type] || Monitor;
          const selected = selectedNodeId === node.id;
          const pulse = pulseNodeIds.has(node.id);
          return (
            <motion.button
              key={node.id}
              type="button"
              aria-pressed={selected}
              aria-label={`${node.label}, ${node.type}, health ${node.health}%`}
              onClick={(e) => {
                e.stopPropagation();
                onSelectNode(selected ? null : node.id);
              }}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{
                opacity: 1,
                scale: pulse ? 1.06 : 1,
              }}
              transition={{ duration: 0.25 }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDraggedNodeId(node.id);
                onSelectNode(node.id);
              }}
              style={{
                position: "absolute",
                left: pct(node.x, "x"),
                top: pct(node.y, "y"),
                transform: "translate(-50%, -50%)",
                width: 72,
                height: 72,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                zIndex: 16,
                background: "none",
                border: "none",
                padding: 0,
                cursor: draggedNodeId === node.id ? "grabbing" : "pointer",
                pointerEvents: "auto",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: "var(--sec-surface)",
                  border: selected ? "3px solid var(--accent)" : `2px solid ${pulse ? "var(--warn)" : "var(--sec-rule)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent)",
                  boxShadow: selected
                    ? "0 0 28px rgba(139,92,246,0.45)"
                    : "0 0 16px var(--accent-glow)",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
              >
                <Icon size={26} />
              </div>
              <span
                style={{
                  fontSize: 9,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--sec-ink)",
                  textAlign: "center",
                  width: 96,
                  lineHeight: 1.2,
                  pointerEvents: "none",
                }}
              >
                {node.label}
              </span>
              <div
                style={{
                  width: 44,
                  height: 4,
                  background: "rgba(255,255,255,0.12)",
                  borderRadius: 99,
                  overflow: "hidden",
                  marginTop: 2,
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    width: `${node.health}%`,
                    height: "100%",
                    background:
                      node.health > 50 ? "var(--safe)" : node.health > 20 ? "var(--warn)" : "var(--danger)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </motion.button>
          );
        })}

        {/* Floating +XP / damage numbers inside transformation layer */}
        <AnimatePresence>
          {floatingPops.map((pop) => (
            <motion.div
              key={pop.id}
              initial={{ opacity: 0, y: 8, scale: 0.85 }}
              animate={{ opacity: 1, y: -28, scale: 1 }}
              exit={{ opacity: 0, y: -48 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "absolute",
                left: pct(pop.x, "x"),
                top: pct(pop.y, "y"),
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                zIndex: 40,
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: "0.06em",
                textShadow: "0 0 12px rgba(0,0,0,0.8)",
                color:
                  pop.tone === "gain" ? "var(--safe)" : pop.tone === "loss" ? "var(--danger)" : "var(--accent)",
              }}
            >
              {pop.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Deselect layer — catches clicks on empty space */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          cursor: isDragging ? "grabbing" : "grab",
          zIndex: 1,
        }}
        onPointerDown={(e) => {
          // If we click the background, clear selection
          if (e.target === e.currentTarget) {
            onSelectNode(null);
            onSelectPacket(null);
          }
        }}
      />

      {/* Control Panel — static UI */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 30,
        }}
      >
        {[
          { icon: Plus, action: () => adjustScale(0.2), label: "Zoom In" },
          { icon: Minus, action: () => adjustScale(-0.2), label: "Zoom Out" },
          { icon: RotateCcw, action: resetView, label: "Reset" },
          { 
            icon: isPlaying ? Pause : Play, 
            action: onDeploy, 
            label: isPlaying ? "Pause" : "Deploy",
            color: isPlaying ? "var(--warn)" : "var(--accent)"
          },
        ].map((btn, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); btn.action(); }}
            title={btn.label}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(2,6,2,0.85)",
              border: "1px solid var(--sec-rule)",
              color: (btn as any).color || "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: (btn as any).color ? `0 0 10px ${(btn as any).color}33` : "none",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = (btn as any).color || "var(--accent)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--sec-rule)"}
          >
            <btn.icon size={16} fill={(btn as any).color && btn.icon === Play ? "currentColor" : "none"} />
          </button>
        ))}
      </div>

      {/* Legend + hint — static UI */}
      <div
        style={{
          position: "absolute",
          left: 10,
          bottom: 10,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          padding: "8px 12px",
          borderRadius: 10,
          background: "rgba(2,6,2,0.85)",
          border: "1px solid var(--sec-rule)",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          color: "var(--sec-muted)",
          zIndex: 20,
          maxWidth: "calc(100% - 20px)",
          pointerEvents: "none",
        }}
      >
        <span>
          <span style={{ color: "var(--danger)" }}>●</span> threat
        </span>
        <span>
          <span style={{ color: "var(--safe)" }}>●</span> benign
        </span>
        <span style={{ opacity: 0.85 }}>Click nodes & packets · Edges highlight traffic</span>
      </div>
    </div>
  );
}

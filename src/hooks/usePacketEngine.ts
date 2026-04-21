import { useEffect, useRef } from "react";
import { useNetworkStore } from "@/store/useNetworkStore";
import { isAllowedByFirewall, checkIDS, getNextEdge } from "@/lib/engine";
import { comboMultiplier } from "@/lib/gamify";
import { Packet } from "@/lib/types";

export function usePacketEngine() {
  const {
    isRunning,
    packets,
    nodes,
    edges,
    firewallRules,
    idsRules,
    setPackets,
    addLog,
    incrementScore,
    incrementBlocked,
    incrementLeaked,
    damageNode,
    setCombo,
    combo
  } = useNetworkStore();

  // We use a ref for combo to avoid stale closures in the frame loop
  const comboRef = useRef(combo);
  useEffect(() => {
    comboRef.current = combo;
  }, [combo]);

  useEffect(() => {
    if (!isRunning) return;

    let lastTime = performance.now();
    let lastFrameTime = performance.now();
    let frame: number;
    const FPS_LIMIT = 30;
    const FRAME_INTERVAL = 1000 / FPS_LIMIT;

    const animate = (time: number) => {
      const elapsed = time - lastFrameTime;
      
      if (elapsed > FRAME_INTERVAL) {
        lastFrameTime = time - (elapsed % FRAME_INTERVAL);
        
        const delta = (time - lastTime) / 1000;
        lastTime = time;

        if (isRunning) {
          setPackets((prevPackets: Packet[]) => {
            const nextPackets: Packet[] = [];
            
            for (const p of prevPackets) {
              if (p.status !== "moving") continue;

              // Update progress based on packet speed
              const newProgress = p.progress + (p.speed || 0.008);
              
              // Boundary checks for game logic
              const currentEdge = edges.find((e) => e.id === p.edgeId);
              if (!currentEdge) continue;
              
              const targetNode = nodes.find((n) => n.id === currentEdge.to);
              if (!targetNode) continue;

              // 1. FIREWALL CHECK (at edge start ~0.1)
              if (targetNode.type === "firewall" && p.progress < 0.1 && newProgress >= 0.1) {
                const { allowed } = isAllowedByFirewall(p, firewallRules);
                if (!allowed) {
                  const newCombo = Math.min(10, comboRef.current + 1);
                  setCombo(newCombo);
                  const mult = comboMultiplier(newCombo);
                  const pts = Math.floor(10 * mult);
                  
                  incrementScore(pts);
                  incrementBlocked();
                  addLog(`[FW] Blocked Source: ${p.sourceIp}`, "warn");
                  continue; 
                }
              }

              // 2. IDS CHECK (mid-edge ~0.5)
              if (p.progress < 0.5 && newProgress >= 0.5) {
                const { alert, blocked } = checkIDS(p, idsRules);
                if (alert) {
                  addLog(`[IDS] Alert: Found payload pattern!`, "error");
                  if (blocked) {
                    const newCombo = Math.min(10, comboRef.current + 1);
                    setCombo(newCombo);
                    const mult = comboMultiplier(newCombo);
                    const pts = Math.floor(15 * mult);
                    
                    incrementScore(pts);
                    incrementBlocked();
                    continue; 
                  }
                }
              }

              // 3. DELIVERY CHECK (at end 1.0)
              if (newProgress >= 1.0) {
                const nextEdge = getNextEdge(targetNode.id, edges);
                if (nextEdge) {
                  nextPackets.push({
                    ...p,
                    edgeId: nextEdge.id,
                    source: nextEdge.from,
                    target: nextEdge.to,
                    progress: 0
                  });
                } else {
                  if (p.isMalicious) {
                    addLog(`[CRITICAL] Breach at ${targetNode.label}. Integrity compromised!`, "error");
                    damageNode(targetNode.id, 20);
                    incrementLeaked();
                    setCombo(0);
                  } else {
                    addLog(`[INFO] Traffic delivered to ${targetNode.label}`, "info");
                    incrementScore(5);
                  }
                }
              } else {
                nextPackets.push({
                  ...p,
                  progress: newProgress
                });
              }
            }
            
            return nextPackets;
          });
        }
      }

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isRunning, edges, nodes, firewallRules, idsRules, setPackets, addLog, incrementScore, incrementBlocked, incrementLeaked, setCombo, damageNode]);
}

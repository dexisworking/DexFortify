"use client";

import React, { useMemo } from "react";
import { useStore as useRFStore, getBezierPath } from "reactflow";
import { useNetworkStore } from "@/store/useNetworkStore";
import { getBezierPoint } from "@/utils/bezier";
import { Shield, AlertCircle, FileText } from "lucide-react";

const PacketLayer = () => {
  // RF state for coordinates
  const edges = useRFStore((state) => state.edges);
  const nodes = useRFStore((state) => state.nodeInternals);
  const transform = useRFStore((state) => state.transform);

  const { packets, isRunning, setSelectedPacket, selectedPacketId } = useNetworkStore();

  const packetsWithPosition = useMemo(() => {
    return packets
      .map((packet) => {
        const edge = edges.find((e) => e.id === packet.edgeId);
        if (!edge) return null;

        const sourceNode = nodes.get(edge.source);
        const targetNode = nodes.get(edge.target);

        if (!sourceNode || !targetNode || !sourceNode.width || !sourceNode.height || !targetNode.width || !targetNode.height) {
          return null;
        }

        // Calculate path identical to ReactFlow's internal bezier
        const [path] = getBezierPath({
          sourceX: sourceNode.position.x + sourceNode.width / 2,
          sourceY: sourceNode.position.y + sourceNode.height / 2,
          sourcePosition: edge.sourceHandle ? "right" : "right" as any, // Default to right
          targetX: targetNode.position.x + targetNode.width / 2,
          targetY: targetNode.position.y + targetNode.height / 2,
          targetPosition: edge.targetHandle ? "left" : "left" as any, // Default to left
        });

        const pos = getBezierPoint(packet.progress, path);

        return {
          ...packet,
          x: pos.x,
          y: pos.y,
        };
      })
      .filter(Boolean);
  }, [packets, edges, nodes]) as any[];

  return (
    <div 
      className="react-flow__packet-layer pointer-events-none" 
      style={{ 
        position: 'absolute', 
        left: 0, 
        top: 0, 
        width: '100%', 
        height: '100%',
        zIndex: 10,
        transform: `translate(${transform[0]}px, ${transform[1]}px) scale(${transform[2]})`,
        transformOrigin: '0 0'
      }}
    >
      {packetsWithPosition.map((packet) => {
        const isSelected = selectedPacketId === packet.id;
        
        return (
          <div
            key={packet.id}
            onClick={(e) => {
              e.stopPropagation();
              if (!isRunning) setSelectedPacket(packet.id);
            }}
            className={`absolute pointer-events-auto cursor-pointer p-3 rounded-xl backdrop-blur-md border transition-all duration-300 ${
              packet.isMalicious 
                ? "bg-red-500/30 border-red-500/60 text-red-100" 
                : "bg-emerald-500/30 border-emerald-500/60 text-emerald-100"
            } ${isSelected ? "scale-[1.8] shadow-[0_0_25px_rgba(239,68,68,0.7)] z-30" : "scale-100 shadow-xl"}`}
            style={{
              left: 0,
              top: 0,
              transform: `translate(-50%, -50%) translate(${packet.x}px, ${packet.y}px)`,
            }}
          >
            {packet.isMalicious ? (
              <AlertCircle size={18} className="animate-pulse" />
            ) : (
              <FileText size={18} />
            )}
            
            {/* Minimal ID label */}
            {isSelected && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black/80 text-[10px] text-white px-2 py-0.5 rounded whitespace-nowrap border border-white/10">
                {packet.sourceIp}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PacketLayer;

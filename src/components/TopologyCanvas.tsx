"use client";

import React, { useCallback, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";

import { useNetworkStore } from "@/store/useNetworkStore";
import { usePacketEngine } from "@/hooks/usePacketEngine";
import NodeComponent from "./NodeComponent";
import EdgeComponent from "./EdgeComponent";
import PacketLayer from "./PacketLayer";

const nodeTypes = {
  custom: NodeComponent,
};

const edgeTypes = {
  custom: EdgeComponent,
};

const TopologyCanvas = () => {
  const {
    nodes: storeNodes,
    edges: storeEdges,
    isRunning,
    selectedNodeId,
    setSelectedNode,
    setSelectedPacket,
    setNodes,
    setEdges,
  } = useNetworkStore();

  // Initialize RF local state from store
  const [nodes, localSetNodes, onNodesChange] = useNodesState([]);
  const [edges, localSetEdges, onEdgesChange] = useEdgesState([]);

  // Sync store -> RF
  useEffect(() => {
    const rfNodes = storeNodes.map((n) => ({
      id: n.id,
      type: "custom",
      position: { x: n.x, y: n.y },
      data: { ...n },
      selected: n.id === selectedNodeId,
    }));
    localSetNodes(rfNodes);
  }, [storeNodes, selectedNodeId, localSetNodes]);

  useEffect(() => {
    const rfEdges = storeEdges.map((e) => ({
      id: e.id,
      source: e.from,
      target: e.to,
      type: "custom",
      markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(255,255,255,0.2)" },
    }));
    localSetEdges(rfEdges);
  }, [storeEdges, localSetEdges]);

  // Sync RF -> store (for positioning)
  const onNodeDragStop = useCallback((_: any, node: any) => {
    setNodes(
      storeNodes.map((n) =>
        n.id === node.id ? { ...n, x: node.position.x, y: node.position.y } : n
      )
    );
  }, [storeNodes, setNodes]);

  const onConnect = useCallback((params: Connection) => {
    const newEdge = {
      id: `e-${params.source}-${params.target}`,
      from: params.source!,
      to: params.target!,
    };
    setEdges([...storeEdges, newEdge]);
  }, [storeEdges, setEdges]);

  // Run simulation engine
  usePacketEngine();

  return (
    <div className="w-full h-full relative group">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={(_, node) => setSelectedNode(node.id)}
        onPaneClick={() => {
          setSelectedNode(null);
          setSelectedPacket(null);
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        className="bg-slate-950/20"
        minZoom={0.4}
        maxZoom={2.0}
        proOptions={{ hideAttribution: true }}
        zoomOnScroll={false}
        panOnScroll={false}
        zoomOnPinch={true}
        panOnDrag={true}
        preventScrolling={false}
        nodesDraggable={true}
        nodesConnectable={false}
      >
        <PacketLayer />
        
        <Background color="#334155" gap={20} size={1} />
        <Controls 
          className="!bg-black/80 !backdrop-blur-xl !border !border-purple-500/30 !fill-white shadow-[0_0_20px_rgba(168,85,247,0.15)] rounded-lg overflow-hidden" 
        />
        {typeof window !== 'undefined' && window.innerWidth > 640 && (
          <MiniMap 
            nodeColor="#1e293b"
            maskColor="rgba(0, 0, 0, 0.4)"
            className="!bg-black/60 !backdrop-blur-md !border !border-white/10 rounded-lg overflow-hidden"
            style={{ width: 100, height: 80 }}
          />
        )}
      </ReactFlow>

      {/* Deployment status overlay */}
      <div className="absolute top-4 right-4 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
        <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
        <span className="text-[10px] font-bold text-white/70 tracking-widest uppercase">
          {isRunning ? "Live Stream" : "System Paused"}
        </span>
      </div>

      <style jsx global>{`
        .react-flow__controls-button {
          background: rgba(0, 0, 0, 0.4) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          transition: all 0.2s ease !important;
        }
        .react-flow__controls-button:hover {
          background: rgba(168, 85, 247, 0.2) !important;
          fill: #c084fc !important;
        }
        .react-flow__controls-button svg {
          fill: currentColor !important;
          max-width: 14px !important;
          max-height: 14px !important;
        }
      `}</style>
    </div>
  );
};

export default TopologyCanvas;

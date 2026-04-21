"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { 
  Globe, Shield, Monitor, Server, Database, Activity 
} from "lucide-react";
import { NodeType } from "@/lib/types";

const ICON_MAP: Record<NodeType, any> = {
  internet: Globe,
  firewall: Shield,
  dmz: Activity,
  internal: Monitor,
  database: Database,
  server: Server,
};

const NodeComponent = ({ data, selected }: NodeProps) => {
  const Icon = ICON_MAP[data.type as NodeType] || Monitor;
  const health = data.health ?? 100;

  return (
    <div
      className={`relative p-5 rounded-xl border-2 transition-all duration-300 ${
        selected 
          ? "border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.3)]" 
          : "border-white/10 bg-black/60 backdrop-blur-md shadow-2xl"
      }`}
      style={{ minWidth: 120 }}
    >
      {/* Selection Glow */}
      {selected && (
        <div className="absolute inset-0 rounded-xl bg-blue-500/5 animate-pulse pointer-events-none" />
      )}

      <div className="flex flex-col items-center gap-3">
        <div className={`p-3 rounded-lg ${
          selected ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-white/70"
        }`}>
          <Icon size={24} />
        </div>
        
        <div className="text-center">
          <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-0.5">
            {data.type}
          </div>
          <div className="text-xs font-black text-white tracking-tight">
            {data.label}
          </div>
        </div>

        {/* Health Bar */}
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
          <div 
            className={`h-full transition-all duration-500 ${
              health > 60 ? "bg-emerald-500" : health > 30 ? "bg-amber-500" : "bg-red-500"
            }`}
            style={{ width: `${health}%` }}
          />
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-blue-500 border-2 border-slate-900 !opacity-0 group-hover:!opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500 border-2 border-slate-900 !opacity-0 group-hover:!opacity-100 transition-opacity"
      />
    </div>
  );
};

export default memo(NodeComponent);

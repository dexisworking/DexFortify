import { create } from "zustand";
import { NetworkNode, NetworkEdge, Packet, FirewallRule, IDSRule } from "@/lib/types";

interface NetworkState {
  // Simulator State
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  packets: Packet[];
  isRunning: boolean;
  
  // Game Metrics
  score: number;
  blockedCount: number;
  leakedCount: number;
  combo: number;
  xp: number;
  
  // Rules
  firewallRules: FirewallRule[];
  idsRules: IDSRule[];
  
  // Selection
  selectedNodeId: string | null;
  selectedPacketId: string | null;

  // Logs
  logs: { msg: string; type: "info" | "warn" | "error" | "system" | "success"; timestamp: string }[];

  // Actions
  setNodes: (nodes: NetworkNode[]) => void;
  setEdges: (edges: NetworkEdge[]) => void;
  setPackets: (packets: Packet[] | ((prev: Packet[]) => Packet[])) => void;
  addPacket: (packet: Packet) => void;
  updatePacket: (id: string, updates: Partial<Packet>) => void;
  removePacket: (id: string) => void;
  
  setFirewallRules: (rules: FirewallRule[]) => void;
  setIdsRules: (rules: IDSRule[]) => void;
  addLog: (msg: string, type?: "info" | "warn" | "error" | "system" | "success") => void;
  damageNode: (id: string, amount: number) => void;
  
  setGameState: (isRunning: boolean) => void;
  incrementScore: (amount: number) => void;
  incrementXp: (amount: number) => void;
  incrementBlocked: (amount?: number) => void;
  incrementLeaked: (amount?: number) => void;
  setCombo: (combo: number) => void;
  setXp: (xp: number) => void;
  
  setSelectedNode: (id: string | null) => void;
  setSelectedPacket: (id: string | null) => void;
  clearLogs: () => void;
  
  resetGame: () => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  nodes: [],
  edges: [],
  packets: [],
  isRunning: false,
  
  score: 0,
  blockedCount: 0,
  leakedCount: 0,
  combo: 0,
  xp: 0,
  
  firewallRules: [],
  idsRules: [],
  
  selectedNodeId: null,
  selectedPacketId: null,

  logs: [],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setPackets: (packets) =>
    set((state) => ({
      packets: typeof packets === "function" ? packets(state.packets) : packets,
    })),
  addPacket: (packet) => set((state) => ({ packets: [...state.packets, packet] })),
  
  updatePacket: (id, updates) =>
    set((state) => ({
      packets: state.packets.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),
    
  removePacket: (id) =>
    set((state) => ({
      packets: state.packets.filter((p) => p.id !== id),
    })),

  addLog: (msg, type = "info") =>
    set((state) => ({
      logs: [...state.logs, { msg, type, timestamp: new Date().toLocaleTimeString() }].slice(-50),
    })),

  setFirewallRules: (firewallRules) => set({ firewallRules }),
  setIdsRules: (idsRules) => set({ idsRules }),
  
  setGameState: (isRunning) => set({ isRunning }),
  incrementScore: (amount) => set((state) => ({ score: state.score + amount })),
  incrementXp: (amount) => set((state) => ({ xp: state.xp + amount })),
  incrementBlocked: (amount = 1) => set((state) => ({ blockedCount: state.blockedCount + amount })),
  incrementLeaked: (amount = 1) => set((state) => ({ 
    leakedCount: state.leakedCount + amount,
    score: state.score - (amount * 25)
  })),
  damageNode: (id, amount) => set((state) => ({
    nodes: state.nodes.map(n => n.id === id ? { ...n, health: Math.max(0, (n.health || 0) - amount) } : n)
  })),
  setCombo: (combo) => set({ combo }),
  setXp: (xp) => set({ xp }),
  
  setSelectedNode: (selectedNodeId) => set({ selectedNodeId }),
  setSelectedPacket: (selectedPacketId) => set({ selectedPacketId }),
  clearLogs: () => set({ logs: [] }),
  
  resetGame: () => set({
    packets: [],
    score: 0,
    blockedCount: 0,
    leakedCount: 0,
    combo: 0,
    isRunning: false,
    selectedNodeId: null,
    selectedPacketId: null
  }),
}));

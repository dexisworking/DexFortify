export type NodeType = "internet" | "firewall" | "dmz" | "internal" | "database" | "server";

export interface NetworkNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  health: number; // 0 to 100
}

export interface NetworkEdge {
  id: string;
  from: string;
  to: string;
}

export interface Packet {
  id: string;
  sourceIp: string;
  payload: any;
  isMalicious: boolean;
  status: "moving" | "blocked" | "delivered";
  edgeId: string;
  progress: number; // 0 to 1
  speed: number;   // New: for variable animation speed
  source: string;  // New: source node ID
  target: string;  // New: target node ID
}

export interface FirewallRule {
  id: string;
  type: "DENY" | "ALLOW";
  sourceIp: string; // wildcard "*" supported
}

export interface IDSRule {
  id: string;
  pattern: string; // substring match
  action: "ALERT" | "BLOCK";
}

export interface LevelScenario {
  id: string;
  title: string;
  description: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  spawnRate: number; // packets per second
  waves: Wave[];
  objective: string;
}

export interface Wave {
  count: number;
  maliciousProbability: number;
  patterns: string[];
}

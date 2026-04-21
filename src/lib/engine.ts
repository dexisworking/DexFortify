import { FirewallRule, IDSRule, Packet, NetworkEdge } from "./types";

/** Generates a random IP address. */
export function generateRandomIp(): string {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

/** Check if a packet is allowed by the firewall rules. */
export function isAllowedByFirewall(packet: Packet, rules: FirewallRule[]): { allowed: boolean; ruleId?: string } {
  // Process DENY rules first
  for (const rule of rules) {
    if (rule.type === "DENY") {
      if (rule.sourceIp === "*" || rule.sourceIp === packet.sourceIp) {
        return { allowed: false, ruleId: rule.id };
      }
    }
  }
  
  // Default allow
  return { allowed: true };
}

/** Check if a packet triggers an IDS filter. */
export function checkIDS(packet: Packet, rules: IDSRule[]): { alert: boolean; blocked: boolean; ruleId?: string } {
  for (const rule of rules) {
    if (packet.payload.includes(rule.pattern)) {
      return { 
        alert: true, 
        blocked: rule.action === "BLOCK", 
        ruleId: rule.id 
      };
    }
  }
  return { alert: false, blocked: false };
}

/** Find the next edge for a packet. */
export function getNextEdge(currentNodeId: string, edges: NetworkEdge[]): NetworkEdge | null {
  const outgoing = edges.filter(e => e.from === currentNodeId);
  if (outgoing.length === 0) return null;
  // Simple logic: pick first or random outgoing edge
  return outgoing[Math.floor(Math.random() * outgoing.length)];
}

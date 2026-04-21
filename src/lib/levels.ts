import { LevelScenario } from "./types";

export const LEVELS: LevelScenario[] = [
  {
    id: "perimeter_basics",
    title: "Round 1: Perimeter Defense",
    description: "Malicious traffic is coming from specific IPs. Set up firewall rules to block them before they hit the internal network.",
    objective: "Block 10 malicious packets",
    nodes: [
      { id: "net", type: "internet", label: "Internet", x: 100, y: 300, health: 100 },
      { id: "fw", type: "firewall", label: "Firewall", x: 400, y: 300, health: 100 },
      { id: "int", type: "internal", label: "Internal", x: 700, y: 300, health: 100 },
    ],
    edges: [
      { id: "e1", from: "net", to: "fw" },
      { id: "e2", from: "fw", to: "int" },
    ],
    spawnRate: 0.8,
    waves: [
      {
        count: 20,
        maliciousProbability: 0.4,
        patterns: ["SQLi", "XSS", "BruteForce"],
      }
    ]
  },
  {
    id: "dmz_segmentation",
    title: "Round 2: DMZ Isolation",
    description: "A web server in the DMZ is being targeted. Isolate it from the database to prevent data exfiltration.",
    objective: "Protect the Database from 5 targeted attacks",
    nodes: [
      { id: "net", type: "internet", label: "Internet", x: 100, y: 300, health: 100 },
      { id: "fw", type: "firewall", label: "Primary FW", x: 300, y: 300, health: 100 },
      { id: "dmz", type: "dmz", label: "Web Server (DMZ)", x: 500, y: 300, health: 100 },
      { id: "db", type: "database", label: "Database", x: 700, y: 300, health: 100 },
      { id: "int", type: "internal", label: "Internal", x: 900, y: 300, health: 100 },
    ],
    edges: [
      { id: "e1", from: "net", to: "fw" },
      { id: "e2", from: "fw", to: "dmz" },
      { id: "e3", from: "dmz", to: "db" },
      { id: "e4", from: "fw", to: "int" },
    ],
    spawnRate: 1.2,
    waves: [
      {
        count: 30,
        maliciousProbability: 0.5,
        patterns: ["DataThief", "Rootkit", "Exfil"],
      }
    ]
  },
  {
    id: "signature_inspection",
    title: "Round 3: Deep Packet Inspection",
    description: "Attackers are rotating IPs rapidly, making firewall rules ineffective. Use the IDS to block specific malicious payload signatures.",
    objective: "Block 15 content-based attacks",
    nodes: [
      { id: "net", type: "internet", label: "Internet", x: 50, y: 300, health: 100 },
      { id: "fw", type: "firewall", label: "IPS/IDS Edge", x: 250, y: 300, health: 100 },
      { id: "lb", type: "server", label: "Load Balancer", x: 450, y: 300, health: 100 },
      { id: "s1", type: "server", label: "App Server 01", x: 650, y: 300, health: 100 },
      { id: "s2", type: "server", label: "App Server 02", x: 850, y: 300, health: 100 },
      { id: "s3", type: "server", label: "App Server 03", x: 1050, y: 300, health: 100 },
    ],
    edges: [
      { id: "e1", from: "net", to: "fw" },
      { id: "e2", from: "fw", to: "lb" },
      { id: "e3", from: "lb", to: "s1" },
      { id: "e4", from: "lb", to: "s2" },
      { id: "e5", from: "lb", to: "s3" },
    ],
    spawnRate: 1.5,
    waves: [
      {
        count: 40,
        maliciousProbability: 0.6,
        patterns: ["CVE:Log4j", "eval(b64)", "RCE_Payload", "SQLi_Sig"],
      }
    ]
  },
  {
    id: "exfil_defense",
    title: "Round 4: Graduation - Zero Trust",
    description: "Final Mission: An internal device has been compromised. Block outbound data exfiltration before the information leaks to the internet.",
    objective: "Complete with zero successful data breaches",
    nodes: [
      { id: "int", type: "internal", label: "Compromised Node", x: 100, y: 300, health: 100 },
      { id: "fw", type: "firewall", label: "Egress FW", x: 350, y: 300, health: 100 },
      { id: "dmz", type: "dmz", label: "Outbound Proxy", x: 600, y: 300, health: 100 },
      { id: "net", type: "internet", label: "Adversary C2", x: 850, y: 300, health: 100 },
    ],
    edges: [
      { id: "e1", from: "int", to: "fw" },
      { id: "e2", from: "fw", to: "dmz" },
      { id: "e3", from: "dmz", to: "net" },
    ],
    spawnRate: 1.8,
    waves: [
      {
        count: 50,
        maliciousProbability: 0.7,
        patterns: ["Exfil:UserData", "Beacon:C2", "Tunnel:DNS"],
      }
    ]
  }
];

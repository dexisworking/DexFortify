# DexFortify — Network Defense Visualizer

**DexFortify** is a high-fidelity, interactive network topology simulator and laboratory designed to teach the fundamentals of network security through real-time visualization. It allows users to defend a simulated infrastructure against automated attacks by configuring firewalls and Intrusion Detection System (IDS) rules.

![DexFortify Banner](https://dexfortify.iamdex.codes/dexfortify-og.png)

## 🚀 Key Features

- **Real-Time Traffic Simulation**: Visualize packets moving between nodes (Internet, Firewall, DMZ, Internal Servers).
- **Interactive Topology**: Build and modify your network layout.
- **Security Logic Engine**:
  - **Firewall Configuration**: Block malicious IPs using source-based filtering.
  - **Deep Packet Inspection (IDS)**: Inspect packet payloads and block threats based on keyword patterns.
- **Gamified Learning**: Scoring systems, combos, and health metrics for critical infrastructure.
- **Responsive Design**: Fully optimized for desktop and mobile devices.

## 🛠️ Technology Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Visualization**: [ReactFlow](https://reactflow.dev/) & [Framer Motion](https://www.framer.com/motion/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Styling**: Tailwind CSS & Vanilla CSS (Custom Variable System)
- **Icons**: Lucide React

## 📦 Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or pnpm

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/DexFortify.git
   cd DexFortify
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Visit the app**:
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🕹️ How to Play

1. **Observe**: Watch the incoming traffic. Green dots are benign; red dots are malicious threats.
2. **Analyze**: Click on a malicious packet to see its source IP and payload.
3. **Defend**:
   - Use the **Firewall** panel to block the IP address of known threats.
   - Use the **IDS** panel to block specific keywords found in malicious payloads (e.g., "sql_inject", "backdoor").
4. **Survive**: Prevent threats from reaching your internal servers. If a server's health hits zero, the mission fails.

## 🛡️ License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! If you have ideas for new levels, attack patterns, or UI improvements, please open an issue or submit a pull request.

---

Created by **Dibyanshu Sekhar** as part of the **Dex Security Suite**.

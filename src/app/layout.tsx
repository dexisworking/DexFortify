import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "@/app/globals.css";
import { FortifyLabProvider } from "@/components/FortifyLabContext";
import HeaderStats from "@/components/HeaderStats";

const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-mono" });
const inter = Inter({ subsets: ["latin"], weight: ["900"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://dexfortify.iamdex.codes"),
  title: "DexFortify — Network Defense Visualizer",
  description:
    "Interactive network topology simulator: defend against simulated attacks by configuring firewalls and IDS rules.",
  robots: { index: true, follow: true },
  icons: {
    icon: "/dexfortify-favicon.png",
    shortcut: "/dexfortify-favicon.png",
    apple: "/dexfortify-favicon.png",
  },
  openGraph: {
    title: "DexFortify — Network Defense Visualizer",
    description:
      "Battle simulated cyber threats. Configure firewalls and deep packet inspection (IDS) in real-time.",
    url: "https://dexfortify.iamdex.codes",
    siteName: "DexFortify",
    type: "website",
    images: [{ url: "/dexfortify-og.png", width: 1200, height: 630, alt: "DexFortify Dashboard" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DexFortify — Network Defense Visualizer",
    description: "Interactive network security simulator. Defend the network from real-time attacks.",
    creator: "@SekharDibyanshu",
    images: ["/dexfortify-og.png"],
  },
};


export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${mono.variable} ${inter.variable}`}>
        <FortifyLabProvider>
          <div
            className="dexfortify-root"
            style={{
              ["--accent" as string]: "#8b5cf6",
              ["--accent-glow" as string]: "rgba(139,92,246,0.15)",
              ["--accent-pale" as string]: "rgba(139,92,246,0.08)",
              ["--danger" as string]: "#ef4444",
              ["--warn" as string]: "#f59e0b",
              ["--safe" as string]: "#22c55e",
              ["--sec-bg" as string]: "#060a06",
              ["--sec-surface" as string]: "#0d150d",
              ["--sec-rule" as string]: "rgba(139,92,246,0.12)",
              ["--sec-muted" as string]: "#6b7a6b",
              ["--sec-ink" as string]: "#e8f5e8",
              minHeight: "100vh",
              background: "var(--sec-bg)",
              color: "var(--sec-ink)",
              fontFamily: "var(--font-mono), ui-monospace, monospace",
              overflowX: "hidden",
            }}
          >
            <div
              aria-hidden
              style={{
                position: "fixed",
                inset: 0,
                pointerEvents: "none",
                zIndex: 999,
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139,92,246,0.015) 2px, rgba(139,92,246,0.015) 4px)",
              }}
            />

            <header
              style={{
                position: "sticky",
                top: 0,
                zIndex: 100,
                background: "rgba(6,10,6,0.92)",
                backdropFilter: "blur(12px)",
                borderBottom: "1px solid var(--sec-rule)",
              }}
            >
              <nav
                className="lab-nav"
                style={{
                  maxWidth: 1240,
                  margin: "0 auto",
                  padding: "12px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <a
                    href="/"
                    className="lab-brand"
                    style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-inter), sans-serif",
                        fontSize: 16,
                        fontWeight: 900,
                        letterSpacing: "-0.04em",
                        color: "#ffffff",
                        lineHeight: 1,
                      }}
                    >
                      Dex<span style={{ color: "var(--accent)" }}>Fortify.</span>
                    </span>
                  </a>
                </div>

                <div className="fortify-header-stats hidden lg:flex" style={{ flex: 1, justifyContent: "center", gap: 32, padding: "0 20px" }}>
                   <HeaderStats />
                </div>

                <div
                  className="fortify-header-actions"
                  style={{ display: "flex", alignItems: "center", gap: 14, marginLeft: "auto", flexWrap: "wrap", justifyContent: "flex-end" }}
                >
                  <a
                    href="#report"
                    className="lab-btn-report"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: "var(--sec-bg)",
                      background: "var(--accent)",
                      padding: "5px 14px",
                      borderRadius: 999,
                      textDecoration: "none",
                      transition: "opacity 0.2s",
                    }}
                  >
                    Get Report
                  </a>
                </div>
              </nav>
            </header>

            <main style={{ maxWidth: 1240, margin: "0 auto", padding: "0 24px 80px" }}>{children}</main>

            <footer
              style={{
                borderTop: "1px solid var(--sec-rule)",
                padding: "24px",
                textAlign: "center",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "var(--sec-muted)",
              }}
            >
              DexFortify lab · Simulated traffic only. No real networks or data.
            </footer>

            <style>{`
              @media (max-width: 600px) {
                .lab-nav {
                  padding: 10px 14px !important;
                  gap: 8px !important;
                  flex-wrap: nowrap !important;
                }
                .lab-brand {
                  gap: 6px !important;
                }
                .lab-btn-report {
                  font-size: 8px !important;
                  padding: 4px 10px !important;
                  letter-spacing: 0.05em !important;
                }
              }
              @media (max-width: 520px) {
                .lab-nav {
                  padding: 10px 12px !important;
                  gap: 12px !important;
                  justify-content: space-between !important;
                }
                .fortify-header-actions {
                  margin-left: 0 !important;
                  width: auto !important;
                }
              }
              @media (max-width: 400px) {
                .lab-btn-report {
                   font-size: 7px !important;
                   padding: 4px 8px !important;
                }
              }
            `}</style>
          </div>
        </FortifyLabProvider>
      </body>
    </html>
  );
}

/** Combo chain 0–10; each block adds 1, breaches reset. */
export function comboMultiplier(chain: number): number {
  const c = Math.max(0, Math.min(10, chain));
  return 1 + c * 0.12;
}

export function rankFromXp(xp: number): { title: string; tier: number } {
  if (xp < 80) return { title: "Recruit", tier: 0 };
  if (xp < 200) return { title: "Analyst", tier: 1 };
  if (xp < 400) return { title: "Defender", tier: 2 };
  if (xp < 700) return { title: "Architect", tier: 3 };
  if (xp < 1200) return { title: "Sentinel", tier: 4 };
  return { title: "SOC Lead", tier: 5 };
}

export type AchievementId =
  | "first_deploy"
  | "first_block"
  | "combo_5"
  | "combo_max"
  | "fw_master"
  | "ids_ace"
  | "clean_run";

export const ACHIEVEMENT_COPY: Record<AchievementId, { title: string; desc: string }> = {
  first_deploy: { title: "Systems online", desc: "Started the simulation." },
  first_block: { title: "First intercept", desc: "Stopped your first threat." },
  combo_5: { title: "Hot streak", desc: "Reached combo chain ×5." },
  combo_max: { title: "Unstoppable", desc: "Max combo chain (×10)." },
  fw_master: { title: "Perimeter ace", desc: "10 firewall blocks in one round." },
  ids_ace: { title: "Deep inspector", desc: "10 IDS blocks in one round." },
  clean_run: { title: "Spotless", desc: "Delivered 15 benign flows without a breach." },
};

export function starsForRun(breaches: number, minHealth: number): 1 | 2 | 3 {
  if (breaches === 0 && minHealth >= 70) return 3;
  if (breaches <= 2 && minHealth >= 40) return 2;
  return 1;
}

import type { Config } from "./types";

export const POINT_LABELS = ["0", "15", "30", "40"] as const;

export function setsToWin(cfg: Config): number {
  return Math.floor(cfg.sets / 2) + 1; // 1→1, 3→2, 5→3
}

export function isGameWon(points: number, opp: number, cfg: Config): boolean {
  if (cfg.goldenPoint) return points >= 4 && points > opp;
  return points >= 4 && points - opp >= 2;
}

export function isTiebreakWon(points: number, opp: number): boolean {
  return points >= 7 && points - opp >= 2;
}

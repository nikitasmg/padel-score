import type { MatchState, Side, TeamIndex } from "./types";
import { POINT_LABELS } from "./rules";

export function pointLabel(state: MatchState, team: TeamIndex): string {
  if (state.inTiebreak) return String(state.score[team].points);
  const other: TeamIndex = team === 0 ? 1 : 0;
  const p = state.score[team].points;
  const o = state.score[other].points;
  if (p >= 3 && o >= 3) {
    if (p === o) return "40";
    return p > o ? "AD" : "40";
  }
  return POINT_LABELS[Math.min(p, 3)];
}

export function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function sideLabel(side: Side): string {
  return side === "deuce" ? "правый квадрат" : "левый квадрат";
}

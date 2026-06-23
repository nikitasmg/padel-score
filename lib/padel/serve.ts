import type { MatchState, TeamIndex } from "./types";

export const SERVE_ORDER: Array<{ team: TeamIndex; player: 0 | 1 }> = [
  { team: 0, player: 0 },
  { team: 1, player: 0 },
  { team: 0, player: 1 },
  { team: 1, player: 1 },
];

export function nextServer(current: { team: TeamIndex; player: 0 | 1 }) {
  const idx = SERVE_ORDER.findIndex((o) => o.team === current.team && o.player === current.player);
  return SERVE_ORDER[(idx + 1) % SERVE_ORDER.length];
}

export interface CourtPos {
  team: TeamIndex; player: 0 | 1;
  x: "left" | "right"; y: "top" | "bottom"; isServer: boolean;
}

export function courtPositions(state: MatchState): CourtPos[] {
  const out: CourtPos[] = [];
  for (const team of [0, 1] as TeamIndex[]) {
    for (const player of [0, 1] as Array<0 | 1>) {
      out.push({
        team, player,
        x: team === 0 ? "left" : "right",
        y: player === 0 ? "top" : "bottom",
        isServer: state.serving.team === team && state.serving.player === player,
      });
    }
  }
  return out;
}

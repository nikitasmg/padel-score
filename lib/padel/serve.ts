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

// Смена сторон корта (change of ends). Стороны меняются после нечётного гейма
// в каждом сете (1, 3, 5, …) и каждые 6 очков в тай-брейке. Считаем суммарное
// число смен: для каждого сета это ceil(геймов/2) (завершённый тай-брейк даёт
// +1 геймом 7-6), плюс floor(очков/6) внутри текущего тай-брейка. Нечётная
// сумма смен = команды поменялись сторонами относительно старта.
export function endsSwapped(s: MatchState): boolean {
  let changeovers = 0;
  const sets = Math.max(s.score[0].games.length, s.score[1].games.length);
  for (let i = 0; i < sets; i++) {
    const g = (s.score[0].games[i] ?? 0) + (s.score[1].games[i] ?? 0);
    changeovers += Math.ceil(g / 2);
  }
  if (s.inTiebreak) {
    changeovers += Math.floor((s.score[0].points + s.score[1].points) / 6);
  }
  return changeovers % 2 === 1;
}

// Сторона корта (левая/правая половина), на которой стоит команда с учётом смены сторон.
function teamX(team: TeamIndex, swapped: boolean): "left" | "right" {
  const base: "left" | "right" = team === 0 ? "left" : "right";
  if (!swapped) return base;
  return base === "left" ? "right" : "left";
}

export interface CourtPos {
  team: TeamIndex; player: 0 | 1;
  x: "left" | "right"; y: "top" | "bottom"; isServer: boolean;
}

export function courtPositions(state: MatchState): CourtPos[] {
  const swapped = endsSwapped(state);
  const out: CourtPos[] = [];
  for (const team of [0, 1] as TeamIndex[]) {
    for (const player of [0, 1] as Array<0 | 1>) {
      out.push({
        team, player,
        x: teamX(team, swapped),
        y: player === 0 ? "top" : "bottom",
        isServer: state.serving.team === team && state.serving.player === player,
      });
    }
  }
  return out;
}

export function serveTarget(server: { x: "left" | "right"; y: "top" | "bottom" }): {
  x: "left" | "right";
  y: "top" | "bottom";
} {
  return {
    x: server.x === "left" ? "right" : "left",
    y: server.y === "top" ? "bottom" : "top",
  };
}

// Квадрат, из которого подаёт команда на стороне deuce/ad. Сторона меняется
// каждое очко, поэтому подача (и её диагональ) перекидывается между квадратами.
export function serveOrigin(
  team: TeamIndex,
  side: "deuce" | "ad",
  swapped = false,
): { x: "left" | "right"; y: "top" | "bottom" } {
  return {
    x: teamX(team, swapped),
    y: side === "deuce" ? "top" : "bottom",
  };
}

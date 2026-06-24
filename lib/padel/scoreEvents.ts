import type { MatchState, TeamIndex } from "./types";

export interface ScoreEvent {
  pointChanged: boolean;
  gameWonBy?: TeamIndex;
  setWonBy?: TeamIndex;
  matchWon: boolean;
}

const totalGames = (m: MatchState, t: TeamIndex) =>
  m.score[t].games.reduce((a, b) => a + b, 0);

export function diffMatch(prev: MatchState | null, curr: MatchState): ScoreEvent {
  if (!prev) return { pointChanged: false, matchWon: false };

  let gameWonBy: TeamIndex | undefined;
  let setWonBy: TeamIndex | undefined;
  for (const t of [0, 1] as TeamIndex[]) {
    if (totalGames(curr, t) > totalGames(prev, t)) gameWonBy = t;
    if (curr.score[t].sets > prev.score[t].sets) setWonBy = t;
  }

  const matchWon = prev.status !== "completed" && curr.status === "completed";
  const pointChanged =
    curr.score[0].points !== prev.score[0].points ||
    curr.score[1].points !== prev.score[1].points ||
    gameWonBy !== undefined ||
    setWonBy !== undefined;

  return { pointChanged, gameWonBy, setWonBy, matchWon };
}

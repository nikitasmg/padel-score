import type { MatchState, TeamIndex } from "./types";
import { endsSwapped } from "./serve";

export interface ScoreEvent {
  pointChanged: boolean;
  /** команда, выигравшая последний розыгрыш (для вспышки на её стороне) */
  pointWonBy?: TeamIndex;
  gameWonBy?: TeamIndex;
  setWonBy?: TeamIndex;
  /** на этом очке сменились стороны корта */
  endsChanged: boolean;
  matchWon: boolean;
}

const totalGames = (m: MatchState, t: TeamIndex) =>
  m.score[t].games.reduce((a, b) => a + b, 0);

export function diffMatch(prev: MatchState | null, curr: MatchState): ScoreEvent {
  if (!prev) return { pointChanged: false, endsChanged: false, matchWon: false };

  let gameWonBy: TeamIndex | undefined;
  let setWonBy: TeamIndex | undefined;
  let pointsUpBy: TeamIndex | undefined;
  for (const t of [0, 1] as TeamIndex[]) {
    if (totalGames(curr, t) > totalGames(prev, t)) gameWonBy = t;
    if (curr.score[t].sets > prev.score[t].sets) setWonBy = t;
    if (curr.score[t].points > prev.score[t].points) pointsUpBy = t;
  }

  const matchWon = prev.status !== "completed" && curr.status === "completed";
  const pointChanged =
    curr.score[0].points !== prev.score[0].points ||
    curr.score[1].points !== prev.score[1].points ||
    gameWonBy !== undefined ||
    setWonBy !== undefined;

  // На выигрыше гейма очки сбрасываются, поэтому победителя розыгрыша берём
  // из gameWonBy (он же выиграл решающее очко).
  const pointWonBy = pointsUpBy ?? gameWonBy;
  const endsChanged = pointChanged && endsSwapped(prev) !== endsSwapped(curr);

  return { pointChanged, pointWonBy, gameWonBy, setWonBy, endsChanged, matchWon };
}

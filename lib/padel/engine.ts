import type { Config, MatchState, MatchSnapshot, Team, TeamIndex, TeamScore } from "./types";
import { isGameWon, isTiebreakWon, setsToWin } from "./rules";
import { nextServer } from "./serve";

function emptyTeamScore(): TeamScore {
  return { points: 0, games: [0], sets: 0 };
}

export function createMatch(config: Config, teams: [Team, Team], now: number = Date.now()): MatchState {
  return {
    config,
    teams,
    score: [emptyTeamScore(), emptyTeamScore()],
    currentSet: 0,
    serving: { team: 0, player: 0, side: "deuce" },
    inTiebreak: false,
    status: "in_progress",
    startedAt: now,
    history: [],
  };
}

function snapshot(s: MatchState): MatchSnapshot {
  const { history, ...rest } = s;
  return structuredClone(rest);
}


export function scorePoint(state: MatchState, team: TeamIndex): MatchState {
  if (state.status === "completed") return state;
  // Клонируем только рабочие поля (без history), отдельно собираем новую историю —
  // иначе structuredClone(state) каждый раз впустую глубоко копирует весь history.
  const s: MatchState = { ...snapshot(state), history: [...state.history, snapshot(state)] };

  const other: TeamIndex = team === 0 ? 1 : 0;
  s.score[team].points += 1;

  const cfg = s.config;
  const pts = s.score[team].points;
  const opp = s.score[other].points;

  const gameWon = s.inTiebreak ? isTiebreakWon(pts, opp) : isGameWon(pts, opp, cfg);
  if (!gameWon) {
    s.serving = updateSide(s);
    return s;
  }

  // гейм/тай-брейк выигран
  s.score[team].games[s.currentSet] += 1;
  s.score[team].points = 0;
  s.score[other].points = 0;
  s.inTiebreak = false;

  resolveSetAndMatch(s, team, other);
  if (s.status === "in_progress") {
    const ns = nextServer({ team: s.serving.team, player: s.serving.player });
    s.serving = { team: ns.team, player: ns.player, side: "deuce" };
  }
  return s;
}

function updateSide(s: MatchState): MatchState["serving"] {
  const total = s.score[0].points + s.score[1].points;
  return { ...s.serving, side: total % 2 === 0 ? "deuce" : "ad" };
}

export function undo(state: MatchState): MatchState {
  if (state.history.length === 0) return state;
  const history = state.history.slice(0, -1);
  const prev = state.history[state.history.length - 1];
  return { ...structuredClone(prev), history };
}

export function resetMatch(state: MatchState): MatchState {
  return createMatch(state.config, state.teams);
}

function resolveSetAndMatch(s: MatchState, team: TeamIndex, other: TeamIndex): void {
  const cfg = s.config;
  const g = s.score[team].games[s.currentSet];
  const go = s.score[other].games[s.currentSet];

  const setWon =
    (g >= cfg.gamesPerSet && g - go >= 2) ||
    (cfg.tiebreak && g === cfg.gamesPerSet + 1 && go === cfg.gamesPerSet); // 7-6 через тай-брейк

  // вход в тай-брейк: N-N и tiebreak включён
  if (!setWon && cfg.tiebreak && g === cfg.gamesPerSet && go === cfg.gamesPerSet) {
    s.inTiebreak = true;
  }

  if (setWon) {
    s.score[team].sets += 1;
    if (s.score[team].sets >= setsToWin(cfg)) {
      s.status = "completed";
      s.winner = team;
      return;
    }
    // новый сет
    s.currentSet += 1;
    s.score[0].games.push(0);
    s.score[1].games.push(0);
  }
}

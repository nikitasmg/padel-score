export type TeamIndex = 0 | 1;
export type Side = "deuce" | "ad";

export interface Player { name: string }
export interface Team { players: [Player, Player] }

export interface Config {
  sets: 1 | 3 | 5;
  gamesPerSet: 4 | 6 | 9;
  goldenPoint: boolean;
  tiebreak: boolean;
}

export interface TeamScore {
  points: number;   // очки в текущем гейме/тай-брейке (сырое число розыгрышей)
  games: number[];  // выигранные геймы по сетам: games[setIndex]
  sets: number;     // выигранные сеты
}

export interface MatchState {
  config: Config;
  teams: [Team, Team];
  score: [TeamScore, TeamScore];
  currentSet: number;
  serving: { team: TeamIndex; player: 0 | 1; side: Side };
  inTiebreak: boolean;
  status: "in_progress" | "completed";
  winner?: TeamIndex;
  startedAt: number;
  history: MatchSnapshot[];
}

export type MatchSnapshot = Omit<MatchState, "history">;

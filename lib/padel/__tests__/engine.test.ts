import { describe, it, expect } from "vitest";
import { createMatch, scorePoint } from "@/lib/padel/engine";
import type { Config, Team } from "@/lib/padel/types";

const cfg: Config = { sets: 3, gamesPerSet: 6, goldenPoint: true, tiebreak: true };
const teams: [Team, Team] = [
  { players: [{ name: "Алекс" }, { name: "Марко" }] },
  { players: [{ name: "Дима" }, { name: "Соня" }] },
];
const m = () => createMatch(cfg, teams, 1000);

describe("createMatch", () => {
  it("стартовое состояние нулевое", () => {
    const s = m();
    expect(s.status).toBe("in_progress");
    expect(s.score[0].points).toBe(0);
    expect(s.score[0].sets).toBe(0);
    expect(s.currentSet).toBe(0);
    expect(s.score[0].games[0]).toBe(0);
    expect(s.startedAt).toBe(1000);
    expect(s.history).toEqual([]);
  });
});

describe("scorePoint — очки в гейме", () => {
  it("0→15→30→40", () => {
    let s = m();
    s = scorePoint(s, 0); expect(s.score[0].points).toBe(1);
    s = scorePoint(s, 0); expect(s.score[0].points).toBe(2);
    s = scorePoint(s, 0); expect(s.score[0].points).toBe(3);
    // гейм ещё не выигран
    expect(s.score[0].games[0]).toBe(0);
  });

  it("4 очка подряд при ведении → выигран гейм, очки сброшены", () => {
    let s = m();
    for (let i = 0; i < 4; i++) s = scorePoint(s, 0);
    expect(s.score[0].games[0]).toBe(1);
    expect(s.score[0].points).toBe(0);
    expect(s.score[1].points).toBe(0);
  });

  it("каждый разыгранный мяч кладёт снимок в историю", () => {
    let s = m();
    s = scorePoint(s, 0);
    expect(s.history.length).toBe(1);
    s = scorePoint(s, 1);
    expect(s.history.length).toBe(2);
  });
});

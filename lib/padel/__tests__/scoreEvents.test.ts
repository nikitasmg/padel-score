import { describe, it, expect } from "vitest";
import { diffMatch } from "@/lib/padel/scoreEvents";
import { createMatch, scorePoint } from "@/lib/padel/engine";
import type { Config, Team, TeamIndex } from "@/lib/padel/types";

const cfg: Config = { sets: 3, gamesPerSet: 6, goldenPoint: true, tiebreak: true };
const teams: [Team, Team] = [
  { players: [{ name: "A1" }, { name: "A2" }] },
  { players: [{ name: "B1" }, { name: "B2" }] },
];
const m = () => createMatch(cfg, teams, 1000);
function winGames(s: ReturnType<typeof createMatch>, t: TeamIndex, n: number) {
  for (let g = 0; g < n; g++) for (let p = 0; p < 4; p++) s = scorePoint(s, t);
  return s;
}

describe("diffMatch", () => {
  it("без prev — событий нет", () => {
    expect(diffMatch(null, m())).toEqual({ pointChanged: false, matchWon: false });
  });

  it("обычное очко — pointChanged, без гейма/сета", () => {
    const s1 = m();
    const s2 = scorePoint(s1, 0);
    const e = diffMatch(s1, s2);
    expect(e.pointChanged).toBe(true);
    expect(e.gameWonBy).toBeUndefined();
    expect(e.setWonBy).toBeUndefined();
  });

  it("выигран гейм — gameWonBy", () => {
    let s1 = m();
    for (let p = 0; p < 3; p++) s1 = scorePoint(s1, 0); // 40
    const s2 = scorePoint(s1, 0); // гейм
    expect(diffMatch(s1, s2).gameWonBy).toBe(0);
  });

  it("выигран сет — setWonBy (и gameWonBy на том же очке)", () => {
    let s1 = winGames(m(), 0, 5);       // 5-0
    for (let p = 0; p < 3; p++) s1 = scorePoint(s1, 0); // 40 в 6-м гейме
    const s2 = scorePoint(s1, 0);       // 6-0, сет взят
    const e = diffMatch(s1, s2);
    expect(e.setWonBy).toBe(0);
    expect(e.gameWonBy).toBe(0);
  });

  it("выигран матч — matchWon", () => {
    const cfg1 = { ...cfg, sets: 1 as const };
    let s1 = createMatch(cfg1, teams, 1000);
    s1 = winGames(s1, 0, 5);
    for (let p = 0; p < 3; p++) s1 = scorePoint(s1, 0);
    const s2 = scorePoint(s1, 0); // 6-0 → матч (best of 1)
    expect(diffMatch(s1, s2).matchWon).toBe(true);
  });
});

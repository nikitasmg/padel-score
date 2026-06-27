import { describe, it, expect } from "vitest";
import { endsSwapped, nextServer, SERVE_ORDER, serveOrigin, serveTarget } from "@/lib/padel/serve";
import { createMatch, scorePoint } from "@/lib/padel/engine";
import type { Config, Team, TeamIndex } from "@/lib/padel/types";

describe("nextServer", () => {
  it("идёт A1 → B1 → A2 → B2 → A1", () => {
    let cur = { team: 0 as const, player: 0 as const };
    const seen = [cur];
    for (let i = 0; i < 4; i++) { cur = nextServer(cur) as any; seen.push(cur); }
    expect(seen).toEqual([
      { team: 0, player: 0 },
      { team: 1, player: 0 },
      { team: 0, player: 1 },
      { team: 1, player: 1 },
      { team: 0, player: 0 },
    ]);
  });
  it("SERVE_ORDER зафиксирован", () => {
    expect(SERVE_ORDER).toEqual([
      { team: 0, player: 0 }, { team: 1, player: 0 },
      { team: 0, player: 1 }, { team: 1, player: 1 },
    ]);
  });
});

describe("serveTarget — диагональ через сетку", () => {
  it("left-top → right-bottom", () => {
    expect(serveTarget({ x: "left", y: "top" })).toEqual({ x: "right", y: "bottom" });
  });
  it("left-bottom → right-top", () => {
    expect(serveTarget({ x: "left", y: "bottom" })).toEqual({ x: "right", y: "top" });
  });
  it("right-top → left-bottom", () => {
    expect(serveTarget({ x: "right", y: "top" })).toEqual({ x: "left", y: "bottom" });
  });
  it("right-bottom → left-top", () => {
    expect(serveTarget({ x: "right", y: "bottom" })).toEqual({ x: "left", y: "top" });
  });
});

describe("serveOrigin — бокс подачи по команде и стороне", () => {
  it("команда 0: deuce → left-top, ad → left-bottom", () => {
    expect(serveOrigin(0, "deuce")).toEqual({ x: "left", y: "top" });
    expect(serveOrigin(0, "ad")).toEqual({ x: "left", y: "bottom" });
  });
  it("команда 1: deuce → right-top, ad → right-bottom", () => {
    expect(serveOrigin(1, "deuce")).toEqual({ x: "right", y: "top" });
    expect(serveOrigin(1, "ad")).toEqual({ x: "right", y: "bottom" });
  });
  it("смена стороны перекидывает цель по диагонали", () => {
    // одна и та же подающая команда, разные стороны → разные целевые квадраты
    const deuceTarget = serveTarget(serveOrigin(0, "deuce")); // → right-bottom
    const adTarget = serveTarget(serveOrigin(0, "ad"));       // → right-top
    expect(deuceTarget).toEqual({ x: "right", y: "bottom" });
    expect(adTarget).toEqual({ x: "right", y: "top" });
    expect(deuceTarget).not.toEqual(adTarget);
  });

  it("при смене сторон команда 0 уходит на правую половину", () => {
    expect(serveOrigin(0, "deuce", true)).toEqual({ x: "right", y: "top" });
    expect(serveOrigin(1, "deuce", true)).toEqual({ x: "left", y: "top" });
  });
});

describe("endsSwapped — смена сторон корта", () => {
  const cfg: Config = { sets: 3, gamesPerSet: 6, goldenPoint: true, tiebreak: true };
  const teams: [Team, Team] = [
    { players: [{ name: "A1" }, { name: "A2" }] },
    { players: [{ name: "B1" }, { name: "B2" }] },
  ];
  // выиграть n геймов командой t (по 4 чистых очка)
  function winGames(s: ReturnType<typeof createMatch>, t: TeamIndex, n: number) {
    for (let g = 0; g < n; g++) for (let p = 0; p < 4; p++) s = scorePoint(s, t);
    return s;
  }

  it("на старте стороны не поменяны", () => {
    expect(endsSwapped(createMatch(cfg, teams, 1000))).toBe(false);
  });

  it("смена после 1-го гейма, держится до 2-го, обратно после 3-го", () => {
    let s = createMatch(cfg, teams, 1000);
    s = winGames(s, 0, 1); expect(endsSwapped(s)).toBe(true);  // после гейма 1
    s = winGames(s, 1, 1); expect(endsSwapped(s)).toBe(true);  // после гейма 2 — без смены
    s = winGames(s, 0, 1); expect(endsSwapped(s)).toBe(false); // после гейма 3 — обратно
  });

  it("в тай-брейке стороны меняются каждые 6 очков", () => {
    let s = createMatch(cfg, teams, 1000);
    for (let g = 0; g < 6; g++) { s = winGames(s, 0, 1); s = winGames(s, 1, 1); } // 6-6, ТБ
    expect(s.inTiebreak).toBe(true);
    const at12games = endsSwapped(s);            // 12 геймов: ceil(12/2)=6 → не поменяны
    expect(at12games).toBe(false);
    for (let p = 0; p < 5; p++) s = scorePoint(s, 0); // 5 очков ТБ — ещё нет смены
    expect(endsSwapped(s)).toBe(false);
    s = scorePoint(s, 1); // 6-е очко ТБ → смена сторон
    expect(endsSwapped(s)).toBe(true);
  });
});

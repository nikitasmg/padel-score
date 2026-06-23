import { describe, it, expect } from "vitest";
import { createMatch, scorePoint } from "@/lib/padel/engine";
import { pointLabel, clock, sideLabel } from "@/lib/padel/format";
import type { Config, Team } from "@/lib/padel/types";

const cfg: Config = { sets: 3, gamesPerSet: 6, goldenPoint: false, tiebreak: true };
const teams: [Team, Team] = [
  { players: [{ name: "Алекс" }, { name: "Марко" }] },
  { players: [{ name: "Дима" }, { name: "Соня" }] },
];

describe("pointLabel", () => {
  it("0/15/30/40", () => {
    let s = createMatch(cfg, teams, 0);
    expect(pointLabel(s, 0)).toBe("0");
    s = scorePoint(s, 0); expect(pointLabel(s, 0)).toBe("15");
    s = scorePoint(s, 0); expect(pointLabel(s, 0)).toBe("30");
    s = scorePoint(s, 0); expect(pointLabel(s, 0)).toBe("40");
  });
  it("AD при преимуществе (advantage-режим)", () => {
    let s = createMatch(cfg, teams, 0);
    for (let i = 0; i < 3; i++) { s = scorePoint(s, 0); s = scorePoint(s, 1); } // 40-40
    s = scorePoint(s, 0);
    expect(pointLabel(s, 0)).toBe("AD");
    expect(pointLabel(s, 1)).toBe("40");
  });
  it("в тай-брейке показывает сырые очки", () => {
    // довести сет до 6-6 → тай-брейк, проверить что очки выводятся числом
    let s = createMatch({ ...cfg, tiebreak: true }, teams, 0);
    for (let g = 0; g < 6; g++) {
      for (let p = 0; p < 4; p++) s = scorePoint(s, 0);
      for (let p = 0; p < 4; p++) s = scorePoint(s, 1);
    }
    expect(s.inTiebreak).toBe(true);
    s = scorePoint(s, 0); s = scorePoint(s, 0); // 2-0 в тай-брейке
    expect(pointLabel(s, 0)).toBe("2");
    expect(pointLabel(s, 1)).toBe("0");
  });
});

describe("clock", () => {
  it("форматирует мс в HH:MM:SS", () => {
    expect(clock(0)).toBe("00:00:00");
    expect(clock((1*3600 + 2*60 + 3) * 1000)).toBe("01:02:03");
  });
});

describe("sideLabel", () => {
  it("deuce → правый квадрат", () => expect(sideLabel("deuce")).toBe("правый квадрат"));
  it("ad → левый квадрат", () => expect(sideLabel("ad")).toBe("левый квадрат"));
});

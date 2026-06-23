import { describe, it, expect } from "vitest";
import { setsToWin, isGameWon, isTiebreakWon } from "@/lib/padel/rules";
import type { Config } from "@/lib/padel/types";

const base: Config = { sets: 3, gamesPerSet: 6, goldenPoint: true, tiebreak: true };

describe("setsToWin", () => {
  it("best of 1 → 1", () => expect(setsToWin({ ...base, sets: 1 })).toBe(1));
  it("best of 3 → 2", () => expect(setsToWin({ ...base, sets: 3 })).toBe(2));
  it("best of 5 → 3", () => expect(setsToWin({ ...base, sets: 5 })).toBe(3));
});

describe("isGameWon (advantage)", () => {
  const cfg = { ...base, goldenPoint: false };
  it("4-2 выигран", () => expect(isGameWon(4, 2, cfg)).toBe(true));
  it("4-3 не выигран (нужна разница 2)", () => expect(isGameWon(4, 3, cfg)).toBe(false));
  it("5-3 выигран", () => expect(isGameWon(5, 3, cfg)).toBe(true));
});

describe("isGameWon (golden point)", () => {
  const cfg = { ...base, goldenPoint: true };
  it("4-3 выигран при golden point", () => expect(isGameWon(4, 3, cfg)).toBe(true));
  it("3-3 не выигран", () => expect(isGameWon(3, 3, cfg)).toBe(false));
});

describe("isTiebreakWon", () => {
  it("7-5 выигран", () => expect(isTiebreakWon(7, 5)).toBe(true));
  it("7-6 не выигран", () => expect(isTiebreakWon(7, 6)).toBe(false));
  it("8-6 выигран", () => expect(isTiebreakWon(8, 6)).toBe(true));
});

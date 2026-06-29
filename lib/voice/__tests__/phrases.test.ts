import { describe, it, expect } from "vitest";
import { announcements } from "@/lib/voice/phrases";
import type { ScoreEvent } from "@/lib/padel/scoreEvents";
import type { MatchState, Team } from "@/lib/padel/types";

const teams: [Team, Team] = [
  { players: [{ name: "Иван" }, { name: "Пётр" }] },
  { players: [{ name: "B1" }, { name: "B2" }] },
];
const match = { teams, winner: undefined } as unknown as MatchState;

const base: ScoreEvent = { pointChanged: true, endsChanged: false, matchWon: false };

describe("announcements", () => {
  it("гейм — называет имена выигравшей команды", () => {
    expect(announcements({ ...base, gameWonBy: 0 }, match)).toEqual(["Гейм, Иван и Пётр"]);
  });

  it("сет приоритетнее гейма", () => {
    expect(announcements({ ...base, gameWonBy: 1, setWonBy: 1 }, match)).toEqual(["Сет, B1 и B2"]);
  });

  it("смена сторон добавляется после крупного события", () => {
    expect(announcements({ ...base, gameWonBy: 0, endsChanged: true }, match)).toEqual([
      "Гейм, Иван и Пётр",
      "Смена сторон",
    ]);
  });

  it("смена сторон без гейма (тай-брейк)", () => {
    expect(announcements({ ...base, endsChanged: true }, match)).toEqual(["Смена сторон"]);
  });

  it("матч — отдельная фраза, берёт победителя из match.winner", () => {
    const m = { teams, winner: 0 } as unknown as MatchState;
    expect(announcements({ ...base, matchWon: true, setWonBy: 0, gameWonBy: 0, endsChanged: true }, m)).toEqual([
      "Матч! Иван и Пётр побеждают",
    ]);
  });

  it("пустые имена — фолбэк на «команда N»", () => {
    const m = { teams: [{ players: [{ name: " " }, { name: "" }] }, teams[1]], winner: undefined } as unknown as MatchState;
    expect(announcements({ ...base, gameWonBy: 0 }, m)).toEqual(["Гейм, команда 1"]);
  });

  it("нет крупного события и нет смены сторон — пусто", () => {
    expect(announcements(base, match)).toEqual([]);
  });
});

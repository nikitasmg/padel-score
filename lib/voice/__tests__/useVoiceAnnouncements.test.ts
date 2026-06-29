import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { createMatch, scorePoint } from "@/lib/padel/engine";
import type { Config, Team, TeamIndex } from "@/lib/padel/types";
import { speak } from "@/lib/voice/speak";
import { useVoiceAnnouncements } from "@/lib/voice/useVoiceAnnouncements";

vi.mock("@/lib/voice/speak", () => ({ speak: vi.fn() }));

const cfg: Config = { sets: 3, gamesPerSet: 6, goldenPoint: true, tiebreak: true };
const teams: [Team, Team] = [
  { players: [{ name: "Иван" }, { name: "Пётр" }] },
  { players: [{ name: "B1" }, { name: "B2" }] },
];
function winGame(s: ReturnType<typeof createMatch>, t: TeamIndex) {
  for (let p = 0; p < 4; p++) s = scorePoint(s, t);
  return s;
}

beforeEach(() => vi.clearAllMocks());

describe("useVoiceAnnouncements", () => {
  it("озвучивает гейм при включённой озвучке", () => {
    const m0 = createMatch(cfg, teams, 1000);
    const m1 = winGame(m0, 0);
    const { rerender } = renderHook(({ m }) => useVoiceAnnouncements(m, true), {
      initialProps: { m: m0 },
    });
    rerender({ m: m1 });
    expect(speak).toHaveBeenCalledWith("Гейм, Иван и Пётр");
  });

  it("не дублирует при том же состоянии", () => {
    const m0 = createMatch(cfg, teams, 1000);
    const m1 = winGame(m0, 0);
    const { rerender } = renderHook(({ m }) => useVoiceAnnouncements(m, true), {
      initialProps: { m: m0 },
    });
    rerender({ m: m1 });
    const callsAfterFirst = vi.mocked(speak).mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThan(0);
    rerender({ m: m1 });
    expect(speak).toHaveBeenCalledTimes(callsAfterFirst);
  });

  it("молчит при выключенной озвучке", () => {
    const m0 = createMatch(cfg, teams, 1000);
    const m1 = winGame(m0, 0);
    const { rerender } = renderHook(({ m }) => useVoiceAnnouncements(m, false), {
      initialProps: { m: m0 },
    });
    rerender({ m: m1 });
    expect(speak).not.toHaveBeenCalled();
  });

  it("не озвучивает событие, случившееся до включения", () => {
    const m0 = createMatch(cfg, teams, 1000);
    const m1 = winGame(m0, 0);
    const { rerender } = renderHook(({ m, e }) => useVoiceAnnouncements(m, e), {
      initialProps: { m: m0, e: false },
    });
    rerender({ m: m1, e: false }); // гейм при выключенной
    rerender({ m: m1, e: true }); // включили — переигрывать прошлое не должны
    expect(speak).not.toHaveBeenCalled();
  });
});

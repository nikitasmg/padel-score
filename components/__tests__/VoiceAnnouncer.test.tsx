import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import type { MatchState, Team } from "@/lib/padel/types";

const useVoiceAnnouncements = vi.hoisted(() => vi.fn());
vi.mock("@/lib/voice/useVoiceAnnouncements", () => ({ useVoiceAnnouncements }));

import { VoiceAnnouncer } from "@/components/VoiceAnnouncer";

const teams: [Team, Team] = [
  { players: [{ name: "Иван" }, { name: "Пётр" }] },
  { players: [{ name: "B1" }, { name: "B2" }] },
];
const match = { teams } as unknown as MatchState;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("VoiceAnnouncer", () => {
  it("ничего не рендерит (безголовый)", () => {
    const { container } = render(<VoiceAnnouncer match={match} />);
    expect(container.firstChild).toBeNull();
  });

  it("вызывает озвучивание с выключенной озвучкой по умолчанию", () => {
    render(<VoiceAnnouncer match={match} />);
    expect(useVoiceAnnouncements).toHaveBeenCalledWith(match, false);
  });

  it("передаёт enabled=true когда озвучка включена в настройке", async () => {
    localStorage.setItem("padel:voice-enabled", "1");
    render(<VoiceAnnouncer match={match} />);
    // useVoiceSetting читает localStorage в useEffect → enabled становится true после первого рендера.
    await vi.waitFor(() => {
      expect(useVoiceAnnouncements).toHaveBeenLastCalledWith(match, true);
    });
  });
});

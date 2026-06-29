import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import type { MatchState, Team } from "@/lib/padel/types";

// vi.mock is hoisted above imports — define mocks with vi.hoisted to avoid
// "Cannot access variable before initialization" errors.
const voiceMocks = vi.hoisted(() => ({
  isSpeechSupported: vi.fn(() => true),
  getRussianVoice: vi.fn(() => ({ lang: "ru-RU" })),
  speak: vi.fn(),
  warmUp: vi.fn(),
}));
vi.mock("@/lib/voice/speak", () => voiceMocks);
vi.mock("@/lib/voice/useVoiceAnnouncements", () => ({ useVoiceAnnouncements: vi.fn() }));

import { VoiceControl } from "@/components/VoiceControl";
import { warmUp, speak, isSpeechSupported } from "@/lib/voice/speak";

const teams: [Team, Team] = [
  { players: [{ name: "Иван" }, { name: "Пётр" }] },
  { players: [{ name: "B1" }, { name: "B2" }] },
];
const match = { teams } as unknown as MatchState;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  (isSpeechSupported as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
});

describe("VoiceControl", () => {
  it("ничего не рендерит без поддержки синтеза", () => {
    (isSpeechSupported as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const { container } = render(<VoiceControl match={match} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("тумблер включает озвучку и греет синтез", () => {
    render(<VoiceControl match={match} />);
    fireEvent.click(screen.getByRole("button", { name: /озвучк/i }));
    expect(warmUp).toHaveBeenCalled();
    expect(localStorage.getItem("padel:voice-enabled")).toBe("1");
  });

  it("кнопка проверки произносит тестовую фразу", () => {
    render(<VoiceControl match={match} />);
    fireEvent.click(screen.getByRole("button", { name: /проверить голос/i }));
    expect(speak).toHaveBeenCalledWith("Проверка озвучки, гейм за командой один");
  });
});

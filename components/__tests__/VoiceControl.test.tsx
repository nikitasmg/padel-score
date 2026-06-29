import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";

// vi.mock is hoisted above imports — define mocks with vi.hoisted to avoid
// "Cannot access variable before initialization" errors.
const voiceMocks = vi.hoisted(() => ({
  isSpeechSupported: vi.fn(() => true),
  getRussianVoice: vi.fn(() => ({ lang: "ru-RU" })),
  speak: vi.fn(),
  warmUp: vi.fn(),
  checkRussianVoice: vi.fn((cb: (found: boolean) => void) => cb(true)),
  cancelSpeech: vi.fn(),
}));
vi.mock("@/lib/voice/speak", () => voiceMocks);

import { VoiceControl } from "@/components/VoiceControl";
import { warmUp, speak, isSpeechSupported } from "@/lib/voice/speak";

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  (isSpeechSupported as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
});

describe("VoiceControl", () => {
  it("ничего не рендерит без поддержки синтеза", () => {
    (isSpeechSupported as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const { container } = render(<VoiceControl />);
    expect(container).toBeEmptyDOMElement();
  });

  it("тумблер включает озвучку и греет синтез", () => {
    render(<VoiceControl />);
    fireEvent.click(screen.getByRole("button", { name: /озвучк/i }));
    expect(warmUp).toHaveBeenCalled();
    expect(localStorage.getItem("padel:voice-enabled")).toBe("1");
  });

  it("кнопка проверки произносит тестовую фразу", () => {
    render(<VoiceControl />);
    fireEvent.click(screen.getByRole("button", { name: /проверить голос/i }));
    expect(speak).toHaveBeenCalledWith("Проверка озвучки, гейм за командой один");
    expect(warmUp).toHaveBeenCalled();
  });

  it("кнопка «Включить звук» появляется при включённой озвучке и исчезает после тапа", async () => {
    localStorage.setItem("padel:voice-enabled", "1");
    render(<VoiceControl />);
    // useVoiceSetting читает localStorage в useEffect → enabled становится true после первого рендера.
    const unlockBtn = await screen.findByRole("button", { name: /включить звук/i });
    expect(unlockBtn).toBeInTheDocument();
    fireEvent.click(unlockBtn);
    expect(warmUp).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /включить звук/i })).toBeNull();
  });
});

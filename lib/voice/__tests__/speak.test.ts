import { describe, it, expect, beforeEach, vi } from "vitest";

class FakeUtterance {
  text: string;
  lang = "";
  rate = 1;
  pitch = 1;
  volume = 1;
  voice: unknown = null;
  constructor(text: string) {
    this.text = text;
  }
}

function makeVoices(langs: string[]) {
  return langs.map((lang, i) => ({ lang, name: `voice-${i}`, localService: true }) as SpeechSynthesisVoice);
}

function installSpeech(voices: SpeechSynthesisVoice[]) {
  const speak = vi.fn();
  // @ts-expect-error — стаб браузерного API в jsdom
  global.SpeechSynthesisUtterance = FakeUtterance;
  // @ts-expect-error — стаб браузерного API в jsdom
  global.window.speechSynthesis = { speak, getVoices: () => voices };
  return speak;
}

beforeEach(() => {
  vi.resetModules();
  // @ts-expect-error — сброс стабов между тестами
  delete global.window.speechSynthesis;
  // @ts-expect-error — сброс стабов между тестами
  delete global.SpeechSynthesisUtterance;
});

describe("speak.ts", () => {
  it("isSpeechSupported зависит от наличия speechSynthesis", async () => {
    const mod1 = await import("@/lib/voice/speak");
    expect(mod1.isSpeechSupported()).toBe(false);
    installSpeech(makeVoices(["en-US"]));
    vi.resetModules();
    const mod2 = await import("@/lib/voice/speak");
    expect(mod2.isSpeechSupported()).toBe(true);
  });

  it("getRussianVoice выбирает ru-голос", async () => {
    installSpeech(makeVoices(["en-US", "ru-RU"]));
    const { getRussianVoice } = await import("@/lib/voice/speak");
    expect(getRussianVoice()?.lang).toBe("ru-RU");
  });

  it("getRussianVoice возвращает null если русского нет", async () => {
    installSpeech(makeVoices(["en-US", "de-DE"]));
    const { getRussianVoice } = await import("@/lib/voice/speak");
    expect(getRussianVoice()).toBeNull();
  });

  it("speak произносит текст русским голосом", async () => {
    const speakFn = installSpeech(makeVoices(["ru-RU"]));
    const { speak } = await import("@/lib/voice/speak");
    speak("Гейм");
    expect(speakFn).toHaveBeenCalledTimes(1);
    const utt = speakFn.mock.calls[0][0] as FakeUtterance;
    expect(utt.text).toBe("Гейм");
    expect(utt.lang).toBe("ru-RU");
    expect((utt.voice as SpeechSynthesisVoice).lang).toBe("ru-RU");
  });

  it("speak игнорирует пустой текст", async () => {
    const speakFn = installSpeech(makeVoices(["ru-RU"]));
    const { speak } = await import("@/lib/voice/speak");
    speak("");
    expect(speakFn).not.toHaveBeenCalled();
  });

  it("warmUp произносит беззвучную фразу", async () => {
    const speakFn = installSpeech(makeVoices(["ru-RU"]));
    const { warmUp } = await import("@/lib/voice/speak");
    warmUp();
    expect(speakFn).toHaveBeenCalledTimes(1);
    expect((speakFn.mock.calls[0][0] as FakeUtterance).volume).toBe(0);
  });
});

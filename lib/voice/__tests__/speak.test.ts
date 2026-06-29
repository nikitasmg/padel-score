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
  const speakFn = vi.fn();
  const cancel = vi.fn();
  let voicesArr = [...voices];
  const handlers = new Map<string, Array<() => void>>();

  const addEventListener = vi.fn((event: string, handler: () => void) => {
    if (!handlers.has(event)) handlers.set(event, []);
    handlers.get(event)!.push(handler);
  });
  const removeEventListener = vi.fn((event: string, handler: () => void) => {
    const arr = handlers.get(event);
    if (arr) {
      const idx = arr.indexOf(handler);
      if (idx !== -1) arr.splice(idx, 1);
    }
  });
  const fireVoicesChanged = () => {
    const arr = handlers.get("voiceschanged") ?? [];
    // Копируем массив, чтобы removeEventListener внутри обработчика не ломал итерацию.
    [...arr].forEach((h) => h());
  };
  const setVoices = (newVoices: SpeechSynthesisVoice[]) => { voicesArr = newVoices; };

  // @ts-expect-error — стаб браузерного API в jsdom
  global.SpeechSynthesisUtterance = FakeUtterance;
  // @ts-expect-error — стаб браузерного API в jsdom
  global.window.speechSynthesis = { speak: speakFn, cancel, getVoices: () => voicesArr, addEventListener, removeEventListener };
  return { speakFn, cancel, fireVoicesChanged, setVoices };
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
    const { speakFn } = installSpeech(makeVoices(["ru-RU"]));
    const { speak } = await import("@/lib/voice/speak");
    speak("Гейм");
    expect(speakFn).toHaveBeenCalledTimes(1);
    const utt = speakFn.mock.calls[0][0] as FakeUtterance;
    expect(utt.text).toBe("Гейм");
    expect(utt.lang).toBe("ru-RU");
    expect((utt.voice as SpeechSynthesisVoice).lang).toBe("ru-RU");
  });

  it("speak игнорирует пустой текст", async () => {
    const { speakFn } = installSpeech(makeVoices(["ru-RU"]));
    const { speak } = await import("@/lib/voice/speak");
    speak("");
    expect(speakFn).not.toHaveBeenCalled();
  });

  it("warmUp произносит беззвучную фразу", async () => {
    const { speakFn } = installSpeech(makeVoices(["ru-RU"]));
    const { warmUp } = await import("@/lib/voice/speak");
    warmUp();
    expect(speakFn).toHaveBeenCalledTimes(1);
    expect((speakFn.mock.calls[0][0] as FakeUtterance).volume).toBe(0);
  });

  it("кэширует найденный русский голос (getVoices вызывается один раз)", async () => {
    const voices = makeVoices(["ru-RU"]);
    const getVoices = vi.fn(() => voices);
    // @ts-expect-error — стаб браузерного API в jsdom
    global.SpeechSynthesisUtterance = FakeUtterance;
    // @ts-expect-error — стаб браузерного API в jsdom
    global.window.speechSynthesis = { speak: vi.fn(), getVoices };
    const { getRussianVoice } = await import("@/lib/voice/speak");
    getRussianVoice();
    getRussianVoice();
    expect(getVoices).toHaveBeenCalledTimes(1);
  });

  it("не кэширует отсутствие голоса — повторяет поиск", async () => {
    const getVoices = vi.fn(() => makeVoices(["en-US"]));
    // @ts-expect-error — стаб браузерного API в jsdom
    global.SpeechSynthesisUtterance = FakeUtterance;
    // @ts-expect-error — стаб браузерного API в jsdom
    global.window.speechSynthesis = { speak: vi.fn(), getVoices };
    const { getRussianVoice } = await import("@/lib/voice/speak");
    getRussianVoice();
    getRussianVoice();
    expect(getVoices).toHaveBeenCalledTimes(2);
  });

  it("предпочитает локальный русский голос сетевому", async () => {
    const voices = [
      { lang: "ru-RU", name: "net", localService: false },
      { lang: "ru-RU", name: "local", localService: true },
    ] as SpeechSynthesisVoice[];
    installSpeech(voices);
    const { getRussianVoice } = await import("@/lib/voice/speak");
    expect(getRussianVoice()?.name).toBe("local");
  });

  // --- cancelSpeech ---

  it("cancelSpeech вызывает speechSynthesis.cancel()", async () => {
    const { cancel } = installSpeech(makeVoices([]));
    const { cancelSpeech } = await import("@/lib/voice/speak");
    cancelSpeech();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("cancelSpeech — нет-оп без поддержки синтеза", async () => {
    // speechSynthesis не установлен (beforeEach его удаляет)
    const { cancelSpeech } = await import("@/lib/voice/speak");
    expect(() => cancelSpeech()).not.toThrow();
  });

  // --- voiceschanged обновляет кэш ---

  it("voiceschanged обновляет кэш голоса после холодного старта", async () => {
    const { fireVoicesChanged, setVoices } = installSpeech(makeVoices([]));
    const { getRussianVoice } = await import("@/lib/voice/speak");
    // Первый вызов: голоса пусты, кэш не записан, но слушатель подключён.
    expect(getRussianVoice()).toBeNull();
    setVoices(makeVoices(["ru-RU"]));
    fireVoicesChanged();
    // После события кэш обновлён.
    expect(getRussianVoice()?.lang).toBe("ru-RU");
  });

  // --- checkRussianVoice ---

  it("checkRussianVoice — cb(true) синхронно при наличии голоса", async () => {
    installSpeech(makeVoices(["ru-RU"]));
    const { checkRussianVoice } = await import("@/lib/voice/speak");
    let result: boolean | null = null;
    checkRussianVoice((found) => { result = found; });
    expect(result).toBe(true);
  });

  it("checkRussianVoice — cb(false) без поддержки синтеза", async () => {
    // speechSynthesis не установлен
    const { checkRussianVoice } = await import("@/lib/voice/speak");
    let result: boolean | null = null;
    checkRussianVoice((found) => { result = found; });
    expect(result).toBe(false);
  });

  it("checkRussianVoice — cb(true) после voiceschanged когда голос появился", async () => {
    const { fireVoicesChanged, setVoices } = installSpeech(makeVoices([]));
    const { checkRussianVoice } = await import("@/lib/voice/speak");
    let result: boolean | null = null;
    checkRussianVoice((found) => { result = found; });
    expect(result).toBeNull(); // ещё не вызван — ждём событие
    setVoices(makeVoices(["ru-RU"]));
    fireVoicesChanged(); // триггерим voiceschanged — должен вызвать cb(true)
    expect(result).toBe(true);
  });
});

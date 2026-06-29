export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickRussian(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const ru = voices.filter((v) => v.lang?.toLowerCase().startsWith("ru"));
  if (ru.length === 0) return null;
  // Локальный (офлайн) голос предпочтительнее сетевого.
  return ru.find((v) => v.localService) ?? ru[0];
}

let cached: SpeechSynthesisVoice | null = null;

/**
 * Лучший русский голос. Голоса грузятся асинхронно — ранние вызовы могут
 * вернуть null; найденный голос кэшируется, null не кэшируется (повторяем поиск).
 */
export function getRussianVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;
  if (cached) return cached;
  cached = pickRussian(window.speechSynthesis.getVoices());
  return cached;
}

export function speak(text: string): void {
  if (!isSpeechSupported() || !text) return;
  const u = new SpeechSynthesisUtterance(text);
  const v = getRussianVoice();
  if (v) u.voice = v;
  u.lang = "ru-RU";
  u.rate = 1;
  u.pitch = 1;
  window.speechSynthesis.speak(u);
}

/** «Разблокировка» синтеза в рамках пользовательского жеста (нужно для iOS Safari). */
export function warmUp(): void {
  if (!isSpeechSupported()) return;
  const u = new SpeechSynthesisUtterance(" ");
  u.volume = 0;
  window.speechSynthesis.speak(u);
}

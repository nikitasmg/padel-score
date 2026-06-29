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
let listenerAttached = false;

function ensureVoicesListener(): void {
  if (listenerAttached || !isSpeechSupported()) return;
  listenerAttached = true;
  window.speechSynthesis.addEventListener?.("voiceschanged", () => {
    cached = pickRussian(window.speechSynthesis.getVoices());
  });
}

/**
 * Лучший русский голос. Голоса грузятся асинхронно — ранние вызовы могут
 * вернуть null; найденный голос кэшируется, null не кэшируется (повторяем поиск).
 */
export function getRussianVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;
  ensureVoicesListener();
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

export function cancelSpeech(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
}

/**
 * Надёжная проверка русского голоса для кнопки «Проверить голос».
 * На холодной загрузке getVoices() пуст до события voiceschanged — поэтому
 * при отсутствии голоса ждём событие с таймаут-фолбэком.
 */
export function checkRussianVoice(cb: (found: boolean) => void, timeoutMs = 1500): void {
  if (!isSpeechSupported()) { cb(false); return; }
  if (getRussianVoice()) { cb(true); return; }
  let done = false;
  const finish = (found: boolean) => {
    if (done) return;
    done = true;
    window.speechSynthesis.removeEventListener?.("voiceschanged", onChange);
    cb(found);
  };
  const onChange = () => finish(getRussianVoice() !== null);
  window.speechSynthesis.addEventListener?.("voiceschanged", onChange);
  setTimeout(() => finish(getRussianVoice() !== null), timeoutMs);
}

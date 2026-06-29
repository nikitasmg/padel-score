# Голосовая озвучка трансляции — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Озвучивать ключевые моменты матча (гейм, сет, смена сторон, победа) на экране `/broadcast` через Web Speech API.

**Architecture:** Новый модуль `lib/voice/`: чистая функция фраз, обёртка над `speechSynthesis`, хук-настройка (localStorage) и хук-озвучивание поверх существующего `useScoreEvents`. UI-компонент `VoiceControl` монтирует хук озвучивания и даёт кнопку вкл/выкл + проверку русского голоса. Движок счёта и Service Worker не трогаем.

**Tech Stack:** Next 16 (App Router, webpack), React 19, TypeScript, Vitest (jsdom, globals), lucide-react, motion.

## Global Constraints

- Алиас импорта: `@/` → корень репозитория (и в коде, и в тестах).
- Тесты: Vitest с `globals: true` — `describe/it/expect` доступны без импорта, но в проекте их импортируют явно из `"vitest"`; следуй этому. Окружение `jsdom`.
- Запуск тестов: `npx vitest run <path>`.
- Коммиты по-русски, без подписи Claude, от имени пользователя.
- Озвучка по умолчанию ВЫКЛЮЧЕНА.
- Область — только `/broadcast`. Не менять `lib/padel/engine.ts`, `lib/padel/rules.ts`, `public/sw.js`.
- jsdom НЕ реализует `speechSynthesis` и `SpeechSynthesisUtterance` — в тестах их нужно стабить вручную.
- Корневой `<div>` страницы `/broadcast` имеет `onClick` → переход на `/match`; все интерактивные элементы озвучки обязаны вызывать `e.stopPropagation()`.

---

### Task 1: Фразы озвучки (`phrases.ts`)

Чистая функция «событие счёта + матч → список фраз». Без побочных эффектов, полностью покрывается тестами.

**Files:**
- Create: `lib/voice/phrases.ts`
- Test: `lib/voice/__tests__/phrases.test.ts`

**Interfaces:**
- Consumes: `ScoreEvent` из `@/lib/padel/scoreEvents`, `MatchState`/`TeamIndex` из `@/lib/padel/types`.
- Produces: `announcements(event: ScoreEvent, match: MatchState): string[]` — упорядоченный список фраз для произнесения (может быть пустым).

- [ ] **Step 1: Написать падающий тест**

Создать `lib/voice/__tests__/phrases.test.ts`:

```ts
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
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

Run: `npx vitest run lib/voice/__tests__/phrases.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/voice/phrases"`.

- [ ] **Step 3: Реализовать `lib/voice/phrases.ts`**

```ts
import type { ScoreEvent } from "@/lib/padel/scoreEvents";
import type { MatchState, TeamIndex } from "@/lib/padel/types";

function teamLabel(match: MatchState, t: TeamIndex): string {
  const names = match.teams[t].players.map((p) => p.name.trim()).filter(Boolean);
  if (names.length === 0) return `команда ${t + 1}`;
  return names.join(" и ");
}

/** Список фраз для произнесения по событию счёта. Приоритет: матч > сет > гейм; смена сторон — отдельно. */
export function announcements(event: ScoreEvent, match: MatchState): string[] {
  if (event.matchWon) {
    const t = (match.winner ?? event.setWonBy ?? event.gameWonBy) as TeamIndex | undefined;
    return t === undefined ? [] : [`Матч! ${teamLabel(match, t)} побеждают`];
  }

  const out: string[] = [];
  if (event.setWonBy !== undefined) out.push(`Сет, ${teamLabel(match, event.setWonBy)}`);
  else if (event.gameWonBy !== undefined) out.push(`Гейм, ${teamLabel(match, event.gameWonBy)}`);
  if (event.endsChanged) out.push("Смена сторон");
  return out;
}
```

- [ ] **Step 4: Запустить тест, убедиться что проходит**

Run: `npx vitest run lib/voice/__tests__/phrases.test.ts`
Expected: PASS (7 тестов).

- [ ] **Step 5: Коммит**

```bash
git add lib/voice/phrases.ts lib/voice/__tests__/phrases.test.ts
git commit -m "Озвучка: фразы по событиям счёта"
```

---

### Task 2: Обёртка над speechSynthesis (`speak.ts`)

**Files:**
- Create: `lib/voice/speak.ts`
- Test: `lib/voice/__tests__/speak.test.ts`

**Interfaces:**
- Produces:
  - `isSpeechSupported(): boolean`
  - `getRussianVoice(): SpeechSynthesisVoice | null`
  - `speak(text: string): void`
  - `warmUp(): void`

- [ ] **Step 1: Написать падающий тест**

Создать `lib/voice/__tests__/speak.test.ts`. jsdom не даёт Web Speech API — стабим его вручную:

```ts
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
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

Run: `npx vitest run lib/voice/__tests__/speak.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/voice/speak"`.

- [ ] **Step 3: Реализовать `lib/voice/speak.ts`**

```ts
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
```

- [ ] **Step 4: Запустить тест, убедиться что проходит**

Run: `npx vitest run lib/voice/__tests__/speak.test.ts`
Expected: PASS (6 тестов).

- [ ] **Step 5: Коммит**

```bash
git add lib/voice/speak.ts lib/voice/__tests__/speak.test.ts
git commit -m "Озвучка: обёртка над speechSynthesis и выбор русского голоса"
```

---

### Task 3: Настройка вкл/выкл с сохранением (`useVoiceSetting.ts`)

**Files:**
- Create: `lib/voice/useVoiceSetting.ts`
- Test: `lib/voice/__tests__/useVoiceSetting.test.ts`

**Interfaces:**
- Produces: `useVoiceSetting(): [boolean, (v: boolean) => void]` — состояние (по умолчанию `false`, читается из localStorage на маунте) и сеттер (пишет в localStorage).

- [ ] **Step 1: Написать падающий тест**

Создать `lib/voice/__tests__/useVoiceSetting.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useVoiceSetting } from "@/lib/voice/useVoiceSetting";

beforeEach(() => localStorage.clear());

describe("useVoiceSetting", () => {
  it("по умолчанию выключено", () => {
    const { result } = renderHook(() => useVoiceSetting());
    expect(result.current[0]).toBe(false);
  });

  it("сеттер включает и сохраняет в localStorage", () => {
    const { result } = renderHook(() => useVoiceSetting());
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem("padel:voice-enabled")).toBe("1");
  });

  it("читает сохранённое значение на маунте", () => {
    localStorage.setItem("padel:voice-enabled", "1");
    const { result } = renderHook(() => useVoiceSetting());
    expect(result.current[0]).toBe(true);
  });
});
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

Run: `npx vitest run lib/voice/__tests__/useVoiceSetting.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/voice/useVoiceSetting"`.

- [ ] **Step 3: Реализовать `lib/voice/useVoiceSetting.ts`**

```ts
"use client";
import { useEffect, useState } from "react";

const KEY = "padel:voice-enabled";

/** Вкл/выкл озвучки с сохранением в localStorage. По умолчанию выключено. */
export function useVoiceSetting(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabled] = useState(false);

  // Читаем в эффекте, а не в инициализаторе useState — чтобы не было рассинхрона при SSR-гидратации.
  useEffect(() => {
    setEnabled(localStorage.getItem(KEY) === "1");
  }, []);

  const update = (v: boolean) => {
    setEnabled(v);
    try {
      localStorage.setItem(KEY, v ? "1" : "0");
    } catch {
      // localStorage может быть недоступен (приватный режим) — игнорируем.
    }
  };

  return [enabled, update];
}
```

- [ ] **Step 4: Запустить тест, убедиться что проходит**

Run: `npx vitest run lib/voice/__tests__/useVoiceSetting.test.ts`
Expected: PASS (3 теста).

- [ ] **Step 5: Коммит**

```bash
git add lib/voice/useVoiceSetting.ts lib/voice/__tests__/useVoiceSetting.test.ts
git commit -m "Озвучка: настройка вкл/выкл с сохранением"
```

---

### Task 4: Хук озвучивания событий (`useVoiceAnnouncements.ts`)

Связывает `useScoreEvents`, `phrases` и `speak`. Произносит фразы при изменении счёта, страж по `pointSeq` против дублей.

**Files:**
- Create: `lib/voice/useVoiceAnnouncements.ts`
- Test: `lib/voice/__tests__/useVoiceAnnouncements.test.ts`

**Interfaces:**
- Consumes: `useScoreEvents` из `@/lib/padel/useScoreEvents` (`{ event, pointSeq }`), `announcements` из `./phrases`, `speak` из `./speak`.
- Produces: `useVoiceAnnouncements(match: MatchState, enabled: boolean): void`.

Драйвер — `pointSeq` (растёт на каждом разыгранном мяче, включая смену сторон в тай-брейке без выигрыша гейма). `seq` из `useScoreEvents` для этого не годится: он не растёт на смене сторон внутри тай-брейка.

- [ ] **Step 1: Написать падающий тест**

Создать `lib/voice/__tests__/useVoiceAnnouncements.test.ts`. `speak` мокаем, чтобы проверять вызовы без браузерного API:

```ts
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
    rerender({ m: m1 });
    expect(speak).toHaveBeenCalledTimes(1);
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
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

Run: `npx vitest run lib/voice/__tests__/useVoiceAnnouncements.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/voice/useVoiceAnnouncements"`.

- [ ] **Step 3: Реализовать `lib/voice/useVoiceAnnouncements.ts`**

```ts
"use client";
import { useEffect, useRef } from "react";
import { useScoreEvents } from "@/lib/padel/useScoreEvents";
import type { MatchState } from "@/lib/padel/types";
import { announcements } from "./phrases";
import { speak } from "./speak";

/** Произносит фразы при крупных событиях счёта. Страж по pointSeq — против дублей (ре-рендеры, StrictMode). */
export function useVoiceAnnouncements(match: MatchState, enabled: boolean): void {
  const { event, pointSeq } = useScoreEvents(match);
  const lastSpoken = useRef(0);

  useEffect(() => {
    // Пока выключено — держим указатель на текущем pointSeq, чтобы при включении
    // не «переиграть» последнее событие.
    if (!enabled) {
      lastSpoken.current = pointSeq;
      return;
    }
    if (pointSeq === 0 || pointSeq === lastSpoken.current) return;
    lastSpoken.current = pointSeq;
    for (const text of announcements(event, match)) speak(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointSeq, enabled]);
}
```

- [ ] **Step 4: Запустить тест, убедиться что проходит**

Run: `npx vitest run lib/voice/__tests__/useVoiceAnnouncements.test.ts`
Expected: PASS (4 теста).

- [ ] **Step 5: Коммит**

```bash
git add lib/voice/useVoiceAnnouncements.ts lib/voice/__tests__/useVoiceAnnouncements.test.ts
git commit -m "Озвучка: хук объявлений по событиям счёта"
```

---

### Task 5: UI-компонент `VoiceControl`

Кнопка вкл/выкл, проверка русского голоса, монтаж хука озвучивания. Стиль — как угловые индикаторы трансляции (ср. блок «Геймпад» в `app/broadcast/page.tsx`).

**Files:**
- Create: `components/VoiceControl.tsx`
- Test: `components/__tests__/VoiceControl.test.tsx`

**Interfaces:**
- Consumes: `useVoiceSetting`, `useVoiceAnnouncements`, `isSpeechSupported`/`getRussianVoice`/`speak`/`warmUp` из `@/lib/voice/*`; `MatchState`.
- Produces: `VoiceControl({ match }: { match: MatchState }): JSX.Element | null`.

- [ ] **Step 1: Написать падающий тест**

Создать `components/__tests__/VoiceControl.test.tsx`. Хук озвучивания и speak-модуль мокаем; `isSpeechSupported` переключаем по тестам:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { MatchState, Team } from "@/lib/padel/types";

const voiceMocks = {
  isSpeechSupported: vi.fn(() => true),
  getRussianVoice: vi.fn(() => ({ lang: "ru-RU" })),
  speak: vi.fn(),
  warmUp: vi.fn(),
};
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
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

Run: `npx vitest run components/__tests__/VoiceControl.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/VoiceControl"`.

- [ ] **Step 3: Реализовать `components/VoiceControl.tsx`**

```tsx
"use client";
import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { MatchState } from "@/lib/padel/types";
import { useVoiceSetting } from "@/lib/voice/useVoiceSetting";
import { useVoiceAnnouncements } from "@/lib/voice/useVoiceAnnouncements";
import { isSpeechSupported, getRussianVoice, speak, warmUp } from "@/lib/voice/speak";

/**
 * Угловой контрол озвучки на трансляции: тумблер вкл/выкл и проверка русского голоса.
 * stopPropagation обязателен — корень /broadcast по клику уходит на /match.
 */
export function VoiceControl({ match }: { match: MatchState }) {
  const [enabled, setEnabled] = useVoiceSetting();
  const [voiceFound, setVoiceFound] = useState<boolean | null>(null);
  useVoiceAnnouncements(match, enabled);

  if (!isSpeechSupported()) return null;

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    warmUp(); // разблокировка синтеза тем же жестом (iOS)
    setEnabled(!enabled);
  };

  const test = (e: React.MouseEvent) => {
    e.stopPropagation();
    warmUp();
    setVoiceFound(getRussianVoice() !== null);
    speak("Проверка озвучки, гейм за командой один");
  };

  return (
    <div className="absolute bottom-5 right-10 flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={enabled}
        className={`flex items-center gap-2 font-mono font-semibold text-[12px] ${enabled ? "text-accent" : "text-muted3"}`}
      >
        {enabled ? <Volume2 className="w-[14px] h-[14px]" /> : <VolumeX className="w-[14px] h-[14px]" />}
        Озвучка
      </button>
      <button
        type="button"
        onClick={test}
        className="font-mono text-[11px] text-muted3 underline underline-offset-2"
      >
        Проверить голос
      </button>
      {voiceFound === false && (
        <span className="font-mono text-[11px] text-live">русский голос недоступен</span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Запустить тест, убедиться что проходит**

Run: `npx vitest run components/__tests__/VoiceControl.test.tsx`
Expected: PASS (3 теста).

- [ ] **Step 5: Коммит**

```bash
git add components/VoiceControl.tsx components/__tests__/VoiceControl.test.tsx
git commit -m "Озвучка: угловой контрол на трансляции"
```

---

### Task 6: Подключить контрол на экран трансляции

**Files:**
- Modify: `app/broadcast/page.tsx`

**Interfaces:**
- Consumes: `VoiceControl` из `@/components/VoiceControl`.

- [ ] **Step 1: Импортировать компонент**

В шапке `app/broadcast/page.tsx`, рядом с импортом `BroadcastEffects`, добавить:

```tsx
import { VoiceControl } from "@/components/VoiceControl";
```

- [ ] **Step 2: Отрендерить контрол в основном (landscape) виде**

В основном `return` страницы, сразу после `<BroadcastEffects match={match} />`, добавить:

```tsx
      <VoiceControl match={match} />
```

- [ ] **Step 3: Прогнать весь набор тестов и линт**

Run: `npm test && npm run lint`
Expected: все тесты PASS, линт без ошибок.

- [ ] **Step 4: Ручная проверка на устройстве**

Запустить `npm run dev`, открыть `/broadcast` в landscape (на телефоне или эмуляции):
1. В правом нижнем углу видна «Озвучка» (выключена) и «Проверить голос».
2. Тап «Проверить голос» → слышна русская фраза; если голоса нет — появляется «русский голос недоступен». (Главная проверка жизнеспособности русского TTS.)
3. Тап «Озвучка» → становится зелёной (включена), состояние сохраняется после перезагрузки страницы.
4. Свести гейм/сет/смену сторон (геймпадом или через `/match`) → слышны соответствующие объявления.
5. Тап по фону трансляции по-прежнему уводит на `/match` (контрол не перехватывает фоновый клик мимо кнопок).

- [ ] **Step 5: Коммит**

```bash
git add app/broadcast/page.tsx
git commit -m "Трансляция: подключение голосовой озвучки"
```

---

## Self-Review (выполнено при написании)

- **Покрытие спеки:** speak.ts (Task 2), phrases.ts (Task 1), useVoiceAnnouncements (Task 4), настройка localStorage (Task 3), UI-тумблер + «Проверить голос» + статус голоса (Task 5), подключение к /broadcast и ручная проверка (Task 6). SW/движок не трогаются — отражено в Global Constraints. Приоритет матч>сет>гейм и смена сторон отдельно — Task 1. Дефолт «выключено» — Task 3. Страж от дублей — Task 4.
- **Плейсхолдеры:** не обнаружены — во всех шагах полный код и команды.
- **Согласованность типов:** `announcements(event, match): string[]`, `speak(text)`, `getRussianVoice()`, `useVoiceSetting(): [boolean, fn]`, `useVoiceAnnouncements(match, enabled)` — имена и сигнатуры совпадают между задачами и тестами.
- **Замечание по тай-брейку:** хук намеренно завязан на `pointSeq` (а не `seq`), чтобы ловить смену сторон внутри тай-брейка.

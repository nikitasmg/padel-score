# Геймпад-кликер + чистка макета — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Управлять счётом активного падел-матча с игрового геймпада (DualShock 4) через Gamepad API в iOS PWA, плюс убрать бутафорию «вид телефона» из макета.

**Architecture:** Чистые модули (`poll`, `mapping`, `finishMatch`) с юнит-тестами; React-хуки (`useGamepad`, `useWakeLock`) — тонкие обёртки над браузерными API; глобальный `GamepadController` в layout связывает нажатия со стором матча. UI-страницы переводятся на полную ширину.

**Tech Stack:** Next.js 16 (App Router), React 19, Zustand (persist), Vitest, TypeScript, Tailwind v4.

## Global Constraints

- Тесты на русском языке в стиле существующих (`describe`/`it` с русскими строками).
- Импорты через алиас `@/` (см. `tsconfig.json`).
- Клиентские модули с React-хуками/`window` начинаются с `"use client"`.
- Коммиты по-русски, без подписи Claude, от имени пользователя.
- Раскладка DualShock 4 (standard mapping): **L1 = `buttons[4]`**, **R1 = `buttons[5]`**, **✕/Cross = `buttons[0]`**.
- Gamepad API только при активной вкладке/включённом экране (опрос через `requestAnimationFrame`).
- Уровень заряда геймпада недоступен в WebKit — нигде не показываем.

---

### Task 1: Чистая функция определения победителя `finishMatch`

**Files:**
- Modify: `lib/padel/engine.ts`
- Test: `lib/padel/__tests__/engine.test.ts`

**Interfaces:**
- Consumes: `MatchState`, `TeamIndex` из `./types`; внутренний `snapshot(state)`.
- Produces: `finishMatch(state: MatchState): MatchState` — ставит `status="completed"`, `winner` по приоритету sets → games[currentSet] → points; при полном равенстве `winner=undefined`. Пишет снапшот в `history` (undo работает).

- [ ] **Step 1: Написать падающий тест**

В конец `lib/padel/__tests__/engine.test.ts` добавить (импорт обновить: `import { createMatch, scorePoint, undo, finishMatch } from "@/lib/padel/engine";`):

```ts
describe("finishMatch — ручное завершение", () => {
  it("победитель по большему числу сетов", () => {
    let s = m();
    s.score[0].sets = 1;
    const r = finishMatch(s);
    expect(r.status).toBe("completed");
    expect(r.winner).toBe(0);
  });

  it("при равных сетах — по геймам текущего сета", () => {
    let s = m();
    s.score[0].games[0] = 3;
    s.score[1].games[0] = 1;
    expect(finishMatch(s).winner).toBe(0);
  });

  it("при равных сетах и геймах — по очкам", () => {
    let s = m();
    s.score[1].points = 2;
    expect(finishMatch(s).winner).toBe(1);
  });

  it("полное равенство — ничья (winner undefined)", () => {
    const r = finishMatch(m());
    expect(r.status).toBe("completed");
    expect(r.winner).toBeUndefined();
  });

  it("завершение можно отменить через undo", () => {
    const s = m();
    const r = finishMatch(s);
    expect(undo(r).status).toBe("in_progress");
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npx vitest run lib/padel/__tests__/engine.test.ts`
Expected: FAIL — `finishMatch is not a function` / не экспортирована.

- [ ] **Step 3: Реализовать `finishMatch`**

В `lib/padel/engine.ts` добавить функцию (после `resetMatch`):

```ts
export function finishMatch(state: MatchState): MatchState {
  if (state.status === "completed") return state;
  const s: MatchState = { ...snapshot(state), history: [...state.history, snapshot(state)] };
  const [a, b] = s.score;
  let winner: TeamIndex | undefined;
  if (a.sets !== b.sets) {
    winner = a.sets > b.sets ? 0 : 1;
  } else {
    const ga = a.games[s.currentSet] ?? 0;
    const gb = b.games[s.currentSet] ?? 0;
    if (ga !== gb) winner = ga > gb ? 0 : 1;
    else if (a.points !== b.points) winner = a.points > b.points ? 0 : 1;
    else winner = undefined;
  }
  s.status = "completed";
  s.winner = winner;
  return s;
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npx vitest run lib/padel/__tests__/engine.test.ts`
Expected: PASS (все тесты, включая новые).

- [ ] **Step 5: Коммит**

```bash
git add lib/padel/engine.ts lib/padel/__tests__/engine.test.ts
git commit -m "Добавить finishMatch: ручное завершение матча с победителем по счёту"
```

---

### Task 2: Обновить сторы (matchStore.finish, clickerStore под геймпад)

**Files:**
- Modify: `store/matchStore.ts`
- Modify: `store/clickerStore.ts`

**Interfaces:**
- Consumes: `finishMatch` из `@/lib/padel/engine`.
- Produces:
  - `useMatchStore` — добавлен `finish: () => void`.
  - `useClickerStore` — поля `connected: boolean` (старт `false`), `gamepadId: string | null`; сеттеры `setConnected(v)`, `setGamepadId(v)`; **удалён `battery`**; сохранены `buttonMode`, `holder`, `lastEvent`, `setMode`, `setHolder`, `setLastEvent`.

- [ ] **Step 1: matchStore — добавить `finish`**

В `store/matchStore.ts`: в импорт движка добавить `finishMatch`:

```ts
import { createMatch, scorePoint, undo, resetMatch, finishMatch } from "@/lib/padel/engine";
```

В интерфейс `MatchStore` после `undoPoint` добавить:

```ts
  finish: () => void;
```

В реализацию после `undoPoint` добавить:

```ts
      finish: () => { const m = get().match; if (m) set({ match: finishMatch(m) }); },
```

- [ ] **Step 2: clickerStore — заменить заглушки на реальные поля**

Заменить целиком содержимое `store/clickerStore.ts`:

```ts
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TeamIndex } from "@/lib/padel/types";

interface ClickerStore {
  buttonMode: "two" | "one";
  holder: { team: TeamIndex; player: 0 | 1 };
  connected: boolean;
  gamepadId: string | null;
  lastEvent: string | null;
  setMode: (m: "two" | "one") => void;
  setHolder: (h: { team: TeamIndex; player: 0 | 1 }) => void;
  setLastEvent: (e: string) => void;
  setConnected: (v: boolean) => void;
  setGamepadId: (v: string | null) => void;
}

export const useClickerStore = create<ClickerStore>()(
  persist(
    (set) => ({
      buttonMode: "two",
      holder: { team: 0, player: 0 },
      connected: false,
      gamepadId: null,
      lastEvent: null,
      setMode: (buttonMode) => set({ buttonMode }),
      setHolder: (holder) => set({ holder }),
      setLastEvent: (lastEvent) => set({ lastEvent }),
      setConnected: (connected) => set({ connected }),
      setGamepadId: (gamepadId) => set({ gamepadId }),
    }),
    {
      name: "rally-clicker",
      // connected/gamepadId — рантайм-состояние, не персистим.
      partialize: (s) => ({ buttonMode: s.buttonMode, holder: s.holder }),
    },
  ),
);
```

- [ ] **Step 3: Проверка типов**

Run: `npx tsc --noEmit`
Expected: ошибки **только** в местах, где ещё используется `battery` (`app/match/page.tsx`, `app/broadcast/page.tsx`, `components/ScoreButtons.tsx`) — их чиним в Task 8–10. Других ошибок быть не должно.

- [ ] **Step 4: Коммит**

```bash
git add store/matchStore.ts store/clickerStore.ts
git commit -m "Сторы: finish для матча, реальные поля геймпада вместо заглушек батареи"
```

---

### Task 3: Чистая логика опроса геймпада (`poll.ts`)

**Files:**
- Create: `lib/gamepad/poll.ts`
- Test: `lib/gamepad/__tests__/poll.test.ts`

**Interfaces:**
- Produces:
  - `readButtons(gp: Gamepad): boolean[]` — массив `pressed` по кнопкам.
  - `detectButtonDowns(prev: boolean[], curr: boolean[]): number[]` — индексы кнопок, перешедших false→true (edge-detection).

- [ ] **Step 1: Написать падающий тест**

Create `lib/gamepad/__tests__/poll.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readButtons, detectButtonDowns } from "@/lib/gamepad/poll";

describe("readButtons", () => {
  it("читает pressed по всем кнопкам", () => {
    const gp = { buttons: [{ pressed: false }, { pressed: true }] } as unknown as Gamepad;
    expect(readButtons(gp)).toEqual([false, true]);
  });
});

describe("detectButtonDowns", () => {
  it("ловит переход false→true", () => {
    expect(detectButtonDowns([false, false], [false, true])).toEqual([1]);
  });

  it("зажатие не триггерит повтор", () => {
    expect(detectButtonDowns([true], [true])).toEqual([]);
  });

  it("отпускание не считается нажатием", () => {
    expect(detectButtonDowns([true], [false])).toEqual([]);
  });

  it("пустой prev (первый кадр) ловит уже нажатую кнопку", () => {
    expect(detectButtonDowns([], [true])).toEqual([0]);
  });

  it("несколько одновременных нажатий", () => {
    expect(detectButtonDowns([false, false, false], [true, false, true])).toEqual([0, 2]);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npx vitest run lib/gamepad/__tests__/poll.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `poll.ts`**

Create `lib/gamepad/poll.ts`:

```ts
export function readButtons(gp: Gamepad): boolean[] {
  return gp.buttons.map((b) => b.pressed);
}

export function detectButtonDowns(prev: boolean[], curr: boolean[]): number[] {
  const downs: number[] = [];
  for (let i = 0; i < curr.length; i++) {
    if (curr[i] && !prev[i]) downs.push(i);
  }
  return downs;
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npx vitest run lib/gamepad/__tests__/poll.test.ts`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add lib/gamepad/poll.ts lib/gamepad/__tests__/poll.test.ts
git commit -m "Добавить чистый опрос геймпада: readButtons и edge-detection"
```

---

### Task 4: Маппинг кнопки → действие (`mapping.ts`)

**Files:**
- Create: `lib/gamepad/mapping.ts`
- Test: `lib/gamepad/__tests__/mapping.test.ts`

**Interfaces:**
- Produces:
  - `type ClickerAction = "pointA" | "pointB" | "undo";`
  - `buttonToAction(index: number): ClickerAction | null` — L1(4)→pointA, R1(5)→pointB, Cross(0)→undo, иначе null.
  - `EVENT_LABEL: Record<ClickerAction, string>` — подписи для `lastEvent`.

- [ ] **Step 1: Написать падающий тест**

Create `lib/gamepad/__tests__/mapping.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buttonToAction } from "@/lib/gamepad/mapping";

describe("buttonToAction", () => {
  it("L1 (4) → очко A", () => expect(buttonToAction(4)).toBe("pointA"));
  it("R1 (5) → очко B", () => expect(buttonToAction(5)).toBe("pointB"));
  it("Cross (0) → отмена", () => expect(buttonToAction(0)).toBe("undo"));
  it("незамапленная кнопка → null", () => expect(buttonToAction(3)).toBeNull());
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npx vitest run lib/gamepad/__tests__/mapping.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `mapping.ts`**

Create `lib/gamepad/mapping.ts`:

```ts
export type ClickerAction = "pointA" | "pointB" | "undo";

const BUTTON_CROSS = 0;
const BUTTON_L1 = 4;
const BUTTON_R1 = 5;

export function buttonToAction(index: number): ClickerAction | null {
  switch (index) {
    case BUTTON_L1: return "pointA";
    case BUTTON_R1: return "pointB";
    case BUTTON_CROSS: return "undo";
    default: return null;
  }
}

export const EVENT_LABEL: Record<ClickerAction, string> = {
  pointA: "L1 · +1 команде A",
  pointB: "R1 · +1 команде B",
  undo: "✕ · отмена последнего",
};
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npx vitest run lib/gamepad/__tests__/mapping.test.ts`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add lib/gamepad/mapping.ts lib/gamepad/__tests__/mapping.test.ts
git commit -m "Добавить маппинг кнопок геймпада на действия счёта"
```

---

### Task 5: Хук `useGamepad` (опрос rAF)

**Files:**
- Create: `lib/gamepad/useGamepad.ts`

**Interfaces:**
- Consumes: `readButtons`, `detectButtonDowns` из `./poll`.
- Produces: `useGamepad(onButtonDown: (index: number) => void): { connected: boolean; gamepadId: string | null }`.

Браузерный API — проверяем типами и сборкой, юнит-тест ядра уже в Task 3.

- [ ] **Step 1: Реализовать хук**

Create `lib/gamepad/useGamepad.ts`:

```ts
"use client";
import { useEffect, useRef, useState } from "react";
import { readButtons, detectButtonDowns } from "./poll";

export function useGamepad(onButtonDown: (index: number) => void) {
  const [connected, setConnected] = useState(false);
  const [gamepadId, setGamepadId] = useState<string | null>(null);
  const cbRef = useRef(onButtonDown);
  cbRef.current = onButtonDown;

  useEffect(() => {
    let raf = 0;
    let prev: boolean[] = [];
    let live = false; // локальное зеркало connected, чтобы не дёргать setState каждый кадр

    const sync = (on: boolean, id: string | null) => {
      if (on === live) return;
      live = on;
      setConnected(on);
      setGamepadId(on ? id : null);
      if (!on) prev = [];
    };

    const onConnect = (e: GamepadEvent) => sync(true, e.gamepad.id);
    const onDisconnect = () => sync(false, null);
    window.addEventListener("gamepadconnected", onConnect);
    window.addEventListener("gamepaddisconnected", onDisconnect);

    const loop = () => {
      const pads = navigator.getGamepads?.() ?? [];
      const gp = Array.from(pads).find((p): p is Gamepad => p != null) ?? null;
      if (gp) {
        sync(true, gp.id);
        const curr = readButtons(gp);
        for (const i of detectButtonDowns(prev, curr)) cbRef.current(i);
        prev = curr;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("gamepadconnected", onConnect);
      window.removeEventListener("gamepaddisconnected", onDisconnect);
    };
  }, []);

  return { connected, gamepadId };
}
```

- [ ] **Step 2: Проверка типов**

Run: `npx tsc --noEmit`
Expected: без новых ошибок в `lib/gamepad/useGamepad.ts` (остаются только ожидаемые ошибки `battery` из Task 2).

- [ ] **Step 3: Коммит**

```bash
git add lib/gamepad/useGamepad.ts
git commit -m "Добавить хук useGamepad: опрос геймпада через requestAnimationFrame"
```

---

### Task 6: Хук `useWakeLock` (экран не гаснет)

**Files:**
- Create: `lib/gamepad/useWakeLock.ts`

**Interfaces:**
- Produces: `useWakeLock(active: boolean): void` — при `active` держит Wake Lock экрана, переполучает на `visibilitychange`, graceful degradation если API нет.

- [ ] **Step 1: Реализовать хук**

Create `lib/gamepad/useWakeLock.ts`:

```ts
"use client";
import { useEffect } from "react";

export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
      } catch {
        // экран нельзя удержать (нет жеста/поддержки) — молча игнорируем
      }
    };

    const onVisible = () => {
      if (!cancelled && document.visibilityState === "visible") void request();
    };

    void request();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);
}
```

- [ ] **Step 2: Проверка типов**

Run: `npx tsc --noEmit`
Expected: без новых ошибок в `useWakeLock.ts`.

> Если `WakeLockSentinel` / `navigator.wakeLock` не найдены в типах — добавить в `lib` массив tsconfig значение `"dom"` уже есть; типы есть в TS ≥4.4. При отсутствии — заменить тип `sentinel` на `any` и оставить комментарий.

- [ ] **Step 3: Коммит**

```bash
git add lib/gamepad/useWakeLock.ts
git commit -m "Добавить хук useWakeLock: удержание экрана во время матча"
```

---

### Task 7: Связующий `GamepadController` + монтаж в layout

**Files:**
- Create: `components/GamepadController.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `useGamepad`, `useWakeLock`, `buttonToAction`, `EVENT_LABEL`, `useMatchStore`, `useClickerStore`.
- Produces: `<GamepadController />` (рендерит `null`), смонтирован в `body` layout.

- [ ] **Step 1: Реализовать компонент**

Create `components/GamepadController.tsx`:

```tsx
"use client";
import { useCallback, useEffect } from "react";
import { useGamepad } from "@/lib/gamepad/useGamepad";
import { useWakeLock } from "@/lib/gamepad/useWakeLock";
import { buttonToAction, EVENT_LABEL } from "@/lib/gamepad/mapping";
import { useMatchStore } from "@/store/matchStore";
import { useClickerStore } from "@/store/clickerStore";

export function GamepadController() {
  const setConnected = useClickerStore((s) => s.setConnected);
  const setGamepadId = useClickerStore((s) => s.setGamepadId);
  const setLastEvent = useClickerStore((s) => s.setLastEvent);
  const matchActive = useMatchStore((s) => s.match?.status === "in_progress");

  const handleButtonDown = useCallback(
    (index: number) => {
      const action = buttonToAction(index);
      if (!action) return;
      const { match, point, undoPoint } = useMatchStore.getState();
      if (!match || match.status !== "in_progress") return;
      if (action === "pointA") point(0);
      else if (action === "pointB") point(1);
      else undoPoint();
      setLastEvent(EVENT_LABEL[action]);
    },
    [setLastEvent],
  );

  const { connected, gamepadId } = useGamepad(handleButtonDown);

  useEffect(() => setConnected(connected), [connected, setConnected]);
  useEffect(() => setGamepadId(gamepadId), [gamepadId, setGamepadId]);

  useWakeLock(Boolean(matchActive));

  return null;
}
```

- [ ] **Step 2: Смонтировать в layout**

В `app/layout.tsx` импортировать и отрендерить компонент внутри `body`:

```tsx
import { GamepadController } from "@/components/GamepadController";
```

Заменить строку body на:

```tsx
      <body className="bg-bg text-ink font-display antialiased">
        <GamepadController />
        {children}
      </body>
```

- [ ] **Step 3: Проверка типов**

Run: `npx tsc --noEmit`
Expected: без новых ошибок в `GamepadController.tsx`/`layout.tsx`.

- [ ] **Step 4: Коммит**

```bash
git add components/GamepadController.tsx app/layout.tsx
git commit -m "Подключить GamepadController глобально: геймпад управляет счётом матча"
```

---

### Task 8: Убрать «вид телефона», контент на всю ширину

**Files:**
- Delete: `components/PhoneScreen.tsx`, `components/StatusBar.tsx`
- Modify: `app/globals.css`
- Modify: `app/page.tsx`, `app/clicker/page.tsx`

**Interfaces:**
- Consumes: ничего нового.
- Produces: страницы `/` и `/clicker` без обёртки `PhoneScreen`, на всю ширину; фон-градиент на `body`.

- [ ] **Step 1: Перенести фон-градиент на body**

В `app/globals.css` добавить (в правило для `body`; если правила нет — создать):

```css
body {
  background:
    radial-gradient(130% 70% at 50% -5%, rgba(198, 242, 78, 0.1), transparent 55%),
    #0a0b0a;
  min-height: 100vh;
}
```

- [ ] **Step 2: Переписать `app/page.tsx` без PhoneScreen**

Удалить импорт `import { PhoneScreen } from "@/components/PhoneScreen";`. В `return` заменить внешнюю обёртку: было `<PhoneScreen>` … `</PhoneScreen>`, стало `<div className="w-full">` … `</div>`. Внутреннему контейнеру заменить `min-h-[calc(100vh-36px)]` на `min-h-screen`:

```tsx
  return (
    <div className="w-full">
      <div className="px-[22px] pt-[30px] min-h-screen flex flex-col">
        {/* ...всё содержимое без изменений... */}
      </div>
    </div>
  );
```

- [ ] **Step 3: Переписать `app/clicker/page.tsx` без PhoneScreen**

Удалить импорт `PhoneScreen`. Заменить обёртку `<PhoneScreen>...</PhoneScreen>` на `<div className="w-full">...</div>`. Внутренний `div` (`px-[22px] pt-[30px]`) оставить как есть.

- [ ] **Step 4: Удалить компоненты макета**

```bash
git rm components/PhoneScreen.tsx components/StatusBar.tsx
```

- [ ] **Step 5: Проверка типов и сборки**

Run: `npx tsc --noEmit`
Expected: нет ошибок про `PhoneScreen`/`StatusBar` (ни один файл их больше не импортирует). Ожидаемые ошибки `battery` всё ещё в `match`/`broadcast`/`ScoreButtons` — чиним дальше.

- [ ] **Step 6: Коммит**

```bash
git add -A
git commit -m "Убрать бутафорию вида телефона, контент на всю ширину"
```

---

### Task 9: `/clicker` — реальный статус геймпада

**Files:**
- Modify: `app/clicker/page.tsx`

**Interfaces:**
- Consumes: `useClickerStore` (`connected`, `gamepadId`, `lastEvent`, `setHolder`, `setMode`, `buttonMode`, `holder`).
- Produces: карточка устройства показывает `gamepadId` и статус подключения; блок раскладки отражает L1/R1/✕; тестовый блок показывает реальный `lastEvent`.

- [ ] **Step 1: Подключить реальные поля и статус устройства**

В `app/clicker/page.tsx`:

- В деструктуризации заменить `battery` на `connected, gamepadId`:

```tsx
  const { buttonMode, holder, connected, gamepadId, lastEvent, setMode, setHolder } = useClickerStore();
```

- В карточке устройства заменить индикатор статуса (строки с «Подключён»/анимацией) на условный:

```tsx
          <div className="absolute top-[18px] right-5 flex items-center gap-[7px]">
            <div className={`w-2 h-2 rounded-full ${connected ? "bg-accent animate-pulse2" : "bg-muted3"}`} />
            <span className="font-mono font-semibold text-[11px] tracking-[.1em] uppercase text-accent">
              {connected ? "Подключён" : "Нажмите любую кнопку"}
            </span>
          </div>
```

- Заменить название устройства и подпись (блок с «Padel Clicker P1» / «2 кнопки · BLE» / батареей) на:

```tsx
            <div>
              <div className="font-display font-bold text-[19px] text-ink">{gamepadId ?? "Геймпад не найден"}</div>
              <div className="font-display font-medium text-[13px] text-muted mt-[3px]">Gamepad API · L1/R1</div>
              <div className={`font-mono font-semibold text-[12px] mt-[14px] ${connected ? "text-accent" : "text-muted2"}`}>
                {connected ? "Готов к работе" : "Подключите геймпад и нажмите кнопку"}
              </div>
            </div>
```

(Удалить разметку индикатора батареи целиком.)

- [ ] **Step 2: Обновить блок назначения кнопок**

Заменить две строки режима на фактическую раскладку (статичное описание, без переключателя «1 кнопка»):

```tsx
        <div className="font-mono font-semibold text-[11px] tracking-[.14em] uppercase text-muted2 mb-3">Назначение кнопок</div>
        <div className="flex flex-col gap-2.5 mb-[22px]">
          <ModeRow active title="L1 — очко команде A" subtitle="Верхняя левая кнопка" onClick={() => {}} />
          <ModeRow active title="R1 — очко команде B" subtitle="Верхняя правая кнопка" onClick={() => {}} />
          <ModeRow active title="✕ — отменить последнее" subtitle="Нижняя кнопка" onClick={() => {}} />
        </div>
```

(Если `setMode`/`buttonMode` больше не используются — убрать из деструктуризации, чтобы не было предупреждений неиспользуемых переменных. Хелперы `Hint` удалить, если не используются.)

- [ ] **Step 3: Тестовый блок — реальный lastEvent**

Заменить тестовую кнопку (с `onClick={() => setLastEvent(...)}`) на статический блок-подсказку:

```tsx
        <div className="w-full border border-dashed border-accent/35 rounded-2xl p-4 text-center">
          <div className="font-display font-semibold text-[14px] text-ink3">Нажмите кнопку геймпада для проверки</div>
          <div className="font-mono font-medium text-[12px] text-accent mt-1.5">последнее: {lastEvent ?? "—"}</div>
        </div>
```

- [ ] **Step 4: Проверка типов**

Run: `npx tsc --noEmit`
Expected: нет ошибок в `app/clicker/page.tsx`.

- [ ] **Step 5: Коммит**

```bash
git add app/clicker/page.tsx
git commit -m "Страница кликера: реальный статус геймпада и раскладка кнопок"
```

---

### Task 10: `/match` — индикатор геймпада, кнопка «Завершить матч», заметная трансляция, ничья в оверлее

**Files:**
- Modify: `components/ScoreButtons.tsx`
- Modify: `app/match/page.tsx`
- Modify: `components/MatchCompleteOverlay.tsx`

**Interfaces:**
- Consumes: `useMatchStore` (`finish`), `useClickerStore` (`connected`).
- Produces: `ScoreButtons` принимает `connected: boolean` вместо `battery`; на странице матча есть видимые кнопки «Завершить матч» (с подтверждением → `finish()`) и «Трансляция»; `MatchCompleteOverlay` корректно показывает ничью.

- [ ] **Step 1: ScoreButtons — индикатор геймпада вместо батареи**

Заменить целиком `components/ScoreButtons.tsx`:

```tsx
"use client";
export function ScoreButtons({ onA, onB, onUndo, connected }: { onA: () => void; onB: () => void; onUndo: () => void; connected: boolean }) {
  return (
    <div className="mt-auto pb-4">
      <div className="flex gap-3 mb-3">
        <button onClick={onA} className="flex-1 h-[84px] rounded-[20px] bg-accent flex flex-col items-center justify-center" style={{ boxShadow: "0 12px 28px -10px rgba(198,242,78,.5)" }}>
          <span className="font-display font-extrabold text-[22px] text-bg">+ Очко</span>
          <span className="font-mono font-bold text-[12px] mt-0.5" style={{ color: "rgba(10,11,10,.65)" }}>КОМАНДА A</span>
        </button>
        <button onClick={onB} className="flex-1 h-[84px] rounded-[20px] border-[1.5px] border-white/[.14] flex flex-col items-center justify-center">
          <span className="font-display font-extrabold text-[22px] text-ink">+ Очко</span>
          <span className="font-mono font-bold text-[12px] text-muted mt-0.5">КОМАНДА B</span>
        </button>
      </div>
      <div className="flex items-center justify-between">
        <button onClick={onUndo} className="flex items-center gap-2 font-display font-semibold text-[13px] text-[#9a9f97]"><span className="text-[16px]">↶</span> Отменить</button>
        <div className={`flex items-center gap-2 rounded-[20px] px-[14px] py-[7px] border ${connected ? "bg-accent/10 border-accent/25" : "bg-white/[.04] border-white/10"}`}>
          <div className={`w-[7px] h-[7px] rounded-full ${connected ? "bg-accent animate-pulse2" : "bg-muted3"}`} />
          <span className={`font-mono font-semibold text-[12px] ${connected ? "text-accent" : "text-muted2"}`}>{connected ? "Геймпад" : "Нет геймпада"}</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: MatchCompleteOverlay — обработка ничьи**

В `components/MatchCompleteOverlay.tsx` заменить guard и вычисление имени победителя:

```tsx
  if (match.status !== "completed") return null;
  const draw = match.winner === undefined;
  const w = draw ? "Ничья" : match.teams[match.winner!].players.map((p) => p.name).join(" / ");
```

(Строку с заголовком «Матч завершён» оставить; `{w}` теперь покажет «Ничья» при отсутствии победителя.)

- [ ] **Step 3: match/page — заменить battery, добавить finish и подтверждение**

В `app/match/page.tsx`:

- Заменить чтение батареи на статус геймпада и добавить `finish`:

```tsx
  const undoPoint = useMatchStore((s) => s.undoPoint);
  const finish = useMatchStore((s) => s.finish);
  const clear = useMatchStore((s) => s.clear);
  const hasHydrated = useMatchStore((s) => s.hasHydrated);
  const connected = useClickerStore((s) => s.connected);
```

(Удалить строку `const battery = useClickerStore((s) => s.battery);`.)

- В `<ScoreButtons .../>` заменить проп `battery={battery}` на `connected={connected}`.

- [ ] **Step 4: match/page — заметная кнопка трансляции вместо «⋯»**

Заменить кнопку в топ-баре (`<button onClick={() => router.push("/broadcast")} ...>⋯</button>`) на:

```tsx
          <button onClick={() => router.push("/broadcast")} className="flex items-center gap-1.5 bg-accent/[.12] border border-accent/30 rounded-full px-3 py-1.5 font-mono font-semibold text-[12px] tracking-[.08em] uppercase text-accent">
            <span className="w-[7px] h-[7px] rounded-full bg-accent animate-pulse2" /> Трансляция
          </button>
```

- [ ] **Step 5: match/page — кнопка «Завершить матч» с подтверждением**

Перед `<MatchCompleteOverlay .../>` (после блока с `ScoreButtons`, внутри основного `div`) добавить кнопку завершения. Сначала в начало компонента добавить состояние подтверждения рядом с `const [now, setNow] = useState(...)`:

```tsx
  const [confirmFinish, setConfirmFinish] = useState(false);
```

Затем добавить кнопку сразу под `<ScoreButtons .../>`:

```tsx
        {confirmFinish ? (
          <div className="flex gap-2 pb-4">
            <button onClick={() => { finish(); setConfirmFinish(false); }} className="flex-1 h-[46px] rounded-[14px] bg-live/90 font-display font-bold text-[14px] text-bg">Завершить сейчас</button>
            <button onClick={() => setConfirmFinish(false)} className="flex-1 h-[46px] rounded-[14px] border border-white/15 font-display font-semibold text-[14px] text-ink">Отмена</button>
          </div>
        ) : (
          <button onClick={() => setConfirmFinish(true)} className="w-full h-[46px] rounded-[14px] border border-white/12 font-display font-semibold text-[14px] text-muted2 pb-0 mb-4">Завершить матч</button>
        )}
```

(`finish()` выставит `status="completed"`, и существующий `MatchCompleteOverlay` сам покажется поверх.)

- [ ] **Step 6: Проверка типов и сборка**

Run: `npx tsc --noEmit && npm run build`
Expected: типы без ошибок; сборка проходит. (`battery` больше нигде не используется на этих страницах.)

- [ ] **Step 7: Коммит**

```bash
git add components/ScoreButtons.tsx components/MatchCompleteOverlay.tsx app/match/page.tsx
git commit -m "Матч: индикатор геймпада, завершение матча, заметная трансляция, ничья"
```

---

### Task 11: `/broadcast` — убрать индикатор батареи

**Files:**
- Modify: `app/broadcast/page.tsx`

**Interfaces:**
- Consumes: `useClickerStore` (`connected`).
- Produces: нижняя полоса трансляции показывает статус геймпада вместо «Кликер · NN%».

- [ ] **Step 1: Заменить battery на статус геймпада**

В `app/broadcast/page.tsx`:

- Заменить `const battery = useClickerStore((s) => s.battery);` на:

```tsx
  const connected = useClickerStore((s) => s.connected);
```

- В нижней полосе заменить блок «Кликер · {battery}%» на:

```tsx
        <div className="flex items-center gap-2">
          <div className={`w-[7px] h-[7px] rounded-full ${connected ? "bg-accent animate-pulse2" : "bg-muted3"}`} />
          <span className={`font-mono font-semibold text-[12px] ${connected ? "text-accent" : "text-muted3"}`}>
            {connected ? "Геймпад" : "Нет геймпада"}
          </span>
        </div>
```

- [ ] **Step 2: Проверка типов и сборка**

Run: `npx tsc --noEmit && npm run build`
Expected: без ошибок; `battery` полностью удалён из проекта.

- [ ] **Step 3: Финальный прогон тестов**

Run: `npm test`
Expected: PASS — все тесты движка и геймпада зелёные.

- [ ] **Step 4: Коммит**

```bash
git add app/broadcast/page.tsx
git commit -m "Трансляция: статус геймпада вместо индикатора батареи"
```

---

## Ручная проверка на iPhone (после реализации)

1. Открыть PWA, подключить DualShock 4 по Bluetooth.
2. Начать матч, перейти на `/clicker` — нажать любую кнопку → статус «Подключён», имя геймпада.
3. На `/match`: L1 → очко A, R1 → очко B, ✕ → отмена. Экран не гаснет (Wake Lock).
4. «Завершить матч» → оверлей с текущим счётом/победителем.
5. Кнопка «Трансляция» заметна, ведёт на `/broadcast`.
6. Убедиться, что нигде нет чёлки/фейкового статус-бара/процента батареи.

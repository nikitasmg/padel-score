# Настройка кнопок геймпада + кнопка «назад» Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать пользователю переназначать кнопки геймпада на действия (очко A, очко B, отмена) с экрана кликера и добавить кнопку «назад» на этом экране.

**Architecture:** Привязки кнопок (`bindings`) и флаг режима обучения (`learning`) живут в `clickerStore`. Маппинг кнопки в действие становится обратным поиском по `bindings`. `GamepadController` в режиме обучения перенаправляет нажатие в `setBinding` вместо засчитывания очка — это координирует двух слушателей геймпада. Экран кликера управляет режимом обучения и показывает привязки.

**Tech Stack:** Next.js 16, React 19, Zustand 5 (с `persist`), Vitest, TypeScript, Tailwind.

## Global Constraints

- Тесты гоняются командой `npm test` (`vitest run --passWithNoTests`).
- Импорты через алиас `@/` (например `@/lib/gamepad/mapping`).
- Коммиты по-русски, без подписи Claude, от имени пользователя.
- `ClickerAction = "pointA" | "pointB" | "undo"` (тип уже определён в `lib/gamepad/mapping.ts`).
- Дефолтные привязки: `{ pointA: 4, pointB: 5, undo: 0 }` (L1/R1/✕).
- Конфликт привязки: кнопка снимается со старого действия (дублей нет).
- Сброс к дефолтам НЕ делаем.
- Выход из режима обучения — только повторным тапом по строке (без таймаута).

---

### Task 1: Маппинг — `buttonToAction(index, bindings)`, `buttonLabel`, `resolveBindings`

**Files:**
- Modify: `lib/gamepad/mapping.ts`
- Test: `lib/gamepad/__tests__/mapping.test.ts`

**Interfaces:**
- Consumes: ничего нового.
- Produces:
  - `export type ClickerBindings = Record<ClickerAction, number>`
  - `export const DEFAULT_BINDINGS: ClickerBindings` = `{ pointA: 4, pointB: 5, undo: 0 }`
  - `buttonToAction(index: number, bindings: ClickerBindings): ClickerAction | null`
  - `buttonLabel(index: number): string`
  - `resolveBindings(current: ClickerBindings, action: ClickerAction, index: number): ClickerBindings` — возвращает новый объект: `index` назначен на `action` и снят с любого другого действия, где он был.
  - `EVENT_LABEL: Record<ClickerAction, string>` остаётся, но без упоминания конкретных кнопок.

- [ ] **Step 1: Переписать тест-файл под новые сигнатуры**

Заменить всё содержимое `lib/gamepad/__tests__/mapping.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  buttonToAction,
  buttonLabel,
  resolveBindings,
  DEFAULT_BINDINGS,
} from "@/lib/gamepad/mapping";

describe("buttonToAction", () => {
  it("находит действие по дефолтной привязке", () => {
    expect(buttonToAction(4, DEFAULT_BINDINGS)).toBe("pointA");
    expect(buttonToAction(5, DEFAULT_BINDINGS)).toBe("pointB");
    expect(buttonToAction(0, DEFAULT_BINDINGS)).toBe("undo");
  });
  it("незамапленная кнопка → null", () => {
    expect(buttonToAction(3, DEFAULT_BINDINGS)).toBeNull();
  });
  it("учитывает кастомную привязку", () => {
    expect(buttonToAction(7, { pointA: 7, pointB: 5, undo: 0 })).toBe("pointA");
  });
});

describe("buttonLabel", () => {
  it("знакомые кнопки", () => {
    expect(buttonLabel(0)).toBe("✕ / A");
    expect(buttonLabel(4)).toBe("L1");
    expect(buttonLabel(5)).toBe("R1");
  });
  it("прочие — «Кнопка N»", () => {
    expect(buttonLabel(9)).toBe("Кнопка 9");
  });
});

describe("resolveBindings", () => {
  it("назначает свободную кнопку, не трогая прочие", () => {
    const next = resolveBindings(DEFAULT_BINDINGS, "pointA", 7);
    expect(next).toEqual({ pointA: 7, pointB: 5, undo: 0 });
  });
  it("снимает кнопку со старого действия при конфликте", () => {
    const next = resolveBindings(DEFAULT_BINDINGS, "pointA", 5); // 5 был у pointB
    expect(next.pointA).toBe(5);
    expect(next.pointB).toBe(-1);
  });
  it("переназначение того же действия на ту же кнопку идемпотентно", () => {
    const next = resolveBindings(DEFAULT_BINDINGS, "pointA", 4);
    expect(next).toEqual(DEFAULT_BINDINGS);
  });
  it("не мутирует исходный объект", () => {
    const src = { ...DEFAULT_BINDINGS };
    resolveBindings(src, "pointA", 9);
    expect(src).toEqual(DEFAULT_BINDINGS);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npm test -- mapping`
Expected: FAIL (нет экспортов `buttonLabel`, `resolveBindings`, `DEFAULT_BINDINGS`; `buttonToAction` старой сигнатуры).

- [ ] **Step 3: Переписать `lib/gamepad/mapping.ts`**

Полное содержимое файла:

```ts
export type ClickerAction = "pointA" | "pointB" | "undo";

export type ClickerBindings = Record<ClickerAction, number>;

export const DEFAULT_BINDINGS: ClickerBindings = {
  pointA: 4,
  pointB: 5,
  undo: 0,
};

const ACTIONS: ClickerAction[] = ["pointA", "pointB", "undo"];

export function buttonToAction(
  index: number,
  bindings: ClickerBindings,
): ClickerAction | null {
  return ACTIONS.find((a) => bindings[a] === index) ?? null;
}

export function buttonLabel(index: number): string {
  switch (index) {
    case 0: return "✕ / A";
    case 4: return "L1";
    case 5: return "R1";
    default: return `Кнопка ${index}`;
  }
}

// index = -1 означает «не назначено».
export function resolveBindings(
  current: ClickerBindings,
  action: ClickerAction,
  index: number,
): ClickerBindings {
  const next: ClickerBindings = { ...current };
  for (const a of ACTIONS) {
    if (next[a] === index) next[a] = -1;
  }
  next[action] = index;
  return next;
}

export const EVENT_LABEL: Record<ClickerAction, string> = {
  pointA: "+1 команде A",
  pointB: "+1 команде B",
  undo: "отмена последнего",
};
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npm test -- mapping`
Expected: PASS (все describe-блоки зелёные).

- [ ] **Step 5: Коммит**

```bash
git add lib/gamepad/mapping.ts lib/gamepad/__tests__/mapping.test.ts
git commit -m "Геймпад: настраиваемый маппинг кнопок (bindings, resolveBindings, buttonLabel)"
```

---

### Task 2: Хранилище — `bindings`, `learning`, `setBinding`, `setLearning`

**Files:**
- Modify: `store/clickerStore.ts`
- Test: `store/__tests__/clickerStore.test.ts` (Create)

**Interfaces:**
- Consumes: `ClickerBindings`, `ClickerAction`, `DEFAULT_BINDINGS`, `resolveBindings` из `@/lib/gamepad/mapping` (Task 1).
- Produces, добавляется в `ClickerStore`:
  - `bindings: ClickerBindings` (персистится)
  - `learning: ClickerAction | null` (рантайм, НЕ персистится)
  - `setBinding: (action: ClickerAction, index: number) => void` — применяет `resolveBindings`
  - `setLearning: (action: ClickerAction | null) => void`

- [ ] **Step 1: Написать тест стора**

Создать `store/__tests__/clickerStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useClickerStore } from "@/store/clickerStore";
import { DEFAULT_BINDINGS } from "@/lib/gamepad/mapping";

describe("clickerStore bindings", () => {
  beforeEach(() => {
    useClickerStore.setState({ bindings: { ...DEFAULT_BINDINGS }, learning: null });
  });

  it("дефолтные привязки", () => {
    expect(useClickerStore.getState().bindings).toEqual(DEFAULT_BINDINGS);
  });

  it("setBinding снимает кнопку со старого действия", () => {
    useClickerStore.getState().setBinding("pointA", 5); // 5 был у pointB
    const b = useClickerStore.getState().bindings;
    expect(b.pointA).toBe(5);
    expect(b.pointB).toBe(-1);
  });

  it("setLearning переключает флаг", () => {
    useClickerStore.getState().setLearning("undo");
    expect(useClickerStore.getState().learning).toBe("undo");
    useClickerStore.getState().setLearning(null);
    expect(useClickerStore.getState().learning).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npm test -- clickerStore`
Expected: FAIL (нет `bindings`/`setBinding`/`setLearning`).

- [ ] **Step 3: Обновить `store/clickerStore.ts`**

Изменить импорты вверху файла:

```ts
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TeamIndex } from "@/lib/padel/types";
import {
  type ClickerAction,
  type ClickerBindings,
  DEFAULT_BINDINGS,
  resolveBindings,
} from "@/lib/gamepad/mapping";
```

В интерфейс `ClickerStore` добавить поля (после `lastEvent: string | null;`):

```ts
  bindings: ClickerBindings;
  learning: ClickerAction | null;
```

и экшены (после `setGamepadId`):

```ts
  setBinding: (action: ClickerAction, index: number) => void;
  setLearning: (action: ClickerAction | null) => void;
```

В теле стора добавить начальные значения (после `lastEvent: null,`):

```ts
      bindings: { ...DEFAULT_BINDINGS },
      learning: null,
```

и реализацию экшенов (после `setGamepadId: ...`):

```ts
      setBinding: (action, index) =>
        set((s) => ({ bindings: resolveBindings(s.bindings, action, index), learning: null })),
      setLearning: (learning) => set({ learning }),
```

Обновить `partialize`, добавив `bindings`:

```ts
      partialize: (s) => ({ buttonMode: s.buttonMode, holder: s.holder, bindings: s.bindings }),
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npm test -- clickerStore`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add store/clickerStore.ts store/__tests__/clickerStore.test.ts
git commit -m "Кликер-стор: bindings, режим обучения, setBinding/setLearning"
```

---

### Task 3: `GamepadController` — учитывает bindings и режим обучения

**Files:**
- Modify: `components/GamepadController.tsx`

**Interfaces:**
- Consumes: `bindings`, `learning`, `setBinding`, `setLearning` из стора; `buttonToAction(index, bindings)`, `buttonLabel`, `EVENT_LABEL` из маппинга.
- Produces: ничего (компонент рендерит `null`).

Изменений в логике достаточно мало, поэтому без отдельного юнит-теста — поведение покрыто тестами Task 1/2; этот шаг чисто интеграционный. Проверяется сборкой и линтом.

- [ ] **Step 1: Обновить `handleButtonDown` в `components/GamepadController.tsx`**

Заменить блок селекторов и `handleButtonDown` (строки ~10–27) на:

```tsx
  const setConnected = useClickerStore((s) => s.setConnected);
  const setGamepadId = useClickerStore((s) => s.setGamepadId);
  const setLastEvent = useClickerStore((s) => s.setLastEvent);
  const matchActive = useMatchStore((s) => s.match?.status === "in_progress");

  const handleButtonDown = useCallback(
    (index: number) => {
      const { bindings, learning, setBinding } = useClickerStore.getState();

      // Режим обучения: нажатие записывает привязку, очко не засчитываем.
      if (learning) {
        setBinding(learning, index);
        setLastEvent(`${EVENT_LABEL[learning]} → ${buttonLabel(index)}`);
        return;
      }

      const action = buttonToAction(index, bindings);
      if (!action) return;
      const { match, point, undoPoint } = useMatchStore.getState();
      if (!match || match.status !== "in_progress") return;
      if (action === "pointA") point(0);
      else if (action === "pointB") point(1);
      else undoPoint();
      setLastEvent(`${buttonLabel(index)} · ${EVENT_LABEL[action]}`);
    },
    [setLastEvent],
  );
```

Обновить импорт маппинга вверху файла:

```tsx
import { buttonToAction, buttonLabel, EVENT_LABEL } from "@/lib/gamepad/mapping";
```

- [ ] **Step 2: Проверить сборку и линт**

Run: `npm run lint && npx tsc --noEmit`
Expected: без ошибок (если `tsc` не сконфигурирован отдельно — достаточно `npm run lint` и `npm run build`).

- [ ] **Step 3: Коммит**

```bash
git add components/GamepadController.tsx
git commit -m "Геймпад: контроллер учитывает привязки и режим обучения"
```

---

### Task 4: Экран кликера — кнопка «назад» и интерактивные строки привязки

**Files:**
- Modify: `app/clicker/page.tsx`

**Interfaces:**
- Consumes: `bindings`, `learning`, `setLearning` из стора; `buttonLabel`, `EVENT_LABEL`, `ClickerAction` из маппинга. `useRouter` из `next/navigation`.
- Produces: UI (тестируется визуально).

- [ ] **Step 1: Обновить импорты и селекторы в `app/clicker/page.tsx`**

Заменить шапку файла (строки 1–8) на:

```tsx
"use client";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useClickerStore } from "@/store/clickerStore";
import { useMatchStore } from "@/store/matchStore";
import { buttonLabel, EVENT_LABEL, type ClickerAction } from "@/lib/gamepad/mapping";

export default function ClickerPage() {
  const router = useRouter();
  const { holder, connected, gamepadId, lastEvent, setHolder, bindings, learning, setLearning } =
    useClickerStore();
  const match = useMatchStore((s) => s.match);
  const holderName = match ? `${match.teams[holder.team].players[holder.player].name} · Команда ${holder.team === 0 ? "A" : "B"}` : "Команда A";

  const toggleLearn = (action: ClickerAction) =>
    setLearning(learning === action ? null : action);
```

- [ ] **Step 2: Добавить кнопку «назад» в шапку**

Заменить блок заголовка (исходные строки ~13–19, `<div className="flex items-center justify-between mb-[26px]">…</div>`) на:

```tsx
        <div className="flex items-center justify-between mb-[26px]">
          <div className="flex items-center gap-3">
            <button
              aria-label="Назад"
              onClick={() => router.back()}
              className="w-[38px] h-[38px] rounded-full border border-white/10 flex items-center justify-center text-[#9a9f97] active:scale-95 transition-transform"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <div className="font-mono font-medium text-[12px] tracking-[.12em] uppercase text-accent">Геймпад</div>
              <div className="font-display font-extrabold text-[30px] tracking-[-.02em] text-ink mt-0.5">Кликер</div>
            </div>
          </div>
          <div className="w-[38px] h-[38px] rounded-full bg-accent/[.12] flex items-center justify-center text-accent font-bold text-[17px]">✶</div>
        </div>
```

- [ ] **Step 3: Сделать строки привязки интерактивными**

Заменить блок «button mode» (исходные строки ~44–50) на:

```tsx
        {/* button mode */}
        <div className="font-mono font-semibold text-[11px] tracking-[.14em] uppercase text-muted2 mb-3">Назначение кнопок</div>
        <div className="flex flex-col gap-2.5 mb-[22px]">
          {(["pointA", "pointB", "undo"] as ClickerAction[]).map((action) => {
            const isLearning = learning === action;
            const idx = bindings[action];
            return (
              <ModeRow
                key={action}
                active={isLearning}
                title={`${buttonLabel(idx)} — ${EVENT_LABEL[action]}`}
                subtitle={isLearning ? "Нажмите кнопку на геймпаде…" : "Нажмите, чтобы переназначить"}
                onClick={() => toggleLearn(action)}
              />
            );
          })}
        </div>
```

(Компонент `ModeRow` внизу файла остаётся без изменений — у него уже есть нужные пропсы `active/onClick/title/subtitle`.)

- [ ] **Step 4: Проверить сборку и линт**

Run: `npm run lint && npm run build`
Expected: сборка успешна, без ошибок типов/линта.

- [ ] **Step 5: Коммит**

```bash
git add app/clicker/page.tsx
git commit -m "Экран кликера: кнопка назад и переназначение кнопок (learn mode)"
```

---

### Task 5: Ручная проверка сквозного сценария

**Files:** нет (проверка).

- [ ] **Step 1: Прогнать все тесты**

Run: `npm test`
Expected: все тесты зелёные.

- [ ] **Step 2: Ручной чек-лист в браузере (`npm run dev`, страница `/clicker`)**

Проверить с подключённым геймпадом:
- кнопка «назад» возвращает на предыдущий экран;
- тап по строке «очко A» → подпись «Нажмите кнопку…», нажатие кнопки геймпада записывает её, режим выходит сам;
- если назначить на «очко A» кнопку, что была у «очко B», у «очко B» подпись меняется (кнопка снята);
- повторный тап по строке в режиме обучения отменяет обучение без записи;
- после настройки в матче (`status in_progress`) кнопки засчитывают очки/отмену по новым привязкам;
- привязки сохраняются после перезагрузки страницы (persist).

- [ ] **Step 3: Финальный коммит (если были правки по итогам проверки)**

```bash
git add -A
git commit -m "Геймпад: правки по итогам ручной проверки"
```

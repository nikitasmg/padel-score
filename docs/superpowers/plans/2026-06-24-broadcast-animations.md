# Анимации счёта, направление подачи, чистка входа — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Усилить визуал трансляции (крупный анимированный счёт, празднование гейма/сета), показать направление подачи пунктиром на корте и в трансляции, убрать дефолтные имена и сделать вход в экран геймпада понятным.

**Architecture:** Чистое определение событий счёта (`diffMatch`) и цели подачи (`serveTarget`) отделено от рендера и покрыто юнит-тестами. Анимации — на `motion` через переиспользуемые компоненты (`AnimatedPoint`, `WinCelebration`, `ServeMiniCourt`), подключаемые на `/match` и `/broadcast`.

**Tech Stack:** Next.js 16 (App Router), React 19, Zustand, Tailwind v4, `motion` (новая зависимость), `lucide-react` (уже есть), Vitest.

## Global Constraints

- Коммиты на русском, без подписи Claude/Co-Authored-By, от имени пользователя.
- Единственная новая зависимость — `motion`. Никаких других пакетов.
- Очки — это метки (`0/15/30/40/AD`), не целые числа: анимация счёта — keyed-смена метки, не счётчик.
- `motion`-компоненты обязаны быть client (`"use client"`).
- Конфетти — на `motion`, без отдельной библиотеки.
- Алиас импорта: `@/` → корень репозитория (см. tsconfig). Тесты — Vitest, файлы в `lib/padel/__tests__/`.
- Цвет accent: `#c6f24e`. Команда A — accent, команда B — светло-серый (`#e8e8e8`/`#cfd3cb`).

---

### Task 1: Чистое определение событий счёта `diffMatch`

**Files:**
- Create: `lib/padel/scoreEvents.ts`
- Test: `lib/padel/__tests__/scoreEvents.test.ts`

**Interfaces:**
- Consumes: `MatchState`, `TeamIndex` из `@/lib/padel/types`; `createMatch`, `scorePoint` из `@/lib/padel/engine` (в тесте).
- Produces:
  - `interface ScoreEvent { pointChanged: boolean; gameWonBy?: TeamIndex; setWonBy?: TeamIndex; matchWon: boolean }`
  - `function diffMatch(prev: MatchState | null, curr: MatchState): ScoreEvent`

- [ ] **Step 1: Написать падающий тест**

`lib/padel/__tests__/scoreEvents.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { diffMatch } from "@/lib/padel/scoreEvents";
import { createMatch, scorePoint } from "@/lib/padel/engine";
import type { Config, Team, TeamIndex } from "@/lib/padel/types";

const cfg: Config = { sets: 3, gamesPerSet: 6, goldenPoint: true, tiebreak: true };
const teams: [Team, Team] = [
  { players: [{ name: "A1" }, { name: "A2" }] },
  { players: [{ name: "B1" }, { name: "B2" }] },
];
const m = () => createMatch(cfg, teams, 1000);
function winGames(s: ReturnType<typeof createMatch>, t: TeamIndex, n: number) {
  for (let g = 0; g < n; g++) for (let p = 0; p < 4; p++) s = scorePoint(s, t);
  return s;
}

describe("diffMatch", () => {
  it("без prev — событий нет", () => {
    expect(diffMatch(null, m())).toEqual({ pointChanged: false, matchWon: false });
  });

  it("обычное очко — pointChanged, без гейма/сета", () => {
    const s1 = m();
    const s2 = scorePoint(s1, 0);
    const e = diffMatch(s1, s2);
    expect(e.pointChanged).toBe(true);
    expect(e.gameWonBy).toBeUndefined();
    expect(e.setWonBy).toBeUndefined();
  });

  it("выигран гейм — gameWonBy", () => {
    let s1 = m();
    for (let p = 0; p < 3; p++) s1 = scorePoint(s1, 0); // 40
    const s2 = scorePoint(s1, 0); // гейм
    expect(diffMatch(s1, s2).gameWonBy).toBe(0);
  });

  it("выигран сет — setWonBy (и gameWonBy на том же очке)", () => {
    let s1 = winGames(m(), 0, 5);       // 5-0
    for (let p = 0; p < 3; p++) s1 = scorePoint(s1, 0); // 40 в 6-м гейме
    const s2 = scorePoint(s1, 0);       // 6-0, сет взят
    const e = diffMatch(s1, s2);
    expect(e.setWonBy).toBe(0);
    expect(e.gameWonBy).toBe(0);
  });

  it("выигран матч — matchWon", () => {
    const cfg1 = { ...cfg, sets: 1 as const };
    let s1 = createMatch(cfg1, teams, 1000);
    s1 = winGames(s1, 0, 5);
    for (let p = 0; p < 3; p++) s1 = scorePoint(s1, 0);
    const s2 = scorePoint(s1, 0); // 6-0 → матч (best of 1)
    expect(diffMatch(s1, s2).matchWon).toBe(true);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npx vitest run lib/padel/__tests__/scoreEvents.test.ts`
Expected: FAIL — `diffMatch` не найден.

- [ ] **Step 3: Реализовать `diffMatch`**

`lib/padel/scoreEvents.ts`:

```ts
import type { MatchState, TeamIndex } from "./types";

export interface ScoreEvent {
  pointChanged: boolean;
  gameWonBy?: TeamIndex;
  setWonBy?: TeamIndex;
  matchWon: boolean;
}

const totalGames = (m: MatchState, t: TeamIndex) =>
  m.score[t].games.reduce((a, b) => a + b, 0);

export function diffMatch(prev: MatchState | null, curr: MatchState): ScoreEvent {
  if (!prev) return { pointChanged: false, matchWon: false };

  let gameWonBy: TeamIndex | undefined;
  let setWonBy: TeamIndex | undefined;
  for (const t of [0, 1] as TeamIndex[]) {
    if (totalGames(curr, t) > totalGames(prev, t)) gameWonBy = t;
    if (curr.score[t].sets > prev.score[t].sets) setWonBy = t;
  }

  const matchWon = prev.status !== "completed" && curr.status === "completed";
  const pointChanged =
    curr.score[0].points !== prev.score[0].points ||
    curr.score[1].points !== prev.score[1].points ||
    gameWonBy !== undefined ||
    setWonBy !== undefined;

  return { pointChanged, gameWonBy, setWonBy, matchWon };
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npx vitest run lib/padel/__tests__/scoreEvents.test.ts`
Expected: PASS (5/5).

- [ ] **Step 5: Коммит**

```bash
git add lib/padel/scoreEvents.ts lib/padel/__tests__/scoreEvents.test.ts
git commit -m "Добавить diffMatch: чистое определение событий счёта"
```

---

### Task 2: Цель подачи `serveTarget`

**Files:**
- Modify: `lib/padel/serve.ts` (добавить функцию в конец)
- Test: `lib/padel/__tests__/serve.test.ts`

**Interfaces:**
- Consumes: тип квадранта `{ x: "left"|"right"; y: "top"|"bottom" }` (поля из `CourtPos` в `serve.ts`).
- Produces: `function serveTarget(server: { x: "left"|"right"; y: "top"|"bottom" }): { x: "left"|"right"; y: "top"|"bottom" }` — диагонально противоположный квадрат.

- [ ] **Step 1: Написать падающий тест**

`lib/padel/__tests__/serve.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { serveTarget } from "@/lib/padel/serve";

describe("serveTarget — диагональ через сетку", () => {
  it("left-top → right-bottom", () => {
    expect(serveTarget({ x: "left", y: "top" })).toEqual({ x: "right", y: "bottom" });
  });
  it("left-bottom → right-top", () => {
    expect(serveTarget({ x: "left", y: "bottom" })).toEqual({ x: "right", y: "top" });
  });
  it("right-top → left-bottom", () => {
    expect(serveTarget({ x: "right", y: "top" })).toEqual({ x: "left", y: "bottom" });
  });
  it("right-bottom → left-top", () => {
    expect(serveTarget({ x: "right", y: "bottom" })).toEqual({ x: "left", y: "top" });
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npx vitest run lib/padel/__tests__/serve.test.ts`
Expected: FAIL — `serveTarget` не найден.

- [ ] **Step 3: Реализовать `serveTarget`**

Добавить в конец `lib/padel/serve.ts`:

```ts
export function serveTarget(server: { x: "left" | "right"; y: "top" | "bottom" }): {
  x: "left" | "right";
  y: "top" | "bottom";
} {
  return {
    x: server.x === "left" ? "right" : "left",
    y: server.y === "top" ? "bottom" : "top",
  };
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npx vitest run lib/padel/__tests__/serve.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Коммит**

```bash
git add lib/padel/serve.ts lib/padel/__tests__/serve.test.ts
git commit -m "Добавить serveTarget: диагональ направления подачи"
```

---

### Task 3: Установить `motion` и хук `useScoreEvents`

**Files:**
- Modify: `package.json` (через `npm i`)
- Create: `lib/padel/useScoreEvents.ts`

**Interfaces:**
- Consumes: `diffMatch`, `ScoreEvent` из `@/lib/padel/scoreEvents`; `MatchState` из `@/lib/padel/types`.
- Produces: `function useScoreEvents(match: MatchState | null): { event: ScoreEvent; seq: number }` — `seq` инкрементится только при победе в гейме/сете/матче; `event` — последнее событие.

- [ ] **Step 1: Установить motion**

Run: `npm i motion`
Expected: пакет добавлен в `dependencies`, установка без ошибок.

- [ ] **Step 2: Проверить импорт motion в сборке**

Run: `node -e "console.log(require('motion/package.json').version)"`
Expected: печатает версию (напр. `12.x`).

- [ ] **Step 3: Реализовать хук**

`lib/padel/useScoreEvents.ts`:

```ts
"use client";
import { useEffect, useRef, useState } from "react";
import { diffMatch, type ScoreEvent } from "./scoreEvents";
import type { MatchState } from "./types";

const EMPTY: ScoreEvent = { pointChanged: false, matchWon: false };

export function useScoreEvents(match: MatchState | null): { event: ScoreEvent; seq: number } {
  const prev = useRef<MatchState | null>(null);
  const [event, setEvent] = useState<ScoreEvent>(EMPTY);
  const [seq, setSeq] = useState(0);

  useEffect(() => {
    const e = match ? diffMatch(prev.current, match) : EMPTY;
    prev.current = match;
    setEvent(e);
    if (e.gameWonBy !== undefined || e.setWonBy !== undefined || e.matchWon) {
      setSeq((s) => s + 1);
    }
  }, [match]);

  return { event, seq };
}
```

- [ ] **Step 4: Проверить типы**

Run: `npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 5: Коммит**

```bash
git add package.json package-lock.json lib/padel/useScoreEvents.ts
git commit -m "Подключить motion и хук useScoreEvents"
```

---

### Task 4: Компонент `AnimatedPoint`

**Files:**
- Create: `components/AnimatedPoint.tsx`

**Interfaces:**
- Consumes: `motion`, `AnimatePresence` из `motion/react`.
- Produces: `function AnimatedPoint({ value, className, style }: { value: string; className?: string; style?: CSSProperties }): JSX.Element` — анимированная смена метки очка (slide + blur + spring).

- [ ] **Step 1: Реализовать компонент**

`components/AnimatedPoint.tsx`:

```tsx
"use client";
import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";

export function AnimatedPoint({
  value,
  className,
  style,
}: {
  value: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className="relative inline-grid place-items-center">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: "55%", opacity: 0, filter: "blur(4px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: "-55%", opacity: 0, filter: "blur(4px)" }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className={`tnum ${className ?? ""}`}
          style={style}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
```

- [ ] **Step 2: Проверить типы и сборку**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc без ошибок; сборка успешна.

- [ ] **Step 3: Коммит**

```bash
git add components/AnimatedPoint.tsx
git commit -m "Добавить AnimatedPoint: анимированная смена очка"
```

---

### Task 5: Компонент `WinCelebration`

**Files:**
- Create: `components/WinCelebration.tsx`

**Interfaces:**
- Consumes: `useScoreEvents` из `@/lib/padel/useScoreEvents`; `MatchState`, `TeamIndex` из `@/lib/padel/types`; `motion`, `AnimatePresence` из `motion/react`.
- Produces: `function WinCelebration({ match, variant }: { match: MatchState; variant?: "match" | "broadcast" }): JSX.Element` — баннер «Гейм/Сет · Команда X» + конфетти на сете. На `matchWon` ничего не показывает (это закрывает `MatchCompleteOverlay`).

- [ ] **Step 1: Реализовать компонент**

`components/WinCelebration.tsx`:

```tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useScoreEvents } from "@/lib/padel/useScoreEvents";
import type { MatchState, TeamIndex } from "@/lib/padel/types";

type Cel = { kind: "game" | "set"; team: TeamIndex };

const COLORS = ["#c6f24e", "#e8e8e8", "#9be15d", "#ffffff"];

function teamName(match: MatchState, t: TeamIndex) {
  return match.teams[t].players.map((p) => p.name || "—").join(" / ");
}

export function WinCelebration({
  match,
  variant = "match",
}: {
  match: MatchState;
  variant?: "match" | "broadcast";
}) {
  const { event, seq } = useScoreEvents(match);
  const [cel, setCel] = useState<Cel | null>(null);

  useEffect(() => {
    if (seq === 0 || event.matchWon) return;
    const next: Cel | null =
      event.setWonBy !== undefined
        ? { kind: "set", team: event.setWonBy }
        : event.gameWonBy !== undefined
          ? { kind: "game", team: event.gameWonBy }
          : null;
    if (!next) return;
    setCel(next);
    const id = setTimeout(() => setCel(null), next.kind === "set" ? 2600 : 900);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq]);

  const confetti = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        x: (Math.random() - 0.5) * 320,
        y: -120 - Math.random() * 220,
        rot: Math.random() * 360,
        color: COLORS[i % COLORS.length],
        delay: Math.random() * 0.12,
      })),
    [seq],
  );

  const big = variant === "broadcast";

  return (
    <AnimatePresence>
      {cel && (
        <motion.div
          key={`${seq}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden"
        >
          {cel.kind === "set" &&
            confetti.map((c, i) => (
              <motion.span
                key={i}
                initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                animate={{ x: c.x, y: c.y, opacity: 0, rotate: c.rot }}
                transition={{ duration: 1.6, delay: c.delay, ease: "easeOut" }}
                className="absolute block rounded-[2px]"
                style={{ width: 9, height: 9, background: c.color }}
              />
            ))}
          <motion.div
            initial={{ scale: 0.7, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
            className={`rounded-[18px] border border-accent/40 bg-black/55 backdrop-blur-sm text-center ${big ? "px-9 py-6" : "px-6 py-4"}`}
            style={{ boxShadow: "0 0 60px rgba(198,242,78,.35)" }}
          >
            <div
              className={`font-mono font-bold tracking-[.18em] uppercase text-accent ${big ? "text-[15px]" : "text-[12px]"}`}
            >
              {cel.kind === "set" ? "Сет" : "Гейм"}
            </div>
            <div
              className={`font-display font-extrabold text-ink mt-1 ${big ? "text-[34px]" : "text-[22px]"}`}
            >
              {teamName(match, cel.team)}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Проверить типы и сборку**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc без ошибок; сборка успешна.

- [ ] **Step 3: Коммит**

```bash
git add components/WinCelebration.tsx
git commit -m "Добавить WinCelebration: празднование гейма и сета"
```

---

### Task 6: Направление подачи — `CourtDiagram` пунктир + `ServeMiniCourt`

**Files:**
- Modify: `components/CourtDiagram.tsx`
- Create: `components/ServeMiniCourt.tsx`

**Interfaces:**
- Consumes: `courtPositions`, `serveTarget` из `@/lib/padel/serve`; `MatchState` из `@/lib/padel/types`.
- Produces: `function ServeMiniCourt({ match }: { match: MatchState }): JSX.Element` — компактная SVG-схема подачи.

- [ ] **Step 1: Обновить `CourtDiagram` — пунктир и подсветка целевого квадрата**

Заменить содержимое `components/CourtDiagram.tsx` на:

```tsx
import type { MatchState } from "@/lib/padel/types";
import { courtPositions, serveTarget } from "@/lib/padel/serve";

const X = { left: 40, right: 306 };
const Y = { top: 46, bottom: 110 };
// границы квадранта для подсветки (между боковыми линиями 64/282, центром 173, серединой 75)
const BOX_X = { left: [64, 173], right: [173, 282] } as const;
const BOX_Y = { top: [4, 75], bottom: [75, 146] } as const;

export function CourtDiagram({ match }: { match: MatchState }) {
  const positions = courtPositions(match);
  const server = positions.find((p) => p.isServer);
  const target = server ? serveTarget(server) : null;
  const tBox = target
    ? { x: BOX_X[target.x], y: BOX_Y[target.y] }
    : null;

  return (
    <svg viewBox="0 0 346 150" className="w-full block">
      <rect x="1" y="1" width="344" height="148" rx="8" fill="#0c0d0c" stroke="rgba(255,255,255,.12)" strokeWidth="1.5" />
      {tBox && (
        <rect
          x={tBox.x[0]}
          y={tBox.y[0]}
          width={tBox.x[1] - tBox.x[0]}
          height={tBox.y[1] - tBox.y[0]}
          fill="#c6f24e"
          opacity=".10"
        />
      )}
      <line x1="173" y1="4" x2="173" y2="146" stroke="#c6f24e" strokeWidth="1.5" strokeDasharray="4 5" opacity=".7" />
      <line x1="64" y1="4" x2="64" y2="146" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
      <line x1="282" y1="4" x2="282" y2="146" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
      <line x1="64" y1="75" x2="282" y2="75" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
      {server && target && (
        <line
          x1={X[server.x]}
          y1={Y[server.y]}
          x2={X[target.x]}
          y2={Y[target.y]}
          stroke="#c6f24e"
          strokeWidth="1.5"
          strokeDasharray="2 4"
          opacity=".75"
        />
      )}
      {positions.map((p) => {
        const cx = X[p.x]; const cy = Y[p.y];
        const teamColor = p.team === 0 ? "#c6f24e" : "#cfd3cb";
        const label = match.teams[p.team].players[p.player].name.charAt(0).toUpperCase();
        return (
          <g key={`${p.team}-${p.player}`}>
            {p.isServer
              ? <>
                  <circle cx={cx} cy={cy} r="13" fill="#c6f24e" />
                  <circle cx={cx} cy={cy} r="20" fill="none" stroke="#c6f24e" strokeWidth="1.5" opacity=".4" />
                </>
              : <circle cx={cx} cy={cy} r="11" fill="#1b1e1b" stroke={teamColor} strokeWidth="1.5" />}
            <text x={cx} y={cy + 4} textAnchor="middle" className="font-display" fontSize="10" fontWeight="700" fill={p.isServer ? "#0a0b0a" : teamColor}>{label || "·"}</text>
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 2: Создать `ServeMiniCourt`**

`components/ServeMiniCourt.tsx`:

```tsx
import type { MatchState } from "@/lib/padel/types";
import { courtPositions, serveTarget } from "@/lib/padel/serve";

const X = { left: 22, right: 116 };
const Y = { top: 18, bottom: 50 };

export function ServeMiniCourt({ match }: { match: MatchState }) {
  const server = courtPositions(match).find((p) => p.isServer);
  const target = server ? serveTarget(server) : null;
  return (
    <svg viewBox="0 0 138 68" className="w-[138px] h-[68px] block">
      <rect x="1" y="1" width="136" height="66" rx="6" fill="#0c0d0c" stroke="rgba(255,255,255,.14)" strokeWidth="1" />
      <line x1="69" y1="3" x2="69" y2="65" stroke="#c6f24e" strokeWidth="1" strokeDasharray="3 4" opacity=".7" />
      {server && target && (
        <>
          <line
            x1={X[server.x]} y1={Y[server.y]}
            x2={X[target.x]} y2={Y[target.y]}
            stroke="#c6f24e" strokeWidth="1.2" strokeDasharray="2 3" opacity=".8"
          />
          <circle cx={X[server.x]} cy={Y[server.y]} r="6" fill="#c6f24e" />
          <circle cx={X[target.x]} cy={Y[target.y]} r="5" fill="none" stroke="#c6f24e" strokeWidth="1.2" opacity=".6" />
        </>
      )}
    </svg>
  );
}
```

- [ ] **Step 3: Проверить типы, сборку и существующие тесты**

Run: `npx tsc --noEmit && npm run build && npx vitest run`
Expected: tsc без ошибок; сборка успешна; все тесты зелёные.

- [ ] **Step 4: Коммит**

```bash
git add components/CourtDiagram.tsx components/ServeMiniCourt.tsx
git commit -m "Направление подачи: пунктир на корте и мини-схема для трансляции"
```

---

### Task 7: Чистка главной — `GamepadLink`, убрать ✕ и дефолтные имена, фолбэк в `/clicker`

**Files:**
- Create: `components/GamepadLink.tsx`
- Modify: `app/page.tsx`
- Modify: `app/clicker/page.tsx:8`

**Interfaces:**
- Consumes: `useRouter` из `next/navigation`; `Gamepad2` из `lucide-react`.
- Produces: `function GamepadLink({ className }: { className?: string }): JSX.Element` — круглая кнопка-иконка, по клику `router.push("/clicker")`.

- [ ] **Step 1: Создать `GamepadLink`**

`components/GamepadLink.tsx`:

```tsx
"use client";
import { useRouter } from "next/navigation";
import { Gamepad2 } from "lucide-react";

export function GamepadLink({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      aria-label="Экран геймпада"
      onClick={() => router.push("/clicker")}
      className={`w-[38px] h-[38px] rounded-full border border-white/10 flex items-center justify-center text-[#9a9f97] active:scale-95 transition-transform ${className ?? ""}`}
    >
      <Gamepad2 size={19} />
    </button>
  );
}
```

- [ ] **Step 2: Обновить `app/page.tsx` — импорт, убрать дефолтные имена**

В `app/page.tsx` заменить строки импорта и инициализации имён.

Заменить:
```tsx
import type { Config } from "@/lib/padel/types";

const A_INIT = ["Алекс", "Марко"];
const B_INIT = ["Дима", "Соня"];
```
на:
```tsx
import type { Config } from "@/lib/padel/types";
import { GamepadLink } from "@/components/GamepadLink";

const A_INIT = ["", ""];
const B_INIT = ["", ""];
```

- [ ] **Step 3: Обновить `begin()` — фолбэк пустых имён**

Заменить тело `begin` в `app/page.tsx`:
```tsx
  function begin() {
    const config: Config = { sets, gamesPerSet: games, goldenPoint, tiebreak };
    start(config, [
      { players: [{ name: a[0] }, { name: a[1] }] },
      { players: [{ name: b[0] }, { name: b[1] }] },
    ]);
    router.push("/match");
  }
```
на:
```tsx
  function begin() {
    const config: Config = { sets, gamesPerSet: games, goldenPoint, tiebreak };
    const fill = (v: string, fallback: string) => (v.trim() ? v.trim() : fallback);
    start(config, [
      { players: [{ name: fill(a[0], "Игрок 1") }, { name: fill(a[1], "Игрок 2") }] },
      { players: [{ name: fill(b[0], "Игрок 3") }, { name: fill(b[1], "Игрок 4") }] },
    ]);
    router.push("/match");
  }
```

- [ ] **Step 4: Заменить ✕ на `GamepadLink` в шапке**

В `app/page.tsx` заменить:
```tsx
          <div className="w-[38px] h-[38px] rounded-full border border-white/10 flex items-center justify-center text-[#9a9f97] text-[20px]">✕</div>
```
на:
```tsx
          <GamepadLink />
```

- [ ] **Step 5: Добавить плейсхолдеры в инпуты имён**

В `app/page.tsx` в компоненте `TeamBlock`, заменить `<Input ... />`:
```tsx
            <Input value={n} onChange={(e) => onName(i, e.target.value)} className="flex-1 h-auto p-0 bg-transparent border-0 shadow-none focus-visible:ring-0 font-display font-semibold text-[16px] text-ink2" />
```
на:
```tsx
            <Input value={n} onChange={(e) => onName(i, e.target.value)} placeholder={`Игрок ${i + 1}`} className="flex-1 h-auto p-0 bg-transparent border-0 shadow-none focus-visible:ring-0 font-display font-semibold text-[16px] text-ink2" />
```

- [ ] **Step 6: Обновить фолбэк в `app/clicker/page.tsx`**

Заменить строку 8:
```tsx
  const holderName = match ? `${match.teams[holder.team].players[holder.player].name} · Команда ${holder.team === 0 ? "A" : "B"}` : "Алекс · Команда A";
```
на:
```tsx
  const holderName = match ? `${match.teams[holder.team].players[holder.player].name} · Команда ${holder.team === 0 ? "A" : "B"}` : "Команда A";
```

- [ ] **Step 7: Проверить типы и сборку**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc без ошибок; сборка успешна.

- [ ] **Step 8: Коммит**

```bash
git add components/GamepadLink.tsx app/page.tsx app/clicker/page.tsx
git commit -m "Главная: вход в геймпад иконкой, без дефолтных имён; фолбэк кликера"
```

---

### Task 8: Интеграция на `/match` — анимация очка, празднование, иконка геймпада

**Files:**
- Modify: `components/ScoreBoard.tsx`
- Modify: `app/match/page.tsx`

**Interfaces:**
- Consumes: `AnimatedPoint` из `@/components/AnimatedPoint`; `WinCelebration` из `@/components/WinCelebration`; `GamepadLink` из `@/components/GamepadLink`.

- [ ] **Step 1: `ScoreBoard` — очко через `AnimatedPoint`**

В `components/ScoreBoard.tsx` добавить импорт после строки 2:
```tsx
import { AnimatedPoint } from "@/components/AnimatedPoint";
```
Заменить ячейку очка:
```tsx
            <span className={`text-center font-display font-extrabold text-[30px] tnum ${serving ? "text-accent" : "text-ink3"}`}>{pointLabel(match, team)}</span>
```
на:
```tsx
            <span className={`text-center font-display font-extrabold text-[30px] ${serving ? "text-accent" : "text-ink3"}`}>
              <AnimatedPoint value={pointLabel(match, team)} />
            </span>
```

- [ ] **Step 2: `app/match/page.tsx` — импорты**

После строки 10 (`import { clock, sideLabel } ...`) добавить:
```tsx
import { WinCelebration } from "@/components/WinCelebration";
import { GamepadLink } from "@/components/GamepadLink";
```

- [ ] **Step 3: Иконка геймпада в шапке `/match`**

В `app/match/page.tsx` заменить блок кнопки «Трансляция»:
```tsx
          <button onClick={() => router.push("/broadcast")} className="flex items-center gap-1.5 bg-accent/[.12] border border-accent/30 rounded-full px-3 py-1.5 font-mono font-semibold text-[12px] tracking-[.08em] uppercase text-accent">
            <div className="w-[7px] h-[7px] rounded-full bg-accent animate-pulse2" /> Трансляция
          </button>
```
на:
```tsx
          <div className="flex items-center gap-2">
            <GamepadLink />
            <button onClick={() => router.push("/broadcast")} className="flex items-center gap-1.5 bg-accent/[.12] border border-accent/30 rounded-full px-3 py-1.5 font-mono font-semibold text-[12px] tracking-[.08em] uppercase text-accent">
              <div className="w-[7px] h-[7px] rounded-full bg-accent animate-pulse2" /> Трансляция
            </button>
          </div>
```

- [ ] **Step 4: Подключить `WinCelebration` (лёгкий вариант)**

В `app/match/page.tsx` корневой контейнер — `relative`, добавить компонент. Заменить открывающий `<div className="px-[22px] pt-[26px] min-h-screen flex flex-col">` на:
```tsx
      <div className="relative px-[22px] pt-[26px] min-h-screen flex flex-col">
        <WinCelebration match={match} variant="match" />
```
(остальное содержимое блока без изменений; `WinCelebration` рендерит абсолютный оверлей внутри `relative`-контейнера.)

- [ ] **Step 5: Проверить типы, сборку, тесты**

Run: `npx tsc --noEmit && npm run build && npx vitest run`
Expected: tsc без ошибок; сборка успешна; тесты зелёные.

- [ ] **Step 6: Коммит**

```bash
git add components/ScoreBoard.tsx app/match/page.tsx
git commit -m "Матч: анимация очка, празднование гейма/сета, иконка геймпада"
```

---

### Task 9: Интеграция на `/broadcast` — крупный анимированный счёт, празднование, мини-корт

**Files:**
- Modify: `app/broadcast/page.tsx`

**Interfaces:**
- Consumes: `AnimatedPoint`, `WinCelebration`, `ServeMiniCourt`.

- [ ] **Step 1: Импорты**

В `app/broadcast/page.tsx` после строки 7 (`import type { MatchState, TeamIndex } ...`) добавить:
```tsx
import { AnimatedPoint } from "@/components/AnimatedPoint";
import { WinCelebration } from "@/components/WinCelebration";
import { ServeMiniCourt } from "@/components/ServeMiniCourt";
```

- [ ] **Step 2: Крупный счёт через `AnimatedPoint`**

В `app/broadcast/page.tsx`, в `TeamSide`, заменить блок крупного очка:
```tsx
        <div
          className="font-display font-black text-[132px] leading-[.82] tnum tracking-[-.04em]"
          style={{
            color: highlight ? "#c6f24e" : "#eef0ea",
            textShadow: highlight ? "0 0 50px rgba(198,242,78,.35)" : undefined,
          }}
        >
          {point}
        </div>
```
на:
```tsx
        <AnimatedPoint
          value={point}
          className="font-display font-black leading-[.82] tracking-[-.04em] text-[clamp(120px,17vw,176px)]"
          style={{
            color: highlight ? "#c6f24e" : "#eef0ea",
            textShadow: highlight ? "0 0 60px rgba(198,242,78,.4)" : undefined,
          }}
        />
```

- [ ] **Step 3: Подключить `WinCelebration` (богатый вариант)**

В `app/broadcast/page.tsx` сразу после открывающего корневого `<div ... className="relative min-h-screen ...">` (он уже `relative`), первой строкой внутри добавить:
```tsx
      <WinCelebration match={match} variant="broadcast" />
```

- [ ] **Step 4: Мини-корт в нижней полосе**

В `app/broadcast/page.tsx` заменить блок статуса геймпада в нижней полосе:
```tsx
        <div className="flex items-center gap-2">
          <div className={`w-[7px] h-[7px] rounded-full ${connected ? "bg-accent animate-pulse2" : "bg-muted3"}`} />
          <span className={`font-mono font-semibold text-[12px] ${connected ? "text-accent" : "text-muted3"}`}>
            {connected ? "Геймпад" : "Нет геймпада"}
          </span>
        </div>
```
на:
```tsx
        <div className="flex items-center gap-4">
          <ServeMiniCourt match={match} />
          <div className="flex items-center gap-2">
            <div className={`w-[7px] h-[7px] rounded-full ${connected ? "bg-accent animate-pulse2" : "bg-muted3"}`} />
            <span className={`font-mono font-semibold text-[12px] ${connected ? "text-accent" : "text-muted3"}`}>
              {connected ? "Геймпад" : "Нет геймпада"}
            </span>
          </div>
        </div>
```

- [ ] **Step 5: Проверить типы, сборку, тесты**

Run: `npx tsc --noEmit && npm run build && npx vitest run`
Expected: tsc без ошибок; сборка успешна; тесты зелёные.

- [ ] **Step 6: Скриншот-проверка (Playwright)**

Запустить дев-сервер, открыть `/` → задать матч → перейти на `/match`, начислить пару очков, открыть `/broadcast`. Снять скриншоты `/match` и `/broadcast`, убедиться: счёт крупный, пунктир подачи виден, мини-корт в трансляции на месте.

Run: `npm run build && npm start` (порт 3000), затем Playwright-навигация и `browser_take_screenshot` для `/match` и `/broadcast`.
Expected: визуально — крупный счёт, пунктир подачи, мини-корт; ошибок в консоли нет.

- [ ] **Step 7: Коммит**

```bash
git add app/broadcast/page.tsx
git commit -m "Трансляция: крупный анимированный счёт, празднование, мини-корт подачи"
```

---

## Self-Review

**Spec coverage:**
- Крупнее счёт в трансляции → Task 9 (Step 2). ✅
- Анимация смены счёта → Task 4 + интеграция Task 8/9. ✅
- Победа в гейме/сете → Task 1 (события) + Task 5 (празднование) + Task 8/9. ✅
- Линии подачи пунктиром на /match → Task 2 + Task 6 (CourtDiagram). ✅
- Мини-схема подачи на /broadcast → Task 6 (ServeMiniCourt) + Task 9. ✅
- Убрать дефолтные имена → Task 7. ✅
- Убрать крестик ✕ → Task 7. ✅
- Вход в экран геймпада → Task 7 (главная) + Task 8 (шапка /match). ✅
- Зависимость только motion → Task 3. ✅
- Тесты чистых функций → Task 1, Task 2. ✅

**Placeholder scan:** нет TBD/«handle edge cases»/«similar to». Весь код приведён.

**Type consistency:** `ScoreEvent`, `diffMatch`, `serveTarget`, `useScoreEvents`, `AnimatedPoint`, `WinCelebration`, `ServeMiniCourt`, `GamepadLink` — сигнатуры согласованы между задачами. `serveTarget` принимает `{x,y}` (подмножество `CourtPos`), в CourtDiagram/ServeMiniCourt передаётся объект сервера с этими полями.

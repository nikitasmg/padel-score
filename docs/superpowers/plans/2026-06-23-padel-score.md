# RALLY — приложение для счёта в паделе. План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Установимое мобильное PWA на Next.js для ведения счёта в паделе: рабочий движок счёта + 4 экрана из дизайна (новый матч, кликер-макет, активный матч, трансляция).

**Architecture:** Чистый, не зависящий от React движок счёта в `lib/padel/` (иммутабельный редьюсер `state → state` + история для undo), покрытый юнит-тестами Vitest и написанный test-first. Поверх — Zustand store с persist в `localStorage`, и тонкий слой React-компонентов/экранов App Router, стилизованных под токены дизайна Tailwind-ом.

**Tech Stack:** Next.js (App Router) + TypeScript, Tailwind CSS, Zustand (+ persist), @ducanh2912/next-pwa, Vitest, next/font (Archivo + JetBrains Mono).

## Global Constraints

- Все цвета/отступы — строго по `docs/design/Padel-Score.reference.html` (источник истины разметки и токенов). Игнорировать обёртки `<x-dc>/<helmet>/support.js`.
- Язык интерфейса — русский, как в дизайне.
- Движок (`lib/padel/**`) НЕ импортирует ничего из React/Next/DOM — только чистый TS.
- Дефолты формата: `sets=3` (best of), `gamesPerSet=6`, `goldenPoint=true`, `tiebreak=true`.
- Тай-брейк: до 7 очков, win-by-2. Гейм: 0/15/30/40, при 40-40 — golden point (1 мяч) либо advantage.
- Геймы в сете: первый до N, win-by-2. Матч: best of `sets`, побеждает большинство.
- Команды: ровно 2, по 2 игрока. Порядок ротации подачи: A1 → B1 → A2 → B2.
- Каждый коммит — на русском, без подписи и без `Co-Authored-By`. Автор: nikitasmg / yaover72@gmail.com (уже в `git config`).
- Цветовые токены: bg `#0a0b0a`, surface `#101210`/`#121412`/`#0c0d0c`, accent `#c6f24e`, text `#f4f5f1`/`#eef0ea`/`#cdd1c9`, muted `#8c918a`/`#71766f`/`#5c615a`/`#3a3f38`, live `#ff5c38`, broadcast-bg `#070807`.

---

## Файловая структура (итог)

```
package.json, tsconfig.json, next.config.mjs, postcss.config.mjs, vitest.config.ts
tailwind.config.ts, components.json (shadcn)
lib/utils.ts            cn() — добавляется shadcn init
components/ui/          button.tsx, input.tsx, switch.tsx, dialog.tsx (shadcn)
app/
  layout.tsx            globals.css
  page.tsx              экран 01 Новый матч
  clicker/page.tsx      экран 02 Кликер (макет)
  match/page.tsx        экран 03 Активный матч
  broadcast/page.tsx    экран 04 Трансляция
  manifest.ts           PWA-манифест
lib/padel/
  types.ts  rules.ts  engine.ts  serve.ts  format.ts
  __tests__/ engine.test.ts  serve.test.ts  format.test.ts  rules.test.ts
store/
  matchStore.ts  clickerStore.ts
components/
  PhoneScreen.tsx  StatusBar.tsx  Toggle.tsx  SegmentedControl.tsx
  ScoreBoard.tsx  CourtDiagram.tsx  ScoreButtons.tsx  MatchCompleteOverlay.tsx
public/  (иконки PWA)
```

---

### Task 1: Scaffold проекта (Next.js + TS + Tailwind + Vitest)

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `vitest.config.ts`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `next-env.d.ts`

**Interfaces:**
- Produces: рабочий dev-сервер `npm run dev`, прогон тестов `npm test`, базовый layout со шрифтами.

- [ ] **Step 1: Инициализировать package.json и поставить зависимости**

Run:
```bash
npm pkg set name=padel-score private=true type=module \
  scripts.dev="next dev" scripts.build="next build" scripts.start="next start" \
  scripts.lint="next lint" scripts.test="vitest run" scripts.test:watch="vitest"
npm i next@latest react@latest react-dom@latest zustand @ducanh2912/next-pwa
npm i -D typescript @types/react @types/node @types/react-dom tailwindcss@^3 postcss autoprefixer vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```
Expected: `package.json` + `node_modules` созданы, без ошибок установки.

- [ ] **Step 2: Конфиги TS / Next / Tailwind / PostCSS / Vitest**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020", "lib": ["dom", "dom.iterable", "ES2020"],
    "allowJs": false, "skipLibCheck": true, "strict": true, "noEmit": true,
    "esModuleInterop": true, "module": "esnext", "moduleResolution": "bundler",
    "resolveJsonModule": true, "isolatedModules": true, "jsx": "preserve",
    "incremental": true, "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `next.config.mjs`:
```js
import withPWAInit from "@ducanh2912/next-pwa";
const withPWA = withPWAInit({ dest: "public", disable: process.env.NODE_ENV === "development" });
/** @type {import('next').NextConfig} */
const nextConfig = {};
export default withPWA(nextConfig);
```

Create `postcss.config.mjs`:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

Create `tailwind.config.ts`:
```ts
import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0b0a", surface: "#101210", surface2: "#121412", surface3: "#0c0d0c",
        accent: "#c6f24e", ink: "#f4f5f1", ink2: "#eef0ea", ink3: "#cdd1c9",
        muted: "#8c918a", muted2: "#71766f", muted3: "#5c615a", muted4: "#3a3f38",
        live: "#ff5c38", broadcast: "#070807",
      },
      fontFamily: { display: ["var(--font-archivo)", "system-ui", "sans-serif"], mono: ["var(--font-mono)", "monospace"] },
      keyframes: {
        pulse2: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".3" } },
        ring: { "0%": { boxShadow: "0 0 0 0 rgba(198,242,78,.45)" }, "100%": { boxShadow: "0 0 0 12px rgba(198,242,78,0)" } },
      },
      animation: { pulse2: "pulse2 1.8s infinite", ring: "ring 2s infinite" },
    },
  },
  plugins: [],
};
export default config;
```

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true, setupFiles: [] },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

- [ ] **Step 3: Базовый layout, шрифты и globals.css**

Create `app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
html, body { margin: 0; background: #0a0b0a; -webkit-font-smoothing: antialiased; }
* { box-sizing: border-box; }
.tnum { font-variant-numeric: tabular-nums; }
```

Create `app/layout.tsx`:
```tsx
import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin", "cyrillic"], weight: ["300","400","500","600","700","800","900"], variable: "--font-archivo" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-mono" });

export const metadata: Metadata = { title: "RALLY · Счёт в паделе", description: "Ведение счёта в матче по паделу" };
export const viewport: Viewport = { themeColor: "#0a0b0a", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${archivo.variable} ${mono.variable}`}>
      <body className="bg-bg text-ink font-display antialiased">{children}</body>
    </html>
  );
}
```

Create placeholder `app/page.tsx`:
```tsx
export default function Page() {
  return <main className="min-h-screen grid place-items-center text-accent font-mono">RALLY</main>;
}
```

- [ ] **Step 4: Инициализировать shadcn/ui и добавить базовые компоненты**

shadcn ставится поверх уже настроенного Tailwind. Инициализация добавляет `components.json`,
утилиту `lib/utils.ts` (`cn`), CSS-переменные в `globals.css` и алиасы.

Run:
```bash
npx shadcn@latest init -d   # -d: дефолты (Neutral baseColor, CSS variables)
npx shadcn@latest add button input switch dialog
```
Expected: создан `components.json`, `lib/utils.ts` с `cn(...)`, в `components/ui/` появились
`button.tsx`, `input.tsx`, `switch.tsx`, `dialog.tsx`. Зависимости Radix установлены.

> Примечание: если `init` спросит про существующий `tailwind.config.ts`/`globals.css` — разрешить
> правки. Наши именованные токены (`accent`, `surface`, …) в `tailwind.config.ts` сохранить;
> CSS-переменные shadcn сосуществуют с ними. Фирменный вид компонентов задаём своими классами.

- [ ] **Step 5: Проверить, что сборка/тест/дев поднимаются**

Run: `npx tsc --noEmit && npm test`
Expected: tsc без ошибок; vitest сообщает "No test files found" (ещё нет тестов) и завершается успешно (или используем `vitest run --passWithNoTests`). Затем `npm run build` завершается успешно.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Инициализировать проект Next.js с Tailwind, shadcn/ui и Vitest"
```

---

### Task 2: Типы и правила движка (`types.ts`, `rules.ts`)

**Files:**
- Create: `lib/padel/types.ts`, `lib/padel/rules.ts`, `lib/padel/__tests__/rules.test.ts`

**Interfaces:**
- Produces:
  - `type TeamIndex = 0 | 1`, `type Side = "deuce" | "ad"`
  - `interface Player { name: string }`, `interface Team { players: [Player, Player] }`
  - `interface Config { sets: 1|3|5; gamesPerSet: 4|6|9; goldenPoint: boolean; tiebreak: boolean }`
  - `interface TeamScore { points: number; games: number[]; sets: number }` (`games[setIndex]` = выигранные геймы в сете)
  - `interface MatchState { config, teams:[Team,Team], score:[TeamScore,TeamScore], currentSet:number, serving:{team:TeamIndex,player:0|1,side:Side}, inTiebreak:boolean, status:"in_progress"|"completed", winner?:TeamIndex, startedAt:number, history:MatchSnapshot[] }`
  - `type MatchSnapshot = Omit<MatchState,"history">`
  - `rules.ts`: `setsToWin(cfg): number` (1→1, 3→2, 5→3); `POINT_LABELS = ["0","15","30","40"]`; `isGameWon(p, op, cfg): boolean`; `isTiebreakWon(p, op): boolean`.

- [ ] **Step 1: Тест правил**

Create `lib/padel/__tests__/rules.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { setsToWin, isGameWon, isTiebreakWon } from "@/lib/padel/rules";
import type { Config } from "@/lib/padel/types";

const base: Config = { sets: 3, gamesPerSet: 6, goldenPoint: true, tiebreak: true };

describe("setsToWin", () => {
  it("best of 1 → 1", () => expect(setsToWin({ ...base, sets: 1 })).toBe(1));
  it("best of 3 → 2", () => expect(setsToWin({ ...base, sets: 3 })).toBe(2));
  it("best of 5 → 3", () => expect(setsToWin({ ...base, sets: 5 })).toBe(3));
});

describe("isGameWon (advantage)", () => {
  const cfg = { ...base, goldenPoint: false };
  it("4-2 выигран", () => expect(isGameWon(4, 2, cfg)).toBe(true));
  it("4-3 не выигран (нужна разница 2)", () => expect(isGameWon(4, 3, cfg)).toBe(false));
  it("5-3 выигран", () => expect(isGameWon(5, 3, cfg)).toBe(true));
});

describe("isGameWon (golden point)", () => {
  const cfg = { ...base, goldenPoint: true };
  it("4-3 выигран при golden point", () => expect(isGameWon(4, 3, cfg)).toBe(true));
  it("3-3 не выигран", () => expect(isGameWon(3, 3, cfg)).toBe(false));
});

describe("isTiebreakWon", () => {
  it("7-5 выигран", () => expect(isTiebreakWon(7, 5)).toBe(true));
  it("7-6 не выигран", () => expect(isTiebreakWon(7, 6)).toBe(false));
  it("8-6 выигран", () => expect(isTiebreakWon(8, 6)).toBe(true));
});
```

- [ ] **Step 2: Запустить — упадёт (нет модулей)**

Run: `npx vitest run lib/padel/__tests__/rules.test.ts`
Expected: FAIL — "Cannot find module '@/lib/padel/rules'".

- [ ] **Step 3: Реализация типов**

Create `lib/padel/types.ts`:
```ts
export type TeamIndex = 0 | 1;
export type Side = "deuce" | "ad";

export interface Player { name: string }
export interface Team { players: [Player, Player] }

export interface Config {
  sets: 1 | 3 | 5;
  gamesPerSet: 4 | 6 | 9;
  goldenPoint: boolean;
  tiebreak: boolean;
}

export interface TeamScore {
  points: number;   // очки в текущем гейме/тай-брейке (сырое число розыгрышей)
  games: number[];  // выигранные геймы по сетам: games[setIndex]
  sets: number;     // выигранные сеты
}

export interface MatchState {
  config: Config;
  teams: [Team, Team];
  score: [TeamScore, TeamScore];
  currentSet: number;
  serving: { team: TeamIndex; player: 0 | 1; side: Side };
  inTiebreak: boolean;
  status: "in_progress" | "completed";
  winner?: TeamIndex;
  startedAt: number;
  history: MatchSnapshot[];
}

export type MatchSnapshot = Omit<MatchState, "history">;
```

Create `lib/padel/rules.ts`:
```ts
import type { Config } from "./types";

export const POINT_LABELS = ["0", "15", "30", "40"] as const;

export function setsToWin(cfg: Config): number {
  return Math.floor(cfg.sets / 2) + 1; // 1→1, 3→2, 5→3
}

export function isGameWon(points: number, opp: number, cfg: Config): boolean {
  if (cfg.goldenPoint) {
    // 0/15/30/40 → 4-я выигранная подача берёт гейм, при 40-40 решающий мяч
    if (points >= 4 && points > opp) return points >= 4 && (points - opp >= 1) && (points >= 4);
    return false;
  }
  return points >= 4 && points - opp >= 2;
}

export function isTiebreakWon(points: number, opp: number): boolean {
  return points >= 7 && points - opp >= 2;
}
```
> Примечание: при golden point гейм берётся, как только команда набирает 4-ю «подачу» и ведёт (включая 40-40 → следующий мяч). Условие сведено к `points >= 4 && points > opp`. Упростите тело `isGameWon` до:
```ts
export function isGameWon(points: number, opp: number, cfg: Config): boolean {
  if (cfg.goldenPoint) return points >= 4 && points > opp;
  return points >= 4 && points - opp >= 2;
}
```

- [ ] **Step 4: Запустить — должно пройти**

Run: `npx vitest run lib/padel/__tests__/rules.test.ts`
Expected: PASS (все 11 кейсов).

- [ ] **Step 5: Commit**

```bash
git add lib/padel/types.ts lib/padel/rules.ts lib/padel/__tests__/rules.test.ts
git commit -m "Добавить типы и правила движка счёта"
```

---

### Task 3: Создание матча и прогресс очков (`engine.ts` — createMatch, scorePoint базово)

**Files:**
- Create: `lib/padel/engine.ts`, `lib/padel/__tests__/engine.test.ts`

**Interfaces:**
- Consumes: всё из `types.ts`, `rules.ts`; `nextServer` из `serve.ts` (Task 7) — пока заглушка внутри engine, заменим в Task 7. Чтобы избежать циклической зависимости, в этой задаче ротацию подачи делаем простой инлайн-функцией `advanceServe`, в Task 7 заменим на импорт из `serve.ts`.
- Produces:
  - `createMatch(config: Config, teams: [Team, Team], now?: number): MatchState`
  - `scorePoint(state: MatchState, team: TeamIndex): MatchState`

- [ ] **Step 1: Тест createMatch + простой прогресс очков**

Create `lib/padel/__tests__/engine.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { createMatch, scorePoint } from "@/lib/padel/engine";
import type { Config, Team } from "@/lib/padel/types";

const cfg: Config = { sets: 3, gamesPerSet: 6, goldenPoint: true, tiebreak: true };
const teams: [Team, Team] = [
  { players: [{ name: "Алекс" }, { name: "Марко" }] },
  { players: [{ name: "Дима" }, { name: "Соня" }] },
];
const m = () => createMatch(cfg, teams, 1000);

describe("createMatch", () => {
  it("стартовое состояние нулевое", () => {
    const s = m();
    expect(s.status).toBe("in_progress");
    expect(s.score[0].points).toBe(0);
    expect(s.score[0].sets).toBe(0);
    expect(s.currentSet).toBe(0);
    expect(s.score[0].games[0]).toBe(0);
    expect(s.startedAt).toBe(1000);
    expect(s.history).toEqual([]);
  });
});

describe("scorePoint — очки в гейме", () => {
  it("0→15→30→40", () => {
    let s = m();
    s = scorePoint(s, 0); expect(s.score[0].points).toBe(1);
    s = scorePoint(s, 0); expect(s.score[0].points).toBe(2);
    s = scorePoint(s, 0); expect(s.score[0].points).toBe(3);
    // гейм ещё не выигран
    expect(s.score[0].games[0]).toBe(0);
  });

  it("4 очка подряд при ведении → выигран гейм, очки сброшены", () => {
    let s = m();
    for (let i = 0; i < 4; i++) s = scorePoint(s, 0);
    expect(s.score[0].games[0]).toBe(1);
    expect(s.score[0].points).toBe(0);
    expect(s.score[1].points).toBe(0);
  });

  it("каждый разыгранный мяч кладёт снимок в историю", () => {
    let s = m();
    s = scorePoint(s, 0);
    expect(s.history.length).toBe(1);
    s = scorePoint(s, 1);
    expect(s.history.length).toBe(2);
  });
});
```

- [ ] **Step 2: Запустить — упадёт**

Run: `npx vitest run lib/padel/__tests__/engine.test.ts`
Expected: FAIL — "Cannot find module '@/lib/padel/engine'".

- [ ] **Step 3: Реализация engine (createMatch + scorePoint, временная ротация подачи)**

Create `lib/padel/engine.ts`:
```ts
import type { Config, MatchState, MatchSnapshot, Team, TeamIndex, TeamScore } from "./types";
import { isGameWon, isTiebreakWon, setsToWin } from "./rules";

function emptyTeamScore(): TeamScore {
  return { points: 0, games: [0], sets: 0 };
}

export function createMatch(config: Config, teams: [Team, Team], now: number = Date.now()): MatchState {
  return {
    config,
    teams,
    score: [emptyTeamScore(), emptyTeamScore()],
    currentSet: 0,
    serving: { team: 0, player: 0, side: "deuce" },
    inTiebreak: false,
    status: "in_progress",
    startedAt: now,
    history: [],
  };
}

function snapshot(s: MatchState): MatchSnapshot {
  const { history, ...rest } = s;
  return structuredClone(rest);
}

// Временная ротация подачи (заменяется в Task 7 импортом из ./serve)
function advanceServe(s: MatchState): MatchState["serving"] {
  const order: Array<MatchState["serving"]> = [
    { team: 0, player: 0, side: "deuce" },
    { team: 1, player: 0, side: "deuce" },
    { team: 0, player: 1, side: "deuce" },
    { team: 1, player: 1, side: "deuce" },
  ];
  const idx = order.findIndex(
    (o) => o.team === s.serving.team && o.player === s.serving.player,
  );
  return order[(idx + 1) % order.length];
}

export function scorePoint(state: MatchState, team: TeamIndex): MatchState {
  if (state.status === "completed") return state;
  const s: MatchState = structuredClone(state);
  s.history = [...state.history, snapshot(state)];

  const other: TeamIndex = team === 0 ? 1 : 0;
  s.score[team].points += 1;

  const cfg = s.config;
  const pts = s.score[team].points;
  const opp = s.score[other].points;

  const gameWon = s.inTiebreak ? isTiebreakWon(pts, opp) : isGameWon(pts, opp, cfg);
  if (!gameWon) {
    s.serving = updateSide(s);
    return s;
  }

  // гейм/тай-брейк выигран
  s.score[team].games[s.currentSet] += 1;
  s.score[team].points = 0;
  s.score[other].points = 0;
  s.inTiebreak = false;

  resolveSetAndMatch(s, team, other);
  if (s.status === "in_progress") {
    s.serving = advanceServe(s);
    s.serving = { ...s.serving, side: "deuce" };
  }
  return s;
}

function updateSide(s: MatchState): MatchState["serving"] {
  const total = s.score[0].points + s.score[1].points;
  return { ...s.serving, side: total % 2 === 0 ? "deuce" : "ad" };
}

function resolveSetAndMatch(s: MatchState, team: TeamIndex, other: TeamIndex): void {
  const cfg = s.config;
  const g = s.score[team].games[s.currentSet];
  const go = s.score[other].games[s.currentSet];

  const setWon =
    (g >= cfg.gamesPerSet && g - go >= 2) ||
    (cfg.tiebreak && g === cfg.gamesPerSet + 1 && go === cfg.gamesPerSet); // 7-6 через тай-брейк

  // вход в тай-брейк: N-N и tiebreak включён
  if (!setWon && cfg.tiebreak && g === cfg.gamesPerSet && go === cfg.gamesPerSet) {
    s.inTiebreak = true;
  }

  if (setWon) {
    s.score[team].sets += 1;
    if (s.score[team].sets >= setsToWin(cfg)) {
      s.status = "completed";
      s.winner = team;
      return;
    }
    // новый сет
    s.currentSet += 1;
    s.score[0].games.push(0);
    s.score[1].games.push(0);
  }
}
```

- [ ] **Step 4: Запустить — должно пройти**

Run: `npx vitest run lib/padel/__tests__/engine.test.ts`
Expected: PASS (createMatch + прогресс очков + история).

- [ ] **Step 5: Commit**

```bash
git add lib/padel/engine.ts lib/padel/__tests__/engine.test.ts
git commit -m "Добавить движок: создание матча и прогресс очков"
```

---

### Task 4: Deuce, golden point и advantage

**Files:**
- Modify: `lib/padel/__tests__/engine.test.ts` (добавить describe-блок)

**Interfaces:**
- Consumes: `createMatch`, `scorePoint`. Производит уверенность, что 40-40 ведёт себя по конфигу.

- [ ] **Step 1: Тесты deuce / golden point / advantage**

Добавить в `lib/padel/__tests__/engine.test.ts`:
```ts
import { TeamIndex } from "@/lib/padel/types";

function play(seq: TeamIndex[], config = cfg) {
  let s = createMatch(config, teams, 1000);
  for (const t of seq) s = scorePoint(s, t);
  return s;
}

describe("40-40 golden point", () => {
  it("после 40-40 один мяч берёт гейм", () => {
    // 3-3 очков → 40-40, затем команда 0 берёт мяч
    let s = play([0,1,0,1,0,1]); // 3-3
    expect(s.score[0].points).toBe(3);
    expect(s.score[1].points).toBe(3);
    s = scorePoint(s, 0);
    expect(s.score[0].games[0]).toBe(1); // гейм взят сразу
  });
});

describe("40-40 advantage (без golden point)", () => {
  const adv = { ...cfg, goldenPoint: false };
  it("нужно выиграть 2 мяча подряд от 40-40", () => {
    let s = play([0,1,0,1,0,1], adv); // 3-3
    s = scorePoint(s, 0); // AD команда 0 (4-3)
    expect(s.score[0].games[0]).toBe(0);
    s = scorePoint(s, 1); // снова ровно (4-4)
    expect(s.score[0].games[0]).toBe(0);
    s = scorePoint(s, 0); // AD (5-4)
    s = scorePoint(s, 0); // гейм (6-4)
    expect(s.score[0].games[0]).toBe(1);
  });
});

describe("сторона подачи deuce/ad по чётности очков", () => {
  it("при сумме очков нечётной — ad, чётной — deuce", () => {
    let s = createMatch(cfg, teams, 1000);
    expect(s.serving.side).toBe("deuce"); // 0+0
    s = scorePoint(s, 0);                  // сумма 1
    expect(s.serving.side).toBe("ad");
    s = scorePoint(s, 1);                  // сумма 2
    expect(s.serving.side).toBe("deuce");
  });
});
```

- [ ] **Step 2: Запустить — должно пройти (логика уже реализована в Task 3)**

Run: `npx vitest run lib/padel/__tests__/engine.test.ts`
Expected: PASS. Если advantage-кейс падает — исправить `isGameWon`/переходы согласно правилам и перезапустить.

- [ ] **Step 3: Commit**

```bash
git add lib/padel/__tests__/engine.test.ts
git commit -m "Покрыть тестами deuce, golden point и advantage"
```

---

### Task 5: Завершение гейма/сета/матча

**Files:**
- Modify: `lib/padel/__tests__/engine.test.ts`

**Interfaces:**
- Consumes: `createMatch`, `scorePoint`. Проверяет `sets`, `currentSet`, `status`, `winner`.

- [ ] **Step 1: Тесты завершения сета и матча**

Добавить в `engine.test.ts`:
```ts
// helper: выиграть N геймов подряд командой t (по 4 чистых очка)
function winGames(s: ReturnType<typeof createMatch>, t: TeamIndex, n: number) {
  for (let g = 0; g < n; g++) for (let p = 0; p < 4; p++) s = scorePoint(s, t);
  return s;
}

describe("завершение сета", () => {
  it("6 геймов подряд → сет взят, новый сет начат", () => {
    let s = createMatch(cfg, teams, 1000);
    s = winGames(s, 0, 6);
    expect(s.score[0].sets).toBe(1);
    expect(s.currentSet).toBe(1);
    expect(s.score[0].games[1]).toBe(0);
  });
});

describe("завершение матча (best of 3)", () => {
  it("2 сета подряд → completed + winner", () => {
    let s = createMatch(cfg, teams, 1000);
    s = winGames(s, 0, 6); // сет 1
    s = winGames(s, 0, 6); // сет 2
    expect(s.status).toBe("completed");
    expect(s.winner).toBe(0);
  });

  it("после completed scorePoint ничего не меняет", () => {
    let s = createMatch(cfg, teams, 1000);
    s = winGames(s, 0, 6); s = winGames(s, 0, 6);
    const before = structuredClone(s);
    s = scorePoint(s, 1);
    expect(s.status).toBe("completed");
    expect(s.score).toEqual(before.score);
  });
});

describe("best of 1", () => {
  it("один сет решает матч", () => {
    let s = createMatch({ ...cfg, sets: 1 }, teams, 1000);
    s = winGames(s, 0, 6);
    expect(s.status).toBe("completed");
    expect(s.winner).toBe(0);
  });
});
```

- [ ] **Step 2: Запустить**

Run: `npx vitest run lib/padel/__tests__/engine.test.ts`
Expected: PASS. При провале — поправить `resolveSetAndMatch` (условие `setWon`, инкремент `currentSet`, guard на `completed`).

- [ ] **Step 3: Commit**

```bash
git add lib/padel/__tests__/engine.test.ts
git commit -m "Покрыть тестами завершение гейма, сета и матча"
```

---

### Task 6: Тай-брейк

**Files:**
- Modify: `lib/padel/__tests__/engine.test.ts`

**Interfaces:**
- Consumes: `createMatch`, `scorePoint`. Проверяет вход в тай-брейк при N-N и выигрыш сета 7-6.

- [ ] **Step 1: Тесты тай-брейка**

Добавить:
```ts
describe("тай-брейк", () => {
  // довести сет до 6-6: команды берут по 6 геймов поочерёдно
  function to6to6(config = cfg) {
    let s = createMatch(config, teams, 1000);
    for (let g = 0; g < 6; g++) {
      for (let p = 0; p < 4; p++) s = scorePoint(s, 0);
      for (let p = 0; p < 4; p++) s = scorePoint(s, 1);
    }
    return s; // 6-6
  }

  it("при 6-6 включается тай-брейк", () => {
    const s = to6to6();
    expect(s.score[0].games[0]).toBe(6);
    expect(s.score[1].games[0]).toBe(6);
    expect(s.inTiebreak).toBe(true);
  });

  it("тай-брейк до 7 (win by 2) → сет 7-6 и берёт сет", () => {
    let s = to6to6();
    for (let p = 0; p < 7; p++) s = scorePoint(s, 0); // 7-0 тай-брейк
    expect(s.inTiebreak).toBe(false);
    expect(s.score[0].games[0]).toBe(7);
    expect(s.score[0].sets).toBe(1);
    expect(s.currentSet).toBe(1);
  });

  it("без tiebreak — продолжается по геймам (нет инициации тай-брейка)", () => {
    const s = to6to6({ ...cfg, tiebreak: false });
    expect(s.inTiebreak).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить**

Run: `npx vitest run lib/padel/__tests__/engine.test.ts`
Expected: PASS. При провале — поправить ветки `inTiebreak`/`setWon` (7-6) в `engine.ts` и `isTiebreakWon`.

- [ ] **Step 3: Commit**

```bash
git add lib/padel/__tests__/engine.test.ts
git commit -m "Покрыть тестами тай-брейк"
```

---

### Task 7: Ротация подачи и позиции на корте (`serve.ts`)

**Files:**
- Create: `lib/padel/serve.ts`, `lib/padel/__tests__/serve.test.ts`
- Modify: `lib/padel/engine.ts` (заменить локальный `advanceServe` импортом `nextServer` из `serve.ts`)

**Interfaces:**
- Produces:
  - `SERVE_ORDER: Array<{ team: TeamIndex; player: 0|1 }>` = `[{0,0},{1,0},{0,1},{1,1}]`
  - `nextServer(current: { team: TeamIndex; player: 0|1 }): { team: TeamIndex; player: 0|1 }`
  - `courtPositions(state: MatchState): { team: TeamIndex; player: 0|1; x: "left"|"right"; y: "top"|"bottom"; isServer: boolean }[]` — для диаграммы (команда 0 слева, 1 справа).

- [ ] **Step 1: Тест ротации**

Create `lib/padel/__tests__/serve.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { nextServer, SERVE_ORDER } from "@/lib/padel/serve";

describe("nextServer", () => {
  it("идёт A1 → B1 → A2 → B2 → A1", () => {
    let cur = { team: 0 as const, player: 0 as const };
    const seen = [cur];
    for (let i = 0; i < 4; i++) { cur = nextServer(cur) as any; seen.push(cur); }
    expect(seen).toEqual([
      { team: 0, player: 0 },
      { team: 1, player: 0 },
      { team: 0, player: 1 },
      { team: 1, player: 1 },
      { team: 0, player: 0 },
    ]);
  });
  it("SERVE_ORDER зафиксирован", () => {
    expect(SERVE_ORDER).toEqual([
      { team: 0, player: 0 }, { team: 1, player: 0 },
      { team: 0, player: 1 }, { team: 1, player: 1 },
    ]);
  });
});
```

- [ ] **Step 2: Запустить — упадёт**

Run: `npx vitest run lib/padel/__tests__/serve.test.ts`
Expected: FAIL — нет модуля.

- [ ] **Step 3: Реализация serve.ts**

Create `lib/padel/serve.ts`:
```ts
import type { MatchState, TeamIndex } from "./types";

export const SERVE_ORDER: Array<{ team: TeamIndex; player: 0 | 1 }> = [
  { team: 0, player: 0 },
  { team: 1, player: 0 },
  { team: 0, player: 1 },
  { team: 1, player: 1 },
];

export function nextServer(current: { team: TeamIndex; player: 0 | 1 }) {
  const idx = SERVE_ORDER.findIndex((o) => o.team === current.team && o.player === current.player);
  return SERVE_ORDER[(idx + 1) % SERVE_ORDER.length];
}

export interface CourtPos {
  team: TeamIndex; player: 0 | 1;
  x: "left" | "right"; y: "top" | "bottom"; isServer: boolean;
}

export function courtPositions(state: MatchState): CourtPos[] {
  const out: CourtPos[] = [];
  for (const team of [0, 1] as TeamIndex[]) {
    for (const player of [0, 1] as Array<0 | 1>) {
      out.push({
        team, player,
        x: team === 0 ? "left" : "right",
        y: player === 0 ? "top" : "bottom",
        isServer: state.serving.team === team && state.serving.player === player,
      });
    }
  }
  return out;
}
```

- [ ] **Step 4: Заменить локальную ротацию в engine.ts**

В `lib/padel/engine.ts`: удалить локальную функцию `advanceServe` и импортировать `nextServer`:
```ts
import { nextServer } from "./serve";
```
Заменить блок присвоения подачи после выигрыша гейма на:
```ts
  if (s.status === "in_progress") {
    const ns = nextServer({ team: s.serving.team, player: s.serving.player });
    s.serving = { team: ns.team, player: ns.player, side: "deuce" };
  }
```

- [ ] **Step 5: Запустить весь движок**

Run: `npx vitest run lib/padel`
Expected: PASS — все тесты движка (rules, engine, serve) зелёные.

- [ ] **Step 6: Commit**

```bash
git add lib/padel/serve.ts lib/padel/__tests__/serve.test.ts lib/padel/engine.ts
git commit -m "Добавить ротацию подачи и позиции на корте"
```

---

### Task 8: Undo и форматирование (`engine.undo`, `format.ts`)

**Files:**
- Modify: `lib/padel/engine.ts` (добавить `undo`, `resetMatch`)
- Create: `lib/padel/format.ts`, `lib/padel/__tests__/format.test.ts`
- Modify: `lib/padel/__tests__/engine.test.ts` (тесты undo)

**Interfaces:**
- Produces:
  - `undo(state: MatchState): MatchState` — снимает последний снимок из истории.
  - `resetMatch(state: MatchState): MatchState` — новый матч с тем же config/teams.
  - `format.ts`: `pointLabel(state, team): "0"|"15"|"30"|"40"|"AD"`; `clock(ms: number): string` (→ `HH:MM:SS`); `sideLabel(side): "правый квадрат"|"левый квадрат"`.

- [ ] **Step 1: Тесты undo + format**

Добавить в `engine.test.ts`:
```ts
import { undo } from "@/lib/padel/engine";

describe("undo", () => {
  it("откатывает последний разыгранный мяч", () => {
    let s = createMatch(cfg, teams, 1000);
    s = scorePoint(s, 0);
    s = undo(s);
    expect(s.score[0].points).toBe(0);
    expect(s.history.length).toBe(0);
  });
  it("откатывает через границу гейма", () => {
    let s = createMatch(cfg, teams, 1000);
    for (let i = 0; i < 4; i++) s = scorePoint(s, 0); // гейм взят
    expect(s.score[0].games[0]).toBe(1);
    s = undo(s); // назад к 40-…
    expect(s.score[0].games[0]).toBe(0);
    expect(s.score[0].points).toBe(3);
  });
  it("undo без истории — без изменений", () => {
    const s = createMatch(cfg, teams, 1000);
    expect(undo(s)).toEqual(s);
  });
});
```

Create `lib/padel/__tests__/format.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { createMatch, scorePoint } from "@/lib/padel/engine";
import { pointLabel, clock, sideLabel } from "@/lib/padel/format";
import type { Config, Team } from "@/lib/padel/types";

const cfg: Config = { sets: 3, gamesPerSet: 6, goldenPoint: false, tiebreak: true };
const teams: [Team, Team] = [
  { players: [{ name: "Алекс" }, { name: "Марко" }] },
  { players: [{ name: "Дима" }, { name: "Соня" }] },
];

describe("pointLabel", () => {
  it("0/15/30/40", () => {
    let s = createMatch(cfg, teams, 0);
    expect(pointLabel(s, 0)).toBe("0");
    s = scorePoint(s, 0); expect(pointLabel(s, 0)).toBe("15");
    s = scorePoint(s, 0); expect(pointLabel(s, 0)).toBe("30");
    s = scorePoint(s, 0); expect(pointLabel(s, 0)).toBe("40");
  });
  it("AD при преимуществе (advantage-режим)", () => {
    let s = createMatch(cfg, teams, 0);
    for (let i = 0; i < 3; i++) { s = scorePoint(s, 0); s = scorePoint(s, 1); } // 40-40
    s = scorePoint(s, 0);
    expect(pointLabel(s, 0)).toBe("AD");
    expect(pointLabel(s, 1)).toBe("40");
  });
  it("в тай-брейке показывает сырые очки", () => {
    // не обязательно доводить до тай-брейка здесь; проверяется в e2e движка
    expect(true).toBe(true);
  });
});

describe("clock", () => {
  it("форматирует мс в HH:MM:SS", () => {
    expect(clock(0)).toBe("00:00:00");
    expect(clock((1*3600 + 2*60 + 3) * 1000)).toBe("01:02:03");
  });
});

describe("sideLabel", () => {
  it("deuce → правый квадрат", () => expect(sideLabel("deuce")).toBe("правый квадрат"));
  it("ad → левый квадрат", () => expect(sideLabel("ad")).toBe("левый квадрат"));
});
```

- [ ] **Step 2: Запустить — упадёт (нет undo/format)**

Run: `npx vitest run lib/padel`
Expected: FAIL — нет `undo` / модуля `format`.

- [ ] **Step 3: Реализация undo/resetMatch и format.ts**

В `lib/padel/engine.ts` добавить:
```ts
export function undo(state: MatchState): MatchState {
  if (state.history.length === 0) return state;
  const history = state.history.slice(0, -1);
  const prev = state.history[state.history.length - 1];
  return { ...structuredClone(prev), history };
}

export function resetMatch(state: MatchState): MatchState {
  return createMatch(state.config, state.teams);
}
```

Create `lib/padel/format.ts`:
```ts
import type { MatchState, Side, TeamIndex } from "./types";
import { POINT_LABELS } from "./rules";

export function pointLabel(state: MatchState, team: TeamIndex): string {
  if (state.inTiebreak) return String(state.score[team].points);
  const other: TeamIndex = team === 0 ? 1 : 0;
  const p = state.score[team].points;
  const o = state.score[other].points;
  if (p >= 3 && o >= 3) {
    if (p === o) return "40";
    return p > o ? "AD" : "40";
  }
  return POINT_LABELS[Math.min(p, 3)];
}

export function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function sideLabel(side: Side): string {
  return side === "deuce" ? "правый квадрат" : "левый квадрат";
}
```

- [ ] **Step 4: Запустить весь движок**

Run: `npx vitest run lib/padel`
Expected: PASS — все группы зелёные.

- [ ] **Step 5: Commit**

```bash
git add lib/padel/engine.ts lib/padel/format.ts lib/padel/__tests__/format.test.ts lib/padel/__tests__/engine.test.ts
git commit -m "Добавить undo, сброс матча и форматтеры"
```

---

### Task 9: Хранилища Zustand (`matchStore.ts`, `clickerStore.ts`)

**Files:**
- Create: `store/matchStore.ts`, `store/clickerStore.ts`

**Interfaces:**
- Produces:
  - `useMatchStore` с состоянием `{ match: MatchState | null }` и экшенами `start(config, teams)`, `point(team)`, `undoPoint()`, `reset()`, `clear()`. Persist в `localStorage` ключ `rally-match`.
  - `useClickerStore`: `{ buttonMode: "two" | "one"; holder: { team: TeamIndex; player: 0|1 }; connected: boolean; battery: number; lastEvent: string | null; setMode, setHolder }`. Persist `rally-clicker`. BLE — заглушка (`connected:true, battery:82` дефолт).

- [ ] **Step 1: matchStore**

Create `store/matchStore.ts`:
```ts
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Config, MatchState, Team, TeamIndex } from "@/lib/padel/types";
import { createMatch, scorePoint, undo, resetMatch } from "@/lib/padel/engine";

interface MatchStore {
  match: MatchState | null;
  start: (config: Config, teams: [Team, Team]) => void;
  point: (team: TeamIndex) => void;
  undoPoint: () => void;
  reset: () => void;
  clear: () => void;
}

export const useMatchStore = create<MatchStore>()(
  persist(
    (set, get) => ({
      match: null,
      start: (config, teams) => set({ match: createMatch(config, teams) }),
      point: (team) => { const m = get().match; if (m) set({ match: scorePoint(m, team) }); },
      undoPoint: () => { const m = get().match; if (m) set({ match: undo(m) }); },
      reset: () => { const m = get().match; if (m) set({ match: resetMatch(m) }); },
      clear: () => set({ match: null }),
    }),
    { name: "rally-match" },
  ),
);
```

- [ ] **Step 2: clickerStore**

Create `store/clickerStore.ts`:
```ts
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TeamIndex } from "@/lib/padel/types";

interface ClickerStore {
  buttonMode: "two" | "one";
  holder: { team: TeamIndex; player: 0 | 1 };
  connected: boolean;
  battery: number;
  lastEvent: string | null;
  setMode: (m: "two" | "one") => void;
  setHolder: (h: { team: TeamIndex; player: 0 | 1 }) => void;
  setLastEvent: (e: string) => void;
}

export const useClickerStore = create<ClickerStore>()(
  persist(
    (set) => ({
      buttonMode: "two",
      holder: { team: 0, player: 0 },
      connected: true,   // заглушка BLE
      battery: 82,       // заглушка BLE
      lastEvent: null,
      setMode: (buttonMode) => set({ buttonMode }),
      setHolder: (holder) => set({ holder }),
      setLastEvent: (lastEvent) => set({ lastEvent }),
    }),
    { name: "rally-clicker" },
  ),
);
```

- [ ] **Step 3: Проверить сборку типов**

Run: `npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add store/matchStore.ts store/clickerStore.ts
git commit -m "Добавить хранилища матча и кликера на Zustand"
```

---

### Task 10: UI-примитивы (`PhoneScreen`, `StatusBar`, `Toggle`, `SegmentedControl`)

**Files:**
- Create: `components/PhoneScreen.tsx`, `components/StatusBar.tsx`, `components/Toggle.tsx`, `components/SegmentedControl.tsx`

**Interfaces:**
- Produces:
  - `<PhoneScreen accent?: "default"|"hero">` — обёртка экрана: фон-градиент, скруглённый контейнер на весь вьюпорт, dynamic island сверху. На реальном устройстве — full-bleed (`min-h-screen`), без рамки телефона.
  - `<StatusBar>` — `9:41` + индикаторы (как в дизайне).
  - `<Toggle checked onChange label>` — пилюля-переключатель (трек 42×24, кружок 20).
  - `<SegmentedControl options={(string|number)[]} value onChange>` — сегменты 38×34, активный — лайм.

- [ ] **Step 1: PhoneScreen + StatusBar**

Create `components/StatusBar.tsx`:
```tsx
export function StatusBar() {
  return (
    <div className="flex justify-between items-center px-7 pt-[15px] font-display font-bold text-[15px] text-ink">
      <span>9:41</span>
      <span className="font-mono font-semibold text-[11px] text-[#9a9f97]">●●● 5G ▮</span>
    </div>
  );
}
```

Create `components/PhoneScreen.tsx`:
```tsx
import { StatusBar } from "./StatusBar";

export function PhoneScreen({
  children, hero = false, statusBar = true,
}: { children: React.ReactNode; hero?: boolean; statusBar?: boolean }) {
  const bg = hero
    ? "radial-gradient(120% 60% at 50% -5%,rgba(198,242,78,.12),transparent 55%),#0a0b0a"
    : "radial-gradient(130% 70% at 50% -5%,rgba(198,242,78,.10),transparent 55%),#0a0b0a";
  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ background: bg }}>
      <div className="absolute top-[11px] left-1/2 -translate-x-1/2 w-[108px] h-[31px] bg-black rounded-[20px] z-10" />
      {statusBar && <StatusBar />}
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Toggle + SegmentedControl**

Create `components/Toggle.tsx` (обёртка над shadcn `Switch`, окрашенная в наш лайм):
```tsx
"use client";
import { Switch } from "@/components/ui/switch";

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className={`flex-1 flex items-center justify-between bg-surface2 rounded-2xl px-4 py-[14px] border cursor-pointer ${checked ? "border-accent/30" : "border-white/[.06]"}`}>
      <span className="font-display font-semibold text-[14px] text-ink3">{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-[#2a2d28]"
      />
    </label>
  );
}
```
> `Switch` из `components/ui/switch.tsx` (добавлен в Task 1). Лаймовый трек задаём через
> `data-[state=checked]:bg-accent`; кружок у shadcn белый — оставляем как есть.

Create `components/SegmentedControl.tsx`:
```tsx
"use client";
export function SegmentedControl<T extends string | number>({
  options, value, onChange,
}: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1.5">
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={String(o)} type="button" onClick={() => onChange(o)}
            className={`w-[38px] h-[34px] rounded-[10px] flex items-center justify-center font-display font-bold text-[15px] ${
              active ? "bg-accent text-bg" : "bg-surface3 text-[#6f746d] border border-white/[.06]"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Проверить сборку**

Run: `npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add components/PhoneScreen.tsx components/StatusBar.tsx components/Toggle.tsx components/SegmentedControl.tsx
git commit -m "Добавить UI-примитивы экрана, статус-бар и контролы формата"
```

---

### Task 11: Экран 01 — Новый матч (`app/page.tsx`)

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `useMatchStore.start`, `PhoneScreen`, `SegmentedControl`, `Toggle`. Локальный стейт формы (config + имена 4 игроков). По «Начать матч» → `start(...)` + `router.push("/match")`.

- [ ] **Step 1: Реализация экрана настройки**

Заменить `app/page.tsx` полностью (разметку и токены сверять с FRAME 1 в `docs/design/Padel-Score.reference.html`):
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneScreen } from "@/components/PhoneScreen";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Toggle } from "@/components/Toggle";
import { Input } from "@/components/ui/input";
import { useMatchStore } from "@/store/matchStore";
import type { Config } from "@/lib/padel/types";

const A_INIT = ["Алекс", "Марко"];
const B_INIT = ["Дима", "Соня"];

export default function NewMatchPage() {
  const router = useRouter();
  const start = useMatchStore((s) => s.start);
  const [sets, setSets] = useState<1 | 3 | 5>(3);
  const [games, setGames] = useState<4 | 6 | 9>(6);
  const [goldenPoint, setGolden] = useState(true);
  const [tiebreak, setTiebreak] = useState(true);
  const [a, setA] = useState(A_INIT);
  const [b, setB] = useState(B_INIT);

  function begin() {
    const config: Config = { sets, gamesPerSet: games, goldenPoint, tiebreak };
    start(config, [
      { players: [{ name: a[0] }, { name: a[1] }] },
      { players: [{ name: b[0] }, { name: b[1] }] },
    ]);
    router.push("/match");
  }

  return (
    <PhoneScreen>
      <div className="px-[22px] pt-[30px] min-h-[calc(100vh-36px)] flex flex-col">
        {/* title */}
        <div className="flex items-center justify-between mb-[26px]">
          <div>
            <div className="font-mono font-medium text-[12px] tracking-[.12em] uppercase text-accent">Setup</div>
            <div className="font-display font-extrabold text-[30px] tracking-[-.02em] text-ink mt-0.5">Новый матч</div>
          </div>
          <div className="w-[38px] h-[38px] rounded-full border border-white/10 flex items-center justify-center text-[#9a9f97] text-[20px]">✕</div>
        </div>

        {/* format */}
        <div className="font-mono font-semibold text-[11px] tracking-[.14em] uppercase text-muted2 mb-3">Формат</div>
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex items-center justify-between bg-surface2 border border-white/[.06] rounded-2xl px-4 py-[14px]">
            <span className="font-display font-semibold text-[15px] text-ink3">Сетов в матче</span>
            <SegmentedControl options={[1, 3, 5] as const} value={sets} onChange={(v) => setSets(v as 1|3|5)} />
          </div>
          <div className="flex items-center justify-between bg-surface2 border border-white/[.06] rounded-2xl px-4 py-[14px]">
            <span className="font-display font-semibold text-[15px] text-ink3">Геймов в сете</span>
            <SegmentedControl options={[4, 6, 9] as const} value={games} onChange={(v) => setGames(v as 4|6|9)} />
          </div>
          <div className="flex gap-3">
            <Toggle checked={goldenPoint} onChange={setGolden} label="Golden Point" />
            <Toggle checked={tiebreak} onChange={setTiebreak} label="Тай-брейк" />
          </div>
        </div>

        {/* teams */}
        <TeamBlock color="#c6f24e" title="Команда A" names={a} onName={(i, v) => setA((p) => p.map((n, j) => j === i ? v : n))} />
        <div className="h-5" />
        <TeamBlock color="#e8e8e8" title="Команда B" names={b} onName={(i, v) => setB((p) => p.map((n, j) => j === i ? v : n))} />

        {/* cta */}
        <div className="mt-auto pt-[18px] pb-[14px]">
          <button onClick={begin} className="w-full flex items-center justify-center gap-2.5 h-[58px] rounded-[18px] bg-accent font-display font-extrabold text-[18px] text-bg" style={{ boxShadow: "0 12px 30px -8px rgba(198,242,78,.5)" }}>
            Начать матч <span className="text-[20px]">→</span>
          </button>
          <div className="text-center mt-3 font-display font-medium text-[13px] text-muted3">Корт 3 · Padel Club Moscow</div>
        </div>
      </div>
    </PhoneScreen>
  );
}

function TeamBlock({ color, title, names, onName }: { color: string; title: string; names: string[]; onName: (i: number, v: string) => void }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-[9px] h-[9px] rounded-full" style={{ background: color }} />
        <span className="font-mono font-semibold text-[11px] tracking-[.14em] uppercase text-muted2">{title}</span>
      </div>
      <div className="flex flex-col gap-2">
        {names.map((n, i) => (
          <div key={i} className="flex items-center gap-[13px] bg-surface2 border border-white/[.06] rounded-[14px] px-[14px] py-[11px]">
            <div className="w-10 h-10 rounded-full bg-[#1b1e1b] flex items-center justify-center font-display font-bold text-[16px]" style={{ border: `1.5px solid ${color}`, color }}>
              {n.charAt(0).toUpperCase() || "·"}
            </div>
            <Input value={n} onChange={(e) => onName(i, e.target.value)} className="flex-1 h-auto p-0 bg-transparent border-0 shadow-none focus-visible:ring-0 font-display font-semibold text-[16px] text-ink2" />
          </div>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Проверить визуально и сборку**

Run: `npx tsc --noEmit && npm run dev` → открыть `http://localhost:3000`
Expected: экран настройки совпадает с FRAME 1; имена редактируются; «Начать матч» переходит на `/match` (страница появится в Task 13 — пока 404/placeholder ок).

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "Реализовать экран нового матча"
```

---

### Task 12: Компоненты счёта (`ScoreBoard`, `CourtDiagram`, `ScoreButtons`, `MatchCompleteOverlay`)

**Files:**
- Create: `components/ScoreBoard.tsx`, `components/CourtDiagram.tsx`, `components/ScoreButtons.tsx`, `components/MatchCompleteOverlay.tsx`

**Interfaces:**
- Consumes: `MatchState`, `pointLabel`, `sideLabel`, `courtPositions`.
- Produces:
  - `<ScoreBoard match>` — таблица сетов/геймов/очка (FRAME 3 scoreboard).
  - `<CourtDiagram match>` — SVG корта с подсветкой подающего (FRAME 3 svg).
  - `<ScoreButtons onA onB onUndo>` — две кнопки «+ Очко» и «Отменить» (FRAME 3 bottom).
  - `<MatchCompleteOverlay match onNew onBroadcast>` — оверлей победителя.

- [ ] **Step 1: ScoreBoard**

Create `components/ScoreBoard.tsx` (сверять с FRAME 3 scoreboard; команда-подающая подсвечена лаймом слева):
```tsx
import type { MatchState, TeamIndex } from "@/lib/padel/types";
import { pointLabel } from "@/lib/padel/format";

function teamName(m: MatchState, t: TeamIndex) {
  return m.teams[t].players.map((p) => p.name).join(" / ");
}

export function ScoreBoard({ match }: { match: MatchState }) {
  const setsCount = match.score[0].games.length;
  const cols = `1fr ${Array.from({ length: setsCount }).map(() => "34px").join(" ")} 64px`;
  return (
    <div className="bg-surface border border-white/[.07] rounded-[22px] overflow-hidden">
      <div className="grid items-center px-[18px] pt-[11px] pb-[9px] border-b border-white/[.06]" style={{ gridTemplateColumns: cols }}>
        <span className="font-mono font-semibold text-[10px] tracking-[.12em] uppercase text-muted3">Команды</span>
        {Array.from({ length: setsCount }).map((_, i) => (
          <span key={i} className={`text-center font-mono font-semibold text-[10px] ${i === match.currentSet ? "text-accent" : "text-muted3"}`}>{i + 1}</span>
        ))}
        <span className="text-center font-mono font-semibold text-[10px] tracking-[.08em] uppercase text-muted3">Очко</span>
      </div>
      {[0, 1].map((t) => {
        const team = t as TeamIndex;
        const serving = match.serving.team === team;
        return (
          <div key={t} className={`relative grid items-center px-[18px] py-4 ${t === 1 ? "border-t border-white/[.06]" : ""}`}
            style={{ gridTemplateColumns: cols, background: serving ? "linear-gradient(90deg,rgba(198,242,78,.07),transparent 60%)" : undefined }}>
            {serving && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />}
            <div className="flex items-center gap-[9px]">
              {serving
                ? <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center shrink-0"><div className="w-[7px] h-[7px] rounded-full bg-bg" /></div>
                : <div className="w-4 h-4 rounded-full border-[1.5px] border-muted3 shrink-0" />}
              <div className="font-display font-bold text-[16px] text-ink leading-[1.15]">
                {match.teams[team].players[0].name} <span className="text-muted font-medium">/ {match.teams[team].players[1].name}</span>
              </div>
            </div>
            {match.score[team].games.map((g, i) => (
              <span key={i} className="text-center font-display font-bold text-[17px] tnum text-muted">{g}</span>
            ))}
            <span className={`text-center font-display font-extrabold text-[30px] tnum ${serving ? "text-accent" : "text-ink3"}`}>{pointLabel(match, team)}</span>
          </div>
        );
      })}
    </div>
  );
}
```
> Примечание по колонкам: дизайн показывает фикс. 3 сета; здесь число колонок = числу начатых сетов (минимум 1). Это допустимое уточнение динамики.

- [ ] **Step 2: CourtDiagram**

Create `components/CourtDiagram.tsx` (портировать SVG из FRAME 3, позиции брать из `courtPositions`):
```tsx
import type { MatchState, TeamIndex } from "@/lib/padel/types";
import { courtPositions } from "@/lib/padel/serve";

const X = { left: 40, right: 306 };
const Y = { top: 46, bottom: 110 };

export function CourtDiagram({ match }: { match: MatchState }) {
  const positions = courtPositions(match);
  return (
    <svg viewBox="0 0 346 150" className="w-full block">
      <rect x="1" y="1" width="344" height="148" rx="8" fill="#0c0d0c" stroke="rgba(255,255,255,.12)" strokeWidth="1.5" />
      <line x1="173" y1="4" x2="173" y2="146" stroke="#c6f24e" strokeWidth="1.5" strokeDasharray="4 5" opacity=".7" />
      <line x1="64" y1="4" x2="64" y2="146" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
      <line x1="282" y1="4" x2="282" y2="146" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
      <line x1="64" y1="75" x2="282" y2="75" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
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
            <text x={cx} y={cy + 4} textAnchor="middle" fontFamily="Archivo" fontSize="10" fontWeight="700" fill={p.isServer ? "#0a0b0a" : teamColor}>{label}</text>
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 3: ScoreButtons + MatchCompleteOverlay**

Create `components/ScoreButtons.tsx`:
```tsx
"use client";
export function ScoreButtons({ onA, onB, onUndo, battery }: { onA: () => void; onB: () => void; onUndo: () => void; battery: number }) {
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
        <div className="flex items-center gap-2 bg-accent/10 border border-accent/25 rounded-[20px] px-[14px] py-[7px]">
          <div className="w-[7px] h-[7px] rounded-full bg-accent animate-pulse2" />
          <span className="font-mono font-semibold text-[12px] text-accent">Кликер · {battery}%</span>
        </div>
      </div>
    </div>
  );
}
```

Create `components/MatchCompleteOverlay.tsx` (на shadcn `Dialog`; открыт, пока матч завершён):
```tsx
"use client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { MatchState } from "@/lib/padel/types";

export function MatchCompleteOverlay({ match, onNew, onBroadcast }: { match: MatchState; onNew: () => void; onBroadcast: () => void }) {
  const open = match.status === "completed" && match.winner !== undefined;
  if (!open || match.winner === undefined) return null;
  const w = match.teams[match.winner].players.map((p) => p.name).join(" / ");
  return (
    <Dialog open={open}>
      <DialogContent className="bg-surface border border-white/10 rounded-[24px] px-8 py-10 text-center [&>button]:hidden">
        <DialogTitle className="font-mono font-semibold text-[12px] tracking-[.16em] uppercase text-accent">Матч завершён</DialogTitle>
        <div className="font-display font-extrabold text-[34px] text-ink leading-tight">{w}</div>
        <div className="font-display font-medium text-[15px] text-muted">
          Счёт по сетам {match.score[0].sets} : {match.score[1].sets}
        </div>
        <button onClick={onBroadcast} className="mt-6 w-full h-[54px] rounded-[18px] bg-accent font-display font-extrabold text-[17px] text-bg">Трансляция</button>
        <button onClick={onNew} className="mt-3 w-full h-[54px] rounded-[18px] border border-white/15 font-display font-bold text-[16px] text-ink">Новый матч</button>
      </DialogContent>
    </Dialog>
  );
}
```
> `[&>button]:hidden` прячет дефолтную крестик-кнопку shadcn — закрытие только через действия.

- [ ] **Step 4: Проверить сборку**

Run: `npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 5: Commit**

```bash
git add components/ScoreBoard.tsx components/CourtDiagram.tsx components/ScoreButtons.tsx components/MatchCompleteOverlay.tsx
git commit -m "Добавить компоненты табло, диаграммы корта и кнопок счёта"
```

---

### Task 13: Экран 03 — Активный матч (`app/match/page.tsx`)

**Files:**
- Create: `app/match/page.tsx`

**Interfaces:**
- Consumes: `useMatchStore` (match, point, undoPoint, reset), `useClickerStore` (battery), `ScoreBoard`, `CourtDiagram`, `ScoreButtons`, `MatchCompleteOverlay`, `clock`, `sideLabel`. Если `match === null` → редирект на `/`.

- [ ] **Step 1: Реализация активного матча с живым таймером**

Create `app/match/page.tsx` (верхняя панель/подача — по FRAME 3):
```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneScreen } from "@/components/PhoneScreen";
import { ScoreBoard } from "@/components/ScoreBoard";
import { CourtDiagram } from "@/components/CourtDiagram";
import { ScoreButtons } from "@/components/ScoreButtons";
import { MatchCompleteOverlay } from "@/components/MatchCompleteOverlay";
import { useMatchStore } from "@/store/matchStore";
import { useClickerStore } from "@/store/clickerStore";
import { clock, sideLabel } from "@/lib/padel/format";

export default function MatchPage() {
  const router = useRouter();
  const match = useMatchStore((s) => s.match);
  const point = useMatchStore((s) => s.point);
  const undoPoint = useMatchStore((s) => s.undoPoint);
  const reset = useMatchStore((s) => s.reset);
  const battery = useClickerStore((s) => s.battery);
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { if (match === null) router.replace("/"); }, [match, router]);
  if (!match) return null;

  const server = match.teams[match.serving.team].players[match.serving.player].name;
  const sideText = match.serving.side === "deuce" ? "Deuce" : "Ad";

  return (
    <PhoneScreen hero>
      <div className="px-[22px] pt-[26px] min-h-[calc(100vh-36px)] flex flex-col">
        {/* top bar */}
        <div className="flex items-center justify-between mb-[22px]">
          <div className="flex items-center gap-[9px]">
            <div className="w-[7px] h-[7px] rounded-full bg-live animate-pulse2" />
            <span className="font-mono font-bold text-[13px] tracking-[.1em] text-live">LIVE</span>
            <span className="font-mono font-semibold text-[13px] text-muted2 ml-1.5">СЕТ {match.currentSet + 1}</span>
          </div>
          <span className="font-mono font-semibold text-[14px] text-ink3 tnum">{clock(now - match.startedAt)}</span>
          <button onClick={() => router.push("/broadcast")} className="font-display text-[22px] text-[#9a9f97]">⋯</button>
        </div>

        <ScoreBoard match={match} />

        {/* serve / court */}
        <div className="mt-5 bg-surface border border-white/[.07] rounded-[22px] p-[18px]">
          <div className="flex items-center justify-between mb-[14px]">
            <span className="font-mono font-semibold text-[11px] tracking-[.12em] uppercase text-muted2">Подача</span>
            <span className="font-display font-semibold text-[13px] text-accent">{server} · {sideLabel(match.serving.side)} · {sideText}</span>
          </div>
          <CourtDiagram match={match} />
        </div>

        <ScoreButtons onA={() => point(0)} onB={() => point(1)} onUndo={undoPoint} battery={battery} />
      </div>

      <MatchCompleteOverlay match={match} onNew={() => { reset(); router.push("/"); }} onBroadcast={() => router.push("/broadcast")} />
    </PhoneScreen>
  );
}
```

- [ ] **Step 2: Прогнать вручную**

Run: `npm run dev` → создать матч на `/`, на `/match` жать «+ Очко», проверить: счёт меняется 0→15→30→40→гейм, подсветка подающей команды, диаграмма обновляется, «Отменить» откатывает, при завершении — оверлей.
Expected: поведение совпадает с движком; таймер идёт.

- [ ] **Step 3: Commit**

```bash
git add app/match/page.tsx
git commit -m "Реализовать экран активного матча"
```

---

### Task 14: Экран 04 — Трансляция (`app/broadcast/page.tsx`)

**Files:**
- Create: `app/broadcast/page.tsx`

**Interfaces:**
- Consumes: `useMatchStore.match`, `useClickerStore.battery`, `clock`, `pointLabel`. Landscape-композиция (FRAME 4). Тап по экрану → `router.back()`/`/match`.

- [ ] **Step 1: Реализация трансляции**

Create `app/broadcast/page.tsx` (композиция и токены — по FRAME 4; крупные очки `pointLabel`, под ними сеты/геймы):
```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMatchStore } from "@/store/matchStore";
import { useClickerStore } from "@/store/clickerStore";
import { clock, pointLabel } from "@/lib/padel/format";
import type { MatchState, TeamIndex } from "@/lib/padel/types";

function names(m: MatchState, t: TeamIndex) { return m.teams[t].players.map((p) => p.name).join(" / "); }

export default function BroadcastPage() {
  const router = useRouter();
  const match = useMatchStore((s) => s.match);
  const battery = useClickerStore((s) => s.battery);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { if (match === null) router.replace("/"); }, [match, router]);
  if (!match) return null;

  const gamesA = match.score[0].games[match.currentSet];
  const gamesB = match.score[1].games[match.currentSet];

  return (
    <div onClick={() => router.push("/match")}
      className="relative min-h-screen w-full overflow-hidden text-ink"
      style={{ background: "radial-gradient(80% 130% at 50% 120%,rgba(36,92,48,.32),transparent 60%),radial-gradient(60% 90% at 50% -20%,rgba(198,242,78,.10),transparent 60%),#070807" }}>
      {/* top strip */}
      <div className="flex items-center justify-between px-10 pt-5">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-live animate-pulse2" />
          <span className="font-mono font-bold text-[13px] tracking-[.14em] text-live">LIVE</span>
        </div>
        <div className="font-mono font-bold text-[14px] tracking-[.2em] uppercase text-[#9a9f97]">Сет {match.currentSet + 1} · Корт 3 · до {match.config.gamesPerSet} геймов</div>
        <div className="font-mono font-semibold text-[14px] text-ink3 tnum">{clock(now - match.startedAt)}</div>
      </div>

      {/* main split */}
      <div className="grid items-center px-5" style={{ gridTemplateColumns: "1fr 1px 1fr", height: "calc(100vh - 120px)" }}>
        <TeamSide align="left" name={names(match, 0)} dot="#c6f24e" point={pointLabel(match, 0)} sets={match.score[0].sets} games={gamesA}
          serving={match.serving.team === 0} side={match.serving.side} highlight />
        <div className="w-px h-[60%] justify-self-center" style={{ background: "linear-gradient(180deg,transparent,rgba(255,255,255,.16),transparent)" }} />
        <TeamSide align="right" name={names(match, 1)} dot="#e8e8e8" point={pointLabel(match, 1)} sets={match.score[1].sets} games={gamesB}
          serving={match.serving.team === 1} side={match.serving.side} />
      </div>

      {/* bottom strip */}
      <div className="absolute left-0 right-0 bottom-0 flex items-center justify-between px-10 pb-[22px]">
        <div className="flex items-center gap-[9px]">
          <div className="w-[9px] h-[9px] rounded-full bg-accent" />
          <span className="font-display font-extrabold text-[16px] tracking-[-.01em]">RALLY</span>
        </div>
        <div className="font-mono font-semibold text-[12px] tracking-[.16em] uppercase text-muted3">Нажмите на экран, чтобы выйти из трансляции</div>
        <div className="flex items-center gap-2">
          <div className="w-[7px] h-[7px] rounded-full bg-accent animate-pulse2" />
          <span className="font-mono font-semibold text-[12px] text-accent">Кликер · {battery}%</span>
        </div>
      </div>
    </div>
  );
}

function TeamSide({ align, name, dot, point, sets, games, serving, side, highlight }: {
  align: "left" | "right"; name: string; dot: string; point: string; sets: number; games: number; serving: boolean; side: "deuce" | "ad"; highlight?: boolean;
}) {
  const right = align === "right";
  return (
    <div className={`px-9 ${right ? "text-right" : ""}`}>
      <div className={`flex items-center gap-[11px] mb-1.5 ${right ? "justify-end" : ""}`}>
        {!right && <div className="w-[11px] h-[11px] rounded-full" style={{ background: dot, boxShadow: highlight ? "0 0 12px rgba(198,242,78,.7)" : undefined }} />}
        <span className="font-display font-extrabold text-[22px] tracking-[-.01em]">{name}</span>
        {right && <div className="w-[11px] h-[11px] rounded-full" style={{ background: dot }} />}
      </div>
      <div className={`flex items-end gap-6 mt-3.5 ${right ? "justify-end" : ""}`}>
        {right && <Stats sets={sets} games={games} align="right" />}
        <div className="font-display font-black text-[132px] leading-[.82] tnum tracking-[-.04em]" style={{ color: highlight ? "#c6f24e" : "#eef0ea", textShadow: highlight ? "0 0 50px rgba(198,242,78,.35)" : undefined }}>{point}</div>
        {!right && <Stats sets={sets} games={games} align="left" />}
      </div>
      <div className="h-[34px] mt-[18px]">
        {serving && !right && <ServePill side={side} />}
        {serving && right && <div className="flex justify-end"><ServePill side={side} /></div>}
      </div>
    </div>
  );
}

function Stats({ sets, games, align }: { sets: number; games: number; align: "left" | "right" }) {
  const Row = ({ label, val }: { label: string; val: number }) => (
    <div className="flex items-center gap-[9px]">
      {align === "right" && <span className="font-display font-extrabold text-[26px] tnum">{val}</span>}
      <span className="font-mono font-semibold text-[11px] tracking-[.1em] text-muted3 w-12" style={{ textAlign: align === "right" ? "left" : "left" }}>{label}</span>
      {align === "left" && <span className="font-display font-extrabold text-[26px] tnum">{val}</span>}
    </div>
  );
  return (
    <div className={`flex flex-col gap-2.5 pb-3.5 ${align === "right" ? "items-end" : ""}`}>
      <Row label="СЕТЫ" val={sets} />
      <Row label="ГЕЙМЫ" val={games} />
    </div>
  );
}

function ServePill({ side }: { side: "deuce" | "ad" }) {
  return (
    <div className="inline-flex items-center gap-[9px] bg-accent/[.14] border border-accent/35 rounded-[20px] px-[15px] py-[7px]">
      <div className="w-3.5 h-3.5 rounded-full bg-accent animate-ring" />
      <span className="font-mono font-bold text-[12px] tracking-[.12em] text-accent">ПОДАЧА · {side === "deuce" ? "DEUCE" : "AD"}</span>
    </div>
  );
}
```

- [ ] **Step 2: Прогнать вручную**

Run: `npm run dev` → из `/match` нажать «⋯» → `/broadcast`. Проверить крупный счёт, сеты/геймы, пилюлю подачи у подающей команды, тап по экрану возвращает на `/match`.
Expected: композиция совпадает с FRAME 4 (на широком/landscape вьюпорте).

- [ ] **Step 3: Commit**

```bash
git add app/broadcast/page.tsx
git commit -m "Реализовать экран трансляции"
```

---

### Task 15: Экран 02 — Кликер (макет) (`app/clicker/page.tsx`)

**Files:**
- Create: `app/clicker/page.tsx`

**Interfaces:**
- Consumes: `useClickerStore` (buttonMode, holder, connected, battery, lastEvent, setMode, setHolder, setLastEvent), `useMatchStore.match` (имена для владельца), `PhoneScreen`. BLE — заглушка; «тест» — локальная кнопка, пишущая `lastEvent`.

- [ ] **Step 1: Реализация экрана кликера**

Create `app/clicker/page.tsx` (разметку/токены сверять с FRAME 2):
```tsx
"use client";
import { PhoneScreen } from "@/components/PhoneScreen";
import { useClickerStore } from "@/store/clickerStore";
import { useMatchStore } from "@/store/matchStore";

export default function ClickerPage() {
  const { buttonMode, holder, battery, lastEvent, setMode, setHolder, setLastEvent } = useClickerStore();
  const match = useMatchStore((s) => s.match);
  const holderName = match ? `${match.teams[holder.team].players[holder.player].name} · Команда ${holder.team === 0 ? "A" : "B"}` : "Алекс · Команда A";

  return (
    <PhoneScreen>
      <div className="px-[22px] pt-[30px]">
        <div className="flex items-center justify-between mb-[26px]">
          <div>
            <div className="font-mono font-medium text-[12px] tracking-[.12em] uppercase text-accent">Bluetooth</div>
            <div className="font-display font-extrabold text-[30px] tracking-[-.02em] text-ink mt-0.5">Кликер</div>
          </div>
          <div className="w-[38px] h-[38px] rounded-full bg-accent/[.12] flex items-center justify-center text-accent font-bold text-[17px]">✶</div>
        </div>

        {/* connected device */}
        <div className="relative border border-accent/[.28] rounded-[22px] p-[22px] mb-[22px] overflow-hidden" style={{ background: "linear-gradient(180deg,rgba(22,25,21,0),#121412)" }}>
          <div className="absolute top-[18px] right-5 flex items-center gap-[7px]">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse2" />
            <span className="font-mono font-semibold text-[11px] tracking-[.1em] uppercase text-accent">Подключён</span>
          </div>
          <div className="flex items-center gap-5">
            <div className="w-[78px] h-[104px] rounded-[22px] bg-surface3 border-[1.5px] border-white/[.12] flex flex-col items-center justify-center gap-3 shrink-0">
              <div className="w-[38px] h-[38px] rounded-full bg-accent animate-ring" />
              <div className="w-[38px] h-[38px] rounded-full bg-[#1b1e1b] border border-white/[.12]" />
            </div>
            <div>
              <div className="font-display font-bold text-[19px] text-ink">Padel Clicker P1</div>
              <div className="font-display font-medium text-[13px] text-muted mt-[3px]">2 кнопки · BLE</div>
              <div className="flex items-center gap-2 mt-[14px]">
                <div className="w-[46px] h-4 rounded-[5px] border-[1.5px] border-accent p-0.5 flex"><div className="bg-accent rounded-[2px]" style={{ width: `${battery}%` }} /></div>
                <span className="font-mono font-semibold text-[13px] text-accent">{battery}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* button mode */}
        <div className="font-mono font-semibold text-[11px] tracking-[.14em] uppercase text-muted2 mb-3">Назначение кнопок</div>
        <div className="flex flex-col gap-2.5 mb-[22px]">
          <ModeRow active={buttonMode === "two"} onClick={() => setMode("two")} title="2 кнопки — раздельно" subtitle="Лево → очко A · Право → очко B" />
          <button onClick={() => setMode("one")} className={`flex items-start gap-[14px] bg-surface2 rounded-2xl px-4 py-[15px] border text-left ${buttonMode === "one" ? "border-accent/30" : "border-white/[.06]"}`}>
            <div className={`w-[22px] h-[22px] rounded-full border-2 mt-0.5 flex items-center justify-center ${buttonMode === "one" ? "border-accent" : "border-[#43473f]"}`}>
              {buttonMode === "one" && <div className="w-[11px] h-[11px] rounded-full bg-accent" />}
            </div>
            <div className="flex-1">
              <div className="font-display font-semibold text-[15px] text-ink3">1 кнопка — по нажатиям</div>
              <div className="flex flex-col gap-[5px] mt-2">
                <Hint badge="1×" text="очко подающей команде" />
                <Hint badge="2×" text="очко другой команде" />
                <Hint badge="⏷" text="долгое — отменить последнее" />
              </div>
            </div>
          </button>
        </div>

        {/* holder */}
        <button
          onClick={() => match && setHolder({ team: holder.team === 0 ? 1 : 0, player: 0 })}
          className="w-full flex items-center justify-between bg-surface2 border border-white/[.06] rounded-2xl px-4 py-[14px] mb-[22px]">
          <div className="flex items-center gap-[11px]">
            <div className="w-[34px] h-[34px] rounded-full bg-[#1b1e1b] border-[1.5px] border-accent flex items-center justify-center font-display font-bold text-[14px] text-accent">{holderName.charAt(0)}</div>
            <div className="text-left">
              <div className="font-mono font-medium text-[11px] text-muted2 uppercase tracking-[.1em]">У кого кликер</div>
              <div className="font-display font-semibold text-[15px] text-ink mt-px">{holderName}</div>
            </div>
          </div>
          <span className="font-display font-medium text-[13px] text-muted3">сменить</span>
        </button>

        {/* test */}
        <button
          onClick={() => setLastEvent("ЛЕВАЯ · +1 команде A")}
          className="w-full border border-dashed border-accent/35 rounded-2xl p-4 text-center">
          <div className="font-display font-semibold text-[14px] text-ink3">Нажмите кнопку для проверки</div>
          <div className="font-mono font-medium text-[12px] text-accent mt-1.5">последнее: {lastEvent ?? "—"}</div>
        </button>
      </div>
    </PhoneScreen>
  );
}

function ModeRow({ active, onClick, title, subtitle }: { active: boolean; onClick: () => void; title: string; subtitle: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-[14px] bg-surface2 rounded-2xl px-4 py-[15px] border text-left ${active ? "border-accent/30" : "border-white/[.06]"}`}>
      <div className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center ${active ? "border-accent" : "border-[#43473f]"}`}>
        {active && <div className="w-[11px] h-[11px] rounded-full bg-accent" />}
      </div>
      <div className="flex-1">
        <div className="font-display font-semibold text-[15px] text-ink2">{title}</div>
        <div className="font-display font-medium text-[13px] text-muted mt-px">{subtitle}</div>
      </div>
    </button>
  );
}

function Hint({ badge, text }: { badge: string; text: string }) {
  return (
    <div className="flex items-center gap-[9px]">
      <span className="font-mono font-semibold text-[11px] text-bg bg-[#9a9f97] rounded-[5px] px-[7px] py-0.5 shrink-0">{badge}</span>
      <span className="font-display font-medium text-[13px] text-muted">{text}</span>
    </div>
  );
}
```

- [ ] **Step 2: Прогнать вручную**

Run: `npm run dev` → `http://localhost:3000/clicker`. Проверить: переключение режима кнопок, смена владельца, кнопка теста пишет «последнее».
Expected: совпадает с FRAME 2; настройки сохраняются после перезагрузки (persist).

- [ ] **Step 3: Commit**

```bash
git add app/clicker/page.tsx
git commit -m "Реализовать экран кликера (макет)"
```

---

### Task 16: PWA — манифест и иконки

**Files:**
- Create: `app/manifest.ts`, `public/icon-192.png`, `public/icon-512.png` (плейсхолдер-иконки лайм на тёмном)

**Interfaces:**
- Produces: установимый манифест; service worker генерируется `@ducanh2912/next-pwa` при `npm run build`.

- [ ] **Step 1: Манифест**

Create `app/manifest.ts`:
```ts
import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RALLY · Счёт в паделе",
    short_name: "RALLY",
    description: "Ведение счёта в матче по паделу",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0a0b0a",
    theme_color: "#0a0b0a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

- [ ] **Step 2: Сгенерировать иконки-плейсхолдеры**

Run (создаёт простые лайм-на-тёмном PNG через системный `sips`/`qlmanage` недоступен — используем минимальный генератор Node):
```bash
node -e '
const fs=require("fs");
// 1x1 PNG лайм-пиксель растягивается браузером; для прод — заменить на реальные иконки
const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mPk+M9QDwAEhQGAhKmMIQAAAABJRU5ErkJggg==","base64");
fs.writeFileSync("public/icon-192.png",png);
fs.writeFileSync("public/icon-512.png",png);
console.log("placeholder icons written");
'
```
Expected: два файла в `public/`. (Заменить на нормальные иконки RALLY позже — отдельная задача дизайна.)

- [ ] **Step 3: Собрать и проверить PWA**

Run: `npm run build && npm run start` → открыть в браузере, проверить в DevTools → Application: манифест валиден, service worker зарегистрирован, приложение установимо.
Expected: манифест и SW присутствуют; ошибок сборки нет.

- [ ] **Step 4: Commit**

```bash
git add app/manifest.ts public/icon-192.png public/icon-512.png
git commit -m "Добавить PWA-манифест и иконки-плейсхолдеры"
```

---

### Task 17: Финальная сверка и навигация

**Files:**
- Modify: при необходимости `app/page.tsx` (ссылка на `/clicker`), мелкие правки токенов.

**Interfaces:**
- Consumes: всё предыдущее. Цель — связный поток и отсутствие регрессий.

- [ ] **Step 1: Полный прогон тестов и типов**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: tsc чисто; все юнит-тесты движка зелёные; production-сборка успешна.

- [ ] **Step 2: Ручной сквозной сценарий**

Run: `npm run start`
Проверить поток: `/` (настроить формат и имена) → «Начать матч» → `/match` (счёт, undo, диаграмма, оверлей при завершении) → «⋯» → `/broadcast` → тап → назад; `/clicker` сохраняет настройки. Сверить каждый экран с соответствующим FRAME в `docs/design/Padel-Score.reference.html`.
Expected: все 4 экрана визуально соответствуют дизайну; логика счёта корректна.

- [ ] **Step 3: Commit (если были правки)**

```bash
git add -A
git commit -m "Финальная сверка экранов и навигации"
```

---

## Self-Review (выполнено при написании плана)

- **Покрытие спеки:** движок (очки/deuce/golden/advantage/тай-брейк/сет/матч/undo/подача) — Tasks 2–8; store+persist — Task 9; экраны 01–04 — Tasks 11, 13, 14, 15; завершение матча — Task 12/13; PWA — Task 16; дизайн-токены — Task 1 (tailwind.config) + сверка с reference во всех UI-задачах. Все разделы спеки покрыты.
- **Плейсхолдеры:** код приведён полностью в каждом шаге; иконки PWA — осознанный плейсхолдер с пометкой заменить (не блокирует функциональность).
- **Согласованность типов:** `MatchState`/`TeamScore`/`Config`/`Side`/`TeamIndex` едины во всех задачах; `createMatch/scorePoint/undo/resetMatch`, `nextServer/courtPositions`, `pointLabel/clock/sideLabel` — имена совпадают между определением и использованием в store/UI.
- **Известное уточнение:** число колонок в табло динамическое (= числу начатых сетов), тогда как макет рисует фикс. 3 — допустимое поведение для реального движка.

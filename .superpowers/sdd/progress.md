# RALLY — прогресс реализации (subagent-driven)

Plan: docs/superpowers/plans/2026-06-23-padel-score.md
Branch: feature/padel-rally
Base (merge-base with main): $(git rev-parse main)

## Статус задач
- Task 1: pending — Scaffold Next.js + Tailwind + shadcn + Vitest
- Task 2: pending — Типы и правила движка
- Task 3: pending — createMatch + прогресс очков
- Task 4: pending — deuce / golden point / advantage
- Task 5: pending — завершение гейма/сета/матча
- Task 6: pending — тай-брейк
- Task 7: pending — ротация подачи + позиции корта
- Task 8: pending — undo + форматтеры
- Task 9: pending — хранилища Zustand
- Task 10: pending — UI-примитивы
- Task 11: pending — экран Новый матч
- Task 12: pending — компоненты счёта
- Task 13: pending — экран Активный матч
- Task 14: pending — экран Трансляция
- Task 15: pending — экран Кликер
- Task 16: pending — PWA манифест/иконки
- Task 17: pending — финальная сверка

## Журнал

Task 1: review Approved (commits c0da80b..077e801). Стек: Next16/Tailwind v4/Manrope/shadcn v4.
  ОТКРЫТО (Important, чинить до Task 10): в app/globals.css @theme inline не хватает
  --color-muted-foreground: var(--muted-fg) и --color-muted: var(--muted-bg) — иначе
  text-muted-foreground/bg-muted в shadcn-компонентах дают пустой/брендовый цвет.
  Minor: components.json ссылается на удалённый tailwind.config.ts; мёртвая зависимость tw-animate-css.
  ПАУЗА по просьбе пользователя перед фиксом и Task 2.
Task 1: complete (fixes 077e801..479489a, review clean)
Task 2: complete (commit 8cc9db8, review clean — 11/11)
Task 3: complete (commit a35ac3a + опт. 9259706, review Approved 15/15)
Task 4: complete (тесты deuce/golden/advantage — в коммите 32f6067, выполнено inline, 25/25)
Task 5: complete (тесты завершения гейма/сета/матча — коммит 32f6067, inline)
Task 6: complete (тесты тай-брейка — коммит 32f6067, inline)
Task 7: complete (commit ac5f43a, review Approved 27/27). Minor (для финального ревью):
  serve.ts findIndex -1 fallback без throw; лишняя пустая строка engine.ts:28.
Task 8: complete (commit 1795183, review Approved 36/36). Движок счёта полностью готов.
Task 9: complete (commit bc9a1bf, inline review clean, tsc OK). Хранилища готовы.
Task 10: complete (commit 452a6df, inline review clean, tsc+build OK).
  ВАЖНО для Task 12: shadcn base-nova на Base UI (НЕ Radix) — селекторы data-checked/data-unchecked;
  Dialog API тоже Base UI. Реализатор Task 12 (MatchCompleteOverlay) должен свериться с components/ui/dialog.tsx,
  а не предполагать Radix-API.
Task 11: complete (commit a9ecb0d, inline review clean, tsc+build OK). Экран Новый матч готов.
Task 12: complete (commit a16bca2, build OK). MatchCompleteOverlay — plain overlay (не shadcn Dialog).
  Minor (Task 17): CourtDiagram SVG text fontFamily="Archivo" → заменить на Manrope/font-display.
Task 13: complete (commit f773dc0 + центрирование 2b15cff; Playwright-проверка прошла: счёт/undo/подача OK)
Task 14: complete (commit fe574df, экран трансляции, Playwright landscape OK).
  ИСПРАВЛЕНО (spec-critical): гонка гидратации persist — прямой reload /match,/broadcast редиректил на /
  и терял матч. Добавлен флаг hasHydrated в matchStore + partialize; редирект только после гидратации.
  Проверено Playwright: reload /match сохраняет счёт (15), URL остаётся /match. Коммит выше.
Task 15: complete (commit d639d8c, экран кликера, Playwright OK, скриншот сверен с FRAME 2).
Task 16: complete (commit 5732248). Serwist НЕ поддерживает Next16/Turbopack (issue #54) → fallback: manifest-only PWA (устанавливается), SW/офлайн отложены.

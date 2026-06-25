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
  if (index < 0) return null; // -1 — «не назначено», не должно матчиться
  return ACTIONS.find((a) => bindings[a] === index) ?? null;
}

export function buttonLabel(index: number): string {
  switch (index) {
    case 0: return "✕ / A";
    case 4: return "L1";
    case 5: return "R1";
    default: return index < 0 ? "не назначено" : `Кнопка ${index}`;
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

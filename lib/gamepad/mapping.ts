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

import { describe, it, expect } from "vitest";
import { buttonToAction } from "@/lib/gamepad/mapping";

describe("buttonToAction", () => {
  it("L1 (4) → очко A", () => expect(buttonToAction(4)).toBe("pointA"));
  it("R1 (5) → очко B", () => expect(buttonToAction(5)).toBe("pointB"));
  it("Cross (0) → отмена", () => expect(buttonToAction(0)).toBe("undo"));
  it("незамапленная кнопка → null", () => expect(buttonToAction(3)).toBeNull());
});

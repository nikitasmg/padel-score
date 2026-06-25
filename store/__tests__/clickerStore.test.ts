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

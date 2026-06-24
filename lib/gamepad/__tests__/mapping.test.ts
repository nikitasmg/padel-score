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

import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useVoiceSetting } from "@/lib/voice/useVoiceSetting";

beforeEach(() => localStorage.clear());

describe("useVoiceSetting", () => {
  it("по умолчанию выключено", () => {
    const { result } = renderHook(() => useVoiceSetting());
    expect(result.current[0]).toBe(false);
  });

  it("сеттер включает и сохраняет в localStorage", () => {
    const { result } = renderHook(() => useVoiceSetting());
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem("padel:voice-enabled")).toBe("1");
  });

  it("читает сохранённое значение на маунте", () => {
    localStorage.setItem("padel:voice-enabled", "1");
    const { result } = renderHook(() => useVoiceSetting());
    expect(result.current[0]).toBe(true);
  });
});

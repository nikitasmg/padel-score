import { describe, it, expect } from "vitest";
import { readButtons, detectButtonDowns } from "@/lib/gamepad/poll";

describe("readButtons", () => {
  it("читает pressed по всем кнопкам", () => {
    const gp = { buttons: [{ pressed: false }, { pressed: true }] } as unknown as Gamepad;
    expect(readButtons(gp)).toEqual([false, true]);
  });
});

describe("detectButtonDowns", () => {
  it("ловит переход false→true", () => {
    expect(detectButtonDowns([false, false], [false, true])).toEqual([1]);
  });

  it("зажатие не триггерит повтор", () => {
    expect(detectButtonDowns([true], [true])).toEqual([]);
  });

  it("отпускание не считается нажатием", () => {
    expect(detectButtonDowns([true], [false])).toEqual([]);
  });

  it("пустой prev (первый кадр) ловит уже нажатую кнопку", () => {
    expect(detectButtonDowns([], [true])).toEqual([0]);
  });

  it("несколько одновременных нажатий", () => {
    expect(detectButtonDowns([false, false, false], [true, false, true])).toEqual([0, 2]);
  });
});

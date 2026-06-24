import { describe, it, expect } from "vitest";
import { nextServer, SERVE_ORDER, serveOrigin, serveTarget } from "@/lib/padel/serve";

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

describe("serveOrigin — бокс подачи по команде и стороне", () => {
  it("команда 0: deuce → left-top, ad → left-bottom", () => {
    expect(serveOrigin(0, "deuce")).toEqual({ x: "left", y: "top" });
    expect(serveOrigin(0, "ad")).toEqual({ x: "left", y: "bottom" });
  });
  it("команда 1: deuce → right-top, ad → right-bottom", () => {
    expect(serveOrigin(1, "deuce")).toEqual({ x: "right", y: "top" });
    expect(serveOrigin(1, "ad")).toEqual({ x: "right", y: "bottom" });
  });
  it("смена стороны перекидывает цель по диагонали", () => {
    // одна и та же подающая команда, разные стороны → разные целевые квадраты
    const deuceTarget = serveTarget(serveOrigin(0, "deuce")); // → right-bottom
    const adTarget = serveTarget(serveOrigin(0, "ad"));       // → right-top
    expect(deuceTarget).toEqual({ x: "right", y: "bottom" });
    expect(adTarget).toEqual({ x: "right", y: "top" });
    expect(deuceTarget).not.toEqual(adTarget);
  });
});

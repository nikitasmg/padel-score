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

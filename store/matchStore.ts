"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Config, MatchState, Team, TeamIndex } from "@/lib/padel/types";
import { createMatch, scorePoint, undo, resetMatch } from "@/lib/padel/engine";

interface MatchStore {
  match: MatchState | null;
  start: (config: Config, teams: [Team, Team]) => void;
  point: (team: TeamIndex) => void;
  undoPoint: () => void;
  reset: () => void;
  clear: () => void;
}

export const useMatchStore = create<MatchStore>()(
  persist(
    (set, get) => ({
      match: null,
      start: (config, teams) => set({ match: createMatch(config, teams) }),
      point: (team) => { const m = get().match; if (m) set({ match: scorePoint(m, team) }); },
      undoPoint: () => { const m = get().match; if (m) set({ match: undo(m) }); },
      reset: () => { const m = get().match; if (m) set({ match: resetMatch(m) }); },
      clear: () => set({ match: null }),
    }),
    { name: "rally-match" },
  ),
);

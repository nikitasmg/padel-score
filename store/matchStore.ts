"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Config, MatchState, Team, TeamIndex } from "@/lib/padel/types";
import { createMatch, scorePoint, undo, resetMatch, finishMatch } from "@/lib/padel/engine";

interface MatchStore {
  match: MatchState | null;
  /** true после восстановления из localStorage — до этого момента редиректить нельзя */
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  start: (config: Config, teams: [Team, Team]) => void;
  point: (team: TeamIndex) => void;
  undoPoint: () => void;
  reset: () => void;
  clear: () => void;
  finish: () => void;
}

export const useMatchStore = create<MatchStore>()(
  persist(
    (set, get) => ({
      match: null,
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),
      start: (config, teams) => set({ match: createMatch(config, teams) }),
      point: (team) => { const m = get().match; if (m) set({ match: scorePoint(m, team) }); },
      undoPoint: () => { const m = get().match; if (m) set({ match: undo(m) }); },
      finish: () => { const m = get().match; if (m) set({ match: finishMatch(m) }); },
      reset: () => { const m = get().match; if (m) set({ match: resetMatch(m) }); },
      clear: () => set({ match: null }),
    }),
    {
      name: "rally-match",
      // Персистим только сам матч; флаг гидратации не сохраняем.
      partialize: (state) => ({ match: state.match }),
      // skipHydration: восстановление запускаем вручную в useEffect страниц,
      // чтобы первый клиентский рендер совпадал с серверным (нет hydration mismatch).
      skipHydration: true,
      onRehydrateStorage: () => (state) => { state?.setHasHydrated(true); },
    },
  ),
);

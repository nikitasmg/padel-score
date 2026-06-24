"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TeamIndex } from "@/lib/padel/types";

interface ClickerStore {
  buttonMode: "two" | "one";
  holder: { team: TeamIndex; player: 0 | 1 };
  connected: boolean;
  gamepadId: string | null;
  lastEvent: string | null;
  setMode: (m: "two" | "one") => void;
  setHolder: (h: { team: TeamIndex; player: 0 | 1 }) => void;
  setLastEvent: (e: string) => void;
  setConnected: (v: boolean) => void;
  setGamepadId: (v: string | null) => void;
}

export const useClickerStore = create<ClickerStore>()(
  persist(
    (set) => ({
      buttonMode: "two",
      holder: { team: 0, player: 0 },
      connected: false,
      gamepadId: null,
      lastEvent: null,
      setMode: (buttonMode) => set({ buttonMode }),
      setHolder: (holder) => set({ holder }),
      setLastEvent: (lastEvent) => set({ lastEvent }),
      setConnected: (connected) => set({ connected }),
      setGamepadId: (gamepadId) => set({ gamepadId }),
    }),
    {
      name: "rally-clicker",
      // connected/gamepadId — рантайм-состояние, не персистим.
      partialize: (s) => ({ buttonMode: s.buttonMode, holder: s.holder }),
    },
  ),
);

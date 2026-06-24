"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TeamIndex } from "@/lib/padel/types";
import {
  type ClickerAction,
  type ClickerBindings,
  DEFAULT_BINDINGS,
  resolveBindings,
} from "@/lib/gamepad/mapping";

interface ClickerStore {
  buttonMode: "two" | "one";
  holder: { team: TeamIndex; player: 0 | 1 };
  connected: boolean;
  gamepadId: string | null;
  lastEvent: string | null;
  bindings: ClickerBindings;
  learning: ClickerAction | null;
  setMode: (m: "two" | "one") => void;
  setHolder: (h: { team: TeamIndex; player: 0 | 1 }) => void;
  setLastEvent: (e: string) => void;
  setConnected: (v: boolean) => void;
  setGamepadId: (v: string | null) => void;
  setBinding: (action: ClickerAction, index: number) => void;
  setLearning: (action: ClickerAction | null) => void;
}

export const useClickerStore = create<ClickerStore>()(
  persist(
    (set) => ({
      buttonMode: "two",
      holder: { team: 0, player: 0 },
      connected: false,
      gamepadId: null,
      lastEvent: null,
      bindings: { ...DEFAULT_BINDINGS },
      learning: null,
      setMode: (buttonMode) => set({ buttonMode }),
      setHolder: (holder) => set({ holder }),
      setLastEvent: (lastEvent) => set({ lastEvent }),
      setConnected: (connected) => set({ connected }),
      setGamepadId: (gamepadId) => set({ gamepadId }),
      setBinding: (action, index) =>
        set((s) => ({ bindings: resolveBindings(s.bindings, action, index), learning: null })),
      setLearning: (learning) => set({ learning }),
    }),
    {
      name: "rally-clicker",
      // connected/gamepadId — рантайм-состояние, не персистим.
      partialize: (s) => ({ buttonMode: s.buttonMode, holder: s.holder, bindings: s.bindings }),
    },
  ),
);

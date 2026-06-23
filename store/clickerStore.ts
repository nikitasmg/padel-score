"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TeamIndex } from "@/lib/padel/types";

interface ClickerStore {
  buttonMode: "two" | "one";
  holder: { team: TeamIndex; player: 0 | 1 };
  connected: boolean;
  battery: number;
  lastEvent: string | null;
  setMode: (m: "two" | "one") => void;
  setHolder: (h: { team: TeamIndex; player: 0 | 1 }) => void;
  setLastEvent: (e: string) => void;
}

export const useClickerStore = create<ClickerStore>()(
  persist(
    (set) => ({
      buttonMode: "two",
      holder: { team: 0, player: 0 },
      connected: true,   // заглушка BLE
      battery: 82,       // заглушка BLE
      lastEvent: null,
      setMode: (buttonMode) => set({ buttonMode }),
      setHolder: (holder) => set({ holder }),
      setLastEvent: (lastEvent) => set({ lastEvent }),
    }),
    { name: "rally-clicker" },
  ),
);

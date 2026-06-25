"use client";
import { useCallback, useEffect } from "react";
import { useGamepad } from "@/lib/gamepad/useGamepad";
import { useWakeLock } from "@/lib/gamepad/useWakeLock";
import { buttonToAction, buttonLabel, EVENT_LABEL } from "@/lib/gamepad/mapping";
import { useMatchStore } from "@/store/matchStore";
import { useClickerStore } from "@/store/clickerStore";

export function GamepadController() {
  const setConnected = useClickerStore((s) => s.setConnected);
  const setGamepadId = useClickerStore((s) => s.setGamepadId);
  const setLastEvent = useClickerStore((s) => s.setLastEvent);
  const matchActive = useMatchStore((s) => s.match?.status === "in_progress");

  const handleButtonDown = useCallback(
    (index: number) => {
      const { bindings, learning, setBinding } = useClickerStore.getState();

      // Режим обучения: нажатие записывает привязку, очко не засчитываем.
      if (learning) {
        setBinding(learning, index);
        setLastEvent(`${EVENT_LABEL[learning]} → ${buttonLabel(index)}`);
        return;
      }

      const action = buttonToAction(index, bindings);
      if (!action) return;
      const { match, point, undoPoint } = useMatchStore.getState();
      if (!match || match.status !== "in_progress") return;
      if (action === "pointA") point(0);
      else if (action === "pointB") point(1);
      else undoPoint();
      setLastEvent(`${buttonLabel(index)} · ${EVENT_LABEL[action]}`);
    },
    [setLastEvent],
  );

  const { connected, gamepadId } = useGamepad(handleButtonDown);

  useEffect(() => setConnected(connected), [connected, setConnected]);
  useEffect(() => setGamepadId(gamepadId), [gamepadId, setGamepadId]);

  useWakeLock(Boolean(matchActive));

  return null;
}

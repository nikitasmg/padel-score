"use client";
import { useEffect, useRef, useState } from "react";
import { readButtons, detectButtonDowns } from "./poll";

export function useGamepad(onButtonDown: (index: number) => void) {
  const [connected, setConnected] = useState(false);
  const [gamepadId, setGamepadId] = useState<string | null>(null);
  const cbRef = useRef(onButtonDown);
  cbRef.current = onButtonDown;

  useEffect(() => {
    let raf = 0;
    let prev: boolean[] = [];
    let live = false; // локальное зеркало connected, чтобы не дёргать setState каждый кадр

    const sync = (on: boolean, id: string | null) => {
      if (on === live) return;
      live = on;
      setConnected(on);
      setGamepadId(on ? id : null);
      if (!on) prev = [];
    };

    const onConnect = (e: GamepadEvent) => sync(true, e.gamepad.id);
    const onDisconnect = () => sync(false, null);
    window.addEventListener("gamepadconnected", onConnect);
    window.addEventListener("gamepaddisconnected", onDisconnect);

    const loop = () => {
      const pads = navigator.getGamepads?.() ?? [];
      const gp = Array.from(pads).find((p): p is Gamepad => p != null) ?? null;
      if (gp) {
        sync(true, gp.id);
        const curr = readButtons(gp);
        for (const i of detectButtonDowns(prev, curr)) cbRef.current(i);
        prev = curr;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("gamepadconnected", onConnect);
      window.removeEventListener("gamepaddisconnected", onDisconnect);
    };
  }, []);

  return { connected, gamepadId };
}

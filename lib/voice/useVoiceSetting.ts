"use client";
import { useEffect, useState } from "react";

const KEY = "padel:voice-enabled";

/** Вкл/выкл озвучки с сохранением в localStorage. По умолчанию выключено. */
export function useVoiceSetting(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabled] = useState(false);

  // Читаем в эффекте, а не в инициализаторе useState — чтобы не было рассинхрона при SSR-гидратации.
  useEffect(() => {
    setEnabled(localStorage.getItem(KEY) === "1");
  }, []);

  const update = (v: boolean) => {
    setEnabled(v);
    try {
      localStorage.setItem(KEY, v ? "1" : "0");
    } catch {
      // localStorage может быть недоступен (приватный режим) — игнорируем.
    }
  };

  return [enabled, update];
}

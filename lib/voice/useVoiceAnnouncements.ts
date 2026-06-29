"use client";
import { useEffect, useRef } from "react";
import { useScoreEvents } from "@/lib/padel/useScoreEvents";
import type { MatchState } from "@/lib/padel/types";
import { announcements } from "./phrases";
import { speak } from "./speak";

/** Произносит фразы при крупных событиях счёта. Страж по pointSeq — против дублей (ре-рендеры, StrictMode). */
export function useVoiceAnnouncements(match: MatchState, enabled: boolean): void {
  const { event, pointSeq } = useScoreEvents(match);
  const lastSpoken = useRef(0);

  useEffect(() => {
    // Пока выключено — держим указатель на текущем pointSeq, чтобы при включении
    // не «переиграть» последнее событие.
    if (!enabled) {
      lastSpoken.current = pointSeq;
      return;
    }
    if (pointSeq === 0 || pointSeq === lastSpoken.current) return;
    lastSpoken.current = pointSeq;
    for (const text of announcements(event, match)) speak(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointSeq, enabled]);
}

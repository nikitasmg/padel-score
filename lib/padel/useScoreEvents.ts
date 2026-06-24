"use client";
import { useEffect, useRef, useState } from "react";
import { diffMatch, type ScoreEvent } from "./scoreEvents";
import type { MatchState } from "./types";

const EMPTY: ScoreEvent = { pointChanged: false, matchWon: false };

export function useScoreEvents(match: MatchState | null): { event: ScoreEvent; seq: number } {
  const prev = useRef<MatchState | null>(null);
  const [event, setEvent] = useState<ScoreEvent>(EMPTY);
  const [seq, setSeq] = useState(0);

  useEffect(() => {
    const e = match ? diffMatch(prev.current, match) : EMPTY;
    prev.current = match;
    setEvent(e);
    if (e.gameWonBy !== undefined || e.setWonBy !== undefined || e.matchWon) {
      setSeq((s) => s + 1);
    }
  }, [match]);

  return { event, seq };
}

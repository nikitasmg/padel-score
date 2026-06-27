"use client";
import { useEffect, useRef, useState } from "react";
import { diffMatch, type ScoreEvent } from "./scoreEvents";
import type { MatchState } from "./types";

const EMPTY: ScoreEvent = { pointChanged: false, endsChanged: false, matchWon: false };

export function useScoreEvents(
  match: MatchState | null,
): { event: ScoreEvent; seq: number; pointSeq: number } {
  const prev = useRef<MatchState | null>(null);
  const [event, setEvent] = useState<ScoreEvent>(EMPTY);
  const [seq, setSeq] = useState(0);
  const [pointSeq, setPointSeq] = useState(0);

  useEffect(() => {
    const e = match ? diffMatch(prev.current, match) : EMPTY;
    prev.current = match;
    setEvent(e);
    // seq — крупные события (гейм/сет/матч), pointSeq — любой разыгранный мяч.
    if (e.gameWonBy !== undefined || e.setWonBy !== undefined || e.matchWon) {
      setSeq((s) => s + 1);
    }
    if (e.pointChanged) setPointSeq((s) => s + 1);
  }, [match]);

  return { event, seq, pointSeq };
}

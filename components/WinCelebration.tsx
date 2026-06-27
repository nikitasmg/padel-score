"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useScoreEvents } from "@/lib/padel/useScoreEvents";
import type { MatchState, TeamIndex } from "@/lib/padel/types";

type Cel = { kind: "game" | "set"; team: TeamIndex };

const COLORS = ["#c6f24e", "#e8e8e8", "#9be15d", "#ffffff"];

function teamName(match: MatchState, t: TeamIndex) {
  return match.teams[t].players.map((p) => p.name || "—").join(" / ");
}

export function WinCelebration({
  match,
  variant = "match",
}: {
  match: MatchState;
  variant?: "match" | "broadcast";
}) {
  const { event, seq } = useScoreEvents(match);
  const [cel, setCel] = useState<Cel | null>(null);

  useEffect(() => {
    if (seq === 0 || event.matchWon) return;
    const next: Cel | null =
      event.setWonBy !== undefined
        ? { kind: "set", team: event.setWonBy }
        : event.gameWonBy !== undefined
          ? { kind: "game", team: event.gameWonBy }
          : null;
    if (!next) return;
    setCel(next);
    const id = setTimeout(() => setCel(null), next.kind === "set" ? 2600 : 1200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq]);

  const confetti = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        x: (Math.random() - 0.5) * 320,
        y: -120 - Math.random() * 220,
        rot: Math.random() * 360,
        color: COLORS[i % COLORS.length],
        delay: Math.random() * 0.12,
      })),
    [seq],
  );

  const big = variant === "broadcast";

  return (
    <AnimatePresence>
      {cel && (
        <motion.div
          key={`${seq}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden"
        >
          {/* большая вспышка основного цвета на весь экран */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, big ? 0.78 : 0.62, 0], scale: [0.8, 1.1, 1.18] }}
            transition={{ duration: cel.kind === "set" ? 1.3 : 0.95, ease: "easeOut", times: [0, 0.14, 1] }}
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(72% 85% at 50% 50%,rgba(198,242,78,.95),rgba(198,242,78,.28) 48%,transparent 72%)",
            }}
          />
          {cel.kind === "set" &&
            confetti.map((c, i) => (
              <motion.span
                key={i}
                initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                animate={{ x: c.x, y: c.y, opacity: 0, rotate: c.rot }}
                transition={{ duration: 1.6, delay: c.delay, ease: "easeOut" }}
                className="absolute block rounded-[2px]"
                style={{ width: 9, height: 9, background: c.color }}
              />
            ))}
          <motion.div
            initial={{ scale: 0.7, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
            className={`rounded-[18px] border border-accent/40 bg-black/55 backdrop-blur-sm text-center ${big ? "px-9 py-6" : "px-6 py-4"}`}
            style={{ boxShadow: "0 0 60px rgba(198,242,78,.35)" }}
          >
            <div
              className={`font-mono font-bold tracking-[.18em] uppercase text-accent ${big ? "text-[15px]" : "text-[12px]"}`}
            >
              {cel.kind === "set" ? "Сет" : "Гейм"}
            </div>
            <div
              className={`font-display font-extrabold text-ink mt-1 ${big ? "text-[34px]" : "text-[22px]"}`}
            >
              {teamName(match, cel.team)}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

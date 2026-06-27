"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useScoreEvents } from "@/lib/padel/useScoreEvents";
import type { MatchState, TeamIndex } from "@/lib/padel/types";

/**
 * Эффекты поверх трансляции (рассчитаны на просмотр издалека):
 *  - крупная вспышка основного цвета за цифрами стороны, выигравшей розыгрыш;
 *  - полноэкранный баннер «Смена сторон» при change of ends.
 * Крупные события гейма/сета рисует WinCelebration.
 */
export function BroadcastEffects({ match }: { match: MatchState }) {
  const { event, pointSeq } = useScoreEvents(match);
  const [flash, setFlash] = useState<{ team: TeamIndex; key: number } | null>(null);
  const [ends, setEnds] = useState<number | null>(null);

  useEffect(() => {
    if (pointSeq === 0) return;
    // На выигрыше гейма/сета/матча боковую вспышку не показываем — там крупное
    // празднование (WinCelebration), иначе эффекты накладываются.
    if (event.pointWonBy !== undefined && event.gameWonBy === undefined && !event.matchWon) {
      setFlash({ team: event.pointWonBy, key: pointSeq });
      const id = setTimeout(() => setFlash(null), 1500);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointSeq]);

  useEffect(() => {
    if (pointSeq === 0 || !event.endsChanged) return;
    setEnds(pointSeq);
    const id = setTimeout(() => setEnds(null), 2800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointSeq]);

  return (
    <>
      {/* вспышка за цифрами — низкий z, под счётом */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence>
          {flash && (
            <motion.div
              key={flash.key}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1.2, 1.3, 1.5] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.55, ease: "easeOut", times: [0, 0.1, 0.55, 1] }}
              className="absolute top-[-15%] h-[130%] w-[62%]"
              style={{
                left: flash.team === 0 ? "-6%" : "44%",
                background:
                  "radial-gradient(72% 60% at 50% 54%,rgba(214,255,90,1),rgba(198,242,78,.85) 30%,rgba(198,242,78,.4) 52%,rgba(198,242,78,.12) 70%,transparent 84%)",
                filter: "blur(2px)",
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* баннер смены сторон — поверх всего, крупно по центру */}
      <AnimatePresence>
        {ends && (
          <motion.div
            key={`ends-${ends}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center overflow-hidden"
          >
            <div className="absolute inset-0" style={{ background: "radial-gradient(80% 90% at 50% 50%,rgba(0,0,0,.34),rgba(0,0,0,.6))" }} />
            {/* световое «смахивание» по горизонтали */}
            <motion.div
              initial={{ x: "-130%" }}
              animate={{ x: "130%" }}
              transition={{ duration: 1.15, ease: "easeInOut" }}
              className="absolute inset-y-0 w-2/5"
              style={{ background: "linear-gradient(90deg,transparent,rgba(198,242,78,.28),transparent)" }}
            />
            <motion.div
              initial={{ scale: 0.78, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="relative flex flex-col items-center"
            >
              <BigSwapArrows />
              <div
                className="font-display font-black uppercase tracking-[-.01em] leading-none text-accent mt-7 text-[clamp(46px,10vh,112px)]"
                style={{ textShadow: "0 0 70px rgba(198,242,78,.6),0 0 18px rgba(198,242,78,.5)" }}
              >
                Смена сторон
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function BigSwapArrows() {
  return (
    <svg viewBox="0 0 200 70" width="220" height="77" style={{ filter: "drop-shadow(0 0 24px rgba(198,242,78,.5))" }}>
      <motion.path
        d="M14 26 H150 M132 10 L154 26 L132 42"
        fill="none"
        stroke="#c6f24e"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ x: [0, 12, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.path
        d="M186 52 H50 M68 36 L46 52 L68 68"
        fill="none"
        stroke="#c6f24e"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ x: [0, -12, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

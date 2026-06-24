"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScoreBoard } from "@/components/ScoreBoard";
import { CourtDiagram } from "@/components/CourtDiagram";
import { ScoreButtons } from "@/components/ScoreButtons";
import { MatchCompleteOverlay } from "@/components/MatchCompleteOverlay";
import { useMatchStore } from "@/store/matchStore";
import { useClickerStore } from "@/store/clickerStore";
import { clock, sideLabel } from "@/lib/padel/format";
import { WinCelebration } from "@/components/WinCelebration";
import { GamepadLink } from "@/components/GamepadLink";

export default function MatchPage() {
  const router = useRouter();
  const match = useMatchStore((s) => s.match);
  const point = useMatchStore((s) => s.point);
  const undoPoint = useMatchStore((s) => s.undoPoint);
  const finish = useMatchStore((s) => s.finish);
  const clear = useMatchStore((s) => s.clear);
  const hasHydrated = useMatchStore((s) => s.hasHydrated);
  const connected = useClickerStore((s) => s.connected);
  const [now, setNow] = useState(Date.now());
  const [confirmFinish, setConfirmFinish] = useState(false);

  useEffect(() => {
    void useMatchStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // Редиректим только после восстановления из localStorage — иначе теряем активный матч при перезагрузке.
    if (hasHydrated && match === null) router.replace("/");
  }, [hasHydrated, match, router]);

  if (!hasHydrated || !match) return null;

  const server = match.teams[match.serving.team].players[match.serving.player].name;
  const sideText = match.serving.side === "deuce" ? "Deuce" : "Ad";

  return (
    <>
      <div className="relative px-[22px] pt-[26px] min-h-screen flex flex-col">
        <WinCelebration match={match} variant="match" />
        {/* top bar */}
        <div className="flex items-center justify-between mb-[22px]">
          <div className="flex items-center gap-[9px]">
            <div className="w-[7px] h-[7px] rounded-full bg-live animate-pulse2" />
            <span className="font-mono font-bold text-[13px] tracking-[.1em] text-live">LIVE</span>
            <span className="font-mono font-semibold text-[13px] text-muted2 ml-1.5">СЕТ {match.currentSet + 1}</span>
          </div>
          <span className="font-mono font-semibold text-[14px] text-ink3 tnum">{clock(now - match.startedAt)}</span>
          <div className="flex items-center gap-2">
            <GamepadLink />
            <button onClick={() => router.push("/broadcast")} className="flex items-center gap-1.5 bg-accent/[.12] border border-accent/30 rounded-full px-3 py-1.5 font-mono font-semibold text-[12px] tracking-[.08em] uppercase text-accent">
              <div className="w-[7px] h-[7px] rounded-full bg-accent animate-pulse2" /> Трансляция
            </button>
          </div>
        </div>

        <ScoreBoard match={match} />

        {/* serve / court card */}
        <div className="mt-5 bg-surface border border-white/[.07] rounded-[22px] p-[18px]">
          <div className="flex items-center justify-between mb-[14px]">
            <span className="font-mono font-semibold text-[11px] tracking-[.12em] uppercase text-muted2">Подача</span>
            <span className="font-display font-semibold text-[13px] text-accent">
              {server} · {sideLabel(match.serving.side)} · {sideText}
            </span>
          </div>
          <CourtDiagram match={match} />
        </div>

        <ScoreButtons
          onA={() => point(0)}
          onB={() => point(1)}
          onUndo={undoPoint}
          connected={connected}
        />

        {confirmFinish ? (
          <div className="flex gap-2 pb-4">
            <button onClick={() => { finish(); setConfirmFinish(false); }} className="flex-1 h-[46px] rounded-[14px] bg-live/90 font-display font-bold text-[14px] text-bg">Завершить сейчас</button>
            <button onClick={() => setConfirmFinish(false)} className="flex-1 h-[46px] rounded-[14px] border border-white/15 font-display font-semibold text-[14px] text-ink">Отмена</button>
          </div>
        ) : (
          <button onClick={() => setConfirmFinish(true)} className="w-full h-[46px] rounded-[14px] border border-white/12 font-display font-semibold text-[14px] text-muted2 pb-0 mb-4">Завершить матч</button>
        )}
      </div>

      <MatchCompleteOverlay
        match={match}
        onNew={() => {
          clear();
          router.push("/");
        }}
        onBroadcast={() => router.push("/broadcast")}
      />
    </>
  );
}

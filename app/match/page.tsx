"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneScreen } from "@/components/PhoneScreen";
import { ScoreBoard } from "@/components/ScoreBoard";
import { CourtDiagram } from "@/components/CourtDiagram";
import { ScoreButtons } from "@/components/ScoreButtons";
import { MatchCompleteOverlay } from "@/components/MatchCompleteOverlay";
import { useMatchStore } from "@/store/matchStore";
import { useClickerStore } from "@/store/clickerStore";
import { clock, sideLabel } from "@/lib/padel/format";

export default function MatchPage() {
  const router = useRouter();
  const match = useMatchStore((s) => s.match);
  const point = useMatchStore((s) => s.point);
  const undoPoint = useMatchStore((s) => s.undoPoint);
  const clear = useMatchStore((s) => s.clear);
  const hasHydrated = useMatchStore((s) => s.hasHydrated);
  const battery = useClickerStore((s) => s.battery);
  const [now, setNow] = useState(Date.now());

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
    <PhoneScreen hero>
      <div className="px-[22px] pt-[26px] min-h-[calc(100vh-36px)] flex flex-col">
        {/* top bar */}
        <div className="flex items-center justify-between mb-[22px]">
          <div className="flex items-center gap-[9px]">
            <div className="w-[7px] h-[7px] rounded-full bg-live animate-pulse2" />
            <span className="font-mono font-bold text-[13px] tracking-[.1em] text-live">LIVE</span>
            <span className="font-mono font-semibold text-[13px] text-muted2 ml-1.5">СЕТ {match.currentSet + 1}</span>
          </div>
          <span className="font-mono font-semibold text-[14px] text-ink3 tnum">{clock(now - match.startedAt)}</span>
          <button onClick={() => router.push("/broadcast")} className="font-display text-[22px] text-[#9a9f97]">⋯</button>
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
          battery={battery}
        />
      </div>

      <MatchCompleteOverlay
        match={match}
        onNew={() => { clear(); router.push("/"); }}
        onBroadcast={() => router.push("/broadcast")}
      />
    </PhoneScreen>
  );
}

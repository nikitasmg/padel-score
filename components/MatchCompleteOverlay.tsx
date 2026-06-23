"use client";
import type { MatchState } from "@/lib/padel/types";

export function MatchCompleteOverlay({ match, onNew, onBroadcast }: { match: MatchState; onNew: () => void; onBroadcast: () => void }) {
  if (match.status !== "completed" || match.winner === undefined) return null;
  const w = match.teams[match.winner].players.map((p) => p.name).join(" / ");
  return (
    <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center px-8 text-center">
      <div className="font-mono font-semibold text-[12px] tracking-[.16em] uppercase text-accent mb-3">Матч завершён</div>
      <div className="font-display font-extrabold text-[34px] text-ink leading-tight">{w}</div>
      <div className="font-display font-medium text-[15px] text-muted mt-2">Счёт по сетам {match.score[0].sets} : {match.score[1].sets}</div>
      <button onClick={onBroadcast} className="mt-8 w-full max-w-[260px] h-[54px] rounded-[18px] bg-accent font-display font-extrabold text-[17px] text-bg">Трансляция</button>
      <button onClick={onNew} className="mt-3 w-full max-w-[260px] h-[54px] rounded-[18px] border border-white/15 font-display font-bold text-[16px] text-ink">Новый матч</button>
    </div>
  );
}

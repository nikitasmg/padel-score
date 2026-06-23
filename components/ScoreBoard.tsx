import type { MatchState, TeamIndex } from "@/lib/padel/types";
import { pointLabel } from "@/lib/padel/format";

export function ScoreBoard({ match }: { match: MatchState }) {
  const setsCount = match.score[0].games.length;
  const cols = `1fr ${Array.from({ length: setsCount }).map(() => "34px").join(" ")} 64px`;
  return (
    <div className="bg-surface border border-white/[.07] rounded-[22px] overflow-hidden">
      <div className="grid items-center px-[18px] pt-[11px] pb-[9px] border-b border-white/[.06]" style={{ gridTemplateColumns: cols }}>
        <span className="font-mono font-semibold text-[10px] tracking-[.12em] uppercase text-muted3">Команды</span>
        {Array.from({ length: setsCount }).map((_, i) => (
          <span key={i} className={`text-center font-mono font-semibold text-[10px] ${i === match.currentSet ? "text-accent" : "text-muted3"}`}>{i + 1}</span>
        ))}
        <span className="text-center font-mono font-semibold text-[10px] tracking-[.08em] uppercase text-muted3">Очко</span>
      </div>
      {[0, 1].map((t) => {
        const team = t as TeamIndex;
        const serving = match.serving.team === team;
        return (
          <div key={t} className={`relative grid items-center px-[18px] py-4 ${t === 1 ? "border-t border-white/[.06]" : ""}`}
            style={{ gridTemplateColumns: cols, background: serving ? "linear-gradient(90deg,rgba(198,242,78,.07),transparent 60%)" : undefined }}>
            {serving && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />}
            <div className="flex items-center gap-[9px]">
              {serving
                ? <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center shrink-0"><div className="w-[7px] h-[7px] rounded-full bg-bg" /></div>
                : <div className="w-4 h-4 rounded-full border-[1.5px] border-muted3 shrink-0" />}
              <div className="font-display font-bold text-[16px] text-ink leading-[1.15]">
                {match.teams[team].players[0].name} <span className="text-muted font-medium">/ {match.teams[team].players[1].name}</span>
              </div>
            </div>
            {match.score[team].games.map((g, i) => (
              <span key={i} className="text-center font-display font-bold text-[17px] tnum text-muted">{g}</span>
            ))}
            <span className={`text-center font-display font-extrabold text-[30px] tnum ${serving ? "text-accent" : "text-ink3"}`}>{pointLabel(match, team)}</span>
          </div>
        );
      })}
    </div>
  );
}

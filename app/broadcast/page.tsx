"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMatchStore } from "@/store/matchStore";
import { useClickerStore } from "@/store/clickerStore";
import { pointLabel } from "@/lib/padel/format";
import type { MatchState, TeamIndex } from "@/lib/padel/types";
import { AnimatedPoint } from "@/components/AnimatedPoint";
import { WinCelebration } from "@/components/WinCelebration";

function names(m: MatchState, t: TeamIndex) {
  return m.teams[t].players.map((p) => p.name).join(" / ");
}

export default function BroadcastPage() {
  const router = useRouter();
  const match = useMatchStore((s) => s.match);
  const hasHydrated = useMatchStore((s) => s.hasHydrated);
  const connected = useClickerStore((s) => s.connected);
  const [landscape, setLandscape] = useState(true);

  useEffect(() => {
    void useMatchStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape)");
    const update = () => setLandscape(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    // Редиректим только после гидратации store, иначе теряем матч при прямой загрузке/обновлении.
    if (hasHydrated && match === null) router.replace("/");
  }, [hasHydrated, match, router]);

  if (!hasHydrated || !match) return null;

  if (!landscape) {
    return <RotatePrompt match={match} onExit={() => router.push("/match")} />;
  }

  const gamesA = match.score[0].games[match.currentSet];
  const gamesB = match.score[1].games[match.currentSet];

  return (
    <div
      onClick={() => router.push("/match")}
      className="relative min-h-screen w-full overflow-hidden text-ink cursor-pointer"
      style={{
        background:
          "radial-gradient(80% 130% at 50% 130%,rgba(36,92,48,.34),transparent 62%),radial-gradient(60% 90% at 50% -25%,rgba(198,242,78,.10),transparent 60%),#070807",
      }}
    >
      <WinCelebration match={match} variant="broadcast" />

      {/* LIVE corner */}
      <div className="absolute top-5 left-10 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-live animate-pulse2" />
        <span className="font-mono font-bold text-[13px] tracking-[.14em] text-live">LIVE</span>
      </div>
      {/* gamepad corner */}
      <div className="absolute top-5 right-10 flex items-center gap-2">
        <div className={`w-[7px] h-[7px] rounded-full ${connected ? "bg-accent animate-pulse2" : "bg-muted3"}`} />
        <span className={`font-mono font-semibold text-[12px] ${connected ? "text-accent" : "text-muted3"}`}>
          {connected ? "Геймпад" : "Нет геймпада"}
        </span>
      </div>

      {/* minimal top: set + game */}
      <div className="flex items-center justify-center gap-[18px] pt-[22px]">
        <span className="font-display font-extrabold text-[19px] tracking-[.04em] text-[#6a6f67]">
          СЕТ {match.currentSet + 1}
        </span>
        <span className="w-[5px] h-[5px] rounded-full bg-[#3a3f38]" />
        <span className="font-display font-extrabold text-[19px] tracking-[.02em] text-[#6a6f67]">
          ГЕЙМ {gamesA + gamesB + 1}
        </span>
      </div>

      {/* main split */}
      <div
        className="grid items-center"
        style={{ gridTemplateColumns: "1fr 2px 1fr", height: "calc(100vh - 96px)" }}
      >
        <TeamSide
          align="left"
          name={names(match, 0)}
          point={pointLabel(match, 0)}
          sets={match.score[0].sets}
          games={gamesA}
          serving={match.serving.team === 0}
          highlight={match.serving.team === 0}
        />
        <div
          className="w-0.5 h-[64%] justify-self-center"
          style={{
            background:
              "linear-gradient(180deg,transparent,rgba(255,255,255,.14),transparent)",
          }}
        />
        <TeamSide
          align="right"
          name={names(match, 1)}
          point={pointLabel(match, 1)}
          sets={match.score[1].sets}
          games={gamesB}
          serving={match.serving.team === 1}
          highlight={match.serving.team === 1}
        />
      </div>
    </div>
  );
}

function ServeBall() {
  return (
    <svg
      viewBox="0 0 28 28"
      className="w-[30px] h-[30px] shrink-0"
      style={{ filter: "drop-shadow(0 0 10px rgba(198,242,78,.7))" }}
    >
      <circle cx="14" cy="14" r="13" fill="#c6f24e" />
      <path
        d="M3 9 Q14 16 25 9 M3 19 Q14 12 25 19"
        fill="none"
        stroke="#0a0b0a"
        strokeWidth="1.6"
        opacity=".55"
      />
    </svg>
  );
}

function StatChip({ label, val, align }: { label: string; val: number; align: "left" | "right" }) {
  return (
    <div className="flex items-baseline gap-[10px] bg-white/[.04] border border-white/[.08] rounded-[14px] px-4 py-2">
      {align === "right" && (
        <span className="font-display font-bold text-[14px] tracking-[.08em] text-[#6a6f67]">{label}</span>
      )}
      <span className="font-display font-extrabold text-[40px] text-ink tnum leading-none">{val}</span>
      {align === "left" && (
        <span className="font-display font-bold text-[14px] tracking-[.08em] text-[#6a6f67]">{label}</span>
      )}
    </div>
  );
}

function TeamSide({
  align,
  name,
  point,
  sets,
  games,
  serving,
  highlight,
}: {
  align: "left" | "right";
  name: string;
  point: string;
  sets: number;
  games: number;
  serving: boolean;
  highlight?: boolean;
}) {
  const right = align === "right";
  return (
    <div className={right ? "pl-8 pr-14 text-right" : "pl-14 pr-8"}>
      <div className={`flex items-center gap-[14px] mb-0.5 ${right ? "justify-end" : ""}`}>
        {serving && !right && <ServeBall />}
        <span
          className="font-display font-extrabold text-[34px] tracking-[-.02em]"
          style={{ color: highlight ? "#f4f5f1" : "#aeb2aa" }}
        >
          {name}
        </span>
        {serving && right && <ServeBall />}
        {!serving && right && <span className="w-[30px] shrink-0" />}
      </div>
      <AnimatedPoint
        value={point}
        className="font-display font-black leading-[.8] tracking-[-.05em] text-[clamp(120px,17vw,176px)]"
        style={{
          color: highlight ? "#c6f24e" : "#eef0ea",
          textShadow: highlight ? "0 0 70px rgba(198,242,78,.45)" : undefined,
        }}
      />
      <div className={`flex gap-[14px] mt-[14px] ${right ? "justify-end" : ""}`}>
        {right ? (
          <>
            <StatChip label="СЕТЫ" val={sets} align="right" />
            <StatChip label="ГЕЙМЫ" val={games} align="right" />
          </>
        ) : (
          <>
            <StatChip label="СЕТЫ" val={sets} align="left" />
            <StatChip label="ГЕЙМЫ" val={games} align="left" />
          </>
        )}
      </div>
    </div>
  );
}

function RotatePrompt({ match, onExit }: { match: MatchState; onExit: () => void }) {
  const serveTeam = match.serving.team;
  return (
    <div
      className="relative min-h-screen w-full overflow-hidden flex flex-col text-ink"
      style={{
        background:
          "radial-gradient(120% 50% at 50% 50%,rgba(198,242,78,.08),transparent 60%),#070807",
      }}
    >
      {/* live pill */}
      <div className="flex justify-center mt-10">
        <div className="inline-flex items-center gap-[9px] bg-live/[.12] border border-live/30 rounded-[20px] px-4 py-2">
          <div className="w-2 h-2 rounded-full bg-live animate-pulse2" />
          <span className="font-mono font-bold text-[12px] tracking-[.14em] text-live">
            ТРАНСЛЯЦИЯ АКТИВНА
          </span>
        </div>
      </div>

      {/* center */}
      <div className="flex-1 flex flex-col items-center justify-center px-10 text-center">
        <div className="relative w-[150px] h-[150px] flex items-center justify-center mb-[46px]">
          <div className="absolute inset-0 rounded-full border-[1.5px] border-dashed border-accent/30 animate-pulse2" />
          <svg viewBox="0 0 120 120" className="w-[104px] h-[104px]" style={{ transform: "rotate(-22deg)" }}>
            <rect x="34" y="14" width="52" height="92" rx="11" fill="none" stroke="#c6f24e" strokeWidth="3" />
            <rect x="44" y="26" width="32" height="60" rx="3" fill="rgba(198,242,78,.16)" />
            <line x1="52" y1="96" x2="68" y2="96" stroke="#c6f24e" strokeWidth="3" strokeLinecap="round" />
            <path d="M96 44 a40 40 0 0 1 0 32" fill="none" stroke="#c6f24e" strokeWidth="2.5" strokeLinecap="round" opacity=".55" />
            <path d="M96 76 l5 -2 m-5 2 l1 5" fill="none" stroke="#c6f24e" strokeWidth="2.5" strokeLinecap="round" opacity=".55" />
          </svg>
        </div>

        <div className="font-display font-extrabold text-[30px] tracking-[-.02em] text-ink leading-[1.1]">
          Поверните телефон
          <br />
          горизонтально
        </div>
        <p className="font-display text-[16px] text-muted mt-4 leading-[1.45] max-w-[280px]">
          Поставьте телефон на корт — счёт развернётся на весь экран, а очки можно записывать с кликера
        </p>

        {/* mini score */}
        <div className="flex items-center gap-[14px] mt-[34px] bg-surface border border-white/[.07] rounded-[16px] px-[22px] py-[14px]">
          <div className="text-center">
            <div className={`font-mono font-semibold text-[10px] mb-[3px] ${serveTeam === 0 ? "text-accent" : "text-[#6a6f67]"}`}>
              A{serveTeam === 0 ? " • подача" : ""}
            </div>
            <div
              className="font-display font-black text-[34px] tnum leading-none"
              style={{ color: serveTeam === 0 ? "#c6f24e" : "#eef0ea" }}
            >
              {pointLabel(match, 0)}
            </div>
          </div>
          <div className="w-px h-[34px] bg-white/[.12]" />
          <div className="text-center">
            <div className={`font-mono font-semibold text-[10px] mb-[3px] ${serveTeam === 1 ? "text-accent" : "text-[#6a6f67]"}`}>
              B{serveTeam === 1 ? " • подача" : ""}
            </div>
            <div
              className="font-display font-black text-[34px] tnum leading-none"
              style={{ color: serveTeam === 1 ? "#c6f24e" : "#eef0ea" }}
            >
              {pointLabel(match, 1)}
            </div>
          </div>
        </div>
      </div>

      {/* exit */}
      <div className="px-7 pb-10">
        <button
          onClick={onExit}
          className="w-full flex items-center justify-center gap-[10px] h-[54px] rounded-[18px] border-[1.5px] border-white/[.14] font-display font-bold text-[16px] text-ink3"
        >
          Остановить трансляцию
        </button>
      </div>
    </div>
  );
}

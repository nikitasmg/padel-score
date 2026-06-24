"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMatchStore } from "@/store/matchStore";
import { useClickerStore } from "@/store/clickerStore";
import { clock, pointLabel } from "@/lib/padel/format";
import type { MatchState, TeamIndex } from "@/lib/padel/types";

function names(m: MatchState, t: TeamIndex) {
  return m.teams[t].players.map((p) => p.name).join(" / ");
}

export default function BroadcastPage() {
  const router = useRouter();
  const match = useMatchStore((s) => s.match);
  const hasHydrated = useMatchStore((s) => s.hasHydrated);
  const connected = useClickerStore((s) => s.connected);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    void useMatchStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // Редиректим только после гидратации store, иначе теряем матч при прямой загрузке/обновлении.
    if (hasHydrated && match === null) router.replace("/");
  }, [hasHydrated, match, router]);

  if (!hasHydrated || !match) return null;

  const gamesA = match.score[0].games[match.currentSet];
  const gamesB = match.score[1].games[match.currentSet];

  return (
    <div
      onClick={() => router.push("/match")}
      className="relative min-h-screen w-full overflow-hidden text-ink cursor-pointer"
      style={{
        background:
          "radial-gradient(80% 130% at 50% 120%,rgba(36,92,48,.32),transparent 60%),radial-gradient(60% 90% at 50% -20%,rgba(198,242,78,.10),transparent 60%),#070807",
      }}
    >
      {/* top strip */}
      <div className="flex items-center justify-between px-10 pt-5">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-live animate-pulse2" />
          <span className="font-mono font-bold text-[13px] tracking-[.14em] text-live">LIVE</span>
        </div>
        <div className="font-mono font-bold text-[14px] tracking-[.2em] uppercase text-[#9a9f97]">
          Сет {match.currentSet + 1} · Корт 3 · до {match.config.gamesPerSet} геймов
        </div>
        <div className="font-mono font-semibold text-[14px] text-ink3 tnum">
          {clock(now - match.startedAt)}
        </div>
      </div>

      {/* main split */}
      <div
        className="grid items-center px-5"
        style={{ gridTemplateColumns: "1fr 1px 1fr", height: "calc(100vh - 120px)" }}
      >
        <TeamSide
          align="left"
          name={names(match, 0)}
          dot="#c6f24e"
          point={pointLabel(match, 0)}
          sets={match.score[0].sets}
          games={gamesA}
          serving={match.serving.team === 0}
          side={match.serving.side}
          highlight
        />
        <div
          className="w-px h-[60%] justify-self-center"
          style={{
            background:
              "linear-gradient(180deg,transparent,rgba(255,255,255,.16),transparent)",
          }}
        />
        <TeamSide
          align="right"
          name={names(match, 1)}
          dot="#e8e8e8"
          point={pointLabel(match, 1)}
          sets={match.score[1].sets}
          games={gamesB}
          serving={match.serving.team === 1}
          side={match.serving.side}
        />
      </div>

      {/* bottom strip */}
      <div className="absolute left-0 right-0 bottom-0 flex items-center justify-between px-10 pb-[22px]">
        <div className="flex items-center gap-[9px]">
          <div className="w-[9px] h-[9px] rounded-full bg-accent" />
          <span className="font-display font-extrabold text-[16px] tracking-[-.01em]">RALLY</span>
        </div>
        <div className="font-mono font-semibold text-[12px] tracking-[.16em] uppercase text-muted3">
          Нажмите на экран, чтобы выйти из трансляции
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-[7px] h-[7px] rounded-full ${connected ? "bg-accent animate-pulse2" : "bg-muted3"}`} />
          <span className={`font-mono font-semibold text-[12px] ${connected ? "text-accent" : "text-muted3"}`}>
            {connected ? "Геймпад" : "Нет геймпада"}
          </span>
        </div>
      </div>
    </div>
  );
}

function TeamSide({
  align,
  name,
  dot,
  point,
  sets,
  games,
  serving,
  side,
  highlight,
}: {
  align: "left" | "right";
  name: string;
  dot: string;
  point: string;
  sets: number;
  games: number;
  serving: boolean;
  side: "deuce" | "ad";
  highlight?: boolean;
}) {
  const right = align === "right";
  return (
    <div className={`px-9 ${right ? "text-right" : ""}`}>
      <div className={`flex items-center gap-[11px] mb-1.5 ${right ? "justify-end" : ""}`}>
        {!right && (
          <div
            className="w-[11px] h-[11px] rounded-full"
            style={{
              background: dot,
              boxShadow: highlight ? "0 0 12px rgba(198,242,78,.7)" : undefined,
            }}
          />
        )}
        <span className="font-display font-extrabold text-[22px] tracking-[-.01em]">{name}</span>
        {right && <div className="w-[11px] h-[11px] rounded-full" style={{ background: dot }} />}
      </div>
      <div className={`flex items-end gap-6 mt-3.5 ${right ? "justify-end" : ""}`}>
        {right && <Stats sets={sets} games={games} align="right" />}
        <div
          className="font-display font-black text-[132px] leading-[.82] tnum tracking-[-.04em]"
          style={{
            color: highlight ? "#c6f24e" : "#eef0ea",
            textShadow: highlight ? "0 0 50px rgba(198,242,78,.35)" : undefined,
          }}
        >
          {point}
        </div>
        {!right && <Stats sets={sets} games={games} align="left" />}
      </div>
      <div className="h-[34px] mt-[18px]">
        {serving && !right && <ServePill side={side} />}
        {serving && right && (
          <div className="flex justify-end">
            <ServePill side={side} />
          </div>
        )}
      </div>
    </div>
  );
}

function Stats({
  sets,
  games,
  align,
}: {
  sets: number;
  games: number;
  align: "left" | "right";
}) {
  const Row = ({ label, val }: { label: string; val: number }) => (
    <div className="flex items-center gap-[9px]">
      {align === "right" && (
        <span className="font-display font-extrabold text-[26px] tnum">{val}</span>
      )}
      <span
        className="font-mono font-semibold text-[11px] tracking-[.1em] text-muted3 w-12"
        style={{ textAlign: "left" }}
      >
        {label}
      </span>
      {align === "left" && (
        <span className="font-display font-extrabold text-[26px] tnum">{val}</span>
      )}
    </div>
  );
  return (
    <div className={`flex flex-col gap-2.5 pb-3.5 ${align === "right" ? "items-end" : ""}`}>
      <Row label="СЕТЫ" val={sets} />
      <Row label="ГЕЙМЫ" val={games} />
    </div>
  );
}

function ServePill({ side }: { side: "deuce" | "ad" }) {
  return (
    <div className="inline-flex items-center gap-[9px] bg-accent/[.14] border border-accent/35 rounded-[20px] px-[15px] py-[7px]">
      <div className="w-3.5 h-3.5 rounded-full bg-accent animate-ring" />
      <span className="font-mono font-bold text-[12px] tracking-[.12em] text-accent">
        ПОДАЧА · {side === "deuce" ? "DEUCE" : "AD"}
      </span>
    </div>
  );
}

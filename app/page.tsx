"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneScreen } from "@/components/PhoneScreen";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Toggle } from "@/components/Toggle";
import { Input } from "@/components/ui/input";
import { useMatchStore } from "@/store/matchStore";
import type { Config } from "@/lib/padel/types";

const A_INIT = ["Алекс", "Марко"];
const B_INIT = ["Дима", "Соня"];

export default function NewMatchPage() {
  const router = useRouter();
  const start = useMatchStore((s) => s.start);
  const [sets, setSets] = useState<1 | 3 | 5>(3);
  const [games, setGames] = useState<4 | 6 | 9>(6);
  const [goldenPoint, setGolden] = useState(true);
  const [tiebreak, setTiebreak] = useState(true);
  const [a, setA] = useState(A_INIT);
  const [b, setB] = useState(B_INIT);

  function begin() {
    const config: Config = { sets, gamesPerSet: games, goldenPoint, tiebreak };
    start(config, [
      { players: [{ name: a[0] }, { name: a[1] }] },
      { players: [{ name: b[0] }, { name: b[1] }] },
    ]);
    router.push("/match");
  }

  return (
    <PhoneScreen>
      <div className="px-[22px] pt-[30px] min-h-[calc(100vh-36px)] flex flex-col">
        {/* title */}
        <div className="flex items-center justify-between mb-[26px]">
          <div>
            <div className="font-mono font-medium text-[12px] tracking-[.12em] uppercase text-accent">Setup</div>
            <div className="font-display font-extrabold text-[30px] tracking-[-.02em] text-ink mt-0.5">Новый матч</div>
          </div>
          <div className="w-[38px] h-[38px] rounded-full border border-white/10 flex items-center justify-center text-[#9a9f97] text-[20px]">✕</div>
        </div>

        {/* format */}
        <div className="font-mono font-semibold text-[11px] tracking-[.14em] uppercase text-muted2 mb-3">Формат</div>
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex items-center justify-between bg-surface2 border border-white/[.06] rounded-2xl px-4 py-[14px]">
            <span className="font-display font-semibold text-[15px] text-ink3">Сетов в матче</span>
            <SegmentedControl options={[1, 3, 5] as const} value={sets} onChange={(v) => setSets(v as 1 | 3 | 5)} />
          </div>
          <div className="flex items-center justify-between bg-surface2 border border-white/[.06] rounded-2xl px-4 py-[14px]">
            <span className="font-display font-semibold text-[15px] text-ink3">Геймов в сете</span>
            <SegmentedControl options={[4, 6, 9] as const} value={games} onChange={(v) => setGames(v as 4 | 6 | 9)} />
          </div>
          <div className="flex gap-3">
            <Toggle checked={goldenPoint} onChange={setGolden} label="Golden Point" />
            <Toggle checked={tiebreak} onChange={setTiebreak} label="Тай-брейк" />
          </div>
        </div>

        {/* teams */}
        <TeamBlock color="#c6f24e" title="Команда A" names={a} onName={(i, v) => setA((p) => p.map((n, j) => j === i ? v : n))} />
        <div className="h-5" />
        <TeamBlock color="#e8e8e8" title="Команда B" names={b} onName={(i, v) => setB((p) => p.map((n, j) => j === i ? v : n))} />

        {/* cta */}
        <div className="mt-auto pt-[18px] pb-[14px]">
          <button onClick={begin} className="w-full flex items-center justify-center gap-2.5 h-[58px] rounded-[18px] bg-accent font-display font-extrabold text-[18px] text-bg" style={{ boxShadow: "0 12px 30px -8px rgba(198,242,78,.5)" }}>
            Начать матч <span className="text-[20px]">→</span>
          </button>
          <div className="text-center mt-3 font-display font-medium text-[13px] text-muted3">Корт 3 · Padel Club Moscow</div>
        </div>
      </div>
    </PhoneScreen>
  );
}

function TeamBlock({ color, title, names, onName }: { color: string; title: string; names: string[]; onName: (i: number, v: string) => void }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-[9px] h-[9px] rounded-full" style={{ background: color }} />
        <span className="font-mono font-semibold text-[11px] tracking-[.14em] uppercase text-muted2">{title}</span>
      </div>
      <div className="flex flex-col gap-2">
        {names.map((n, i) => (
          <div key={i} className="flex items-center gap-[13px] bg-surface2 border border-white/[.06] rounded-[14px] px-[14px] py-[11px]">
            <div className="w-10 h-10 rounded-full bg-[#1b1e1b] flex items-center justify-center font-display font-bold text-[16px]" style={{ border: `1.5px solid ${color}`, color }}>
              {n.charAt(0).toUpperCase() || "·"}
            </div>
            <Input value={n} onChange={(e) => onName(i, e.target.value)} className="flex-1 h-auto p-0 bg-transparent border-0 shadow-none focus-visible:ring-0 font-display font-semibold text-[16px] text-ink2" />
          </div>
        ))}
      </div>
    </>
  );
}

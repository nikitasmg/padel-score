"use client";
import { useClickerStore } from "@/store/clickerStore";
import { useMatchStore } from "@/store/matchStore";

export default function ClickerPage() {
  const { buttonMode, holder, battery, lastEvent, setMode, setHolder, setLastEvent } = useClickerStore();
  const match = useMatchStore((s) => s.match);
  const holderName = match ? `${match.teams[holder.team].players[holder.player].name} · Команда ${holder.team === 0 ? "A" : "B"}` : "Алекс · Команда A";

  return (
    <div className="w-full">
      <div className="px-[22px] pt-[30px]">
        <div className="flex items-center justify-between mb-[26px]">
          <div>
            <div className="font-mono font-medium text-[12px] tracking-[.12em] uppercase text-accent">Bluetooth</div>
            <div className="font-display font-extrabold text-[30px] tracking-[-.02em] text-ink mt-0.5">Кликер</div>
          </div>
          <div className="w-[38px] h-[38px] rounded-full bg-accent/[.12] flex items-center justify-center text-accent font-bold text-[17px]">✶</div>
        </div>

        {/* connected device */}
        <div className="relative border border-accent/[.28] rounded-[22px] p-[22px] mb-[22px] overflow-hidden" style={{ background: "linear-gradient(180deg,rgba(22,25,21,0),#121412)" }}>
          <div className="absolute top-[18px] right-5 flex items-center gap-[7px]">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse2" />
            <span className="font-mono font-semibold text-[11px] tracking-[.1em] uppercase text-accent">Подключён</span>
          </div>
          <div className="flex items-center gap-5">
            <div className="w-[78px] h-[104px] rounded-[22px] bg-surface3 border-[1.5px] border-white/[.12] flex flex-col items-center justify-center gap-3 shrink-0">
              <div className="w-[38px] h-[38px] rounded-full bg-accent animate-ring" />
              <div className="w-[38px] h-[38px] rounded-full bg-[#1b1e1b] border border-white/[.12]" />
            </div>
            <div>
              <div className="font-display font-bold text-[19px] text-ink">Padel Clicker P1</div>
              <div className="font-display font-medium text-[13px] text-muted mt-[3px]">2 кнопки · BLE</div>
              <div className="flex items-center gap-2 mt-[14px]">
                <div className="w-[46px] h-4 rounded-[5px] border-[1.5px] border-accent p-0.5 flex"><div className="bg-accent rounded-[2px]" style={{ width: `${battery}%` }} /></div>
                <span className="font-mono font-semibold text-[13px] text-accent">{battery}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* button mode */}
        <div className="font-mono font-semibold text-[11px] tracking-[.14em] uppercase text-muted2 mb-3">Назначение кнопок</div>
        <div className="flex flex-col gap-2.5 mb-[22px]">
          <ModeRow active={buttonMode === "two"} onClick={() => setMode("two")} title="2 кнопки — раздельно" subtitle="Лево → очко A · Право → очко B" />
          <button onClick={() => setMode("one")} className={`flex items-start gap-[14px] bg-surface2 rounded-2xl px-4 py-[15px] border text-left ${buttonMode === "one" ? "border-accent/30" : "border-white/[.06]"}`}>
            <div className={`w-[22px] h-[22px] rounded-full border-2 mt-0.5 flex items-center justify-center ${buttonMode === "one" ? "border-accent" : "border-[#43473f]"}`}>
              {buttonMode === "one" && <div className="w-[11px] h-[11px] rounded-full bg-accent" />}
            </div>
            <div className="flex-1">
              <div className="font-display font-semibold text-[15px] text-ink3">1 кнопка — по нажатиям</div>
              <div className="flex flex-col gap-[5px] mt-2">
                <Hint badge="1×" text="очко подающей команде" />
                <Hint badge="2×" text="очко другой команде" />
                <Hint badge="⏷" text="долгое — отменить последнее" />
              </div>
            </div>
          </button>
        </div>

        {/* holder */}
        <button
          onClick={() => match && setHolder({ team: holder.team === 0 ? 1 : 0, player: 0 })}
          className="w-full flex items-center justify-between bg-surface2 border border-white/[.06] rounded-2xl px-4 py-[14px] mb-[22px]">
          <div className="flex items-center gap-[11px]">
            <div className="w-[34px] h-[34px] rounded-full bg-[#1b1e1b] border-[1.5px] border-accent flex items-center justify-center font-display font-bold text-[14px] text-accent">{holderName.charAt(0)}</div>
            <div className="text-left">
              <div className="font-mono font-medium text-[11px] text-muted2 uppercase tracking-[.1em]">У кого кликер</div>
              <div className="font-display font-semibold text-[15px] text-ink mt-px">{holderName}</div>
            </div>
          </div>
          <span className="font-display font-medium text-[13px] text-muted3">сменить</span>
        </button>

        {/* test */}
        <button
          onClick={() => setLastEvent("ЛЕВАЯ · +1 команде A")}
          className="w-full border border-dashed border-accent/35 rounded-2xl p-4 text-center">
          <div className="font-display font-semibold text-[14px] text-ink3">Нажмите кнопку для проверки</div>
          <div className="font-mono font-medium text-[12px] text-accent mt-1.5">последнее: {lastEvent ?? "—"}</div>
        </button>
      </div>
    </div>
  );
}

function ModeRow({ active, onClick, title, subtitle }: { active: boolean; onClick: () => void; title: string; subtitle: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-[14px] bg-surface2 rounded-2xl px-4 py-[15px] border text-left ${active ? "border-accent/30" : "border-white/[.06]"}`}>
      <div className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center ${active ? "border-accent" : "border-[#43473f]"}`}>
        {active && <div className="w-[11px] h-[11px] rounded-full bg-accent" />}
      </div>
      <div className="flex-1">
        <div className="font-display font-semibold text-[15px] text-ink2">{title}</div>
        <div className="font-display font-medium text-[13px] text-muted mt-px">{subtitle}</div>
      </div>
    </button>
  );
}

function Hint({ badge, text }: { badge: string; text: string }) {
  return (
    <div className="flex items-center gap-[9px]">
      <span className="font-mono font-semibold text-[11px] text-bg bg-[#9a9f97] rounded-[5px] px-[7px] py-0.5 shrink-0">{badge}</span>
      <span className="font-display font-medium text-[13px] text-muted">{text}</span>
    </div>
  );
}

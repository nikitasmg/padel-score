"use client";
export function ScoreButtons({ onA, onB, onUndo, battery }: { onA: () => void; onB: () => void; onUndo: () => void; battery: number }) {
  return (
    <div className="mt-auto pb-4">
      <div className="flex gap-3 mb-3">
        <button onClick={onA} className="flex-1 h-[84px] rounded-[20px] bg-accent flex flex-col items-center justify-center" style={{ boxShadow: "0 12px 28px -10px rgba(198,242,78,.5)" }}>
          <span className="font-display font-extrabold text-[22px] text-bg">+ Очко</span>
          <span className="font-mono font-bold text-[12px] mt-0.5" style={{ color: "rgba(10,11,10,.65)" }}>КОМАНДА A</span>
        </button>
        <button onClick={onB} className="flex-1 h-[84px] rounded-[20px] border-[1.5px] border-white/[.14] flex flex-col items-center justify-center">
          <span className="font-display font-extrabold text-[22px] text-ink">+ Очко</span>
          <span className="font-mono font-bold text-[12px] text-muted mt-0.5">КОМАНДА B</span>
        </button>
      </div>
      <div className="flex items-center justify-between">
        <button onClick={onUndo} className="flex items-center gap-2 font-display font-semibold text-[13px] text-[#9a9f97]"><span className="text-[16px]">↶</span> Отменить</button>
        <div className="flex items-center gap-2 bg-accent/10 border border-accent/25 rounded-[20px] px-[14px] py-[7px]">
          <div className="w-[7px] h-[7px] rounded-full bg-accent animate-pulse2" />
          <span className="font-mono font-semibold text-[12px] text-accent">Кликер · {battery}%</span>
        </div>
      </div>
    </div>
  );
}

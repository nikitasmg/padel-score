"use client";

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={String(o)}
            type="button"
            onClick={() => onChange(o)}
            className={`w-[38px] h-[34px] rounded-[10px] flex items-center justify-center font-display font-bold text-[15px] ${
              active
                ? "bg-accent text-bg"
                : "bg-surface3 text-[#6f746d] border border-white/[.06]"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

"use client";
import { Switch } from "@/components/ui/switch";

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      className={`flex-1 flex items-center justify-between bg-surface2 rounded-2xl px-4 py-[14px] border cursor-pointer ${
        checked ? "border-accent/30" : "border-white/[.06]"
      }`}
    >
      <span className="font-display font-semibold text-[14px] text-ink3">
        {label}
      </span>
      {/* Switch uses Base UI data-checked/data-unchecked attributes, not data-[state=*] */}
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="data-checked:bg-accent data-unchecked:bg-[#2a2d28]"
      />
    </label>
  );
}

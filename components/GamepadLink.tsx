"use client";
import { useRouter } from "next/navigation";
import { Gamepad2 } from "lucide-react";

export function GamepadLink({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      aria-label="Экран геймпада"
      onClick={() => router.push("/clicker")}
      className={`w-[38px] h-[38px] rounded-full border border-white/10 flex items-center justify-center text-[#9a9f97] active:scale-95 transition-transform ${className ?? ""}`}
    >
      <Gamepad2 size={19} />
    </button>
  );
}

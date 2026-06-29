"use client";
import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useVoiceSetting } from "@/lib/voice/useVoiceSetting";
import { isSpeechSupported, speak, warmUp, checkRussianVoice } from "@/lib/voice/speak";

/**
 * Контрол озвучки на экране матча: тумблер вкл/выкл и проверка русского голоса.
 * Само озвучивание делает VoiceAnnouncer — здесь только UI и разблокировка синтеза.
 */
export function VoiceControl() {
  const [enabled, setEnabled] = useVoiceSetting();
  const [voiceFound, setVoiceFound] = useState<boolean | null>(null);
  const [warmed, setWarmed] = useState(false);

  if (!isSpeechSupported()) return null;

  const toggle = () => {
    warmUp(); // разблокировка синтеза тем же жестом (iOS)
    setWarmed(true);
    setEnabled(!enabled);
  };

  const test = () => {
    warmUp();
    setWarmed(true);
    checkRussianVoice((found) => setVoiceFound(found));
    speak("Проверка озвучки, гейм за командой один");
  };

  const unlock = () => {
    warmUp();
    setWarmed(true);
  };

  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={enabled}
        className={`flex items-center gap-2 font-mono font-semibold text-[12px] ${enabled ? "text-accent" : "text-muted3"}`}
      >
        {enabled ? <Volume2 className="w-[14px] h-[14px]" /> : <VolumeX className="w-[14px] h-[14px]" />}
        Озвучка
      </button>

      <div className="flex items-center gap-3">
        {enabled && !warmed && (
          <button
            type="button"
            onClick={unlock}
            className="flex items-center gap-2 rounded-full bg-accent px-3 py-1 font-mono text-[12px] font-bold text-black"
          >
            <Volume2 className="h-[13px] w-[13px]" /> Включить звук
          </button>
        )}
        <button
          type="button"
          onClick={test}
          className="font-mono text-[11px] text-muted3 underline underline-offset-2"
        >
          Проверить голос
        </button>
        {voiceFound === false && (
          <span className="font-mono text-[11px] text-live">нет русского голоса</span>
        )}
      </div>
    </div>
  );
}

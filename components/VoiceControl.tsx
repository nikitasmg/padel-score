"use client";
import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { MatchState } from "@/lib/padel/types";
import { useVoiceSetting } from "@/lib/voice/useVoiceSetting";
import { useVoiceAnnouncements } from "@/lib/voice/useVoiceAnnouncements";
import { isSpeechSupported, speak, warmUp, checkRussianVoice } from "@/lib/voice/speak";

/**
 * Угловой контрол озвучки на трансляции: тумблер вкл/выкл и проверка русского голоса.
 * stopPropagation обязателен — корень /broadcast по клику уходит на /match.
 */
export function VoiceControl({ match }: { match: MatchState }) {
  const [enabled, setEnabled] = useVoiceSetting();
  const [voiceFound, setVoiceFound] = useState<boolean | null>(null);
  const [warmed, setWarmed] = useState(false);
  useVoiceAnnouncements(match, enabled);

  if (!isSpeechSupported()) return null;

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    warmUp(); // разблокировка синтеза тем же жестом (iOS)
    setWarmed(true);
    setEnabled(!enabled);
  };

  const test = (e: React.MouseEvent) => {
    e.stopPropagation();
    warmUp();
    setWarmed(true);
    checkRussianVoice((found) => setVoiceFound(found));
    speak("Проверка озвучки, гейм за командой один");
  };

  const unlock = (e: React.MouseEvent) => {
    e.stopPropagation();
    warmUp();
    setWarmed(true);
  };

  return (
    <div className="absolute bottom-5 right-10 flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
      {enabled && !warmed && (
        <button
          type="button"
          onClick={unlock}
          className="flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 font-mono text-[12px] font-bold text-black"
        >
          <Volume2 className="h-[14px] w-[14px]" /> Включить звук
        </button>
      )}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={enabled}
        className={`flex items-center gap-2 font-mono font-semibold text-[12px] ${enabled ? "text-accent" : "text-muted3"}`}
      >
        {enabled ? <Volume2 className="w-[14px] h-[14px]" /> : <VolumeX className="w-[14px] h-[14px]" />}
        Озвучка
      </button>
      <button
        type="button"
        onClick={test}
        className="font-mono text-[11px] text-muted3 underline underline-offset-2"
      >
        Проверить голос
      </button>
      {voiceFound === false && (
        <span className="font-mono text-[11px] text-live">русский голос недоступен</span>
      )}
    </div>
  );
}

"use client";
import type { MatchState } from "@/lib/padel/types";
import { useVoiceSetting } from "@/lib/voice/useVoiceSetting";
import { useVoiceAnnouncements } from "@/lib/voice/useVoiceAnnouncements";

/**
 * Безголовый озвучиватель: проигрывает голосовые объявления по событиям счёта,
 * если озвучка включена. UI нет — поэтому его можно держать на трансляции,
 * где любой тап уводит на /match. Управление вкл/выкл — в VoiceControl на /match.
 */
export function VoiceAnnouncer({ match }: { match: MatchState }) {
  const [enabled] = useVoiceSetting();
  useVoiceAnnouncements(match, enabled);
  return null;
}

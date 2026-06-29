import type { ScoreEvent } from "@/lib/padel/scoreEvents";
import type { MatchState, TeamIndex } from "@/lib/padel/types";
import { pointLabel } from "@/lib/padel/format";

function teamLabel(match: MatchState, t: TeamIndex): string {
  const names = match.teams[t].players.map((p) => p.name.trim()).filter(Boolean);
  if (names.length === 0) return `команда ${t + 1}`;
  return names.join(" и ");
}

/**
 * Фраза по обычному очку (без выигрыша гейма): новый счёт забившей команды + имена.
 * В равной концовке гейма — теннисные «ровно» (40-40) и «больше» (преимущество).
 */
function pointPhrase(event: ScoreEvent, match: MatchState): string | null {
  const t = event.pointWonBy;
  if (t === undefined) return null;
  const other: TeamIndex = t === 0 ? 1 : 0;

  // Тай-брейк: очки — просто числа, «ровно»/«больше» не применяются.
  if (match.inTiebreak) {
    return `${match.score[t].points}, ${teamLabel(match, t)}`;
  }

  const p = match.score[t].points;
  const o = match.score[other].points;
  if (p >= 3 && o >= 3) {
    if (p === o) return "Ровно";
    if (p > o) return `Больше, ${teamLabel(match, t)}`;
  }
  return `${pointLabel(match, t)}, ${teamLabel(match, t)}`;
}

/**
 * Список фраз для произнесения по событию счёта. Приоритет: матч > сет > гейм > очко;
 * смена сторон — отдельно.
 */
export function announcements(event: ScoreEvent, match: MatchState): string[] {
  if (event.matchWon) {
    const t = (match.winner ?? event.setWonBy ?? event.gameWonBy) as TeamIndex | undefined;
    return t === undefined ? [] : [`Матч! ${teamLabel(match, t)} побеждают`];
  }

  const out: string[] = [];
  if (event.setWonBy !== undefined) out.push(`Сет, ${teamLabel(match, event.setWonBy)}`);
  else if (event.gameWonBy !== undefined) out.push(`Гейм, ${teamLabel(match, event.gameWonBy)}`);
  else {
    const pp = pointPhrase(event, match);
    if (pp) out.push(pp);
  }
  if (event.endsChanged) out.push("Смена сторон");
  return out;
}

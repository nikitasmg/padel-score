import type { ScoreEvent } from "@/lib/padel/scoreEvents";
import type { MatchState, TeamIndex } from "@/lib/padel/types";

function teamLabel(match: MatchState, t: TeamIndex): string {
  const names = match.teams[t].players.map((p) => p.name.trim()).filter(Boolean);
  if (names.length === 0) return `команда ${t + 1}`;
  return names.join(" и ");
}

/** Список фраз для произнесения по событию счёта. Приоритет: матч > сет > гейм; смена сторон — отдельно. */
export function announcements(event: ScoreEvent, match: MatchState): string[] {
  if (event.matchWon) {
    const t = (match.winner ?? event.setWonBy ?? event.gameWonBy) as TeamIndex | undefined;
    return t === undefined ? [] : [`Матч! ${teamLabel(match, t)} побеждают`];
  }

  const out: string[] = [];
  if (event.setWonBy !== undefined) out.push(`Сет, ${teamLabel(match, event.setWonBy)}`);
  else if (event.gameWonBy !== undefined) out.push(`Гейм, ${teamLabel(match, event.gameWonBy)}`);
  if (event.endsChanged) out.push("Смена сторон");
  return out;
}

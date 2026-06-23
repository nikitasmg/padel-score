import type { MatchState } from "@/lib/padel/types";
import { courtPositions } from "@/lib/padel/serve";

const X = { left: 40, right: 306 };
const Y = { top: 46, bottom: 110 };

export function CourtDiagram({ match }: { match: MatchState }) {
  const positions = courtPositions(match);
  return (
    <svg viewBox="0 0 346 150" className="w-full block">
      <rect x="1" y="1" width="344" height="148" rx="8" fill="#0c0d0c" stroke="rgba(255,255,255,.12)" strokeWidth="1.5" />
      <line x1="173" y1="4" x2="173" y2="146" stroke="#c6f24e" strokeWidth="1.5" strokeDasharray="4 5" opacity=".7" />
      <line x1="64" y1="4" x2="64" y2="146" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
      <line x1="282" y1="4" x2="282" y2="146" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
      <line x1="64" y1="75" x2="282" y2="75" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
      {positions.map((p) => {
        const cx = X[p.x]; const cy = Y[p.y];
        const teamColor = p.team === 0 ? "#c6f24e" : "#cfd3cb";
        const label = match.teams[p.team].players[p.player].name.charAt(0).toUpperCase();
        return (
          <g key={`${p.team}-${p.player}`}>
            {p.isServer
              ? <>
                  <circle cx={cx} cy={cy} r="13" fill="#c6f24e" />
                  <circle cx={cx} cy={cy} r="20" fill="none" stroke="#c6f24e" strokeWidth="1.5" opacity=".4" />
                </>
              : <circle cx={cx} cy={cy} r="11" fill="#1b1e1b" stroke={teamColor} strokeWidth="1.5" />}
            <text x={cx} y={cy + 4} textAnchor="middle" fontFamily="Archivo" fontSize="10" fontWeight="700" fill={p.isServer ? "#0a0b0a" : teamColor}>{label}</text>
          </g>
        );
      })}
    </svg>
  );
}

import type { MatchState } from "@/lib/padel/types";
import { courtPositions, serveOrigin, serveTarget } from "@/lib/padel/serve";

const X = { left: 40, right: 306 };
const Y = { top: 46, bottom: 110 };
// границы квадранта для подсветки (между боковыми линиями 64/282, центром 173, серединой 75)
const BOX_X = { left: [64, 173], right: [173, 282] } as const;
const BOX_Y = { top: [4, 75], bottom: [75, 146] } as const;

export function CourtDiagram({ match }: { match: MatchState }) {
  const positions = courtPositions(match);
  // Подача идёт от квадрата стороны deuce/ad (меняется каждое очко), а не от
  // фиксированной позиции игрока — поэтому диагональ перекидывается.
  const origin = serveOrigin(match.serving.team, match.serving.side);
  const target = serveTarget(origin);
  const tBox = { x: BOX_X[target.x], y: BOX_Y[target.y] };

  return (
    <svg viewBox="0 0 346 150" className="w-full block">
      <rect x="1" y="1" width="344" height="148" rx="8" fill="#0c0d0c" stroke="rgba(255,255,255,.12)" strokeWidth="1.5" />
      <rect
        x={tBox.x[0]}
        y={tBox.y[0]}
        width={tBox.x[1] - tBox.x[0]}
        height={tBox.y[1] - tBox.y[0]}
        fill="#c6f24e"
        opacity=".10"
      />
      <line x1="173" y1="4" x2="173" y2="146" stroke="#c6f24e" strokeWidth="1.5" strokeDasharray="4 5" opacity=".7" />
      <line x1="64" y1="4" x2="64" y2="146" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
      <line x1="282" y1="4" x2="282" y2="146" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
      <line x1="64" y1="75" x2="282" y2="75" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
      <line
        x1={X[origin.x]}
        y1={Y[origin.y]}
        x2={X[target.x]}
        y2={Y[target.y]}
        stroke="#c6f24e"
        strokeWidth="1.5"
        strokeDasharray="2 4"
        opacity=".75"
      />
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
            <text x={cx} y={cy + 4} textAnchor="middle" className="font-display" fontSize="10" fontWeight="700" fill={p.isServer ? "#0a0b0a" : teamColor}>{label || "·"}</text>
          </g>
        );
      })}
    </svg>
  );
}

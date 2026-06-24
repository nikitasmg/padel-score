import type { MatchState } from "@/lib/padel/types";
import { serveOrigin, serveTarget } from "@/lib/padel/serve";

const X = { left: 22, right: 116 };
const Y = { top: 18, bottom: 50 };

export function ServeMiniCourt({ match }: { match: MatchState }) {
  const origin = serveOrigin(match.serving.team, match.serving.side);
  const target = serveTarget(origin);
  return (
    <svg viewBox="0 0 138 68" className="w-[138px] h-[68px] block">
      <rect x="1" y="1" width="136" height="66" rx="6" fill="#0c0d0c" stroke="rgba(255,255,255,.14)" strokeWidth="1" />
      <line x1="69" y1="3" x2="69" y2="65" stroke="#c6f24e" strokeWidth="1" strokeDasharray="3 4" opacity=".7" />
      <line
        x1={X[origin.x]} y1={Y[origin.y]}
        x2={X[target.x]} y2={Y[target.y]}
        stroke="#c6f24e" strokeWidth="1.2" strokeDasharray="2 3" opacity=".8"
      />
      <circle cx={X[origin.x]} cy={Y[origin.y]} r="6" fill="#c6f24e" />
      <circle cx={X[target.x]} cy={Y[target.y]} r="5" fill="none" stroke="#c6f24e" strokeWidth="1.2" opacity=".6" />
    </svg>
  );
}

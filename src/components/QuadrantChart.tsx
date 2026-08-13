'use client';

import { PRIORITY_MODEL, THEMES } from '@/data/seed';

export interface QuadPoint {
  id: string; title: string; x: number; y: number; size: number; themeId: string; band: string | null;
}

/**
 * Business value (x) against urgency if deferred (y). Bubble size is the weighted
 * composite score; colour encodes investment theme. Thresholds at 3.5 on both axes.
 */
export function QuadrantChart({
  points, unplotted, onSelect,
}: { points: QuadPoint[]; unplotted: number; onSelect: (id: string) => void }) {
  const W = 640, H = 460, P = 52;
  const sx = (v: number) => P + ((v - 1) / 4) * (W - P * 2);
  const sy = (v: number) => H - P - ((v - 1) / 4) * (H - P * 2);
  const tx = sx(PRIORITY_MODEL.quadrantThresholdX);
  const ty = sy(PRIORITY_MODEL.quadrantThresholdY);
  const colour = (themeId: string) => THEMES.find((t) => t.id === themeId)?.colour ?? '#404040';

  const labels = [
    { t: PRIORITY_MODEL.quadrantLabels.actNow, x: W - P - 8, y: P + 16, anchor: 'end' as const },
    { t: PRIORITY_MODEL.quadrantLabels.defend, x: P + 8, y: P + 16, anchor: 'start' as const },
    { t: PRIORITY_MODEL.quadrantLabels.planFund, x: W - P - 8, y: H - P - 8, anchor: 'end' as const },
    { t: PRIORITY_MODEL.quadrantLabels.sequenceLater, x: P + 8, y: H - P - 8, anchor: 'start' as const },
  ];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto max-h-[520px]" role="img" aria-label="Opportunity landscape">
        <rect x={tx} y={P} width={W - P - tx} height={ty - P} fill="#44B0B1" opacity="0.06" />
        <line x1={tx} y1={P} x2={tx} y2={H - P} stroke="#44B0B1" strokeWidth="1" strokeDasharray="4 3" />
        <line x1={P} y1={ty} x2={W - P} y2={ty} stroke="#44B0B1" strokeWidth="1" strokeDasharray="4 3" />
        <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="#D6D6D6" strokeWidth="1" />
        <line x1={P} y1={P} x2={P} y2={H - P} stroke="#D6D6D6" strokeWidth="1" />

        {[1, 2, 3, 4, 5].map((v) => (
          <g key={`gx${v}`}>
            <text x={sx(v)} y={H - P + 16} fontSize="9" fill="#9A9A9A" textAnchor="middle">{v}</text>
            <text x={P - 8} y={sy(v) + 3} fontSize="9" fill="#9A9A9A" textAnchor="end">{v}</text>
          </g>
        ))}

        {labels.map((l) => (
          <text key={l.t} x={l.x} y={l.y} fontSize="10" fill="#09375F" fontWeight="500" textAnchor={l.anchor} opacity="0.75">
            {l.t}
          </text>
        ))}

        <text x={W / 2} y={H - 12} fontSize="10" fill="#404040" textAnchor="middle">
          Business value  (revenue impact + strategic alignment) / 2
        </text>
        <text x={14} y={H / 2} fontSize="10" fill="#404040" textAnchor="middle" transform={`rotate(-90 14 ${H / 2})`}>
          Urgency if deferred
        </text>

        {points.map((p) => {
          const jx = ((p.id.charCodeAt(4) % 5) - 2) * 3;
          const jy = ((p.id.charCodeAt(5) % 5) - 2) * 3;
          return (
            <g key={p.id} className="cursor-pointer" onClick={() => onSelect(p.id)}>
              <circle
                cx={sx(p.x) + jx} cy={sy(p.y) + jy} r={5 + p.size * 2.4}
                fill={colour(p.themeId)} fillOpacity="0.5" stroke={colour(p.themeId)} strokeWidth="1.5"
              />
              <title>{p.title} — {p.band ?? 'unscored'} · value {p.x.toFixed(2)} · urgency {p.y}</title>
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 px-1">
        {THEMES.map((t) => (
          <span key={t.id} className="inline-flex items-center gap-1.5 text-2xs text-onyx">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.colour }} />
            {t.name}
          </span>
        ))}
        <span className="ml-auto text-2xs text-onyx-60">
          Bubble size = weighted score · {points.length} plotted
          {unplotted > 0 && <span className="text-onyx"> · {unplotted} unplotted (not yet scored)</span>}
        </span>
      </div>
    </div>
  );
}

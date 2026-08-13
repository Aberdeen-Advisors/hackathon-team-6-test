'use client';

import React, { useRef, useState } from 'react';
import { THEMES, ROADMAP } from '@/data/seed';
import { periodToIndex, indexToPeriod } from '@/lib/calc';
import type { Conflict } from '@/lib/calc';

export interface TimelineItem {
  initiativeId: string; name: string; themeId: string; startPeriod: string;
  durationQuarters: number | null; waveId: string; band: string | null; owner?: string;
}

export interface TimelineDep {
  id: string; upstreamId: string; downstreamId: string; type: string; validated: boolean;
}

const HARD = ['hard_prerequisite', 'unblocks'];

export function RoadmapTimeline({
  items, deps, conflicts, editable, onMove, onSelect, showDeps = true,
}: {
  items: TimelineItem[]; deps: TimelineDep[]; conflicts: Conflict[];
  editable: boolean;
  onMove?: (initiativeId: string, startPeriod: string) => void;
  onSelect?: (initiativeId: string) => void;
  showDeps?: boolean;
}) {
  const N = ROADMAP.horizonQuarters;
  const COL = 78, LANE_H = 46, HEAD = 56, LABEL_W = 168;
  const W = LABEL_W + COL * N;

  const lanes = THEMES.filter((t) => items.some((i) => i.themeId === t.id));
  const rowIndex = new Map<string, number>();
  let r = 0;
  const laneRows: { theme: (typeof THEMES)[number]; rows: TimelineItem[] }[] = [];
  for (const t of lanes) {
    const its = items.filter((i) => i.themeId === t.id);
    laneRows.push({ theme: t, rows: its });
    for (const it of its) rowIndex.set(it.initiativeId, r++);
  }
  const H = HEAD + r * LANE_H + 18;

  const [drag, setDrag] = useState<{ id: string; startX: number; origIdx: number; delta: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const errorIds = new Set(conflicts.filter((c) => c.severity === 'error').map((c) => c.itemId));
  const warnIds = new Set(conflicts.filter((c) => c.severity === 'warning').map((c) => c.itemId));

  function onPointerDown(e: React.PointerEvent, it: TimelineItem) {
    if (!editable) { onSelect?.(it.initiativeId); return; }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ id: it.initiativeId, startX: e.clientX, origIdx: periodToIndex(it.startPeriod, ROADMAP.startPeriod), delta: 0 });
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    setDrag({ ...drag, delta: Math.round((e.clientX - drag.startX) / COL) });
  }
  function onPointerUp() {
    if (!drag) return;
    const next = Math.max(0, Math.min(N - 1, drag.origIdx + drag.delta));
    if (next !== drag.origIdx && onMove) onMove(drag.id, indexToPeriod(next, ROADMAP.startPeriod));
    else if (drag.delta === 0) onSelect?.(drag.id);
    setDrag(null);
  }

  const xOf = (it: TimelineItem) => {
    const base = periodToIndex(it.startPeriod, ROADMAP.startPeriod);
    const d = drag?.id === it.initiativeId ? drag.delta : 0;
    return LABEL_W + Math.max(0, Math.min(N - 1, base + d)) * COL;
  };
  const wOf = (it: TimelineItem) => Math.max(1, it.durationQuarters ?? 1) * COL - 8;
  const yOf = (it: TimelineItem) => HEAD + (rowIndex.get(it.initiativeId) ?? 0) * LANE_H + 8;

  return (
    <div ref={ref} className="overflow-x-auto" onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      <svg width={W} height={H} className="select-none" style={{ minWidth: '100%' }}>
        {/* wave bands */}
        {ROADMAP.waves.map((w) => {
          const s = periodToIndex(w.startPeriod, ROADMAP.startPeriod);
          const e = periodToIndex(w.endPeriod, ROADMAP.startPeriod);
          return (
            <g key={w.id}>
              <rect x={LABEL_W + s * COL} y={0} width={(e - s + 1) * COL} height={H} fill="#09375F" opacity={w.id === 'W1' ? 0.05 : w.id === 'W2' ? 0.03 : 0.015} />
              <text x={LABEL_W + s * COL + 8} y={16} fontSize="10" fontWeight="500" fill="#09375F">{w.label}</text>
              <text x={LABEL_W + s * COL + 8} y={29} fontSize="8.5" fill="#6B6B6B">
                {w.targetOutcome.length > 62 ? w.targetOutcome.slice(0, 62) + '…' : w.targetOutcome}
              </text>
            </g>
          );
        })}

        {/* quarter grid */}
        {Array.from({ length: N }).map((_, i) => (
          <g key={i}>
            <line x1={LABEL_W + i * COL} y1={HEAD - 16} x2={LABEL_W + i * COL} y2={H} stroke="#EDEDED" strokeWidth="1" />
            <text x={LABEL_W + i * COL + 6} y={HEAD - 5} fontSize="9" fill="#9A9A9A">
              {indexToPeriod(i, ROADMAP.startPeriod)}
            </text>
          </g>
        ))}

        {/* lane labels */}
        {laneRows.map(({ theme, rows }) => {
          const first = rowIndex.get(rows[0].initiativeId) ?? 0;
          return (
            <g key={theme.id}>
              <rect x={0} y={HEAD + first * LANE_H} width={4} height={rows.length * LANE_H - 6} fill={theme.colour} rx={2} />
              <text x={12} y={HEAD + first * LANE_H + 14} fontSize="10" fontWeight="500" fill="#09375F">{theme.name}</text>
            </g>
          );
        })}
        {items.map((it) => (
          <text key={`l-${it.initiativeId}`} x={16} y={yOf(it) + 20} fontSize="9.5" fill="#404040">
            {it.name.length > 24 ? it.name.slice(0, 24) + '…' : it.name}
          </text>
        ))}

        {/* dependency arrows */}
        {showDeps && deps.map((d) => {
          const up = items.find((i) => i.initiativeId === d.upstreamId);
          const dn = items.find((i) => i.initiativeId === d.downstreamId);
          if (!up || !dn) return null;
          const x1 = xOf(up) + wOf(up), y1 = yOf(up) + 15;
          const x2 = xOf(dn), y2 = yOf(dn) + 15;
          const violated = errorIds.has(d.downstreamId) && HARD.includes(d.type) && d.validated;
          const stroke = violated ? '#DB504A' : d.validated ? '#09375F' : '#9A9A9A';
          const mx = (x1 + x2) / 2;
          return (
            <g key={d.id} opacity={violated ? 0.95 : 0.42}>
              <path d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} fill="none" stroke={stroke}
                strokeWidth={violated ? 1.8 : 1.2} strokeDasharray={HARD.includes(d.type) && d.validated ? '0' : '4 3'} />
              <circle cx={x2} cy={y2} r={2.6} fill={stroke} />
            </g>
          );
        })}

        {/* item bars */}
        {items.map((it) => {
          const err = errorIds.has(it.initiativeId);
          const warn = !err && warnIds.has(it.initiativeId);
          const theme = THEMES.find((t) => t.id === it.themeId);
          const dragging = drag?.id === it.initiativeId;
          return (
            <g key={it.initiativeId} className="rm-bar" onPointerDown={(e) => onPointerDown(e, it)} style={{ cursor: editable ? 'grab' : 'pointer' }}>
              <rect
                x={xOf(it)} y={yOf(it)} width={wOf(it)} height={30} rx={3}
                fill={theme?.colour ?? '#404040'} fillOpacity={dragging ? 0.5 : 0.22}
                stroke={err ? '#DB504A' : warn ? '#F7D002' : (theme?.colour ?? '#404040')}
                strokeWidth={err ? 2 : 1.3}
              />
              <text x={xOf(it) + 8} y={yOf(it) + 19} fontSize="10" fill="#09375F" fontWeight="500">
                {it.name.length > Math.floor(wOf(it) / 6.2) ? it.name.slice(0, Math.floor(wOf(it) / 6.2)) + '…' : it.name}
              </text>
              {err && <circle cx={xOf(it) + wOf(it) - 8} cy={yOf(it) + 8} r={4} fill="#DB504A" />}
              {warn && <circle cx={xOf(it) + wOf(it) - 8} cy={yOf(it) + 8} r={4} fill="#F7D002" />}
              {it.durationQuarters === null && (
                <text x={xOf(it) + 8} y={yOf(it) + 28} fontSize="8" fill="#DB504A">not sized</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

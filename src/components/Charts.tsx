'use client';

/**
 * Executive chart primitives — hand-rolled SVG, Aberdeen palette.
 * Category colour always accompanies a label or numeral; colour never carries meaning alone.
 */

import React from 'react';
import { money } from '@/lib/calc/financials';

export const CHART = { skyblue: '#5CC8FF', jasper: '#DB504A', jade: '#00A676', gold: '#F7D002', aberdeen: '#09375F', verdigris: '#44B0B1' };

export function NoData({ label, detail }: { label: string; detail?: string }) {
  return (
    <div className="h-full min-h-[160px] grid place-items-center text-center px-6 py-8 border border-dashed border-onyx-20 rounded">
      <div>
        <p className="text-[13px] font-medium text-aberdeen">{label}</p>
        {detail && <p className="text-2xs text-onyx-60 mt-1 max-w-xs leading-relaxed">{detail}</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ grouped bars */

export function GroupedBars({
  groups, series, height = 220, format = money,
}: {
  groups: string[];
  series: { label: string; colour: string; values: (number | null)[] }[];
  height?: number;
  format?: (v: number | null) => string;
}) {
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const max = Math.max(1, ...all);
  const W = 640, P = { l: 56, r: 12, t: 12, b: 34 };
  const innerW = W - P.l - P.r, innerH = height - P.t - P.b;
  const gw = innerW / Math.max(1, groups.length);
  const bw = Math.min(28, (gw - 10) / series.length);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full h-auto">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={P.l} y1={P.t + innerH * (1 - t)} x2={W - P.r} y2={P.t + innerH * (1 - t)} stroke="#EDEDED" />
            <text x={P.l - 6} y={P.t + innerH * (1 - t) + 3} fontSize="8.5" fill="#9A9A9A" textAnchor="end">
              {format(max * t)}
            </text>
          </g>
        ))}
        {groups.map((g, gi) => (
          <g key={g}>
            {series.map((s, si) => {
              const v = s.values[gi];
              if (v === null || v === undefined) return null;
              const h = (v / max) * innerH;
              const x = P.l + gi * gw + (gw - bw * series.length) / 2 + si * bw;
              return (
                <rect key={s.label} x={x} y={P.t + innerH - h} width={bw - 3} height={Math.max(0, h)} fill={s.colour} rx={1.5}>
                  <title>{`${g} · ${s.label}: ${format(v)}`}</title>
                </rect>
              );
            })}
            <text x={P.l + gi * gw + gw / 2} y={height - 12} fontSize="9" fill="#404040" textAnchor="middle">{g}</text>
          </g>
        ))}
        <line x1={P.l} y1={P.t + innerH} x2={W - P.r} y2={P.t + innerH} stroke="#D6D6D6" />
      </svg>
      <Legend items={series.map((s) => ({ label: s.label, colour: s.colour }))} />
    </div>
  );
}

/* ---------------------------------------------------------- horizontal bars */

export function HBars({
  rows, height = 200, format = money,
}: { rows: { label: string; value: number | null; colour: string; note?: string }[]; height?: number; format?: (v: number | null) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value ?? 0));
  return (
    <div className="space-y-2" style={{ minHeight: height }}>
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <span className="text-xs text-onyx truncate">{r.label}</span>
            <span className={`text-xs tabular-nums shrink-0 ${r.value === null ? 'text-onyx-40' : 'text-aberdeen font-medium'}`}>
              {format(r.value)}
            </span>
          </div>
          <div className="h-2.5 rounded-sm bg-onyx-10 overflow-hidden">
            {r.value !== null && (
              <div className="h-full rounded-sm" style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%`, background: r.colour }} />
            )}
          </div>
          {r.note && <div className="text-2xs text-onyx-40 mt-0.5">{r.note}</div>}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- line/area */

export function CumulativeCurve({
  labels, cost, benefit, height = 240,
}: { labels: string[]; cost: number[]; benefit: number[]; height?: number }) {
  const max = Math.max(1, ...cost, ...benefit);
  const W = 640, P = { l: 60, r: 14, t: 14, b: 30 };
  const innerW = W - P.l - P.r, innerH = height - P.t - P.b;
  const x = (i: number) => P.l + (i / Math.max(1, labels.length - 1)) * innerW;
  const y = (v: number) => P.t + innerH - (v / max) * innerH;
  const path = (arr: number[]) => arr.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');

  // Where cumulative benefit overtakes cumulative cost.
  let cross = -1;
  for (let i = 1; i < cost.length; i++) if (benefit[i] >= cost[i] && benefit[i - 1] < cost[i - 1]) { cross = i; break; }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full h-auto">
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={P.l} y1={y(max * t)} x2={W - P.r} y2={y(max * t)} stroke="#EDEDED" />
            <text x={P.l - 6} y={y(max * t) + 3} fontSize="8.5" fill="#9A9A9A" textAnchor="end">{money(max * t)}</text>
          </g>
        ))}
        <path d={`${path(cost)} L ${x(cost.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`} fill={CHART.jasper} opacity="0.10" />
        <path d={`${path(benefit)} L ${x(benefit.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`} fill={CHART.jade} opacity="0.10" />
        <path d={path(cost)} fill="none" stroke={CHART.jasper} strokeWidth="2" />
        <path d={path(benefit)} fill="none" stroke={CHART.jade} strokeWidth="2" />
        {cross > 0 && (
          <g>
            <line x1={x(cross)} y1={P.t} x2={x(cross)} y2={P.t + innerH} stroke={CHART.aberdeen} strokeDasharray="3 3" strokeWidth="1" />
            <text x={x(cross) + 5} y={P.t + 10} fontSize="8.5" fill="#09375F">benefit overtakes cost</text>
          </g>
        )}
        {labels.map((l, i) => i % Math.ceil(labels.length / 8) === 0 && (
          <text key={l} x={x(i)} y={height - 10} fontSize="8.5" fill="#404040" textAnchor="middle">{l}</text>
        ))}
        <line x1={P.l} y1={P.t + innerH} x2={W - P.r} y2={P.t + innerH} stroke="#D6D6D6" />
      </svg>
      <Legend items={[{ label: 'Cumulative investment', colour: CHART.jasper }, { label: 'Cumulative benefit', colour: CHART.jade }]} />
    </div>
  );
}

/* -------------------------------------------------------------- range chart */

export function RangeBars({ rows }: { rows: { label: string; low: number | null; base: number | null; high: number | null }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.high ?? 0));
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <span className="text-xs text-onyx truncate">{r.label}</span>
            <span className="text-2xs tabular-nums text-onyx-60 shrink-0">
              {r.low === null ? 'Not yet estimated' : `${money(r.low)} – ${money(r.high)}`}
            </span>
          </div>
          <div className="relative h-4 rounded-sm bg-onyx-5">
            {r.low !== null && r.high !== null && r.base !== null && (
              <>
                <div className="absolute top-1 h-2 rounded-sm bg-skyblue/40"
                  style={{ left: `${(r.low / max) * 100}%`, width: `${((r.high - r.low) / max) * 100}%` }} />
                <div className="absolute top-0 h-4 w-0.5 bg-aberdeen" style={{ left: `${(r.base / max) * 100}%` }}>
                  <span className="sr-only">base {money(r.base)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      ))}
      <Legend items={[{ label: 'Low to high range', colour: CHART.skyblue }, { label: 'Base estimate', colour: CHART.aberdeen }]} />
    </div>
  );
}

/* ------------------------------------------------------------------ donut */

export function Donut({ segments, centreLabel, centreValue }: {
  segments: { label: string; value: number; colour: string }[];
  centreLabel: string; centreValue: string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const R = 54, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 140 140" className="w-32 h-32 shrink-0">
        <g transform="translate(70,70) rotate(-90)">
          <circle r={R} fill="none" stroke="#EDEDED" strokeWidth="16" />
          {segments.map((s) => {
            const len = (s.value / total) * C;
            const el = <circle key={s.label} r={R} fill="none" stroke={s.colour} strokeWidth="16"
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />;
            offset += len;
            return el;
          })}
        </g>
        <text x="70" y="66" textAnchor="middle" fontSize="17" fill="#09375F" fontWeight="300">{centreValue}</text>
        <text x="70" y="82" textAnchor="middle" fontSize="7.5" fill="#9A9A9A">{centreLabel}</text>
      </svg>
      <ul className="space-y-1.5 min-w-0">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: s.colour }} />
            <span className="text-onyx truncate">{s.label}</span>
            <span className="text-onyx-60 tabular-nums ml-auto shrink-0">{money(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------- scatter */

export function CostValueScatter({ points }: {
  points: { id: string; label: string; cost: number; value: number; colour: string }[];
}) {
  const W = 640, H = 300, P = { l: 62, r: 16, t: 16, b: 40 };
  const maxC = Math.max(1, ...points.map((p) => p.cost));
  const maxV = Math.max(1, ...points.map((p) => p.value));
  const x = (v: number) => P.l + (v / maxC) * (W - P.l - P.r);
  const y = (v: number) => H - P.b - (v / maxV) * (H - P.t - P.b);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={P.l} y1={y(maxV * t)} x2={W - P.r} y2={y(maxV * t)} stroke="#EDEDED" />
            <text x={P.l - 6} y={y(maxV * t) + 3} fontSize="8.5" fill="#9A9A9A" textAnchor="end">{money(maxV * t)}</text>
          </g>
        ))}
        <line x1={P.l} y1={y(0)} x2={x(maxC)} y2={y(maxV)} stroke={CHART.verdigris} strokeDasharray="4 3" strokeWidth="1" />
        <text x={x(maxC) - 4} y={y(maxV) + 12} fontSize="8" fill="#2E8384" textAnchor="end">value = cost</text>
        {points.map((p) => (
          <g key={p.id}>
            <circle cx={x(p.cost)} cy={y(p.value)} r="7" fill={p.colour} fillOpacity="0.55" stroke={p.colour} strokeWidth="1.4">
              <title>{`${p.label}\ninvestment ${money(p.cost)} · annual value ${money(p.value)}`}</title>
            </circle>
          </g>
        ))}
        <text x={(W) / 2} y={H - 10} fontSize="9" fill="#404040" textAnchor="middle">Total investment</text>
        <text x={14} y={H / 2} fontSize="9" fill="#404040" textAnchor="middle" transform={`rotate(-90 14 ${H / 2})`}>Annual value</text>
        <line x1={P.l} y1={H - P.b} x2={W - P.r} y2={H - P.b} stroke="#D6D6D6" />
        <line x1={P.l} y1={P.t} x2={P.l} y2={H - P.b} stroke="#D6D6D6" />
      </svg>
      <p className="text-2xs text-onyx-60 mt-1">
        Points above the dashed line return more annual value than they cost to build.
      </p>
    </div>
  );
}

function Legend({ items }: { items: { label: string; colour: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5 text-2xs text-onyx">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.colour }} />{i.label}
        </span>
      ))}
    </div>
  );
}

/**
 * Conductor — deterministic calculation engine.
 *
 * PURE FUNCTIONS ONLY. No React, no store, no I/O, no AI.
 * Every function returns { value, inputs, formulaString, formulaWithValues } so the
 * interface can explain itself without re-deriving anything.
 *
 * Design rule that matters most (PRD section 15, CALC-02):
 * if ANY contributing input is missing, the result is null — never a partial sum.
 * A spreadsheet treats a blank as zero and silently produces a confidently wrong
 * priority band. This engine refuses to.
 */

import type { Dimension, Level } from '@/data/seed';

export interface Explained<T> {
  value: T;
  inputs: Record<string, unknown>;
  formulaString: string;
  formulaWithValues: string;
}

const ex = <T,>(value: T, inputs: Record<string, unknown>, f: string, fv: string): Explained<T> => ({
  value,
  inputs,
  formulaString: f,
  formulaWithValues: fv,
});

export type ScoreInput = { dimensionKey: string; level: Level | null };

/* ------------------------------------------------------------------ CALC-02 */

export function weightedScore(scores: ScoreInput[], dimensions: Dimension[]): Explained<number | null> {
  const parts = dimensions.map((d) => {
    const s = scores.find((x) => x.dimensionKey === d.key);
    return { key: d.key, weight: d.weight, level: s?.level ?? null };
  });

  const missing = parts.filter((p) => p.level === null);
  const formula = dimensions.map((d) => `(D_${d.key} x ${d.weight})`).join(' + ');

  if (missing.length > 0) {
    return ex(
      null,
      { parts, missing: missing.map((m) => m.key) },
      formula,
      `Not yet scored — ${parts.length - missing.length} of ${parts.length} dimensions complete`,
    );
  }

  const total = parts.reduce((acc, p) => acc + (p.level as number) * p.weight, 0);
  return ex(
    total,
    { parts },
    formula,
    `${parts.map((p) => `(${p.level} x ${p.weight})`).join(' + ')} = ${round2(total)}`,
  );
}

/* ------------------------------------------------------------------ CALC-03 */

export interface Bands {
  critical: number;
  high: number;
  medium: number;
}
export interface BandLabels {
  critical: string;
  high: string;
  medium: string;
  lower: string;
}

export function priorityBand(
  score: number | null,
  bands: Bands,
  labels: BandLabels,
): Explained<string | null> {
  const formula = `>= ${bands.critical} ${labels.critical} | >= ${bands.high} ${labels.high} | >= ${bands.medium} ${labels.medium} | else ${labels.lower}`;
  if (score === null) return ex(null, { score }, formula, 'Not yet scored');

  // Banding uses the UNROUNDED score. Rounding first would move items across the
  // 3.75 and 4.50 thresholds incorrectly.
  const label =
    score >= bands.critical
      ? labels.critical
      : score >= bands.high
        ? labels.high
        : score >= bands.medium
          ? labels.medium
          : labels.lower;

  const threshold =
    score >= bands.critical
      ? `>= ${bands.critical}`
      : score >= bands.high
        ? `>= ${bands.high}`
        : score >= bands.medium
          ? `>= ${bands.medium}`
          : `< ${bands.medium}`;

  return ex(label, { score, bands }, formula, `${round2(score)} ${threshold} → ${label}`);
}

/* ------------------------------------------------------------------ CALC-04 */

export interface QuadrantModel {
  valueAxisKeys: readonly string[];
  urgencyAxisKey: string;
  quadrantThresholdX: number;
  quadrantThresholdY: number;
  quadrantLabels: { actNow: string; defend: string; planFund: string; sequenceLater: string };
}

export interface QuadrantResult {
  x: number | null;
  y: number | null;
  size: number | null;
  quadrant: string | null;
}

export function quadrant(
  scores: ScoreInput[],
  model: QuadrantModel,
  score: number | null,
): Explained<QuadrantResult> {
  const lv = (k: string) => scores.find((s) => s.dimensionKey === k)?.level ?? null;
  const valueLevels = model.valueAxisKeys.map(lv);
  const y = lv(model.urgencyAxisKey);

  const formula = `x = mean(${model.valueAxisKeys.join(', ')}) ; y = ${model.urgencyAxisKey} ; threshold ${model.quadrantThresholdX} / ${model.quadrantThresholdY}`;

  if (valueLevels.some((v) => v === null) || y === null) {
    return ex(
      { x: null, y: null, size: null, quadrant: null },
      { valueLevels, y },
      formula,
      'Not yet scored — cannot be plotted',
    );
  }

  const x = (valueLevels as number[]).reduce((a, b) => a + b, 0) / valueLevels.length;
  const L = model.quadrantLabels;
  const q =
    x >= model.quadrantThresholdX && y >= model.quadrantThresholdY
      ? L.actNow
      : x < model.quadrantThresholdX && y >= model.quadrantThresholdY
        ? L.defend
        : x >= model.quadrantThresholdX && y < model.quadrantThresholdY
          ? L.planFund
          : L.sequenceLater;

  return ex(
    { x, y, size: score, quadrant: q },
    { x, y },
    formula,
    `x = ${round2(x)} ; y = ${y} → ${q}`,
  );
}

/* ------------------------------------------------------------------ CALC-01 */

export function maturityGap(current: number | null, target: number | null): Explained<number | null> {
  const formula = 'gap = target − current';
  if (current === null || target === null) return ex(null, { current, target }, formula, 'Target not set');
  const gap = target - current;
  return ex(gap, { current, target }, formula, `${target} − ${current} = ${gap}`);
}

export function maturityLabel(
  level: number | null,
  levels: { level: number; label: string }[],
): string | null {
  if (level === null) return null;
  return levels.find((l) => l.level === level)?.label ?? null;
}

/* ------------------------------------------------------------------ CALC-05 */

export interface EffortSize {
  key: string;
  minMonths: number;
  maxMonths: number;
  effort: string;
  risk: string;
}

export function durationQuarters(
  sizeKey: string | null,
  scale: readonly EffortSize[],
): Explained<number | null> {
  const formula = 'ceil( ((minMonths + maxMonths) / 2) / 3 )';
  if (!sizeKey) return ex(null, { sizeKey }, formula, 'Effort not sized');
  const s = scale.find((e) => e.key === sizeKey);
  if (!s) return ex(null, { sizeKey }, formula, 'Effort not sized');
  const mid = (s.minMonths + s.maxMonths) / 2;
  const q = Math.ceil(mid / 3);
  return ex(q, { sizeKey, mid }, formula, `ceil( ((${s.minMonths} + ${s.maxMonths}) / 2) / 3 ) = ${q} quarters`);
}

/* ------------------------------------------------------ periods (quarters) */

export function periodToIndex(period: string, start: string): number {
  const [py, pq] = period.split('-Q').map(Number);
  const [sy, sq] = start.split('-Q').map(Number);
  return (py - sy) * 4 + (pq - sq);
}

export function indexToPeriod(index: number, start: string): string {
  const [sy, sq] = start.split('-Q').map(Number);
  const total = (sy * 4 + (sq - 1)) + index;
  const y = Math.floor(total / 4);
  const q = (total % 4) + 1;
  return `${y}-Q${q}`;
}

/* ------------------------------------------------------------------ CALC-06 */

export interface SchedItem {
  initiativeId: string;
  startPeriod: string;
  durationQuarters: number | null;
}
export interface Dep {
  id: string;
  upstreamId: string;
  downstreamId: string;
  type: string;
  validated: boolean;
}

const HARD_TYPES = ['hard_prerequisite', 'unblocks'];

export interface EarliestStartResult {
  earliest: Record<string, number>;
  cycle: string[] | null;
}

/**
 * Only VALIDATED hard prerequisites constrain scheduling. Sequencing preferences,
 * resource contention and collision risk are advisory — treating them as hard
 * constraints would over-constrain the roadmap (PRD section 19.2).
 */
export function earliestStart(
  items: SchedItem[],
  deps: Dep[],
  startPeriod: string,
): Explained<EarliestStartResult> {
  const hard = deps.filter((d) => d.validated && HARD_TYPES.includes(d.type));
  const byId = new Map(items.map((i) => [i.initiativeId, i]));

  const adj = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const i of items) {
    adj.set(i.initiativeId, []);
    indeg.set(i.initiativeId, 0);
  }
  for (const d of hard) {
    if (!byId.has(d.upstreamId) || !byId.has(d.downstreamId)) continue;
    adj.get(d.upstreamId)!.push(d.downstreamId);
    indeg.set(d.downstreamId, (indeg.get(d.downstreamId) ?? 0) + 1);
  }

  const queue = [...indeg.entries()].filter(([, v]) => v === 0).map(([k]) => k);
  const order: string[] = [];
  const deg = new Map(indeg);
  while (queue.length) {
    const n = queue.shift()!;
    order.push(n);
    for (const m of adj.get(n) ?? []) {
      deg.set(m, (deg.get(m) ?? 0) - 1);
      if (deg.get(m) === 0) queue.push(m);
    }
  }

  const formula = 'earliestStart(i) = max( roadmapStart, max over hard upstream u of ( end(u) + 1 ) )';

  if (order.length !== items.length) {
    const cycle = items.map((i) => i.initiativeId).filter((id) => !order.includes(id));
    return ex({ earliest: {}, cycle }, { hard: hard.length }, formula, `Cycle detected: ${cycle.join(' → ')}`);
  }

  const earliest: Record<string, number> = {};
  for (const id of order) earliest[id] = 0;
  for (const id of order) {
    const upstreams = hard.filter((d) => d.downstreamId === id);
    let e = 0;
    for (const u of upstreams) {
      const ui = byId.get(u.upstreamId);
      if (!ui) continue;
      const uStart = Math.max(periodToIndex(ui.startPeriod, startPeriod), earliest[u.upstreamId] ?? 0);
      const uDur = ui.durationQuarters ?? 1;
      e = Math.max(e, uStart + uDur);
    }
    earliest[id] = e;
  }

  return ex({ earliest, cycle: null }, { hard: hard.length }, formula, `${order.length} initiatives scheduled`);
}

/* ------------------------------------------------------------------ CALC-08 */

export type Severity = 'error' | 'warning' | 'info';
export interface Conflict {
  code: string;
  severity: Severity;
  itemId: string;
  message: string;
}

export function detectConflicts(
  items: SchedItem[],
  deps: Dep[],
  startPeriod: string,
  names: Record<string, string>,
  scoredComplete: Record<string, boolean>,
): Conflict[] {
  const out: Conflict[] = [];
  const byId = new Map(items.map((i) => [i.initiativeId, i]));
  const nm = (id: string) => names[id] ?? id;

  for (const d of deps) {
    if (!d.validated) continue;
    const up = byId.get(d.upstreamId);
    const down = byId.get(d.downstreamId);
    if (!up || !down) continue;
    const upEnd = periodToIndex(up.startPeriod, startPeriod) + (up.durationQuarters ?? 1);
    const downStart = periodToIndex(down.startPeriod, startPeriod);

    if (HARD_TYPES.includes(d.type)) {
      if (downStart < upEnd) {
        out.push({
          code: 'DEP_VIOLATION',
          severity: 'error',
          itemId: d.downstreamId,
          message: `${nm(d.downstreamId)} starts in ${down.startPeriod}, before its prerequisite ${nm(d.upstreamId)} completes in ${indexToPeriod(upEnd - 1, startPeriod)}.`,
        });
      }
    } else if (d.type === 'sequencing_preference') {
      if (downStart < upEnd) {
        out.push({
          code: 'SOFT_DEP_WARNING',
          severity: 'warning',
          itemId: d.downstreamId,
          message: `Preferred sequence not honoured: ${nm(d.upstreamId)} would ideally precede ${nm(d.downstreamId)}.`,
        });
      }
    } else {
      const downEnd = downStart + (down.durationQuarters ?? 1);
      const upStart = periodToIndex(up.startPeriod, startPeriod);
      if (downStart < upEnd && upStart < downEnd) {
        out.push({
          code: d.type === 'collision_risk' ? 'COLLISION' : 'CONTENTION',
          severity: 'warning',
          itemId: d.downstreamId,
          message: `${nm(d.upstreamId)} and ${nm(d.downstreamId)} overlap in time (${d.type.replace(/_/g, ' ')}).`,
        });
      }
    }
  }

  for (const i of items) {
    if (i.durationQuarters === null) {
      out.push({ code: 'UNSIZED', severity: 'info', itemId: i.initiativeId, message: `${nm(i.initiativeId)} has no effort size and cannot be scheduled.` });
    }
    if (scoredComplete[i.initiativeId] === false) {
      out.push({ code: 'UNSCORED', severity: 'info', itemId: i.initiativeId, message: `${nm(i.initiativeId)} has opportunities that are not fully scored.` });
    }
  }
  return out;
}

/* ------------------------------------------------------------- rollup / rank */

export interface Rollup {
  value: number | null;
  scored: number;
  total: number;
}

export function initiativeRollup(scores: (number | null)[]): Explained<Rollup> {
  const total = scores.length;
  const present = scores.filter((s): s is number => s !== null);
  const formula = 'mean of scored child opportunity weighted scores';
  if (present.length === 0) {
    return ex({ value: null, scored: 0, total }, { total }, formula, `Not yet scored — 0 of ${total} scored`);
  }
  const value = present.reduce((a, b) => a + b, 0) / present.length;
  return ex(
    { value, scored: present.length, total },
    { present },
    formula,
    `${round2(value)} — average of ${present.length} of ${total} scored`,
  );
}

export function denseRank(entries: { id: string; score: number | null }[]): Record<string, number | null> {
  const scored = entries.filter((e) => e.score !== null).sort((a, b) => (b.score as number) - (a.score as number));
  const out: Record<string, number | null> = {};
  for (const e of entries) out[e.id] = null;
  let rank = 0;
  let prev: number | null = null;
  for (const e of scored) {
    if (prev === null || (e.score as number) < prev) rank += 1;
    out[e.id] = rank;
    prev = e.score as number;
  }
  return out;
}

export const round2 = (n: number): string => (Math.round(n * 100) / 100).toFixed(2);

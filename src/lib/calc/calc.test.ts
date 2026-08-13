import { describe, it, expect } from 'vitest';
import {
  weightedScore, priorityBand, quadrant, maturityGap, durationQuarters,
  earliestStart, detectConflicts, initiativeRollup, denseRank, periodToIndex, indexToPeriod,
} from './index';
import { DIMENSIONS, PRIORITY_MODEL, EFFORT_SCALE } from '@/data/seed';

const S = (a: number | null, b: number | null, c: number | null) => [
  { dimensionKey: 'financial_impact', level: a as never },
  { dimensionKey: 'risk_if_deferred', level: b as never },
  { dimensionKey: 'strategic_alignment', level: c as never },
];
const bands = PRIORITY_MODEL.bands;
const labels = PRIORITY_MODEL.bandLabels;
const band = (a: number, b: number, c: number) =>
  priorityBand(weightedScore(S(a, b, c), DIMENSIONS).value, bands, labels).value;

describe('CALC-02 weighted score', () => {
  it('computes the weighted sum', () => {
    expect(weightedScore(S(5, 4, 5), DIMENSIONS).value).toBeCloseTo(4.65, 10);
    expect(weightedScore(S(1, 1, 1), DIMENSIONS).value).toBeCloseTo(1.0, 10);
    expect(weightedScore(S(5, 5, 5), DIMENSIONS).value).toBeCloseTo(5.0, 10);
  });

  it('returns NULL when any dimension is missing — never a partial sum', () => {
    expect(weightedScore(S(4, null, 3), DIMENSIONS).value).toBeNull();
    expect(weightedScore(S(null, null, null), DIMENSIONS).value).toBeNull();
  });

  it('explains the missing state with a denominator', () => {
    expect(weightedScore(S(4, null, 3), DIMENSIONS).formulaWithValues)
      .toBe('Not yet scored — 2 of 3 dimensions complete');
  });

  it('weights sum to exactly 1.0', () => {
    const sum = DIMENSIONS.reduce((a, d) => a + d.weight, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-9);
  });
});

describe('CALC-03 band boundaries', () => {
  it('bands exactly 4.50 as Critical', () => {
    // 5 / 4 / 4 = 2.0 + 1.4 + 1.0 = 4.40 ; 5 / 5 / 3 = 2.0 + 1.75 + 0.75 = 4.50
    expect(weightedScore(S(5, 5, 3), DIMENSIONS).value).toBeCloseTo(4.5, 10);
    expect(band(5, 5, 3)).toBe('Critical');
  });

  it('bands exactly 3.75 as High Priority', () => {
    // 4 / 4 / 3 = 1.6 + 1.4 + 0.75 = 3.75
    expect(weightedScore(S(4, 4, 3), DIMENSIONS).value).toBeCloseTo(3.75, 10);
    expect(band(4, 4, 3)).toBe('High Priority');
  });

  it('bands exactly 2.80 as Medium Priority', () => {
    // 2 / 4 / 2 = 0.8 + 1.4 + 0.5 = 2.70 ; 3 / 3 / 2 = 1.2 + 1.05 + 0.5 = 2.75
    // 2 / 3 / 4 = 0.8 + 1.05 + 1.0 = 2.85 ; use direct threshold check instead:
    expect(priorityBand(2.8, bands, labels).value).toBe('Medium Priority');
    expect(priorityBand(2.79, bands, labels).value).toBe('Lower Priority');
  });

  it('bands from the UNROUNDED score — 3.749 displays as 3.75 but bands Medium', () => {
    expect(priorityBand(3.749, bands, labels).value).toBe('Medium Priority');
    expect(priorityBand(3.75, bands, labels).value).toBe('High Priority');
  });

  it('returns null for an unscored item', () => {
    expect(priorityBand(null, bands, labels).value).toBeNull();
  });
});

describe('CALC-04 quadrant', () => {
  const q = (a: number, b: number, c: number) =>
    quadrant(S(a, b, c), PRIORITY_MODEL as never, weightedScore(S(a, b, c), DIMENSIONS).value).value;

  it('places all four quadrants', () => {
    expect(q(5, 4, 5).quadrant).toBe('Act Now');
    expect(q(2, 5, 3).quadrant).toBe('Defend');
    expect(q(5, 2, 4).quadrant).toBe('Plan & Fund');
    expect(q(2, 2, 2).quadrant).toBe('Sequence Later');
  });

  it('treats exactly 3.5 on each axis as inclusive', () => {
    // x = (4 + 3) / 2 = 3.5 ; y = 4 → Act Now
    expect(q(4, 4, 3).quadrant).toBe('Act Now');
    // x = (4 + 3) / 2 = 3.5 ; y = 3 → Plan & Fund
    expect(q(4, 3, 3).quadrant).toBe('Plan & Fund');
  });

  it('cannot plot an unscored item', () => {
    const r = quadrant(S(4, null, 3), PRIORITY_MODEL as never, null).value;
    expect(r.quadrant).toBeNull();
    expect(r.x).toBeNull();
  });
});

describe('CALC-01 maturity gap', () => {
  it('computes target − current', () => {
    expect(maturityGap(1, 3).value).toBe(2);
    expect(maturityGap(2, 2).value).toBe(0);
  });
  it('permits a negative gap (exceeds target)', () => {
    expect(maturityGap(4, 3).value).toBe(-1);
  });
  it('returns null when the target is unset', () => {
    expect(maturityGap(2, null).value).toBeNull();
  });
});

describe('CALC-05 duration', () => {
  it('uses the midpoint of the month range, rounded up', () => {
    expect(durationQuarters('XS', EFFORT_SCALE).value).toBe(1);  // (1+3)/2 = 2 → 1q
    expect(durationQuarters('M', EFFORT_SCALE).value).toBe(3);   // (6+12)/2 = 9 → 3q
    expect(durationQuarters('XL', EFFORT_SCALE).value).toBe(10); // (24+36)/2 = 30 → 10q
  });
  it('returns null when unsized', () => {
    expect(durationQuarters(null, EFFORT_SCALE).value).toBeNull();
  });
});

describe('periods', () => {
  it('round-trips', () => {
    expect(periodToIndex('2027-Q1', '2027-Q1')).toBe(0);
    expect(periodToIndex('2028-Q1', '2027-Q1')).toBe(4);
    expect(indexToPeriod(5, '2027-Q1')).toBe('2028-Q2');
  });
});

describe('CALC-06 scheduling', () => {
  const items = [
    { initiativeId: 'A', startPeriod: '2027-Q1', durationQuarters: 2 },
    { initiativeId: 'B', startPeriod: '2027-Q1', durationQuarters: 2 },
  ];

  it('constrains on validated hard prerequisites', () => {
    const deps = [{ id: 'd1', upstreamId: 'A', downstreamId: 'B', type: 'hard_prerequisite', validated: true }];
    expect(earliestStart(items, deps, '2027-Q1').value.earliest.B).toBe(2);
  });

  it('does NOT constrain on advisory dependency types', () => {
    const deps = [{ id: 'd1', upstreamId: 'A', downstreamId: 'B', type: 'sequencing_preference', validated: true }];
    expect(earliestStart(items, deps, '2027-Q1').value.earliest.B).toBe(0);
  });

  it('ignores unvalidated dependencies', () => {
    const deps = [{ id: 'd1', upstreamId: 'A', downstreamId: 'B', type: 'hard_prerequisite', validated: false }];
    expect(earliestStart(items, deps, '2027-Q1').value.earliest.B).toBe(0);
  });

  it('detects a cycle and refuses to schedule', () => {
    const deps = [
      { id: 'd1', upstreamId: 'A', downstreamId: 'B', type: 'hard_prerequisite', validated: true },
      { id: 'd2', upstreamId: 'B', downstreamId: 'A', type: 'hard_prerequisite', validated: true },
    ];
    const r = earliestStart(items, deps, '2027-Q1').value;
    expect(r.cycle).not.toBeNull();
    expect(r.cycle).toContain('A');
  });
});

describe('CALC-08 conflicts', () => {
  const items = [
    { initiativeId: 'A', startPeriod: '2027-Q3', durationQuarters: 2 },
    { initiativeId: 'B', startPeriod: '2027-Q1', durationQuarters: 2 },
  ];
  const names = { A: 'Alpha', B: 'Beta' };

  it('raises an ERROR for a hard prerequisite violation', () => {
    const deps = [{ id: 'd', upstreamId: 'A', downstreamId: 'B', type: 'hard_prerequisite', validated: true }];
    const c = detectConflicts(items, deps, '2027-Q1', names, {});
    expect(c.find((x) => x.code === 'DEP_VIOLATION')?.severity).toBe('error');
  });

  it('raises only a WARNING for a sequencing preference', () => {
    const deps = [{ id: 'd', upstreamId: 'A', downstreamId: 'B', type: 'sequencing_preference', validated: true }];
    const c = detectConflicts(items, deps, '2027-Q1', names, {});
    expect(c.find((x) => x.code === 'DEP_VIOLATION')).toBeUndefined();
    expect(c.find((x) => x.code === 'SOFT_DEP_WARNING')?.severity).toBe('warning');
  });

  it('flags unsized items', () => {
    const c = detectConflicts([{ initiativeId: 'A', startPeriod: '2027-Q1', durationQuarters: null }], [], '2027-Q1', names, {});
    expect(c.find((x) => x.code === 'UNSIZED')).toBeTruthy();
  });
});

describe('rollup and rank', () => {
  it('averages only scored children and reports the denominator', () => {
    const r = initiativeRollup([4.0, 5.0, null, null]);
    expect(r.value.value).toBeCloseTo(4.5, 10);
    expect(r.value.scored).toBe(2);
    expect(r.value.total).toBe(4);
    expect(r.formulaWithValues).toContain('average of 2 of 4 scored');
  });

  it('returns null — never 0 — when nothing is scored', () => {
    expect(initiativeRollup([null, null]).value.value).toBeNull();
  });

  it('dense-ranks descending and shares ranks on ties', () => {
    const r = denseRank([
      { id: 'a', score: 4.5 }, { id: 'b', score: 4.5 }, { id: 'c', score: 3.0 }, { id: 'd', score: null },
    ]);
    expect(r.a).toBe(1);
    expect(r.b).toBe(1);
    expect(r.c).toBe(2);
    expect(r.d).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import {
  emptyFinancials, completeness, initiativeTotals, phaseInitiative, sumSeries,
  portfolioTotals, toYears, money, type Financials,
} from './financials';

const f = (over: Partial<Financials> = {}): Financials => ({ ...emptyFinancials('INI-01'), ...over });

describe('completeness — absence is never zero', () => {
  it('reports an entirely unestimated initiative', () => {
    const c = completeness(undefined);
    expect(c.hasAnyCost).toBe(false);
    expect(c.isComplete).toBe(false);
    expect(c.missing.length).toBeGreaterThan(0);
  });
  it('names exactly what is missing', () => {
    const c = completeness(f({ oneTimeImplementation: 100 }));
    expect(c.costLinesFilled).toBe(1);
    expect(c.missing).toContain('Internal labour');
    expect(c.missing).not.toContain('One-time implementation');
  });
});

describe('initiative totals', () => {
  it('sums only the lines that exist and applies contingency', () => {
    const t = initiativeTotals(f({ oneTimeImplementation: 100_000, internalLabour: 50_000, contingencyPct: 10 }));
    expect(t.capitalBase).toBe(150_000);
    expect(t.contingency).toBe(15_000);
    expect(t.investmentBase).toBe(165_000);
  });
  it('returns null — not zero — when nothing is estimated', () => {
    const t = initiativeTotals(f());
    expect(t.investmentBase).toBeNull();
    expect(t.annualBenefit).toBeNull();
  });
  it('applies the low and high range to the base', () => {
    const t = initiativeTotals(f({ oneTimeImplementation: 100_000, rangeLowPct: -20, rangeHighPct: 30 }));
    expect(t.investmentLow).toBeCloseTo(80_000, 6);
    expect(t.investmentHigh).toBeCloseTo(130_000, 6);
  });
  it('separates internal from external spend', () => {
    const t = initiativeTotals(f({ internalLabour: 40_000, externalLabour: 60_000, technologyVendor: 25_000 }));
    expect(t.internalSpend).toBe(40_000);
    expect(t.externalSpend).toBe(85_000);
  });
});

describe('phasing is driven by the roadmap', () => {
  const fin = f({ oneTimeImplementation: 400_000, recurringOperatingAnnual: 100_000, expectedSavingsAnnual: 200_000, benefitLagQuarters: 1 });

  it('spreads capital across the delivery quarters', () => {
    const p = phaseInitiative(fin, 0, 4, 12);
    expect(p.cost[0]).toBeCloseTo(100_000 + 0, 6);
    expect(p.cost[3]).toBeCloseTo(100_000, 6);
  });

  it('starts recurring cost at go-live, not before', () => {
    const p = phaseInitiative(fin, 0, 4, 12);
    expect(p.cost[4]).toBeCloseTo(25_000, 6);   // recurring only
  });

  it('starts benefit after go-live plus the stated lag', () => {
    const p = phaseInitiative(fin, 0, 4, 12);
    expect(p.benefit[4]).toBe(0);               // lag of 1 quarter
    expect(p.benefit[5]).toBeCloseTo(50_000, 6);
  });

  it('MOVES THE MONEY when the initiative moves on the roadmap', () => {
    const early = phaseInitiative(fin, 0, 4, 12);
    const late = phaseInitiative(fin, 4, 4, 12);
    expect(early.cost[0]).toBeGreaterThan(0);
    expect(late.cost[0]).toBe(0);
    expect(late.cost[4]).toBeGreaterThan(0);
    // total capital is unchanged; only its timing differs
    const capEarly = early.cost.slice(0, 4).reduce((a, b) => a + b, 0);
    const capLate = late.cost.slice(4, 8).reduce((a, b) => a + b, 0);
    expect(capEarly).toBeCloseTo(capLate, 6);
  });

  it('produces a cumulative curve that crosses over once benefits exceed cost', () => {
    const p = phaseInitiative(f({ oneTimeImplementation: 100_000, expectedSavingsAnnual: 400_000, benefitLagQuarters: 0 }), 0, 1, 12);
    expect(p.cumulativeNet[0]).toBeLessThan(0);
    expect(p.cumulativeNet[11]).toBeGreaterThan(0);
  });

  it('contributes nothing when unestimated', () => {
    const p = phaseInitiative(undefined, 0, 4, 12);
    expect(p.cost.every((c) => c === 0)).toBe(true);
  });
});

describe('portfolio aggregation', () => {
  const fin = {
    'INI-01': f({ initiativeId: 'INI-01', oneTimeImplementation: 100_000, confidence: 'high' }),
    'INI-02': f({ initiativeId: 'INI-02', oneTimeImplementation: 200_000, confidence: 'low' }),
  } as Record<string, Financials | undefined>;

  it('sums estimated initiatives and reports coverage', () => {
    const p = portfolioTotals(['INI-01', 'INI-02', 'INI-03'], fin);
    expect(p.investmentBase).toBe(300_000);
    expect(p.coverage.estimated).toBe(2);
    expect(p.coverage.total).toBe(3);
  });

  it('marks the total as PARTIAL and names the unestimated initiatives', () => {
    const p = portfolioTotals(['INI-01', 'INI-02', 'INI-03'], fin);
    expect(p.isPartial).toBe(true);
    expect(p.unestimatedInitiativeIds).toEqual(['INI-03']);
  });

  it('never imputes a value for an unestimated initiative', () => {
    const p = portfolioTotals(['INI-03'], fin);
    expect(p.investmentBase).toBeNull();
    expect(p.coverage.estimated).toBe(0);
  });

  it('flags low-confidence estimates', () => {
    const p = portfolioTotals(['INI-01', 'INI-02'], fin);
    expect(p.lowConfidenceInitiativeIds).toEqual(['INI-02']);
  });
});

describe('presentation', () => {
  it('renders "Not yet estimated" rather than $0 for a null', () => {
    expect(money(null)).toBe('Not yet estimated');
    expect(money(0)).toBe('$0');
  });
  it('formats magnitudes compactly', () => {
    expect(money(2_400_000)).toBe('$2.40m');
    expect(money(750_000)).toBe('$750k');
  });
  it('rolls quarters into years', () => {
    const y = toYears([1, 1, 1, 1, 2, 2, 2, 2], 2027);
    expect(y).toEqual([{ year: 2027, value: 4 }, { year: 2028, value: 8 }]);
  });
  it('sums series across initiatives', () => {
    const a = phaseInitiative(f({ oneTimeImplementation: 100 }), 0, 1, 4);
    const b = phaseInitiative(f({ oneTimeImplementation: 300 }), 0, 1, 4);
    expect(sumSeries([a, b], 4).cost[0]).toBe(400);
  });
});

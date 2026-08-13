/**
 * Financial engine — PURE. No React, no store, no I/O.
 *
 * Investment and benefit phasing derive from the ROADMAP, so moving an initiative to a
 * different wave moves its money. Costs are spread across the initiative's delivery
 * quarters; recurring operating cost begins at go-live; benefits begin after go-live plus
 * a stated lag and run to the end of the planning horizon.
 *
 * Missing-data rule, enforced everywhere (PRD section 21.4): an unestimated line is null,
 * never zero. Aggregates always report their coverage, and a partial total is labelled as
 * partial. `$0` is never displayed for something that has simply not been estimated.
 */

export type Confidence = 'high' | 'medium' | 'low';
export type Basis = 'vendor_quote' | 'bottom_up' | 'analogue' | 'parametric' | 'placeholder';

export interface Financials {
  initiativeId: string;
  oneTimeImplementation: number | null;
  internalLabour: number | null;
  externalLabour: number | null;
  technologyVendor: number | null;
  recurringOperatingAnnual: number | null;
  contingencyPct: number | null;
  expectedSavingsAnnual: number | null;
  revenueOpportunityAnnual: number | null;
  costAvoidanceAnnual: number | null;
  benefitLagQuarters: number | null;
  confidence: Confidence | null;
  basis: Basis | null;
  basisNote: string;
  rangeLowPct: number;
  rangeHighPct: number;
}

export const emptyFinancials = (initiativeId: string): Financials => ({
  initiativeId,
  oneTimeImplementation: null, internalLabour: null, externalLabour: null,
  technologyVendor: null, recurringOperatingAnnual: null, contingencyPct: null,
  expectedSavingsAnnual: null, revenueOpportunityAnnual: null, costAvoidanceAnnual: null,
  benefitLagQuarters: null, confidence: null, basis: null, basisNote: '',
  rangeLowPct: -20, rangeHighPct: 30,
});

const COST_LINES = ['oneTimeImplementation', 'internalLabour', 'externalLabour', 'technologyVendor'] as const;
const BENEFIT_LINES = ['expectedSavingsAnnual', 'revenueOpportunityAnnual', 'costAvoidanceAnnual'] as const;

/* ------------------------------------------------------------ completeness */

export interface Completeness {
  hasAnyCost: boolean;
  hasAnyBenefit: boolean;
  costLinesFilled: number;
  costLinesTotal: number;
  isComplete: boolean;
  missing: string[];
}

const LABELS: Record<string, string> = {
  oneTimeImplementation: 'One-time implementation',
  internalLabour: 'Internal labour',
  externalLabour: 'External labour',
  technologyVendor: 'Technology / vendor',
  recurringOperatingAnnual: 'Recurring operating',
  contingencyPct: 'Contingency',
  expectedSavingsAnnual: 'Expected savings',
  revenueOpportunityAnnual: 'Revenue opportunity',
  costAvoidanceAnnual: 'Cost avoidance',
  confidence: 'Confidence',
  basis: 'Estimation basis',
};

export function completeness(f: Financials | undefined): Completeness {
  if (!f) {
    return {
      hasAnyCost: false, hasAnyBenefit: false, costLinesFilled: 0,
      costLinesTotal: COST_LINES.length, isComplete: false,
      missing: [...COST_LINES, ...BENEFIT_LINES, 'confidence', 'basis'].map((k) => LABELS[k]),
    };
  }
  const filled = COST_LINES.filter((k) => f[k] !== null).length;
  const missing: string[] = [];
  for (const k of COST_LINES) if (f[k] === null) missing.push(LABELS[k]);
  for (const k of BENEFIT_LINES) if (f[k] === null) missing.push(LABELS[k]);
  if (f.confidence === null) missing.push(LABELS.confidence);
  if (f.basis === null) missing.push(LABELS.basis);
  return {
    hasAnyCost: filled > 0,
    hasAnyBenefit: BENEFIT_LINES.some((k) => f[k] !== null),
    costLinesFilled: filled,
    costLinesTotal: COST_LINES.length,
    isComplete: missing.length === 0,
    missing,
  };
}

/* ------------------------------------------------------------------ totals */

export interface InitiativeTotals {
  capitalBase: number | null;
  contingency: number | null;
  investmentBase: number | null;
  investmentLow: number | null;
  investmentHigh: number | null;
  recurringAnnual: number | null;
  internalSpend: number | null;
  externalSpend: number | null;
  annualBenefit: number | null;
  benefitByType: { savings: number | null; revenue: number | null; avoidance: number | null };
}

export function initiativeTotals(f: Financials | undefined): InitiativeTotals {
  const none: InitiativeTotals = {
    capitalBase: null, contingency: null, investmentBase: null, investmentLow: null,
    investmentHigh: null, recurringAnnual: null, internalSpend: null, externalSpend: null,
    annualBenefit: null, benefitByType: { savings: null, revenue: null, avoidance: null },
  };
  if (!f) return none;

  const present = COST_LINES.filter((k) => f[k] !== null);
  const capitalBase = present.length ? present.reduce((a, k) => a + (f[k] as number), 0) : null;
  const contingency = capitalBase !== null && f.contingencyPct !== null
    ? capitalBase * (f.contingencyPct / 100) : null;
  const investmentBase = capitalBase !== null ? capitalBase + (contingency ?? 0) : null;

  const benefitsPresent = BENEFIT_LINES.filter((k) => f[k] !== null);
  const annualBenefit = benefitsPresent.length ? benefitsPresent.reduce((a, k) => a + (f[k] as number), 0) : null;

  return {
    capitalBase,
    contingency,
    investmentBase,
    investmentLow: investmentBase !== null ? investmentBase * (1 + f.rangeLowPct / 100) : null,
    investmentHigh: investmentBase !== null ? investmentBase * (1 + f.rangeHighPct / 100) : null,
    recurringAnnual: f.recurringOperatingAnnual,
    internalSpend: f.internalLabour,
    externalSpend:
      f.externalLabour !== null || f.technologyVendor !== null
        ? (f.externalLabour ?? 0) + (f.technologyVendor ?? 0)
        : null,
    annualBenefit,
    benefitByType: {
      savings: f.expectedSavingsAnnual,
      revenue: f.revenueOpportunityAnnual,
      avoidance: f.costAvoidanceAnnual,
    },
  };
}

/* ----------------------------------------------------------------- phasing */

export interface PhasedSeries {
  cost: number[];
  benefit: number[];
  net: number[];
  cumulativeCost: number[];
  cumulativeBenefit: number[];
  cumulativeNet: number[];
}

/**
 * Spread an initiative's money across the planning horizon using its roadmap position.
 * Capital is linear across the delivery quarters; recurring cost starts at go-live;
 * benefits start after go-live plus the stated lag.
 */
export function phaseInitiative(
  f: Financials | undefined,
  startQuarter: number,
  durationQuarters: number | null,
  horizonQuarters: number,
): PhasedSeries {
  const cost = new Array(horizonQuarters).fill(0);
  const benefit = new Array(horizonQuarters).fill(0);

  if (f) {
    const t = initiativeTotals(f);
    const dur = Math.max(1, durationQuarters ?? 1);
    const start = Math.max(0, Math.min(horizonQuarters - 1, startQuarter));
    const goLive = Math.min(horizonQuarters, start + dur);

    if (t.investmentBase !== null) {
      const per = t.investmentBase / dur;
      for (let q = start; q < Math.min(horizonQuarters, start + dur); q++) cost[q] += per;
    }
    if (f.recurringOperatingAnnual !== null) {
      const per = f.recurringOperatingAnnual / 4;
      for (let q = goLive; q < horizonQuarters; q++) cost[q] += per;
    }
    if (t.annualBenefit !== null) {
      const per = t.annualBenefit / 4;
      const from = Math.min(horizonQuarters, goLive + (f.benefitLagQuarters ?? 0));
      for (let q = from; q < horizonQuarters; q++) benefit[q] += per;
    }
  }

  const cumulativeCost: number[] = [];
  const cumulativeBenefit: number[] = [];
  const cumulativeNet: number[] = [];
  const net: number[] = [];
  let cc = 0, cb = 0;
  for (let q = 0; q < horizonQuarters; q++) {
    cc += cost[q]; cb += benefit[q];
    net.push(benefit[q] - cost[q]);
    cumulativeCost.push(cc); cumulativeBenefit.push(cb); cumulativeNet.push(cb - cc);
  }
  return { cost, benefit, net, cumulativeCost, cumulativeBenefit, cumulativeNet };
}

export function sumSeries(list: PhasedSeries[], horizonQuarters: number): PhasedSeries {
  const cost = new Array(horizonQuarters).fill(0);
  const benefit = new Array(horizonQuarters).fill(0);
  for (const s of list) {
    for (let q = 0; q < horizonQuarters; q++) { cost[q] += s.cost[q]; benefit[q] += s.benefit[q]; }
  }
  const cumulativeCost: number[] = [], cumulativeBenefit: number[] = [], cumulativeNet: number[] = [], net: number[] = [];
  let cc = 0, cb = 0;
  for (let q = 0; q < horizonQuarters; q++) {
    cc += cost[q]; cb += benefit[q];
    net.push(benefit[q] - cost[q]);
    cumulativeCost.push(cc); cumulativeBenefit.push(cb); cumulativeNet.push(cb - cc);
  }
  return { cost, benefit, net, cumulativeCost, cumulativeBenefit, cumulativeNet };
}

export function toYears(series: number[], startYear: number): { year: number; value: number }[] {
  const out: { year: number; value: number }[] = [];
  for (let i = 0; i < series.length; i += 4) {
    out.push({ year: startYear + i / 4, value: series.slice(i, i + 4).reduce((a, b) => a + b, 0) });
  }
  return out;
}

/* ------------------------------------------------------------- portfolio */

export interface Coverage { estimated: number; total: number; complete: number; lowConfidence: number }

export interface PortfolioTotals {
  investmentBase: number | null;
  investmentLow: number | null;
  investmentHigh: number | null;
  recurringAnnual: number | null;
  internalSpend: number | null;
  externalSpend: number | null;
  annualBenefit: number | null;
  benefitByType: { savings: number; revenue: number; avoidance: number } | null;
  coverage: Coverage;
  isPartial: boolean;
  unestimatedInitiativeIds: string[];
  lowConfidenceInitiativeIds: string[];
}

export function portfolioTotals(
  initiativeIds: string[],
  fin: Record<string, Financials | undefined>,
): PortfolioTotals {
  let investmentBase: number | null = null;
  let investmentLow: number | null = null;
  let investmentHigh: number | null = null;
  let recurringAnnual: number | null = null;
  let internalSpend: number | null = null;
  let externalSpend: number | null = null;
  let annualBenefit: number | null = null;
  const bt = { savings: 0, revenue: 0, avoidance: 0 };
  let anyBenefit = false;

  const unestimated: string[] = [];
  const lowConf: string[] = [];
  let estimated = 0, complete = 0;

  const add = (acc: number | null, v: number | null) => (v === null ? acc : (acc ?? 0) + v);

  for (const id of initiativeIds) {
    const f = fin[id];
    const c = completeness(f);
    if (!c.hasAnyCost) { unestimated.push(id); continue; }
    estimated += 1;
    if (c.isComplete) complete += 1;
    if (f?.confidence === 'low') lowConf.push(id);

    const t = initiativeTotals(f);
    investmentBase = add(investmentBase, t.investmentBase);
    investmentLow = add(investmentLow, t.investmentLow);
    investmentHigh = add(investmentHigh, t.investmentHigh);
    recurringAnnual = add(recurringAnnual, t.recurringAnnual);
    internalSpend = add(internalSpend, t.internalSpend);
    externalSpend = add(externalSpend, t.externalSpend);
    annualBenefit = add(annualBenefit, t.annualBenefit);
    if (t.benefitByType.savings !== null) { bt.savings += t.benefitByType.savings; anyBenefit = true; }
    if (t.benefitByType.revenue !== null) { bt.revenue += t.benefitByType.revenue; anyBenefit = true; }
    if (t.benefitByType.avoidance !== null) { bt.avoidance += t.benefitByType.avoidance; anyBenefit = true; }
  }

  return {
    investmentBase, investmentLow, investmentHigh, recurringAnnual,
    internalSpend, externalSpend, annualBenefit,
    benefitByType: anyBenefit ? bt : null,
    coverage: { estimated, total: initiativeIds.length, complete, lowConfidence: lowConf.length },
    isPartial: estimated > 0 && estimated < initiativeIds.length,
    unestimatedInitiativeIds: unestimated,
    lowConfidenceInitiativeIds: lowConf,
  };
}

/* ------------------------------------------------------------- formatting */

export function money(v: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (v === null || v === undefined) return 'Not yet estimated';
  const abs = Math.abs(v);
  if (opts.compact !== false) {
    if (abs >= 1_000_000) return `${v < 0 ? '−' : ''}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}m`;
    if (abs >= 1_000) return `${v < 0 ? '−' : ''}$${(abs / 1_000).toFixed(0)}k`;
  }
  return `${v < 0 ? '−' : ''}$${Math.round(abs).toLocaleString('en-US')}`;
}

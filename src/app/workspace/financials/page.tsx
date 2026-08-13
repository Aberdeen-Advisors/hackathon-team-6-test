'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useStore, useDerived } from '@/lib/store/store';
import { PageHeader } from '@/components/Shell';
import { JourneyRail } from '@/components/JourneyRail';
import {
  Card, Button, Badge, StatCard, Modal, Toast, Field, inputCls, Banner, SectionTitle, EmptyState,
} from '@/components/ui';
import { GroupedBars, HBars, CumulativeCurve, RangeBars, Donut, CostValueScatter, NoData, CHART } from '@/components/Charts';
import {
  emptyFinancials, completeness, initiativeTotals, phaseInitiative, sumSeries, portfolioTotals,
  toYears, money, type Financials, type Confidence, type Basis,
} from '@/lib/calc/financials';
import { periodToIndex, indexToPeriod } from '@/lib/calc';
import { ROADMAP, THEMES } from '@/data/seed';

const CONFIDENCE: Confidence[] = ['high', 'medium', 'low'];
const BASES: { v: Basis; label: string }[] = [
  { v: 'vendor_quote', label: 'Vendor quote' },
  { v: 'bottom_up', label: 'Bottom-up build' },
  { v: 'analogue', label: 'Analogue from comparable work' },
  { v: 'parametric', label: 'Parametric / rule of thumb' },
  { v: 'placeholder', label: 'Placeholder — not a real estimate' },
];

export default function FinancialsPage() {
  const { model, setFinancials } = useStore();
  const { initDuration, initName } = useDerived();
  const [editing, setEditing] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const H = ROADMAP.horizonQuarters;
  const startYear = Number(ROADMAP.startPeriod.split('-Q')[0]);
  const ids = model.initiatives.map((i) => i.id);

  /* Every figure below derives from the roadmap position of each initiative. */
  const perInitiative = useMemo(() => model.initiatives.map((ini) => {
    const item = model.roadmapItems.find((r) => r.initiativeId === ini.id);
    const startQ = item ? periodToIndex(item.startPeriod, ROADMAP.startPeriod) : 0;
    const f = model.financials[ini.id];
    return {
      ini, item, startQ,
      f, totals: initiativeTotals(f), complete: completeness(f),
      series: phaseInitiative(f, startQ, initDuration[ini.id] ?? null, H),
      theme: THEMES.find((t) => t.id === ini.themeId),
    };
  }), [model, initDuration, H]);

  const totals = portfolioTotals(ids, model.financials);
  const portfolio = sumSeries(perInitiative.map((p) => p.series), H);
  const costYears = toYears(portfolio.cost, startYear);
  const benefitYears = toYears(portfolio.benefit, startYear);
  const cumCostYears = costYears.map((_, i) => portfolio.cumulativeCost[(i + 1) * 4 - 1] ?? 0);
  const cumBenYears = benefitYears.map((_, i) => portfolio.cumulativeBenefit[(i + 1) * 4 - 1] ?? 0);

  const byTheme = THEMES.map((t) => {
    const themeIds = model.initiatives.filter((i) => i.themeId === t.id).map((i) => i.id);
    const p = portfolioTotals(themeIds, model.financials);
    return { label: t.name, value: p.investmentBase, colour: t.colour,
      note: p.coverage.estimated < p.coverage.total ? `${p.coverage.estimated} of ${p.coverage.total} estimated` : undefined };
  });

  const byWave = ROADMAP.waves.map((w) => {
    const waveIds = model.roadmapItems.filter((r) => r.waveId === w.id).map((r) => r.initiativeId);
    const p = portfolioTotals(waveIds, model.financials);
    return { label: w.label, value: p.investmentBase, colour: CHART.aberdeen,
      note: `${w.startPeriod}–${w.endPeriod} · ${p.coverage.estimated} of ${p.coverage.total} estimated` };
  });

  const scatter = perInitiative
    .filter((p) => p.totals.investmentBase !== null && p.totals.annualBenefit !== null)
    .map((p) => ({ id: p.ini.id, label: p.ini.name, cost: p.totals.investmentBase as number, value: p.totals.annualBenefit as number, colour: p.theme?.colour ?? '#404040' }));

  const netAnnual = totals.annualBenefit !== null && totals.recurringAnnual !== null
    ? totals.annualBenefit - totals.recurringAnnual
    : totals.annualBenefit;

  const edit = editing ? perInitiative.find((p) => p.ini.id === editing) : null;

  return (
    <div className="p-6">
      <PageHeader
        title="Investment and value"
        subtitle="Every figure here is phased from the roadmap. Move an initiative to a different wave and its investment and benefits move with it. Nothing unestimated is shown as zero."
      />
      <JourneyRail />

      {totals.coverage.estimated === 0 ? (
        <Card>
          <EmptyState
            title="No financial estimates yet"
            body={`None of the ${totals.coverage.total} initiatives has an estimate. Add one to begin building the investment profile — or accept a financial figure from an uploaded document on the Sources screen.`}
            action={<Button variant="primary" size="sm" onClick={() => setEditing(model.initiatives[0]?.id ?? null)}>Add the first estimate</Button>}
          />
        </Card>
      ) : (
        <>
          {totals.isPartial && (
            <div className="mb-5">
              <Banner tone="warn">
                <strong className="font-medium">Partial total.</strong>{' '}
                {totals.coverage.estimated} of {totals.coverage.total} initiatives are estimated. Figures below cover the
                estimated subset only and are not a portfolio total.
                {totals.unestimatedInitiativeIds.length > 0 && (
                  <span className="block text-2xs mt-1">
                    Not yet estimated: {totals.unestimatedInitiativeIds.map((id) => initName[id]).join(' · ')}
                  </span>
                )}
              </Banner>
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <StatCard label="Total investment" value={money(totals.investmentBase)}
              denominator={totals.investmentLow !== null ? `${money(totals.investmentLow)} – ${money(totals.investmentHigh)}` : undefined} />
            <StatCard label="Recurring, annual" value={money(totals.recurringAnnual)} denominator="operating cost at run state" />
            <StatCard label="Annual value" value={money(totals.annualBenefit)} denominator="savings, revenue and avoidance" />
            <StatCard label="Net annual impact" value={money(netAnnual)} denominator="value less recurring cost" />
            <StatCard label="Estimate coverage" value={`${totals.coverage.estimated}/${totals.coverage.total}`}
              denominator={`${totals.coverage.complete} fully complete · ${totals.coverage.lowConfidence} low confidence`}
              tone={totals.isPartial ? 'attention' : 'neutral'} />
          </div>

          <div className="grid lg:grid-cols-2 gap-5 mb-5">
            <Card title="Investment and benefit by year" subtitle="Phased from each initiative's position on the roadmap.">
              <GroupedBars
                groups={costYears.map((y) => String(y.year))}
                series={[
                  { label: 'Investment', colour: CHART.jasper, values: costYears.map((y) => y.value) },
                  { label: 'Benefit', colour: CHART.jade, values: benefitYears.map((y) => y.value) },
                ]}
              />
            </Card>

            <Card title="Cumulative investment against benefit" subtitle="Where the curves cross is where the portfolio turns net positive.">
              <CumulativeCurve
                labels={costYears.map((y) => String(y.year))}
                cost={cumCostYears} benefit={cumBenYears}
              />
            </Card>

            <Card title="Investment by theme">
              <HBars rows={byTheme} />
            </Card>

            <Card title="Funding required by wave" subtitle="What must be committed, and when.">
              <HBars rows={byWave} />
            </Card>

            <Card title="Cost against value" subtitle="Only initiatives with both a cost and a benefit estimate can be plotted.">
              {scatter.length === 0
                ? <NoData label="Not enough data to plot" detail="An initiative needs both an investment estimate and an annual value estimate to appear here." />
                : <CostValueScatter points={scatter} />}
            </Card>

            <Card title="Low, base and high" subtitle="Range applied per initiative from its own confidence bounds.">
              <RangeBars rows={perInitiative.filter((p) => p.totals.investmentBase !== null).map((p) => ({
                label: p.ini.name, low: p.totals.investmentLow, base: p.totals.investmentBase, high: p.totals.investmentHigh,
              }))} />
            </Card>

            <Card title="One-time against recurring">
              {totals.investmentBase === null ? <NoData label="Not yet estimated" /> : (
                <Donut
                  centreLabel="over the horizon" centreValue={money((totals.investmentBase ?? 0) + (totals.recurringAnnual ?? 0) * (H / 4))}
                  segments={[
                    { label: 'One-time investment', value: totals.investmentBase ?? 0, colour: CHART.aberdeen },
                    { label: `Recurring (${H / 4} years)`, value: (totals.recurringAnnual ?? 0) * (H / 4), colour: CHART.skyblue },
                  ]}
                />
              )}
            </Card>

            <Card title="Internal against external spend">
              {totals.internalSpend === null && totals.externalSpend === null ? <NoData label="Not yet estimated" /> : (
                <Donut
                  centreLabel="labour and vendor" centreValue={money((totals.internalSpend ?? 0) + (totals.externalSpend ?? 0))}
                  segments={[
                    { label: 'Internal labour', value: totals.internalSpend ?? 0, colour: CHART.jade },
                    { label: 'External and vendor', value: totals.externalSpend ?? 0, colour: CHART.gold },
                  ]}
                />
              )}
            </Card>

            <Card title="Expected value by type">
              {totals.benefitByType === null ? <NoData label="No benefits estimated yet" detail="Add expected savings, revenue opportunity or cost avoidance to an initiative." /> : (
                <Donut
                  centreLabel="annual value" centreValue={money(totals.annualBenefit)}
                  segments={[
                    { label: 'Expected savings', value: totals.benefitByType.savings, colour: CHART.jade },
                    { label: 'Revenue opportunity', value: totals.benefitByType.revenue, colour: CHART.skyblue },
                    { label: 'Cost avoidance', value: totals.benefitByType.avoidance, colour: CHART.gold },
                  ].filter((s) => s.value > 0)}
                />
              )}
            </Card>

            <Card title="Estimate quality" subtitle="Completeness and confidence across the portfolio.">
              <HBars format={(v) => `${v ?? 0} initiative${v === 1 ? '' : 's'}`} rows={[
                { label: 'Fully complete', value: totals.coverage.complete, colour: CHART.jade },
                { label: 'Partially estimated', value: totals.coverage.estimated - totals.coverage.complete, colour: CHART.gold },
                { label: 'Not yet estimated', value: totals.coverage.total - totals.coverage.estimated, colour: '#D6D6D6' },
                { label: 'Low confidence', value: totals.coverage.lowConfidence, colour: CHART.jasper },
              ]} />
            </Card>
          </div>
        </>
      )}

      {/* ------------------------------- per-initiative table ------------------------------- */}
      <Card flush title="Initiative estimates"
        subtitle="Enter or revise assumptions. Changes recalculate the dashboard, the portfolio totals and any published financial summary.">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-2xs uppercase tracking-wide text-onyx-60 border-b border-onyx-10">
                <th className="text-left font-medium px-5 py-2 min-w-[210px]">Initiative</th>
                <th className="text-left font-medium px-2 py-2">Wave / start</th>
                <th className="text-right font-medium px-2 py-2">Investment</th>
                <th className="text-right font-medium px-2 py-2">Recurring pa</th>
                <th className="text-right font-medium px-2 py-2">Annual value</th>
                <th className="text-center font-medium px-2 py-2">Confidence</th>
                <th className="text-left font-medium px-2 py-2">Basis</th>
                <th className="text-center font-medium px-2 py-2">Complete</th>
                <th className="px-5 py-2" />
              </tr>
            </thead>
            <tbody>
              {perInitiative.map((p) => (
                <tr key={p.ini.id} className="border-b border-onyx-10 last:border-0 hover:bg-aberdeen-50/50">
                  <td className="px-5 py-2.5">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: p.theme?.colour }} />
                      <span className="text-aberdeen font-medium">{p.ini.name}</span>
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-onyx-60 text-xs">
                    {ROADMAP.waves.find((w) => w.id === p.item?.waveId)?.label ?? '—'}
                    <span className="block text-2xs text-onyx-40">{p.item?.startPeriod ?? 'not sequenced'}</span>
                  </td>
                  <td className={`px-2 py-2.5 text-right tabular-nums ${p.totals.investmentBase === null ? 'text-onyx-40 text-xs' : 'text-aberdeen font-medium'}`}>
                    {money(p.totals.investmentBase)}
                  </td>
                  <td className={`px-2 py-2.5 text-right tabular-nums ${p.totals.recurringAnnual === null ? 'text-onyx-40 text-xs' : ''}`}>
                    {money(p.totals.recurringAnnual)}
                  </td>
                  <td className={`px-2 py-2.5 text-right tabular-nums ${p.totals.annualBenefit === null ? 'text-onyx-40 text-xs' : 'text-jade'}`}>
                    {money(p.totals.annualBenefit)}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    {p.f?.confidence
                      ? <Badge tone={p.f.confidence === 'high' ? 'ok' : p.f.confidence === 'medium' ? 'warn' : 'danger'}>{p.f.confidence}</Badge>
                      : <span className="text-2xs text-onyx-40">—</span>}
                  </td>
                  <td className="px-2 py-2.5 text-xs text-onyx-60">
                    {p.f?.basis ? BASES.find((b) => b.v === p.f?.basis)?.label : <span className="text-onyx-40">—</span>}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    {p.complete.isComplete
                      ? <Badge tone="ok">Complete</Badge>
                      : p.complete.hasAnyCost
                        ? <Badge tone="warn" >{p.complete.costLinesFilled}/{p.complete.costLinesTotal} lines</Badge>
                        : <Badge>Not estimated</Badge>}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <Button size="sm" onClick={() => setEditing(p.ini.id)}>{p.f ? 'Edit' : 'Estimate'}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {totals.unestimatedInitiativeIds.length > 0 && (
        <Card className="mt-5" title="Initiatives without an estimate"
          subtitle="These are excluded from every total above. They are not zero — they are unknown.">
          <ul className="space-y-1.5">
            {totals.unestimatedInitiativeIds.map((id) => (
              <li key={id} className="flex items-center justify-between gap-3 border-b border-onyx-10 pb-1.5 last:border-0">
                <span className="text-[13px] text-onyx">{initName[id]}</span>
                <Button size="sm" onClick={() => setEditing(id)}>Add estimate</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <EstimateModal
        entry={edit ?? null} onClose={() => setEditing(null)}
        onSave={(id, patch) => { setFinancials(id, patch); setEditing(null); setToast('Estimate saved — portfolio totals and phasing recalculated.'); }}
      />
      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

/* ------------------------------------------------------------ estimate form */

function EstimateModal({
  entry, onClose, onSave,
}: {
  entry: { ini: { id: string; name: string }; f?: Financials; item?: { startPeriod: string; waveId: string }; series: unknown } | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Financials>) => void;
}) {
  const base = entry?.f ?? (entry ? emptyFinancials(entry.ini.id) : null);
  const [d, setD] = useState<Financials | null>(null);
  const cur = d ?? base;

  if (!entry || !cur) return null;
  const set = (k: keyof Financials, v: unknown) => setD({ ...(cur as Financials), [k]: v } as Financials);
  const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(/[^0-9.-]/g, '')));

  const t = initiativeTotals(cur);
  const c = completeness(cur);

  const MONEY_FIELDS: [keyof Financials, string, string][] = [
    ['oneTimeImplementation', 'One-time implementation', 'Delivery cost that occurs once'],
    ['internalLabour', 'Internal labour', 'Your own people, at loaded cost'],
    ['externalLabour', 'External labour', 'Partners, contractors, systems integrator'],
    ['technologyVendor', 'Technology / vendor', 'Licences, subscriptions, hardware'],
    ['recurringOperatingAnnual', 'Recurring operating (annual)', 'Run cost once live'],
    ['expectedSavingsAnnual', 'Expected savings (annual)', 'Cost taken out of the business'],
    ['revenueOpportunityAnnual', 'Revenue opportunity (annual)', 'New or protected revenue'],
    ['costAvoidanceAnnual', 'Cost avoidance (annual)', 'Cost not incurred as a result'],
  ];

  return (
    <Modal open onClose={onClose} title={`Financial assumptions — ${entry.ini.name}`} width="max-w-3xl">
      <div className="max-h-[68vh] overflow-y-auto pr-1">
        {entry.item && (
          <Banner tone="accent">
            Phasing follows the roadmap: investment spreads across delivery from{' '}
            <strong className="font-medium">{entry.item.startPeriod}</strong>, and benefits begin after go-live plus the lag below.
          </Banner>
        )}

        <div className="grid sm:grid-cols-2 gap-x-4 mt-4">
          {MONEY_FIELDS.map(([k, label, hint]) => (
            <Field key={k} label={label} hint={hint}>
              <input className={inputCls} inputMode="numeric"
                value={(cur[k] as number | null) ?? ''} placeholder="Not yet estimated"
                onChange={(e) => set(k, num(e.target.value))} />
            </Field>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-x-4">
          <Field label="Contingency %" hint="Applied to the capital lines.">
            <input className={inputCls} inputMode="numeric" value={cur.contingencyPct ?? ''} placeholder="—"
              onChange={(e) => set('contingencyPct', num(e.target.value))} />
          </Field>
          <Field label="Benefit lag (quarters)" hint="After go-live, before value begins.">
            <input className={inputCls} inputMode="numeric" value={cur.benefitLagQuarters ?? ''} placeholder="—"
              onChange={(e) => set('benefitLagQuarters', num(e.target.value))} />
          </Field>
          <Field label="Confidence">
            <select className={inputCls} value={cur.confidence ?? ''} onChange={(e) => set('confidence', e.target.value || null)}>
              <option value="">Not stated</option>
              {CONFIDENCE.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-x-4">
          <Field label="Range low %" hint="Negative, e.g. −20.">
            <input className={inputCls} inputMode="numeric" value={cur.rangeLowPct}
              onChange={(e) => set('rangeLowPct', Number(e.target.value) || 0)} />
          </Field>
          <Field label="Range high %" hint="Positive, e.g. 30.">
            <input className={inputCls} inputMode="numeric" value={cur.rangeHighPct}
              onChange={(e) => set('rangeHighPct', Number(e.target.value) || 0)} />
          </Field>
        </div>

        <Field label="Estimation basis">
          <select className={inputCls} value={cur.basis ?? ''} onChange={(e) => set('basis', e.target.value || null)}>
            <option value="">Not stated</option>
            {BASES.map((b) => <option key={b.v} value={b.v}>{b.label}</option>)}
          </select>
        </Field>
        <Field label="Basis note" hint="Where the number came from. This is what makes it defensible.">
          <textarea className={inputCls} rows={2} value={cur.basisNote} onChange={(e) => set('basisNote', e.target.value)} />
        </Field>

        <div className="calc-field rounded px-4 py-3 mt-1">
          <SectionTitle>Calculated</SectionTitle>
          <dl className="grid grid-cols-2 gap-y-1 text-[13px]">
            <dt className="text-onyx-60">Capital before contingency</dt><dd className="text-right tabular-nums">{money(t.capitalBase)}</dd>
            <dt className="text-onyx-60">Contingency</dt><dd className="text-right tabular-nums">{money(t.contingency)}</dd>
            <dt className="text-onyx-60 font-medium">Total investment</dt><dd className="text-right tabular-nums font-medium text-aberdeen">{money(t.investmentBase)}</dd>
            <dt className="text-onyx-60">Range</dt>
            <dd className="text-right tabular-nums text-xs">{t.investmentLow === null ? '—' : `${money(t.investmentLow)} – ${money(t.investmentHigh)}`}</dd>
            <dt className="text-onyx-60">Annual value</dt><dd className="text-right tabular-nums text-jade">{money(t.annualBenefit)}</dd>
          </dl>
          {!c.isComplete && (
            <p className="text-2xs text-onyx-60 mt-2 pt-2 border-t border-onyx-20">
              Still missing: {c.missing.join(' · ')}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <Button size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" variant="primary" onClick={() => onSave(entry.ini.id, cur)}>Save estimate</Button>
      </div>
    </Modal>
  );
}

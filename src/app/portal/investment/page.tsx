'use client';

import { useStore } from '@/lib/store/store';
import { PageHeader } from '@/components/Shell';
import { Card, StatCard, Badge, Banner, EmptyState } from '@/components/ui';
import { GroupedBars, HBars, CHART } from '@/components/Charts';
import { money } from '@/lib/calc/financials';

export default function PortalInvestment() {
  const { currentPublication } = useStore();
  const f = currentPublication?.snapshot.financials ?? null;

  // The investment view is hidden entirely when nothing has been estimated.
  // A client must never see an empty or misleading investment page.
  if (!f) {
    return (
      <div className="p-6">
        <PageHeader title="Investment" />
        <Card>
          <EmptyState
            title="Investment not yet estimated"
            body="Aberdeen has not published an investment profile for this engagement. Cost and value estimates are developed once the roadmap sequence is agreed."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Investment and value"
        subtitle="What the roadmap costs, when it is required, and the value expected in return."
      />

      {f.isPartial && (
        <div className="mb-5">
          <Banner tone="warn">
            <strong className="font-medium">Partial estimate.</strong> {f.coverage.estimated} of {f.coverage.total} published
            initiatives have been costed. These figures cover the estimated subset only.
          </Banner>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total investment" value={money(f.investmentBase)}
          denominator={f.investmentLow !== null ? `range ${money(f.investmentLow)} – ${money(f.investmentHigh)}` : undefined} />
        <StatCard label="Expected annual value" value={money(f.annualBenefit)} denominator="savings, revenue and avoidance" />
        <StatCard label="Peak year" value={money(Math.max(...f.byYear.map((y) => y.cost)))}
          denominator={`${f.byYear.reduce((a, b) => (b.cost > a.cost ? b : a)).year}`} />
        <StatCard label="Costed initiatives" value={`${f.coverage.estimated}/${f.coverage.total}`} denominator="of the published roadmap" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Investment and value by year" subtitle="Phased from the sequence on the published roadmap.">
          <GroupedBars
            groups={f.byYear.map((y) => String(y.year))}
            series={[
              { label: 'Investment', colour: CHART.jasper, values: f.byYear.map((y) => y.cost) },
              { label: 'Expected value', colour: CHART.jade, values: f.byYear.map((y) => y.benefit) },
            ]}
          />
        </Card>

        <Card title="Funding required by wave" subtitle="What needs to be committed, and when.">
          <HBars rows={f.byWave.map((w) => ({
            label: w.label, value: w.cost, colour: CHART.aberdeen,
            note: w.cost === null ? 'No initiatives in this wave have been costed' : undefined,
          }))} />
        </Card>
      </div>

      <p className="text-2xs text-onyx-60 mt-5 leading-relaxed max-w-3xl border-l-2 border-verdigris pl-3">
        Figures are Aberdeen&rsquo;s estimates for planning purposes and carry the confidence stated at initiative level.
        They are not a quotation, and they exclude any cost already committed under existing contracts.
      </p>
    </div>
  );
}

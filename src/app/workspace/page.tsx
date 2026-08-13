'use client';

import Link from 'next/link';
import { useStore, useDerived } from '@/lib/store/store';
import { PageHeader } from '@/components/Shell';
import { JourneyRail } from '@/components/JourneyRail';
import { Card, StatCard, Badge, Button, Banner, SectionTitle } from '@/components/ui';
import { ENGAGEMENT, THEMES, PRIORITY_MODEL, DIMENSIONS } from '@/data/seed';
import { maturityGap, quadrant, round2 } from '@/lib/calc';

const PHASES = ['kickoff', 'fact_gathering', 'diagnose', 'roadmap_v1', 'economics', 'alignment', 'board'] as const;

export default function WorkspaceOverview() {
  const { model, publications, submissions, currentPublication, hasUnpublishedChanges, unpublishedCount } = useStore();
  const { oppScore, oppBand, conflicts } = useDerived();

  const scored = model.opportunities.filter((o) => oppScore[o.id] !== null).length;
  const total = model.opportunities.length;
  const belowTarget = model.capabilities.filter((c) => (maturityGap(c.current, c.target).value ?? 0) > 0).length;
  const critical = model.capabilities.filter((c) => c.priorityToFix === 'Critical').length;
  const actNow = model.opportunities.filter((o) => {
    const q = quadrant(o.scores.map((s) => ({ dimensionKey: s.dimensionKey, level: s.level })), PRIORITY_MODEL as never, oppScore[o.id]).value;
    return q.quadrant === 'Act Now';
  }).length;
  const pending = submissions.filter((s) => s.status === 'pending').length;
  const errors = conflicts.filter((c) => c.severity === 'error').length;
  const phaseIdx = PHASES.indexOf(ENGAGEMENT.phase as typeof PHASES[number]);

  const attention: { label: string; count: number; href: string }[] = [
    { label: 'Opportunities not fully scored', count: total - scored, href: '/workspace/opportunities' },
    { label: 'Client submissions awaiting review', count: pending, href: '/workspace/feedback' },
    { label: 'Sequencing conflicts on the roadmap', count: errors, href: '/workspace/roadmap' },
    { label: 'Approved changes not yet published', count: hasUnpublishedChanges ? unpublishedCount : 0, href: '/workspace/publish' },
    { label: 'Capabilities below target maturity', count: belowTarget, href: '/workspace/current-state' },
  ].filter((a) => a.count > 0);

  return (
    <div className="p-6">
      <PageHeader
        title="Engagement overview"
        subtitle={ENGAGEMENT.mandate}
        actions={<Link href="/workspace/publish"><Button variant="primary" size="sm">Publish to client</Button></Link>}
      />
      <JourneyRail />

      {hasUnpublishedChanges && (
        <div className="mb-5">
          <Banner tone="warn" action={<Link href="/workspace/publish"><Button size="sm">Review and publish</Button></Link>}>
            <strong className="font-medium">{unpublishedCount} change{unpublishedCount === 1 ? '' : 's'} not yet published.</strong>{' '}
            The client is still seeing version {currentPublication?.version ?? 0} until you republish.
          </Banner>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="Opportunities scored" value={`${scored}`} denominator={`of ${total} in the register`} />
        <StatCard label="Act Now" value={actNow} denominator="high value, high urgency" />
        <StatCard label="Below target maturity" value={belowTarget} denominator={`of ${model.capabilities.length} capabilities`} />
        <StatCard label="Critical to fix" value={critical} denominator="capability priority" />
        <StatCard label="Awaiting your review" value={pending} denominator="client submissions" tone={pending > 0 ? 'attention' : 'neutral'} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card title="Engagement phase" className="lg:col-span-2">
          <ol className="flex flex-wrap gap-1.5">
            {PHASES.map((p, i) => (
              <li key={p} className={`flex-1 min-w-[104px] rounded px-3 py-2.5 border ${
                i < phaseIdx ? 'bg-aberdeen-50 border-aberdeen-200' : i === phaseIdx ? 'bg-aberdeen border-aberdeen text-white' : 'bg-white border-onyx-20'
              }`}>
                <div className={`text-2xs uppercase tracking-wide ${i === phaseIdx ? 'text-verdigris' : 'text-onyx-40'}`}>
                  {i < phaseIdx ? 'Complete' : i === phaseIdx ? 'Current' : 'Ahead'}
                </div>
                <div className={`text-xs mt-0.5 capitalize ${i === phaseIdx ? 'text-white' : 'text-onyx'}`}>
                  {p.replace(/_/g, ' ')}
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-5">
            <SectionTitle note="calculated rollup">Investment themes</SectionTitle>
            <div className="space-y-1.5">
              {THEMES.map((t) => {
                const inis = model.initiatives.filter((i) => i.themeId === t.id);
                const opps = model.opportunities.filter((o) => inis.some((i) => i.id === o.initiativeId));
                const vals = opps.map((o) => oppScore[o.id]).filter((v): v is number => v !== null);
                const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
                return (
                  <div key={t.id} className="flex items-center gap-3 py-1.5 border-b border-onyx-10 last:border-0">
                    <span className="h-3 w-3 rounded-sm shrink-0" style={{ background: t.colour }} />
                    <span className="text-[13px] text-aberdeen font-medium w-56 shrink-0">{t.name}</span>
                    <span className="text-xs text-onyx-60 flex-1 truncate hidden md:block">{t.strategicQuestion}</span>
                    <span className="text-xs text-onyx-60 tabular-nums shrink-0">
                      {avg === null ? 'not scored' : round2(avg)}
                      <span className="text-onyx-40 ml-1">({vals.length}/{opps.length})</span>
                    </span>
                    <Badge>Seq {t.sequence}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card title="Needs attention">
            {attention.length === 0 ? (
              <p className="text-[13px] text-onyx-60">Nothing outstanding.</p>
            ) : (
              <ul className="space-y-1">
                {attention.map((a) => (
                  <li key={a.label}>
                    <Link href={a.href} className="flex items-center justify-between gap-3 py-2 border-b border-onyx-10 last:border-0 hover:text-aberdeen group">
                      <span className="text-[13px] text-onyx group-hover:text-aberdeen">{a.label}</span>
                      <Badge tone={a.count > 3 ? 'warn' : 'neutral'}>{a.count}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Publication history">
            <ul className="space-y-2.5">
              {[...publications].reverse().map((p) => (
                <li key={p.version} className="border-b border-onyx-10 last:border-0 pb-2.5 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Badge tone={p.version === currentPublication?.version ? 'brand' : 'neutral'}>v{p.version}</Badge>
                    <span className="text-2xs text-onyx-60">
                      {new Date(p.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-2xs text-onyx-40 ml-auto">{p.publishedBy}</span>
                  </div>
                  <p className="text-2xs text-onyx-60 mt-1 leading-relaxed">{p.note}</p>
                  <p className="text-2xs text-onyx-40 mt-0.5">{p.snapshot.opportunities.length} items visible to the client</p>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Priority model">
            <ul className="space-y-1.5 text-[13px]">
              {DIMENSIONS.map((d) => (
                <li key={d.key} className="flex items-center justify-between gap-2">
                  <span className="text-onyx">{d.name}</span>
                  <span className="text-onyx-60 tabular-nums">{(d.weight * 100).toFixed(0)}%</span>
                </li>
              ))}
            </ul>
            <p className="text-2xs text-onyx-60 mt-3 leading-relaxed border-t border-onyx-10 pt-2.5">
              Bands: Critical &ge; {PRIORITY_MODEL.bands.critical} · High &ge; {PRIORITY_MODEL.bands.high} · Medium &ge; {PRIORITY_MODEL.bands.medium}.
              Quadrant thresholds at {PRIORITY_MODEL.quadrantThresholdX} on both axes.
            </p>
            <p className="text-2xs text-onyx-40 mt-2 leading-relaxed">{PRIORITY_MODEL.methodologyNote}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

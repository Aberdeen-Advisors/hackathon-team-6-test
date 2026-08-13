'use client';

import Link from 'next/link';
import { useStore } from '@/lib/store/store';
import { PageHeader } from '@/components/Shell';
import { Card, StatCard, Badge, Button, Banner, SectionTitle, EmptyState } from '@/components/ui';
import { diffPayloads } from '@/lib/publish/buildClientPayload';
import { money as moneyFmt } from '@/lib/calc/financials';

export default function PortalOverview() {
  const { publications, currentPublication, submissions } = useStore();

  if (!currentPublication) {
    return (
      <div className="p-6">
        <Card><EmptyState title="Nothing published yet" body="Aberdeen has not yet published content to this engagement. You will see the roadmap here once they do." /></Card>
      </div>
    );
  }

  const p = currentPublication;
  const prev = publications.find((x) => x.version === p.version - 1) ?? null;
  const changes = diffPayloads(prev?.snapshot ?? null, p.snapshot);
  const mine = submissions.length;
  const answered = submissions.filter((s) => s.status !== 'pending').length;

  return (
    <div className="p-6">
      <PageHeader title="Transformation roadmap" subtitle={p.snapshot.mandate} />

      <div className="mb-5">
        <Banner tone="accent">
          <strong className="font-medium">Version {p.version}</strong> · published{' '}
          {new Date(p.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} by {p.publishedBy}
          {p.note && <span className="block mt-1 text-onyx">{p.note}</span>}
        </Banner>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="Initiatives on the roadmap" value={p.snapshot.roadmapItems.length} denominator={`across ${p.snapshot.waves.length} waves`} />
        <StatCard label="Published opportunities" value={p.snapshot.opportunities.length} denominator={`in ${p.snapshot.themes.length} investment themes`} />
        <StatCard label="Capabilities assessed" value={p.snapshot.capabilities.length} denominator="current state" />
        <StatCard label="Your submissions" value={mine} denominator={`${answered} reviewed by Aberdeen`} tone={mine > answered ? 'attention' : 'neutral'} />
        {p.snapshot.financials && (
          <StatCard label="Total investment" value={moneyFmt(p.snapshot.financials.investmentBase)}
            denominator={p.snapshot.financials.isPartial ? `partial — ${p.snapshot.financials.coverage.estimated} of ${p.snapshot.financials.coverage.total} costed` : 'across the published roadmap'} />
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card title="Investment themes" className="lg:col-span-2"
          subtitle="Every initiative belongs to one of these. The sequence reflects what has to come first.">
          <div className="space-y-2.5">
            {p.snapshot.themes.map((t, i) => {
              const n = p.snapshot.opportunities.filter((o) => o.themeName === t.name).length;
              if (n === 0) return null;
              return (
                <div key={t.id} className="flex items-start gap-3 border-b border-onyx-10 pb-2.5 last:border-0">
                  <span className="mt-1 h-3 w-3 rounded-sm shrink-0" style={{ background: t.colour }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-aberdeen">{t.name}</span>
                      <Badge>Sequence {i + 1}</Badge>
                    </div>
                    <p className="text-2xs text-onyx-60 mt-0.5 leading-relaxed">{t.strategicQuestion}</p>
                  </div>
                  <span className="text-xs text-onyx-60 shrink-0">{n} item{n === 1 ? '' : 's'}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-2">
            <Link href="/portal/roadmap"><Button size="sm" variant="primary">View the roadmap</Button></Link>
            <Link href="/portal/current-state"><Button size="sm">Current state</Button></Link>
          </div>
        </Card>

        <div className="space-y-5">
          <Card title={`What changed in version ${p.version}`}>
            <ul className="space-y-1.5">
              {changes.map((c, i) => (
                <li key={i} className="text-[13px] text-onyx flex gap-2 leading-snug">
                  <span className="text-verdigris-700 shrink-0">·</span>{c}
                </li>
              ))}
            </ul>
          </Card>

          {p.snapshot.risks.length > 0 && (
            <Card title="Risks we are tracking">
              <div className="space-y-2">
                {p.snapshot.risks.map((r) => (
                  <div key={r.id} className={`rounded border px-3 py-2 ${r.severity === 'high' ? 'border-jasper/40 bg-jasper-tint' : 'border-gold/40 bg-gold-tint'}`}>
                    <div className="flex items-center gap-2">
                      <Badge tone={r.severity === 'high' ? 'danger' : 'warn'}>{r.severity}</Badge>
                      {r.initiativeName && <span className="text-2xs text-onyx-60">{r.initiativeName}</span>}
                    </div>
                    <p className="text-[13px] text-onyx mt-1 leading-relaxed">{r.title}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card title="Your input">
            <p className="text-[13px] text-onyx-60 leading-relaxed mb-3">
              You can rank priorities, comment on any published item, suggest a dependency, or propose different
              timing. Everything you submit goes to Aberdeen for review — it does not change the roadmap directly.
            </p>
            <Link href="/portal/feedback"><Button size="sm" variant="primary">Submit feedback</Button></Link>
          </Card>

          <Card title="Publication history">
            <ul className="space-y-2">
              {[...publications].reverse().map((x) => (
                <li key={x.version} className="flex items-start gap-2 border-b border-onyx-10 pb-2 last:border-0">
                  <Badge tone={x.version === p.version ? 'brand' : 'neutral'}>v{x.version}</Badge>
                  <div className="min-w-0">
                    <div className="text-2xs text-onyx-60">
                      {new Date(x.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <p className="text-2xs text-onyx leading-relaxed mt-0.5">{x.note}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

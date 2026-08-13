'use client';

import { useStore } from '@/lib/store/store';
import { PageHeader } from '@/components/Shell';
import { Card, Badge, EmptyState } from '@/components/ui';

const LEVEL_FILL = ['#F7F7F7', '#DB504A', '#F7D002', '#5CC8FF', '#00A676', '#09375F'];

export default function PortalCurrentState() {
  const { currentPublication } = useStore();
  const caps = currentPublication?.snapshot.capabilities ?? [];

  if (caps.length === 0) {
    return <div className="p-6"><Card><EmptyState title="Current state not published" body="Aberdeen has not published the maturity assessment for this engagement." /></Card></div>;
  }

  const byFn = caps.reduce<Record<string, typeof caps>>((acc, c) => {
    (acc[c.functionName] ||= []).push(c);
    return acc;
  }, {});

  return (
    <div className="p-6">
      <PageHeader
        title="Current state"
        subtitle="Where the technology estate stands today against where it needs to be. The gap is the distance between the two."
      />

      <div className="space-y-5">
        {Object.entries(byFn).map(([fn, list]) => (
          <Card key={fn} flush title={fn}
            actions={<span className="text-xs text-onyx-60">{list.length} focus area{list.length === 1 ? '' : 's'}</span>}>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-2xs uppercase tracking-wide text-onyx-60 border-b border-onyx-10">
                  <th className="text-left font-medium px-5 py-2 min-w-[220px]">Focus area</th>
                  <th className="text-left font-medium px-2 py-2 w-[280px]">Maturity</th>
                  <th className="text-center font-medium px-2 py-2 w-16">Gap</th>
                  <th className="text-left font-medium px-2 py-2 min-w-[280px]">Assessment</th>
                  <th className="text-center font-medium px-5 py-2">Priority</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="border-b border-onyx-10 last:border-0 align-top">
                    <td className="px-5 py-3 text-aberdeen font-medium">{c.name}</td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((l) => (
                          <span key={l} className="relative flex-1 h-5 rounded-sm border border-onyx-10 grid place-items-center text-2xs"
                            style={{ background: l <= c.current ? LEVEL_FILL[c.current] : '#FFFFFF', color: l <= c.current ? '#FFFFFF' : '#D6D6D6' }}>
                            {l}
                            {l === c.target && (
                              <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-0 w-0"
                                style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '5px solid #09375F' }} />
                            )}
                          </span>
                        ))}
                      </div>
                      <div className="text-2xs text-onyx-40 mt-1">
                        {c.currentLabel} (current {c.current}) · target {c.target}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center text-aberdeen font-medium tabular-nums">
                      {c.gap < 0 ? 'Exceeds' : `+${c.gap}`}
                    </td>
                    <td className="px-2 py-3 text-onyx-60 text-xs leading-relaxed">{c.rationale}</td>
                    <td className="px-5 py-3 text-center">
                      <Badge tone={c.priorityToFix === 'Critical' ? 'danger' : c.priorityToFix === 'High' ? 'warn' : 'neutral'}>
                        {c.priorityToFix}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}
      </div>

      <p className="text-2xs text-onyx-60 mt-5 leading-relaxed max-w-4xl border-l-2 border-verdigris pl-3">
        {currentPublication?.snapshot.frameworkDisclaimer}
      </p>
    </div>
  );
}

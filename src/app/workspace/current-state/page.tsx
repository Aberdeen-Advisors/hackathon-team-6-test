'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store/store';
import { PageHeader } from '@/components/Shell';
import { JourneyRail } from '@/components/JourneyRail';
import { Card, Badge, CalcValue, SidePanel, SectionTitle } from '@/components/ui';
import { TECHNOLOGY_FUNCTIONS, MATURITY_FRAMEWORK, EVIDENCE } from '@/data/seed';
import { maturityGap, maturityLabel } from '@/lib/calc';

const LEVEL_FILL = ['#F7F7F7', '#DB504A', '#F7D002', '#5CC8FF', '#00A676', '#09375F'];

export default function CurrentStatePage() {
  const { model } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const cap = open ? model.capabilities.find((c) => c.id === open) : null;

  return (
    <div className="p-6">
      <PageHeader
        title="Current state"
        subtitle={`${MATURITY_FRAMEWORK.name} · ${MATURITY_FRAMEWORK.evaluationMethod} · ${MATURITY_FRAMEWORK.calibration}. Current and target are consultant judgments; the gap and the level label are calculated.`}
      />

      <JourneyRail />

      <div className="space-y-5">
        {TECHNOLOGY_FUNCTIONS.map((fn) => {
          const caps = model.capabilities.filter((c) => c.functionId === fn.id);
          if (caps.length === 0) return null;
          const avg = caps.reduce((a, c) => a + c.current, 0) / caps.length;
          return (
            <Card key={fn.id} flush title={fn.name}
              actions={
                <span className="text-xs text-onyx-60">
                  <CalcValue explain={`mean of ${caps.length} focus-area current levels`}>{avg.toFixed(1)}</CalcValue>
                  <span className="ml-1.5 text-onyx-40">average of {caps.length} focus areas</span>
                </span>
              }
            >
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-2xs uppercase tracking-wide text-onyx-60 border-b border-onyx-10">
                    <th className="text-left font-medium px-5 py-2 min-w-[220px]">Focus area</th>
                    <th className="text-left font-medium px-2 py-2 w-[300px]">Maturity</th>
                    <th className="text-center font-medium px-2 py-2 w-16">Gap</th>
                    <th className="text-left font-medium px-2 py-2">Level</th>
                    <th className="text-center font-medium px-5 py-2">Priority to fix</th>
                  </tr>
                </thead>
                <tbody>
                  {caps.map((c) => {
                    const gap = maturityGap(c.current, c.target);
                    return (
                      <tr key={c.id} className="border-b border-onyx-10 last:border-0 hover:bg-aberdeen-50/50 cursor-pointer" onClick={() => setOpen(c.id)}>
                        <td className="px-5 py-2.5 text-aberdeen font-medium">{c.name}</td>
                        <td className="px-2 py-2.5">
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
                          <div className="text-2xs text-onyx-40 mt-1">current {c.current} · target {c.target}</div>
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <CalcValue explain={gap.formulaWithValues}>{gap.value === null ? '—' : gap.value < 0 ? 'Exceeds' : `+${gap.value}`}</CalcValue>
                        </td>
                        <td className="px-2 py-2.5 text-onyx-60 text-xs">{maturityLabel(c.current, MATURITY_FRAMEWORK.levels)}</td>
                        <td className="px-5 py-2.5 text-center">
                          <Badge tone={c.priorityToFix === 'Critical' ? 'danger' : c.priorityToFix === 'High' ? 'warn' : 'neutral'}>
                            {c.priorityToFix}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          );
        })}
      </div>

      <p className="text-2xs text-onyx-60 mt-5 leading-relaxed max-w-4xl border-l-2 border-verdigris pl-3">
        {MATURITY_FRAMEWORK.disclaimer}
      </p>

      <SidePanel open={!!cap} onClose={() => setOpen(null)} title={cap?.name ?? ''}
        subtitle={cap ? TECHNOLOGY_FUNCTIONS.find((f) => f.id === cap.functionId)?.name : ''}>
        {cap && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="border border-onyx-20 rounded px-2 py-2.5">
                <div className="text-2xs text-onyx-60">Current</div>
                <div className="text-2xl font-light text-aberdeen">{cap.current}</div>
                <div className="text-2xs text-onyx-40">{maturityLabel(cap.current, MATURITY_FRAMEWORK.levels)}</div>
              </div>
              <div className="border border-onyx-20 rounded px-2 py-2.5">
                <div className="text-2xs text-onyx-60">Target</div>
                <div className="text-2xl font-light text-aberdeen">{cap.target}</div>
                <div className="text-2xs text-onyx-40">{maturityLabel(cap.target, MATURITY_FRAMEWORK.levels)}</div>
              </div>
              <div className="calc-field rounded px-2 py-2.5">
                <div className="text-2xs text-onyx-60">Gap</div>
                <div className="text-2xl font-light text-aberdeen">{maturityGap(cap.current, cap.target).value}</div>
                <div className="text-2xs text-onyx-40">calculated</div>
              </div>
            </div>

            <div>
              <SectionTitle>Level definition</SectionTitle>
              <p className="text-[13px] text-onyx leading-relaxed">
                {MATURITY_FRAMEWORK.levels.find((l) => l.level === cap.current)?.description}
              </p>
            </div>

            <div>
              <SectionTitle>Assessment rationale</SectionTitle>
              <p className="text-[13px] text-onyx leading-relaxed">{cap.rationale}</p>
            </div>

            <div>
              <SectionTitle note="Aberdeen only — never published">Supporting evidence</SectionTitle>
              <div className="space-y-1.5">
                {cap.evidenceIds.map((id) => {
                  const ev = EVIDENCE.find((e) => e.id === id);
                  if (!ev) return null;
                  return (
                    <div key={id} className="border border-onyx-20 rounded px-3 py-2">
                      <p className="text-[13px] text-onyx leading-relaxed">&ldquo;{ev.excerpt}&rdquo;</p>
                      <p className="text-2xs text-onyx-40 mt-1">{ev.id} · {ev.type} · {ev.source} · {ev.location}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <SectionTitle>Linked opportunities</SectionTitle>
              <ul className="space-y-1">
                {model.opportunities.filter((o) => o.capabilityIds.includes(cap.id)).map((o) => (
                  <li key={o.id} className="text-[13px] text-onyx border-b border-onyx-10 pb-1.5">{o.title}</li>
                ))}
                {model.opportunities.filter((o) => o.capabilityIds.includes(cap.id)).length === 0 && (
                  <li className="text-2xs text-onyx-60">No opportunity yet addresses this gap.</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store/store';
import { PageHeader } from '@/components/Shell';
import { JourneyRail } from '@/components/JourneyRail';
import { Questionnaire } from '@/components/Questionnaire';
import { Card, Badge, Banner, Button, EmptyState } from '@/components/ui';
import { PHASE_QUESTIONNAIRES } from '@/data/methodology';

export default function PhasesPage() {
  const { answers, model, isBlank } = useStore();
  const [active, setActive] = useState(PHASE_QUESTIONNAIRES[0].id);
  const phase = PHASE_QUESTIONNAIRES.find((p) => p.id === active)!;

  const progress = (p: typeof phase) => {
    const qs = p.sections.flatMap((s) => s.questions);
    const done = qs.filter((q) => {
      const a = answers[q.id];
      return a && (Array.isArray(a.value) ? a.value.some((x) => x.trim()) : String(a.value).trim().length > 0);
    }).length;
    return { done, total: qs.length };
  };

  const docs = model.documents.length;

  return (
    <div className="p-6">
      <PageHeader
        title="Phase questionnaires"
        subtitle="Layer three of three. One questionnaire per engagement phase, following the Aberdeen methodology. Where an uploaded document offers a possible answer, it appears as a suggestion for you to accept, edit or reject — never as a confirmed answer."
      />
      <JourneyRail />

      {isBlank && docs === 0 && (
        <div className="mb-5">
          <Banner tone="warn">
            <strong className="font-medium">No documents uploaded yet.</strong> These questionnaires work without
            documents, but uploading material first means the application can propose answers rather than
            leaving you to type all {PHASE_QUESTIONNAIRES.reduce((n, p) => n + p.sections.reduce((m, s) => m + s.questions.length, 0), 0)} of them.
          </Banner>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-5">
        {PHASE_QUESTIONNAIRES.map((p) => {
          const { done, total } = progress(p);
          const complete = done === total && total > 0;
          return (
            <button key={p.id} onClick={() => setActive(p.id)}
              className={`rounded border px-3 py-2 text-left transition-colors ${
                active === p.id ? 'bg-aberdeen text-white border-aberdeen' : 'bg-white border-onyx-20 hover:border-aberdeen-200'
              }`}>
              <div className={`text-2xs ${active === p.id ? 'text-verdigris' : 'text-onyx-40'}`}>{p.weeks}</div>
              <div className={`text-[13px] font-medium ${active === p.id ? 'text-white' : 'text-aberdeen'}`}>{p.phase}</div>
              <div className={`text-2xs tabular-nums mt-0.5 ${active === p.id ? 'text-white/60' : 'text-onyx-40'}`}>
                {done}/{total}{complete ? ' ✓' : ''}
              </div>
            </button>
          );
        })}
      </div>

      <Questionnaire
        sections={phase.sections}
        title={`${phase.weeks} — ${phase.phase}`}
        intro={phase.objective}
      />
    </div>
  );
}

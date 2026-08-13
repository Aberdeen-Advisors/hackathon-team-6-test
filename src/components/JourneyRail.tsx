'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore, useDerived } from '@/lib/store/store';
import { portfolioTotals } from '@/lib/calc/financials';
import { INTAKE_SECTIONS, PHASE_QUESTIONNAIRES, totalIntakeQuestions, totalPhaseQuestions } from '@/data/methodology';

export interface JourneyStep {
  key: string; label: string; href: string; done: boolean; detail: string;
}

/** Completion is computed from the model, never self-reported. */
export function useJourney(): JourneyStep[] {
  const { model, publications, submissions, answers } = useStore();
  const answered = (ids: string[]) => ids.filter((id) => {
    const a = answers[id];
    return a && (Array.isArray(a.value) ? a.value.some((x) => x.trim()) : String(a.value).trim().length > 0);
  }).length;
  const intakeAnswered = answered(INTAKE_SECTIONS.flatMap((s) => s.questions.map((q) => q.id)));
  const phaseAnswered = answered(PHASE_QUESTIONNAIRES.flatMap((p) => p.sections.flatMap((s) => s.questions.map((q) => q.id))));
  const { oppScore } = useDerived();

  const scored = model.opportunities.filter((o) => oppScore[o.id] !== null).length;
  const fin = portfolioTotals(model.initiatives.map((i) => i.id), model.financials);
  const accepted = model.documents.reduce(
    (n, d) => n + Object.values(d.decisions).filter((x) => x.status === 'accepted').length, 0);

  return [
    { key: 'setup', label: 'Setup', href: '/workspace/intake',
      done: intakeAnswered >= 12,
      detail: `${intakeAnswered} of ${totalIntakeQuestions} intake answers` },
    { key: 'sources', label: 'Sources', href: '/workspace/sources',
      done: accepted > 0,
      detail: model.documents.length === 0 ? 'Upload and synthesise engagement material' : `${model.documents.length} document${model.documents.length === 1 ? '' : 's'} · ${accepted} finding${accepted === 1 ? '' : 's'} accepted` },
    { key: 'phases', label: 'Phase questions', href: '/workspace/phases',
      done: phaseAnswered >= 10,
      detail: `${phaseAnswered} of ${totalPhaseQuestions} phase answers` },
    { key: 'current', label: 'Current state', href: '/workspace/current-state',
      done: model.capabilities.length > 0,
      detail: `${model.capabilities.length} capabilities assessed` },
    { key: 'prioritise', label: 'Prioritise', href: '/workspace/opportunities',
      done: scored === model.opportunities.length && scored > 0,
      detail: `${scored} of ${model.opportunities.length} opportunities scored` },
    { key: 'roadmap', label: 'Roadmap', href: '/workspace/roadmap',
      done: model.roadmapItems.length > 0,
      detail: `${model.roadmapItems.length} initiatives sequenced` },
    { key: 'financials', label: 'Financials', href: '/workspace/financials',
      done: fin.coverage.estimated === fin.coverage.total && fin.coverage.total > 0,
      detail: `${fin.coverage.estimated} of ${fin.coverage.total} initiatives estimated` },
    { key: 'publish', label: 'Publish', href: '/workspace/publish',
      done: publications.length > 1,
      detail: publications.length > 0 ? `Version ${publications[publications.length - 1].version} live` : 'Nothing published' },
    { key: 'alignment', label: 'Alignment', href: '/workspace/feedback',
      done: submissions.length > 0 && submissions.every((s) => s.status !== 'pending'),
      detail: submissions.length === 0 ? 'Awaiting client input' : `${submissions.filter((s) => s.status !== 'pending').length} of ${submissions.length} reviewed` },
  ];
}

export function JourneyRail() {
  const steps = useJourney();
  const pathname = usePathname();

  return (
    <nav aria-label="Engagement journey" className="bg-white border border-onyx-20 rounded-md overflow-hidden mb-6">
      <ol className="flex overflow-x-auto">
        {steps.map((s, i) => {
          const active = pathname === s.href;
          return (
            <li key={s.key} className="flex-1 min-w-[132px]">
              <Link href={s.href}
                className={`block h-full px-4 py-3 border-r border-onyx-10 last:border-r-0 transition-colors ${
                  active ? 'bg-aberdeen text-white' : s.done ? 'bg-aberdeen-50 hover:bg-aberdeen-100' : 'bg-white hover:bg-onyx-5'
                }`}>
                <div className="flex items-center gap-2">
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-2xs font-semibold ${
                    active ? 'bg-verdigris text-aberdeen' : s.done ? 'bg-verdigris text-aberdeen' : 'bg-onyx-10 text-onyx-60'
                  }`}>
                    {s.done ? '✓' : i + 1}
                  </span>
                  <span className={`text-[13px] font-medium truncate ${active ? 'text-white' : 'text-aberdeen'}`}>{s.label}</span>
                </div>
                <p className={`text-2xs mt-1 leading-snug ${active ? 'text-white/70' : 'text-onyx-60'}`}>{s.detail}</p>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

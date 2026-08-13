'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store/store';
import { PageHeader } from '@/components/Shell';
import { JourneyRail } from '@/components/JourneyRail';
import { Card, Button, Badge, Field, inputCls, Toast, Banner, SectionTitle } from '@/components/ui';
import { ENGAGEMENT, TECHNOLOGY_FUNCTIONS, DIMENSIONS, PRIORITY_MODEL } from '@/data/seed';

const DOC_REQUESTS = [
  'Corporate strategy or annual plan',
  'Technology strategy or prior roadmap',
  'Application and platform inventory',
  'Current-year technology budget',
  'Organisation chart for the technology function',
  'In-flight programme and project list',
  'Architecture diagrams',
  'Prior assessments or audit findings',
  'Vendor and contract register',
];

export default function KickoffPage() {
  const { model, saveKickoff } = useStore();
  const router = useRouter();
  const k = model.kickoff;

  const [step, setStep] = useState(0);
  const [mandate, setMandate] = useState(k.mandate);
  const [sponsor, setSponsor] = useState(k.sponsor);
  const [horizon, setHorizon] = useState(k.horizonYears);
  const [objectives, setObjectives] = useState<string[]>(k.primaryObjectives.length ? k.primaryObjectives : ['', '', '']);
  const [inScope, setInScope] = useState<string[]>(k.inScope.length ? k.inScope : TECHNOLOGY_FUNCTIONS.map((f) => f.name).slice(0, 5));
  const [outOfScope, setOutOfScope] = useState(k.outOfScope.join('\n'));
  const [stakeholders, setStakeholders] = useState(k.keyStakeholders.length ? k.keyStakeholders : [{ name: '', role: '', area: '' }]);
  const [constraints, setConstraints] = useState(k.knownConstraints);
  const [success, setSuccess] = useState(k.successCriteria);
  const [requests, setRequests] = useState<string[]>(k.documentRequests.length ? k.documentRequests : DOC_REQUESTS.slice(0, 5));
  const [toast, setToast] = useState<string | null>(null);

  const STEPS = ['Mandate', 'Objectives', 'Scope', 'Stakeholders', 'Information needs'];

  function persist(complete = false) {
    saveKickoff({
      mandate, sponsor, horizonYears: horizon,
      primaryObjectives: objectives.filter((o) => o.trim()),
      inScope, outOfScope: outOfScope.split('\n').map((x) => x.trim()).filter(Boolean),
      keyStakeholders: stakeholders.filter((s) => s.name.trim()),
      knownConstraints: constraints, successCriteria: success, documentRequests: requests,
    }, complete);
  }

  const canComplete = mandate.trim().length > 20 && objectives.filter((o) => o.trim()).length >= 1;

  return (
    <div className="p-6">
      <PageHeader
        title="Kickoff and mobilisation"
        subtitle="Week 0. Establish the mandate, the objectives the roadmap will be measured against, scope, stakeholders and the information we need. Objectives captured here become the denominator of strategic-alignment scoring."
        actions={k.completedAt ? <Badge tone="ok">Completed {new Date(k.completedAt).toLocaleDateString('en-GB')}</Badge> : undefined}
      />
      <JourneyRail />

      <div className="grid lg:grid-cols-[220px_1fr] gap-5">
        <nav className="space-y-1">
          {STEPS.map((s, i) => (
            <button key={s} onClick={() => { persist(); setStep(i); }}
              className={`w-full text-left rounded px-3 py-2.5 border transition-colors ${
                step === i ? 'bg-aberdeen text-white border-aberdeen' : 'bg-white border-onyx-20 hover:border-aberdeen-200'
              }`}>
              <span className={`block text-2xs ${step === i ? 'text-verdigris' : 'text-onyx-40'}`}>Step {i + 1}</span>
              <span className={`block text-[13px] font-medium ${step === i ? 'text-white' : 'text-aberdeen'}`}>{s}</span>
            </button>
          ))}
        </nav>

        <div>
          {step === 0 && (
            <Card title="Transformation mandate" subtitle="What this engagement exists to answer. This appears on every screen, and on the client's overview once published.">
              <Field label="Mandate statement" hint="Two or three sentences. What must be true at the end of this engagement?">
                <textarea className={inputCls} rows={4} value={mandate} onChange={(e) => setMandate(e.target.value)} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Executive sponsor">
                  <input className={inputCls} value={sponsor} onChange={(e) => setSponsor(e.target.value)} placeholder="e.g. Chief Digital & Information Officer" />
                </Field>
                <Field label="Planning horizon" hint="Drives the roadmap timeline and financial phasing.">
                  <select className={inputCls} value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}>
                    {[1, 2, 3, 5].map((y) => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Success criteria" hint="How will the client judge whether this engagement worked?">
                <textarea className={inputCls} rows={3} value={success} onChange={(e) => setSuccess(e.target.value)}
                  placeholder="e.g. a Board-approved investment envelope, an agreed sequence, and named owners for the first wave." />
              </Field>
            </Card>
          )}

          {step === 1 && (
            <Card title="Transformation objectives"
              subtitle="The client's own named goals. Strategic alignment is scored on traceability to these — an initiative claiming a level 5 must trace to one by name.">
              <Banner tone="accent">
                These feed dimension three of the priority model, weighted {DIMENSIONS[2].weight * 100}%.
              </Banner>
              <div className="mt-4 space-y-2">
                {objectives.map((o, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded bg-aberdeen-50 text-aberdeen text-xs font-medium">{i + 1}</span>
                    <input className={inputCls} value={o}
                      onChange={(e) => setObjectives(objectives.map((x, j) => (j === i ? e.target.value : x)))}
                      placeholder={['Grow revenue in the core channel', 'Exceed the profit target', 'Reduce operational risk exposure'][i] ?? 'Add an objective'} />
                    <Button size="sm" variant="ghost" onClick={() => setObjectives(objectives.filter((_, j) => j !== i))}>Remove</Button>
                  </div>
                ))}
                <Button size="sm" onClick={() => setObjectives([...objectives, ''])}>Add objective</Button>
              </div>
              <div className="mt-5 pt-4 border-t border-onyx-10">
                <SectionTitle>Already in the model</SectionTitle>
                <ul className="space-y-1">
                  {model.objectives.map((o) => (
                    <li key={o.id} className="flex items-center gap-2 text-[13px]">
                      <Badge tone={o.source === 'document' ? 'accent' : 'neutral'}>{o.source.replace(/_/g, ' ')}</Badge>
                      <span className="text-onyx">{o.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card title="Scope" subtitle="Which technology domains this assessment covers, and what is explicitly excluded.">
              <SectionTitle>In scope</SectionTitle>
              <div className="grid sm:grid-cols-2 gap-1.5 mb-5">
                {TECHNOLOGY_FUNCTIONS.map((f) => (
                  <label key={f.id} className="flex items-center gap-2.5 rounded border border-onyx-20 px-3 py-2 cursor-pointer hover:border-aberdeen-200">
                    <input type="checkbox" className="accent-[#44B0B1]" checked={inScope.includes(f.name)}
                      onChange={(e) => setInScope(e.target.checked ? [...inScope, f.name] : inScope.filter((x) => x !== f.name))} />
                    <span className="text-[13px] text-onyx">{f.name}</span>
                  </label>
                ))}
              </div>
              <Field label="Explicitly out of scope" hint="One per line. Recording exclusions now prevents scope disputes later.">
                <textarea className={inputCls} rows={3} value={outOfScope} onChange={(e) => setOutOfScope(e.target.value)}
                  placeholder={'Physical security\nHR systems replacement'} />
              </Field>
              <Field label="Known constraints" hint="Budget cycle, freeze periods, in-flight programmes that cannot be disturbed.">
                <textarea className={inputCls} rows={3} value={constraints} onChange={(e) => setConstraints(e.target.value)} />
              </Field>
            </Card>
          )}

          {step === 3 && (
            <Card title="Key stakeholders" subtitle="Who we interview, and who later receives a client portal login.">
              <div className="space-y-2">
                {stakeholders.map((s, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                    <input className={inputCls} value={s.name} placeholder="Name"
                      onChange={(e) => setStakeholders(stakeholders.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                    <input className={inputCls} value={s.role} placeholder="Role"
                      onChange={(e) => setStakeholders(stakeholders.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))} />
                    <input className={inputCls} value={s.area} placeholder="Business area"
                      onChange={(e) => setStakeholders(stakeholders.map((x, j) => (j === i ? { ...x, area: e.target.value } : x)))} />
                    <Button size="sm" variant="ghost" onClick={() => setStakeholders(stakeholders.filter((_, j) => j !== i))}>×</Button>
                  </div>
                ))}
                <Button size="sm" onClick={() => setStakeholders([...stakeholders, { name: '', role: '', area: '' }])}>Add stakeholder</Button>
              </div>
            </Card>
          )}

          {step === 4 && (
            <Card title="Information request" subtitle="What we need from the client before the fact base can be built. Uploading these on the Sources screen is what drives the analysis.">
              <div className="space-y-1.5">
                {DOC_REQUESTS.map((d) => (
                  <label key={d} className="flex items-center gap-2.5 rounded border border-onyx-20 px-3 py-2 cursor-pointer hover:border-aberdeen-200">
                    <input type="checkbox" className="accent-[#44B0B1]" checked={requests.includes(d)}
                      onChange={(e) => setRequests(e.target.checked ? [...requests, d] : requests.filter((x) => x !== d))} />
                    <span className="text-[13px] text-onyx">{d}</span>
                  </label>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-onyx-10">
                <p className="text-[13px] text-onyx-60 leading-relaxed mb-3">
                  Completing kickoff records the mandate and objectives, and unlocks the next step. You can return
                  and revise at any point — objectives added later become available to alignment scoring immediately.
                </p>
                {!canComplete && (
                  <Banner tone="warn">A mandate and at least one objective are required before kickoff can be completed.</Banner>
                )}
                <div className="flex gap-2 mt-3">
                  <Button variant="primary" disabled={!canComplete}
                    onClick={() => { persist(true); setToast('Kickoff completed — objectives are now available to alignment scoring.'); setTimeout(() => router.push('/workspace/sources'), 700); }}>
                    Complete kickoff and continue to Sources
                  </Button>
                  <Button onClick={() => { persist(); setToast('Progress saved.'); }}>Save progress</Button>
                </div>
              </div>
            </Card>
          )}

          <div className="flex justify-between mt-4">
            <Button size="sm" disabled={step === 0} onClick={() => { persist(); setStep(step - 1); }}>Back</Button>
            <Button size="sm" disabled={step === STEPS.length - 1} onClick={() => { persist(); setStep(step + 1); }}>Next</Button>
          </div>
        </div>
      </div>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

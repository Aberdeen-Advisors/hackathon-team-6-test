'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useStore } from '@/lib/store/store';
import { Card, Button, Badge, Modal, Field, inputCls, Banner } from '@/components/ui';
import { totalIntakeQuestions, totalPhaseQuestions, INTAKE_SECTIONS } from '@/data/methodology';

export default function EngagementsPage() {
  const { engagements, openEngagement, createBlankEngagement, deleteEngagement, resetDemoEngagement, session, ready, signOut } = useStore();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [client, setClient] = useState('');

  if (!ready) return null;
  if (!session) { router.replace('/login'); return null; }

  const list = Object.values(engagements);
  const demo = list.find((e) => e.mode === 'demo');
  const blanks = list.filter((e) => e.mode === 'blank');

  const go = (id: string, path = '/workspace') => { openEngagement(id); router.push(path); };

  return (
    <div className="min-h-screen bg-onyx-5">
      <header className="bg-aberdeen text-white">
        <div className="max-w-6xl mx-auto flex items-center gap-4 px-6 h-14">
          <Image src="/aberdeen-icon-white.svg" alt="" width={26} height={18} />
          <span className="text-lg font-extralight tracking-tight" style={{ fontWeight: 200 }}>Conductor</span>
          <span className="ml-auto text-2xs text-white/70">{session.name} · {session.role === 'aberdeen' ? 'Aberdeen' : 'Client'}</span>
          <button onClick={() => { signOut(); router.push('/login'); }} className="text-2xs text-white/80 hover:text-white underline">Sign out</button>
        </div>
        <div className="h-0.5 bg-verdigris" />
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-extralight text-aberdeen" style={{ fontWeight: 200 }}>Engagements</h1>
        <p className="text-[13px] text-onyx-60 mt-2 max-w-2xl leading-relaxed">
          Two ways in. Open the completed demonstration to see what the platform produces at the end of a
          transformation engagement, or start a blank engagement and build one from nothing.
        </p>

        <div className="grid lg:grid-cols-2 gap-5 mt-8">
          {/* ---------------- completed demo ---------------- */}
          <Card
            title={<span className="flex items-center gap-2.5">Completed Demo <Badge tone="brand">Reference</Badge></span>}
            subtitle="A finished engagement, sanitised. Every screen is populated as it would be at Board stage."
          >
            {demo ? (
              <>
                <div className="text-[13px] text-aberdeen font-medium">{demo.label}</div>
                <div className="text-2xs text-onyx-60 mt-0.5">
                  Created {new Date(demo.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · {demo.createdBy}
                </div>

                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 mt-4 text-2xs text-onyx">
                  {[
                    `${Object.keys(demo.answers).length} intake responses`,
                    `${demo.model.capabilities.length} capabilities assessed`,
                    `${demo.model.opportunities.length} scored opportunities`,
                    `${demo.model.initiatives.length} initiatives sequenced`,
                    `${demo.model.dependencies.length} dependencies`,
                    `${Object.keys(demo.model.financials).length} costed initiatives`,
                    `${demo.publications.length} published version${demo.publications.length === 1 ? '' : 's'}`,
                    'Executive and client views live',
                  ].map((x) => <li key={x} className="flex gap-1.5"><span className="text-verdigris-700">·</span>{x}</li>)}
                </ul>

                <div className="flex gap-2 mt-5">
                  <Button variant="primary" onClick={() => go(demo.id)}>Open completed demo</Button>
                  <Button onClick={() => { if (confirm('Reset the demonstration engagement to its original state? Blank engagements are unaffected.')) resetDemoEngagement(); }}>
                    Reset
                  </Button>
                </div>
                <p className="text-2xs text-onyx-40 mt-3 leading-relaxed">
                  Fictional client. No real client data is present anywhere in this application.
                </p>
              </>
            ) : <p className="text-[13px] text-onyx-60">Demo engagement unavailable.</p>}
          </Card>

          {/* ---------------- new blank ---------------- */}
          <Card
            title={<span className="flex items-center gap-2.5">Start a New Engagement <Badge tone="accent">Blank</Badge></span>}
            subtitle="Nothing prepopulated. You build the engagement by answering questions, uploading documents and confirming what the analysis produces."
          >
            <div className="rounded border border-onyx-20 bg-onyx-5 px-4 py-3">
              <p className="text-2xs uppercase tracking-wide text-onyx-60 mb-2">What you start with</p>
              <ul className="space-y-1 text-2xs text-onyx">
                {[
                  `${totalIntakeQuestions} intake questions across ${INTAKE_SECTIONS.length} sections`,
                  `${totalPhaseQuestions} phase questions across 7 engagement phases`,
                  'CMMI maturity level definitions',
                  'The three scoring dimensions and their anchored rubrics',
                  'Standard engagement phases and empty-state guidance',
                ].map((x) => <li key={x} className="flex gap-1.5"><span className="text-verdigris-700">·</span>{x}</li>)}
              </ul>
              <p className="text-2xs uppercase tracking-wide text-onyx-60 mt-3 mb-1.5">What you do not start with</p>
              <p className="text-2xs text-onyx-60 leading-relaxed">
                No client information, findings, scores, opportunities, initiatives, roadmap items,
                financial estimates or insights. Demo content cannot reach a blank engagement.
              </p>
            </div>

            <Button variant="primary" className="mt-4" onClick={() => setCreating(true)}>Start a new engagement</Button>

            {blanks.length > 0 && (
              <div className="mt-6 pt-4 border-t border-onyx-10">
                <p className="text-2xs uppercase tracking-wide text-onyx-60 mb-2">Your engagements</p>
                <div className="space-y-1.5">
                  {blanks.map((e) => {
                    const answered = Object.values(e.answers).filter((a) => String(a.value).trim().length > 0).length;
                    return (
                      <div key={e.id} className="flex items-center gap-3 rounded border border-onyx-20 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] text-aberdeen font-medium truncate">{e.label}</div>
                          <div className="text-2xs text-onyx-60">
                            {answered} of {totalIntakeQuestions} intake answers · {e.model.documents.length} document{e.model.documents.length === 1 ? '' : 's'} ·
                            {' '}{e.model.opportunities.length} opportunities
                          </div>
                        </div>
                        <Button size="sm" variant="primary" onClick={() => go(e.id, '/workspace/intake')}>Open</Button>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete "${e.label}"? This cannot be undone.`)) deleteEngagement(e.id); }}>×</Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>

        <p className="text-2xs text-onyx-40 mt-8 max-w-3xl leading-relaxed">
          Prototype. State is held in this browser only — the Aberdeen and client views must be demonstrated
          on the same machine. See the README for what is and is not implemented.
        </p>
      </main>

      <Modal open={creating} onClose={() => setCreating(false)} title="Start a new engagement">
        <Banner tone="accent">
          This creates an empty engagement. Nothing from the demonstration is copied into it.
        </Banner>
        <div className="mt-4">
          <Field label="Client or organisation name" hint="You can refine this during intake.">
            <input className={inputCls} value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. Northgate Industrial" />
          </Field>
          <Field label="Engagement name">
            <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Technology Strategy & Roadmap" />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={() => setCreating(false)}>Cancel</Button>
          <Button size="sm" variant="primary" disabled={client.trim().length < 2 || label.trim().length < 2}
            onClick={() => {
              const id = createBlankEngagement(`${client.trim()} — ${label.trim()}`, client.trim());
              setCreating(false); setClient(''); setLabel('');
              openEngagement(id); router.push('/workspace/intake');
            }}>
            Create and begin intake
          </Button>
        </div>
      </Modal>
    </div>
  );
}

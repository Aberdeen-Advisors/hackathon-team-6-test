'use client';

import { useState, useRef } from 'react';
import { useStore } from '@/lib/store/store';
import { PageHeader } from '@/components/Shell';
import { JourneyRail } from '@/components/JourneyRail';
import {
  Card, Button, Badge, Modal, Toast, Field, inputCls, Banner, SectionTitle, EmptyState, SidePanel,
} from '@/components/ui';
import { parseDocx, FUTURE_FORMATS } from '@/lib/ingest/docx';
import { generateInsights, CLASS_META, type Insight, type InsightClass } from '@/lib/insights/engine';
import { buildPrefills } from '@/lib/ingest/prefill';
import { INTAKE_SECTIONS, PHASE_QUESTIONNAIRES } from '@/data/methodology';
import Link from 'next/link';
import type { Candidate, CandidateKind } from '@/lib/ingest/synthesise';
import { money } from '@/lib/calc/financials';

type Stage = 'idle' | 'reading' | 'parsing' | 'synthesising' | 'analysing' | 'mapping' | 'done' | 'error';

const KIND_META: Record<CandidateKind, { label: string; tone: 'brand' | 'accent' | 'warn' | 'danger' | 'ok'; lands: string }> = {
  objective:   { label: 'Objective',  tone: 'brand',  lands: 'Transformation objectives — becomes selectable in strategic-alignment scoring' },
  opportunity: { label: 'Opportunity', tone: 'accent', lands: 'Opportunity backlog — enters unscored, awaiting prioritisation' },
  dependency:  { label: 'Dependency', tone: 'warn',   lands: 'Roadmap dependencies — proposed, does not constrain the schedule until validated' },
  financial:   { label: 'Financial',  tone: 'ok',     lands: 'Financial model — populates a cost line on the chosen initiative' },
  risk:        { label: 'Risk',       tone: 'danger', lands: 'Risk register — appears on the roadmap and in executive views' },
};

export default function SourcesPage() {
  const { model, addDocument, removeDocument, acceptCandidate, rejectCandidate, addInsightDecision, suggestAnswer, isBlank } = useStore();
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<{ docId: string; c: Candidate } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [prefillCount, setPrefillCount] = useState(0);
  const [insightTab, setInsightTab] = useState<'insights' | 'candidates'>('insights');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setError(`${file.name} is not a .docx file. Word documents are the supported format in this build.`);
      setStage('error');
      return;
    }
    try {
      setStage('reading'); setProgress(`Reading ${file.name}…`);
      await new Promise((r) => setTimeout(r, 260));

      setStage('parsing'); setProgress('Extracting document structure — headings, paragraphs and lists…');
      const structure = await parseDocx(file);

      setStage('synthesising');
      setProgress(`Reading ${structure.paragraphs.length} paragraphs across ${structure.sections.length} sections…`);
      const { synthesise } = await import('@/lib/ingest/synthesise');
      await new Promise((r) => setTimeout(r, 360));
      const synthesis = synthesise(structure);

      setStage('analysing');
      setProgress('Looking across the evidence for what a partner would react to…');
      await new Promise((r) => setTimeout(r, 520));
      const insights = generateInsights(structure);

      setStage('mapping');
      setProgress('Matching evidence to open questionnaire questions…');
      await new Promise((r) => setTimeout(r, 320));
      const prefills = buildPrefills(structure);

      const id = addDocument(file.name, 'client_document', structure, synthesis, insights);
      const allQ = new Map([...INTAKE_SECTIONS.flatMap((x) => x.questions), ...PHASE_QUESTIONNAIRES.flatMap((p) => p.sections.flatMap((x) => x.questions))].map((x) => [x.id, x]));
      for (const pf of prefills) {
        if (!allQ.has(pf.questionId)) continue;
        suggestAnswer(pf.questionId, {
          value: pf.value, documentId: id, documentName: file.name,
          excerpt: pf.excerpt, paragraphIndex: pf.paragraphIndex, confidence: pf.confidence, status: 'pending',
        });
      }

      setStage('done');
      setPrefillCount(prefills.length);
      setProgress(`${insights.length} insights, ${synthesis.candidates.length} candidate findings and ${prefills.length} suggested questionnaire answers.`);
      setOpenDoc(id);
      setToast(`${file.name} analysed — ${insights.length} insights and ${prefills.length} suggested answers ready for review.`);
    } catch (e) {
      setStage('error');
      setError(e instanceof Error ? e.message : 'The document could not be read.');
    }
  }

  const doc = openDoc ? model.documents.find((d) => d.id === openDoc) : null;
  const busy = ['reading', 'parsing', 'synthesising', 'analysing', 'mapping'].includes(stage);

  return (
    <div className="p-6">
      <PageHeader
        title="Sources and synthesis"
        subtitle="Upload engagement material and the application reads it — extracting objectives, capability gaps, prerequisites, financial figures and risks, each anchored to the paragraph it came from. Nothing enters the model until you accept it."
      />
      <JourneyRail />

      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5">
          <Card title="Upload a document" subtitle="Word (.docx) is fully functional in this build.">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              className={`rounded border-2 border-dashed px-6 py-10 text-center transition-colors ${
                busy ? 'border-verdigris bg-verdigris-50' : 'border-onyx-20 hover:border-verdigris hover:bg-verdigris-50/50'
              }`}
            >
              {busy ? (
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2.5 text-[13px] text-aberdeen">
                    <span className="h-2 w-2 rounded-full bg-verdigris animate-pulse" />
                    {progress}
                  </div>
                  <div className="flex justify-center gap-1.5">
                    {(['reading', 'parsing', 'synthesising', 'analysing', 'mapping'] as const).map((st) => (
                      <span key={st} className={`h-1 w-14 rounded-full ${
                        (['reading', 'parsing', 'synthesising', 'analysing', 'mapping'] as string[]).indexOf(stage) >=
                        (['reading', 'parsing', 'synthesising', 'analysing', 'mapping'] as string[]).indexOf(st)
                          ? 'bg-verdigris' : 'bg-onyx-10'
                      }`} />
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-[13px] text-onyx">Drop a Word document here, or</p>
                  <Button variant="primary" size="sm" className="mt-2.5" onClick={() => fileRef.current?.click()}>
                    Choose a .docx file
                  </Button>
                  <input ref={fileRef} type="file" accept=".docx" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
                  <p className="text-2xs text-onyx-60 mt-3 max-w-md mx-auto leading-relaxed">
                    A sample engagement document is included at{' '}
                    <a href="/samples/meridian-discovery-notes.docx" download className="text-aberdeen underline">
                      /samples/meridian-discovery-notes.docx
                    </a>{' '}
                    — or upload any Word document of your own.
                  </p>
                </>
              )}
            </div>

            {error && (
              <div className="mt-3">
                <Banner tone="warn">{error}</Banner>
              </div>
            )}
            {stage === 'done' && !busy && (
              <div className="mt-3 space-y-2">
                <Banner tone="accent">{progress}</Banner>
                {prefillCount > 0 && (
                  <Banner tone="accent" action={<Link href="/workspace/intake"><Button size="sm">Review answers</Button></Link>}>
                    {prefillCount} questionnaire answer{prefillCount === 1 ? '' : 's'} suggested from this document.
                  </Banner>
                )}
              </div>
            )}
          </Card>

          <Card title="Ingested documents" subtitle={`${model.documents.length} document${model.documents.length === 1 ? '' : 's'} in the fact base.`}>
            {model.documents.length === 0 ? (
              <EmptyState title="No documents yet" body="Upload a Word document to see it parsed, synthesised, and turned into reviewable findings." />
            ) : (
              <div className="space-y-2">
                {model.documents.map((d) => {
                  const accepted = Object.values(d.decisions).filter((x) => x.status === 'accepted').length;
                  const rejected = Object.values(d.decisions).filter((x) => x.status === 'rejected').length;
                  const pending = d.synthesis.candidates.length - accepted - rejected;
                  return (
                    <div key={d.id} className="border border-onyx-20 rounded px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium text-aberdeen truncate">{d.filename}</div>
                          <div className="text-2xs text-onyx-60 mt-0.5">
                            {d.structure.wordCount.toLocaleString()} words · {d.structure.sections.length} sections ·
                            {' '}{d.synthesis.stats.entities} entities · {d.synthesis.stats.metrics} metrics ·
                            {' '}uploaded by {d.uploadedBy}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {pending > 0 && <Badge tone="warn">{pending} awaiting review</Badge>}
                            {accepted > 0 && <Badge tone="ok">{accepted} accepted</Badge>}
                            {rejected > 0 && <Badge>{rejected} rejected</Badge>}
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button size="sm" variant="primary" onClick={() => setOpenDoc(d.id)}>Review</Button>
                          <Button size="sm" variant="ghost" onClick={() => { if (confirm('Remove this document? Findings already accepted into the model are kept.')) removeDocument(d.id); }}>×</Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Information requested at kickoff">
            {model.kickoff.documentRequests.length === 0 ? (
              <p className="text-[13px] text-onyx-60">No document requests recorded. Set these on the Kickoff screen.</p>
            ) : (
              <ul className="space-y-1.5">
                {model.kickoff.documentRequests.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-[13px] text-onyx">
                    <span className="text-onyx-20 mt-0.5">□</span>{r}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Other formats">
            <p className="text-[13px] text-onyx-60 leading-relaxed mb-3">
              Only Word is functional in this build. These are specified but not implemented, and are
              deliberately not offered as upload controls.
            </p>
            <ul className="space-y-2">
              {FUTURE_FORMATS.map((f) => (
                <li key={f.ext} className="border border-onyx-20 rounded px-3 py-2 bg-onyx-5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-2xs text-onyx-60">{f.ext}</span>
                    <span className="text-[13px] text-onyx">{f.label}</span>
                    <Badge>Future capability</Badge>
                  </div>
                  <p className="text-2xs text-onyx-60 mt-1 leading-relaxed">{f.note}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* ---------------- synthesis review ---------------- */}
      <SidePanel open={!!doc} onClose={() => setOpenDoc(null)} title={doc?.filename ?? ''}
        subtitle={doc ? `${doc.synthesis.candidates.length} candidate findings · ${doc.structure.wordCount.toLocaleString()} words` : ''}
        width="w-[760px]">
        {doc && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-2">
              {[
                ['Paragraphs', doc.synthesis.stats.paragraphs], ['Sentences', doc.synthesis.stats.sentences],
                ['Entities', doc.synthesis.stats.entities], ['Metrics', doc.synthesis.stats.metrics],
              ].map(([l, v]) => (
                <div key={l as string} className="border border-onyx-20 rounded px-3 py-2 text-center">
                  <div className="text-lg font-light text-aberdeen tabular-nums">{v as number}</div>
                  <div className="text-2xs text-onyx-60">{l as string}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-1.5">
              {([['insights', `Insights (${doc.insights.length})`], ['candidates', `Structured findings (${doc.synthesis.candidates.length})`]] as const).map(([k, label]) => (
                <button key={k} onClick={() => setInsightTab(k)}
                  className={`rounded-sm border px-3 py-1.5 text-2xs transition-colors ${
                    insightTab === k ? 'bg-aberdeen text-white border-aberdeen' : 'bg-white text-onyx border-onyx-20 hover:border-aberdeen-200'
                  }`}>{label}</button>
              ))}
            </div>

            {insightTab === 'insights' && (
              <div>
                <SectionTitle note="cross-document analysis — accept, edit, reject or reclassify each">
                  What a partner would take from this
                </SectionTitle>
                {doc.insights.length === 0 ? (
                  <p className="text-[13px] text-onyx-60 leading-relaxed">
                    No insights fired. The engine only emits an insight when it can find the specifics — the systems,
                    the counts, the quoted language. A document without those produces nothing rather than a generic
                    observation.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {doc.insights.map((ins) => (
                      <InsightCard key={ins.id} insight={ins}
                        decision={doc.insightDecisions[ins.id]}
                        onDecide={(status, note, newClass) => addInsightDecision(doc.id, ins.id, status, note, newClass)} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {insightTab === 'candidates' && doc.synthesis.themes.length > 0 && (
              <div>
                <SectionTitle note="clustered by topic across the document">Themes</SectionTitle>
                <div className="space-y-2">
                  {doc.synthesis.themes.map((t) => (
                    <div key={t.id} className="border-l-2 border-verdigris pl-3 py-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-aberdeen">{t.label}</span>
                        <Badge>{t.paragraphIndices.length} passage{t.paragraphIndices.length === 1 ? '' : 's'}</Badge>
                      </div>
                      <p className="text-2xs text-onyx-60 mt-1 leading-relaxed">{t.representative}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insightTab === 'candidates' && doc.synthesis.takeaways.length > 0 && (
              <div>
                <SectionTitle>Key takeaways</SectionTitle>
                <ul className="space-y-1.5">
                  {doc.synthesis.takeaways.map((t, i) => (
                    <li key={i} className="text-[13px] text-onyx leading-relaxed flex gap-2">
                      <span className="text-verdigris-700 shrink-0">·</span>
                      <span>{t.text} <span className="text-2xs text-onyx-40">(¶{t.paragraphIndex + 1})</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {insightTab === 'candidates' && doc.synthesis.watchOuts.length > 0 && (
              <div>
                <SectionTitle>Watch-outs</SectionTitle>
                <div className="space-y-1.5">
                  {doc.synthesis.watchOuts.map((w, i) => (
                    <div key={i} className={`rounded border px-3 py-2 ${w.severity === 'high' ? 'border-jasper/40 bg-jasper-tint' : 'border-gold/40 bg-gold-tint'}`}>
                      <p className="text-[13px] text-onyx leading-relaxed">{w.text}</p>
                      <p className="text-2xs text-onyx-60 mt-1">{w.severity} severity · ¶{w.paragraphIndex + 1}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insightTab === 'candidates' && <div>
              <SectionTitle note="nothing enters the model until accepted">Candidate findings</SectionTitle>
              {doc.synthesis.candidates.length === 0 ? (
                <p className="text-[13px] text-onyx-60 leading-relaxed">
                  No candidates were extracted. The document carries no objective, gap, prerequisite,
                  financial or risk language that the engine recognises.
                </p>
              ) : (
                <div className="space-y-2">
                  {doc.synthesis.candidates.map((c) => {
                    const dec = doc.decisions[c.id];
                    const meta = KIND_META[c.kind];
                    return (
                      <div key={c.id} className={`border rounded px-3.5 py-3 ${
                        dec?.status === 'accepted' ? 'border-jade/50 bg-jade-tint'
                          : dec?.status === 'rejected' ? 'border-onyx-20 bg-onyx-5 opacity-60' : 'border-onyx-20'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone={meta.tone}>{meta.label}</Badge>
                              <span className="text-2xs text-onyx-40">confidence {c.confidence.toFixed(2)}</span>
                              <span className="text-2xs text-onyx-40">¶{c.paragraphIndex + 1} · {c.section}</span>
                            </div>
                            <p className="text-[13px] text-onyx mt-1.5 leading-relaxed">&ldquo;{c.excerpt}&rdquo;</p>
                            {c.amount !== undefined && (
                              <p className="text-2xs text-aberdeen mt-1">Detected amount: {money(c.amount)} ({c.amountLabel})</p>
                            )}
                            {(c.entities.length > 0 || c.metrics.length > 0) && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {[...c.entities.slice(0, 4), ...c.metrics.slice(0, 3)].map((x) => (
                                  <span key={x} className="rounded-sm bg-white border border-onyx-20 px-1.5 py-0.5 text-2xs text-onyx-60">{x}</span>
                                ))}
                              </div>
                            )}
                            <p className="text-2xs text-onyx-60 mt-1.5 italic">→ {meta.lands}</p>
                            {dec?.status === 'accepted' && dec.landedAs && (
                              <p className="text-2xs text-jade mt-1 font-medium">✓ Accepted — created {dec.landedAs}</p>
                            )}
                          </div>
                          {!dec && (
                            <div className="flex flex-col gap-1.5 shrink-0">
                              <Button size="sm" variant="primary" onClick={() => setAccepting({ docId: doc.id, c })}>Accept</Button>
                              <Button size="sm" onClick={() => rejectCandidate(doc.id, c.id)}>Reject</Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>}
          </div>
        )}
      </SidePanel>

      <AcceptModal
        pending={accepting} onClose={() => setAccepting(null)}
        initiatives={model.initiatives}
        onAccept={(docId, c, target) => {
          const landed = acceptCandidate(docId, c, target);
          setAccepting(null);
          setToast(`Accepted — ${landed}.`);
        }}
      />

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function AcceptModal({
  pending, onClose, initiatives, onAccept,
}: {
  pending: { docId: string; c: Candidate } | null;
  onClose: () => void;
  initiatives: { id: string; name: string }[];
  onAccept: (docId: string, c: Candidate, target: Record<string, string>) => void;
}) {
  const c = pending?.c;
  const [title, setTitle] = useState('');
  const [initiativeId, setInitiativeId] = useState('');
  const [upstreamId, setUpstreamId] = useState('');
  const [downstreamId, setDownstreamId] = useState('');
  const [line, setLine] = useState('oneTimeImplementation');
  const [action, setAction] = useState('');

  if (!c || !pending) return null;
  const meta = KIND_META[c.kind];

  const ready =
    c.kind === 'dependency' ? !!upstreamId && !!downstreamId && upstreamId !== downstreamId
      : c.kind === 'opportunity' || c.kind === 'financial' ? !!initiativeId
      : true;

  return (
    <Modal open onClose={onClose} title={`Accept ${meta.label.toLowerCase()}`} width="max-w-2xl">
      <div className="rounded border border-onyx-20 bg-onyx-5 px-3 py-2.5 mb-4">
        <p className="text-[13px] text-onyx leading-relaxed">&ldquo;{c.excerpt}&rdquo;</p>
        <p className="text-2xs text-onyx-40 mt-1">¶{c.paragraphIndex + 1} · {c.section} · confidence {c.confidence.toFixed(2)}</p>
      </div>

      {c.kind === 'objective' && (
        <Field label="Objective title" hint="This becomes selectable when scoring strategic alignment.">
          <input className={inputCls} value={title || c.title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
      )}

      {c.kind === 'opportunity' && (
        <>
          <Field label="Opportunity title"><input className={inputCls} value={title || c.title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Assign to initiative" hint="The opportunity enters the backlog unscored — you will score it on the Prioritise step.">
            <select className={inputCls} value={initiativeId} onChange={(e) => setInitiativeId(e.target.value)}>
              <option value="">Select an initiative…</option>
              {initiatives.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </Field>
          <Field label="Recommended action" hint="Written as a concrete directive.">
            <input className={inputCls} value={action} onChange={(e) => setAction(e.target.value)} placeholder="Define scope and owner, then size the effort." />
          </Field>
        </>
      )}

      {c.kind === 'dependency' && (
        <>
          {c.upstreamHint && <p className="text-2xs text-onyx-60 mb-3">Detected phrasing suggests: &ldquo;{c.upstreamHint}&rdquo; → &ldquo;{c.downstreamHint}&rdquo;</p>}
          <Field label="Must complete first">
            <select className={inputCls} value={upstreamId} onChange={(e) => setUpstreamId(e.target.value)}>
              <option value="">Select…</option>
              {initiatives.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </Field>
          <Field label="Before this can start" hint="Created as PROPOSED — it does not constrain the schedule until validated on the Roadmap screen.">
            <select className={inputCls} value={downstreamId} onChange={(e) => setDownstreamId(e.target.value)}>
              <option value="">Select…</option>
              {initiatives.filter((i) => i.id !== upstreamId).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </Field>
        </>
      )}

      {c.kind === 'financial' && (
        <>
          <Banner tone="accent">Detected amount: <strong>{money(c.amount ?? null)}</strong> from &ldquo;{c.amountLabel}&rdquo;</Banner>
          <div className="mt-4">
            <Field label="Apply to initiative">
              <select className={inputCls} value={initiativeId} onChange={(e) => setInitiativeId(e.target.value)}>
                <option value="">Select an initiative…</option>
                {initiatives.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </Field>
            <Field label="Cost or benefit line">
              <select className={inputCls} value={line} onChange={(e) => setLine(e.target.value)}>
                <option value="oneTimeImplementation">One-time implementation</option>
                <option value="internalLabour">Internal labour</option>
                <option value="externalLabour">External labour</option>
                <option value="technologyVendor">Technology / vendor</option>
                <option value="recurringOperatingAnnual">Recurring operating (annual)</option>
                <option value="expectedSavingsAnnual">Expected savings (annual)</option>
                <option value="revenueOpportunityAnnual">Revenue opportunity (annual)</option>
                <option value="costAvoidanceAnnual">Cost avoidance (annual)</option>
              </select>
            </Field>
          </div>
        </>
      )}

      {c.kind === 'risk' && (
        <Field label="Link to an initiative (optional)" hint="Linked risks appear against that initiative on the roadmap.">
          <select className={inputCls} value={initiativeId} onChange={(e) => setInitiativeId(e.target.value)}>
            <option value="">Not linked to a specific initiative</option>
            {initiatives.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </Field>
      )}

      <div className="flex justify-end gap-2 mt-2">
        <Button size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" variant="primary" disabled={!ready}
          onClick={() => onAccept(pending.docId, c, { title: title || c.title, initiativeId, upstreamId, downstreamId, line, recommendedAction: action })}>
          Accept into the model
        </Button>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────── partner-quality insight card */

function InsightCard({
  insight, decision, onDecide,
}: {
  insight: Insight;
  decision?: { status: string; note?: string; newClass?: string };
  onDecide: (status: 'accepted' | 'rejected' | 'reclassified', note?: string, newClass?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reclass, setReclass] = useState(false);
  const cls = (decision?.newClass as InsightClass) ?? insight.classification;
  const meta = CLASS_META[cls];

  const confTone = insight.confidence === 'high' ? 'ok' : insight.confidence === 'medium' ? 'warn' : 'danger';
  const classTone = cls === 'contradiction' ? 'danger' : cls === 'gap' ? 'warn' : cls === 'fact' ? 'brand' : 'accent';

  return (
    <div className={`border rounded ${decision?.status === 'accepted' ? 'border-jade/50 bg-jade-tint'
      : decision?.status === 'rejected' ? 'border-onyx-20 bg-onyx-5 opacity-60' : 'border-onyx-20'}`}>
      <button onClick={() => setOpen((v) => !v)} className="w-full text-left px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[13px] font-medium text-aberdeen leading-snug">{insight.headline}</p>
          <span className="text-onyx-40 text-xs shrink-0 mt-0.5">{open ? '−' : '+'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <Badge tone={classTone as 'brand'}>{meta.label}</Badge>
          <Badge tone={confTone as 'ok'}>{insight.confidence} confidence</Badge>
          <span className="text-2xs text-onyx-40">{insight.evidence.length} evidence item{insight.evidence.length === 1 ? '' : 's'}</span>
          {insight.topics.slice(0, 2).map((t) => <span key={t} className="text-2xs text-onyx-40">· {t}</span>)}
          {decision?.status === 'accepted' && <Badge tone="ok">Accepted</Badge>}
          {decision?.status === 'rejected' && <Badge>Rejected</Badge>}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-onyx-10 pt-3">
          {([
            ['What we observed', insight.observed],
            ['Why it matters', insight.whyItMatters],
            ['Likely root cause', insight.rootCause],
            ['Roadmap implication', insight.roadmapImplication],
            ['Recommended response', insight.recommendedResponse],
          ] as [string, string | null][]).filter(([, v]) => v).map(([label, v]) => (
            <div key={label}>
              <div className="text-2xs uppercase tracking-wide text-onyx-60 mb-1">{label}</div>
              <p className="text-[13px] text-onyx leading-relaxed">{v}</p>
            </div>
          ))}

          <div>
            <div className="text-2xs uppercase tracking-wide text-onyx-60 mb-1">Evidence</div>
            <div className="space-y-1.5">
              {insight.evidence.map((e, i) => (
                <div key={i} className="rounded border border-onyx-20 bg-white px-3 py-2">
                  <p className="text-2xs text-onyx leading-relaxed">&ldquo;{e.excerpt}&rdquo;</p>
                  <p className="text-2xs text-onyx-40 mt-1">{e.documentName} · {e.section} · paragraph {e.paragraphIndex + 1}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <div className="text-2xs uppercase tracking-wide text-onyx-60 mb-1">Confidence</div>
              <p className="text-2xs text-onyx leading-relaxed">{insight.confidenceReason}</p>
            </div>
            <div>
              <div className="text-2xs uppercase tracking-wide text-onyx-60 mb-1">Classification</div>
              <p className="text-2xs text-onyx leading-relaxed">{meta.note}</p>
            </div>
          </div>

          <div className="rounded border border-verdigris-200 bg-verdigris-50 px-3 py-2">
            <div className="text-2xs uppercase tracking-wide text-onyx-60 mb-1">Open question</div>
            <p className="text-[13px] text-aberdeen leading-relaxed">{insight.openQuestion}</p>
          </div>

          {!decision && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Button size="sm" variant="primary" onClick={() => onDecide('accepted')}>Accept</Button>
              <Button size="sm" onClick={() => setReclass((v) => !v)}>Reclassify</Button>
              <Button size="sm" variant="ghost" onClick={() => onDecide('rejected')}>Reject</Button>
            </div>
          )}

          {reclass && !decision && (
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(CLASS_META) as InsightClass[]).map((k) => (
                <button key={k} onClick={() => { onDecide('reclassified', undefined, k); setReclass(false); }}
                  className="rounded-sm border border-onyx-20 px-2 py-1 text-2xs text-onyx hover:border-verdigris hover:bg-verdigris-50">
                  {CLASS_META[k].label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

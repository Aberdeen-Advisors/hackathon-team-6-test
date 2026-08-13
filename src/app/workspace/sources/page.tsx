'use client';

import { useState, useRef } from 'react';
import { useStore } from '@/lib/store/store';
import { PageHeader } from '@/components/Shell';
import { JourneyRail } from '@/components/JourneyRail';
import {
  Card, Button, Badge, Modal, Toast, Field, inputCls, Banner, SectionTitle, EmptyState, SidePanel,
} from '@/components/ui';
import { parseDocx, FUTURE_FORMATS } from '@/lib/ingest/docx';
import type { Candidate, CandidateKind } from '@/lib/ingest/synthesise';
import { money } from '@/lib/calc/financials';

type Stage = 'idle' | 'reading' | 'parsing' | 'synthesising' | 'done' | 'error';

const KIND_META: Record<CandidateKind, { label: string; tone: 'brand' | 'accent' | 'warn' | 'danger' | 'ok'; lands: string }> = {
  objective:   { label: 'Objective',  tone: 'brand',  lands: 'Transformation objectives — becomes selectable in strategic-alignment scoring' },
  opportunity: { label: 'Opportunity', tone: 'accent', lands: 'Opportunity backlog — enters unscored, awaiting prioritisation' },
  dependency:  { label: 'Dependency', tone: 'warn',   lands: 'Roadmap dependencies — proposed, does not constrain the schedule until validated' },
  financial:   { label: 'Financial',  tone: 'ok',     lands: 'Financial model — populates a cost line on the chosen initiative' },
  risk:        { label: 'Risk',       tone: 'danger', lands: 'Risk register — appears on the roadmap and in executive views' },
};

export default function SourcesPage() {
  const { model, addDocument, removeDocument, acceptCandidate, rejectCandidate } = useStore();
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<{ docId: string; c: Candidate } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
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
      setProgress(`Synthesising ${structure.paragraphs.length} paragraphs across ${structure.sections.length} sections…`);
      const { synthesise } = await import('@/lib/ingest/synthesise');
      await new Promise((r) => setTimeout(r, 420));
      const synthesis = synthesise(structure);

      const id = addDocument(file.name, 'client_document', structure, synthesis);
      setStage('done');
      setProgress(`${synthesis.candidates.length} candidate findings extracted from ${structure.wordCount.toLocaleString()} words.`);
      setOpenDoc(id);
      setToast(`${file.name} synthesised — ${synthesis.candidates.length} findings ready for review.`);
    } catch (e) {
      setStage('error');
      setError(e instanceof Error ? e.message : 'The document could not be read.');
    }
  }

  const doc = openDoc ? model.documents.find((d) => d.id === openDoc) : null;
  const busy = stage === 'reading' || stage === 'parsing' || stage === 'synthesising';

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
                    {['reading', 'parsing', 'synthesising'].map((s) => (
                      <span key={s} className={`h-1 w-20 rounded-full ${
                        ['reading', 'parsing', 'synthesising'].indexOf(stage) >= ['reading', 'parsing', 'synthesising'].indexOf(s)
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
              <div className="mt-3"><Banner tone="accent">{progress}</Banner></div>
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

            {doc.synthesis.themes.length > 0 && (
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

            {doc.synthesis.takeaways.length > 0 && (
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

            {doc.synthesis.watchOuts.length > 0 && (
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

            <div>
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
            </div>
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

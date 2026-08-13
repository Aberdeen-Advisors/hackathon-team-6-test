'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store/store';
import { Card, Button, Badge, Banner, inputCls, SectionTitle, Modal } from '@/components/ui';
import type { QSection, Question } from '@/data/methodology';

/**
 * One renderer for every questionnaire in the product — Layer 1 setup and all seven
 * Layer 3 phase questionnaires. Driven by the declarative schema in data/methodology.ts.
 *
 * Rules implemented here, from the brief:
 *  · a document-derived value is marked AI suggested and is never confirmed until approved
 *  · a manual answer is authoritative and is never silently overwritten
 *  · a later contradicting document raises a conflict rather than replacing the answer
 *  · every answer shows what it is used in downstream
 *  · every change is kept in history
 */

export function Questionnaire({
  sections, title, intro, onComplete, completeLabel,
}: {
  sections: QSection[];
  title: string;
  intro?: string;
  onComplete?: () => void;
  completeLabel?: string;
}) {
  const { answers, setAnswer, resolveSuggestion, resolveConflict, isBlank } = useStore();
  const [active, setActive] = useState(sections[0]?.id ?? '');
  const [lineage, setLineage] = useState<Question | null>(null);
  const [editSuggestion, setEditSuggestion] = useState<{ q: Question; value: string } | null>(null);

  const section = sections.find((s) => s.id === active) ?? sections[0];
  if (!section) return null;

  const answeredIn = (s: QSection) =>
    s.questions.filter((q) => {
      const a = answers[q.id];
      return a && (Array.isArray(a.value) ? a.value.length > 0 : String(a.value).trim().length > 0);
    }).length;

  const totalAnswered = sections.reduce((n, s) => n + answeredIn(s), 0);
  const totalQuestions = sections.reduce((n, s) => n + s.questions.length, 0);
  const pendingSuggestions = sections.flatMap((s) => s.questions).filter((q) => answers[q.id]?.suggestion?.status === 'pending').length;
  const conflicts = sections.flatMap((s) => s.questions).filter((q) => answers[q.id]?.conflict).length;

  return (
    <div>
      <div className="flex items-start justify-between gap-6 mb-5">
        <div>
          <h2 className="text-xl font-light text-aberdeen">{title}</h2>
          {intro && <p className="text-[13px] text-onyx-60 mt-1.5 max-w-3xl leading-relaxed">{intro}</p>}
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-light text-aberdeen tabular-nums">{totalAnswered}<span className="text-onyx-40 text-base">/{totalQuestions}</span></div>
          <div className="text-2xs text-onyx-60">answered</div>
        </div>
      </div>

      {(pendingSuggestions > 0 || conflicts > 0) && (
        <div className="mb-4 space-y-2">
          {pendingSuggestions > 0 && (
            <Banner tone="accent">
              <strong className="font-medium">{pendingSuggestions} suggested answer{pendingSuggestions === 1 ? '' : 's'} from uploaded documents</strong>{' '}
              awaiting your review. Nothing is confirmed until you approve it.
            </Banner>
          )}
          {conflicts > 0 && (
            <Banner tone="warn">
              <strong className="font-medium">{conflicts} conflict{conflicts === 1 ? '' : 's'}.</strong>{' '}
              A later document contradicts an answer you confirmed. Your answer has been kept — resolve the conflict below.
            </Banner>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-[260px_1fr] gap-5">
        <nav className="space-y-1">
          {sections.map((s) => {
            const n = answeredIn(s);
            const pend = s.questions.filter((q) => answers[q.id]?.suggestion?.status === 'pending').length;
            const conf = s.questions.filter((q) => answers[q.id]?.conflict).length;
            return (
              <button key={s.id} onClick={() => setActive(s.id)}
                className={`w-full text-left rounded px-3 py-2.5 border transition-colors ${
                  active === s.id ? 'bg-aberdeen text-white border-aberdeen' : 'bg-white border-onyx-20 hover:border-aberdeen-200'
                }`}>
                <div className="flex items-center gap-2">
                  <span className={`text-[13px] font-medium flex-1 ${active === s.id ? 'text-white' : 'text-aberdeen'}`}>{s.title}</span>
                  {pend > 0 && <span className="h-1.5 w-1.5 rounded-full bg-verdigris" title={`${pend} suggested`} />}
                  {conf > 0 && <span className="h-1.5 w-1.5 rounded-full bg-jasper" title={`${conf} conflict`} />}
                </div>
                <div className={`text-2xs mt-0.5 tabular-nums ${active === s.id ? 'text-white/60' : 'text-onyx-40'}`}>
                  {n} of {s.questions.length}
                </div>
              </button>
            );
          })}
          {onComplete && (
            <Button variant="primary" className="w-full mt-3" onClick={onComplete}>{completeLabel ?? 'Complete'}</Button>
          )}
        </nav>

        <Card title={section.title} subtitle={section.intent}>
          <div className="space-y-5">
            {section.questions.map((q) => (
              <QuestionField key={q.id} q={q}
                onLineage={() => setLineage(q)}
                onEditSuggestion={(v) => setEditSuggestion({ q, value: v })}
              />
            ))}
          </div>

          {isBlank && answeredIn(section) === 0 && (
            <div className="mt-6 pt-4 border-t border-onyx-10">
              <p className="text-2xs text-onyx-60 leading-relaxed">
                Nothing answered in this section yet. Answers here feed the analysis directly — the
                &ldquo;Used in&rdquo; note beneath each question shows exactly where. You can also upload a document on
                the Sources screen and let the application propose answers for you to review.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* lineage */}
      <Modal open={!!lineage} onClose={() => setLineage(null)} title="Where this answer is used">
        {lineage && (
          <>
            <p className="text-[13px] text-aberdeen font-medium mb-1">{lineage.label}</p>
            <p className="text-2xs text-onyx-60 mb-4">
              Changing this answer affects everything listed here. Downstream values recalculate; generated
              outputs are flagged as stale rather than silently regenerated.
            </p>
            <ul className="space-y-1.5">
              {lineage.usedIn.map((u) => (
                <li key={u} className="flex items-start gap-2 text-[13px] text-onyx border-b border-onyx-10 pb-1.5 last:border-0">
                  <span className="text-verdigris-700 shrink-0">→</span>{u}
                </li>
              ))}
            </ul>
          </>
        )}
      </Modal>

      {/* edit a suggestion before accepting */}
      <Modal open={!!editSuggestion} onClose={() => setEditSuggestion(null)} title="Edit before accepting">
        {editSuggestion && (
          <>
            <p className="text-[13px] text-aberdeen font-medium mb-2">{editSuggestion.q.label}</p>
            <textarea className={inputCls} rows={4} value={editSuggestion.value}
              onChange={(e) => setEditSuggestion({ ...editSuggestion, value: e.target.value })} />
            <p className="text-2xs text-onyx-60 mt-2">
              Your edit becomes the authoritative answer. The original suggestion is kept in history.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button size="sm" onClick={() => setEditSuggestion(null)}>Cancel</Button>
              <Button size="sm" variant="primary"
                onClick={() => { resolveSuggestion(editSuggestion.q.id, 'edited', editSuggestion.value); setEditSuggestion(null); }}>
                Save as my answer
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );

  function QuestionField({ q, onLineage, onEditSuggestion }: { q: Question; onLineage: () => void; onEditSuggestion: (v: string) => void }) {
    const a = answers[q.id];
    const value = a?.value ?? (q.type === 'multiselect' ? [] : '');
    const asText = Array.isArray(value) ? value.join('\n') : String(value);
    const sug = a?.suggestion;
    const showSuggestion = sug && sug.status === 'pending';

    return (
      <div className="border-b border-onyx-10 pb-5 last:border-0 last:pb-0">
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <label className="text-[13px] font-medium text-aberdeen leading-snug">
            {q.label}
            {q.required && <span className="text-jasper ml-1">*</span>}
          </label>
          <div className="flex items-center gap-1.5 shrink-0">
            {a?.source === 'ai_accepted' && <Badge tone="accent">From document</Badge>}
            {a?.conflict && <Badge tone="danger">Conflict</Badge>}
          </div>
        </div>
        {q.help && <p className="text-2xs text-onyx-60 mb-2 leading-relaxed">{q.help}</p>}

        {showSuggestion && (
          <div className="rounded border border-verdigris-200 bg-verdigris-50 px-3 py-2.5 mb-2.5">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge tone="accent">AI suggested from document</Badge>
              <span className="text-2xs text-onyx-60">confidence {sug.confidence.toFixed(2)}</span>
            </div>
            <p className="text-[13px] text-onyx whitespace-pre-wrap leading-relaxed">{sug.value}</p>
            <p className="text-2xs text-onyx-60 mt-2 italic leading-relaxed">
              &ldquo;{sug.excerpt}&rdquo;
            </p>
            <p className="text-2xs text-onyx-40 mt-1">{sug.documentName} · paragraph {sug.paragraphIndex + 1}</p>
            <div className="flex gap-1.5 mt-2.5">
              <Button size="sm" variant="primary" onClick={() => resolveSuggestion(q.id, 'accepted')}>Accept</Button>
              <Button size="sm" onClick={() => onEditSuggestion(sug.value)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => resolveSuggestion(q.id, 'rejected')}>Reject</Button>
            </div>
          </div>
        )}

        {a?.conflict && (
          <div className="rounded border border-jasper/50 bg-jasper-tint px-3 py-2.5 mb-2.5">
            <p className="text-2xs uppercase tracking-wide text-onyx-60 mb-1">A later document contradicts this answer</p>
            <p className="text-[13px] text-onyx leading-relaxed">{a.conflict.suggestedValue}</p>
            <p className="text-2xs text-onyx-60 mt-1.5 italic">&ldquo;{a.conflict.excerpt}&rdquo;</p>
            <p className="text-2xs text-onyx-40 mt-1">{a.conflict.documentName}</p>
            <div className="flex gap-1.5 mt-2.5">
              <Button size="sm" onClick={() => resolveConflict(q.id, 'existing')}>Keep my answer</Button>
              <Button size="sm" variant="primary" onClick={() => resolveConflict(q.id, 'new')}>Use the document</Button>
            </div>
          </div>
        )}

        <FieldInput q={q} value={value} asText={asText} onChange={(v) => setAnswer(q.id, v)} />

        <div className="flex items-center justify-between gap-3 mt-2">
          <button onClick={onLineage} className="text-2xs text-onyx-60 hover:text-aberdeen underline decoration-dotted">
            Used in {q.usedIn.length} downstream {q.usedIn.length === 1 ? 'area' : 'areas'}
          </button>
          {a && a.history.length > 0 && (
            <span className="text-2xs text-onyx-40">{a.history.length} previous version{a.history.length === 1 ? '' : 's'}</span>
          )}
        </div>
      </div>
    );
  }
}

function FieldInput({ q, value, asText, onChange }: {
  q: Question; value: string | string[]; asText: string; onChange: (v: string | string[]) => void;
}) {
  if (q.type === 'longtext') return <textarea className={inputCls} rows={3} value={asText} onChange={(e) => onChange(e.target.value)} placeholder={q.placeholder} />;
  if (q.type === 'list' || q.type === 'people') {
    return (
      <>
        <textarea className={inputCls} rows={3} value={asText} onChange={(e) => onChange(e.target.value.split('\n'))} placeholder={q.placeholder ?? 'One per line'} />
        {Array.isArray(value) && value.filter((x) => x.trim()).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {value.filter((x) => x.trim()).map((x, i) => (
              <span key={i} className="rounded-sm bg-aberdeen-50 border border-aberdeen-200 px-1.5 py-0.5 text-2xs text-aberdeen">{x}</span>
            ))}
          </div>
        )}
      </>
    );
  }
  if (q.type === 'select') {
    return (
      <select className={inputCls} value={asText} onChange={(e) => onChange(e.target.value)}>
        <option value="">Not answered</option>
        {q.options?.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (q.type === 'multiselect') {
    const arr = Array.isArray(value) ? value : asText ? asText.split('\n') : [];
    return (
      <div className="grid sm:grid-cols-2 gap-1.5">
        {q.options?.map((o) => (
          <label key={o} className="flex items-center gap-2 rounded border border-onyx-20 px-2.5 py-1.5 cursor-pointer hover:border-aberdeen-200">
            <input type="checkbox" className="accent-[#44B0B1]" checked={arr.includes(o)}
              onChange={(e) => onChange(e.target.checked ? [...arr, o] : arr.filter((x) => x !== o))} />
            <span className="text-2xs text-onyx">{o}</span>
          </label>
        ))}
      </div>
    );
  }
  if (q.type === 'date') return <input type="date" className={inputCls} value={asText} onChange={(e) => onChange(e.target.value)} />;
  if (q.type === 'number') return <input type="number" className={inputCls} value={asText} onChange={(e) => onChange(e.target.value)} />;
  return <input className={inputCls} value={asText} onChange={(e) => onChange(e.target.value)} placeholder={q.placeholder} />;
}

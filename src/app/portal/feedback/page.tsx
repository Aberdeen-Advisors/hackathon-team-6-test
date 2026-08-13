'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store/store';
import { PageHeader } from '@/components/Shell';
import { Card, Button, Badge, Toast, Field, inputCls, EmptyState, SectionTitle, Banner } from '@/components/ui';

const TYPE_LABEL: Record<string, string> = {
  comment: 'Comment',
  ranking: 'Priority ranking',
  dependency_suggestion: 'Dependency suggestion',
  timing_feedback: 'Timing feedback',
};

export default function PortalFeedback() {
  const { currentPublication, submissions, submitFeedback } = useStore();
  const snap = currentPublication?.snapshot;
  const [tab, setTab] = useState<'rank' | 'dependency' | 'comment' | 'mine'>('rank');
  const [toast, setToast] = useState<string | null>(null);

  if (!snap) {
    return <div className="p-6"><Card><EmptyState title="Nothing published yet" body="There is no published content to give feedback on." /></Card></div>;
  }

  const initiatives = snap.roadmapItems;

  return (
    <div className="p-6">
      <PageHeader
        title="Your feedback"
        subtitle="Rank priorities, suggest a dependency, or comment on any published item. Everything here goes to Aberdeen as a proposal — it never changes the roadmap directly."
      />

      <div className="flex flex-wrap gap-1.5 mb-5">
        {([
          ['rank', 'Rank priorities'], ['dependency', 'Suggest a dependency'],
          ['comment', 'General comment'], ['mine', `My submissions (${submissions.length})`],
        ] as [typeof tab, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-sm border px-3 py-1.5 text-xs transition-colors ${
              tab === k ? 'bg-aberdeen text-white border-aberdeen' : 'bg-white text-onyx border-onyx-20 hover:border-aberdeen-200'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'rank' && (
        <RankExercise initiatives={initiatives}
          onSubmit={(order, comment) => {
            submitFeedback('ranking', 'roadmap', 'Top priorities', { order }, comment);
            setToast('Ranking submitted to Aberdeen for review.');
            setTab('mine');
          }} />
      )}

      {tab === 'dependency' && (
        <DependencySuggestion initiatives={initiatives}
          onSubmit={(u, d, reason, label) => {
            submitFeedback('dependency_suggestion', `${u}->${d}`, label, { upstreamId: u, downstreamId: d, reason }, reason);
            setToast('Dependency suggestion submitted to Aberdeen for review.');
            setTab('mine');
          }} />
      )}

      {tab === 'comment' && (
        <GeneralComment
          onSubmit={(text) => {
            submitFeedback('comment', 'engagement', 'General', {}, text);
            setToast('Comment submitted to Aberdeen for review.');
            setTab('mine');
          }} />
      )}

      {tab === 'mine' && (
        <div className="space-y-3">
          {submissions.length === 0 ? (
            <Card><EmptyState title="No submissions yet" body="Rank the priorities, suggest a dependency, or comment on a roadmap item to get started." /></Card>
          ) : (
            submissions.map((s) => (
              <Card key={s.id}
                title={<span className="flex items-center gap-2.5">{TYPE_LABEL[s.type]}
                  <Badge tone={s.status === 'pending' ? 'warn' : s.status === 'accepted' ? 'ok' : 'neutral'}>
                    {s.status === 'pending' ? 'Pending review' : s.status === 'accepted' ? 'Accepted' : 'Not adopted'}
                  </Badge></span>}
                subtitle={`${s.targetLabel} · submitted ${new Date(s.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}>
                {s.comment && <p className="text-[13px] text-onyx leading-relaxed">{s.comment}</p>}
                {s.type === 'ranking' && (
                  <ol className="mt-2 space-y-1">
                    {((s.payload.order as string[]) ?? []).map((id, i) => (
                      <li key={id} className="text-[13px] text-onyx flex gap-2">
                        <span className="text-onyx-40 tabular-nums w-4">{i + 1}</span>
                        {initiatives.find((r) => r.initiativeId === id)?.initiativeName ?? id}
                      </li>
                    ))}
                  </ol>
                )}
                {s.status !== 'pending' && s.reviewNote && (
                  <div className="mt-3 pt-2.5 border-t border-onyx-10">
                    <div className="text-2xs uppercase tracking-wide text-onyx-60">Aberdeen response</div>
                    <p className="text-[13px] text-onyx mt-0.5 leading-relaxed">{s.reviewNote}</p>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function RankExercise({ initiatives, onSubmit }: {
  initiatives: { initiativeId: string; initiativeName: string; themeName: string; themeColour: string }[];
  onSubmit: (order: string[], comment: string) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const remaining = initiatives.filter((i) => !picked.includes(i.initiativeId));

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <Card title="Available initiatives" subtitle="Click to add to your top five, in order.">
        <div className="space-y-1.5">
          {remaining.map((i) => (
            <button key={i.initiativeId} onClick={() => picked.length < 5 && setPicked([...picked, i.initiativeId])}
              disabled={picked.length >= 5}
              className="w-full text-left rounded border border-onyx-20 hover:border-verdigris hover:bg-verdigris-50 disabled:opacity-40 disabled:hover:border-onyx-20 disabled:hover:bg-white px-3 py-2 transition-colors">
              <span className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: i.themeColour }} />
                <span className="min-w-0">
                  <span className="block text-[13px] text-aberdeen font-medium truncate">{i.initiativeName}</span>
                  <span className="block text-2xs text-onyx-60">{i.themeName}</span>
                </span>
              </span>
            </button>
          ))}
          {remaining.length === 0 && <p className="text-2xs text-onyx-60">All initiatives selected.</p>}
        </div>
      </Card>

      <Card title="Your top five" subtitle="Aberdeen will compare this against the model's computed ranking.">
        {picked.length === 0 ? (
          <p className="text-[13px] text-onyx-60 py-6 text-center">Select up to five initiatives, most important first.</p>
        ) : (
          <ol className="space-y-1.5">
            {picked.map((id, i) => {
              const it = initiatives.find((x) => x.initiativeId === id);
              return (
                <li key={id} className="flex items-center gap-2.5 rounded border border-verdigris-200 bg-verdigris-50 px-3 py-2">
                  <span className="grid h-6 w-6 place-items-center rounded-sm bg-aberdeen text-white text-xs font-semibold shrink-0">{i + 1}</span>
                  <span className="text-[13px] text-aberdeen flex-1 min-w-0 truncate">{it?.initiativeName}</span>
                  <button onClick={() => setPicked(picked.filter((x) => x !== id))} className="text-onyx-40 hover:text-jasper text-lg leading-none">×</button>
                </li>
              );
            })}
          </ol>
        )}
        <div className="mt-4">
          <Field label="Why this order? (optional)">
            <textarea className={inputCls} rows={3} value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="What drives your ordering — risk, revenue, operational readiness, something else?" />
          </Field>
          <Button variant="primary" size="sm" disabled={picked.length === 0}
            onClick={() => onSubmit(picked, comment.trim() || 'Ranking submitted without additional comment.')}>
            Submit ranking to Aberdeen
          </Button>
        </div>
      </Card>
    </div>
  );
}

function DependencySuggestion({ initiatives, onSubmit }: {
  initiatives: { initiativeId: string; initiativeName: string }[];
  onSubmit: (u: string, d: string, reason: string, label: string) => void;
}) {
  const [u, setU] = useState(''); const [d, setD] = useState(''); const [reason, setReason] = useState('');
  const uName = initiatives.find((i) => i.initiativeId === u)?.initiativeName;
  const dName = initiatives.find((i) => i.initiativeId === d)?.initiativeName;

  return (
    <Card title="Suggest a dependency" subtitle="If something has to happen before something else, tell us — we will validate it and re-sequence if it holds.">
      <div className="max-w-2xl">
        <Field label="This must happen first">
          <select className={inputCls} value={u} onChange={(e) => setU(e.target.value)}>
            <option value="">Select an initiative…</option>
            {initiatives.map((i) => <option key={i.initiativeId} value={i.initiativeId}>{i.initiativeName}</option>)}
          </select>
        </Field>
        <Field label="Before this can start">
          <select className={inputCls} value={d} onChange={(e) => setD(e.target.value)}>
            <option value="">Select an initiative…</option>
            {initiatives.filter((i) => i.initiativeId !== u).map((i) => <option key={i.initiativeId} value={i.initiativeId}>{i.initiativeName}</option>)}
          </select>
        </Field>

        {u && d && (
          <div className="mb-4">
            <Banner tone="accent">
              <strong className="font-medium">{uName}</strong> must complete before <strong className="font-medium">{dName}</strong> can start.
            </Banner>
          </div>
        )}

        <Field label="Why? (required)">
          <textarea className={inputCls} rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. the data foundation has to be in place before the analytics work can produce anything usable." />
        </Field>
        <Button variant="primary" size="sm" disabled={!u || !d || reason.trim().length < 5}
          onClick={() => onSubmit(u, d, reason.trim(), `${uName} → ${dName}`)}>
          Submit suggestion to Aberdeen
        </Button>
      </div>
    </Card>
  );
}

function GeneralComment({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <Card title="General comment" subtitle="Anything about the roadmap as a whole.">
      <div className="max-w-2xl">
        <Field label="Your comment">
          <textarea className={inputCls} rows={5} value={text} onChange={(e) => setText(e.target.value)}
            placeholder="What is missing, what would you challenge, and what would make this more useful?" />
        </Field>
        <Button variant="primary" size="sm" disabled={text.trim().length < 5} onClick={() => onSubmit(text.trim())}>
          Submit to Aberdeen
        </Button>
      </div>
    </Card>
  );
}

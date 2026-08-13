'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useStore, useDerived } from '@/lib/store/store';
import { PageHeader } from '@/components/Shell';
import { JourneyRail } from '@/components/JourneyRail';
import { Card, Button, Badge, Modal, Toast, Field, inputCls, EmptyState, SectionTitle } from '@/components/ui';
import { denseRank } from '@/lib/calc';

const TYPE_LABEL: Record<string, string> = {
  comment: 'Comment',
  ranking: 'Priority ranking',
  dependency_suggestion: 'Dependency suggestion',
  timing_feedback: 'Timing feedback',
};

export default function FeedbackPage() {
  const { submissions, reviewSubmission, model } = useStore();
  const { oppScore, initName } = useDerived();
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [review, setReview] = useState<{ id: string; decision: 'accepted' | 'rejected' } | null>(null);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const ranks = denseRank(model.opportunities.map((o) => ({ id: o.id, score: oppScore[o.id] })));
  const rows = submissions.filter((s) => (filter === 'pending' ? s.status === 'pending' : true));
  const pending = submissions.filter((s) => s.status === 'pending').length;

  function renderPayload(s: (typeof submissions)[number]) {
    if (s.type === 'ranking') {
      const order = (s.payload.order as string[]) ?? [];
      const consultantOrder = [...model.initiatives]
        .map((i) => {
          const kids = model.opportunities.filter((o) => o.initiativeId === i.id);
          const rs = kids.map((o) => ranks[o.id]).filter((r): r is number => r !== null);
          return { id: i.id, rank: rs.length ? Math.min(...rs) : 999 };
        })
        .sort((a, b) => a.rank - b.rank)
        .map((x) => x.id);
      return (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xs uppercase tracking-wide text-onyx-60 mb-1.5">Client order</div>
            <ol className="space-y-1">
              {order.map((id, i) => (
                <li key={id} className="text-[13px] text-onyx flex gap-2">
                  <span className="text-onyx-40 tabular-nums w-4">{i + 1}</span>{initName[id] ?? id}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <div className="text-2xs uppercase tracking-wide text-onyx-60 mb-1.5">Computed order</div>
            <ol className="space-y-1">
              {consultantOrder.slice(0, order.length).map((id, i) => {
                const clientPos = order.indexOf(id);
                const diverges = clientPos !== -1 && clientPos !== i;
                return (
                  <li key={id} className={`text-[13px] flex gap-2 ${diverges ? 'text-jasper' : 'text-onyx'}`}>
                    <span className="text-onyx-40 tabular-nums w-4">{i + 1}</span>{initName[id] ?? id}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      );
    }
    if (s.type === 'dependency_suggestion') {
      return (
        <p className="text-[13px] text-onyx leading-relaxed">
          <strong className="text-aberdeen">{initName[s.payload.upstreamId as string] ?? s.payload.upstreamId as string}</strong>
          {' should complete before '}
          <strong className="text-aberdeen">{initName[s.payload.downstreamId as string] ?? s.payload.downstreamId as string}</strong>
          {' can start.'}
          <span className="block text-2xs text-onyx-60 mt-1.5">{s.payload.reason as string}</span>
        </p>
      );
    }
    if (s.type === 'timing_feedback') {
      const cur = model.roadmapItems.find((r) => r.initiativeId === s.payload.initiativeId);
      return (
        <p className="text-[13px] text-onyx leading-relaxed">
          <strong className="text-aberdeen">{initName[s.payload.initiativeId as string]}</strong> — currently{' '}
          <span className="font-mono">{cur?.startPeriod}</span>, proposed{' '}
          <span className="font-mono text-aberdeen">{s.payload.proposedPeriod as string}</span>.
          <span className="block text-2xs text-onyx-60 mt-1.5">{s.payload.reason as string}</span>
        </p>
      );
    }
    return <p className="text-[13px] text-onyx leading-relaxed">{s.comment}</p>;
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Client feedback"
        subtitle="Client submissions arrive as proposals. Nothing the client does writes to the working model — accepting a submission is what applies the change, and rejecting it leaves the model untouched."
        actions={
          <div className="flex rounded border border-onyx-20 overflow-hidden">
            {(['pending', 'all'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs capitalize ${filter === f ? 'bg-aberdeen text-white' : 'bg-white text-onyx hover:bg-aberdeen-50'}`}>
                {f} {f === 'pending' && pending > 0 ? `(${pending})` : ''}
              </button>
            ))}
          </div>
        }
      />
      <JourneyRail />

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            title={filter === 'pending' ? 'No submissions awaiting review' : 'No client submissions yet'}
            body="Publish content to the client portal, then sign in as the client executive to submit a ranking, comment, dependency suggestion or timing feedback."
            action={<Link href="/workspace/publish"><Button size="sm" variant="primary">Go to publishing</Button></Link>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((s) => (
            <Card key={s.id}
              title={<span className="flex items-center gap-2.5">{TYPE_LABEL[s.type]}<Badge tone={s.status === 'pending' ? 'warn' : s.status === 'accepted' ? 'ok' : 'neutral'}>{s.status}</Badge></span>}
              subtitle={`${s.submittedByName} · ${new Date(s.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}${s.targetLabel ? ` · ${s.targetLabel}` : ''}`}
              actions={s.status === 'pending' ? (
                <>
                  <Button size="sm" variant="danger" onClick={() => { setReview({ id: s.id, decision: 'rejected' }); setNote(''); }}>Reject</Button>
                  <Button size="sm" variant="primary" onClick={() => { setReview({ id: s.id, decision: 'accepted' }); setNote(''); }}>Accept</Button>
                </>
              ) : undefined}
            >
              {renderPayload(s)}
              {s.comment && s.type !== 'comment' && (
                <p className="text-2xs text-onyx-60 mt-2.5 italic border-l-2 border-onyx-20 pl-2.5">{s.comment}</p>
              )}
              {s.status !== 'pending' && s.reviewNote && (
                <div className="mt-3 pt-2.5 border-t border-onyx-10">
                  <div className="text-2xs uppercase tracking-wide text-onyx-60">Aberdeen response · {s.reviewedBy}</div>
                  <p className="text-[13px] text-onyx mt-0.5">{s.reviewNote}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!review} onClose={() => setReview(null)} title={review?.decision === 'accepted' ? 'Accept and apply' : 'Reject submission'}>
        {review && (
          <>
            <p className="text-[13px] text-onyx-60 mb-4 leading-relaxed">
              {review.decision === 'accepted'
                ? 'Accepting applies this change to the working model. A comment is acknowledged rather than applied — a comment is not a change request. The client sees your note either way.'
                : 'Rejecting leaves the model untouched. The client sees your note and the outcome in their feedback view.'}
            </p>
            <Field label="Review note (required)" hint="Visible to the client.">
              <textarea className={inputCls} rows={3} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder={review.decision === 'accepted' ? 'Agreed — sequencing updated accordingly.' : 'Understood, but the prerequisite makes this infeasible in this wave.'} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={() => setReview(null)}>Cancel</Button>
              <Button size="sm" variant="primary" disabled={note.trim().length < 3}
                onClick={() => {
                  reviewSubmission(review.id, review.decision, note.trim());
                  setReview(null);
                  setToast(review.decision === 'accepted'
                    ? 'Accepted — the change has been applied. Republish to show it to the client.'
                    : 'Rejected — the model is unchanged and the client has been told why.');
                }}>
                {review.decision === 'accepted' ? 'Accept and apply' : 'Reject'}
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

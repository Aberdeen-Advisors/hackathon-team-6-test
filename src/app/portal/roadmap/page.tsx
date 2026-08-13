'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store/store';
import { PageHeader } from '@/components/Shell';
import { Card, Badge, BandChip, Button, Modal, Toast, Field, inputCls, EmptyState, SectionTitle } from '@/components/ui';
import { RoadmapTimeline } from '@/components/RoadmapTimeline';
import { THEMES, ROADMAP } from '@/data/seed';
import { indexToPeriod } from '@/lib/calc';

export default function PortalRoadmap() {
  const { currentPublication, submitFeedback } = useStore();
  const snap = currentPublication?.snapshot;
  const [theme, setTheme] = useState('all');
  const [wave, setWave] = useState('all');
  const [area, setArea] = useState('all');
  const [showDeps, setShowDeps] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [timingFor, setTimingFor] = useState<string | null>(null);
  const [commentFor, setCommentFor] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const areas = useMemo(() => [...new Set((snap?.roadmapItems ?? []).map((r) => r.businessArea))].filter(Boolean), [snap]);

  const items = useMemo(() => {
    if (!snap) return [];
    return snap.roadmapItems
      .filter((r) => (theme === 'all' || r.themeName === theme) && (wave === 'all' || r.waveId === wave) && (area === 'all' || r.businessArea === area))
      .map((r) => ({
        initiativeId: r.initiativeId, name: r.initiativeName,
        themeId: THEMES.find((t) => t.name === r.themeName)?.id ?? 'TH-1',
        startPeriod: r.startPeriod, durationQuarters: r.durationQuarters,
        waveId: r.waveId, band: r.priorityBand, owner: r.owner,
      }));
  }, [snap, theme, wave, area]);

  if (!snap || snap.roadmapItems.length === 0) {
    return <div className="p-6"><Card><EmptyState title="Roadmap not published" body="Aberdeen has not yet published the roadmap for this engagement." /></Card></div>;
  }

  const sel = selected ? snap.roadmapItems.find((r) => r.initiativeId === selected) : null;
  const selOpps = selected ? snap.opportunities.filter((o) => o.initiativeId === selected) : [];

  return (
    <div className="p-6">
      <PageHeader
        title="Roadmap"
        subtitle={`Version ${currentPublication.version}. ${snap.roadmapItems.length} initiatives across ${snap.waves.length} waves. Select an initiative for detail, or propose different timing.`}
      />

      <Card flush className="mb-5">
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-onyx-10">
          {([
            ['Theme', theme, setTheme, ['all', ...new Set(snap.roadmapItems.map((r) => r.themeName))]],
            ['Wave', wave, setWave, ['all', ...snap.waves.map((w) => w.id)]],
            ['Business area', area, setArea, ['all', ...areas]],
          ] as [string, string, (v: string) => void, string[]][]).map(([label, val, set, opts]) => (
            <label key={label} className="flex items-center gap-2 text-xs">
              <span className="text-onyx-60">{label}</span>
              <select value={val} onChange={(e) => set(e.target.value)}
                className="rounded border border-onyx-20 bg-white px-2 py-1 text-xs text-onyx focus:border-verdigris focus:outline-none">
                {opts.map((o) => (
                  <option key={o} value={o}>
                    {o === 'all' ? 'All' : (snap.waves.find((w) => w.id === o)?.label ?? o)}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label className="flex items-center gap-1.5 text-xs text-onyx cursor-pointer ml-auto">
            <input type="checkbox" checked={showDeps} onChange={(e) => setShowDeps(e.target.checked)} className="accent-[#44B0B1]" />
            Show dependencies
          </label>
          <span className="text-2xs text-onyx-40">{items.length} of {snap.roadmapItems.length} shown</span>
        </div>

        <RoadmapTimeline
          items={items}
          deps={snap.dependencies.map((d) => ({
            id: d.id,
            upstreamId: snap.roadmapItems.find((r) => r.initiativeName === d.upstreamName)?.initiativeId ?? '',
            downstreamId: snap.roadmapItems.find((r) => r.initiativeName === d.downstreamName)?.initiativeId ?? '',
            type: d.type, validated: true,
          }))}
          conflicts={[]} editable={false} showDeps={showDeps} onSelect={setSelected}
        />
      </Card>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card title="Waves" className="lg:col-span-2">
          <div className="space-y-2.5">
            {snap.waves.map((w) => {
              const n = snap.roadmapItems.filter((r) => r.waveId === w.id).length;
              return (
                <div key={w.id} className="border-b border-onyx-10 pb-2.5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-aberdeen">{w.label}</span>
                    <Badge>{w.startPeriod} – {w.endPeriod}</Badge>
                    <span className="text-2xs text-onyx-40 ml-auto">{n} initiative{n === 1 ? '' : 's'}</span>
                  </div>
                  <p className="text-2xs text-onyx-60 mt-1 leading-relaxed">{w.targetOutcome}</p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Sequencing dependencies" subtitle="Why some things must come before others.">
          {snap.dependencies.length === 0 ? (
            <p className="text-[13px] text-onyx-60">No dependencies published.</p>
          ) : (
            <ul className="space-y-2">
              {snap.dependencies.map((d) => (
                <li key={d.id} className="text-[13px] text-onyx leading-snug border-b border-onyx-10 pb-2 last:border-0">
                  <strong className="text-aberdeen font-medium">{d.upstreamName}</strong>
                  {d.type === 'hard_prerequisite' ? ' must complete before ' : ' should ideally precede '}
                  <strong className="text-aberdeen font-medium">{d.downstreamName}</strong>.
                  <span className="block text-2xs text-onyx-60 mt-1">{d.rationale}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* initiative detail */}
      <Modal open={!!sel} onClose={() => setSelected(null)} title={sel?.initiativeName ?? ''} width="max-w-2xl">
        {sel && (
          <div className="space-y-4">
            <dl className="text-[13px] grid grid-cols-[130px_1fr] gap-y-2">
              <dt className="text-onyx-60 text-xs">Theme</dt><dd>{sel.themeName}</dd>
              <dt className="text-onyx-60 text-xs">Owner</dt><dd>{sel.owner}</dd>
              <dt className="text-onyx-60 text-xs">Business area</dt><dd>{sel.businessArea}</dd>
              <dt className="text-onyx-60 text-xs">Wave</dt><dd>{snap.waves.find((w) => w.id === sel.waveId)?.label}</dd>
              <dt className="text-onyx-60 text-xs">Starts</dt><dd>{sel.startPeriod}</dd>
              <dt className="text-onyx-60 text-xs">Duration</dt><dd>{sel.durationQuarters ?? '—'} quarters</dd>
              <dt className="text-onyx-60 text-xs">Priority</dt><dd><BandChip band={sel.priorityBand} /></dd>
            </dl>

            <div>
              <SectionTitle>What this covers</SectionTitle>
              <ul className="space-y-2">
                {selOpps.map((o) => (
                  <li key={o.id} className="border border-onyx-20 rounded px-3 py-2.5">
                    <div className="text-[13px] font-medium text-aberdeen">{o.title}</div>
                    <p className="text-2xs text-onyx-60 mt-1 leading-relaxed">{o.description}</p>
                    <p className="text-2xs text-onyx mt-1.5 leading-relaxed"><strong>Why it matters:</strong> {o.soWhat}</p>
                    <p className="text-2xs text-aberdeen mt-1.5 leading-relaxed bg-aberdeen-50 rounded px-2 py-1.5">{o.recommendedAction}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="primary" onClick={() => { setTimingFor(sel.initiativeId); setSelected(null); }}>
                Propose different timing
              </Button>
              <Button size="sm" onClick={() => { setCommentFor(sel.initiativeId); setSelected(null); }}>Comment</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* timing feedback */}
      <TimingModal
        initiativeId={timingFor} snap={snap} onClose={() => setTimingFor(null)}
        onSubmit={(id, period, reason, name) => {
          submitFeedback('timing_feedback', id, name, { initiativeId: id, proposedPeriod: period, reason }, reason);
          setTimingFor(null);
          setToast('Timing feedback submitted to Aberdeen for review.');
        }}
      />

      {/* comment */}
      <CommentModal
        initiativeId={commentFor} snap={snap} onClose={() => setCommentFor(null)}
        onSubmit={(id, text, name) => {
          submitFeedback('comment', id, name, {}, text);
          setCommentFor(null);
          setToast('Comment submitted to Aberdeen for review.');
        }}
      />

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function TimingModal({ initiativeId, snap, onClose, onSubmit }: {
  initiativeId: string | null;
  snap: NonNullable<ReturnType<typeof useStore>['currentPublication']>['snapshot'];
  onClose: () => void;
  onSubmit: (id: string, period: string, reason: string, name: string) => void;
}) {
  const item = initiativeId ? snap.roadmapItems.find((r) => r.initiativeId === initiativeId) : null;
  const [period, setPeriod] = useState('');
  const [reason, setReason] = useState('');
  const periods = Array.from({ length: snap.horizonQuarters }, (_, i) => indexToPeriod(i, snap.roadmapStart));

  return (
    <Modal open={!!initiativeId} onClose={onClose} title="Propose different timing">
      {item && (
        <>
          <p className="text-[13px] text-onyx-60 mb-4 leading-relaxed">
            <strong className="text-aberdeen">{item.initiativeName}</strong> currently starts in{' '}
            <span className="font-mono">{item.startPeriod}</span>. Your proposal goes to Aberdeen for review — it does
            not change the roadmap directly.
          </p>
          <Field label="Proposed start">
            <select className={inputCls} value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="">Select a quarter…</option>
              {periods.filter((p) => p !== item.startPeriod).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Reason (required)">
            <textarea className={inputCls} rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. our peak trading period runs through Q3 — starting then would not be feasible for the operations team." />
          </Field>
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" variant="primary" disabled={!period || reason.trim().length < 5}
              onClick={() => onSubmit(item.initiativeId, period, reason.trim(), item.initiativeName)}>
              Submit to Aberdeen
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

function CommentModal({ initiativeId, snap, onClose, onSubmit }: {
  initiativeId: string | null;
  snap: NonNullable<ReturnType<typeof useStore>['currentPublication']>['snapshot'];
  onClose: () => void;
  onSubmit: (id: string, text: string, name: string) => void;
}) {
  const item = initiativeId ? snap.roadmapItems.find((r) => r.initiativeId === initiativeId) : null;
  const [text, setText] = useState('');
  return (
    <Modal open={!!initiativeId} onClose={onClose} title="Comment">
      {item && (
        <>
          <p className="text-[13px] text-onyx-60 mb-4">On <strong className="text-aberdeen">{item.initiativeName}</strong>.</p>
          <Field label="Your comment">
            <textarea className={inputCls} rows={4} value={text} onChange={(e) => setText(e.target.value)}
              placeholder="What would you add, challenge or clarify?" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" variant="primary" disabled={text.trim().length < 5}
              onClick={() => onSubmit(item.initiativeId, text.trim(), item.initiativeName)}>
              Submit to Aberdeen
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

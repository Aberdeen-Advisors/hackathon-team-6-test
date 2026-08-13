'use client';

import { useMemo, useState } from 'react';
import { useStore, useDerived } from '@/lib/store/store';
import { PageHeader } from '@/components/Shell';
import { JourneyRail } from '@/components/JourneyRail';
import { Card, Button, Badge, Modal, Toast, Field, inputCls, SectionTitle, BandChip, EmptyState } from '@/components/ui';
import { RoadmapTimeline, type TimelineItem } from '@/components/RoadmapTimeline';
import { THEMES, ROADMAP, PRIORITY_MODEL, EFFORT_SCALE } from '@/data/seed';
import { initiativeRollup, priorityBand, indexToPeriod, periodToIndex, round2 } from '@/lib/calc';

interface Impact { type: string; label: string; detail: string }

export default function RoadmapPage() {
  const { model, moveRoadmapItem, updateDependency, addDependency, updateInitiative } = useStore();
  const { oppScore, initDuration, conflicts, initName } = useDerived();
  const [pendingMove, setPendingMove] = useState<{ id: string; period: string; from: string } | null>(null);
  const [reason, setReason] = useState('');
  const [impact, setImpact] = useState<{ summary: string; lines: Impact[] } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showDeps, setShowDeps] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const items: TimelineItem[] = useMemo(
    () =>
      model.roadmapItems.map((r) => {
        const ini = model.initiatives.find((i) => i.id === r.initiativeId)!;
        const kids = model.opportunities.filter((o) => o.initiativeId === r.initiativeId);
        const roll = initiativeRollup(kids.map((o) => oppScore[o.id]));
        return {
          initiativeId: r.initiativeId,
          name: ini.name,
          themeId: ini.themeId,
          startPeriod: r.startPeriod,
          durationQuarters: initDuration[r.initiativeId] ?? null,
          waveId: r.waveId,
          band: priorityBand(roll.value.value, PRIORITY_MODEL.bands, PRIORITY_MODEL.bandLabels).value,
          owner: ini.owner,
        };
      }),
    [model, oppScore, initDuration],
  );

  const errors = conflicts.filter((c) => c.severity === 'error');
  const warnings = conflicts.filter((c) => c.severity === 'warning');
  const infos = conflicts.filter((c) => c.severity === 'info');

  /** Compute the blast radius of a proposed move before it is applied. */
  function computeImpact(initiativeId: string, newPeriod: string): { summary: string; lines: Impact[] } {
    const lines: Impact[] = [];
    const dur = initDuration[initiativeId] ?? 1;
    const newEnd = periodToIndex(newPeriod, ROADMAP.startPeriod) + dur;

    const downstream = model.dependencies.filter((d) => d.upstreamId === initiativeId && d.validated);
    for (const d of downstream) {
      const item = model.roadmapItems.find((r) => r.initiativeId === d.downstreamId);
      if (!item) continue;
      const dStart = periodToIndex(item.startPeriod, ROADMAP.startPeriod);
      const hard = d.type === 'hard_prerequisite' || d.type === 'unblocks';
      lines.push({
        type: 'Initiative',
        label: initName[d.downstreamId] ?? d.downstreamId,
        detail: hard
          ? dStart < newEnd
            ? `now starts before this prerequisite completes (earliest start moves to ${indexToPeriod(newEnd, ROADMAP.startPeriod)})`
            : `earliest start recalculated to ${indexToPeriod(newEnd, ROADMAP.startPeriod)}`
          : `advisory dependency — sequence preference reviewed`,
      });
    }

    const upstream = model.dependencies.filter((d) => d.downstreamId === initiativeId && d.validated);
    for (const d of upstream) {
      const item = model.roadmapItems.find((r) => r.initiativeId === d.upstreamId);
      if (!item) continue;
      const uEnd = periodToIndex(item.startPeriod, ROADMAP.startPeriod) + (initDuration[d.upstreamId] ?? 1);
      const hard = d.type === 'hard_prerequisite' || d.type === 'unblocks';
      if (hard && periodToIndex(newPeriod, ROADMAP.startPeriod) < uEnd) {
        lines.push({
          type: 'Conflict',
          label: initName[d.upstreamId] ?? d.upstreamId,
          detail: `is a hard prerequisite and does not complete until ${indexToPeriod(uEnd - 1, ROADMAP.startPeriod)} — this move creates a violation`,
        });
      }
    }

    const idx = periodToIndex(newPeriod, ROADMAP.startPeriod);
    const newWave = ROADMAP.waves.find(
      (w) => idx >= periodToIndex(w.startPeriod, ROADMAP.startPeriod) && idx <= periodToIndex(w.endPeriod, ROADMAP.startPeriod),
    );
    const cur = model.roadmapItems.find((r) => r.initiativeId === initiativeId);
    if (newWave && cur && newWave.id !== cur.waveId) {
      const oldWave = ROADMAP.waves.find((w) => w.id === cur.waveId);
      lines.push({ type: 'Wave', label: newWave.label, detail: `composition changed — moved out of ${oldWave?.label ?? cur.waveId}` });
      lines.push({ type: 'Wave', label: oldWave?.label ?? cur.waveId, detail: 'composition changed — one initiative removed' });
    }

    lines.push({ type: 'Client view', label: 'Published roadmap', detail: 'will differ from the workspace until you republish' });

    const nInit = lines.filter((l) => l.type === 'Initiative').length;
    const nWave = lines.filter((l) => l.type === 'Wave').length;
    return {
      summary: `This change affects ${nInit} dependent initiative${nInit === 1 ? '' : 's'} and ${nWave} wave assignment${nWave === 1 ? '' : 's'}.`,
      lines,
    };
  }

  function requestMove(initiativeId: string, period: string) {
    const cur = model.roadmapItems.find((r) => r.initiativeId === initiativeId);
    setPendingMove({ id: initiativeId, period, from: cur?.startPeriod ?? '' });
    setReason('');
  }

  function confirmMove() {
    if (!pendingMove) return;
    const imp = computeImpact(pendingMove.id, pendingMove.period);
    moveRoadmapItem(pendingMove.id, pendingMove.period, reason.trim() || 'No reason recorded');
    setImpact(imp);
    setPendingMove(null);
    setToast('Roadmap updated — downstream timing recalculated.');
  }

  const sel = selected ? model.initiatives.find((i) => i.id === selected) : null;
  const selItem = selected ? model.roadmapItems.find((r) => r.initiativeId === selected) : null;

  return (
    <div className="p-6">
      <PageHeader
        title="Roadmap"
        subtitle="Drag an initiative to re-sequence it. A move is a model transaction — timing recalculates, conflicts are surfaced, and the downstream impact is reported before you move on."
        actions={
          <>
            <label className="flex items-center gap-1.5 text-xs text-onyx cursor-pointer">
              <input type="checkbox" checked={showDeps} onChange={(e) => setShowDeps(e.target.checked)} className="accent-[#44B0B1]" />
              Dependencies
            </label>
            <Button size="sm" onClick={() => setAddOpen(true)}>Add dependency</Button>
          </>
        }
      />

      <JourneyRail />

      {(errors.length > 0 || warnings.length > 0) && (
        <div className="mb-4 space-y-2">
          {errors.map((c, i) => (
            <div key={`e${i}`} className="flex items-start gap-2.5 rounded border border-jasper/50 bg-jasper-tint px-3.5 py-2.5">
              <span className="mt-1 h-2 w-2 rounded-full bg-jasper shrink-0" />
              <div>
                <span className="text-2xs font-mono text-onyx-60">{c.code}</span>
                <p className="text-[13px] text-onyx leading-snug">{c.message}</p>
              </div>
            </div>
          ))}
          {warnings.map((c, i) => (
            <div key={`w${i}`} className="flex items-start gap-2.5 rounded border border-gold/50 bg-gold-tint px-3.5 py-2.5">
              <span className="mt-1 h-2 w-2 rounded-full bg-gold shrink-0" />
              <div>
                <span className="text-2xs font-mono text-onyx-60">{c.code}</span>
                <p className="text-[13px] text-onyx leading-snug">{c.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Card flush className="mb-5">
        <RoadmapTimeline
          items={items}
          deps={model.dependencies}
          conflicts={conflicts}
          editable
          showDeps={showDeps}
          onMove={requestMove}
          onSelect={setSelected}
        />
      </Card>

      {model.risks.length > 0 && (
        <Card className="mb-5" title="Risks raised from source material"
          subtitle="Accepted from uploaded documents. Risks linked to an initiative are shown against it; all of them reach the executive view when published.">
          <div className="space-y-2">
            {model.risks.map((r) => (
              <div key={r.id} className={`rounded border px-3.5 py-2.5 ${r.severity === 'high' ? 'border-jasper/40 bg-jasper-tint' : 'border-gold/40 bg-gold-tint'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge tone={r.severity === 'high' ? 'danger' : 'warn'}>{r.severity}</Badge>
                      <span className="text-[13px] font-medium text-aberdeen">{r.title}</span>
                    </div>
                    <p className="text-2xs text-onyx-60 mt-1 leading-relaxed">{r.detail}</p>
                    <p className="text-2xs text-onyx-40 mt-1">Source: {r.sourceRef}</p>
                  </div>
                  {r.initiativeId && <Badge>{initName[r.initiativeId]}</Badge>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Dependencies" subtitle="Only validated hard prerequisites constrain scheduling. Advisory types produce warnings.">
          <div className="space-y-2">
            {model.dependencies.map((d) => {
              const hard = d.type === 'hard_prerequisite' || d.type === 'unblocks';
              return (
                <div key={d.id} className="border border-onyx-20 rounded px-3.5 py-3">
                  <p className="text-[13px] text-onyx leading-snug">
                    <strong className="text-aberdeen font-medium">{initName[d.upstreamId] ?? d.upstreamId}</strong>
                    {hard ? ' must complete before ' : ' should ideally precede '}
                    <strong className="text-aberdeen font-medium">{initName[d.downstreamId] ?? d.downstreamId}</strong>
                    {hard ? ' can start.' : '.'}
                  </p>
                  <p className="text-2xs text-onyx-60 mt-1.5 leading-relaxed">{d.rationale}</p>
                  {d.triggerLanguage && (
                    <p className="text-2xs text-onyx-40 mt-1 italic">&ldquo;{d.triggerLanguage}&rdquo;</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
                    <Badge tone={hard ? 'brand' : 'neutral'}>{d.type.replace(/_/g, ' ')}</Badge>
                    {d.validated ? <Badge tone="ok">Validated</Badge> : <Badge tone="warn">Proposed</Badge>}
                    <span className="text-2xs text-onyx-40">confidence {d.confidence.toFixed(2)}</span>
                    <span className="ml-auto flex gap-1.5">
                      <Button size="sm" onClick={() => { updateDependency(d.id, { upstreamId: d.downstreamId, downstreamId: d.upstreamId }); setToast('Dependency direction reversed.'); }}>
                        Reverse
                      </Button>
                      <Button size="sm" variant={d.validated ? 'ghost' : 'primary'} onClick={() => { updateDependency(d.id, { validated: !d.validated }); setToast(d.validated ? 'Dependency set back to proposed.' : 'Dependency validated — scheduling recalculated.'); }}>
                        {d.validated ? 'Un-validate' : 'Validate'}
                      </Button>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Sequencing checks" subtitle="Errors block publication of an approved version; they never block editing.">
          {conflicts.length === 0 ? (
            <EmptyState title="No conflicts" body="Every validated hard prerequisite is satisfied by the current sequence." />
          ) : (
            <div className="space-y-1.5">
              {[...errors, ...warnings, ...infos].map((c, i) => (
                <div key={i} className="flex items-start gap-2.5 py-1.5 border-b border-onyx-10 last:border-0">
                  <Badge tone={c.severity === 'error' ? 'danger' : c.severity === 'warning' ? 'warn' : 'neutral'}>
                    {c.severity}
                  </Badge>
                  <div className="min-w-0">
                    <span className="text-2xs font-mono text-onyx-40">{c.code}</span>
                    <p className="text-[13px] text-onyx leading-snug">{c.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* move confirm */}
      <Modal open={!!pendingMove} onClose={() => setPendingMove(null)} title="Re-sequence initiative">
        {pendingMove && (
          <>
            <p className="text-[13px] text-onyx-60 mb-4 leading-relaxed">
              Moving <strong className="text-aberdeen">{initName[pendingMove.id]}</strong> from{' '}
              <strong className="text-aberdeen">{pendingMove.from}</strong> to{' '}
              <strong className="text-aberdeen">{pendingMove.period}</strong>.
            </p>
            <Field label="Reason for the move" hint="Recorded against the roadmap item so the sequence can be defended later.">
              <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. accelerated to unblock two dependent programmes" />
            </Field>
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={() => setPendingMove(null)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={confirmMove}>Apply and recalculate</Button>
            </div>
          </>
        )}
      </Modal>

      {/* impact report */}
      <Modal open={!!impact} onClose={() => setImpact(null)} title="Downstream impact" width="max-w-xl">
        {impact && (
          <>
            <p className="text-[13px] text-aberdeen font-medium mb-3">{impact.summary}</p>
            <div className="space-y-1.5">
              {impact.lines.map((l, i) => (
                <div key={i} className="flex items-start gap-2.5 border-b border-onyx-10 pb-2 last:border-0">
                  <Badge tone={l.type === 'Conflict' ? 'danger' : 'neutral'}>{l.type}</Badge>
                  <p className="text-[13px] text-onyx leading-snug">
                    <strong className="text-aberdeen font-medium">{l.label}</strong> — {l.detail}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-2xs text-onyx-60 mt-4 leading-relaxed">
              Nothing regenerates automatically. Affected outputs are flagged; republishing is a deliberate act.
            </p>
            <div className="flex justify-end mt-4">
              <Button size="sm" variant="primary" onClick={() => setImpact(null)}>Understood</Button>
            </div>
          </>
        )}
      </Modal>

      {/* initiative detail */}
      <Modal open={!!sel} onClose={() => setSelected(null)} title={sel?.name ?? ''}>
        {sel && selItem && (
          <div className="space-y-4">
            <dl className="text-[13px] grid grid-cols-[130px_1fr] gap-y-2">
              <dt className="text-onyx-60 text-xs">Theme</dt>
              <dd>{THEMES.find((t) => t.id === sel.themeId)?.name}</dd>
              <dt className="text-onyx-60 text-xs">Owner</dt><dd>{sel.owner}</dd>
              <dt className="text-onyx-60 text-xs">Business area</dt><dd>{sel.businessArea}</dd>
              <dt className="text-onyx-60 text-xs">Start</dt><dd>{selItem.startPeriod}</dd>
              <dt className="text-onyx-60 text-xs">Duration</dt>
              <dd>{initDuration[sel.id] ?? '—'} quarters {sel.tshirtSize && <span className="text-onyx-60">(size {sel.tshirtSize})</span>}</dd>
              <dt className="text-onyx-60 text-xs">Wave</dt>
              <dd>{ROADMAP.waves.find((w) => w.id === selItem.waveId)?.label}</dd>
              <dt className="text-onyx-60 text-xs">Priority</dt>
              <dd>
                <BandChip
                  band={priorityBand(
                    initiativeRollup(model.opportunities.filter((o) => o.initiativeId === sel.id).map((o) => oppScore[o.id])).value.value,
                    PRIORITY_MODEL.bands, PRIORITY_MODEL.bandLabels,
                  ).value}
                />
              </dd>
            </dl>

            {selItem.moveReason && (
              <div className="border-l-2 border-verdigris pl-3">
                <div className="text-2xs uppercase tracking-wide text-onyx-60">Last move reason</div>
                <p className="text-[13px] text-onyx mt-0.5">{selItem.moveReason}</p>
              </div>
            )}

            <div>
              <SectionTitle>Effort size</SectionTitle>
              <select
                className={inputCls}
                value={sel.tshirtSize ?? ''}
                onChange={(e) => { updateInitiative(sel.id, { tshirtSize: e.target.value || null }); setToast('Effort size changed — duration and downstream timing recalculated.'); }}
              >
                <option value="">Not sized</option>
                {EFFORT_SCALE.map((s) => (
                  <option key={s.key} value={s.key}>{s.key} — {s.effort} · {s.minMonths}–{s.maxMonths} months</option>
                ))}
              </select>
            </div>

            <div>
              <SectionTitle>Constituent opportunities</SectionTitle>
              <ul className="space-y-1">
                {model.opportunities.filter((o) => o.initiativeId === sel.id).map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 text-[13px] border-b border-onyx-10 pb-1.5">
                    <span className="text-onyx">{o.title}</span>
                    <span className="text-onyx-60 tabular-nums text-xs shrink-0">
                      {oppScore[o.id] === null ? 'not scored' : round2(oppScore[o.id] as number)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>

      <AddDependencyModal
        open={addOpen} onClose={() => setAddOpen(false)}
        initiatives={model.initiatives}
        onAdd={(u, d, type, rationale) => {
          addDependency({ upstreamId: u, downstreamId: d, type, rationale, triggerLanguage: '', confidence: 1, validated: true, origin: 'consultant' });
          setAddOpen(false);
          setToast('Dependency added and validated — scheduling recalculated.');
        }}
      />

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function AddDependencyModal({
  open, onClose, initiatives, onAdd,
}: {
  open: boolean; onClose: () => void;
  initiatives: { id: string; name: string }[];
  onAdd: (u: string, d: string, type: string, rationale: string) => void;
}) {
  const [u, setU] = useState(''); const [d, setD] = useState('');
  const [type, setType] = useState('hard_prerequisite'); const [rationale, setRationale] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Add a dependency">
      <Field label="Upstream — must complete first">
        <select className={inputCls} value={u} onChange={(e) => setU(e.target.value)}>
          <option value="">Select…</option>
          {initiatives.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </Field>
      <Field label="Downstream — depends on it">
        <select className={inputCls} value={d} onChange={(e) => setD(e.target.value)}>
          <option value="">Select…</option>
          {initiatives.filter((i) => i.id !== u).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </Field>
      <Field label="Type" hint="Only hard prerequisites constrain the schedule. The rest are advisory.">
        <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="hard_prerequisite">Hard prerequisite</option>
          <option value="sequencing_preference">Sequencing preference</option>
          <option value="resource_contention">Resource contention</option>
          <option value="collision_risk">Collision risk</option>
        </select>
      </Field>
      <Field label="Rationale">
        <textarea className={inputCls} rows={2} value={rationale} onChange={(e) => setRationale(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" variant="primary" disabled={!u || !d || rationale.trim().length < 3} onClick={() => onAdd(u, d, type, rationale.trim())}>
          Add dependency
        </Button>
      </div>
    </Modal>
  );
}

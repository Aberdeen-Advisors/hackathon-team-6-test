'use client';

import { useMemo, useState } from 'react';
import { useStore, useDerived } from '@/lib/store/store';
import { PageHeader } from '@/components/Shell';
import { Card, Button, Badge, Modal, Toast, Field, inputCls, Banner, SectionTitle, BandChip } from '@/components/ui';
import { buildClientPayload, diffPayloads, type PublishSelection } from '@/lib/publish/buildClientPayload';
import { THEMES } from '@/data/seed';
import { RoadmapTimeline } from '@/components/RoadmapTimeline';

export default function PublishPage() {
  const { model, publications, currentPublication, publish, hasUnpublishedChanges, unpublishedCount } = useStore();
  const { oppBand } = useDerived();

  const prevIds = useMemo(
    () => new Set(currentPublication?.snapshot.opportunities.map((o) => o.id) ?? []),
    [currentPublication],
  );

  const [selected, setSelected] = useState<Set<string>>(() => new Set(prevIds));
  const [caps, setCaps] = useState(true);
  const [roadmap, setRoadmap] = useState(true);
  const [deps, setDeps] = useState(true);
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const selection: PublishSelection = {
    opportunityIds: [...selected],
    includeCapabilities: caps,
    includeRoadmap: roadmap,
    includeDependencies: deps,
  };
  const payload = useMemo(() => buildClientPayload(model, selection), [model, selected, caps, roadmap, deps]);
  const changes = diffPayloads(currentPublication?.snapshot ?? null, payload);

  function toggle(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Publish to client"
        subtitle="Publishing writes a frozen snapshot. The client portal reads that snapshot — it never queries the working model — so anything not selected here cannot reach the client, and your continued editing stays internal until you republish."
        actions={
          <>
            <Button size="sm" onClick={() => setPreview(true)}>Preview as client</Button>
            <Button size="sm" variant="primary" disabled={selected.size === 0} onClick={() => setConfirm(true)}>
              Publish version {(currentPublication?.version ?? 0) + 1}
            </Button>
          </>
        }
      />

      {hasUnpublishedChanges && (
        <div className="mb-5">
          <Banner tone="warn">
            <strong className="font-medium">{unpublishedCount} workspace change{unpublishedCount === 1 ? '' : 's'} since version {currentPublication?.version ?? 0}.</strong>{' '}
            The client is still seeing the previously published snapshot.
          </Banner>
        </div>
      )}

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-5">
        <Card title="Select content to publish" subtitle={`${selected.size} of ${model.opportunities.length} opportunities selected.`}>
          <div className="flex gap-2 mb-4">
            <Button size="sm" onClick={() => setSelected(new Set(model.opportunities.map((o) => o.id)))}>Select all</Button>
            <Button size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
            <Button size="sm" onClick={() => setSelected(new Set(prevIds))}>Match last publication</Button>
          </div>

          <div className="space-y-4">
            {THEMES.map((t) => {
              const inis = model.initiatives.filter((i) => i.themeId === t.id);
              const opps = model.opportunities.filter((o) => inis.some((i) => i.id === o.initiativeId));
              if (opps.length === 0) return null;
              return (
                <div key={t.id}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: t.colour }} />
                    <span className="text-xs font-medium text-aberdeen">{t.name}</span>
                  </div>
                  <div className="space-y-0.5">
                    {opps.map((o) => {
                      const on = selected.has(o.id);
                      const isNew = on && !prevIds.has(o.id);
                      return (
                        <label key={o.id} className={`flex items-center gap-3 rounded px-3 py-2 cursor-pointer border ${on ? 'border-verdigris-200 bg-verdigris-50' : 'border-transparent hover:bg-onyx-5'}`}>
                          <input type="checkbox" checked={on} onChange={() => toggle(o.id)} className="accent-[#44B0B1]" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] text-onyx truncate">{o.title}</span>
                            <span className="block text-2xs text-onyx-40">{o.id} · {model.initiatives.find((i) => i.id === o.initiativeId)?.name}</span>
                          </span>
                          <BandChip band={oppBand[o.id]} />
                          {isNew && <Badge tone="accent">New</Badge>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-onyx-10 space-y-2">
            <SectionTitle>Other artefacts</SectionTitle>
            {([
              [caps, setCaps, 'Current-state maturity assessment', `${model.capabilities.length} capabilities, with the framework disclaimer`],
              [roadmap, setRoadmap, 'Roadmap and waves', 'Timing for published initiatives only'],
              [deps, setDeps, 'Validated dependencies', 'Proposed dependencies are never published'],
            ] as [boolean, (v: boolean) => void, string, string][]).map(([v, set, label, hint]) => (
              <label key={label} className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} className="accent-[#44B0B1] mt-0.5" />
                <span>
                  <span className="block text-[13px] text-onyx">{label}</span>
                  <span className="block text-2xs text-onyx-60">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card title="What the client will see">
            <dl className="text-[13px] space-y-1.5">
              {[
                ['Opportunities', payload.opportunities.length],
                ['Capabilities', payload.capabilities.length],
                ['Roadmap items', payload.roadmapItems.length],
                ['Dependencies', payload.dependencies.length],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between border-b border-onyx-10 pb-1.5">
                  <dt className="text-onyx-60">{k}</dt><dd className="tabular-nums text-aberdeen font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <SectionTitle>Changes since v{currentPublication?.version ?? 0}</SectionTitle>
            <ul className="space-y-1">
              {changes.map((c, i) => (
                <li key={i} className="text-[13px] text-onyx flex gap-2">
                  <span className="text-verdigris-700">·</span>{c}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Never published">
            <ul className="text-[13px] text-onyx-60 space-y-1">
              {[
                'Dimension scores and weighted scores',
                'AI confidence and proposal state',
                'Scoring rationale and internal notes',
                'Evidence excerpts and source citations',
                'Computed-versus-human rank divergence',
                'Unselected and draft content',
              ].map((x) => <li key={x} className="flex gap-2"><span className="text-onyx-20">×</span>{x}</li>)}
            </ul>
            <p className="text-2xs text-onyx-40 mt-3 leading-relaxed border-t border-onyx-10 pt-2.5">
              These fields are absent from the payload object, not hidden in the interface.
              The published band is included; the scores behind it are not.
            </p>
          </Card>
        </div>
      </div>

      {/* preview */}
      <Modal open={preview} onClose={() => setPreview(false)} title="Preview — exactly what the client will see" width="max-w-5xl">
        <div className="max-h-[70vh] overflow-y-auto space-y-5 pr-1">
          <Banner tone="accent">
            Rendered from the same whitelist serialiser that produces the published snapshot.
          </Banner>
          <div>
            <SectionTitle>Roadmap</SectionTitle>
            <div className="border border-onyx-20 rounded overflow-hidden">
              <RoadmapTimeline
                items={payload.roadmapItems.map((r) => ({
                  initiativeId: r.initiativeId, name: r.initiativeName,
                  themeId: THEMES.find((t) => t.name === r.themeName)?.id ?? 'TH-1',
                  startPeriod: r.startPeriod, durationQuarters: r.durationQuarters,
                  waveId: r.waveId, band: r.priorityBand,
                }))}
                deps={[]} conflicts={[]} editable={false} showDeps={false}
              />
            </div>
          </div>
          <div>
            <SectionTitle>Published opportunities</SectionTitle>
            <ul className="space-y-1.5">
              {payload.opportunities.map((o) => (
                <li key={o.id} className="border border-onyx-20 rounded px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] text-aberdeen font-medium">{o.title}</span>
                    <BandChip band={o.priorityBand} />
                  </div>
                  <p className="text-2xs text-onyx-60 mt-1">{o.soWhat}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button size="sm" onClick={() => setPreview(false)}>Close preview</Button>
          <Button size="sm" variant="primary" onClick={() => { setPreview(false); setConfirm(true); }}>Looks right — publish</Button>
        </div>
      </Modal>

      {/* confirm */}
      <Modal open={confirm} onClose={() => setConfirm(false)} title={`Publish version ${(currentPublication?.version ?? 0) + 1}`}>
        <p className="text-[13px] text-onyx-60 mb-4 leading-relaxed">
          This creates an immutable snapshot. Version {currentPublication?.version ?? 0} is retained and remains
          identifiable. Your subsequent workspace edits stay internal until you publish again.
        </p>
        <Field label="Note to the client (optional)" hint="Shown on the client overview alongside the version and date.">
          <textarea className={inputCls} rows={3} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Updated following the alignment session — two initiatives re-sequenced." />
        </Field>
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={() => setConfirm(false)}>Cancel</Button>
          <Button size="sm" variant="primary" onClick={() => {
            publish(selection, note.trim() || 'Roadmap updated.');
            setConfirm(false); setNote('');
            setToast(`Published version ${(currentPublication?.version ?? 0) + 1} to the client portal.`);
          }}>
            Publish
          </Button>
        </div>
      </Modal>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

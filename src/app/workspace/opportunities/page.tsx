'use client';

import { useMemo, useState } from 'react';
import { useStore, useDerived } from '@/lib/store/store';
import { PageHeader } from '@/components/Shell';
import { JourneyRail } from '@/components/JourneyRail';
import { BlankState } from '@/components/BlankState';
import {
  Card, Button, BandChip, QuadrantChip, CalcValue, SidePanel, Modal, Badge, Toast, Field, inputCls, SectionTitle,
} from '@/components/ui';
import { AnchorPicker } from '@/components/AnchorPicker';
import { QuadrantChart, type QuadPoint } from '@/components/QuadrantChart';
import { DIMENSIONS, PRIORITY_MODEL, THEMES, EVIDENCE, OBJECTIVES, EFFORT_SCALE } from '@/data/seed';
import type { Level } from '@/data/seed';
import { weightedScore, priorityBand, quadrant, initiativeRollup, denseRank, round2 } from '@/lib/calc';

type Filter = 'all' | 'unscored' | 'ai' | 'divergence' | 'unpublished';

export default function OpportunitiesPage() {
  const { model, setDimensionScore, setHumanRank, markAiReviewed } = useStore();
  const { oppScore, oppBand } = useDerived();
  const [view, setView] = useState<'table' | 'quadrant'>('table');
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ oppId: string; dimKey: string } | null>(null);
  const [rankFor, setRankFor] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [aiFor, setAiFor] = useState<string | null>(null);

  const ranks = useMemo(
    () => denseRank(model.opportunities.map((o) => ({ id: o.id, score: oppScore[o.id] }))),
    [model.opportunities, oppScore],
  );

  const rows = useMemo(() => {
    return model.opportunities.map((o) => {
      const ini = model.initiatives.find((i) => i.id === o.initiativeId);
      const theme = THEMES.find((t) => t.id === ini?.themeId);
      const inputs = o.scores.map((s) => ({ dimensionKey: s.dimensionKey, level: s.level }));
      const ws = oppScore[o.id];
      const q = quadrant(inputs, PRIORITY_MODEL as never, ws).value;
      const hr = model.humanRanks[o.id];
      const cr = ranks[o.id];
      return {
        o, ini, theme, ws, band: oppBand[o.id], q,
        computedRank: cr, humanRank: hr?.rank ?? null,
        divergence: cr !== null && hr ? cr - hr.rank : null,
        isAi: o.scores.some((s) => s.source === 'ai') && !model.aiReviewed[o.id],
      };
    });
  }, [model, oppScore, oppBand, ranks]);

  const filtered = rows.filter((r) => {
    if (filter === 'unscored') return r.ws === null;
    if (filter === 'ai') return r.isAi;
    if (filter === 'divergence') return r.divergence !== null && Math.abs(r.divergence) >= 3;
    if (filter === 'unpublished') return !r.o.published;
    return true;
  });

  const grouped = THEMES.map((t) => ({
    theme: t,
    rows: filtered.filter((r) => r.theme?.id === t.id),
  })).filter((g) => g.rows.length > 0);

  const points: QuadPoint[] = rows
    .filter((r) => r.q.x !== null)
    .map((r) => ({
      id: r.o.id, title: r.o.title, x: r.q.x as number, y: r.q.y as number,
      size: (r.ws as number) / 5, themeId: r.theme?.id ?? '', band: r.band,
    }));

  const open = openId ? rows.find((r) => r.o.id === openId) : null;
  const pickerOpp = picker ? model.opportunities.find((o) => o.id === picker.oppId) : null;
  const pickerDim = picker ? DIMENSIONS.find((d) => d.key === picker.dimKey) : null;
  const pickerScore = pickerOpp?.scores.find((s) => s.dimensionKey === picker?.dimKey);

  const counts = {
    all: rows.length,
    unscored: rows.filter((r) => r.ws === null).length,
    ai: rows.filter((r) => r.isAi).length,
    divergence: rows.filter((r) => r.divergence !== null && Math.abs(r.divergence) >= 3).length,
    unpublished: rows.filter((r) => !r.o.published).length,
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Opportunities"
        subtitle={`${rows.length} opportunities across ${THEMES.length} investment themes. The opportunity is the unit of prioritisation — scores attach here, and initiatives inherit by calculated rollup.`}
        actions={
          <div className="flex rounded border border-onyx-20 overflow-hidden">
            {(['table', 'quadrant'] as const).map((v) => (
              <button
                key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs capitalize ${view === v ? 'bg-aberdeen text-white' : 'bg-white text-onyx hover:bg-aberdeen-50'}`}
              >
                {v === 'table' ? 'Register' : 'Landscape'}
              </button>
            ))}
          </div>
        }
      />

      <JourneyRail />

      {model.opportunities.length === 0 ? (
        <BlankState
          what="No opportunities in the backlog"
          whyItMatters="The opportunity is the unit of prioritisation — every score, every initiative rollup and every roadmap item derives from it. Opportunities come from capability gaps, from findings, or from a document you upload and accept."
          action="Upload a document" href="/workspace/sources"
          secondary={{ label: 'Assess capabilities first', href: '/workspace/current-state' }}
          demoSection="/workspace/opportunities"
        />
      ) : (
      <>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {([
          ['all', 'All'], ['unscored', 'Missing scores'], ['ai', 'AI suggested'],
          ['divergence', 'High divergence'], ['unpublished', 'Not published'],
        ] as [Filter, string][]).map(([k, label]) => (
          <button
            key={k} onClick={() => setFilter(k)}
            className={`rounded-sm border px-2.5 py-1 text-2xs transition-colors ${
              filter === k ? 'bg-aberdeen text-white border-aberdeen' : 'bg-white text-onyx border-onyx-20 hover:border-aberdeen-200'
            }`}
          >
            {label} <span className={filter === k ? 'text-white/70' : 'text-onyx-40'}>{counts[k]}</span>
          </button>
        ))}
      </div>

      {view === 'quadrant' ? (
        <Card title="The opportunity landscape" subtitle="Business value against urgency if deferred. Bubble size is the weighted composite score; colour is the investment theme.">
          <QuadrantChart points={points} unplotted={rows.length - points.length} onSelect={setOpenId} />
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(({ theme, rows: tr }) => {
            const roll = initiativeRollup(tr.map((r) => r.ws));
            return (
              <Card key={theme.id} flush
                title={
                  <span className="flex items-center gap-2.5">
                    <span className="h-3 w-3 rounded-sm" style={{ background: theme.colour }} />
                    {theme.name}
                    <Badge>Sequence {theme.sequence}</Badge>
                  </span>
                }
                subtitle={theme.strategicQuestion}
                actions={
                  <span className="text-xs text-onyx-60">
                    <CalcValue explain={roll.formulaWithValues}>
                      {roll.value.value === null ? 'Not yet scored' : round2(roll.value.value)}
                    </CalcValue>
                    <span className="ml-1.5 text-onyx-40">
                      — average of {roll.value.scored} of {roll.value.total} scored
                    </span>
                  </span>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-2xs uppercase tracking-wide text-onyx-60 border-b border-onyx-10">
                        <th className="text-left font-medium px-4 py-2">Ref</th>
                        <th className="text-left font-medium px-2 py-2 min-w-[240px]">Opportunity</th>
                        <th className="text-left font-medium px-2 py-2">Initiative</th>
                        {DIMENSIONS.map((d) => (
                          <th key={d.key} className="text-center font-medium px-2 py-2 w-14" title={d.name}>
                            {d.key === 'financial_impact' ? 'D1' : d.key === 'risk_if_deferred' ? 'D2' : 'D3'}
                          </th>
                        ))}
                        <th className="text-left font-medium px-2 py-2">Score</th>
                        <th className="text-left font-medium px-2 py-2">Band</th>
                        <th className="text-left font-medium px-2 py-2">Quadrant</th>
                        <th className="text-center font-medium px-2 py-2">Size</th>
                        <th className="text-center font-medium px-2 py-2">Rank</th>
                        <th className="text-center font-medium px-4 py-2">Pub</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tr.map((r) => (
                        <tr key={r.o.id} className="border-b border-onyx-10 last:border-0 hover:bg-aberdeen-50/50">
                          <td className="px-4 py-2 text-2xs text-onyx-40 font-mono whitespace-nowrap">{r.o.id}</td>
                          <td className="px-2 py-2">
                            <button onClick={() => setOpenId(r.o.id)} className="text-left text-aberdeen hover:underline font-medium">
                              {r.o.title}
                            </button>
                            {r.isAi && <span className="ml-2"><Badge tone="accent">AI suggested</Badge></span>}
                          </td>
                          <td className="px-2 py-2 text-onyx-60 text-xs">{r.ini?.name}</td>
                          {DIMENSIONS.map((d) => {
                            const sc = r.o.scores.find((s) => s.dimensionKey === d.key);
                            return (
                              <td key={d.key} className="px-2 py-2 text-center">
                                <button
                                  onClick={() => setPicker({ oppId: r.o.id, dimKey: d.key })}
                                  title={sc?.level ? `${sc.level} — ${d.anchors.find((a) => a.level === sc.level)?.label}` : 'Not scored — click to score'}
                                  className={`h-7 w-7 rounded-sm text-xs font-medium transition-colors ${
                                    sc?.level
                                      ? 'bg-aberdeen-50 text-aberdeen border border-aberdeen-200 hover:bg-aberdeen hover:text-white'
                                      : 'border border-dashed border-onyx-20 text-onyx-40 hover:border-verdigris hover:text-aberdeen'
                                  }`}
                                >
                                  {sc?.level ?? '–'}
                                </button>
                              </td>
                            );
                          })}
                          <td className="px-2 py-2">
                            {r.ws === null ? (
                              <span className="text-2xs text-onyx-60">
                                Not yet scored — {r.o.scores.filter((s) => s.level !== null).length} of {r.o.scores.length}
                              </span>
                            ) : (
                              <CalcValue
                                explain={weightedScore(r.o.scores.map((s) => ({ dimensionKey: s.dimensionKey, level: s.level })), DIMENSIONS).formulaWithValues}
                              >
                                {round2(r.ws)}
                              </CalcValue>
                            )}
                          </td>
                          <td className="px-2 py-2"><BandChip band={r.band} /></td>
                          <td className="px-2 py-2"><QuadrantChip q={r.q.quadrant} /></td>
                          <td className="px-2 py-2 text-center text-xs text-onyx-60">{r.o.tshirtSize ?? '–'}</td>
                          <td className="px-2 py-2 text-center">
                            <button onClick={() => setRankFor(r.o.id)} className="text-xs hover:underline">
                              <span className="text-onyx-60">{r.computedRank ?? '–'}</span>
                              {r.humanRank !== null && (
                                <>
                                  <span className="text-onyx-20 mx-0.5">/</span>
                                  <span className={Math.abs(r.divergence ?? 0) >= 3 ? 'text-jasper font-medium' : 'text-aberdeen'}>
                                    {r.humanRank}
                                  </span>
                                </>
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-2 text-center">
                            {r.o.published
                              ? <Badge tone="ok">Published</Badge>
                              : <Badge>Internal</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
          {grouped.length === 0 && (
            <Card><p className="text-sm text-onyx-60 text-center py-8">No opportunities match this filter.</p></Card>
          )}
        </div>
      )}

      {/* ---------- anchor picker ---------- */}
      <Modal open={!!picker} onClose={() => setPicker(null)} title="Score this dimension" width="max-w-xl">
        {pickerDim && picker && (
          <AnchorPicker
            dimension={pickerDim}
            current={pickerScore?.level ?? null}
            currentRationale={pickerScore?.rationale ?? ''}
            onClose={() => setPicker(null)}
            onSave={(level, rationale) => {
              setDimensionScore(picker.oppId, picker.dimKey, level, rationale, 'human');
              markAiReviewed(picker.oppId);
              setPicker(null);
              setToast('Score saved — priority recalculated.');
            }}
          />
        )}
      </Modal>

      {/* ---------- human rank ---------- */}
      <RankModal
        oppId={rankFor} onClose={() => setRankFor(null)}
        onSave={(id, rank, rationale) => { setHumanRank(id, rank, rationale); setRankFor(null); setToast(rank === null ? 'Override cleared.' : 'Human rank recorded alongside the computed rank.'); }}
        rows={rows}
      />

      {/* ---------- detail ---------- */}
      <SidePanel
        open={!!open} onClose={() => setOpenId(null)}
        title={open?.o.title ?? ''}
        subtitle={open ? `${open.o.id} · ${open.theme?.name} → ${open.ini?.name}` : ''}
        width="w-[620px]"
      >
        {open && (
          <div className="space-y-6">
            <div>
              <SectionTitle>What and why</SectionTitle>
              <p className="text-[13px] text-onyx leading-relaxed">{open.o.description}</p>
              <div className="mt-3 border-l-2 border-verdigris pl-3">
                <div className="text-2xs uppercase tracking-wide text-onyx-60 mb-1">So what</div>
                <p className="text-[13px] text-onyx leading-relaxed">{open.o.soWhat}</p>
              </div>
              <div className="mt-3 bg-aberdeen-50 rounded px-3 py-2.5">
                <div className="text-2xs uppercase tracking-wide text-onyx-60 mb-1">Recommended action</div>
                <p className="text-[13px] text-aberdeen leading-relaxed">{open.o.recommendedAction}</p>
              </div>
            </div>

            <div>
              <SectionTitle note="AI proposes the inputs; code computes the outputs">Scoring</SectionTitle>
              <div className="space-y-2">
                {DIMENSIONS.map((d) => {
                  const sc = open.o.scores.find((s) => s.dimensionKey === d.key);
                  const anchor = d.anchors.find((a) => a.level === sc?.level);
                  return (
                    <div key={d.key} className="border border-onyx-20 rounded px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-aberdeen">{d.name}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-2xs text-onyx-40">weight {d.weight}</span>
                          <button
                            onClick={() => setPicker({ oppId: open.o.id, dimKey: d.key })}
                            className="h-6 min-w-6 px-1.5 rounded-sm bg-aberdeen text-white text-xs font-medium"
                          >
                            {sc?.level ?? '–'}
                          </button>
                        </span>
                      </div>
                      {anchor ? (
                        <>
                          <div className="text-2xs font-medium text-onyx mt-1.5">{anchor.label}</div>
                          <div className="text-2xs text-onyx-60 mt-0.5 leading-relaxed">{anchor.description}</div>
                          {sc?.rationale && (
                            <div className="text-2xs text-onyx mt-1.5 italic border-l border-onyx-20 pl-2">{sc.rationale}</div>
                          )}
                          {sc?.evidenceIds?.length ? (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {sc.evidenceIds.map((eid) => {
                                const ev = EVIDENCE.find((e) => e.id === eid);
                                return (
                                  <span key={eid} title={ev?.excerpt} className="rounded-sm bg-onyx-5 border border-onyx-20 px-1.5 py-0.5 text-2xs text-onyx-60 cursor-help">
                                    {eid} · {ev?.location}
                                  </span>
                                );
                              })}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <div className="text-2xs text-onyx-60 mt-1.5">Not yet scored.</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 calc-field px-3 py-2.5">
                <div className="text-2xs uppercase tracking-wide text-onyx-60 mb-1.5">Calculated</div>
                {open.ws === null ? (
                  <p className="text-[13px] text-onyx">
                    Not yet scored — {open.o.scores.filter((s) => s.level !== null).length} of {open.o.scores.length} dimensions complete.
                    <span className="block text-2xs text-onyx-60 mt-1">
                      No partial score is shown. A blank dimension is not zero.
                    </span>
                  </p>
                ) : (
                  <>
                    <p className="text-[13px] text-onyx font-mono">
                      {weightedScore(open.o.scores.map((s) => ({ dimensionKey: s.dimensionKey, level: s.level })), DIMENSIONS).formulaWithValues}
                    </p>
                    <p className="text-[13px] text-onyx font-mono mt-1">
                      {priorityBand(open.ws, PRIORITY_MODEL.bands, PRIORITY_MODEL.bandLabels).formulaWithValues}
                    </p>
                    <p className="text-[13px] text-onyx font-mono mt-1">
                      {quadrant(open.o.scores.map((s) => ({ dimensionKey: s.dimensionKey, level: s.level })), PRIORITY_MODEL as never, open.ws).formulaWithValues}
                    </p>
                  </>
                )}
              </div>

              <div className="mt-3">
                <Button size="sm" variant="secondary" onClick={() => setAiFor(open.o.id)}>
                  Propose scores with AI
                </Button>
              </div>
            </div>

            <div>
              <SectionTitle>Priority reconciliation</SectionTitle>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="border border-onyx-20 rounded px-2 py-2">
                  <div className="text-2xs text-onyx-60">Computed</div>
                  <div className="text-lg font-light text-aberdeen">{open.computedRank ?? '–'}</div>
                </div>
                <div className="border border-onyx-20 rounded px-2 py-2">
                  <div className="text-2xs text-onyx-60">Human</div>
                  <div className="text-lg font-light text-aberdeen">{open.humanRank ?? '–'}</div>
                </div>
                <div className={`border rounded px-2 py-2 ${Math.abs(open.divergence ?? 0) >= 3 ? 'border-jasper/50 bg-jasper-tint' : 'border-onyx-20'}`}>
                  <div className="text-2xs text-onyx-60">Divergence</div>
                  <div className="text-lg font-light text-aberdeen">{open.divergence === null ? '–' : (open.divergence > 0 ? `+${open.divergence}` : open.divergence)}</div>
                </div>
              </div>
              {model.humanRanks[open.o.id]?.rationale && (
                <p className="text-2xs text-onyx-60 mt-2 italic leading-relaxed">
                  {model.humanRanks[open.o.id].rationale}
                </p>
              )}
              <Button size="sm" className="mt-2" onClick={() => setRankFor(open.o.id)}>Set human rank</Button>
            </div>

            <div>
              <SectionTitle>Classification</SectionTitle>
              <dl className="text-[13px] grid grid-cols-[130px_1fr] gap-y-1.5">
                <dt className="text-onyx-60 text-xs">Business area</dt><dd>{open.o.businessArea}</dd>
                <dt className="text-onyx-60 text-xs">Effort</dt>
                <dd>{open.o.tshirtSize ?? 'Not sized'}{open.o.tshirtSize && (() => {
                  const e = EFFORT_SCALE.find((x) => x.key === open.o.tshirtSize);
                  return e ? <span className="text-onyx-60 text-xs"> · {e.minMonths}–{e.maxMonths} months · {e.risk}</span> : null;
                })()}</dd>
                <dt className="text-onyx-60 text-xs">Investment type</dt><dd className="capitalize">{open.o.investmentType?.replace(/_/g, ' ') ?? '–'}</dd>
                <dt className="text-onyx-60 text-xs">Objectives</dt>
                <dd>{open.o.objectiveIds.map((id) => OBJECTIVES.find((x) => x.id === id)?.title).filter(Boolean).join(' · ') || '–'}</dd>
              </dl>
            </div>

            <div>
              <SectionTitle note="Aberdeen only — never published">Evidence</SectionTitle>
              <div className="space-y-1.5">
                {open.o.evidenceIds.map((eid) => {
                  const ev = EVIDENCE.find((e) => e.id === eid);
                  if (!ev) return null;
                  return (
                    <div key={eid} className="border border-onyx-20 rounded px-3 py-2">
                      <p className="text-[13px] text-onyx leading-relaxed">&ldquo;{ev.excerpt}&rdquo;</p>
                      <p className="text-2xs text-onyx-40 mt-1">{ev.id} · {ev.type} · {ev.source} · {ev.location}</p>
                    </div>
                  );
                })}
                {open.o.evidenceIds.length === 0 && <p className="text-2xs text-onyx-60">No evidence linked.</p>}
              </div>
            </div>
          </div>
        )}
      </SidePanel>

      <AiProposalModal
        oppId={aiFor} onClose={() => setAiFor(null)}
        onAccept={(oppId, dimKey, level, rationale) => setDimensionScore(oppId, dimKey, level, rationale, 'ai')}
        onDone={(n) => { if (aiFor) markAiReviewed(aiFor); setToast(`${n} AI-proposed score${n === 1 ? '' : 's'} accepted and recalculated.`); }}
      />

      </>
      )}

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

/* ------------------------------------------------------------- rank modal */

function RankModal({
  oppId, onClose, onSave, rows,
}: {
  oppId: string | null; onClose: () => void;
  onSave: (id: string, rank: number | null, rationale: string) => void;
  rows: { o: { id: string; title: string }; computedRank: number | null; humanRank: number | null }[];
}) {
  const row = rows.find((r) => r.o.id === oppId);
  const [rank, setRank] = useState('');
  const [rationale, setRationale] = useState('');

  return (
    <Modal open={!!oppId} onClose={onClose} title="Record a human priority rank">
      {row && (
        <>
          <p className="text-[13px] text-onyx-60 mb-4 leading-relaxed">
            The computed rank is <strong className="text-aberdeen">{row.computedRank ?? '–'}</strong>. A human rank is
            recorded <em>alongside</em> it — neither value overwrites the other, and the divergence between them is
            where the alignment conversation happens.
          </p>
          <Field label="Human rank" hint="Leave blank and save to clear an existing override.">
            <input className={inputCls} type="number" min={1} value={rank} onChange={(e) => setRank(e.target.value)} placeholder={String(row.humanRank ?? '')} />
          </Field>
          <Field label="Rationale (required)">
            <textarea className={inputCls} rows={3} value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Why does leadership place this differently from the model?" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" variant="primary" disabled={rank !== '' && rationale.trim().length < 3}
              onClick={() => onSave(row.o.id, rank === '' ? null : Number(rank), rationale.trim())}>
              Save
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

/* --------------------------------------------------------- AI proposal ---- */

const AI_PROPOSALS: Record<string, { dimensionKey: string; level: Level; anchorLabel: string; rationale: string; evidenceIds: string[]; confidence: number }[]> = {
  'OPP-014': [
    { dimensionKey: 'risk_if_deferred', level: 3, anchorLabel: 'Compounding', rationale: 'Manual supplier onboarding does not fail outright, but each quarter of deferral adds reconciliation debt and extends time-to-market for new range.', evidenceIds: ['EV-008'], confidence: 0.78 },
  ],
  'OPP-006': [
    { dimensionKey: 'financial_impact', level: 2, anchorLabel: 'Indirect', rationale: 'Enables higher-impact integration and platform work but produces no direct financial outcome on its own.', evidenceIds: ['EV-004'], confidence: 0.83 },
    { dimensionKey: 'risk_if_deferred', level: 3, anchorLabel: 'Compounding', rationale: 'Integration debt accumulates at a predictable rate with each ungoverned programme decision.', evidenceIds: ['EV-004'], confidence: 0.74 },
  ],
  'OPP-012': [
    { dimensionKey: 'financial_impact', level: 4, anchorLabel: 'Material', rationale: 'Removes a known annual delivery loss caused by funding discontinuity against a multi-year programme.', evidenceIds: ['EV-014'], confidence: 0.86 },
    { dimensionKey: 'strategic_alignment', level: 4, anchorLabel: 'Direct enabler', rationale: 'Directly enables the named revenue growth goal by making the re-architecture deliverable within its stated horizon.', evidenceIds: ['EV-014'], confidence: 0.81 },
  ],
};

function AiProposalModal({
  oppId, onClose, onAccept, onDone,
}: {
  oppId: string | null; onClose: () => void;
  onAccept: (oppId: string, dimKey: string, level: Level, rationale: string) => void;
  onDone: (n: number) => void;
}) {
  const [phase, setPhase] = useState<'idle' | 'thinking' | 'ready'>('idle');
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});

  const proposals = oppId ? (AI_PROPOSALS[oppId] ?? []) : [];

  if (oppId && phase === 'idle') {
    setPhase('thinking');
    setTimeout(() => setPhase('ready'), 900);
  }

  function close() {
    const n = Object.values(accepted).filter(Boolean).length;
    if (n > 0) onDone(n);
    setPhase('idle'); setAccepted({}); onClose();
  }

  return (
    <Modal open={!!oppId} onClose={close} title="AI scoring proposal" width="max-w-2xl">
      {phase === 'thinking' && (
        <div className="py-10 text-center">
          <div className="inline-flex items-center gap-2.5 text-[13px] text-onyx-60">
            <span className="h-2 w-2 rounded-full bg-verdigris animate-pulse" />
            Analysing linked evidence against the scoring rubric…
          </div>
        </div>
      )}

      {phase === 'ready' && (
        <>
          <p className="text-[13px] text-onyx-60 mb-4 leading-relaxed">
            The model proposes a <strong className="text-aberdeen">level and anchor</strong> for each dimension, with the
            evidence it relied on. It does not compute the weighted score, the band or the quadrant — those are
            calculated once a consultant accepts the inputs.
          </p>

          {proposals.length === 0 ? (
            <p className="text-[13px] text-onyx-60 py-6 text-center">
              All dimensions on this opportunity are already scored by a consultant. The model has nothing to propose.
            </p>
          ) : (
            <div className="space-y-3">
              {proposals.map((p) => {
                const dim = DIMENSIONS.find((d) => d.key === p.dimensionKey);
                const done = accepted[p.dimensionKey];
                return (
                  <div key={p.dimensionKey} className={`border rounded px-4 py-3 ${done ? 'border-jade/50 bg-jade-tint' : 'border-onyx-20'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-aberdeen">{dim?.name}</div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="grid h-6 w-6 place-items-center rounded-sm bg-aberdeen text-white text-xs font-semibold">{p.level}</span>
                          <span className="text-[13px] text-onyx font-medium">{p.anchorLabel}</span>
                          <Badge tone="accent">AI suggested</Badge>
                        </div>
                        <p className="text-2xs text-onyx-60 mt-2 leading-relaxed">{p.rationale}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {p.evidenceIds.map((eid) => {
                            const ev = EVIDENCE.find((e) => e.id === eid);
                            return (
                              <span key={eid} className="rounded-sm bg-white border border-onyx-20 px-1.5 py-0.5 text-2xs text-onyx-60" title={ev?.excerpt}>
                                {eid} · {ev?.source}
                              </span>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-2 mt-2.5">
                          <span className="text-2xs text-onyx-60">Confidence</span>
                          <span className="h-1.5 w-24 rounded-full bg-onyx-10 overflow-hidden">
                            <span className="block h-full bg-verdigris" style={{ width: `${p.confidence * 100}%` }} />
                          </span>
                          <span className="text-2xs text-onyx tabular-nums">{p.confidence.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col gap-1.5">
                        {done ? (
                          <Badge tone="ok">Accepted</Badge>
                        ) : (
                          <>
                            <Button size="sm" variant="primary" onClick={() => { if (oppId) onAccept(oppId, p.dimensionKey, p.level, p.rationale); setAccepted((a) => ({ ...a, [p.dimensionKey]: true })); }}>
                              Accept
                            </Button>
                            <Button size="sm" onClick={() => setAccepted((a) => ({ ...a, [p.dimensionKey]: false }))}>Reject</Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button size="sm" variant="primary" onClick={close}>Done</Button>
          </div>
        </>
      )}
    </Modal>
  );
}

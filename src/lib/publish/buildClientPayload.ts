/**
 * WHITELIST SERIALISER — the internal/external boundary.
 *
 * This constructs a NEW object containing only permitted fields. It is not a filter,
 * not CSS hiding, and not conditional rendering inside workspace components.
 *
 * In production this payload is frozen into an immutable snapshot at publish time and
 * the client interface reads that snapshot rather than the working model, so a field
 * accidentally omitted from this function cannot leak. See PRD section 25.4.
 *
 * NEVER included: dimension scores, weighted scores, AI confidence, AI proposal state,
 * score rationale, internal notes, unpublished items, evidence excerpts, or the
 * computed-versus-human rank divergence.
 */
import type { Model, ClientPayload } from '@/lib/store/types';
import { THEMES, ROADMAP, TECHNOLOGY_FUNCTIONS, MATURITY_FRAMEWORK, ENGAGEMENT } from '@/data/seed';
import { weightedScore, priorityBand, maturityGap, maturityLabel, durationQuarters } from '@/lib/calc';
import { DIMENSIONS, PRIORITY_MODEL, EFFORT_SCALE } from '@/data/seed';

export interface PublishSelection {
  opportunityIds: string[];
  includeCapabilities: boolean;
  includeRoadmap: boolean;
  includeDependencies: boolean;
}

export function buildClientPayload(model: Model, selection: PublishSelection): ClientPayload {
  const themeOf = (initiativeId: string) => {
    const ini = model.initiatives.find((i) => i.id === initiativeId);
    return THEMES.find((t) => t.id === ini?.themeId);
  };

  const opportunities = model.opportunities
    .filter((o) => selection.opportunityIds.includes(o.id))
    .map((o) => {
      const ini = model.initiatives.find((i) => i.id === o.initiativeId);
      const th = themeOf(o.initiativeId);
      const ws = weightedScore(o.scores.map((s) => ({ dimensionKey: s.dimensionKey, level: s.level })), DIMENSIONS).value;
      return {
        id: o.id,
        title: o.title,
        description: o.description,
        soWhat: o.soWhat,
        recommendedAction: o.recommendedAction,
        themeName: th?.name ?? '',
        themeColour: th?.colour ?? '#404040',
        initiativeName: ini?.name ?? '',
        initiativeId: o.initiativeId,
        businessArea: o.businessArea,
        // Band is published; the underlying dimension scores are not (PRD OQ-11).
        priorityBand: priorityBand(ws, PRIORITY_MODEL.bands, PRIORITY_MODEL.bandLabels).value,
        tshirtSize: o.tshirtSize,
      };
    });

  const capabilities = selection.includeCapabilities
    ? model.capabilities.map((c) => ({
        id: c.id,
        functionName: TECHNOLOGY_FUNCTIONS.find((f) => f.id === c.functionId)?.name ?? '',
        name: c.name,
        current: c.current,
        target: c.target,
        gap: maturityGap(c.current, c.target).value ?? 0,
        currentLabel: maturityLabel(c.current, MATURITY_FRAMEWORK.levels) ?? '',
        rationale: c.rationale,
        priorityToFix: c.priorityToFix,
      }))
    : [];

  const publishedInitiativeIds = new Set(opportunities.map((o) => o.initiativeId));

  const roadmapItems = selection.includeRoadmap
    ? model.roadmapItems
        .filter((r) => publishedInitiativeIds.has(r.initiativeId))
        .map((r) => {
          const ini = model.initiatives.find((i) => i.id === r.initiativeId);
          const th = THEMES.find((t) => t.id === ini?.themeId);
          const ws = model.opportunities
            .filter((o) => o.initiativeId === r.initiativeId)
            .map((o) => weightedScore(o.scores.map((s) => ({ dimensionKey: s.dimensionKey, level: s.level })), DIMENSIONS).value)
            .filter((v): v is number => v !== null);
          const avg = ws.length ? ws.reduce((a, b) => a + b, 0) / ws.length : null;
          return {
            initiativeId: r.initiativeId,
            initiativeName: ini?.name ?? '',
            themeName: th?.name ?? '',
            themeColour: th?.colour ?? '#404040',
            waveId: r.waveId,
            startPeriod: r.startPeriod,
            durationQuarters: durationQuarters(ini?.tshirtSize ?? null, EFFORT_SCALE).value,
            businessArea: ini?.businessArea ?? '',
            owner: ini?.owner ?? '',
            priorityBand: priorityBand(avg, PRIORITY_MODEL.bands, PRIORITY_MODEL.bandLabels).value,
          };
        })
    : [];

  const dependencies = selection.includeDependencies
    ? model.dependencies
        .filter((d) => d.validated && publishedInitiativeIds.has(d.upstreamId) && publishedInitiativeIds.has(d.downstreamId))
        .map((d) => ({
          id: d.id,
          upstreamName: model.initiatives.find((i) => i.id === d.upstreamId)?.name ?? '',
          downstreamName: model.initiatives.find((i) => i.id === d.downstreamId)?.name ?? '',
          type: d.type,
          rationale: d.rationale,
        }))
    : [];

  return {
    mandate: ENGAGEMENT.mandate,
    clientName: ENGAGEMENT.clientName,
    engagementName: ENGAGEMENT.name,
    phase: ENGAGEMENT.phase,
    opportunities,
    capabilities,
    roadmapItems,
    waves: ROADMAP.waves.map((w) => ({
      id: w.id, label: w.label, startPeriod: w.startPeriod, endPeriod: w.endPeriod, targetOutcome: w.targetOutcome,
    })),
    dependencies,
    themes: THEMES.map((t) => ({ id: t.id, name: t.name, colour: t.colour, strategicQuestion: t.strategicQuestion })),
    frameworkDisclaimer: MATURITY_FRAMEWORK.disclaimer,
    roadmapStart: ROADMAP.startPeriod,
    horizonQuarters: ROADMAP.horizonQuarters,
  };
}

/** Plain-language diff between two publications, for the client "what changed" view. */
export function diffPayloads(prev: ClientPayload | null, next: ClientPayload): string[] {
  if (!prev) return ['First publication.'];
  const out: string[] = [];

  const prevIds = new Set(prev.opportunities.map((o) => o.id));
  const nextIds = new Set(next.opportunities.map((o) => o.id));
  const added = [...nextIds].filter((i) => !prevIds.has(i));
  const removed = [...prevIds].filter((i) => !nextIds.has(i));
  if (added.length) out.push(`${added.length} initiative${added.length > 1 ? 's' : ''} added to the published set.`);
  if (removed.length) out.push(`${removed.length} item${removed.length > 1 ? 's' : ''} withdrawn.`);

  let moved = 0;
  for (const n of next.roadmapItems) {
    const p = prev.roadmapItems.find((x) => x.initiativeId === n.initiativeId);
    if (p && p.startPeriod !== n.startPeriod) moved += 1;
  }
  if (moved) out.push(`${moved} initiative${moved > 1 ? 's' : ''} re-sequenced on the roadmap.`);

  const depDelta = next.dependencies.length - prev.dependencies.length;
  if (depDelta > 0) out.push(`${depDelta} dependency relationship${depDelta > 1 ? 's' : ''} added.`);

  let rebanded = 0;
  for (const n of next.opportunities) {
    const p = prev.opportunities.find((x) => x.id === n.id);
    if (p && p.priorityBand !== n.priorityBand) rebanded += 1;
  }
  if (rebanded) out.push(`${rebanded} item${rebanded > 1 ? 's' : ''} changed priority band.`);

  return out.length ? out : ['No substantive changes since the previous version.'];
}

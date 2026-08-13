/**
 * Partner-quality insight engine — PURE, tested, deterministic.
 *
 * This is a second pass over the document. Where `synthesise.ts` classifies individual
 * sentences, this engine looks ACROSS the evidence for the combinations a senior advisor
 * reacts to: an ambition that outruns the capability underneath it, a prerequisite that
 * concentrates risk, a figure that looks small against the scale it has to cover, a
 * decision that keeps being deferred.
 *
 * Each pattern supplies the analytical SHAPE; the document supplies every specific — the
 * systems, the counts, the amounts, the quoted language. A pattern that cannot find its
 * specifics does not fire. That is what keeps the output from reading as boilerplate.
 *
 * It is rule-based, not model-based. The production specification (PRD section 14) puts an
 * LLM here returning this same schema, under the same human-review gate. The schema, the
 * classification discipline and the evidence requirement are the durable parts.
 */

import type { DocStructure, DocParagraph } from '@/lib/ingest/synthesise';
import { splitSentences, extractAmounts, extractMetrics, extractEntities } from '@/lib/ingest/synthesise';

export type InsightClass = 'fact' | 'inference' | 'hypothesis' | 'contradiction' | 'gap';
export type InsightConfidence = 'high' | 'medium' | 'low';

export interface InsightEvidence {
  excerpt: string;
  paragraphIndex: number;
  section: string;
  documentName: string;
}

export interface Insight {
  id: string;
  pattern: string;
  headline: string;
  observed: string;
  whyItMatters: string;
  rootCause: string | null;
  roadmapImplication: string;
  recommendedResponse: string;
  evidence: InsightEvidence[];
  classification: InsightClass;
  confidence: InsightConfidence;
  confidenceReason: string;
  openQuestion: string;
  topics: string[];
  entities: string[];
  amounts: number[];
}

interface Ctx {
  doc: DocStructure;
  sentences: { text: string; p: DocParagraph }[];
  topicOf: (s: string) => string | null;
}

const TOPIC_TERMS: [string, RegExp][] = [
  ['data and analytics', /\b(data|analytic|report|dashboard|warehouse|master data|MDM|PIM|golden record|BI)\b/i],
  ['security and risk', /\b(security|cyber|threat|breach|identity|IAM|access|vulnerab|ransomware|incident response)\b/i],
  ['integration and architecture', /\b(integration|API|architecture|middleware|interface|event|batch|file transfer)\b/i],
  ['core platforms', /\b(ERP|finance system|general ledger|mainframe|core (?:system|platform)|order (?:processing|management))\b/i],
  ['digital and commerce', /\b(commerce|e-?commerce|website|digital|portal|storefront|omnichannel)\b/i],
  ['infrastructure', /\b(infrastructure|cloud|network|server|hosting|device|end[- ]of[- ]life|hardware)\b/i],
  ['operating model', /\b(governance|operating model|portfolio|intake|prioritis|steering|PMO|decision right|accountab)\b/i],
  ['people and capability', /\b(talent|hiring|recruit|skills?|headcount|vacan|resourc|capacity|training|attrition|FTE|role)\b/i],
  ['supply chain', /\b(supply chain|warehouse|distribution|logistics|inventory|fulfil|replenish|procurement|supplier)\b/i],
];

const RX = {
  objective: /\b(objective is|goal is|aims? to|targets?|ambition|we will|our priority|intends? to|seeks? to|must deliver|committed to|expects? to (?:grow|increase|reduce|deliver))\b/i,
  gap: /\b(no\s|lack(?:s|ing)? of|absence of|cannot|unable|fragmented|inconsistent|legacy|manual(?:ly)?|undocumented|not documented|single point of failure|bottleneck|siloed|workaround|end[- ]of[- ]life|unsupported|stalled|immature|constrain)\b/i,
  keyPerson: /\b(single (?:systems? )?(?:programmer|administrator|engineer|resource|person)|key[- ]person|one person|sole (?:resource|owner|administrator)|no succession|no cross[- ]training|no documented runbook)\b/i,
  prerequisite: /\b(must be (?:complete|completed|in place)|prerequisite|pre-requisite|cannot (?:start|launch|proceed|begin)(?: until| without)|depends? on|before (?:the |any )?\w+ can)\b/i,
  deferred: /\b(deferred|not yet (?:decided|approved|funded|scoped|started)|pending (?:approval|decision|a decision)|has (?:not|yet to) be(?:en)? (?:decided|approved)|awaiting (?:approval|a decision|sign[- ]off)|subject to board approval|still not (?:been )?(?:tested|approved|funded))\b/i,
  strength: /\b(deployed|live|in place|operational|successfully|已|established|proven|stable|reliable|already (?:paid for|licensed|purchased|invested))\b/i,
  capacity: /\b(open (?:technology )?roles?|vacan|constrain delivery|capacity|bandwidth|understaffed|stretched|competing (?:priorities|programmes))\b/i,
  scale: /\b(\d+)\s*(sites?|stores?|distribution centres?|distribution centers?|systems?|instances?|platforms?|teams?|countries|users?)\b/i,
};

const money = (v: number) => (v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(2)}m` : v >= 1_000 ? `$${Math.round(v / 1_000)}k` : `$${v}`);
const trim = (s: string, n = 190) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n)) + '…');
const clause = (s: string) => s.replace(/^[A-Z]/, (c) => c.toLowerCase()).replace(/\.$/, '');

function ev(s: { text: string; p: DocParagraph }, docName: string): InsightEvidence {
  return { excerpt: s.text, paragraphIndex: s.p.index, section: s.p.section, documentName: docName };
}

/* ═══════════════════════════════════════════════════════════════ patterns */

type Pattern = (c: Ctx) => Omit<Insight, 'id'>[];

/** 1 — stated ambition against the capability that has to carry it */
const ambitionVsCapability: Pattern = (c) => {
  const out: Omit<Insight, 'id'>[] = [];
  const objectives = c.sentences.filter((s) => RX.objective.test(s.text));
  const gaps = c.sentences.filter((s) => RX.gap.test(s.text) && !RX.objective.test(s.text));

  for (const [topic] of TOPIC_TERMS) {
    const o = objectives.find((s) => c.topicOf(s.text) === topic);
    const relevantGaps = gaps.filter((s) => c.topicOf(s.text) === topic);
    if (!o || relevantGaps.length < 1) continue;

    const g = relevantGaps.sort((a, b) => extractMetrics(b.text).length - extractMetrics(a.text).length)[0];
    const metrics = extractMetrics(g.text);
    const ents = [...new Set([...extractEntities(o.text), ...extractEntities(g.text)])].slice(0, 4);

    out.push({
      pattern: 'ambition-vs-capability',
      headline: `The stated ambition in ${topic} is not currently supported by the capability underneath it`,
      observed: `Leadership states that ${clause(trim(o.text, 150))}. In the same domain the evidence records that ${clause(trim(g.text, 170))}${metrics.length ? ` — at a scale of ${metrics.slice(0, 2).join(' and ')}` : ''}.`,
      whyItMatters: `An objective of this kind is delivered through the ${topic} capability, not alongside it. On the evidence available, that capability cannot presently carry the ambition, so the commitment is being made against a foundation that has not yet been built.`,
      rootCause: relevantGaps.length > 1
        ? `The gap appears structural rather than incidental — ${relevantGaps.length} separate observations in this domain describe the same underlying weakness.`
        : null,
      roadmapImplication: `The enabling work in ${topic} has to be sequenced ahead of, or in parallel with, anything that depends on this objective. Treating the objective as a wave-one deliverable without the capability work is the most likely source of slippage.`,
      recommendedResponse: `Confirm with the sponsor whether the objective date is fixed. If it is, the capability work becomes a wave-one prerequisite and should be scoped and funded as such; if not, sequence the capability first and set the objective against a realistic date.`,
      evidence: [ev(o, c.doc.filename), ev(g, c.doc.filename)],
      classification: 'inference',
      confidence: relevantGaps.length > 1 && metrics.length > 0 ? 'high' : relevantGaps.length > 1 ? 'medium' : 'low',
      confidenceReason: `Based on ${relevantGaps.length + 1} corroborating statements in ${topic}${metrics.length ? ' including quantified scale' : ', though without quantified scale'}.`,
      openQuestion: `Is the objective date a commitment already made externally, or an internal aspiration that can move?`,
      topics: [topic], entities: ents, amounts: [],
    });
  }
  return out.slice(0, 3);
};

/** 2 — concentration of operational risk in a single person or undocumented asset */
const keyPersonConcentration: Pattern = (c) => {
  const hits = c.sentences.filter((s) => RX.keyPerson.test(s.text));
  if (hits.length === 0) return [];
  const primary = hits[0];
  const scale = c.sentences.map((s) => s.text.match(RX.scale)).find(Boolean);
  const ents = extractEntities(primary.text).slice(0, 4);
  const topic = c.topicOf(primary.text) ?? 'core platforms';

  return [{
    pattern: 'key-person-concentration',
    headline: `Operational continuity depends on a single point of human failure that has no documented fallback`,
    observed: `The evidence records that ${clause(trim(primary.text, 200))}.${hits.length > 1 ? ` A further ${hits.length - 1} statement${hits.length > 2 ? 's describe' : ' describes'} the same pattern elsewhere in the estate.` : ''}${scale ? ` The affected environment covers ${scale[0]}.` : ''}`,
    whyItMatters: `This is not a technology risk, it is a continuity risk, and it sits outside the organisation's control. The exposure is unbounded in the sense that its trigger — a person becoming unavailable — cannot be scheduled, mitigated by investment alone, or detected in advance.`,
    rootCause: `Knowledge has accumulated in an individual rather than in documentation or tooling, most often because the platform has been stable enough that the absence of a runbook never became visible.`,
    roadmapImplication: `Documentation and cross-training belong in wave one regardless of their priority score, because they are cheap, fast, and they de-risk everything sequenced behind them. Any modernisation of this platform should be treated as blocked until the current-state behaviour is documented.`,
    recommendedResponse: `Commission runbook documentation and a named second operator this quarter. Treat it as a continuity control rather than an improvement initiative, so it is not competing for the same funding as growth work.`,
    evidence: hits.slice(0, 3).map((h) => ev(h, c.doc.filename)),
    classification: 'fact',
    confidence: 'high',
    confidenceReason: `Directly stated in the source material rather than inferred${hits.length > 1 ? `, and corroborated across ${hits.length} statements` : ''}.`,
    openQuestion: `How long would recovery actually take if this person were unavailable tomorrow, and has that ever been tested?`,
    topics: [topic], entities: ents, amounts: [],
  }];
};

/** 3 — a prerequisite that several things sit behind */
const foundationConcentration: Pattern = (c) => {
  const prereqs = c.sentences.filter((s) => RX.prerequisite.test(s.text));
  if (prereqs.length < 2) return [];

  const ents = prereqs.flatMap((s) => extractEntities(s.text));
  const counts = new Map<string, number>();
  for (const e of ents) counts.set(e, (counts.get(e) ?? 0) + 1);
  const hub = [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1])[0];

  return [{
    pattern: 'foundation-concentration',
    headline: hub
      ? `${hub[0]} is a prerequisite for multiple downstream commitments and is the single largest sequencing risk`
      : `Several commitments sit behind prerequisites that are not themselves scheduled`,
    observed: `${prereqs.length} separate statements describe a hard ordering constraint. ${prereqs.slice(0, 2).map((s) => `"${trim(s.text, 130)}"`).join(' ')}${hub ? ` ${hub[0]} appears on the upstream side of ${hub[1]} of them.` : ''}`,
    whyItMatters: `Prerequisites of this kind do not fail gracefully. If the upstream item slips, everything behind it slips by the same amount, and the delay compounds rather than being absorbed. Where one item is upstream of several, it becomes the critical path for the whole portfolio whether or not it scores highly on its own merits.`,
    rootCause: `Sequencing constraints have been identified narratively within individual programme discussions but not consolidated into a single dependency view, so no one is looking at the aggregate.`,
    roadmapImplication: `These constraints should be captured as structured dependencies so the roadmap enforces them, and the upstream item should be pulled into the earliest wave that its own effort allows. Its priority score alone will understate its importance, because the score measures the item, not what sits behind it.`,
    recommendedResponse: `Validate each of these prerequisites with the accountable owner, record them as hard dependencies, and re-examine the wave-one composition with the dependency view switched on.`,
    evidence: prereqs.slice(0, 3).map((s) => ev(s, c.doc.filename)),
    classification: 'inference',
    confidence: prereqs.length >= 3 ? 'high' : 'medium',
    confidenceReason: `Drawn from ${prereqs.length} explicit ordering statements in the source material.`,
    openQuestion: `Are these genuine hard prerequisites, or strong preferences that could be run in parallel with additional coordination?`,
    topics: [...new Set(prereqs.map((s) => c.topicOf(s.text)).filter(Boolean) as string[])],
    entities: hub ? [hub[0]] : [], amounts: [],
  }];
};

/** 4 — a figure that looks small against the scale or ambition it must cover */
const investmentAgainstScale: Pattern = (c) => {
  const withMoney = c.sentences.filter((s) => extractAmounts(s.text).length > 0);
  if (withMoney.length === 0) return [];

  const amounts = withMoney.flatMap((s) => extractAmounts(s.text).map((a) => ({ ...a, s })));
  const largest = amounts.sort((a, b) => b.value - a.value)[0];
  const gapsInTopic = c.sentences.filter((s) => RX.gap.test(s.text) && c.topicOf(s.text) === c.topicOf(largest.s.text));
  const scaleHit = c.sentences.map((s) => s.text.match(RX.scale)).find(Boolean);
  const topic = c.topicOf(largest.s.text) ?? 'the programme';

  return [{
    pattern: 'investment-against-scale',
    headline: `The figure quoted for ${topic} is stated without the scope that would make it testable`,
    observed: `The material records ${money(largest.value)} in connection with ${topic}: "${trim(largest.s.text, 160)}"${gapsInTopic.length ? ` The same domain carries ${gapsInTopic.length} recorded capability gap${gapsInTopic.length > 1 ? 's' : ''}.` : ''}${scaleHit ? ` The estate involved spans ${scaleHit[0]}.` : ''}`,
    whyItMatters: `A number without a stated basis cannot be defended at a Board, and it cannot be compared against alternatives. More practically, figures quoted early in an engagement tend to become anchors — they are repeated until they are treated as commitments, whether or not anyone has tested what they cover.`,
    rootCause: gapsInTopic.length > 1
      ? `The scope this figure covers has not been reconciled against the number of gaps recorded in the same domain, which suggests the estimate predates the assessment.`
      : null,
    roadmapImplication: `This figure should be loaded into the financial model against a named initiative with an explicit basis and a low/base/high range, not carried in narrative. Until then it should be shown as a low-confidence estimate rather than a total.`,
    recommendedResponse: `Establish what the figure covers, who produced it and when, and record the basis. If it is a vendor quotation, mark it as such; if it is an internal placeholder, say so before it is repeated to the Board.`,
    evidence: [ev(largest.s, c.doc.filename), ...gapsInTopic.slice(0, 1).map((s) => ev(s, c.doc.filename))],
    classification: 'hypothesis',
    confidence: gapsInTopic.length > 1 ? 'medium' : 'low',
    confidenceReason: `The figure is directly evidenced; the concern about its coverage is a consultant judgment that requires validation with whoever produced it.`,
    openQuestion: `What scope does ${money(largest.value)} cover, and does it include internal labour, change and contingency?`,
    topics: [topic], entities: extractEntities(largest.s.text).slice(0, 4), amounts: [largest.value],
  }];
};

/** 5 — decisions being deferred */
const deferredDecisions: Pattern = (c) => {
  const hits = c.sentences.filter((s) => RX.deferred.test(s.text));
  if (hits.length === 0) return [];
  return [{
    pattern: 'deferred-decisions',
    headline: `${hits.length} decision${hits.length > 1 ? 's remain' : ' remains'} open, and ${hits.length > 1 ? 'they are' : 'it is'} holding work behind ${hits.length > 1 ? 'them' : 'it'}`,
    observed: hits.slice(0, 3).map((s) => `"${trim(s.text, 140)}"`).join(' '),
    whyItMatters: `Deferral is itself a decision, and it is usually the most expensive one available. Work that cannot start accumulates no progress but continues to consume planning attention, and the option value that justified waiting decays as the surrounding commitments harden.`,
    rootCause: `Decisions of this kind are typically deferred not through indecision but through absent decision rights — no single forum has both the authority and the information to close them.`,
    roadmapImplication: `Each of these needs a decision date on the roadmap, placed ahead of the work it gates. A roadmap that shows the dependent work but not the decision that unlocks it will read as achievable when it is not.`,
    recommendedResponse: `Put each open decision in front of the sponsor with a named owner and a date, and state plainly what cannot start until it is closed. Where the Board meets on a known date, work back from it.`,
    evidence: hits.slice(0, 3).map((s) => ev(s, c.doc.filename)),
    classification: 'fact',
    confidence: hits.length > 1 ? 'high' : 'medium',
    confidenceReason: `Deferral is stated explicitly in the source material.`,
    openQuestion: `Who holds the decision right for each of these, and what specifically are they waiting for?`,
    topics: [...new Set(hits.map((s) => c.topicOf(s.text)).filter(Boolean) as string[])],
    entities: [...new Set(hits.flatMap((s) => extractEntities(s.text)))].slice(0, 5), amounts: [],
  }];
};

/** 6 — delivery capacity against the number of things being asked of it */
const capacityAgainstAmbition: Pattern = (c) => {
  const cap = c.sentences.filter((s) => RX.capacity.test(s.text));
  if (cap.length === 0) return [];
  const primary = cap.sort((a, b) => extractMetrics(b.text).length - extractMetrics(a.text).length)[0];
  const metrics = extractMetrics(primary.text);
  const objectives = c.sentences.filter((s) => RX.objective.test(s.text)).length;

  return [{
    pattern: 'capacity-against-ambition',
    headline: `Delivery capacity is a stated constraint while the ambition attached to it continues to grow`,
    observed: `${clause(trim(primary.text, 190))}${metrics.length ? ` (${metrics.slice(0, 2).join(', ')})` : ''}.${objectives > 1 ? ` The same material sets out ${objectives} distinct objectives to be delivered against that capacity.` : ''}`,
    whyItMatters: `Capacity constraints do not surface as failure; they surface as everything moving more slowly at once. A roadmap that assumes full availability will be wrong from the first quarter, and the resulting slippage is usually attributed to the initiatives rather than to the planning assumption.`,
    rootCause: `Roadmaps are typically built from what is desirable rather than from what the organisation can absorb, because capacity is not modelled at the point of sequencing.`,
    roadmapImplication: `Wave loading should be constrained by realistic concurrent delivery capacity, not by priority order alone. Where capacity is the binding constraint, the sequencing question changes from "what matters most" to "what can we finish".`,
    recommendedResponse: `Establish the number of concurrent initiatives the organisation can genuinely carry, and constrain wave one to it. If the ambition exceeds that number, the trade-off belongs in front of the sponsor now rather than at the first missed milestone.`,
    evidence: cap.slice(0, 3).map((s) => ev(s, c.doc.filename)),
    classification: 'inference',
    confidence: metrics.length > 0 ? 'high' : 'medium',
    confidenceReason: metrics.length > 0
      ? `Capacity constraint is quantified in the source material.`
      : `Capacity constraint is stated but not quantified, so the severity is a judgment.`,
    openQuestion: `How many initiatives has the organisation successfully delivered concurrently in the past two years?`,
    topics: ['people and capability'], entities: extractEntities(primary.text).slice(0, 4), amounts: [],
  }];
};

/** 7 — a strength worth using rather than a gap worth fixing */
const strengthAsAccelerator: Pattern = (c) => {
  const hits = c.sentences.filter((s) => RX.strength.test(s.text) && !RX.gap.test(s.text) && s.text.split(/\s+/).length > 8);
  if (hits.length === 0) return [];
  const primary = hits[0];
  const topic = c.topicOf(primary.text) ?? 'the estate';

  return [{
    pattern: 'strength-as-accelerator',
    headline: `Existing capability in ${topic} is an asset the roadmap can build on rather than replace`,
    observed: `${clause(trim(primary.text, 190))}.${hits.length > 1 ? ` ${hits.length - 1} further statement${hits.length > 2 ? 's describe' : ' describes'} capability already in place.` : ''}`,
    whyItMatters: `Transformation narratives tend to be written entirely in deficits, which makes them harder to fund and harder for the organisation to recognise itself in. Capability already paid for is the cheapest capability available, and activating it usually produces visible results faster than anything being built from scratch.`,
    rootCause: null,
    roadmapImplication: `Sequence the activation of this ahead of comparable work that requires new procurement. It gives the programme an early, demonstrable result at low marginal cost, which matters disproportionately for sustaining sponsorship.`,
    recommendedResponse: `Establish what is preventing full use of what is already in place. Where the constraint is organisational rather than technical, it is likely to be resolvable inside the first wave.`,
    evidence: hits.slice(0, 2).map((s) => ev(s, c.doc.filename)),
    classification: 'inference',
    confidence: 'medium',
    confidenceReason: `The capability is directly evidenced; whether it can be leveraged as described is a judgment requiring validation.`,
    openQuestion: `What is actually preventing this from being used to its full extent today?`,
    topics: [topic], entities: extractEntities(primary.text).slice(0, 4), amounts: [],
  }];
};

/** 8 — an objective with nothing behind it in the evidence */
const evidenceGap: Pattern = (c) => {
  const objectives = c.sentences.filter((s) => RX.objective.test(s.text));
  const gaps: string[] = [];
  for (const [topic] of TOPIC_TERMS) {
    const hasObjective = objectives.some((s) => c.topicOf(s.text) === topic);
    const supporting = c.sentences.filter((s) => c.topicOf(s.text) === topic).length;
    if (hasObjective && supporting <= 2) gaps.push(topic);
  }
  if (gaps.length === 0) return [];

  return [{
    pattern: 'evidence-gap',
    headline: `${gaps.length === 1 ? 'One objective is' : `${gaps.length} objectives are`} stated without supporting evidence in the material provided`,
    observed: `Objectives are recorded for ${gaps.join(', ')}, but the uploaded material carries little or no current-state detail in ${gaps.length === 1 ? 'that domain' : 'those domains'}.`,
    whyItMatters: `An objective without a current-state baseline cannot be scored for alignment with any confidence, cannot be sized, and cannot be sequenced against anything. It will either be omitted from the roadmap or included on assertion, and both outcomes are visible at Board level.`,
    rootCause: `The document set provided is likely partial rather than the organisation lacking the information.`,
    roadmapImplication: `Either obtain the supporting material before scoring, or mark the affected opportunities as low-confidence so the gap is visible in the register rather than hidden inside an average.`,
    recommendedResponse: `Add the missing material to the document request, and identify who owns it. If it does not exist, that absence is itself a finding about how the domain is managed.`,
    evidence: objectives.filter((s) => gaps.includes(c.topicOf(s.text) ?? '')).slice(0, 2).map((s) => ev(s, c.doc.filename)),
    classification: 'gap',
    confidence: 'medium',
    confidenceReason: `Based on what is absent from the material provided, which may reflect the document set rather than the organisation.`,
    openQuestion: `Does supporting material exist for ${gaps[0]}, and who holds it?`,
    topics: gaps, entities: [], amounts: [],
  }];
};

/** 9 — statements that pull against each other */
const contradiction: Pattern = (c) => {
  const out: Omit<Insight, 'id'>[] = [];
  for (const [topic] of TOPIC_TERMS) {
    const inTopic = c.sentences.filter((s) => c.topicOf(s.text) === topic);
    const positive = inTopic.find((s) => RX.strength.test(s.text) && !RX.gap.test(s.text));
    const negative = inTopic.find((s) => RX.gap.test(s.text) && !RX.strength.test(s.text));
    if (!positive || !negative) continue;

    out.push({
      pattern: 'contradiction',
      headline: `The material describes ${topic} as both established and deficient`,
      observed: `One statement records that ${clause(trim(positive.text, 130))}. Another records that ${clause(trim(negative.text, 130))}.`,
      whyItMatters: `Contradictions of this kind are rarely errors. They usually mean two parts of the organisation are describing different realities — one the intended design, the other the operating experience — and the difference between them is where the actual problem lives.`,
      rootCause: `Most commonly a capability has been procured and deployed but not adopted, so it is genuinely "in place" and genuinely not delivering.`,
      roadmapImplication: `Resolve this before scoring the domain. Whether the answer is "build it" or "make people use it" changes the initiative, the cost, the duration and the change effort — and the two are frequently confused.`,
      recommendedResponse: `Test both statements directly with their respective owners in the next interview round, and record which describes the operating reality.`,
      evidence: [ev(positive, c.doc.filename), ev(negative, c.doc.filename)],
      classification: 'contradiction',
      confidence: 'medium',
      confidenceReason: `Both statements are directly evidenced; whether they genuinely conflict requires validation, as they may describe different scopes.`,
      openQuestion: `Do these two statements describe the same scope, or different parts of ${topic}?`,
      topics: [topic], entities: [], amounts: [],
    });
  }
  return out.slice(0, 2);
};

const PATTERNS: Pattern[] = [
  keyPersonConcentration, ambitionVsCapability, foundationConcentration, deferredDecisions,
  investmentAgainstScale, capacityAgainstAmbition, contradiction, strengthAsAccelerator, evidenceGap,
];

/* ═════════════════════════════════════════════════════════════════ runner */

export function generateInsights(doc: DocStructure): Insight[] {
  const body = doc.paragraphs.filter((p) => p.style === 'p' || p.style === 'li');
  const sentences = body.flatMap((p) => splitSentences(p.text).filter((t) => t.split(/\s+/).length >= 6).map((text) => ({ text, p })));

  const topicOf = (s: string): string | null => {
    let best: string | null = null, bestN = 0;
    for (const [label, re] of TOPIC_TERMS) {
      const n = (s.match(new RegExp(re.source, 'gi')) ?? []).length;
      if (n > bestN) { bestN = n; best = label; }
    }
    return best;
  };

  const ctx: Ctx = { doc, sentences, topicOf };
  const raw = PATTERNS.flatMap((p) => { try { return p(ctx); } catch { return []; } });

  const seen = new Set<string>();
  return raw
    .filter((i) => {
      const k = i.headline.toLowerCase().slice(0, 60);
      if (seen.has(k)) return false;
      seen.add(k);
      return i.evidence.length > 0;
    })
    .map((i, n) => ({ ...i, id: `INS-${String(n + 1).padStart(3, '0')}` }));
}

export const CLASS_META: Record<InsightClass, { label: string; note: string }> = {
  fact: { label: 'Directly evidenced', note: 'Stated explicitly in the source material.' },
  inference: { label: 'Reasonable inference', note: 'Follows from the evidence but is not stated outright.' },
  hypothesis: { label: 'Consultant hypothesis', note: 'A judgment that requires validation before it is relied upon.' },
  contradiction: { label: 'Contradiction', note: 'Two statements in the evidence pull against each other.' },
  gap: { label: 'Missing information', note: 'Identified by what is absent rather than what is present.' },
};

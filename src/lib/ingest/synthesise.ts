/**
 * Document synthesis — deterministic extraction engine.
 *
 * PURE. No React, no I/O, no network. Given the paragraphs of a real uploaded document,
 * it produces structured themes, takeaways, watch-outs and typed candidate objects, each
 * anchored back to the paragraph it came from.
 *
 * This is rule-based rather than model-based: it scores every sentence against signal
 * lexicons, extracts entities, metrics and currency amounts, and clusters paragraphs into
 * topics. The production specification (PRD section 14, AI-02) replaces this with an LLM
 * returning the same schema under the same human-review gate — the review workflow, the
 * confidence semantics and the source anchoring are identical either way.
 *
 * It reads the actual uploaded bytes. Different documents produce different output.
 */

export type CandidateKind = 'objective' | 'opportunity' | 'dependency' | 'financial' | 'risk';

export interface DocParagraph {
  index: number;
  text: string;
  style: 'h1' | 'h2' | 'h3' | 'p' | 'li';
  section: string;
}

export interface DocStructure {
  filename: string;
  paragraphs: DocParagraph[];
  sections: string[];
  wordCount: number;
}

export interface Candidate {
  id: string;
  kind: CandidateKind;
  title: string;
  detail: string;
  excerpt: string;
  paragraphIndex: number;
  section: string;
  confidence: number;
  signals: string[];
  entities: string[];
  metrics: string[];
  /** financial only */
  amount?: number;
  amountLabel?: string;
  /** dependency only */
  upstreamHint?: string;
  downstreamHint?: string;
  /** where an accepted candidate lands */
  target: string;
}

export interface SynthTheme {
  id: string;
  label: string;
  paragraphIndices: number[];
  weight: number;
  representative: string;
}

export interface Synthesis {
  themes: SynthTheme[];
  takeaways: { text: string; paragraphIndex: number; confidence: number }[];
  watchOuts: { text: string; paragraphIndex: number; severity: 'high' | 'medium' }[];
  candidates: Candidate[];
  stats: { paragraphs: number; sentences: number; words: number; entities: number; metrics: number };
}

/* ----------------------------------------------------------------- lexicons */

const SIG = {
  objective: /\b(goal|objective|aim(?:s|ing)?|target(?:s|ing)?|ambition|strateg(?:y|ic priorit)|we will|our priority|priorities are|intends? to|seeks? to|must deliver|committed to|north star|mandate)\b/i,
  gap: /\b(no\s|lack(?:s|ing)? of|lacks|absence of|manual(?:ly)?|cannot|can't|unable|fragmented|inconsistent|legacy|outdated|undocumented|not documented|single point of failure|bottleneck|siloed|silos|duplicat|workaround|ad hoc|end[- ]of[- ]life|unsupported|stalled|deferred|constrain(?:t|ed)|limited|immature|gap)\b/i,
  dependency: /\b(before|prerequisite|pre-requisite|depends? on|dependent on|blocked by|blocks|unblocks?|must (?:be )?(?:complete|completed|finish|finished|deliver|delivered|in place)|cannot (?:start|launch|proceed|begin)(?: until| without)|sequenced? (?:after|ahead of|behind)|contingent on|first, |precede)\b/i,
  risk: /\b(risk|exposure|threat|vulnerab|breach|outage|failure|non[- ]compliance|penalt|fine|attrition|key[- ]person|continuity|disruption|exposed|jeopard|unmitigated|incident)\b/i,
  financial: /\b(budget|cost(?:s|ing)?|invest(?:ment)?|spend|saving(?:s)?|ROI|payback|licen[cs]e fee|capex|opex|run[- ]rate|contract value|per annum|annually|one[- ]off|recurring)\b/i,
};

const TOPICS: { label: string; terms: RegExp }[] = [
  { label: 'Data & Analytics', terms: /\b(data|analytic|report|dashboard|warehouse|lake|master data|MDM|PIM|golden record|governance of data|BI|insight)\b/i },
  { label: 'Security & Risk', terms: /\b(security|cyber|threat|breach|identity|IAM|access|SOC|vulnerab|patch|compliance|privacy|encryption)\b/i },
  { label: 'Integration & Architecture', terms: /\b(integration|API|architecture|middleware|interface|event|message|ESB|microservice|endpoint|batch|file transfer)\b/i },
  { label: 'Core Platforms & ERP', terms: /\b(ERP|finance system|general ledger|mainframe|core system|order (?:processing|management)|billing|SAP|Oracle|Dynamics)\b/i },
  { label: 'Digital & Commerce', terms: /\b(commerce|e-?commerce|website|web|digital|customer portal|storefront|checkout|mobile app|omnichannel)\b/i },
  { label: 'Infrastructure & Cloud', terms: /\b(infrastructure|cloud|network|server|hosting|Azure|AWS|GCP|data cent(?:re|er)|hardware|device|end[- ]of[- ]life)\b/i },
  { label: 'Operating Model & Governance', terms: /\b(governance|operating model|portfolio|intake|prioritis|prioritiz|steering|PMO|process|policy|decision right|accountab)\b/i },
  { label: 'People & Capability', terms: /\b(talent|hiring|recruit|skills?|headcount|vacan|resourc|capacity|training|team structure|attrition|FTE)\b/i },
  { label: 'Supply Chain & Operations', terms: /\b(supply chain|warehouse|distribution|logistics|inventory|fulfil|fulfill|forecast|replenish|procurement|supplier|vendor onboarding)\b/i },
  { label: 'Customer & Growth', terms: /\b(customer|client|dealer|member|revenue|growth|market share|retention|loyalty|pricing|segment)\b/i },
];

const STOP = new Set([
  'The','This','That','These','Those','There','It','We','Our','Their','His','Her','A','An','In','On','At','For','With','And','But','Or','If','As','By','To','From','Is','Are','Was','Were','Be','Been','Has','Have','Had','Will','Would','Should','Could','May','Might','Can','However','Therefore','Although','While','When','Where','Which','What','Who','How','Why','Each','Every','Some','Many','Most','All','No','Not','Both','Either','Neither','One','Two','Three','First','Second','Third','Next','Then','Also','Further','Moreover','Additionally','Currently','Today','Now','Recently','Overall','Finally',
]);

/* ---------------------------------------------------------------- utilities */

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z(“"'])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const CURRENCY = /(?:£|\$|€|USD\s?|GBP\s?|EUR\s?)\s?([\d,]+(?:\.\d+)?)\s*(k|m|bn|thousand|million|billion)?\b/gi;
const METRIC = /\b(\d+(?:\.\d+)?)\s*(%|per cent|percent|FTE|days?|weeks?|months?|years?|hours?|stores?|sites?|users?|systems?|instances?|people|staff|roles?)(?![A-Za-z])/gi;

export function extractAmounts(text: string): { value: number; label: string }[] {
  const out: { value: number; label: string }[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(CURRENCY.source, 'gi');
  while ((m = re.exec(text)) !== null) {
    const n = parseFloat(m[1].replace(/,/g, ''));
    if (Number.isNaN(n)) continue;
    const unit = (m[2] ?? '').toLowerCase();
    const mult = unit.startsWith('k') || unit.startsWith('thousand') ? 1_000
      : unit.startsWith('m') && !unit.startsWith('mo') ? 1_000_000
      : unit.startsWith('bn') || unit.startsWith('billion') ? 1_000_000_000
      : 1;
    out.push({ value: n * mult, label: m[0].trim() });
  }
  return out;
}

export function extractMetrics(text: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(METRIC.source, 'gi');
  while ((m = re.exec(text)) !== null) out.push(m[0].trim());
  return [...new Set(out)];
}

export function extractEntities(text: string): string[] {
  const out: string[] = [];
  const re = /\b([A-Z][A-Za-z0-9&.'-]+(?:\s+[A-Z][A-Za-z0-9&.'-]+){0,2})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    let cand = m[1].trim().replace(/[.,;:]+$/, '');
    // A run beginning with a stopword still holds a real entity after it.
    const words = cand.split(/\s+/);
    if (STOP.has(words[0])) {
      if (words.length === 1) continue;
      cand = words.slice(1).join(' ');
    }
    if (cand.length < 3) continue;
    if (/^[A-Z]\.?$/.test(cand)) continue;
    out.push(cand);
  }
  return [...new Set(out)].slice(0, 12);
}

function titleFrom(sentence: string, max = 72): string {
  const clean = sentence
    .replace(/^(?:however|therefore|additionally|moreover|furthermore|in addition|as a result|consequently|currently|today|overall)[,:]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= max) return clean.replace(/[.;:]$/, '');
  const cut = clean.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return (sp > 30 ? cut.slice(0, sp) : cut) + '…';
}

/* --------------------------------------------------------------- synthesise */

export function synthesise(doc: DocStructure): Synthesis {
  const candidates: Candidate[] = [];
  let seq = 0;
  const nextId = (k: string) => `CND-${k.toUpperCase().slice(0, 3)}-${String(++seq).padStart(3, '0')}`;

  let sentenceCount = 0;
  const allEntities = new Set<string>();
  const allMetrics = new Set<string>();
  const takeaways: Synthesis['takeaways'] = [];
  const watchOuts: Synthesis['watchOuts'] = [];

  const body = doc.paragraphs.filter((p) => p.style === 'p' || p.style === 'li');

  for (const p of body) {
    const sentences = splitSentences(p.text);
    sentenceCount += sentences.length;

    for (const s of sentences) {
      if (s.split(/\s+/).length < 5) continue;

      const entities = extractEntities(s);
      const metrics = extractMetrics(s);
      const amounts = extractAmounts(s);
      entities.forEach((e) => allEntities.add(e));
      metrics.forEach((x) => allMetrics.add(x));

      const signals: string[] = [];
      (Object.keys(SIG) as (keyof typeof SIG)[]).forEach((k) => { if (SIG[k].test(s)) signals.push(k); });
      if (signals.length === 0) continue;

      // Confidence rises with corroborating signal: a named entity, a metric, a figure,
      // and a sentence long enough to carry a claim.
      const base = 0.44;
      const conf = Math.min(
        0.96,
        base
          + (entities.length ? 0.14 : 0)
          + (metrics.length ? 0.14 : 0)
          + (amounts.length ? 0.12 : 0)
          + (signals.length > 1 ? 0.08 : 0)
          + Math.min(0.1, s.length / 900),
      );

      const mk = (kind: CandidateKind, target: string, extra: Partial<Candidate> = {}) => {
        candidates.push({
          id: nextId(kind), kind,
          title: titleFrom(s), detail: s, excerpt: s,
          paragraphIndex: p.index, section: p.section,
          confidence: Number(conf.toFixed(2)),
          signals, entities, metrics, target, ...extra,
        });
      };

      // Order matters: the most specific interpretation wins, and a sentence may
      // legitimately produce more than one candidate.
      if (signals.includes('dependency')) {
        const parts = s.split(SIG.dependency);
        mk('dependency', 'Roadmap dependencies', {
          upstreamHint: (parts[0] ?? '').trim().slice(0, 80) || undefined,
          downstreamHint: (parts[parts.length - 1] ?? '').trim().slice(0, 80) || undefined,
        });
      }
      if (signals.includes('financial') && amounts.length > 0) {
        const biggest = amounts.sort((a, b) => b.value - a.value)[0];
        mk('financial', 'Financial model', { amount: biggest.value, amountLabel: biggest.label });
      }
      if (signals.includes('risk')) {
        mk('risk', 'Risk register · roadmap · executive view');
        watchOuts.push({
          text: s, paragraphIndex: p.index,
          severity: /\b(existential|critical|severe|halt|breach|outage|non[- ]compliance|penalt|cannot recover)\b/i.test(s) ? 'high' : 'medium',
        });
      }
      if (signals.includes('objective') && !signals.includes('dependency')) {
        mk('objective', 'Transformation objectives · alignment scoring');
      }
      if (signals.includes('gap') && !signals.includes('objective')) {
        mk('opportunity', 'Opportunity backlog · current state');
      }

      if (conf >= 0.6 && (metrics.length > 0 || amounts.length > 0 || signals.length > 1)) {
        takeaways.push({ text: s, paragraphIndex: p.index, confidence: Number(conf.toFixed(2)) });
      }
    }
  }

  /* --------------------------------------------------------- theme clustering */

  const themes: SynthTheme[] = TOPICS.map((t, i) => {
    const hits = body.filter((p) => t.terms.test(p.text));
    const weight = hits.reduce((acc, p) => acc + (p.text.match(new RegExp(t.terms.source, 'gi'))?.length ?? 0), 0);
    const rep = hits
      .flatMap((p) => splitSentences(p.text).map((s) => ({ s, p })))
      .filter(({ s }) => t.terms.test(s) && s.split(/\s+/).length >= 8)
      .sort((a, b) => b.s.length - a.s.length)[0];
    return {
      id: `THM-${String(i + 1).padStart(2, '0')}`,
      label: t.label,
      paragraphIndices: hits.map((p) => p.index),
      weight,
      representative: rep ? titleFrom(rep.s, 150) : '',
    };
  })
    .filter((t) => t.weight >= 2 && t.representative)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6);

  const dedupe = <T extends { text: string }>(arr: T[]) => {
    const seen = new Set<string>();
    return arr.filter((x) => {
      const k = x.text.slice(0, 60).toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  return {
    themes,
    takeaways: dedupe(takeaways).sort((a, b) => b.confidence - a.confidence).slice(0, 8),
    watchOuts: dedupe(watchOuts).sort((a, b) => (a.severity === 'high' ? -1 : 1)).slice(0, 6),
    candidates: candidates.sort((a, b) => b.confidence - a.confidence),
    stats: {
      paragraphs: body.length,
      sentences: sentenceCount,
      words: doc.wordCount,
      entities: allEntities.size,
      metrics: allMetrics.size,
    },
  };
}

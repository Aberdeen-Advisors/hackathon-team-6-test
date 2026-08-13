/**
 * Maps document evidence onto questionnaire fields.
 *
 * PURE. Given a parsed document, returns the questions it can offer an answer for, with
 * the exact supporting excerpt and a confidence value. It never writes — the store decides
 * whether a suggestion is offered, and a human decides whether it is accepted.
 */

import type { DocStructure } from './synthesise';
import { splitSentences, extractAmounts } from './synthesise';

export interface Prefill {
  questionId: string;
  value: string;
  excerpt: string;
  paragraphIndex: number;
  confidence: number;
}

/** Each rule states which sentences it will accept and how it turns them into an answer. */
const RULES: { questionId: string; match: RegExp; multi?: boolean; base: number }[] = [
  { questionId: 'businessObjectives', match: /\b(objective is|goal is|aims? to|our priority|targets?|expects? to (?:grow|increase|reduce))\b/i, multi: true, base: 0.72 },
  { questionId: 'trigger', match: /\b(triggered|prompted|following the|in response to|after the|arose from)\b/i, base: 0.62 },
  { questionId: 'whyNow', match: /\b(now|urgent|cannot wait|window|before the|deadline|this year)\b/i, base: 0.5 },
  { questionId: 'knownPainPoints', match: /\b(no\s|lack of|cannot|unable|fragmented|manual(?:ly)?|inconsistent|siloed|bottleneck)\b/i, multi: true, base: 0.7 },
  { questionId: 'visibleRisks', match: /\b(risk|exposure|breach|outage|incident|key[- ]person|continuity|vulnerab)\b/i, multi: true, base: 0.72 },
  { questionId: 'knownDependencies', match: /\b(must be (?:complete|in place)|prerequisite|before .* can|depends? on|cannot (?:start|launch) (?:until|without))\b/i, multi: true, base: 0.78 },
  { questionId: 'initiativesUnderway', match: /\b(under ?way|in flight|in progress|being implemented|currently deploying|programme is)\b/i, multi: true, base: 0.6 },
  { questionId: 'budgetRange', match: /\b(budget|funding|envelope|allocated|approved spend)\b/i, base: 0.68 },
  { questionId: 'capacityLimits', match: /\b(open roles?|vacan|capacity|constrain delivery|understaffed|headcount)\b/i, base: 0.7 },
  { questionId: 'regulatory', match: /\b(regulat|compliance|GDPR|PCI|HIPAA|audit requirement|statutory)\b/i, multi: true, base: 0.66 },
  { questionId: 'strengthsToProtect', match: /\b(reliable|stable|successfully|already (?:paid for|licensed|in place)|proven|works well)\b/i, multi: true, base: 0.58 },
  { questionId: 'externalDeadlines', match: /\b(board meeting|go[- ]live|deadline|renewal|by (?:Q[1-4]|20\d\d)|contract expires)\b/i, multi: true, base: 0.64 },
  { questionId: 'w12_painpoints', match: /\b(pain point|problem is|issue is|struggl|difficult|slow|error-prone)\b/i, multi: true, base: 0.62 },
  { questionId: 'w5_prerequisites', match: /\b(must be (?:complete|in place)|prerequisite|before .* can (?:start|launch))\b/i, multi: true, base: 0.78 },
  { questionId: 'w68_oneTime', match: /\b(one[- ]off|one[- ]time|implementation cost|capital cost|upfront)\b/i, base: 0.66 },
  { questionId: 'w1012_risks', match: /\b(risk|exposure|threat|failure|disruption)\b/i, multi: true, base: 0.6 },
];

export function buildPrefills(doc: DocStructure): Prefill[] {
  const body = doc.paragraphs.filter((p) => p.style === 'p' || p.style === 'li');
  const sentences = body.flatMap((p) => splitSentences(p.text).filter((t) => t.split(/\s+/).length >= 7).map((text) => ({ text, p })));

  const out: Prefill[] = [];
  for (const rule of RULES) {
    const hits = sentences.filter((s) => rule.match.test(s.text));
    if (hits.length === 0) continue;

    const chosen = rule.multi ? hits.slice(0, 4) : [hits[0]];
    const value = rule.multi ? chosen.map((h) => h.text.replace(/\s+/g, ' ').trim()).join('\n') : chosen[0].text.trim();

    // Confidence rises with corroboration and with the presence of a hard figure.
    const hasFigure = chosen.some((h) => extractAmounts(h.text).length > 0 || /\d/.test(h.text));
    const confidence = Math.min(0.95, rule.base + (hits.length > 2 ? 0.08 : 0) + (hasFigure ? 0.07 : 0));

    out.push({
      questionId: rule.questionId,
      value,
      excerpt: chosen[0].text.trim(),
      paragraphIndex: chosen[0].p.index,
      confidence: Number(confidence.toFixed(2)),
    });
  }
  return out;
}

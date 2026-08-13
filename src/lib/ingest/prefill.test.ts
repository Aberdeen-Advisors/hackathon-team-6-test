import { describe, it, expect } from 'vitest';
import { buildPrefills } from './prefill';
import type { DocStructure } from './synthesise';

const doc = (paras: string[]): DocStructure => ({
  filename: 't.docx',
  paragraphs: paras.map((text, index) => ({ index, text, style: 'p' as const, section: 'Body' })),
  sections: ['Body'], wordCount: paras.join(' ').split(/\s+/).length,
});

describe('document-driven prefill', () => {
  it('offers an answer for objectives when the document states one', () => {
    const p = buildPrefills(doc(['Our primary objective is to grow revenue in the core channel over three years.']));
    expect(p.find((x) => x.questionId === 'businessObjectives')).toBeTruthy();
  });

  it('offers an answer for dependencies from prerequisite language', () => {
    const p = buildPrefills(doc(['The identity platform must be complete before the supplier portal can launch.']));
    expect(p.find((x) => x.questionId === 'knownDependencies')).toBeTruthy();
  });

  it('carries the exact supporting excerpt and its paragraph', () => {
    const text = 'A prior ransomware incident exposed a significant risk of operational outage across all sites.';
    const p = buildPrefills(doc(['Filler sentence that carries no signal at all here.', text]));
    const risk = p.find((x) => x.questionId === 'visibleRisks');
    expect(risk?.excerpt).toBe(text);
    expect(risk?.paragraphIndex).toBe(1);
  });

  it('raises confidence when a figure corroborates the statement', () => {
    const withFigure = buildPrefills(doc(['The budget approved for the programme is $2.4m for the coming year.']));
    const without = buildPrefills(doc(['The budget for the programme has been approved by the executive team.']));
    const a = withFigure.find((x) => x.questionId === 'budgetRange')!;
    const b = without.find((x) => x.questionId === 'budgetRange')!;
    expect(a.confidence).toBeGreaterThan(b.confidence);
  });

  it('returns nothing for a document with no signal', () => {
    expect(buildPrefills(doc(['The meeting was held on Tuesday and lasted about one hour in total.']))).toHaveLength(0);
  });
});

import { describe, it, expect } from 'vitest';
import { synthesise, extractAmounts, extractMetrics, extractEntities, splitSentences } from './synthesise';
import type { DocStructure } from './synthesise';

const doc = (paras: string[]): DocStructure => ({
  filename: 'test.docx',
  paragraphs: paras.map((text, index) => ({ index, text, style: 'p' as const, section: 'Body' })),
  sections: ['Body'],
  wordCount: paras.join(' ').split(/\s+/).length,
});

describe('extraction primitives', () => {
  it('normalises currency with magnitude suffixes', () => {
    expect(extractAmounts('a budget of $2.5m was approved')[0].value).toBe(2_500_000);
    expect(extractAmounts('roughly £750k per annum')[0].value).toBe(750_000);
    expect(extractAmounts('costs of $40,000 annually')[0].value).toBe(40_000);
  });

  it('finds metrics with units', () => {
    const m = extractMetrics('fill rates dropped 12% across 8 sites over 6 months');
    expect(m).toContain('12%');
    expect(m).toContain('8 sites');
    expect(m).toContain('6 months');
  });

  it('extracts named entities but skips sentence-initial stopwords', () => {
    const e = extractEntities('The Snowflake platform is managed by Contoso Logistics.');
    expect(e.some((x) => x.includes('Snowflake'))).toBe(true);
    expect(e.some((x) => x.startsWith('The '))).toBe(false);
  });

  it('splits sentences without breaking on decimals', () => {
    expect(splitSentences('Spend was $1.5m. That is high.')).toHaveLength(2);
  });
});

describe('synthesis produces typed candidates from real prose', () => {
  const s = synthesise(doc([
    'Our primary objective is to grow revenue in the core channel over the next three years.',
    'There is no enterprise data governance programme, and reporting is produced manually by three separate teams.',
    'The identity platform must be complete before the supplier portal can launch.',
    'A budget of $2.4m has been allocated for the ERP programme this year.',
    'A prior ransomware incident exposed a significant risk of operational outage across all 8 sites.',
  ]));

  it('detects an objective', () => {
    expect(s.candidates.some((c) => c.kind === 'objective')).toBe(true);
  });
  it('detects a capability gap as an opportunity', () => {
    expect(s.candidates.some((c) => c.kind === 'opportunity')).toBe(true);
  });
  it('detects a prerequisite as a dependency', () => {
    const d = s.candidates.find((c) => c.kind === 'dependency');
    expect(d).toBeTruthy();
    expect(d?.upstreamHint?.length).toBeGreaterThan(0);
  });
  it('detects a financial figure and normalises the amount', () => {
    const f = s.candidates.find((c) => c.kind === 'financial');
    expect(f?.amount).toBe(2_400_000);
  });
  it('detects a risk and raises a watch-out', () => {
    expect(s.candidates.some((c) => c.kind === 'risk')).toBe(true);
    expect(s.watchOuts.length).toBeGreaterThan(0);
  });
  it('anchors every candidate to a source paragraph', () => {
    for (const c of s.candidates) expect(c.paragraphIndex).toBeGreaterThanOrEqual(0);
  });
  it('assigns a confidence between 0 and 1', () => {
    for (const c of s.candidates) {
      expect(c.confidence).toBeGreaterThan(0);
      expect(c.confidence).toBeLessThanOrEqual(1);
    }
  });
});

describe('synthesis reflects the document, not a fixed script', () => {
  it('produces different output for different documents', () => {
    const a = synthesise(doc(['The warehouse management system cannot support real-time replenishment across 8 distribution sites.']));
    const b = synthesise(doc(['Our objective is to double e-commerce revenue by 2029.']));
    expect(a.candidates[0].kind).not.toBe(b.candidates[0].kind);
  });

  it('returns nothing when the text carries no signal', () => {
    const empty = synthesise(doc(['The meeting was held on Tuesday and lasted one hour.']));
    expect(empty.candidates).toHaveLength(0);
  });

  it('clusters recurring topics into themes', () => {
    const t = synthesise(doc([
      'Data quality is poor and the data warehouse is not trusted by the business.',
      'Master data management has no owner and the data governance policy is absent.',
      'Reporting and analytics rely on manual data extracts.',
    ]));
    expect(t.themes.some((x) => x.label === 'Data & Analytics')).toBe(true);
  });
});

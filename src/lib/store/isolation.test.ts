import { describe, it, expect } from 'vitest';
import { blankModel, CLIENT_DATA_KEYS } from './factories';
import { CAPABILITIES, INITIATIVES, OPPORTUNITIES, DEPENDENCIES, ROADMAP, OBJECTIVES } from '@/data/seed';
import { DEMO_ANSWERS } from '@/data/demoAnswers';
import { INTAKE_SECTIONS, PHASE_QUESTIONNAIRES } from '@/data/methodology';

describe('a blank engagement carries no client data', () => {
  const m = blankModel();

  it('has every client-data collection empty', () => {
    for (const k of CLIENT_DATA_KEYS) {
      expect(Array.isArray(m[k]) ? (m[k] as unknown[]).length : 0).toBe(0);
    }
  });

  it('has no financial estimates, human ranks or AI review state', () => {
    expect(Object.keys(m.financials)).toHaveLength(0);
    expect(Object.keys(m.humanRanks)).toHaveLength(0);
    expect(Object.keys(m.aiReviewed)).toHaveLength(0);
  });

  it('has an empty kickoff record', () => {
    expect(m.kickoff.mandate).toBe('');
    expect(m.kickoff.primaryObjectives).toHaveLength(0);
    expect(m.kickoff.completedAt).toBeNull();
  });

  it('shares no object identity with the demonstration seed', () => {
    expect(m.capabilities).not.toBe(CAPABILITIES);
    expect(m.initiatives).not.toBe(INITIATIVES);
    expect(m.opportunities).not.toBe(OPPORTUNITIES);
    expect(m.dependencies).not.toBe(DEPENDENCIES);
    expect(m.roadmapItems).not.toBe(ROADMAP.items);
    expect(m.objectives).not.toBe(OBJECTIVES);
  });

  it('contains none of the demonstration answers', () => {
    const blob = JSON.stringify(m);
    for (const a of Object.values(DEMO_ANSWERS).slice(0, 20)) {
      const v = Array.isArray(a.value) ? a.value.join(' ') : String(a.value);
      if (v.length > 25) expect(blob).not.toContain(v.slice(0, 25));
    }
  });

  it('does not mention the demonstration client anywhere', () => {
    expect(JSON.stringify(m).toLowerCase()).not.toContain('meridian');
  });

  it('returns a fresh object each call, so two blanks cannot share state', () => {
    const a = blankModel(); const b = blankModel();
    a.opportunities.push({ id: 'X' } as never);
    expect(b.opportunities).toHaveLength(0);
  });
});

describe('methodology templates are client-neutral and available to both modes', () => {
  const blob = JSON.stringify({ INTAKE_SECTIONS, PHASE_QUESTIONNAIRES }).toLowerCase();

  it('mentions no client name', () => {
    expect(blob).not.toContain('meridian');
    expect(blob).not.toContain('orgill');
  });

  it('provides a full intake and every engagement phase', () => {
    expect(INTAKE_SECTIONS).toHaveLength(7);
    expect(PHASE_QUESTIONNAIRES).toHaveLength(7);
    expect(INTAKE_SECTIONS.reduce((n, s) => n + s.questions.length, 0)).toBeGreaterThan(70);
  });

  it('declares downstream usage for every question, which is the lineage contract', () => {
    const all = [...INTAKE_SECTIONS.flatMap((s) => s.questions), ...PHASE_QUESTIONNAIRES.flatMap((p) => p.sections.flatMap((s) => s.questions))];
    for (const q of all) expect(q.usedIn.length).toBeGreaterThan(0);
  });

  it('uses unique question ids across every questionnaire', () => {
    const ids = [...INTAKE_SECTIONS.flatMap((s) => s.questions), ...PHASE_QUESTIONNAIRES.flatMap((p) => p.sections.flatMap((s) => s.questions))].map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

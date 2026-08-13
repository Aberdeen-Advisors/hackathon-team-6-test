'use client';

/**
 * Conductor prototype store.
 *
 * State lives in React context, persisted to localStorage under one versioned key.
 * There is no backend. Swapping this for a database is a data-layer change behind the
 * same interface, not a rewrite.
 *
 * Two behaviours here are architecturally real and should survive that swap:
 *   1. publish() writes a frozen snapshot. The portal reads the snapshot, not the model.
 *   2. submitFeedback() never mutates the model. Client input is a proposal.
 */

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
  CAPABILITIES, INITIATIVES, OPPORTUNITIES, DEPENDENCIES, ROADMAP, DEMO_ACCOUNTS, ENGAGEMENT,
  DIMENSIONS, PRIORITY_MODEL, EFFORT_SCALE, THEMES, OBJECTIVES as SEED_OBJECTIVES,
} from '@/data/seed';
import type { Level } from '@/data/seed';
import type {
  AppState, Model, Session, Publication, Submission, SubmissionType, Dependency,
  KickoffAnswers, Objective, Risk, IngestedDocument, Engagement, EngagementMode, Answer,
} from './types';
import type { Candidate, DocStructure, Synthesis } from '@/lib/ingest/synthesise';
import type { Insight } from '@/lib/insights/engine';
import { DEMO_ANSWERS } from '@/data/demoAnswers';
import { blankModel } from './factories';
import { emptyFinancials, type Financials, initiativeTotals, phaseInitiative, sumSeries, portfolioTotals, completeness } from '@/lib/calc/financials';
import { buildClientPayload, diffPayloads, type PublishSelection } from '@/lib/publish/buildClientPayload';
import { weightedScore, priorityBand, durationQuarters, earliestStart, detectConflicts, periodToIndex } from '@/lib/calc';

const KEY = 'conductor.v1';

function seedModel(): Model {
  return {
    capabilities: CAPABILITIES.map((c) => ({ ...c })),
    initiatives: INITIATIVES.map((i) => ({ ...i })),
    opportunities: OPPORTUNITIES.map((o) => ({ ...o, scores: o.scores.map((s) => ({ ...s })) })),
    dependencies: DEPENDENCIES.map((d) => ({ ...d })),
    roadmapItems: ROADMAP.items.map((r) => ({ ...r })),
    humanRanks: Object.fromEntries(
      OPPORTUNITIES.filter((o) => o.humanRank !== null).map((o) => [
        o.id,
        { rank: o.humanRank as number, rationale: o.humanRankRationale ?? 'Recorded during the alignment workshop.' },
      ]),
    ),
    aiReviewed: {},
    kickoff: {
      mandate: ENGAGEMENT.mandate,
      sponsor: '',
      horizonYears: 3,
      primaryObjectives: [],
      inScope: [],
      outOfScope: [],
      keyStakeholders: [],
      knownConstraints: '',
      successCriteria: '',
      documentRequests: [],
      completedAt: null,
    },
    objectives: SEED_OBJECTIVES.map((o) => ({ id: o.id, title: o.title, source: 'client_strategy' as const })),
    risks: [],
    documents: [],
    // Two initiatives arrive pre-estimated so the dashboard is not empty on first open;
    // the rest are deliberately unestimated so the coverage behaviour is visible.
    financials: {
      'INI-02': {
        ...emptyFinancials('INI-02'),
        oneTimeImplementation: 420_000, internalLabour: 180_000, externalLabour: 260_000,
        technologyVendor: 140_000, recurringOperatingAnnual: 95_000, contingencyPct: 15,
        expectedSavingsAnnual: 210_000, costAvoidanceAnnual: 480_000, benefitLagQuarters: 1,
        confidence: 'medium', basis: 'bottom_up',
        basisNote: 'Bottom-up estimate from the security remediation scope, benchmarked against two comparable programmes.',
        rangeLowPct: -15, rangeHighPct: 25,
      },
      'INI-03': {
        ...emptyFinancials('INI-03'),
        oneTimeImplementation: 310_000, internalLabour: 220_000, externalLabour: 190_000,
        technologyVendor: 85_000, recurringOperatingAnnual: 60_000, contingencyPct: 20,
        expectedSavingsAnnual: 340_000, benefitLagQuarters: 2,
        confidence: 'low', basis: 'analogue',
        basisNote: 'Analogue estimate only — integration scope is not yet defined. Treat as indicative.',
        rangeLowPct: -25, rangeHighPct: 45,
      },
    },
  };
}

function makeDemoEngagement(): Engagement {
  const model = seedModel();
  const selection: PublishSelection = {
    opportunityIds: OPPORTUNITIES.filter((o) => o.published).map((o) => o.id),
    includeCapabilities: true, includeRoadmap: true, includeDependencies: true,
    includeRisks: true, includeFinancials: true,
  };
  return {
    id: 'ENG-DEMO', mode: 'demo',
    label: `${ENGAGEMENT.clientName} — ${ENGAGEMENT.name}`,
    clientName: ENGAGEMENT.clientName,
    createdAt: '2026-11-04T09:00:00.000Z', createdBy: 'Liv DeSantis',
    answers: DEMO_ANSWERS,
    model,
    publications: [{
      version: 1, publishedAt: '2027-01-14T10:00:00.000Z', publishedBy: 'Liv DeSantis',
      note: 'Initial roadmap published for executive review ahead of the alignment session.',
      snapshot: buildClientPayload(model, selection),
    }],
    submissions: [],
    lastPublishedModelHash: hashModel(model),
  };
}

function makeBlankEngagement(label: string, clientName: string, by: string): Engagement {
  const model = blankModel();
  return {
    id: `ENG-${Date.now().toString(36).toUpperCase()}`, mode: 'blank',
    label, clientName, createdAt: new Date().toISOString(), createdBy: by,
    answers: {}, model, publications: [], submissions: [],
    lastPublishedModelHash: hashModel(model),
  };
}

function seedState(): AppState {
  const demo = makeDemoEngagement();
  return { session: null, engagements: { [demo.id]: demo }, activeId: null };
}

function hashModel(m: Model): string {
  return JSON.stringify({
    o: m.opportunities.map((x) => [x.id, x.scores.map((s) => s.level), x.tshirtSize]),
    i: m.initiatives.map((x) => [x.id, x.tshirtSize, x.themeId, x.owner, x.businessArea, x.name]),
    r: m.roadmapItems.map((x) => [x.initiativeId, x.startPeriod, x.waveId]),
    d: m.dependencies.map((x) => [x.id, x.type, x.validated, x.upstreamId, x.downstreamId]),
    h: m.humanRanks,
    f: Object.entries(m.financials).map(([k, v]) => [k, v.oneTimeImplementation, v.internalLabour, v.externalLabour, v.technologyVendor, v.recurringOperatingAnnual, v.contingencyPct, v.expectedSavingsAnnual, v.revenueOpportunityAnnual, v.costAvoidanceAnnual]),
    k: m.risks.map((x) => x.id),
    b: m.objectives.map((x) => x.id),
  });
}

interface Ctx extends AppState {
  ready: boolean;
  /** Active engagement accessors — every screen reads through these. */
  engagement: Engagement | null;
  model: Model;
  publications: Publication[];
  submissions: Submission[];
  answers: Record<string, Answer>;
  mode: EngagementMode;
  isBlank: boolean;
  openEngagement: (id: string) => void;
  closeEngagement: () => void;
  createBlankEngagement: (label: string, clientName: string) => string;
  deleteEngagement: (id: string) => void;
  resetDemoEngagement: () => void;
  setAnswer: (questionId: string, value: string | string[], source?: 'manual' | 'ai_accepted') => void;
  suggestAnswer: (questionId: string, s: NonNullable<Answer['suggestion']>) => void;
  resolveSuggestion: (questionId: string, decision: 'accepted' | 'rejected' | 'edited', value?: string) => void;
  resolveConflict: (questionId: string, keep: 'existing' | 'new') => void;
  addInsightDecision: (docId: string, insightId: string, status: 'accepted' | 'rejected' | 'reclassified', note?: string, newClass?: string) => void;
  signIn: (email: string, password: string) => { ok: boolean; error?: string };
  signOut: () => void;
  switchRole: (role: 'aberdeen' | 'client') => void;
  resetDemo: () => void;
  setDimensionScore: (oppId: string, dimensionKey: string, level: Level, rationale: string, source?: 'human' | 'ai') => void;
  markAiReviewed: (oppId: string) => void;
  setHumanRank: (oppId: string, rank: number | null, rationale: string) => void;
  updateInitiative: (id: string, patch: Partial<Model['initiatives'][number]>) => void;
  moveRoadmapItem: (initiativeId: string, startPeriod: string, reason: string) => void;
  updateDependency: (id: string, patch: Partial<Dependency>) => void;
  addDependency: (d: Omit<Dependency, 'id'>) => void;
  publish: (selection: PublishSelection, note: string) => void;
  submitFeedback: (type: SubmissionType, targetRef: string, targetLabel: string, payload: Record<string, unknown>, comment: string) => void;
  reviewSubmission: (id: string, decision: 'accepted' | 'rejected', note: string) => void;
  saveKickoff: (k: Partial<KickoffAnswers>, complete?: boolean) => void;
  addDocument: (filename: string, docType: string, structure: DocStructure, synthesis: Synthesis, insights?: Insight[]) => string;
  removeDocument: (id: string) => void;
  acceptCandidate: (docId: string, candidate: Candidate, target: Record<string, string>) => string;
  rejectCandidate: (docId: string, candidateId: string, note?: string) => void;
  setFinancials: (initiativeId: string, patch: Partial<Financials>) => void;
  currentPublication: Publication | null;
  hasUnpublishedChanges: boolean;
  unpublishedCount: number;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => seedState());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState(JSON.parse(raw) as AppState);
    } catch {
      /* corrupt storage — fall back to seed */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* quota — non-fatal for a prototype */
    }
  }, [state, ready]);

  const signIn = useCallback((email: string, password: string) => {
    const acct = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
    if (!acct) return { ok: false, error: 'No account found with that email address.' };
    if (acct.password !== password) return { ok: false, error: 'Incorrect password.' };
    const session: Session = {
      email: acct.email, name: acct.name, title: acct.title, role: acct.role, organisation: acct.organisation,
    };
    setState((s) => ({ ...s, session }));
    return { ok: true };
  }, []);

  const signOut = useCallback(() => setState((s) => ({ ...s, session: null })), []);

  const switchRole = useCallback((role: 'aberdeen' | 'client') => {
    const acct = DEMO_ACCOUNTS.find((a) => a.role === role);
    if (!acct) return;
    setState((s) => ({
      ...s,
      session: { email: acct.email, name: acct.name, title: acct.title, role: acct.role, organisation: acct.organisation },
    }));
  }, []);

  const resetDemo = useCallback(() => {
    localStorage.removeItem(KEY);
    setState((s) => ({ ...seedState(), session: s.session }));
  }, []);

  /* Every mutation is scoped to the active engagement. There is no code path that can
     write to one engagement while another is open, which is what keeps demo data out of a
     blank engagement. */
  const patchEngagement = (fn: (e: Engagement) => Engagement) =>
    setState((s) => {
      if (!s.activeId) return s;
      const e = s.engagements[s.activeId];
      if (!e) return s;
      return { ...s, engagements: { ...s.engagements, [s.activeId]: fn(e) } };
    });

  const mutate = (fn: (m: Model) => Model) => patchEngagement((e) => ({ ...e, model: fn(e.model) }));

  const openEngagement = useCallback((id: string) => setState((s) => ({ ...s, activeId: id })), []);
  const closeEngagement = useCallback(() => setState((s) => ({ ...s, activeId: null })), []);

  const createBlankEngagement: Ctx['createBlankEngagement'] = useCallback((label, clientName) => {
    let id = '';
    setState((s) => {
      const e = makeBlankEngagement(label, clientName, s.session?.name ?? 'Aberdeen');
      id = e.id;
      return { ...s, engagements: { ...s.engagements, [e.id]: e }, activeId: e.id };
    });
    return id;
  }, []);

  const deleteEngagement: Ctx['deleteEngagement'] = useCallback((id) => {
    setState((s) => {
      if (id === 'ENG-DEMO') return s;                       // the demo is not deletable
      const next = { ...s.engagements };
      delete next[id];
      return { ...s, engagements: next, activeId: s.activeId === id ? null : s.activeId };
    });
  }, []);

  const resetDemoEngagement: Ctx['resetDemoEngagement'] = useCallback(() => {
    setState((s) => ({ ...s, engagements: { ...s.engagements, 'ENG-DEMO': makeDemoEngagement() } }));
  }, []);

  /* ---------------------------------------------------------------- answers */

  const setAnswer: Ctx['setAnswer'] = useCallback((questionId, value, source = 'manual') => {
    patchEngagement((e) => {
      const prev = e.answers[questionId];
      const who = 'user';
      const next: Answer = {
        questionId, value, source,
        updatedAt: new Date().toISOString(), updatedBy: who,
        suggestion: prev?.suggestion ? { ...prev.suggestion, status: source === 'manual' ? 'edited' : prev.suggestion.status } : undefined,
        conflict: prev?.conflict,
        history: prev ? [...prev.history, { value: prev.value, source: prev.source, at: prev.updatedAt, by: prev.updatedBy }] : [],
      };
      return { ...e, answers: { ...e.answers, [questionId]: next } };
    });
  }, []);

  const suggestAnswer: Ctx['suggestAnswer'] = useCallback((questionId, suggestion) => {
    patchEngagement((e) => {
      const prev = e.answers[questionId];
      // A confirmed manual answer is authoritative. A contradicting document raises a
      // conflict for a human to resolve; it never overwrites (PRD section 7 of the brief).
      if (prev && prev.source === 'manual' && String(prev.value).trim().length > 0) {
        if (String(prev.value).trim().toLowerCase() === suggestion.value.trim().toLowerCase()) return e;
        return {
          ...e,
          answers: {
            ...e.answers,
            [questionId]: {
              ...prev,
              conflict: {
                documentId: suggestion.documentId, documentName: suggestion.documentName,
                excerpt: suggestion.excerpt, suggestedValue: suggestion.value,
                raisedAt: new Date().toISOString(),
              },
            },
          },
        };
      }
      return {
        ...e,
        answers: {
          ...e.answers,
          [questionId]: {
            questionId, value: prev?.value ?? '', source: 'manual',
            updatedAt: new Date().toISOString(), updatedBy: 'system',
            suggestion: { ...suggestion, status: 'pending' },
            history: prev?.history ?? [],
          },
        },
      };
    });
  }, []);

  const resolveSuggestion: Ctx['resolveSuggestion'] = useCallback((questionId, decision, value) => {
    patchEngagement((e) => {
      const prev = e.answers[questionId];
      if (!prev?.suggestion) return e;
      if (decision === 'rejected') {
        return { ...e, answers: { ...e.answers, [questionId]: { ...prev, suggestion: { ...prev.suggestion, status: 'rejected' } } } };
      }
      const finalValue = decision === 'edited' ? (value ?? prev.suggestion.value) : prev.suggestion.value;
      return {
        ...e,
        answers: {
          ...e.answers,
          [questionId]: {
            ...prev,
            value: finalValue,
            source: decision === 'edited' ? 'manual' : 'ai_accepted',
            updatedAt: new Date().toISOString(), updatedBy: 'user',
            suggestion: { ...prev.suggestion, status: decision },
            history: [...prev.history, { value: prev.value, source: prev.source, at: prev.updatedAt, by: prev.updatedBy }],
          },
        },
      };
    });
  }, []);

  const resolveConflict: Ctx['resolveConflict'] = useCallback((questionId, keep) => {
    patchEngagement((e) => {
      const prev = e.answers[questionId];
      if (!prev?.conflict) return e;
      if (keep === 'existing') {
        return { ...e, answers: { ...e.answers, [questionId]: { ...prev, conflict: undefined } } };
      }
      return {
        ...e,
        answers: {
          ...e.answers,
          [questionId]: {
            ...prev, value: prev.conflict.suggestedValue, source: 'ai_accepted',
            updatedAt: new Date().toISOString(), updatedBy: 'user', conflict: undefined,
            history: [...prev.history, { value: prev.value, source: prev.source, at: prev.updatedAt, by: prev.updatedBy }],
          },
        },
      };
    });
  }, []);

  const addInsightDecision: Ctx['addInsightDecision'] = useCallback((docId, insightId, status, note, newClass) => {
    mutate((m) => ({
      ...m,
      documents: m.documents.map((d) =>
        d.id !== docId ? d : { ...d, insightDecisions: { ...d.insightDecisions, [insightId]: { status, note, newClass } } }),
    }));
  }, []);

  const setDimensionScore: Ctx['setDimensionScore'] = useCallback((oppId, dimensionKey, level, rationale, source = 'human') => {
    mutate((m) => ({
      ...m,
      opportunities: m.opportunities.map((o) =>
        o.id !== oppId
          ? o
          : {
              ...o,
              scores: o.scores.map((sc) =>
                sc.dimensionKey !== dimensionKey ? sc : { ...sc, level, rationale, source },
              ),
            },
      ),
    }));
  }, []);

  const markAiReviewed: Ctx['markAiReviewed'] = useCallback((oppId) => {
    mutate((m) => ({ ...m, aiReviewed: { ...m.aiReviewed, [oppId]: true } }));
  }, []);

  const setHumanRank: Ctx['setHumanRank'] = useCallback((oppId, rank, rationale) => {
    mutate((m) => {
      const next = { ...m.humanRanks };
      if (rank === null) delete next[oppId];
      else next[oppId] = { rank, rationale };
      return { ...m, humanRanks: next };
    });
  }, []);

  const updateInitiative: Ctx['updateInitiative'] = useCallback((id, patch) => {
    mutate((m) => ({ ...m, initiatives: m.initiatives.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  }, []);

  const moveRoadmapItem: Ctx['moveRoadmapItem'] = useCallback((initiativeId, startPeriod, reason) => {
    mutate((m) => {
      const idx = periodToIndex(startPeriod, ROADMAP.startPeriod);
      const wave =
        ROADMAP.waves.find(
          (w) => idx >= periodToIndex(w.startPeriod, ROADMAP.startPeriod) && idx <= periodToIndex(w.endPeriod, ROADMAP.startPeriod),
        ) ?? ROADMAP.waves[ROADMAP.waves.length - 1];
      return {
        ...m,
        roadmapItems: m.roadmapItems.map((r) =>
          r.initiativeId === initiativeId ? { ...r, startPeriod, waveId: wave.id, moveReason: reason } : r,
        ),
      };
    });
  }, []);

  const updateDependency: Ctx['updateDependency'] = useCallback((id, patch) => {
    mutate((m) => ({ ...m, dependencies: m.dependencies.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));
  }, []);

  const addDependency: Ctx['addDependency'] = useCallback((d) => {
    mutate((m) => ({ ...m, dependencies: [...m.dependencies, { ...d, id: `DEP-${String(m.dependencies.length + 1).padStart(2, '0')}` }] }));
  }, []);

  const publish: Ctx['publish'] = useCallback((selection, note) => {
    patchEngagement((e) => {
      const snapshot = buildClientPayload(e.model, selection);
      const version = (e.publications[e.publications.length - 1]?.version ?? 0) + 1;
      return {
        ...e,
        publications: [...e.publications, { version, publishedAt: new Date().toISOString(), publishedBy: 'Aberdeen', note, snapshot }],
        lastPublishedModelHash: hashModel(e.model),
      };
    });
  }, []);

  const submitFeedback: Ctx['submitFeedback'] = useCallback((type, targetRef, targetLabel, payload, comment) => {
    patchEngagement((e) => ({
      ...e,
      submissions: [
        {
          id: `SUB-${Date.now().toString(36).toUpperCase()}`,
          type, targetRef, targetLabel, payload, comment,
          submittedBy: 'client', submittedByName: 'Client Executive',
          createdAt: new Date().toISOString(), status: 'pending',
        },
        ...e.submissions,
      ],
    }));
  }, []);

  /** Accepting a submission APPLIES the change to the working model. Rejecting does not. */
  const reviewSubmission: Ctx['reviewSubmission'] = useCallback((id, decision, note) => {
    patchEngagement((eng) => {
      const sub = eng.submissions.find((x) => x.id === id);
      if (!sub) return eng;
      let model = eng.model;

      if (decision === 'accepted') {
        if (sub.type === 'ranking') {
          const order = (sub.payload.order as string[]) ?? [];
          const humanRanks = { ...model.humanRanks };
          order.forEach((initiativeId, i) => {
            const opps = model.opportunities.filter((o) => o.initiativeId === initiativeId);
            for (const o of opps) {
              humanRanks[o.id] = { rank: i + 1, rationale: `Client submission ${sub.id}: ${note}` };
            }
          });
          model = { ...model, humanRanks };
        }
        if (sub.type === 'dependency_suggestion') {
          const upstreamId = sub.payload.upstreamId as string;
          const downstreamId = sub.payload.downstreamId as string;
          model = {
            ...model,
            dependencies: [
              ...model.dependencies,
              {
                id: `DEP-${String(model.dependencies.length + 1).padStart(2, '0')}`,
                upstreamId, downstreamId,
                type: 'hard_prerequisite',
                rationale: (sub.payload.reason as string) ?? sub.comment,
                triggerLanguage: `Client submission ${sub.id}`,
                confidence: 1,
                validated: true,
                origin: 'client_workshop',
              },
            ],
          };
        }
        if (sub.type === 'timing_feedback') {
          const initiativeId = sub.payload.initiativeId as string;
          const startPeriod = sub.payload.proposedPeriod as string;
          const idx = periodToIndex(startPeriod, ROADMAP.startPeriod);
          const wave =
            ROADMAP.waves.find(
              (w) => idx >= periodToIndex(w.startPeriod, ROADMAP.startPeriod) && idx <= periodToIndex(w.endPeriod, ROADMAP.startPeriod),
            ) ?? ROADMAP.waves[ROADMAP.waves.length - 1];
          model = {
            ...model,
            roadmapItems: model.roadmapItems.map((r) =>
              r.initiativeId === initiativeId
                ? { ...r, startPeriod, waveId: wave.id, moveReason: `Accepted client submission ${sub.id}: ${note}` }
                : r,
            ),
          };
        }
        // A comment is acknowledged, not applied. A comment is not a change request.
      }

      return {
        ...eng,
        model,
        submissions: eng.submissions.map((x) =>
          x.id !== id ? x : { ...x, status: decision, reviewNote: note, reviewedBy: 'Aberdeen', reviewedAt: new Date().toISOString() },
        ),
      };
    });
  }, []);

  const saveKickoff: Ctx['saveKickoff'] = useCallback((k, complete) => {
    patchEngagement((e) => ({
      ...e,
      model: {
        ...e.model,
        kickoff: { ...e.model.kickoff, ...k, completedAt: complete ? new Date().toISOString() : e.model.kickoff.completedAt },
        // Objectives captured at kickoff become selectable in strategic-alignment scoring.
        objectives: complete || k.primaryObjectives
          ? [
              ...e.model.objectives.filter((o) => o.source !== 'kickoff'),
              ...((k.primaryObjectives ?? e.model.kickoff.primaryObjectives) || [])
                .filter((t) => t.trim().length > 2)
                .map((title, i) => ({ id: `OBJ-K${i + 1}`, title: title.trim(), source: 'kickoff' as const })),
            ]
          : e.model.objectives,
      },
    }));
  }, []);

  const addDocument: Ctx['addDocument'] = useCallback((filename, docType, structure, synthesis, insights = []) => {
    const id = `DOC-${Date.now().toString(36).toUpperCase()}`;
    patchEngagement((e) => ({
      ...e,
      model: {
        ...e.model,
        documents: [
          { id, filename, docType, uploadedAt: new Date().toISOString(), uploadedBy: 'Aberdeen',
            structure, synthesis, insights, decisions: {}, insightDecisions: {} },
          ...e.model.documents,
        ],
      },
    }));
    return id;
  }, []);

  const removeDocument: Ctx['removeDocument'] = useCallback((id) => {
    patchEngagement((e) => ({ ...e, model: { ...e.model, documents: e.model.documents.filter((d) => d.id !== id) } }));
  }, []);

  /**
   * Accepting a candidate is what makes it real. Each kind lands in a different part of
   * the model, and the source document is retained as its provenance.
   */
  const acceptCandidate: Ctx['acceptCandidate'] = useCallback((docId, c, target) => {
    let landedAs = '';
    patchEngagement((eng) => {
      let m = eng.model;
      const doc = m.documents.find((d) => d.id === docId);
      const ref = `${doc?.filename ?? 'document'} · ${c.section} · paragraph ${c.paragraphIndex + 1}`;

      if (c.kind === 'objective') {
        const id = `OBJ-D${m.objectives.length + 1}`;
        landedAs = `Objective ${id}`;
        m = { ...m, objectives: [...m.objectives, { id, title: target.title || c.title, source: 'document', sourceRef: ref }] };
      }

      if (c.kind === 'opportunity') {
        const initiativeId = target.initiativeId || m.initiatives[0].id;
        const id = `OPP-${String(m.opportunities.length + 1).padStart(3, '0')}`;
        landedAs = `Opportunity ${id}`;
        m = {
          ...m,
          opportunities: [
            ...m.opportunities,
            {
              id, initiativeId,
              title: target.title || c.title,
              description: c.detail,
              recommendedAction: target.recommendedAction || 'Define scope and owner, then size the effort.',
              soWhat: c.detail,
              technologyFunctionId: 'TF-01',
              businessArea: m.initiatives.find((i) => i.id === initiativeId)?.businessArea ?? 'Technology',
              tshirtSize: null, investmentType: null,
              objectiveIds: [], capabilityIds: [], evidenceIds: [],
              // Deliberately unscored: it enters the backlog reading "Not yet scored".
              scores: DIMENSIONS.map((d) => ({ dimensionKey: d.key, level: null, rationale: '', source: 'human' as const, evidenceIds: [] })),
              humanRank: null, humanRankRationale: null, published: false,
              sourceRef: ref,
            } as never,
          ],
        };
      }

      if (c.kind === 'dependency') {
        const upstreamId = target.upstreamId;
        const downstreamId = target.downstreamId;
        if (upstreamId && downstreamId && upstreamId !== downstreamId) {
          const id = `DEP-${String(m.dependencies.length + 1).padStart(2, '0')}`;
          landedAs = `Dependency ${id} (proposed)`;
          m = {
            ...m,
            dependencies: [
              ...m.dependencies,
              {
                id, upstreamId, downstreamId,
                type: target.type || 'hard_prerequisite',
                rationale: c.detail,
                triggerLanguage: c.excerpt,
                confidence: c.confidence,
                // Proposed, not validated — it does not constrain the schedule until reviewed.
                validated: false,
                origin: 'ai_inferred',
              },
            ],
          };
        }
      }

      if (c.kind === 'financial') {
        const initiativeId = target.initiativeId || m.initiatives[0].id;
        const line = (target.line || 'oneTimeImplementation') as keyof Financials;
        const existing = m.financials[initiativeId] ?? emptyFinancials(initiativeId);
        landedAs = `Financial model · ${m.initiatives.find((i) => i.id === initiativeId)?.name}`;
        m = {
          ...m,
          financials: {
            ...m.financials,
            [initiativeId]: {
              ...existing,
              [line]: c.amount ?? null,
              basis: existing.basis ?? 'analogue',
              basisNote: existing.basisNote || `From ${ref}: "${c.excerpt.slice(0, 160)}"`,
              confidence: existing.confidence ?? 'low',
            } as Financials,
          },
        };
      }

      if (c.kind === 'risk') {
        const id = `RSK-${String(m.risks.length + 1).padStart(2, '0')}`;
        landedAs = `Risk ${id}`;
        m = {
          ...m,
          risks: [
            ...m.risks,
            {
              id, title: c.title, detail: c.detail,
              severity: /\b(existential|critical|severe|halt|breach|outage|non[- ]compliance|penalt)\b/i.test(c.detail) ? 'high' : 'medium',
              sourceRef: ref,
              initiativeId: target.initiativeId || undefined,
            },
          ],
        };
      }

      return {
        ...eng,
        model: {
          ...m,
          documents: m.documents.map((d) =>
            d.id !== docId ? d : { ...d, decisions: { ...d.decisions, [c.id]: { status: 'accepted', landedAs } } },
          ),
        },
      };
    });
    return landedAs;
  }, []);

  const rejectCandidate: Ctx['rejectCandidate'] = useCallback((docId, candidateId, note) => {
    patchEngagement((e) => ({
      ...e,
      model: {
        ...e.model,
        documents: e.model.documents.map((d) =>
          d.id !== docId ? d : { ...d, decisions: { ...d.decisions, [candidateId]: { status: 'rejected', note } } },
        ),
      },
    }));
  }, []);

  const setFinancials: Ctx['setFinancials'] = useCallback((initiativeId, patch) => {
    mutate((m) => ({
      ...m,
      financials: {
        ...m.financials,
        [initiativeId]: { ...(m.financials[initiativeId] ?? emptyFinancials(initiativeId)), ...patch },
      },
    }));
  }, []);

  const engagement = state.activeId ? (state.engagements[state.activeId] ?? null) : null;
  const model = engagement?.model ?? blankModel();
  const publications = engagement?.publications ?? [];
  const submissions = engagement?.submissions ?? [];
  const answers = engagement?.answers ?? {};
  const mode: EngagementMode = engagement?.mode ?? 'blank';

  const currentPublication = publications[publications.length - 1] ?? null;
  const currentHash = hashModel(model);
  const hasUnpublishedChanges = publications.length > 0 && currentHash !== (engagement?.lastPublishedModelHash ?? currentHash);

  const unpublishedCount = useMemo(() => {
    if (!hasUnpublishedChanges) return 0;
    const prev = engagement?.lastPublishedModelHash ? JSON.parse(engagement.lastPublishedModelHash) : null;
    if (!prev) return 1;
    const cur = JSON.parse(currentHash);
    let n = 0;
    n += cur.o.filter((x: unknown[], i: number) => JSON.stringify(x) !== JSON.stringify(prev.o[i])).length;
    n += cur.r.filter((x: unknown[], i: number) => JSON.stringify(x) !== JSON.stringify(prev.r[i])).length;
    n += Math.abs(cur.d.length - prev.d.length);
    n += cur.d.filter((x: unknown[], i: number) => prev.d[i] && JSON.stringify(x) !== JSON.stringify(prev.d[i])).length;
    if (JSON.stringify(cur.h) !== JSON.stringify(prev.h)) n += 1;
    return Math.max(n, 1);
  }, [hasUnpublishedChanges, currentHash, engagement?.lastPublishedModelHash]);

  const value: Ctx = {
    ...state,
    engagement, model, publications, submissions, answers, mode, isBlank: mode === 'blank',
    ready, signIn, signOut, switchRole, resetDemo,
    openEngagement, closeEngagement, createBlankEngagement, deleteEngagement, resetDemoEngagement,
    setAnswer, suggestAnswer, resolveSuggestion, resolveConflict, addInsightDecision,
    setDimensionScore, markAiReviewed, setHumanRank, updateInitiative, moveRoadmapItem,
    updateDependency, addDependency, publish, submitFeedback, reviewSubmission,
    saveKickoff, addDocument, removeDocument, acceptCandidate, rejectCandidate, setFinancials,
    currentPublication, hasUnpublishedChanges, unpublishedCount,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreContext);
  if (!c) throw new Error('useStore must be used inside StoreProvider');
  return c;
}

/* ------------------------------------------------------ derived selectors */

export function useDerived() {
  const { model } = useStore();

  return useMemo(() => {
    const oppScore: Record<string, number | null> = {};
    const oppBand: Record<string, string | null> = {};
    for (const o of model.opportunities) {
      const inputs = o.scores.map((s) => ({ dimensionKey: s.dimensionKey, level: s.level }));
      const ws = weightedScore(inputs, DIMENSIONS).value;
      oppScore[o.id] = ws;
      oppBand[o.id] = priorityBand(ws, PRIORITY_MODEL.bands, PRIORITY_MODEL.bandLabels).value;
    }

    const initDuration: Record<string, number | null> = {};
    const initName: Record<string, string> = {};
    for (const i of model.initiatives) {
      initDuration[i.id] = durationQuarters(i.tshirtSize, EFFORT_SCALE).value;
      initName[i.id] = i.name;
    }

    const schedItems = model.roadmapItems.map((r) => ({
      initiativeId: r.initiativeId,
      startPeriod: r.startPeriod,
      durationQuarters: initDuration[r.initiativeId] ?? null,
    }));

    const sched = earliestStart(schedItems, model.dependencies, ROADMAP.startPeriod).value;

    const scoredComplete: Record<string, boolean> = {};
    for (const i of model.initiatives) {
      const kids = model.opportunities.filter((o) => o.initiativeId === i.id);
      scoredComplete[i.id] = kids.length > 0 && kids.every((o) => oppScore[o.id] !== null);
    }

    const conflicts = detectConflicts(schedItems, model.dependencies, ROADMAP.startPeriod, initName, scoredComplete);

    return { oppScore, oppBand, initDuration, initName, sched, conflicts, themes: THEMES, engagement: ENGAGEMENT };
  }, [model]);
}

export { diffPayloads };

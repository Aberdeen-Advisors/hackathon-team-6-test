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
  DIMENSIONS, PRIORITY_MODEL, EFFORT_SCALE, THEMES,
} from '@/data/seed';
import type { Level } from '@/data/seed';
import type {
  AppState, Model, Session, Publication, Submission, SubmissionType, Dependency,
} from './types';
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
  };
}

function seedState(): AppState {
  const model = seedModel();
  const selection: PublishSelection = {
    opportunityIds: OPPORTUNITIES.filter((o) => o.published).map((o) => o.id),
    includeCapabilities: true,
    includeRoadmap: true,
    includeDependencies: true,
  };
  const snapshot = buildClientPayload(model, selection);
  return {
    session: null,
    model,
    publications: [
      {
        version: 1,
        publishedAt: '2027-01-14T10:00:00.000Z',
        publishedBy: 'Liv DeSantis',
        note: 'Initial roadmap published for executive review ahead of the alignment session.',
        snapshot,
      },
    ],
    submissions: [],
    lastPublishedModelHash: hashModel(model),
  };
}

function hashModel(m: Model): string {
  return JSON.stringify({
    o: m.opportunities.map((x) => [x.id, x.scores.map((s) => s.level), x.tshirtSize]),
    i: m.initiatives.map((x) => [x.id, x.tshirtSize, x.themeId, x.owner, x.businessArea, x.name]),
    r: m.roadmapItems.map((x) => [x.initiativeId, x.startPeriod, x.waveId]),
    d: m.dependencies.map((x) => [x.id, x.type, x.validated, x.upstreamId, x.downstreamId]),
    h: m.humanRanks,
  });
}

interface Ctx extends AppState {
  ready: boolean;
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
    setState(seedState());
  }, []);

  const mutate = (fn: (m: Model) => Model) => setState((s) => ({ ...s, model: fn(s.model) }));

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
    setState((s) => {
      const snapshot = buildClientPayload(s.model, selection);
      const version = (s.publications[s.publications.length - 1]?.version ?? 0) + 1;
      return {
        ...s,
        publications: [
          ...s.publications,
          { version, publishedAt: new Date().toISOString(), publishedBy: s.session?.name ?? 'Aberdeen', note, snapshot },
        ],
        lastPublishedModelHash: hashModel(s.model),
      };
    });
  }, []);

  const submitFeedback: Ctx['submitFeedback'] = useCallback((type, targetRef, targetLabel, payload, comment) => {
    setState((s) => ({
      ...s,
      submissions: [
        {
          id: `SUB-${Date.now().toString(36).toUpperCase()}`,
          type, targetRef, targetLabel, payload, comment,
          submittedBy: s.session?.email ?? 'client',
          submittedByName: s.session?.name ?? 'Client',
          createdAt: new Date().toISOString(),
          status: 'pending',
        },
        ...s.submissions,
      ],
    }));
  }, []);

  /** Accepting a submission APPLIES the change to the working model. Rejecting does not. */
  const reviewSubmission: Ctx['reviewSubmission'] = useCallback((id, decision, note) => {
    setState((s) => {
      const sub = s.submissions.find((x) => x.id === id);
      if (!sub) return s;
      let model = s.model;

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
        ...s,
        model,
        submissions: s.submissions.map((x) =>
          x.id !== id
            ? x
            : { ...x, status: decision, reviewNote: note, reviewedBy: s.session?.name ?? 'Aberdeen', reviewedAt: new Date().toISOString() },
        ),
      };
    });
  }, []);

  const currentPublication = state.publications[state.publications.length - 1] ?? null;
  const currentHash = hashModel(state.model);
  const hasUnpublishedChanges = currentHash !== state.lastPublishedModelHash;

  const unpublishedCount = useMemo(() => {
    if (!hasUnpublishedChanges) return 0;
    const prev = state.lastPublishedModelHash ? JSON.parse(state.lastPublishedModelHash) : null;
    if (!prev) return 1;
    const cur = JSON.parse(currentHash);
    let n = 0;
    n += cur.o.filter((x: unknown[], i: number) => JSON.stringify(x) !== JSON.stringify(prev.o[i])).length;
    n += cur.r.filter((x: unknown[], i: number) => JSON.stringify(x) !== JSON.stringify(prev.r[i])).length;
    n += Math.abs(cur.d.length - prev.d.length);
    n += cur.d.filter((x: unknown[], i: number) => prev.d[i] && JSON.stringify(x) !== JSON.stringify(prev.d[i])).length;
    if (JSON.stringify(cur.h) !== JSON.stringify(prev.h)) n += 1;
    return Math.max(n, 1);
  }, [hasUnpublishedChanges, currentHash, state.lastPublishedModelHash]);

  const value: Ctx = {
    ...state, ready, signIn, signOut, switchRole, resetDemo,
    setDimensionScore, markAiReviewed, setHumanRank, updateInitiative, moveRoadmapItem,
    updateDependency, addDependency, publish, submitFeedback, reviewSubmission,
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

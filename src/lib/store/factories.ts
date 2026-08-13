/**
 * Engagement factories. PURE and separately testable, because the guarantee they provide —
 * that a blank engagement contains no client data from anywhere else — is the one that
 * would be most damaging to get wrong.
 */
import type { Model } from './types';

/** A truly empty engagement. Only reusable methodology structures exist elsewhere. */
export function blankModel(): Model {
  return {
    capabilities: [], initiatives: [], opportunities: [], dependencies: [], roadmapItems: [],
    humanRanks: {}, aiReviewed: {},
    kickoff: {
      mandate: '', sponsor: '', horizonYears: 3, primaryObjectives: [], inScope: [], outOfScope: [],
      keyStakeholders: [], knownConstraints: '', successCriteria: '', documentRequests: [], completedAt: null,
    },
    objectives: [], risks: [], documents: [], financials: {},
  };
}

/** Every collection that could carry client data. Used by the isolation test. */
export const CLIENT_DATA_KEYS = [
  'capabilities', 'initiatives', 'opportunities', 'dependencies', 'roadmapItems',
  'objectives', 'risks', 'documents',
] as const;

import type { Opportunity, Level } from '@/data/seed';
import type { DocStructure, Synthesis, Candidate, CandidateKind } from '@/lib/ingest/synthesise';
import type { Financials } from '@/lib/calc/financials';

export type Role = 'aberdeen' | 'client';

export interface Session {
  email: string;
  name: string;
  title: string;
  role: Role;
  organisation: string;
}

export interface Capability {
  id: string; functionId: string; name: string;
  current: number; target: number; rationale: string;
  evidenceIds: string[]; priorityToFix: string;
}

export interface Initiative {
  id: string; themeId: string; name: string; owner: string;
  businessArea: string; tshirtSize: string | null;
}

export interface Dependency {
  id: string; upstreamId: string; downstreamId: string; type: string;
  rationale: string; triggerLanguage: string; confidence: number;
  validated: boolean; origin: string;
}

export interface RoadmapItem {
  initiativeId: string; waveId: string; startPeriod: string; lane: string;
  moveReason?: string;
}

export interface KickoffAnswers {
  mandate: string;
  sponsor: string;
  horizonYears: number;
  primaryObjectives: string[];
  inScope: string[];
  outOfScope: string[];
  keyStakeholders: { name: string; role: string; area: string }[];
  knownConstraints: string;
  successCriteria: string;
  documentRequests: string[];
  completedAt: string | null;
}

export interface Objective {
  id: string;
  title: string;
  source: 'client_strategy' | 'kickoff' | 'document' | 'executive_stated';
  sourceRef?: string;
}

export interface Risk {
  id: string;
  title: string;
  detail: string;
  severity: 'high' | 'medium';
  sourceRef: string;
  initiativeId?: string;
}

export interface IngestedDocument {
  id: string;
  filename: string;
  uploadedAt: string;
  uploadedBy: string;
  docType: string;
  structure: DocStructure;
  synthesis: Synthesis;
  decisions: Record<string, { status: 'accepted' | 'rejected'; note?: string; landedAs?: string }>;
}

export type { Candidate, CandidateKind, Financials, DocStructure, Synthesis };

export interface Model {
  capabilities: Capability[];
  initiatives: Initiative[];
  opportunities: Opportunity[];
  dependencies: Dependency[];
  roadmapItems: RoadmapItem[];
  humanRanks: Record<string, { rank: number; rationale: string }>;
  aiReviewed: Record<string, boolean>;
  kickoff: KickoffAnswers;
  objectives: Objective[];
  risks: Risk[];
  documents: IngestedDocument[];
  financials: Record<string, Financials>;
}

export interface Publication {
  version: number;
  publishedAt: string;
  publishedBy: string;
  note: string;
  snapshot: ClientPayload;
}

export type SubmissionType = 'comment' | 'ranking' | 'dependency_suggestion' | 'timing_feedback';
export type SubmissionStatus = 'pending' | 'accepted' | 'rejected';

export interface Submission {
  id: string;
  type: SubmissionType;
  targetRef: string;
  targetLabel: string;
  payload: Record<string, unknown>;
  comment: string;
  submittedBy: string;
  submittedByName: string;
  createdAt: string;
  status: SubmissionStatus;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

/* ---- the client payload. Built by an explicit whitelist serialiser. ---- */

export interface ClientOpportunity {
  id: string; title: string; description: string; soWhat: string;
  recommendedAction: string; themeName: string; themeColour: string;
  initiativeName: string; initiativeId: string; businessArea: string;
  priorityBand: string | null; tshirtSize: string | null;
}

export interface ClientCapability {
  id: string; functionName: string; name: string;
  current: number; target: number; gap: number;
  currentLabel: string; rationale: string; priorityToFix: string;
}

export interface ClientRoadmapItem {
  initiativeId: string; initiativeName: string; themeName: string; themeColour: string;
  waveId: string; startPeriod: string; durationQuarters: number | null;
  businessArea: string; owner: string; priorityBand: string | null;
}

export interface ClientDependency {
  id: string; upstreamName: string; downstreamName: string; type: string; rationale: string;
}

export interface ClientRisk { id: string; title: string; detail: string; severity: 'high' | 'medium'; initiativeName?: string }

export interface ClientFinancialSummary {
  investmentBase: number | null;
  investmentLow: number | null;
  investmentHigh: number | null;
  annualBenefit: number | null;
  byYear: { year: number; cost: number; benefit: number }[];
  byWave: { waveId: string; label: string; cost: number | null }[];
  coverage: { estimated: number; total: number };
  isPartial: boolean;
}

export interface ClientPayload {
  mandate: string; clientName: string; engagementName: string; phase: string;
  risks: ClientRisk[];
  financials: ClientFinancialSummary | null;
  opportunities: ClientOpportunity[];
  capabilities: ClientCapability[];
  roadmapItems: ClientRoadmapItem[];
  waves: { id: string; label: string; startPeriod: string; endPeriod: string; targetOutcome: string }[];
  dependencies: ClientDependency[];
  themes: { id: string; name: string; colour: string; strategicQuestion: string }[];
  frameworkDisclaimer: string;
  roadmapStart: string;
  horizonQuarters: number;
}

export interface AppState {
  session: Session | null;
  model: Model;
  publications: Publication[];
  submissions: Submission[];
  lastPublishedModelHash: string;
}

export type { Level };

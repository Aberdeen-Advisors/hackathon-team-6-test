/**
 * Completed intake responses for the demonstration engagement.
 *
 * Sanitised: the client is fictional ("Meridian Supply Group"), all names are invented,
 * and every figure is illustrative. The analytical STRUCTURE mirrors a real Aberdeen
 * kickoff; none of the content identifies a client.
 *
 * A blank engagement never loads this file.
 */

import type { Answer } from '@/lib/store/types';

const A = (questionId: string, value: string | string[]): Answer => ({
  questionId, value, source: 'manual',
  updatedAt: '2026-11-06T14:20:00.000Z', updatedBy: 'Liv DeSantis', history: [],
});

/** A handful arrived from an uploaded document and were accepted — provenance retained. */
const FROM_DOC = (questionId: string, value: string, excerpt: string, confidence: number): Answer => ({
  questionId, value, source: 'ai_accepted',
  updatedAt: '2026-11-12T09:40:00.000Z', updatedBy: 'Liv DeSantis',
  suggestion: {
    value, documentId: 'DOC-SEED-01', documentName: 'Meridian — board strategy pack.docx',
    excerpt, paragraphIndex: 4, confidence, status: 'accepted',
  },
  history: [{ value: '', source: 'manual', at: '2026-11-06T14:20:00.000Z', by: 'Liv DeSantis' }],
});

const entries: Answer[] = [
  /* ---- profile ---- */
  A('clientName', 'Meridian Supply Group'),
  A('industry', 'Distribution & Wholesale'),
  A('subSector', 'Independent hardware and building products distribution'),
  A('orgSize', '$1bn–$5bn'),
  A('footprint', '8 distribution centres, ~150 owned stores, 1,200 independent dealers, single country'),
  A('engagementName', 'Technology Strategy & Roadmap'),
  A('engagementType', 'Technology strategy & roadmap'),
  A('startDate', '2026-11-04'),
  A('duration', '12 weeks'),
  A('currentPhase', 'Board'),
  A('aberdeenLead', 'Liv DeSantis'),
  A('aberdeenTeam', ['Krutin Shah — technology architecture', 'Ashmi Turakhia — data and analytics', 'Roger Seegolam — supply chain systems', 'John Duncan — financial modelling']),
  A('sponsor', 'Chief Digital & Information Officer'),
  A('primaryContact', 'VP, Enterprise Applications'),
  A('audience', ['Board', 'Executive committee', 'CIO / CDIO', 'Technology leadership']),
  A('deliverables', ['Current-state assessment', 'Prioritised opportunity backlog', 'Multi-year roadmap', 'Investment case', 'Board deck', '90-day activation plan']),
  A('boardDate', '2027-02-18'),

  /* ---- context ---- */
  A('trigger', 'A near-miss continuity event on the core order-processing platform, combined with the arrival of a new CDIO who inherited no documented technology plan. The Board asked for a costed, sequenced answer within the quarter.'),
  A('whyNow', 'Two funded programmes are about to go live into the same integration layer, and the decision on the commerce platform has been deferred twice. Deferring again would push the earliest possible revenue impact beyond the current plan period.'),
  A('whatChanged', 'Consolidation among competitors has put roughly 1,200 independent dealers in motion, which is the largest addressable shift the business has seen in a decade. At the same time the technology function lost most of its analytics capability to turnover.'),
  A('problems', ['No single integrated view of technology priorities across the enterprise', 'Several critical decisions have no owner and no date', 'Operational risk concentrated in a small number of undocumented dependencies', 'Investment is committed annually against multi-year programmes']),
  A('priorAttempts', 'An external roadmap was commissioned two years ago. It was delivered but never executed — it had no costing, no owner and no sequencing logic, so it could not survive the first budget cycle.'),
  A('whatWorked', 'Point solutions delivered by single teams have landed well. Anything requiring two functions to coordinate has stalled, which points at the operating model rather than at delivery capability.'),
  A('decisionsEnabled', ['Commerce platform direction', 'Wave-one investment envelope', 'Whether to fund the operating-model change alongside the technology work']),
  A('doNothing', 'The continuity exposure persists and compounds. The dealer opportunity is taken by competitors with functioning digital channels. Technology spend continues without a mechanism to judge whether it is buying the right things.'),
  A('externalDeadlines', ['Board meeting 18 February 2027', 'Two programme go-lives in Q2 2027', 'Vendor contract renewal in Q3 2027']),

  /* ---- objectives ---- */
  FROM_DOC('businessObjectives',
    'Grow revenue in the core distribution channel\nExceed the profit target\nImprove inventory turns\nReduce operational risk exposure',
    'Our primary objective is to grow revenue in the core distribution channel by 15% over the next three years, and the board has been clear that this must not come at the expense of margin.',
    0.88),
  A('technologyOutcomes', ['A single governed source of product data', 'Real-time integration between core platforms', 'Centralised identity across customer-facing systems', 'Documented, recoverable core operations']),
  A('financialOutcomes', ['Operating savings sufficient to fund the second wave', 'No increase in run-rate technology spend as a share of revenue', 'Avoided cost from retiring duplicated platforms']),
  A('otherOutcomes', ['Reduced continuity risk on core operations', 'Faster time-to-market for new product ranges', 'Analytics capability rebuilt to pre-turnover levels']),
  A('successAtEnd', 'A Board-approved investment envelope, an agreed sequence with named owners for wave one, and a decision closed on the commerce platform.'),
  A('successAfter', 'Measured on inventory turns, dealer digital adoption, incident volume on core platforms, and whether wave-one initiatives complete within their stated windows.'),
  A('mandatoryVsAspirational', 'Continuity and risk reduction are mandatory — the Board has said so explicitly. Revenue growth through digital channels is the primary aspiration but its timing is negotiable.'),
  A('objectiveAlignment', 'Technology leadership and the CFO are aligned on sequencing. Commercial leadership wants the growth work brought forward and is not persuaded that the foundational work has to come first. This is the central disagreement to resolve at the alignment session.'),

  /* ---- scope ---- */
  A('inScopeUnits', ['Distribution operations', 'Retail estate', 'Dealer services', 'Corporate functions']),
  A('inScopeTech', ['Core order processing', 'ERP', 'Integration layer', 'Master data', 'Analytics platform', 'Digital commerce', 'Identity and access', 'Distribution centre systems']),
  A('outOfScope', ['Physical security', 'HR systems replacement', 'Store fit-out technology']),
  A('roadmapBreadth', 'Enterprise-wide'),
  A('horizon', '3 years'),
  A('detailLevel', 'Initiative and workstream'),
  A('existingInitiatives', ['ERP phase two', 'Identity platform implementation', 'Demand planning replacement', 'Distribution centre device refresh']),
  A('settledDecisions', ['ERP vendor selection', 'Cloud platform direction']),
  A('fixedAssumptions', ['Annual budget approval cycle remains', 'No net headcount increase in the technology function during wave one']),
  A('challengePermission', 'Explicit permission to challenge the sequencing of committed programmes and the annual funding model. Not permitted to reopen the ERP vendor decision.'),

  /* ---- constraints ---- */
  A('budgetRange', 'Indicative envelope of $8–12m across three years, subject to annual approval'),
  A('capacityLimits', 'Thirteen open technology roles including two director-level vacancies. Delivery capacity is the binding constraint on wave loading, not funding.'),
  A('timingRequirements', 'Nothing may disturb the two Q2 2027 go-lives. Integration governance must be in place before both.'),
  A('technologyConstraints', 'Core order processing runs on a platform with no real-time integration capability. Any real-time requirement must be met at the integration layer rather than at source.'),
  A('vendorCommitments', ['ERP implementation partner engaged through 2028', 'Demand planning licence committed for three years']),
  A('regulatory', ['Payment data handling', 'Dealer data usage under existing commercial agreements']),
  A('riskTolerance', 'Low — protect continuity above all'),
  A('changeAppetite', 'Moderate'),
  A('readiness', 'The technology function is engaged and pragmatic. The business is supportive in principle but has absorbed two failed change programmes in five years and is sceptical until it sees delivery.'),
  A('dataQuality', 'Product data is fragmented across three systems with no golden record. Financial data is reliable. Operational data exists but is not accessible for analysis.'),
  A('knownDependencies', ['Identity platform before supplier portal', 'Integration rationalisation before ERP phase two', 'Master data foundation before analytics activation']),
  A('leadershipBandwidth', 'The CDIO has capacity for a weekly steering cadence. Business unit leaders can commit to fortnightly at most during the trading peak.'),
  A('competingPrograms', 'A finance transformation is running concurrently and draws on the same integration and data resources. Not formally coordinated.'),

  /* ---- stakeholders ---- */
  A('executiveSponsors', ['Chief Digital & Information Officer — sponsor, high influence, supportive', 'Chief Financial Officer — funding approval, high influence, supportive with conditions']),
  A('decisionMakers', ['CDIO — technology direction', 'CFO — investment envelope', 'Chief Commercial Officer — commerce platform direction']),
  A('businessOwners', ['VP Distribution Operations', 'VP Retail', 'VP Dealer Services', 'VP Enterprise Applications']),
  A('smes', ['Head of Integration Architecture', 'Head of Master Data', 'Head of Infrastructure', 'Security lead']),
  A('affectedGroups', ['Distribution centre operations teams', 'Dealer-facing sales', 'Store operations', 'Finance shared services']),
  A('boardStakeholders', ['Board technology committee chair', 'Non-executive director with digital background']),
  A('governanceForums', ['Weekly technology steering', 'Monthly executive committee', 'Quarterly Board technology committee']),
  A('approvalRights', 'CDIO approves technology direction and sequencing. CFO approves the investment envelope and any individual initiative above $1m. Board approves the three-year envelope and the operating-model change.'),
  A('escalation', 'Steering to executive committee within one week; executive committee to Board at the next scheduled meeting or by written resolution if urgent.'),
  A('interviewParticipants', ['CDIO', 'CFO', 'Chief Commercial Officer', 'VP Enterprise Applications', 'VP Distribution Operations', 'Head of Integration Architecture', 'Head of Master Data', 'Security lead', 'VP Dealer Services', 'Head of Infrastructure']),
  A('influenceSupport', 'CDIO and CFO are the decisive pair and are aligned. The Chief Commercial Officer is high-influence and currently unconvinced on sequencing. Distribution operations is supportive and will be the earliest beneficiary.'),
  A('resistance', 'Commercial leadership resists any sequence that puts foundational work ahead of revenue-generating work. Distribution centre operations is wary of further device change after a difficult refresh two years ago.'),

  /* ---- hypotheses ---- */
  A('currentBeliefs', ['The binding constraint is delivery capacity, not funding', 'The integration layer is the single largest source of downstream risk', 'The commerce platform decision is the highest-value decision available']),
  A('toTest', ['Whether foundational work genuinely blocks the growth work, or is assumed to', 'Whether the analytics platform is underused for organisational or technical reasons', 'Whether the stated budget envelope reflects a real commitment']),
  A('knownPainPoints', ['Product data fragmented across three systems', 'Overnight batch integration cannot support real-time requirements', 'No documented recovery path for core order processing', 'Analytics capability lost to turnover']),
  A('strengthsToProtect', ['Core operations are reliable with few major incidents', 'The technology team is engaged and pragmatic', 'Significant platform capability is already licensed and paid for']),
  A('visibleRisks', ['Key-person dependency on core platform operations', 'Two programmes converging on an ungoverned integration layer', 'Concentrated capital exposure as multiple systems reach end of life in the same year']),
  A('initiativesUnderway', ['ERP phase two', 'Identity platform implementation', 'Demand planning replacement']),
  A('missingInformation', ['Detailed technology spend by category', 'Application inventory with lifecycle status', 'Dealer digital adoption data']),
  A('urgentQuestions', ['What does the transformation cost and over what period?', 'What can we stop doing?', 'Which decision, if made now, unlocks the most?']),
];

export const DEMO_ANSWERS: Record<string, Answer> = Object.fromEntries(entries.map((a) => [a.questionId, a]));

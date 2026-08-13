/**
 * Aberdeen transformation methodology — reusable structures.
 *
 * CLIENT-NEUTRAL. Nothing here is engagement data. Both the completed demonstration and a
 * blank engagement load these same templates; only answers differ.
 *
 * `usedIn` on each question is the lineage contract: it declares which downstream analysis
 * consumes the answer, and the interface renders it so a user can see the consequence of
 * what they are being asked before they answer it.
 */

export type QType = 'text' | 'longtext' | 'number' | 'date' | 'select' | 'multiselect' | 'list' | 'people' | 'scale';

export interface Question {
  id: string;
  label: string;
  help?: string;
  type: QType;
  options?: string[];
  placeholder?: string;
  /** Downstream consumers of this answer. Rendered as the "Used in" indicator. */
  usedIn: string[];
  required?: boolean;
}

export interface QSection {
  id: string;
  title: string;
  intent: string;
  questions: Question[];
}

/* ══════════════════════════════════════════════ LAYER 1 — engagement setup */

export const INTAKE_SECTIONS: QSection[] = [
  {
    id: 'profile',
    title: 'Client and engagement profile',
    intent: 'Establishes who this is for, who is doing it, and what has to exist at the end.',
    questions: [
      { id: 'clientName', label: 'Client or organisation name', type: 'text', required: true, usedIn: ['Engagement header', 'Client portal', 'All published outputs'] },
      { id: 'industry', label: 'Industry', type: 'select', options: ['Distribution & Wholesale', 'Retail', 'Manufacturing', 'Financial Services', 'Healthcare', 'Technology', 'Energy & Utilities', 'Transport & Logistics', 'Public Sector', 'Professional Services', 'Other'], usedIn: ['Benchmark selection', 'Capability tree defaults'] },
      { id: 'subSector', label: 'Sub-sector', type: 'text', placeholder: 'e.g. independent hardware distribution', usedIn: ['Benchmark selection'] },
      { id: 'orgSize', label: 'Organisation size', type: 'select', options: ['Under $100m revenue', '$100m–$500m', '$500m–$1bn', '$1bn–$5bn', '$5bn–$10bn', 'Over $10bn'], usedIn: ['Maturity target calibration', 'Cost analogue selection'] },
      { id: 'footprint', label: 'Geographic footprint', type: 'text', placeholder: 'e.g. 8 distribution centres, 150 stores, single country', usedIn: ['Scope definition', 'Capability assessment'] },
      { id: 'engagementName', label: 'Engagement name', type: 'text', required: true, usedIn: ['Engagement header', 'All outputs'] },
      { id: 'engagementType', label: 'Engagement type', type: 'select', options: ['Technology strategy & roadmap', 'Current-state assessment', 'Operating model design', 'Programme recovery', 'Due diligence', 'Post-merger integration'], usedIn: ['Phase plan', 'Deliverable set'] },
      { id: 'startDate', label: 'Engagement start date', type: 'date', usedIn: ['Phase timeline', 'Roadmap start period'] },
      { id: 'duration', label: 'Expected duration', type: 'select', options: ['4 weeks', '6 weeks', '8 weeks', '12 weeks', '16 weeks', 'Longer than 16 weeks'], usedIn: ['Phase timeline'] },
      { id: 'currentPhase', label: 'Current engagement phase', type: 'select', options: ['Kickoff', 'Fact gathering', 'Diagnose', 'Roadmap V1', 'Economics', 'Alignment', 'Board'], usedIn: ['Journey rail', 'Overview status'] },
      { id: 'aberdeenLead', label: 'Aberdeen engagement lead', type: 'text', usedIn: ['Approvals', 'Publication attribution'] },
      { id: 'aberdeenTeam', label: 'Aberdeen team members', type: 'list', help: 'One per line.', usedIn: ['Workload planning'] },
      { id: 'sponsor', label: 'Client executive sponsor', type: 'text', usedIn: ['Stakeholder map', 'Decision routing', 'Board narrative'] },
      { id: 'primaryContact', label: 'Primary client contact', type: 'text', usedIn: ['Stakeholder map'] },
      { id: 'audience', label: 'Intended audience for the final roadmap', type: 'multiselect', options: ['Board', 'Executive committee', 'CIO / CDIO', 'Technology leadership', 'Business unit leadership', 'Investors'], usedIn: ['Board narrative', 'Publishing policy', 'Level of detail'] },
      { id: 'deliverables', label: 'Expected final deliverables', type: 'multiselect', options: ['Current-state assessment', 'Prioritised opportunity backlog', 'Multi-year roadmap', 'Investment case', 'Board deck', 'Operating model design', '90-day activation plan'], usedIn: ['Output checklist', 'Publishing plan'] },
      { id: 'boardDate', label: 'Board or executive meeting date', type: 'date', help: 'Creates the backstop for decisions and mobilisation.', usedIn: ['Decision deadlines', 'Board deck version', 'Phase timeline'] },
    ],
  },
  {
    id: 'context',
    title: 'Transformation context',
    intent: 'Why now. Without this the roadmap is a list of technology work rather than a response to something.',
    questions: [
      { id: 'trigger', label: 'What event or condition triggered this engagement?', type: 'longtext', required: true, usedIn: ['Board narrative opening', 'Executive insights'] },
      { id: 'whyNow', label: 'Why is the transformation needed now rather than later?', type: 'longtext', usedIn: ['Urgency scoring calibration', 'Board narrative'] },
      { id: 'whatChanged', label: 'What has changed — in the business, market, technology or leadership agenda?', type: 'longtext', usedIn: ['Context slide', 'Strategic alignment'] },
      { id: 'problems', label: 'What problems is leadership trying to solve?', type: 'list', help: 'One per line.', usedIn: ['Finding categories', 'Opportunity generation'] },
      { id: 'priorAttempts', label: 'What transformation efforts have already been attempted?', type: 'longtext', usedIn: ['Risk assessment', 'Change readiness'] },
      { id: 'whatWorked', label: 'What worked, and what did not?', type: 'longtext', usedIn: ['Delivery risk', 'Sequencing assumptions'] },
      { id: 'decisionsEnabled', label: 'What decisions must this engagement enable?', type: 'list', usedIn: ['Decision log', 'Board asks'] },
      { id: 'doNothing', label: 'What happens if the organisation does nothing?', type: 'longtext', usedIn: ['Risk-if-deferred scoring', 'Board narrative'] },
      { id: 'externalDeadlines', label: 'Known deadlines, commitments or external events shaping the work', type: 'list', usedIn: ['Roadmap constraints', 'Decision deadlines'] },
    ],
  },
  {
    id: 'objectives',
    title: 'Objectives and measures of success',
    intent: 'These become the denominator of strategic-alignment scoring. An initiative claiming a top alignment score must trace to one of them by name.',
    questions: [
      { id: 'businessObjectives', label: 'Business objectives the roadmap must support', type: 'list', required: true, help: 'One per line. These appear directly in alignment scoring.', usedIn: ['Strategic alignment scoring (25% weight)', 'Opportunity linkage', 'Board narrative'] },
      { id: 'technologyOutcomes', label: 'Expected technology outcomes', type: 'list', usedIn: ['Target maturity setting', 'Capability gaps'] },
      { id: 'financialOutcomes', label: 'Expected financial outcomes', type: 'list', usedIn: ['Financial model targets', 'Benefit categories'] },
      { id: 'otherOutcomes', label: 'Operational, customer, workforce, risk or compliance outcomes that matter', type: 'list', usedIn: ['Benefit types', 'Risk register'] },
      { id: 'successAtEnd', label: 'How will leadership define success at the end of this engagement?', type: 'longtext', usedIn: ['Engagement acceptance', 'Deliverable checklist'] },
      { id: 'successAfter', label: 'How will success be measured after implementation?', type: 'longtext', usedIn: ['KPI definition', 'Value realisation'] },
      { id: 'mandatoryVsAspirational', label: 'Which objectives are mandatory, and which are aspirational?', type: 'longtext', usedIn: ['Alignment scoring calibration', 'Prioritisation'] },
      { id: 'objectiveAlignment', label: 'Are objectives aligned across stakeholders, or are there known disagreements?', type: 'longtext', usedIn: ['Alignment workshop design', 'Contradiction tracking'] },
    ],
  },
  {
    id: 'scope',
    title: 'Scope and boundaries',
    intent: 'Determines which capabilities are assessed and what the team may challenge.',
    questions: [
      { id: 'inScopeUnits', label: 'Business units, functions and geographies in scope', type: 'list', usedIn: ['Capability tree', 'Stakeholder plan'] },
      { id: 'inScopeTech', label: 'Technologies and processes in scope', type: 'list', usedIn: ['Capability tree', 'Assessment coverage'] },
      { id: 'outOfScope', label: 'Explicitly out of scope', type: 'list', help: 'Recording exclusions now prevents scope disputes later.', usedIn: ['Assessment coverage', 'Client expectations'] },
      { id: 'roadmapBreadth', label: 'Is the roadmap enterprise-wide or limited to a function or domain?', type: 'select', options: ['Enterprise-wide', 'Technology function only', 'A single business domain', 'A single programme'], usedIn: ['Capability tree', 'Publishing scope'] },
      { id: 'horizon', label: 'Planning horizon', type: 'select', options: ['1 year', '2 years', '3 years', '5 years'], usedIn: ['Roadmap timeline', 'Financial phasing', 'Wave definition'] },
      { id: 'detailLevel', label: 'Level of detail expected', type: 'select', options: ['Executive direction only', 'Initiative-level', 'Initiative and workstream', 'Detailed delivery plan'], usedIn: ['Opportunity granularity', 'Estimate depth'] },
      { id: 'existingInitiatives', label: 'Existing initiatives that must be incorporated', type: 'list', usedIn: ['Initiative backlog', 'Dependency mapping', 'Financial baseline'] },
      { id: 'settledDecisions', label: 'Decisions already made that should not be reopened', type: 'list', usedIn: ['Scope guard', 'Assumption register'] },
      { id: 'fixedAssumptions', label: 'Assumptions the team should treat as fixed', type: 'list', usedIn: ['Assumption register', 'Scenario boundaries'] },
      { id: 'challengePermission', label: 'Where does the team have permission to challenge current direction?', type: 'longtext', usedIn: ['Finding framing', 'Recommendation boldness'] },
    ],
  },
  {
    id: 'constraints',
    title: 'Constraints',
    intent: 'Constraints shape sequencing more than ambition does. These feed the roadmap and the financial model directly.',
    questions: [
      { id: 'budgetRange', label: 'Budget range or funding constraint', type: 'text', placeholder: 'e.g. $8–12m over three years, annual approval cycle', usedIn: ['Financial model ceiling', 'Wave funding', 'Scenario constraints'] },
      { id: 'capacityLimits', label: 'Resource and capacity limitations', type: 'longtext', usedIn: ['Sequencing constraints', 'Concurrency limits'] },
      { id: 'timingRequirements', label: 'Required timing or sequencing', type: 'longtext', usedIn: ['Roadmap constraints', 'Dependency creation'] },
      { id: 'technologyConstraints', label: 'Technology constraints', type: 'longtext', usedIn: ['Opportunity feasibility', 'Architecture findings'] },
      { id: 'vendorCommitments', label: 'Vendor or contractual commitments', type: 'list', usedIn: ['Financial baseline', 'Sequencing constraints'] },
      { id: 'regulatory', label: 'Regulatory or compliance requirements', type: 'list', usedIn: ['Risk register', 'Mandatory initiatives'] },
      { id: 'riskTolerance', label: 'Risk tolerance', type: 'select', options: ['Low — protect continuity above all', 'Moderate', 'High — willing to take delivery risk for pace'], usedIn: ['Sequencing aggressiveness', 'Contingency defaults'] },
      { id: 'changeAppetite', label: 'Change appetite', type: 'select', options: ['Low', 'Moderate', 'High'], usedIn: ['Change activity sizing', 'Wave loading'] },
      { id: 'readiness', label: 'Organisational readiness', type: 'longtext', usedIn: ['Change risk', 'Activation planning'] },
      { id: 'dataQuality', label: 'Data availability and quality', type: 'longtext', usedIn: ['Evidence confidence', 'Analytics opportunity sizing'] },
      { id: 'knownDependencies', label: 'Known dependencies', type: 'list', usedIn: ['Dependency register', 'Roadmap sequencing'] },
      { id: 'leadershipBandwidth', label: 'Leadership bandwidth', type: 'longtext', usedIn: ['Governance design', 'Wave loading'] },
      { id: 'competingPrograms', label: 'Competing programmes or transformation fatigue', type: 'longtext', usedIn: ['Change risk', 'Sequencing'] },
    ],
  },
  {
    id: 'stakeholders',
    title: 'Stakeholders and governance',
    intent: 'Populates the interview plan, the governance model, and later the client portal invitations.',
    questions: [
      { id: 'executiveSponsors', label: 'Executive sponsors', type: 'people', usedIn: ['Governance model', 'Decision routing', 'Board narrative'] },
      { id: 'decisionMakers', label: 'Decision-makers', type: 'people', usedIn: ['Decision log', 'Approval rights'] },
      { id: 'businessOwners', label: 'Business and technology owners', type: 'people', usedIn: ['Initiative ownership', 'Business-area views'] },
      { id: 'smes', label: 'Subject-matter experts', type: 'people', usedIn: ['Interview plan', 'Evidence attribution'] },
      { id: 'affectedGroups', label: 'Affected stakeholder groups', type: 'list', usedIn: ['Change impact', 'Communication plan'] },
      { id: 'boardStakeholders', label: 'Board or investor stakeholders', type: 'people', usedIn: ['Board narrative', 'Publishing audience'] },
      { id: 'governanceForums', label: 'Governance forums', type: 'list', usedIn: ['Governance model', 'Decision cadence'] },
      { id: 'approvalRights', label: 'Approval rights', type: 'longtext', usedIn: ['Decision routing', 'Publishing approvals'] },
      { id: 'escalation', label: 'Escalation paths', type: 'longtext', usedIn: ['Governance model'] },
      { id: 'interviewParticipants', label: 'Interview participants', type: 'people', usedIn: ['Interview plan', 'Evidence coverage'] },
      { id: 'influenceSupport', label: 'Stakeholder influence and level of support', type: 'longtext', usedIn: ['Alignment strategy', 'Feedback weighting'] },
      { id: 'resistance', label: 'Known areas of disagreement or resistance', type: 'longtext', usedIn: ['Alignment workshop design', 'Contradiction tracking'] },
    ],
  },
  {
    id: 'hypotheses',
    title: 'Initial hypotheses and known information',
    intent: 'What the team believes before the evidence arrives. Recording it now is what makes it testable later.',
    questions: [
      { id: 'currentBeliefs', label: 'What does the team currently believe to be true?', type: 'list', usedIn: ['Hypothesis register', 'Evidence targeting'] },
      { id: 'toTest', label: 'Which hypotheses must be tested?', type: 'list', usedIn: ['Interview guides', 'Evidence coverage'] },
      { id: 'knownPainPoints', label: 'Known pain points already identified', type: 'list', usedIn: ['Findings', 'Opportunity generation'] },
      { id: 'strengthsToProtect', label: 'Strengths that should be protected', type: 'list', usedIn: ['Findings (strength polarity)', 'Accelerator identification'] },
      { id: 'visibleRisks', label: 'Risks or watch-outs already visible', type: 'list', usedIn: ['Risk register', 'Board narrative'] },
      { id: 'initiativesUnderway', label: 'Initiatives already underway', type: 'list', usedIn: ['Initiative backlog', 'Dependency mapping'] },
      { id: 'missingInformation', label: 'What information is believed to be missing?', type: 'list', usedIn: ['Document requests', 'Evidence gaps'] },
      { id: 'urgentQuestions', label: 'What questions does leadership most urgently need answered?', type: 'list', usedIn: ['Board narrative', 'Executive insights'] },
    ],
  },
];

/* ══════════════════════════════════════ LAYER 3 — phase questionnaires */

export interface PhaseQuestionnaire {
  id: string;
  phase: string;
  weeks: string;
  objective: string;
  sections: QSection[];
}

const q = (id: string, label: string, type: QType, usedIn: string[], help?: string): Question => ({ id, label, type, usedIn, help });

export const PHASE_QUESTIONNAIRES: PhaseQuestionnaire[] = [
  {
    id: 'w0', phase: 'Kickoff and mobilisation', weeks: 'Week 0',
    objective: 'Establish mandate, scope, stakeholders and hypotheses.',
    sections: [{
      id: 'w0a', title: 'Confirmations', intent: 'Confirm what the setup captured, now that the team has met the client.',
      questions: [
        q('w0_mandate', 'Confirm the mandate and scope as understood by both sides', 'longtext', ['Engagement header', 'Board narrative']),
        q('w0_objectives', 'Confirm leadership objectives', 'list', ['Strategic alignment scoring']),
        q('w0_success', 'Confirm success criteria', 'longtext', ['Engagement acceptance']),
        q('w0_stakeholders', 'Confirm stakeholders and the interview plan', 'people', ['Interview plan', 'Evidence coverage']),
        q('w0_governance', 'Governance and decision rights', 'longtext', ['Decision routing', 'Approval workflow']),
        q('w0_initiatives', 'Known initiatives to carry into the backlog', 'list', ['Initiative backlog']),
        q('w0_hypotheses', 'Initial hypotheses to test', 'list', ['Hypothesis register']),
        q('w0_documents', 'Documents still required', 'list', ['Document requests', 'Evidence gaps']),
        q('w0_dimensions', 'Roadmap dimensions — how should the roadmap be organised?', 'longtext', ['Theme definition', 'Swimlanes']),
        q('w0_risks', 'Key engagement risks', 'list', ['Risk register']),
      ],
    }],
  },
  {
    id: 'w12', phase: 'Interviews and fact gathering', weeks: 'Weeks 1–2',
    objective: 'Build a comprehensive understanding of the organisation and its transformation context.',
    sections: [{
      id: 'w12a', title: 'Fact base', intent: 'What the interviews and documents established.',
      questions: [
        q('w12_priorities', 'Stakeholder priorities, and where they disagree', 'longtext', ['Alignment strategy', 'Contradiction register']),
        q('w12_painpoints', 'Business and technology pain points', 'list', ['Findings', 'Opportunity generation']),
        q('w12_commitments', 'Current initiatives and commitments', 'list', ['Initiative backlog', 'Financial baseline']),
        q('w12_landscape', 'Application and architecture landscape', 'longtext', ['Capability assessment', 'Dependency inference']),
        q('w12_opmodel', 'Operating-model gaps', 'longtext', ['Findings', 'Capability assessment']),
        q('w12_spend', 'Budget and technology spend', 'longtext', ['Financial baseline', 'Estimate calibration']),
        q('w12_vendors', 'Vendor relationships', 'list', ['Constraints', 'Financial baseline']),
        q('w12_resources', 'Resource constraints', 'longtext', ['Capacity model', 'Sequencing']),
        q('w12_benchmarks', 'Benchmark needs', 'list', ['Benchmark view']),
        q('w12_coverage', 'Evidence coverage — where is it thin?', 'longtext', ['Confidence scoring', 'Document requests']),
        q('w12_contradictions', 'Contradictions requiring validation', 'list', ['Contradiction register', 'Interview follow-ups']),
        q('w12_missing', 'Missing stakeholders or documents', 'list', ['Interview plan', 'Document requests']),
      ],
    }],
  },
  {
    id: 'w34', phase: 'Current state and prioritisation', weeks: 'Weeks 3–4',
    objective: 'Diagnose where the organisation is today and translate findings into roadmap priorities.',
    sections: [{
      id: 'w34a', title: 'Diagnosis', intent: 'The analytical core of the engagement.',
      questions: [
        q('w34_maturity', 'Capability maturity — where does each area sit today?', 'longtext', ['Maturity assessment', 'Current-state exhibit']),
        q('w34_target', 'Current versus target state', 'longtext', ['Maturity targets', 'Gap calculation']),
        q('w34_rootcause', 'Root causes behind the symptoms', 'longtext', ['Findings', 'Opportunity framing']),
        q('w34_strengths', 'Strengths and gaps', 'longtext', ['Findings (both polarities)', 'Client narrative']),
        q('w34_opportunities', 'Opportunity definitions', 'list', ['Opportunity backlog']),
        q('w34_grouping', 'Initiative grouping logic', 'longtext', ['Initiative structure', 'Theme assignment']),
        q('w34_ownership', 'Business and technology ownership', 'longtext', ['Initiative owners', 'Business-area views']),
        q('w34_financialImpact', 'Financial impact of each opportunity', 'longtext', ['Dimension 1 scoring', 'Financial model']),
        q('w34_riskInaction', 'Risk of inaction', 'longtext', ['Dimension 2 scoring', 'Board narrative']),
        q('w34_alignment', 'Strategic alignment — which objective does each serve?', 'longtext', ['Dimension 3 scoring']),
        q('w34_rationale', 'Scoring rationale', 'longtext', ['Score defensibility', 'Explainability']),
        q('w34_duplicates', 'Duplicate or overlapping opportunities', 'list', ['Merge candidates', 'Rollup accuracy']),
        q('w34_disagreements', 'Priority disagreements', 'longtext', ['Divergence view', 'Alignment workshop']),
      ],
    }],
  },
  {
    id: 'w5', phase: 'Initial roadmap', weeks: 'Week 5',
    objective: 'Turn the diagnosis into the first tangible roadmap.',
    sections: [{
      id: 'w5a', title: 'Sequencing', intent: 'What must come first, and why.',
      questions: [
        q('w5_prerequisites', 'Initiative prerequisites', 'list', ['Dependency register', 'Earliest-start calculation']),
        q('w5_dependencies', 'Dependencies between initiatives', 'list', ['Dependency register', 'Conflict detection']),
        q('w5_effort', 'Effort and duration per initiative', 'longtext', ['T-shirt sizing', 'Duration calculation']),
        q('w5_earliestStart', 'Earliest feasible start dates', 'longtext', ['Roadmap placement']),
        q('w5_logic', 'Sequencing logic — what drives the order?', 'longtext', ['Placement rationale', 'Board narrative']),
        q('w5_deadlines', 'Decision deadlines', 'list', ['Decision log', 'Board asks']),
        q('w5_foundations', 'Foundational capabilities that unblock everything else', 'list', ['Wave 1 composition', 'Dependency register']),
        q('w5_nearVsLong', 'Near-term versus long-term priorities', 'longtext', ['Wave assignment']),
        q('w5_waves', 'Roadmap waves and their target outcomes', 'list', ['Wave definition', 'Client roadmap']),
        q('w5_timingConflicts', 'Timing assumptions and known conflicts', 'longtext', ['Assumption register', 'Conflict detection']),
      ],
    }],
  },
  {
    id: 'w68', phase: 'Financials and capacity', weeks: 'Weeks 6–8',
    objective: 'Pressure-test whether the roadmap is financially and operationally realistic.',
    sections: [{
      id: 'w68a', title: 'Economics', intent: 'Every answer here populates the financial dashboard.',
      questions: [
        q('w68_oneTime', 'One-time cost assumptions', 'longtext', ['Financial model — one-time line']),
        q('w68_recurring', 'Recurring cost assumptions', 'longtext', ['Financial model — recurring line']),
        q('w68_labour', 'Internal and external labour', 'longtext', ['Internal vs external split']),
        q('w68_vendor', 'Vendor and technology spend', 'longtext', ['Financial model — vendor line']),
        q('w68_contingency', 'Contingency approach', 'text', ['Contingency calculation']),
        q('w68_ranges', 'Low, base and high estimate approach', 'longtext', ['Range chart', 'Scenario comparison']),
        q('w68_benefitType', 'Benefit types and timing', 'longtext', ['Value by type', 'Benefit phasing']),
        q('w68_avoidance', 'Cost avoidance', 'longtext', ['Financial model — avoidance line']),
        q('w68_revenue', 'Revenue or growth potential', 'longtext', ['Financial model — revenue line']),
        q('w68_demand', 'Resource demand by role', 'longtext', ['Capacity model']),
        q('w68_capacity', 'Available capacity', 'longtext', ['Capacity model', 'Sequencing constraints']),
        q('w68_funding', 'Funding constraints', 'longtext', ['Wave funding', 'Scenario constraints']),
        q('w68_confidence', 'Estimate confidence and source', 'longtext', ['Confidence indicators', 'Estimate quality view']),
        q('w68_interdependencies', 'Financial interdependencies between initiatives', 'longtext', ['Benefit attribution', 'Double-count checking']),
      ],
    }],
  },
  {
    id: 'w910', phase: 'Business alignment', weeks: 'Weeks 9–10',
    objective: 'Translate the technology roadmap into business outcomes and build leadership alignment.',
    sections: [{
      id: 'w910a', title: 'Alignment', intent: 'What the business said, and what changed as a result.',
      questions: [
        q('w910_priorities', 'Business priorities as stated by the business', 'longtext', ['Divergence view', 'Human ranking']),
        q('w910_rankings', 'Stakeholder rankings', 'longtext', ['Human rank', 'Divergence calculation']),
        q('w910_urgency', 'Urgency as assessed by the business', 'longtext', ['Urgency scoring', 'Wave assignment']),
        q('w910_ownership', 'Agreed ownership', 'longtext', ['Initiative owners']),
        q('w910_depValidation', 'Dependency validation', 'longtext', ['Dependency validation', 'Scheduling']),
        q('w910_timing', 'Timing feedback', 'longtext', ['Roadmap adjustment']),
        q('w910_disagreement', 'Areas of disagreement', 'longtext', ['Divergence view', 'Board narrative']),
        q('w910_readiness', 'Change readiness', 'longtext', ['Change risk', 'Activation plan']),
        q('w910_comms', 'Required communications', 'list', ['Activation plan']),
        q('w910_tradeoffs', 'Decisions and trade-offs', 'list', ['Decision log', 'Board asks']),
        q('w910_changes', 'Proposed roadmap changes', 'list', ['Roadmap V2', 'Change impact']),
      ],
    }],
  },
  {
    id: 'w1012', phase: 'Final roadmap and Board narrative', weeks: 'Weeks 10–12',
    objective: 'Convert the aligned roadmap into an executive-ready decision package.',
    sections: [{
      id: 'w1012a', title: 'Board package', intent: 'What the Board is being asked to approve, and on what basis.',
      questions: [
        q('w1012_sequence', 'Final sequencing', 'longtext', ['Final roadmap version']),
        q('w1012_investment', 'Investment requirement', 'longtext', ['Board investment slide']),
        q('w1012_value', 'Expected value', 'longtext', ['Board value slide']),
        q('w1012_risks', 'Transformation risks', 'list', ['Risk register', 'Board risk slide']),
        q('w1012_governance', 'Governance model for delivery', 'longtext', ['Activation plan', 'Board slide']),
        q('w1012_decisions', 'Executive decisions required', 'list', ['Decision log']),
        q('w1012_asks', 'Board asks', 'list', ['Board asks slide']),
        q('w1012_milestones', 'Critical milestones', 'list', ['Roadmap milestones', 'Activation plan']),
        q('w1012_activation', 'Near-term activation actions', 'list', ['90-day activation plan']),
        q('w1012_assumptions', 'Unresolved assumptions', 'list', ['Assumption register', 'Board caveats']),
        q('w1012_emphasis', 'Narrative emphasis — what must land?', 'longtext', ['Board headline generation']),
        q('w1012_next', 'What leadership must do next', 'longtext', ['Activation plan', 'Closing slide']),
      ],
    }],
  },
];

/* ─────────────────────────────────────── document types requested at intake */

export const DOCUMENT_TYPES = [
  'Strategy document', 'Transformation plan', 'Project and initiative list', 'Application inventory',
  'Architecture materials', 'Budget or financial model', 'Organisation chart', 'Governance documents',
  'Vendor information', 'Prior assessment', 'Interview notes or transcript', 'Survey results',
  'Board or executive presentation',
] as const;

export const totalIntakeQuestions = INTAKE_SECTIONS.reduce((n, s) => n + s.questions.length, 0);
export const totalPhaseQuestions = PHASE_QUESTIONNAIRES.reduce((n, p) => n + p.sections.reduce((m, s) => m + s.questions.length, 0), 0);

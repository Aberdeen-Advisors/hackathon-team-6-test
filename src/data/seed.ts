/**
 * Conductor demo seed data.
 *
 * Fictional client ("Meridian Supply Group"). No real client content.
 * The ANALYTICAL STRUCTURE is faithful to the Aberdeen method:
 *   Theme (sequenced) -> Initiative -> Opportunity (the unit of prioritisation)
 *   Three anchored 1-5 dimensions, weights 0.40 / 0.35 / 0.25
 *   Bands at 4.50 / 3.75 / 2.80 ; quadrant thresholds 3.5 / 3.5
 *   CMMI v2.0 five-level maturity with per-capability target and calculated gap
 *
 * Scores are deliberately spread so all four quadrants are populated, and
 * OPP-014 is deliberately missing a dimension so the "Not yet scored" state demos.
 *
 * Location: src/data/seed.ts
 */

// ============================================================ types

export type Level = 1 | 2 | 3 | 4 | 5;

export interface Anchor {
  level: Level;
  label: string;
  description: string;
}

export interface Dimension {
  key: 'financial_impact' | 'risk_if_deferred' | 'strategic_alignment';
  name: string;
  weight: number;
  prompt: string;
  anchors: Anchor[];
}

export interface DimensionScore {
  dimensionKey: Dimension['key'];
  level: Level | null;
  rationale: string;
  source: 'human' | 'ai';
  evidenceIds: string[];
}

export interface Opportunity {
  id: string;
  initiativeId: string;
  title: string;
  description: string;
  recommendedAction: string;
  soWhat: string;
  technologyFunctionId: string;
  businessArea: string;
  tshirtSize: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | null;
  investmentType: 'defensive' | 'multiplier' | 'ceiling_remover' | null;
  objectiveIds: string[];
  capabilityIds: string[];
  evidenceIds: string[];
  scores: DimensionScore[];
  humanRank: number | null;
  humanRankRationale: string | null;
  published: boolean;
}

// ============================================================ priority model

export const PRIORITY_MODEL = {
  bands: { critical: 4.5, high: 3.75, medium: 2.8 },
  bandLabels: {
    critical: 'Critical',
    high: 'High Priority',
    medium: 'Medium Priority',
    lower: 'Lower Priority',
  },
  quadrantThresholdX: 3.5,
  quadrantThresholdY: 3.5,
  quadrantLabels: {
    actNow: 'Act Now',
    defend: 'Defend',
    planFund: 'Plan & Fund',
    sequenceLater: 'Sequence Later',
  },
  valueAxisKeys: ['financial_impact', 'strategic_alignment'] as const,
  urgencyAxisKey: 'risk_if_deferred' as const,
  methodologyNote:
    "Anchored to Gartner's IT value dimensions and consistent with SAFe's Weighted Shortest Job First (WSJF) sequencing methodology.",
};

export const DIMENSIONS: Dimension[] = [
  {
    key: 'financial_impact',
    name: 'Growth / Revenue Impact',
    weight: 0.4,
    prompt:
      'Revenue unlocked, cost saved, or margin recovered. Covers both the upside of acting and the financial cost of not acting. What is the dollar consequence either way?',
    anchors: [
      { level: 5, label: 'Transformational', description: 'Directly enables a new revenue stream, recovers major margin, or eliminates a financial liability that compounds annually. Material at board level.' },
      { level: 4, label: 'Material', description: 'Meaningful revenue growth, cost reduction, or margin improvement. Quantifiable and significant at the operational level. Named systems or processes must be cited.' },
      { level: 3, label: 'Moderate', description: 'Efficiency gains, FTE time savings, or cost avoidance that are real but hard to isolate to a single figure. Removing a bottleneck that slows value-generating work counts here.' },
      { level: 2, label: 'Indirect', description: 'Enables other initiatives with higher financial impact but produces no direct outcome itself. Requires two or more dependent steps before impact materialises.' },
      { level: 1, label: 'Hygiene', description: 'Good practice with negligible direct financial consequence either way. Would not change the investment decision if absent from the analysis.' },
    ],
  },
  {
    key: 'risk_if_deferred',
    name: 'Operational Risk if Not Done',
    weight: 0.35,
    prompt:
      'Not how fragile the system is — what actually happens if this gap persists. If we defer this for 12 months, what breaks and what does it cost?',
    anchors: [
      { level: 5, label: 'Existential', description: 'Inaction creates a risk that, if realised, halts operations, triggers a regulatory event, or causes financial harm that cannot be absorbed.' },
      { level: 4, label: 'Severe', description: 'Deferral creates material operational disruption, significant customer impact, or a compounding liability that grows meaningfully each quarter. Recoverable but visible.' },
      { level: 3, label: 'Compounding', description: 'The cost of deferral increases over time. Not a crisis today, but each quarter of inaction makes the eventual fix harder and more expensive.' },
      { level: 2, label: 'Latent', description: 'Risk exists but is not actively accumulating. Could surface as a blocker when a related programme goes live, but workarounds are sustainable.' },
      { level: 1, label: 'Negligible', description: 'Deferral has no meaningful organisational consequence for two or more years. The gap is inconvenient, not risky.' },
    ],
  },
  {
    key: 'strategic_alignment',
    name: 'Alignment to Business Strategy',
    weight: 0.25,
    prompt:
      'How directly does this serve a named business goal? Scored on traceability — can you draw a direct line to a specific goal without explanation?',
    anchors: [
      { level: 5, label: 'Named explicitly', description: 'Called out by name, or is the direct enabling action for a goal stated in the strategy document. Removing it would visibly undermine a stated goal. No inferential leap required.' },
      { level: 4, label: 'Direct enabler', description: 'Directly enables a named goal even if not mentioned by name. The connection is single-step and obvious to any business leader reading the strategy.' },
      { level: 3, label: 'Foundational dependency', description: 'A prerequisite to a direct enabler. Without it, a higher-scoring initiative cannot be delivered. Requires a two-step explanation.' },
      { level: 2, label: 'Thematic fit', description: 'Fits the spirit of the strategy but requires explanation to connect it to a specific goal. A reasonable board member would accept it, but it is not self-evident.' },
      { level: 1, label: 'Not traceable', description: 'Good practice with no direct or foundational connection to a named goal. Would not appear in a board investment narrative.' },
    ],
  },
];

// ============================================================ effort scale

export const EFFORT_SCALE = [
  { key: 'XS',  effort: 'Single team, well-defined',           minMonths: 1,  maxMonths: 3,  risk: 'Low — proven technology, no legacy touch' },
  { key: 'S',   effort: '1–2 teams, some integration',         minMonths: 3,  maxMonths: 6,  risk: 'Low–Medium' },
  { key: 'M',   effort: 'Multi-team, moderate legacy',         minMonths: 6,  maxMonths: 12, risk: 'Medium — some integration complexity' },
  { key: 'L',   effort: 'Cross-functional, significant legacy', minMonths: 12, maxMonths: 24, risk: 'Medium–High' },
  { key: 'XL',  effort: 'Enterprise-wide, deep legacy',        minMonths: 24, maxMonths: 36, risk: 'High — core platform touch, organisational change' },
  { key: 'XXL', effort: 'Multi-year transformation programme', minMonths: 36, maxMonths: 60, risk: 'Very High — existential dependency' },
] as const;

// ============================================================ maturity framework

export const MATURITY_FRAMEWORK = {
  name: 'CMMI v2.0',
  evaluationMethod: 'SCAMPI C (Informal Appraisal)',
  calibration: 'Calibrated to Gartner IT Score maturity descriptors',
  disclaimer:
    'This assessment uses an informal SCAMPI C evaluation — the lightest-weight appraisal method under CMMI. Scores reflect evidence gathered through structured interviews and documentation review. They represent Aberdeen Advisors’ independent judgment, not a formal certification.',
  levels: [
    { level: 1, label: 'Initial',                  description: 'Processes are ad hoc and unpredictable. Success depends on individual effort rather than repeatable practice. When a key person is unavailable, the process breaks.' },
    { level: 2, label: 'Managed',                  description: 'Processes are planned and tracked at project level. Standards are not yet applied consistently across the organisation; improvements are person-dependent.' },
    { level: 3, label: 'Defined',                  description: 'Standard processes are documented, consistently applied, and adapted from a common framework. A new team member can follow the process without tribal knowledge.' },
    { level: 4, label: 'Quantitatively Managed',   description: 'Processes are controlled using quantitative techniques. Performance is predictable and leadership has fact-based visibility into execution quality.' },
    { level: 5, label: 'Optimizing',               description: 'The organisation continuously improves based on quantitative understanding of performance. Processes self-correct based on data.' },
  ],
};

// ============================================================ objectives

export const OBJECTIVES = [
  { id: 'OBJ-001', title: 'Grow revenue in the core channel',        source: 'client_strategy' },
  { id: 'OBJ-002', title: 'Exceed profit target',                    source: 'client_strategy' },
  { id: 'OBJ-003', title: 'Clarify the five-year technology plan',   source: 'executive_stated' },
  { id: 'OBJ-004', title: 'Improve inventory turns',                 source: 'client_strategy' },
  { id: 'OBJ-005', title: 'Reduce operational risk exposure',        source: 'technology_org' },
];

// ============================================================ technology functions + capabilities

export const TECHNOLOGY_FUNCTIONS = [
  { id: 'TF-01', name: 'Core Operations & Fulfilment',      sequence: 1 },
  { id: 'TF-02', name: 'Data Architecture & Governance',    sequence: 2 },
  { id: 'TF-03', name: 'Infrastructure, Network & Security', sequence: 3 },
  { id: 'TF-04', name: 'Digital Commerce',                  sequence: 4 },
  { id: 'TF-05', name: 'Organisational Enablement',         sequence: 5 },
];

export const CAPABILITIES = [
  { id: 'CAP-01', functionId: 'TF-01', name: 'Core Platform & Legacy Systems', current: 1, target: 3, rationale: 'Stable in operation but dependent on a single specialist with no documented runbooks or succession plan. Scored 1: success depends on individual effort.', evidenceIds: ['EV-001', 'EV-002'], priorityToFix: 'Critical' },
  { id: 'CAP-02', functionId: 'TF-01', name: 'ERP Programme',                  current: 2, target: 4, rationale: 'Phase 1 live for finance only; order processing remains on the legacy platform. No published multi-wave roadmap. Managed execution within a project, not across the organisation.', evidenceIds: ['EV-003'], priorityToFix: 'High' },
  { id: 'CAP-03', functionId: 'TF-01', name: 'Integration Architecture',       current: 1, target: 3, rationale: 'Predominantly batch file transfer. No enterprise integration inventory, no monitoring, no consistent error handling. Cannot support the real-time requirements of two imminent go-lives.', evidenceIds: ['EV-004', 'EV-005'], priorityToFix: 'Critical' },
  { id: 'CAP-04', functionId: 'TF-01', name: 'Warehouse & Distribution',       current: 2, target: 4, rationale: 'Operations run well on ageing hardware. No transport management system; planning runs on spreadsheets. One modern reference site exists.', evidenceIds: ['EV-006'], priorityToFix: 'High' },
  { id: 'CAP-05', functionId: 'TF-02', name: 'Master Data Management',         current: 2, target: 4, rationale: 'Three separate product data instances with no single source of truth. Architecture is planned but not operational; current state is manually managed.', evidenceIds: ['EV-007', 'EV-008'], priorityToFix: 'Critical' },
  { id: 'CAP-06', functionId: 'TF-02', name: 'Analytics & BI',                 current: 1, target: 4, rationale: 'Warehouse platform licensed but underutilised following team turnover. Competing versions of the truth across two reporting stacks. No defined data platform strategy.', evidenceIds: ['EV-009'], priorityToFix: 'Critical' },
  { id: 'CAP-07', functionId: 'TF-02', name: 'Data Governance',                current: 1, target: 4, rationale: 'No enterprise data classification, no loss-prevention policy, no governance function spanning the data lifecycle.', evidenceIds: ['EV-010'], priorityToFix: 'Critical' },
  { id: 'CAP-08', functionId: 'TF-03', name: 'Identity & Access Management',   current: 1, target: 3, rationale: 'No centralised identity capability. Fragmented identities across platforms with no single sign-on. Modernisation approved but not delivered — a critical-path prerequisite for two funded programmes.', evidenceIds: ['EV-011'], priorityToFix: 'High' },
  { id: 'CAP-09', functionId: 'TF-03', name: 'Security & Risk',                current: 2, target: 3, rationale: 'Tooling is deployed and capable, but policies are not consistently enforced, the incident response plan is untested, and there is no executive risk governance forum.', evidenceIds: ['EV-012', 'EV-013'], priorityToFix: 'Critical' },
  { id: 'CAP-10', functionId: 'TF-04', name: 'Digital Commerce Platform',      current: 2, target: 4, rationale: 'Functional but running on a monolithic architecture that limits scalability. Re-architecture defined but funded annually against a multi-year programme.', evidenceIds: ['EV-014'], priorityToFix: 'High' },
  { id: 'CAP-11', functionId: 'TF-05', name: 'IT Governance & Portfolio',      current: 2, target: 3, rationale: 'Annual budget cycle is the sole prioritisation mechanism. No intake process, no portfolio governance, no resource protection model. Resource contention named as the primary delivery barrier.', evidenceIds: ['EV-015', 'EV-016'], priorityToFix: 'Critical' },
  { id: 'CAP-12', functionId: 'TF-05', name: 'Enterprise Architecture',        current: 1, target: 3, rationale: 'No active EA function. No unified architecture view across legacy, cloud and SaaS. Technology decisions are made domain-by-domain.', evidenceIds: ['EV-017'], priorityToFix: 'High' },
];

// ============================================================ evidence

export const EVIDENCE = [
  { id: 'EV-001', excerpt: 'Core platform has been in operation for over 30 years. A single systems programmer is confirmed as the sole operating-system resource.', type: 'fact',   source: 'Infrastructure deep-dive, week 2',  location: 'Interview notes, p.3' },
  { id: 'EV-002', excerpt: 'No runbooks documented. No succession plan. No active migration plan exists.',                                                          type: 'risk',   source: 'Infrastructure deep-dive, week 2',  location: 'Interview notes, p.4' },
  { id: 'EV-003', excerpt: 'General ledger is live. Downstream sequencing for transport and planning modules is undefined.',                                        type: 'fact',   source: 'ERP programme review',              location: 'Programme status pack, slide 6' },
  { id: 'EV-004', excerpt: 'Four integration technologies in concurrent use with no inventory, no monitoring and no consistent error handling.',                    type: 'fact',   source: 'Architecture review',               location: 'Architecture workbook, Integrations!B12' },
  { id: 'EV-005', excerpt: 'Batch file model cannot support the real-time requirements of the two go-lives scheduled this year.',                                   type: 'risk',   source: 'Architecture review',               location: 'Architecture workbook, Integrations!B31' },
  { id: 'EV-006', excerpt: 'Automation deployed at one site is operating at 73% of its pick-rate target; root cause unresolved.',                                   type: 'metric', source: 'Distribution site visit',           location: 'Site visit notes, p.2' },
  { id: 'EV-007', excerpt: 'Three product data instances serve different purposes with no single source of truth. Errors cascade into pricing and commerce.',       type: 'fact',   source: 'Master data workshop',              location: 'Workshop output, board 2' },
  { id: 'EV-008', excerpt: 'Supplier onboarding is manual and spreadsheet-based. Six-domain scope confirmed as larger than previously assessed.',                   type: 'fact',   source: 'Master data workshop',              location: 'Workshop output, board 3' },
  { id: 'EV-009', excerpt: 'Near-complete turnover on both reporting teams confirmed. Platform ownership is split across two organisations.',                       type: 'fact',   source: 'Analytics leadership interview',    location: 'Interview notes, p.1' },
  { id: 'EV-010', excerpt: 'No data governance programme. No data classification. No loss-prevention policy.',                                                     type: 'risk',   source: 'Data governance assessment',        location: 'Assessment workbook, Governance!C8' },
  { id: 'EV-011', excerpt: 'Identity modernisation is documented as a critical-path prerequisite for the supplier portal and commerce unification.',                type: 'constraint', source: 'Executive strategy session',    location: 'Session notes, p.5' },
  { id: 'EV-012', excerpt: 'Three full-time staff plus one intern manage approximately 3,500–4,000 assets.',                                                       type: 'metric', source: 'Security function review',          location: 'Interview notes, p.2' },
  { id: 'EV-013', excerpt: 'Incident response plan is neither approved nor tested. No formal risk remediation accountability.',                                    type: 'risk',   source: 'Security function review',          location: 'Interview notes, p.6' },
  { id: 'EV-014', excerpt: 'Three-year re-architecture is under way against an annual budget cycle, creating compounding funding shortfalls.',                      type: 'constraint', source: 'Digital platform review',       location: 'Programme pack, slide 11' },
  { id: 'EV-015', excerpt: 'Three senior technology leaders independently identified resource contention as the single greatest barrier to delivery.',              type: 'opinion', source: 'Executive strategy session',       location: 'Session notes, p.2' },
  { id: 'EV-016', excerpt: 'Annual budget cycle is the sole prioritisation mechanism. No formal intake process exists.',                                           type: 'fact',   source: 'Executive strategy session',        location: 'Session notes, p.3' },
  { id: 'EV-017', excerpt: 'No internal enterprise architecture staff. Prior roadmap produced by an external party was not implemented.',                           type: 'fact',   source: 'Architecture review',               location: 'Interview notes, p.1' },
  { id: 'EV-018', excerpt: 'Thirteen open technology roles confirmed, including two director-level vacancies.',                                                    type: 'metric', source: 'Organisation review',               location: 'Org workbook, Roles!D4' },
];

// ============================================================ themes + initiatives

export const THEMES = [
  { id: 'TH-1', sequence: 1, name: 'Stabilise the Core',            colour: '#DB504A', strategicQuestion: 'What could stop the business, and what are we doing about it?' },
  { id: 'TH-2', sequence: 2, name: 'Protect Committed Investments', colour: '#F7D002', strategicQuestion: 'How do we get full value from what is already funded?' },
  { id: 'TH-3', sequence: 3, name: 'Grow the Top Line',             colour: '#5CC8FF', strategicQuestion: 'Which investments put revenue in reach?' },
  { id: 'TH-4', sequence: 4, name: 'Build the Intelligent Enterprise', colour: '#00A676', strategicQuestion: 'How do we move from collecting data to competing on it?' },
];

export const INITIATIVES = [
  { id: 'INI-01', themeId: 'TH-1', name: 'Core Platform Continuity',        owner: 'VP Infrastructure',        businessArea: 'Operations',   tshirtSize: 'L'  },
  { id: 'INI-02', themeId: 'TH-1', name: 'Security Governance & Risk',      owner: 'Director, Security',       businessArea: 'Corporate',    tshirtSize: 'M'  },
  { id: 'INI-03', themeId: 'TH-1', name: 'Integration Rationalisation',     owner: 'VP Architecture',          businessArea: 'Technology',   tshirtSize: 'M'  },
  { id: 'INI-04', themeId: 'TH-2', name: 'ERP Programme Sequencing',        owner: 'VP Enterprise Apps',       businessArea: 'Finance',      tshirtSize: 'XL' },
  { id: 'INI-05', themeId: 'TH-2', name: 'Technology Operating Model',      owner: 'CDIO',                     businessArea: 'Technology',   tshirtSize: 'M'  },
  { id: 'INI-06', themeId: 'TH-3', name: 'Commerce Platform Consolidation', owner: 'VP Digital',               businessArea: 'Commercial',   tshirtSize: 'L'  },
  { id: 'INI-07', themeId: 'TH-4', name: 'Master Data Foundation',          owner: 'Director, Data',           businessArea: 'Operations',   tshirtSize: 'L'  },
  { id: 'INI-08', themeId: 'TH-4', name: 'Analytics Activation',            owner: 'Director, Data',           businessArea: 'Commercial',   tshirtSize: 'M'  },
];

// ============================================================ opportunities

const s = (
  dimensionKey: Dimension['key'],
  level: Level | null,
  rationale: string,
  evidenceIds: string[] = [],
  source: 'human' | 'ai' = 'human',
): DimensionScore => ({ dimensionKey, level, rationale, source, evidenceIds });

export const OPPORTUNITIES: Opportunity[] = [
  {
    id: 'OPP-001', initiativeId: 'INI-01',
    title: 'Core Platform Business Continuity',
    description: 'Remove the single-person dependency on the platform that processes every order, shipment and invoice.',
    recommendedAction: 'Document runbooks and business logic, establish cross-training, and define a succession plan within two quarters.',
    soWhat: 'If the sole specialist became unavailable, the business could not receive, stock, pick, ship or bill. This is the highest-severity single point of failure in the organisation.',
    technologyFunctionId: 'TF-01', businessArea: 'Operations', tshirtSize: 'M', investmentType: 'defensive',
    objectiveIds: ['OBJ-005'], capabilityIds: ['CAP-01'], evidenceIds: ['EV-001', 'EV-002'],
    scores: [
      s('financial_impact', 5, 'A halt to fulfilment operations would eliminate revenue across every distribution site simultaneously.', ['EV-001']),
      s('risk_if_deferred', 5, 'Inaction risks a total operational stop with no recovery path inside a normal quarter.', ['EV-002']),
      s('strategic_alignment', 5, 'Named directly in the risk reduction goal as a foundational action.', ['EV-002']),
    ],
    humanRank: 1, humanRankRationale: null, published: true,
  },
  {
    id: 'OPP-002', initiativeId: 'INI-01',
    title: 'Platform Documentation & Change Control',
    description: 'Establish documented business logic and a controlled change process for the core platform.',
    recommendedAction: 'Build a documented inventory of embedded business logic and gate all changes through a formal review.',
    soWhat: 'Any change to core platform code carries risk disproportionate to the change itself, which blocks safe modernisation.',
    technologyFunctionId: 'TF-01', businessArea: 'Operations', tshirtSize: 'M', investmentType: 'ceiling_remover',
    objectiveIds: ['OBJ-003', 'OBJ-005'], capabilityIds: ['CAP-01'], evidenceIds: ['EV-002'],
    scores: [
      s('financial_impact', 3, 'Reduces rework and incident cost, but the saving is diffuse and hard to isolate.', ['EV-002']),
      s('risk_if_deferred', 4, 'Each quarter of undocumented change makes eventual modernisation materially more expensive.', ['EV-002']),
      s('strategic_alignment', 4, 'Directly enables the five-year plan goal even though not named in it.', []),
    ],
    humanRank: null, humanRankRationale: null, published: true,
  },
  {
    id: 'OPP-003', initiativeId: 'INI-02',
    title: 'Security Remediation Programme',
    description: 'Close documented security findings that have persisted without resolution.',
    recommendedAction: 'Fund a dedicated risk manager and establish a risk governance committee with executive membership and service levels.',
    soWhat: 'Documented risks persist for years with no owner. The function is structurally under-resourced relative to the asset estate.',
    technologyFunctionId: 'TF-03', businessArea: 'Corporate', tshirtSize: 'M', investmentType: 'defensive',
    objectiveIds: ['OBJ-005'], capabilityIds: ['CAP-09'], evidenceIds: ['EV-012', 'EV-013'],
    scores: [
      s('financial_impact', 2, 'Preventative value. No direct revenue or margin outcome, but avoids a low-probability, high-cost event.', ['EV-013']),
      s('risk_if_deferred', 5, 'An untested incident response plan against a known prior incident pattern is an existential exposure.', ['EV-013']),
      s('strategic_alignment', 3, 'A prerequisite to the risk reduction goal rather than a direct enabler of it.', []),
    ],
    humanRank: 4, humanRankRationale: 'Leadership escalated this above its computed rank following the alignment workshop.', published: true,
  },
  {
    id: 'OPP-004', initiativeId: 'INI-02',
    title: 'Incident Response Plan Test & Approval',
    description: 'Approve and exercise the incident response plan with executive sign-off.',
    recommendedAction: 'Run a tabletop exercise this quarter and secure formal executive approval of the escalation framework.',
    soWhat: 'An untested plan is an assumption, not a control.',
    technologyFunctionId: 'TF-03', businessArea: 'Corporate', tshirtSize: 'XS', investmentType: 'defensive',
    objectiveIds: ['OBJ-005'], capabilityIds: ['CAP-09'], evidenceIds: ['EV-013'],
    scores: [
      s('financial_impact', 2, 'No direct financial outcome; reduces the cost of an incident should one occur.', []),
      s('risk_if_deferred', 4, 'Deferral leaves a material, visible control gap that grows with the asset estate.', ['EV-013']),
      s('strategic_alignment', 2, 'Fits the spirit of risk reduction but requires explanation to connect to a named goal.', []),
    ],
    humanRank: null, humanRankRationale: null, published: true,
  },
  {
    id: 'OPP-005', initiativeId: 'INI-03',
    title: 'Integration Inventory & Rationalisation',
    description: 'Build a complete integration inventory and rationalise to a single enterprise standard.',
    recommendedAction: 'Complete the integration inventory, rationalise to one platform standard, and implement monitoring and contract testing before the next go-live.',
    soWhat: 'Integration failures are invisible until downstream systems break. Two major programmes are about to collide in the same integration layer.',
    technologyFunctionId: 'TF-01', businessArea: 'Technology', tshirtSize: 'M', investmentType: 'ceiling_remover',
    objectiveIds: ['OBJ-003', 'OBJ-004'], capabilityIds: ['CAP-03'], evidenceIds: ['EV-004', 'EV-005'],
    scores: [
      s('financial_impact', 3, 'Eliminates recurring manual troubleshooting and frees engineering capacity currently spent firefighting.', ['EV-004']),
      s('risk_if_deferred', 4, 'Two funded go-lives depend on real-time integration the current model cannot support.', ['EV-005']),
      s('strategic_alignment', 3, 'Does not itself achieve a named goal, but without it the ERP sequencing that does cannot be safely planned.', []),
    ],
    humanRank: null, humanRankRationale: null, published: true,
  },
  {
    id: 'OPP-006', initiativeId: 'INI-03',
    title: 'Event-Driven Target Architecture',
    description: 'Define the target-state integration architecture ahead of the major programme go-lives.',
    recommendedAction: 'Publish a target-state event-driven architecture and gate new integrations against it.',
    soWhat: 'Without a defined target, each programme makes independent integration choices that compound into debt.',
    technologyFunctionId: 'TF-01', businessArea: 'Technology', tshirtSize: 'S', investmentType: 'ceiling_remover',
    objectiveIds: ['OBJ-003'], capabilityIds: ['CAP-03', 'CAP-12'], evidenceIds: ['EV-004'],
    scores: [
      s('financial_impact', 2, 'Enables higher-impact initiatives but produces no direct financial outcome itself.', []),
      s('risk_if_deferred', 3, 'Integration debt accumulates at a predictable rate with each unguided programme decision.', ['EV-004']),
      s('strategic_alignment', 3, 'A prerequisite to the platform modernisation that serves the five-year plan.', []),
    ],
    humanRank: null, humanRankRationale: null, published: false,
  },
  {
    id: 'OPP-007', initiativeId: 'INI-04',
    title: 'ERP Multi-Wave Roadmap',
    description: 'Publish the sequenced multi-wave plan for the ERP programme beyond the current phase.',
    recommendedAction: 'Publish the multi-wave roadmap with defined scope, sequencing and dependencies before phase two design begins.',
    soWhat: 'Without a clear roadmap, every downstream programme is sequenced on assumption. Programmes will conflict or stall.',
    technologyFunctionId: 'TF-01', businessArea: 'Finance', tshirtSize: 'S', investmentType: 'multiplier',
    objectiveIds: ['OBJ-002', 'OBJ-003'], capabilityIds: ['CAP-02'], evidenceIds: ['EV-003'],
    scores: [
      s('financial_impact', 4, 'Protects a committed multi-year investment from sequencing failure and rework.', ['EV-003']),
      s('risk_if_deferred', 4, 'Deferral compounds each quarter as dependent programmes commit to conflicting assumptions.', ['EV-003']),
      s('strategic_alignment', 5, 'Named explicitly in the five-year plan as a foundational programme.', ['EV-003']),
    ],
    humanRank: 2, humanRankRationale: null, published: true,
  },
  {
    id: 'OPP-008', initiativeId: 'INI-04',
    title: 'Order Processing Migration Scope',
    description: 'Define scope and sequencing for migrating order processing off the legacy platform.',
    recommendedAction: 'Scope the order-processing migration and sequence it against the platform continuity work.',
    soWhat: 'The fragmented operating model persists while orders remain on the legacy platform.',
    technologyFunctionId: 'TF-01', businessArea: 'Operations', tshirtSize: 'XL', investmentType: 'ceiling_remover',
    objectiveIds: ['OBJ-002', 'OBJ-004'], capabilityIds: ['CAP-02', 'CAP-01'], evidenceIds: ['EV-003'],
    scores: [
      s('financial_impact', 4, 'Removes a known recurring reconciliation cost and unlocks process standardisation.', ['EV-003']),
      s('risk_if_deferred', 2, 'Risk exists but is not actively accumulating; current operations are stable.', []),
      s('strategic_alignment', 4, 'Directly enables the profit target through operating model simplification.', []),
    ],
    humanRank: null, humanRankRationale: null, published: true,
  },
  {
    id: 'OPP-009', initiativeId: 'INI-05',
    title: 'Portfolio Governance & Intake',
    description: 'Establish a formal intake and portfolio governance process with resource protection.',
    recommendedAction: 'Establish a continuous intake process, portfolio governance forum, and a resource demand and protection model.',
    soWhat: 'The annual budget cycle is the only prioritisation mechanism. Unvetted technology creates security exposure and integration debt that technology inherits.',
    technologyFunctionId: 'TF-05', businessArea: 'Technology', tshirtSize: 'M', investmentType: 'multiplier',
    objectiveIds: ['OBJ-003', 'OBJ-005'], capabilityIds: ['CAP-11'], evidenceIds: ['EV-015', 'EV-016'],
    scores: [
      s('financial_impact', 3, 'Prevents future unplanned spend and recovers capacity lost to contention, but the benefit is diffuse.', ['EV-015']),
      s('risk_if_deferred', 4, 'Resource contention is the named primary barrier to every funded programme.', ['EV-015']),
      s('strategic_alignment', 4, 'Directly enables the five-year plan by making sequencing decisions possible at all.', ['EV-016']),
    ],
    humanRank: 3, humanRankRationale: 'The room ranked this materially higher than the model — leadership view is that nothing else moves until intake is fixed.', published: true,
  },
  {
    id: 'OPP-010', initiativeId: 'INI-05',
    title: 'Enterprise Architecture Function',
    description: 'Stand up an internal enterprise architecture function with a governing architecture view.',
    recommendedAction: 'Establish an internal EA function, define target-state architecture, and mature the architecture review board.',
    soWhat: 'Technology decisions made domain-by-domain without a governing view create conflicting systems and compounding integration debt.',
    technologyFunctionId: 'TF-05', businessArea: 'Technology', tshirtSize: 'M', investmentType: 'multiplier',
    objectiveIds: ['OBJ-003'], capabilityIds: ['CAP-12'], evidenceIds: ['EV-017'],
    scores: [
      s('financial_impact', 2, 'Preventative and diffuse; avoids future rework rather than producing a direct outcome.', []),
      s('risk_if_deferred', 3, 'Architecture debt accumulates at a predictable rate with each ungoverned decision.', ['EV-017']),
      s('strategic_alignment', 4, 'Directly enables the five-year plan goal.', []),
    ],
    humanRank: null, humanRankRationale: null, published: true,
  },
  {
    id: 'OPP-011', initiativeId: 'INI-06',
    title: 'Commerce Platform Decision',
    description: 'Resolve the parallel commerce platform question and commit funding to the selected path.',
    recommendedAction: 'Make the platform decision this half and fund the selected platform on a multi-year basis.',
    soWhat: 'Two platforms in feature freeze means no commerce capability is improving while competitors invest.',
    technologyFunctionId: 'TF-04', businessArea: 'Commercial', tshirtSize: 'L', investmentType: 'ceiling_remover',
    objectiveIds: ['OBJ-001'], capabilityIds: ['CAP-10'], evidenceIds: ['EV-014'],
    scores: [
      s('financial_impact', 5, 'Directly enables a new revenue channel at scale and ends duplicated platform spend.', ['EV-014']),
      s('risk_if_deferred', 4, 'Each quarter of deferral extends a freeze on the most visible growth lever.', ['EV-014']),
      s('strategic_alignment', 5, 'Named explicitly in the revenue growth goal.', ['EV-014']),
    ],
    humanRank: 5, humanRankRationale: null, published: true,
  },
  {
    id: 'OPP-012', initiativeId: 'INI-06',
    title: 'Multi-Year Digital Funding Model',
    description: 'Replace the annual funding cycle for the digital platform with a committed multi-year budget.',
    recommendedAction: 'Establish a multi-year digital platform budget with milestone-based release.',
    soWhat: 'An annual cycle against a three-year programme creates funding shortfalls that compound. The re-architecture will take five years at current funding.',
    technologyFunctionId: 'TF-04', businessArea: 'Commercial', tshirtSize: 'XS', investmentType: 'multiplier',
    objectiveIds: ['OBJ-001', 'OBJ-003'], capabilityIds: ['CAP-10'], evidenceIds: ['EV-014'],
    scores: [
      s('financial_impact', 4, 'Removes a known annual delivery loss caused by funding discontinuity.', ['EV-014']),
      s('risk_if_deferred', 3, 'The shortfall compounds predictably each budget year.', ['EV-014']),
      s('strategic_alignment', 4, 'Directly enables the revenue growth goal by making the programme deliverable.', []),
    ],
    humanRank: null, humanRankRationale: null, published: false,
  },
  {
    id: 'OPP-013', initiativeId: 'INI-07',
    title: 'Master Data Consolidation',
    description: 'Consolidate to a single master data platform and establish a governed golden record.',
    recommendedAction: 'Consolidate to one platform, shift the golden record off the legacy system, and automate supplier onboarding.',
    soWhat: 'Three sources of truth create inconsistency across every downstream channel and slow new product time-to-market.',
    technologyFunctionId: 'TF-02', businessArea: 'Operations', tshirtSize: 'L', investmentType: 'ceiling_remover',
    objectiveIds: ['OBJ-001', 'OBJ-003'], capabilityIds: ['CAP-05'], evidenceIds: ['EV-007', 'EV-008'],
    scores: [
      s('financial_impact', 5, 'Unlocks a new data-driven service line and removes recurring manual reconciliation cost.', ['EV-007']),
      s('risk_if_deferred', 4, 'Data inconsistency compounds into every channel each quarter it persists.', ['EV-007']),
      s('strategic_alignment', 5, 'Named explicitly as the master data harmonisation goal.', ['EV-008']),
    ],
    humanRank: 6, humanRankRationale: null, published: true,
  },
  {
    id: 'OPP-014', initiativeId: 'INI-07',
    title: 'Supplier Data Onboarding Automation',
    description: 'Automate supplier data capture at source rather than reconciling downstream.',
    recommendedAction: 'Define an interim supplier data intake standard and automate capture at source.',
    soWhat: 'Manual onboarding is the rate limiter on new product availability.',
    technologyFunctionId: 'TF-02', businessArea: 'Operations', tshirtSize: 'M', investmentType: 'multiplier',
    objectiveIds: ['OBJ-001'], capabilityIds: ['CAP-05'], evidenceIds: ['EV-008'],
    scores: [
      s('financial_impact', 4, 'Compresses time-to-market for new products, directly affecting sellable range.', ['EV-008']),
      s('risk_if_deferred', null, '', []),
      s('strategic_alignment', 3, 'A prerequisite to the master data consolidation that serves the named goal.', []),
    ],
    humanRank: null, humanRankRationale: null, published: false,
  },
  {
    id: 'OPP-015', initiativeId: 'INI-08',
    title: 'Analytics Platform Activation',
    description: 'Resolve ownership and activate the licensed but underused analytics platform.',
    recommendedAction: 'Approve a minimum viable team model, resolve platform ownership between the two organisations, and define a structured activation plan.',
    soWhat: 'The platform is already paid for. The gap is organisational, not technical — and approving the team model unblocks four dependent initiatives.',
    technologyFunctionId: 'TF-02', businessArea: 'Commercial', tshirtSize: 'M', investmentType: 'multiplier',
    objectiveIds: ['OBJ-001', 'OBJ-002'], capabilityIds: ['CAP-06'], evidenceIds: ['EV-009'],
    scores: [
      s('financial_impact', 5, 'Activates a paid-for asset and unlocks the analytics capability underpinning two revenue goals.', ['EV-009']),
      s('risk_if_deferred', 4, 'Competing versions of the truth are already driving inconsistent commercial decisions.', ['EV-009']),
      s('strategic_alignment', 5, 'Named explicitly across both revenue and profit goals.', []),
    ],
    humanRank: null, humanRankRationale: null, published: true,
  },
  {
    id: 'OPP-016', initiativeId: 'INI-08',
    title: 'Data Governance Function',
    description: 'Establish an enterprise data governance function with classification and lifecycle policy.',
    recommendedAction: 'Establish a governance function across all business domains, implement data classification, and define usage policy.',
    soWhat: 'Without classification, the organisation cannot govern data usage, enforce access controls, or demonstrate compliance.',
    technologyFunctionId: 'TF-02', businessArea: 'Corporate', tshirtSize: 'M', investmentType: 'defensive',
    objectiveIds: ['OBJ-005'], capabilityIds: ['CAP-07'], evidenceIds: ['EV-010'],
    scores: [
      s('financial_impact', 2, 'Enables governed data products with higher impact, but no direct outcome of its own.', []),
      s('risk_if_deferred', 4, 'Ungoverned data usage is a compounding compliance and control exposure.', ['EV-010']),
      s('strategic_alignment', 3, 'A prerequisite to the analytics activation that serves named revenue goals.', []),
    ],
    humanRank: null, humanRankRationale: null, published: true,
  },
  {
    id: 'OPP-017', initiativeId: 'INI-01',
    title: 'Identity & Access Modernisation',
    description: 'Implement centralised identity and access management across platforms.',
    recommendedAction: 'Accelerate the identity platform decision and sequence implementation ahead of the supplier portal.',
    soWhat: 'Identity is a hard prerequisite for two funded programmes. Delay here cascades to both.',
    technologyFunctionId: 'TF-03', businessArea: 'Technology', tshirtSize: 'M', investmentType: 'ceiling_remover',
    objectiveIds: ['OBJ-001', 'OBJ-005'], capabilityIds: ['CAP-08'], evidenceIds: ['EV-011'],
    scores: [
      s('financial_impact', 3, 'No direct revenue, but unblocks two initiatives that carry it.', ['EV-011']),
      s('risk_if_deferred', 4, 'Two funded programmes cannot launch until this completes; delay is directly costly.', ['EV-011']),
      s('strategic_alignment', 3, 'A foundational dependency of the named revenue growth goal.', ['EV-011']),
    ],
    humanRank: null, humanRankRationale: null, published: true,
  },
  {
    id: 'OPP-018', initiativeId: 'INI-05',
    title: 'Critical Role Recruitment',
    description: 'Fill the open leadership and engineering roles blocking execution.',
    recommendedAction: 'Fill the two director-level vacancies and establish data engineering capacity on the current timeline.',
    soWhat: 'Thirteen open roles constrain the bandwidth of every programme on this roadmap.',
    technologyFunctionId: 'TF-05', businessArea: 'Technology', tshirtSize: 'S', investmentType: 'multiplier',
    objectiveIds: ['OBJ-003'], capabilityIds: ['CAP-11'], evidenceIds: ['EV-018'],
    scores: [
      s('financial_impact', 3, 'Recovers delivery capacity across the portfolio; hard to attribute to a single figure.', ['EV-018']),
      s('risk_if_deferred', 3, 'The delivery deficit compounds as programmes launch against unchanged capacity.', ['EV-018']),
      s('strategic_alignment', 4, 'Directly enables every named goal by making delivery possible.', []),
    ],
    humanRank: null, humanRankRationale: null, published: true,
  },
];

// ============================================================ dependencies

export const DEPENDENCIES = [
  { id: 'DEP-01', upstreamId: 'INI-01', downstreamId: 'INI-04', type: 'hard_prerequisite',    rationale: 'Order processing cannot migrate until core platform continuity and documentation are established.',      triggerLanguage: 'No active migration plan exists.',                                                            confidence: 0.91, validated: true,  origin: 'ai_inferred' },
  { id: 'DEP-02', upstreamId: 'INI-03', downstreamId: 'INI-04', type: 'hard_prerequisite',    rationale: 'The ERP programme depends on the rationalised integration layer being in place before phase two.',        triggerLanguage: 'Batch file model cannot support the real-time requirements of the two go-lives.',              confidence: 0.88, validated: true,  origin: 'ai_inferred' },
  { id: 'DEP-03', upstreamId: 'INI-07', downstreamId: 'INI-08', type: 'hard_prerequisite',    rationale: 'Analytics activation depends on a governed master data foundation being operational.',                    triggerLanguage: 'Three product data instances serve different purposes with no single source of truth.',        confidence: 0.84, validated: true,  origin: 'ai_inferred' },
  { id: 'DEP-04', upstreamId: 'INI-01', downstreamId: 'INI-06', type: 'hard_prerequisite',    rationale: 'Commerce unification is blocked until centralised identity is delivered.',                                triggerLanguage: 'Identity modernisation is documented as a critical-path prerequisite.',                        confidence: 0.95, validated: true,  origin: 'ai_inferred' },
  { id: 'DEP-05', upstreamId: 'INI-05', downstreamId: 'INI-04', type: 'sequencing_preference', rationale: 'Portfolio governance should precede the largest programme so sequencing decisions are made once.',        triggerLanguage: 'Resource contention as the single greatest barrier to delivery.',                              confidence: 0.72, validated: true,  origin: 'ai_inferred' },
  { id: 'DEP-06', upstreamId: 'INI-03', downstreamId: 'INI-07', type: 'collision_risk',        rationale: 'Both programmes touch the same integration layer concurrently and risk conflicting changes.',            triggerLanguage: 'Two major programmes collide in the same integration layer.',                                  confidence: 0.68, validated: false, origin: 'ai_inferred' },
];

// ============================================================ roadmap

export const ROADMAP = {
  startPeriod: '2027-Q1',
  horizonQuarters: 12,
  waves: [
    { id: 'W1', sequence: 1, label: 'Wave 1 — Stabilise',  startPeriod: '2027-Q1', endPeriod: '2027-Q4', targetOutcome: 'Existential operational risks removed and delivery governance established.' },
    { id: 'W2', sequence: 2, label: 'Wave 2 — Consolidate', startPeriod: '2028-Q1', endPeriod: '2028-Q4', targetOutcome: 'Committed investments sequenced and protected; core data foundation operational.' },
    { id: 'W3', sequence: 3, label: 'Wave 3 — Grow',        startPeriod: '2029-Q1', endPeriod: '2029-Q4', targetOutcome: 'Commerce and data capabilities generating measurable commercial return.' },
  ],
  items: [
    { initiativeId: 'INI-01', waveId: 'W1', startPeriod: '2027-Q1', lane: 'TH-1' },
    { initiativeId: 'INI-02', waveId: 'W1', startPeriod: '2027-Q1', lane: 'TH-1' },
    { initiativeId: 'INI-03', waveId: 'W1', startPeriod: '2027-Q2', lane: 'TH-1' },
    { initiativeId: 'INI-05', waveId: 'W1', startPeriod: '2027-Q1', lane: 'TH-2' },
    { initiativeId: 'INI-04', waveId: 'W2', startPeriod: '2028-Q1', lane: 'TH-2' },
    { initiativeId: 'INI-07', waveId: 'W2', startPeriod: '2028-Q1', lane: 'TH-4' },
    { initiativeId: 'INI-06', waveId: 'W3', startPeriod: '2029-Q1', lane: 'TH-3' },
    { initiativeId: 'INI-08', waveId: 'W3', startPeriod: '2029-Q2', lane: 'TH-4' },
  ],
};

// ============================================================ board deck

export const BOARD_SLIDES = [
  {
    sequence: 1, slideType: 'title', title: 'Technology Transformation Roadmap',
    headline: 'Meridian Supply Group — Board Review',
    message: 'Prepared by Aberdeen Advisors', exhibit: 'none', bindings: [],
  },
  {
    sequence: 2, slideType: 'current_state', title: 'Where we are today',
    headline: 'The technology estate is operating {{capsBelowTarget}} of {{capsTotal}} capabilities below its target maturity',
    message: 'Average current maturity is {{avgCurrent}} against a target of {{avgTarget}}, an average gap of {{avgGap}} levels. {{criticalCaps}} capabilities are rated critical to fix.',
    exhibit: 'maturity_heatmap',
    bindings: ['capsBelowTarget', 'capsTotal', 'avgCurrent', 'avgTarget', 'avgGap', 'criticalCaps'],
  },
  {
    sequence: 3, slideType: 'priorities', title: 'What matters most',
    headline: '{{actNowCount}} of {{scoredCount}} scored opportunities require action now',
    message: 'Opportunities are scored on financial impact (40%), risk if deferred (35%) and strategic alignment (25%). {{criticalBandCount}} score in the Critical band; {{highBandCount}} score High.',
    exhibit: 'quadrant_chart',
    bindings: ['actNowCount', 'scoredCount', 'criticalBandCount', 'highBandCount'],
  },
  {
    sequence: 4, slideType: 'roadmap_exhibit', title: 'The sequenced plan',
    headline: '{{wave1Count}} initiatives in Wave 1 remove the risks that constrain everything after them',
    message: 'The roadmap spans {{horizonQuarters}} quarters across {{waveCount}} waves and {{themeCount}} investment themes, sequenced by dependency, theme priority and score.',
    exhibit: 'roadmap_timeline',
    bindings: ['wave1Count', 'horizonQuarters', 'waveCount', 'themeCount'],
  },
  {
    sequence: 5, slideType: 'investment', title: 'What it costs',
    headline: 'Cost not yet estimated',
    message: 'Investment estimates have not been developed for {{unestimatedCount}} of {{initiativeCount}} initiatives. Effort is currently expressed as relative sizing only.',
    exhibit: 'none',
    bindings: ['unestimatedCount', 'initiativeCount'],
    isPlaceholder: true,
  },
  {
    sequence: 6, slideType: 'asks', title: 'What we are asking the Board to approve',
    headline: 'Three decisions unblock {{blockedCount}} initiatives',
    message: 'Approve the Wave 1 investment envelope, confirm the commerce platform direction, and mandate the portfolio intake process.',
    exhibit: 'decision_table',
    bindings: ['blockedCount'],
  },
];

// ============================================================ engagement

export const ENGAGEMENT = {
  id: 'ENG-001',
  clientName: 'Meridian Supply Group',
  name: 'Technology Strategy & Roadmap',
  mandate:
    'Establish a single integrated view of technology priorities across the enterprise, resolve the near-term decisions blocking execution, and produce a Board-ready five-year roadmap that balances immediate operational risk with long-term transformation.',
  phase: 'board',
  phases: ['kickoff', 'fact_gathering', 'diagnose', 'roadmap_v1', 'economics', 'alignment', 'board'],
  roadmapVersion: 'V2',
  lastPublished: '2027-01-14T10:00:00Z',
};

// ============================================================ demo accounts
// Prototype credentials only. Real authentication is server-side — see PRD section 7.5.

export interface DemoAccount {
  email: string;
  password: string;
  name: string;
  title: string;
  role: 'aberdeen' | 'client';
  organisation: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'aberdeen@aberdeenadv.com',
    password: 'Demo2026!',
    name: 'Liv DeSantis',
    title: 'Engagement Lead',
    role: 'aberdeen',
    organisation: 'Aberdeen Advisors',
  },
  {
    email: 'exec@meridiansupply.com',
    password: 'Demo2026!',
    name: 'Client Executive',
    title: 'Chief Digital & Information Officer',
    role: 'client',
    organisation: 'Meridian Supply Group',
  },
];

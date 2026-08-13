# Product Requirements Document
# Aberdeen Transformation Roadmap Platform (working name: **Atlas**)

**Version:** 1.0 (Build-Ready MVP Specification)
**Date:** 13 August 2026
**Prepared for:** AI Software Engineering Agent (GitHub build → Vercel deployment)
**Author role:** Product Management / Transformation Consulting / AI Product Architecture

---

## Source-of-Truth Declaration

This PRD is derived **exclusively** from two inputs:

1. **The Transformation Engagement Methodology table** (7 phases, Week 0 → Week 12), supplied in the brief.
2. **The reference engagement corpus** — a real, completed Aberdeen Advisors technology strategy engagement, supplied as `OneDrive_2026-08-13.zip`, containing:

| File | Type | Role in the analytical chain |
|---|---|---|
| `Orgill Painpoints & Opportunities vF.xlsx` | XLSX, 8 sheets | **Primary analytical model.** Maturity assessment + scored opportunity register + scoring rubric + theme definitions |
| `Orgill Opp. vFSHARE.xlsx` | XLSX, 7 sheets | **Secondary/derived model.** Theme–initiative registry, priority/effort heat map, quadrant assignment, post-workshop re-ranking |
| `Orgill Tech Maturity Assessment.pptx` | PPTX, 7 slides | Maturity heatmap exhibit (4-part table split) |
| `Onsite Deck vF.pptx` | PPTX, 67 slides | Current-state synthesis + prioritization method + workshop facilitation + roadmap-building activities |
| `Orgill Roadmap Execution Planning.pptx` / `...07.17.2026.pptx` | PPTX, 23 slides | Post-Board execution mobilization deck (two dated versions — evidence of output versioning) |
| `Onsite Recap Email.pdf` | 2 pp | Stakeholder communication + committed next-step actions after the alignment workshop |

Anything required to make the software function that **cannot** be traced to those two sources is explicitly labelled:

> **⚠ Product / Technical Decision Required**

No consulting framework, scoring system, calculation, or product concept has been imported from outside these sources. Where the reference engagement is silent (most notably: **cost modelling, resource capacity modelling, and ROI**), this PRD says so plainly rather than inventing a model and presenting it as a requirement.

**Client-confidentiality rule enforced throughout:** the reference engagement's *findings, scores, initiative names, recommendations and business conclusions* are treated as **test fixture data only**. They are never hardcoded into product logic, defaults, taxonomies, or seed configuration. What the product inherits from the reference engagement is the **analytical grammar**, not the client's answers.

---

# 1. Executive Summary

## 1.1 What is being built

**Atlas** is a multi-interface web application that runs an Aberdeen Advisors technology transformation engagement end-to-end as a **structured computational model**, from raw source documents to a Board-ready decision package — with a single set of numbers shared by every downstream output.

Today, an Aberdeen engagement of this type produces its analytical truth in Excel and its narrative truth in PowerPoint. The reference engagement demonstrates this precisely: a 43-row scored opportunity register and a 28-row CMMI maturity assessment, whose outputs are then *manually re-typed* into a 67-slide workshop deck, a 7-slide maturity deck, and ultimately a Board narrative. Every re-typing is a place where numbers drift, provenance is lost, and a change to sequencing silently invalidates an exhibit downstream.

The drift is not hypothetical. In the corpus as delivered, the opportunity count is stated four different ways across four artefacts (43 rows in the primary register, 46 in a second, "~50" on one slide, and a theme distribution summing to 56 on another); the CMMI level names appear in **three mutually incompatible label sets** across the workbook and two decks; a secondary heat map runs an entirely different scoring scale (integers of 8/7/5/4 against band boundaries of 3.7–4.4) that does not reconcile to the register it purports to summarize; and one register row carries a **live formula defect** — a column-shifted copy that silently leaves the row with no priority band and a quadrant computed from the same score on both axes. Every one of these is a class of error that a structured model makes impossible.

Atlas replaces that with **one transformation model**:

```
Source Document → Evidence → Finding → Capability Maturity Score
                                    ↘
                                     Opportunity (scored) → Initiative (rolled up) → Theme
                                                                    ↓
                                                   Dependencies + Effort + Quadrant
                                                                    ↓
                                              Roadmap Version → Wave → Scenario
                                                                    ↓
                                        Published Client View → Executive Insight → Board Slide
```

Every node in that chain is a persisted object with a stable ID. Every number in it is calculated by code, not asserted by a language model. Every recommendation can be walked backwards to the interview, slide, or spreadsheet cell that supports it.

## 1.2 The core product thesis

The reference engagement proves that the analytically load-bearing work is **already structured** — it just lives in a spreadsheet that cannot enforce its own integrity. Three observations drive the entire product:

**Observation 1 — The prioritization model is deterministic and already specified.**
The opportunity register scores every opportunity on exactly three dimensions with fixed weights, computes a composite via `SUMPRODUCT`, and bands the result via a nested `IF`:

```
Weighted Score = (Financial Impact × 0.40) + (Risk if Not Done × 0.35) + (Strategic Alignment × 0.25)
Priority Band  = >=4.50 Critical | >=3.75 High | >=2.80 Medium | else Lower
```

This is arithmetic. No LLM should ever perform it. But an LLM is genuinely useful for *proposing the three input scores from evidence*, because each score is selected from a written, anchored 1–5 rubric with calibration examples — exactly the kind of classification task a model does well and a human can audit fast.

**Observation 2 — The scores are stored as rubric strings, not numbers.**
The workbook stores `"5 Transformational Directly enables a new revenue stream..."` in the visible cell and extracts the number with `=VALUE(LEFT(H6,1))` into a hidden column. This is not a spreadsheet hack — it is the consultant's deliberate insistence that **a score is inseparable from its justification**. Atlas makes this a first-class data structure: a score is always `{level, anchor_label, anchor_text, rationale, evidence_ids}`. A bare integer is never a valid score.

**Observation 3 — Human judgment overrides the calculation, and the system must record both.**
The secondary workbook contains a column literally named `Ranking Post Onsite` sitting beside the calculated `Weighted Score`, and a separate `Identified as Top Priority` rank. The workshop deck's Activity 1 has each stakeholder group pick its own top five, after which *"Aberdeen will then reveal how we ranked the priorities."* The engagement's value is created in the **gap between the computed rank and the room's rank**. Atlas must therefore store computed priority and human priority as distinct, co-existing fields and make their divergence a primary product surface — not silently overwrite one with the other.

## 1.3 Where AI is used, and where it is forbidden

| Layer | Owner | Examples |
|---|---|---|
| **Semantic** | AI proposes, consultant governs | Extract evidence from PPTX/XLSX/PDF; propose maturity level against CMMI anchors; draft findings; generate candidate opportunities from gaps; detect duplicate opportunities; infer dependencies from language like *"IAM is a hard prerequisite for Vendor Portal"*; cluster interview themes; synthesize workshop feedback; draft Board headlines |
| **Deterministic** | Code only — AI has no write access | Weighted score; priority band; maturity gap (`target − current`); initiative rollup (`AVG` of child opportunity scores); quadrant assignment; effort→duration derivation; dependency-constrained earliest start; wave membership; scenario deltas; staleness detection |

The boundary is enforced architecturally, not by prompt instruction: calculated fields are **not writable** through the AI orchestration layer's tool surface. An AI action can propose a *score input*; it can never write a *score output*.

## 1.4 Interfaces

Five distinct experiences over one model. The reference engagement justifies each:

| Interface | Justified by | Depth |
|---|---|---|
| **A. Engagement Workspace** (Aberdeen) | The workbooks — this is where the 51-row register and 44-row maturity grid are built | Full edit |
| **B. Review & Approval** (Aberdeen leadership) | The workbook `Status` dropdown: *New → In progress → Ready to Review → Reviewed → Final*, and open-item columns containing partner challenges like *"Is PIM counted 3 times?"* | Approve / challenge, no bulk edit |
| **C. Client Executive View** (CDIO/CIO) | Slides 10, 25–26, 39–47, 53 — the CDIO goals, theme summaries, foundational elements, decisions | Read + decide |
| **D. Business Stakeholder View** | The onsite workshop Activities 1–4: groups independently rank priorities, assign urgency, name dependencies, size effort | Structured input only |
| **E. Board Output View** | Slide 6's engagement timeline terminating in **"Board Mtg"**; the post-Board execution deck | Read-only, presentation-grade |

B is a **role + workflow state**, not a separate application shell; A and B share routes with different affordances. C, D and E are genuinely separate shells with separate navigation.

## 1.5 What the MVP will and will not do

**Will (P0):** ingest PPTX/XLSX/PDF/DOCX/transcripts with structure preserved to the cell and slide; extract AI-proposed evidence with source anchors; run the CMMI maturity assessment with target/gap; build a scored opportunity register under a Theme → Initiative → Opportunity hierarchy; compute all priority arithmetic deterministically; capture human-vs-computed priority divergence; infer and validate dependencies; render an interactive roadmap studio with wave/quadrant/dependency logic and real change propagation; support scenarios against a preserved baseline; publish approved content to a client interface; generate a Board deck whose numbers are read from the model; detect stale Board slides; export PPTX/XLSX.

**Will not (P0):** produce dollar-denominated cost models, ROI, payback, or resource capacity forecasts. **The reference engagement contains none of these.** Effort is expressed as T-shirt size (XS–XXL, with duration and risk bands) and Span (S/M/L). Cost appears only as rubric calibration language (*">$5M annually"*) and one contextual reference to a prior committed program. The Weeks 6–8 methodology phase demands cost and capacity modelling, so Atlas defines the **data structures and the calculation contracts** for it in P1 — but every dollar formula is flagged as a Product/Technical Decision Required rather than invented. Until a consultant enters estimates, the UI shows **"Cost not yet estimated"**, never `$0`.

## 1.6 Definition of success

The deployed MVP succeeds when an Aberdeen consultant can load the reference engagement's own files into a fresh engagement, reproduce its analytical structure inside the application, change one initiative's timing, and watch the system correctly identify every downstream artefact — dependent initiatives, wave composition, scenario deltas, executive insights, and specific Board slides — that is now stale. And when a client executive, logged into the same deployment, sees only what Aberdeen chose to publish.

---

# 2. Product Vision

## 2.1 Vision statement

> Aberdeen's transformation roadmaps should be **computed, evidenced, and versioned** — not assembled. Atlas makes the roadmap a living model that every deliverable reads from, so that changing a decision changes the deck, and every recommendation can prove where it came from.

## 2.2 The problem, precisely stated

The reference engagement is high-quality consulting work. Its failure modes are structural, not intellectual, and all six are visible in the artefacts:

**1. Analytical truth is fragmented across four competing registers.**
Two workbooks hold overlapping opportunity registers with **no reconciliation between them**: `Opportunities` (43 scored rows), `All Opportunities` (46 rows), `Op Model Foundations` (12 rows), and a retained `Opportunities OLD` (43 rows). Each of the first three carries its own weight row; one of them reaches across files for weights (`[1]Opportunities!$J$5:$N$5`) and — critically — **points at a different range than the local sheets use**, so the weight vector is neither truly shared nor verifiably identical. A cross-file link also breaks the moment a file is copied or renamed.

**2. Numbers are re-keyed into narrative, and they diverge when they are.**
Theme summary slides carry an `Avg Weight` column per initiative. Those averages exist only as typed slide text; nothing binds them to the opportunity rows they average. The workshop deck is stamped *"First draft – will be updated based on additional inputs"* on the very slides that carry the scores — an explicit acknowledgement that deck and model are out of sync at the moment of presentation. The `Priority Heat Map` sheet goes further: it scores 27 items on an **8/7/5/4 integer scale** against band boundaries labelled *"High (3.7–4.4)"* and a band called *"Low Priority"* — three separate divergences from the register's 1–5 scale, 3.75 threshold, and *"Lower Priority"* label, in a sheet that presents itself as a summary of that same register.

**3. Provenance is textual, not navigable.**
Evidence is captured with real rigour — *"confirmed by [VP] interview"*, *"Exec Strategy 3/18"*, *"3 FTE + intern confirmed managing 3,500–4,000 assets"* — and opportunities carry a `Linked Pain Point(s)` column holding ID lists such as `26,53,36,37,35,32,33,39,38`. But those are strings. Nothing enforces that pain point 53 exists, and no one can click from a Board message to the interview that produced it.

**4. Human re-prioritization has nowhere structured to live.**
`Ranking Post Onsite` and `Identified as Top Priority` are sparse manual columns bolted onto a calculated model. The reasoning behind an override — *why* the room moved something — survives only in a `Notes / Open Items` free-text column and in the facilitator's memory.

**5. Duplicate and overlapping items are caught by human vigilance alone.**
An open-item note asks: *"Is PIM counted 3 times? (PIM consolidation + snowflake + PIM-as-a-service)? Can we distinguish these better in the attribute scores?"* That is a partner catching a double-count by reading carefully. It should be a system-proposed merge candidate with a similarity rationale.

**6. Change has no blast radius.**
The recap email commits to six follow-up workstreams including *"Validate scoring and sequencing"* and *"Build the dependency map."* When those land, nothing tells the team which of the 67 slides, four theme summaries, quadrant chart, and heat map are now wrong.

**7. Formula errors are silent and survive to delivery.**
One row of the final register (`Data and MDM Talent and team`) carries a one-column formula shift: the priority-band cell holds the *business-value* formula, and both axis cells hold the risk score. The consequence is that this opportunity has **no priority band at all**, and its quadrant is computed from the same number on both axes. This is present in the file marked `vF`. No spreadsheet can detect this; a typed calculation engine with tested inputs makes it unrepresentable. This single defect is the most concrete justification in the corpus for §15's deterministic engine.

## 2.3 The Atlas answer

| Failure mode | Atlas mechanism |
|---|---|
| Fragmented truth | One `Engagement` aggregate; one weight vector as a versioned `PriorityModel`; no cross-file references |
| Re-keyed numbers | Board slides and exhibits bind to `calculated_field` references; regeneration is idempotent |
| Textual provenance | `Evidence` objects with `SourceLocation` (workbook/sheet/cell, deck/slide/shape, page/char-range); FK-enforced links |
| Lost human judgment | `PriorityScore.computed_*` and `PriorityScore.human_*` coexist; every override requires a rationale and is versioned |
| Manual duplicate catching | `AI-06 Duplicate & Overlap Detection` proposes merge/split candidates with similarity rationale and evidence overlap |
| No blast radius | `ChangePropagation` engine computes and persists an impact set on every consequential edit; `StalenessMonitor` marks affected published outputs and Board slides |

## 2.4 Design principles (applied, not aspirational)

1. **Structured before generative** — every roadmap fact is a typed field before it is ever prose. Narrative is a *projection* of the model.
2. **AI proposes; consultants govern** — no AI output enters an approved state without an explicit human action recorded with actor and timestamp.
3. **Calculate rather than hallucinate** — the calculation engine is a pure, tested, side-effect-free module. The AI layer cannot import it as a writer.
4. **Evidence before recommendation** — a Finding without >=1 Evidence link cannot be approved. A maturity score without evidence cannot leave `ai_suggested`.
5. **One transformation model** — maturity, opportunities, roadmap, scenarios, client view and Board deck are views over the same aggregate.
6. **One source of analytical truth** — the Board deck holds *references*, never literals. A number that appears on a slide and a number that appears in the backlog are the same row in the database.
7. **Internal before external** — nothing reaches a client interface without an explicit publish action naming exactly which artefacts become visible.
8. **Multiple interfaces, shared data** — five experiences, one aggregate, one permission model.
9. **Changes propagate** — propagation is a required, tested behaviour with defined rules, not a nice-to-have.
10. **Buildable, not aspirational** — P0 is scoped to what the reference engagement actually evidences. Cost/capacity is honestly deferred with its contracts defined.

## 2.5 What Atlas is deliberately not

- Not a PPM or delivery-execution tool. It ends at the transformation decision; it does not track sprints, tickets, or actuals.
- Not a document summarizer. Summarization without structure is explicitly out of scope.
- Not an autonomous consultant. Atlas has no path by which AI output reaches a client without human approval.
- Not a generic BI tool. The schema is opinionated to the Aberdeen methodology.

---

# 3. Source-Material Findings

This is the evidentiary basis for every requirement in this PRD. Each finding is labelled **[OBSERVED]** (directly present in the corpus), **[INFERRED]** (reasonably derivable), or **[ABSENT]** (required by the methodology table but not evidenced in the corpus — therefore flagged, not invented).

## 3.1 The three-level analytical hierarchy — [OBSERVED]

Slide 40 of the workshop deck states it explicitly:

> *"Every item is organized across three levels: theme, initiative, and opportunity"*
> **Theme** — "The strategic question" — *Why should [the client] care about this category of investment right now?*
> **Initiative** — "The investment bucket" — *What are we actually building, fixing, or deciding — and who owns it?*
> **Opportunity** — "The specific gap or action" — *What exactly needs to happen, and what is the cost of not doing it?*
> Scale (as stated on the slide): **4 themes / ~20 initiatives / ~50 opportunities**
> Method: *"Grouped from ~50 opportunities by natural dependency and ownership"*

**Actual counts differ from every stated count — [OBSERVED].** The registry holds **17 initiatives**; the primary register holds **43 scored opportunities**; a second register holds 46; and slide 39's theme distribution (13 / 16 / 19 / 8) sums to **56**. Four artefacts, four different answers to "how many opportunities are there?" This is not sloppiness — it is the inevitable result of a count that must be re-derived by hand every time it is quoted. **Product consequence: every count displayed anywhere in Atlas is a CALC-13 aggregate with its denominator shown, never a typed number.**

The workbook confirms the **Opportunity is the unit of prioritization** — column documentation reads: *"This is the unit of prioritization, a discrete, actionable item."* Scores attach to opportunities. Initiatives inherit by aggregation. Themes carry sequence.

**Product consequence:** the canonical model is `Theme (1) --< Initiative (1) --< Opportunity (N)`. Scoring lives on Opportunity. `Initiative.score = AVG(child opportunity weighted scores)` — evidenced by the `Avg Weight` column heading on every theme summary slide.

**Critical structural detail — [OBSERVED]:** Theme is *not stored* on the opportunity row. It is derived:
```
=LET(result, XLOOKUP(C7, 'Themes & Initiatives'!D:D, 'Themes & Initiatives'!C:C, ""), IF(OR(result="",result=0),"",result))
```
Theme is resolved *through* Initiative via a managed registry. Atlas must model `Opportunity -> Initiative -> Theme` as a strict FK chain, never denormalize Theme onto Opportunity.

## 3.2 The four investment themes and their sequence — [OBSERVED]

The `Themes & Initiatives` sheet carries a `Sequence` column (values 1–4) mapping themes to roadmap ordering:

| Seq | Theme | Strategic question it answers |
|---|---|---|
| 1 | Stabilize the Core | Remove existential risk before anything else |
| 2 | Assess & Protect Current Investments | Get full value from what is already funded |
| 3 | Grow the Top Line | Put revenue in reach |
| 4 | Build the Intelligent Enterprise | Move from data collection to data advantage |

Theme sequence is a **structural input to wave ordering** — [INFERRED, strongly]. A theme numbered 1 is not merely a label; it declares that its contents precede others.

**Theme renaming is evidenced, and so is the damage it causes — [OBSERVED].** The sheet carries an `Old Theme Names` column (`Protect the backbone` → `Stabilize the Core`; `Revenue Unlock` → `Grow the Top Line`) and initiatives carry `Old Name` (`Critical Roles Open & Skills Gap` → `Workforce Resilience`).

One row demonstrates the failure mode precisely: an initiative is tagged to the theme string `Protect Current Investments` — a **fifth** theme label that is neither the canonical name (`Assess & Protect Current Investments`) nor a recorded old name — **and** carries `Sequence = 3` where its intended theme is sequence 2. So a single stale label has silently corrupted both the grouping and the roadmap ordering for that initiative, and because Theme is resolved by `XLOOKUP` on the *string*, the error propagates to every downstream lookup.

**Product consequence:** Themes and Initiatives require **stable IDs decoupled from labels**, a rename history, and referential integrity that survives relabelling. Sequence must live on the Theme record, never be re-entered per initiative. This corpus row is the exact bug a stable-ID model makes impossible.

**⚠ Product / Technical Decision Required:** Are these four themes a *firm-standard taxonomy* reused across engagements, or bespoke per engagement? The corpus shows one engagement, and slide 39 carries the disclaimer *"This is Aberdeen Advisors' independent view, not a rationalization of your current project list"* — implying bespoke derivation. **PRD assumption (must be confirmed): Themes are engagement-scoped and consultant-defined, with an optional firm-level template library. Atlas will NOT hardcode these four names.**

## 3.3 The maturity assessment model — [OBSERVED]

**Framework, stated verbatim in two places:**
> *"Framework: CMMI v2.0 (Capability Maturity Model Integration) | Evaluation Method: SCAMPI C (Informal Appraisal) | Calibration: Gartner IT Score Maturity Descriptors"*

And the integrity caveat, which the product must preserve:
> *"This assessment uses an informal SCAMPI C evaluation — the lightest-weight appraisal method under CMMI. Scores reflect evidence gathered through structured interviews, documentation review, and facilitated deep-dives... They represent Aberdeen Advisors' independent judgment, not a formal certification."*

**Structure:** two-level capability tree — **Technology Function** (8) → **Focus Area** (~28 rows).

The eight functions observed: Core Operations & Fulfillment; Data Architecture & Governance; Infrastructure, Network & Security; Digital Commerce; Vendor Enablement; Retail Tech; Organizational Enablement; Enterprise Architecture. Slide 13: *"We grouped our understanding of [the client's] Business Model into eight key areas."*

**Row schema (exact columns observed):**

| Column | Type | Nature |
|---|---|---|
| Technology Function | enum/FK | Human |
| Focus Area | text | Human |
| Status | `New / In progress / Ready to Review / Reviewed / Final` | **Workflow state** (see note) |
| Current State Summary (Pain Points & Strengths) | long text | Human + AI-assistable |
| Rationale for Maturity | long text | Human + AI-assistable |
| Current Level | int 1–5 | Human, AI-proposable |
| Target Level | int 1–5 | Human |
| **Gap** | `=G-F` | **Calculated** |
| **Maturity Label** | `=CHOOSE(F,"Initial","Managed","Defined","Quantitatively Managed","Optimizing")` | **Calculated** |
| Evidence & Criteria Met | long text, prefixed `Evidence:` | Provenance |
| Opportunities | long text, prefixed `Gaps:` | Bridge to opportunity register |
| Next Steps to Advance | long text, bulleted | Bridge to recommended actions |
| Priority to Fix | enum: `Critical / High / Medium` | Human |

**Two calculated columns confirm maturity arithmetic belongs to code.** The 1–5 CMMI level definitions are documented in a dedicated `Maturity Definitions` sheet with organization-specific interpretation per level — i.e. **anchored rubrics**, identical in spirit to the opportunity scoring rubric.

**Note on the Status field — [OBSERVED, with an important qualification].** The five-value vocabulary exists as a lookup list, but it sits on a hidden sheet **in the other workbook** and **no data validation binds it to the Status column**. Only three of the five values actually appear in the assessment. Separately, a *second, different* field also called `Status` (`New / Existing / Updated`) tracks provenance against the client's own backlog. So the corpus contains a real review workflow that is unenforced, un-bound, and name-colliding with an unrelated field. **Product consequence:** Atlas adopts the five-value vocabulary as a genuine, enforced state machine on `Capability`, and renames the provenance field to `status_provenance` to eliminate the collision.

**Three incompatible CMMI label sets — [OBSERVED].** The workbook's `CHOOSE()` yields *Initial / Managed / Defined / Quantitatively Managed / Optimizing*. The maturity deck's definitions slide reads *Initial / **Repeatable** / Defined / **Measured & Governed** / **Optimized***. The heatmap key on the following slides reads *Initial / Repeatable / Defined / **Managed** / Optimizing*. Three artefacts in one delivery, three different names for the same five levels — including *"Managed"* appearing at level 2 in one and level 4 in another, which is not a cosmetic difference but a substantive misstatement of what a score means. **Product consequence: `MaturityLevelAnchor` is the single source of level labels, and every exhibit renders from it. No renderer may carry its own label list.**

**Target level is not uniform — [OBSERVED].** The definitions sheet states L3 is the baseline target for most areas, with L4 reserved for domains of competitive differentiation and L5 explicitly aspirational and not targeted. Observed targets range 3–4. **Target maturity is therefore a deliberate per-capability decision, not a constant** — Atlas must make `target_level` an editable field with rationale, never a default.

**Evidence quality bar — [OBSERVED].** Evidence strings are specific and falsifiable: named interviewees with dates, tool names with go-live months, counts (*"3,500–4,000 assets"*, *"13 open roles"*, *"~150 stores"*), and percentages (*"73% of pick target"*, *"38% YoY sales lift"*). This sets the bar for `AI-02 Maturity Level Proposal`: an evidence citation must be specific enough to be checked.

**Presentation binding — [OBSERVED].** The maturity deck renders the same rows as a heatmap split across four slides (`1/4`…`4/4`) with columns `Technology Function | Focus Area | Rating | Scoring Rationale` and a 01–05 key. It is **almost** a pure projection — but it also relabels the levels (above) and introduces two aggregates the workbook does not contain: a per-function *"Current State Avg. Across Focus Areas"* and a per-row target marker. So the deck both diverges from and extends its source. **Product consequence:** those two aggregates belong in CALC-13, and the exhibit becomes fully generatable — the clearest example in the corpus of a deck that should be rendered from the model rather than typed.

## 3.4 The opportunity scoring model — [OBSERVED, fully specified]

The single most important finding. Fully recoverable from formulas.

**Three dimensions, fixed weights, stored once and referenced:**

| # | Dimension | Weight | Question asked |
|---|---|---|---|
| 1 | Growth / Revenue Impact | **0.40** | *"Revenue unlocked, cost saved, or margin recovered. Covers both the upside of acting and the financial cost of not acting… what is the dollar consequence either way?"* |
| 2 | Operational Risk if Not Done | **0.35** | *"Not how fragile the system is — what actually happens if this gap persists… if we defer this for 12 months, what breaks and what does it cost?"* |
| 3 | Alignment to Business Strategy | **0.25** | *"How directly does this initiative serve a named business goal…? Scored on traceability — can you draw a direct line without explanation?"* |

**Formulas, verbatim:**
```
Numeric extraction:  =VALUE(LEFT(H7,1))
Weighted score:      =SUMPRODUCT($I$5:$M$5, I7:M7)
Priority band:       =IF(N7>=4.5,"Critical", IF(N7>=3.75,"High Priority",
                        IF(N7>=2.8,"Medium Priority","Lower Priority")))
```
Stated in prose on the guide sheet: `Weighted score = (D1 x 0.40) + (D2 x 0.35) + (D3 x 0.25) | Priority threshold: 3.75 and above | Max possible score: 5.0`

**Anchored 1–5 rubrics with calibration examples — [OBSERVED].** Each dimension has five written anchors. Dimension 1: `5 Transformational / 4 Material / 3 Moderate / 2 Indirect / 1 Hygiene`, with dollar bands (`>$5M annually or >$10M over 5 years`; `$1M–$5M`). Dimension 2: `5 Existential / 4 Severe / 3 Compounding / 2 Latent / 1 Negligible`, scored on *consequence of inaction*. Dimension 3: `5 Named explicitly / 4 Direct enabler / 3 Foundational dependency / 2 Thematic fit / 1 Not traceable`, scored on *traceability*. Every anchor carries a named calibration example.

**The score-as-string pattern — [OBSERVED].** The visible cell holds the full anchor text; a hidden column extracts the leading integer. **Product consequence: `MaturityScore` and `PriorityScore` must store `{level, anchor_label, anchor_text, rationale, evidence_ids}`. A bare integer is never a valid score.**

**Methodological lineage — [OBSERVED].** Slide 41 footnote: *"Anchored to Gartner's IT value dimensions and consistent with SAFe's Weighted Shortest Job First (WSJF) sequencing methodology."* Recorded as provenance metadata on the `PriorityModel`. Note the corpus applies a **weighted-sum**, not a true WSJF quotient — Atlas implements what the corpus implements.

**⚠ Product / Technical Decision Required:** Are the three dimensions and 40/35/25 weights **firm-standard** or **per-engagement configurable**? The two workbooks share identical weights via cross-file reference, suggesting standardization; but one guide sheet's header says *"Score each opportunity 1-5 on all four dimensions"* (four) while only three are implemented — evidence of a dimension having been removed. **PRD assumption: `PriorityModel` is a versioned, engagement-scoped object seeded from a firm default of 40/35/25 with these three anchored rubrics; weights and dimension count are editable, and any change forces recalculation with a version bump.**

## 3.5 The quadrant model — [OBSERVED, fully specified]

Derived axes, verbatim:
```
Business Value (X) = (Revenue Score + Alignment Score) / 2      -- =SUM(M7+I7)/2
Urgency (Y)        = Operational Risk Score                      -- =K7
Bubble Size        = Weighted Score                              -- =N7
Quadrant = IF(AND(X>=3.5, Y>=3.5), "Act Now",
           IF(AND(X<3.5,  Y>=3.5), "Defend",
           IF(AND(X>=3.5, Y<3.5),  "Plan & Fund", "Sequence Later")))
```
Threshold **3.5 on both axes**. Quadrant semantics are documented:

| Quadrant | Value | Risk | Meaning |
|---|---|---|---|
| Act Now | High | High | *"Investments that both matter and can't wait. Deferring them creates compounding harm."* |
| Defend | Low | High | *"Risk mitigation plays that have to happen regardless of revenue impact."* |
| Plan & Fund | High | Low | *"The right long-term bets that need deliberate investment and sequencing but aren't on fire right now."* |
| Sequence Later | Low | Low | *"Real opportunities but they depend on foundations that aren't in place yet. They belong on the roadmap but not in the [current-year] plan."* |

Rendered as slide 46/52: *"Business value (x) vs. urgency if deferred (y) | Bubble size = weighted composite score | Color = investment theme."* A complete, generatable exhibit specification.

**Label instability — [OBSERVED].** The recap email describes the framework as *"Act Now / Plan and Fund / Defer"* and, two paragraphs later, *"Act Now / Plan and Fund / Future Horizon."* Quadrant **labels must be configurable on the `PriorityModel`**; quadrant **logic must not be.**

**Threshold calibration warning — [OBSERVED].** Applying the formula to the delivered register yields **16 Act Now, 20 Plan & Fund, 7 Sequence Later, and 0 Defend.** One of the four documented quadrants is empty in practice. This is a natural consequence of the axis definitions — the X axis averages two dimensions while Y takes one raw dimension, so it is arithmetically difficult to be low-value and high-risk simultaneously. **Product consequence:** Atlas must (a) make the 3.5 thresholds configurable, and (b) display quadrant population counts on the model configuration screen so a consultant can see immediately when a quadrant is unreachable. A framework presented to a client with an empty cell invites exactly the question no one wants asked mid-presentation.

## 3.6 Effort, span, and sizing — [OBSERVED]

Three distinct effort representations, no dollars:

**(a) T-shirt sizing (workshop Activity 3):**

| Size | Effort | Duration | Risk |
|---|---|---|---|
| XS | Single team, well-defined | < 3 months | Low — proven tech, no legacy touch |
| S | 1–2 teams, some integration | 3–6 months | Low–Medium |
| M | Multi-team, moderate legacy | 6–12 months | Medium |
| L | Cross-functional, significant legacy | 12–24 months | Medium–High |
| XL | Enterprise-wide, deep legacy | 2–3 years | High — mainframe touch, org change |
| XXL | Multi-year transformation program | 3–5+ years | Very High — existential dependency |

**This is the timing engine.** Size → duration band is a deterministic lookup and the only defensible basis for scheduling in the MVP.

**(b) Span:** `L = Multi-year, M = Single Year, S = Quarter` — a coarser sizing on the register.

**(c) Heat-map Effort:** `S / M / L` on the priority-vs-effort grid.

**⚠ Product / Technical Decision Required:** Three overlapping effort scales coexist. **PRD recommendation: canonicalize on the 6-point T-shirt scale (it alone carries duration and risk bands); model Span and heat-map Effort as derived/legacy mappings.** Requires confirmation.

**Investment-type taxonomy — [OBSERVED as a definition, ABSENT as data]:** `Defensive (D) / Multiplier (M) / Ceiling Remover (CR)` is declared as a legend on the heat-map sheet and described there as the cell-colour encoding. **It is never populated** — the column headed `Investment Type` contains "so what" prose instead, and no cell is coloured by it. So the firm has articulated a genuinely useful strategic classifier and then had no practical way to apply it across 43 rows by hand. That is precisely the kind of high-judgment, low-effort classification an LLM does well, and it is carried into the PRD as an optional AI-classified field — not as an observed data column.

**Relationship type — [OBSERVED]:** `B2B / B2C / B2B2C / Internal`.

## 3.7 Dependencies — [OBSERVED as language, ABSENT as structure]

Dependency reasoning is pervasive and unambiguous in prose:
- *"IAM is a hard prerequisite for Vendor Portal and dealer platform unification. Delays here cascade to multiple programs."*
- *"Sequence IAM first"* / *"Sequence ahead of Vendor Portal"*
- *"Approve [the] minimum viable team model immediately — unblocks 4 initiatives"*
- *"Integration governance… stood up before [two major programs] go live. Without it, two major programs collide in the same integration layer."*
- *"Without a clear [ERP] roadmap, downstream programs cannot be sequenced."*
- *"Sequence with Core Data & Planning Foundations"*

But there is **no dependency column** in either workbook. Dependencies were captured live in Miro (Activity 3: *"Identify dependencies using the dropdown. More than one may apply."*), and the recap email lists as committed follow-up: *"**Build the dependency map**: Identify major cross-functional dependencies…"*

**Product consequence — this is the single highest-value AI opportunity in the product.** Dependency knowledge already exists inside approved prose; it has simply never been structured. `AI-07 Dependency Inference` mines exactly this language. Dependency type vocabulary is inferable from the prose: **hard prerequisite** (*"cannot launch without"*), **sequencing preference** (*"sequence ahead of"*), **unblocks** (*"unblocks 4 initiatives"*), **resource contention** (*"same talent"*), **collision risk** (*"collide in the same integration layer"*).

## 3.8 Stakeholder feedback and human override — [OBSERVED]

The workshop is a structured, reproducible instrument — four sequential activities:

| Activity | Captured | Product object |
|---|---|---|
| 1 — Establishing Top Priorities | Each group moves its top 5 into a Top Five column; reports out; room challenges; *"Aberdeen will then reveal how we ranked the priorities"* | `StakeholderFeedback{type: priority_rank}` |
| 2 — Assigning Urgency Level | Urgency + domain via dropdown per initiative; *"Aberdeen will then reveal how we assigned urgency"* | `StakeholderFeedback{type: urgency}` |
| 3 — Dependencies, Milestones, T-Shirt Size | Dependencies (multi-select), milestones, size | `Dependency`, `Milestone`, `Initiative.tshirt_size` |
| 4 — Building the Roadmap | Full-group placement on the timeline using priority, urgency, dependencies, milestones, effort | `RoadmapVersion` |

**The reveal-after-independent-ranking pattern is the engagement's core alignment mechanic.** Atlas must support: client ranks blind → consultant ranking revealed → divergence displayed → discussion → reconciled rank recorded with rationale. This is a **first-class product surface**, not a nice-to-have.

Persisted override columns confirm it — but their state confirms something more important. `Identified as Top Priority` sits on the main register and is sparsely filled. `Ranking Post Onsite` exists **only** on the 12-row `Op Model Foundations` sheet, with just 2 of 12 rows populated. In other words: the workshop generated re-prioritization for the whole portfolio, and the spreadsheet had room to record it for a twelfth of it. **The most valuable output of the most expensive day of the engagement had almost nowhere to live.** This is the strongest single argument in the corpus for making divergence a first-class product surface (§18.4) rather than a column.

**Feedback also arrives via survey — [OBSERVED].** Slides 15, 21, 37, 38 reference a survey producing strengths, opportunities, and — most valuably — *"Core Tensions"* (e.g. *Say-Yes Culture vs. Strategic Discipline*; *Operational Stability vs. Transformation Speed*) and a documented perception gap: *"Survey showed IT self-identifies around reliability and security. Yet, when the same people describe what the business needs, customer experience and innovation surge to the top."* **Contradiction detection is an evidenced consulting output**, matching the methodology table's *"contradiction detection."*

## 3.9 Benchmarking — [OBSERVED]

Slide 22: `Business Domains | Current Maturity | North Star Company | Attributes`, on a Lagging→Leading scale, with a candid footnote: *"Current position is subjective based off executive interviews and document review. North Star companies are representative of industry-leading organizations."* A **secondary, explicitly subjective** comparative view distinct from the CMMI score. P1.

## 3.10 Findings, strengths, and tensions — [OBSERVED]

Findings are grouped into stable categories (slide 11): Governance & Operating Model; Core Technology Risk; Commercial & Experience Enablement; Financial & Vendor Transparency; Platforms, Data & Architecture. Balanced by an explicit **strengths** slide (14) — *"The assessment highlighted key strengths."* Atlas's `Finding` object requires a `polarity` field (`strength | gap | tension | risk`); a maturity tool that can only record deficits misrepresents the method.

## 3.11 Transformation objectives — [OBSERVED]

Opportunities carry a `Strategy Alignment` column referencing named client goals (observed values include *Sales Growth*, *Exceed Profit Target*, *Clarify our 5 Year Plan*, *Improve Inventory turns*) sourced from the client's own strategy documents. Dimension 3 scores *traceability to these named goals*. There is also a CDIO goal set (slide 25, six goals) and a three-bucket structure (slide 26: `Strategic Alignment / Engineering & Architecture / Execution & Operations`).

**Product consequence:** `TransformationObjective` is a first-class object, ingested from client strategy material, and is the **denominator of Dimension 3**. Multi-select from Opportunity.

## 3.12 Business-area ownership — [OBSERVED]

Column: `Business Area Mapping : EVP Area` — *"The business area or executive ownership domain that the opportunity primarily falls under."* Distinct from `Tech Area`. Two orthogonal ownership axes: **technology function** and **business/executive domain**. Both required — the business axis is what makes stakeholder-specific views possible in Weeks 9–10.

## 3.13 Recommended action — [OBSERVED]

*"Aberdeen's recommended next step or approach for this opportunity. **Written as a concrete directive, not a general description.**"* Confirmed by content: *"Publish [the] multi-wave roadmap"*, *"Restart [tool] with dedicated resource"*, *"Set Q3 2026 decision deadline."* A required, human-owned, AI-draftable field with an enforced imperative style.

## 3.14 Consultant working state — [OBSERVED]

`Notes / Open Items` carries live analytical challenges: *"Should [X] score 5 for strategic unlock…? Does this directly influence revenue; should it be a 5?"*, *"Is PIM counted 3 times…? Can we distinguish these better in the attribute scores?"* Plus a `Status` field (`New / Existing / Updated`) tracking provenance relative to the client's own backlog.

**Product consequence:** `OpenItem` is a first-class object attached to any entity, assignable, resolvable, and **Aberdeen-only — never published.** It is also the natural home for AI-raised challenges.

## 3.15 Engagement phasing — [OBSERVED]

Slide 6 renders the timeline as `Kickoff -> [4 weeks] Current State Assessment -> [6 weeks] -> [2–4 weeks] -> Board Mtg`, with Objectives / Key Activities / Outcomes per phase. Stated outcomes include *"Current state findings, Interview summaries"*, *"Opportunities inventory, Prioritized strategic themes and Initiatives"*, *"Roadmap epics, Executive/board deck that crystallizes the strategy."* This **corroborates the methodology table** and confirms `Engagement.phase` is a real, displayable state. Fact-gathering scale is stated on slide 12: *"5 leadership interviews across core technology domains; 10 functional deep-dives."*

## 3.16 Post-Board execution — [OBSERVED]

The execution deck ships in two dated versions and contains a 7-row mobilization table (`Priority | Immediate Readiness Focus | Aberdeen's Expertise`) plus workstream cards with `Why it matters / Outcome / Owner / Timing (Q3–Q4)`. This is the methodology's **90-Day Activation Plan**, evidenced. Its slide 2 also frames the post-Board risk — *"Future-focused planning may be deprioritized amid near-term demands."*

## 3.17 What is ABSENT — the honest gaps

| Methodology requirement | Corpus evidence | Verdict |
|---|---|---|
| Initiative-level cost estimates | **None.** No dollar figures per initiative/opportunity anywhere | **[ABSENT]** |
| Cost ranges / phasing by year | **None** | **[ABSENT]** |
| Resource demand & capacity model | Qualitative only (*"13 open roles"*, *"resource contention… single greatest barrier"*, *"no formal capacity model"*) | **[ABSENT as model]** |
| ROI / payback / value realization curve | **None.** Value is ordinal (Dimension 1 rubric bands) | **[ABSENT]** |
| Explicit KPI objects | Referenced as future work (*"Portfolio Health Scorecard"*) | **[ABSENT]** |
| Structured dependency records | Prose only; committed as follow-up | **[ABSENT as structure]** |
| Structured risk register | Risks appear inside maturity/opportunity prose | **[ABSENT as object]** |
| Explicit Board deck file | Board meeting evidenced; deck not in corpus | **[ABSENT as artefact]** |

Tellingly, the post-Board deck lists *"Financial Tech Spend and Budget Forecast"* as a **future Q3–Q4 workstream** whose stated purpose is *"Required to understand current spend, staffing burn and project timelines"* — direct confirmation that cost modelling had **not** occurred during the roadmap engagement.

### 3.17.1 But the corpus does not merely omit cost — it specifies it as deferred

This distinction matters, and it changes the P1 case from speculative to grounded. Slide 60 of the workshop deck is titled **"Six key inputs are needed to properly sequence the roadmap"** and names them explicitly, split into *"Focus of Today"* and *"Refine Later"*:

| Input | Status at workshop |
|---|---|
| Priority | Focus of today |
| Dependencies | Focus of today |
| T-Shirt Sizing | Focus of today |
| **Resource Constraints** | **Refine later** |
| **Cost** — *"Capital and operating investment required per initiative… Structures the multi-year budget to avoid funding cliffs"* | **Refine later** |
| **Business Value** | **Refine later** |

So Aberdeen's own method names cost, resource constraints and business value as **required sequencing inputs that were deliberately deferred**, not as concepts outside the engagement. Slide 66 confirms the intent — the committed next steps include *"further sequencing and estimations (t-shirt sizing, funding, other constraints)"*.

**This is the correct basis for the economics scope decision.** Atlas is not inventing a cost model onto a methodology that lacks one; it is building the slot the methodology already declares, and declining to fabricate the contents of that slot until Aberdeen supplies the conventions. The six inputs of slide 60 map cleanly onto the product: three are P0 (priority, dependencies, effort) and three are P1 (resources, cost, quantified value) — which is precisely the split this PRD proposes, now for a documented reason rather than a pragmatic one.

**This PRD therefore treats cost, capacity, ROI and KPI as P1 with defined data contracts and explicitly flagged formulas — never as invented P0 requirements.** Effort-based scheduling (T-shirt → duration) is P0 because it *is* evidenced and *was* completed.

## 3.18 Traceability: PowerPoint output → Excel source

| Deck exhibit | Backing structure | Generatable? |
|---|---|---|
| Maturity heatmap (4 slides) | Maturity rows: Function, Focus Area, Current Level, Rationale | **Yes — direct projection** |
| Theme summary tables (4 slides, `Initiative / Avg Weight / Opportunity`) | `AVG(child opportunity weighted scores)` grouped by Initiative | **Yes** |
| Opportunity landscape bubble chart | X, Y, size, colour — all four formula-derived | **Yes** |
| Priority & effort heat map | Score band x Effort, coloured by Investment Type | **Yes** |
| Scoring methodology slide (41) | `PriorityModel` weights + rubric anchors | **Yes** |
| Priority definitions slide (58) | Band thresholds + descriptions | **Yes** |
| Themes/initiatives summary (47/51) | Theme → Initiative rollup, 4 tables | **Yes** |
| Findings & tensions (11, 21) | `Finding` objects with category + polarity | **Partly** — needs narrative pass |
| North Star benchmark (22) | Not in workbooks | **No — P1, new structure** |
| Foundational elements (53) | Not in workbooks; workshop output | **No — P1, new structure** |

**Ten of eleven load-bearing exhibits are generatable from the model.** This is the strongest possible justification for the Board Deck Generator and for the "one source of analytical truth" principle.
---

# 4. Product Goals

Goals are ordered by priority and each carries a measurable acceptance signal.

## G1 — Make the roadmap a computational model, not a document
**Why:** The reference engagement's roadmap exists as slide geometry. Moving a box changes nothing.
**Acceptance:** Every roadmap position is a persisted `RoadmapItem` with `wave`, `start_period`, `end_period`, `duration_periods` derived from T-shirt size, and dependency-constrained `earliest_start`. Changing a position triggers recalculation and returns a non-empty impact set when downstream objects exist.

## G2 — Guarantee one set of numbers across every output
**Why:** `Avg Weight` values were typed onto four slides with no binding to the rows they summarize.
**Acceptance:** No Board slide, client view, or export contains a numeric literal for a model-derived quantity. Every such value resolves through a `CalculatedFieldRef`. An automated test asserts that regenerating all outputs after a score change produces updated values everywhere with zero manual intervention.

## G3 — Make every recommendation traceable to its source location
**Why:** `Linked Pain Point(s) = "26,53,36,37..."` is provenance that cannot be navigated or validated.
**Acceptance:** From any Board message, a user reaches the supporting Source Document and the exact location (sheet+cell, slide+shape, or page+char-range) in ≤4 clicks. Findings cannot be approved without ≥1 Evidence link. Orphaned references are impossible (FK-enforced).

## G4 — Preserve and surface the divergence between calculated and human priority
**Why:** `Ranking Post Onsite` vs `Weighted Score` is where the engagement's alignment value is created.
**Acceptance:** `PriorityScore` persists computed and human ranks simultaneously; a Divergence view lists every item where they differ by more than a configurable threshold; every override carries a mandatory rationale and an actor/timestamp.

## G5 — Let AI accelerate judgment without ever exercising it
**Why:** Client-facing conclusions carry Aberdeen's professional liability.
**Acceptance:** Every AI-generated object is created in `ai_suggested` state. No transition to `approved` occurs without an explicit human action recorded in the audit log. A permission test proves no AI code path can write a `calculated_*` field or set `approved`/`published`.

## G6 — Control precisely what a client sees
**Why:** The corpus contains internal open items (*"Is PIM counted 3 times?"*) that must never reach a client.
**Acceptance:** Publishing is an explicit, itemized action producing an immutable snapshot. Automated permission tests prove client roles cannot read `OpenItem`, `Evidence.internal_note`, AI confidence values, or any non-published version — via UI **or** direct API call.

## G7 — Detect and report staleness rather than silently drift
**Why:** *"First draft – will be updated based on additional inputs"* was stamped on live scoring slides.
**Acceptance:** After a roadmap change, any previously generated Board deck reports the affected slide count and identity, e.g. *"Roadmap Version 7 changed after this deck was generated. 3 slides may now contain outdated information."*

## G8 — Support multiple concurrent engagements with hard isolation
**Acceptance:** Every query is engagement-scoped at the data-access layer. Cross-engagement read attempts fail authorization, verified by test. Aberdeen users may hold roles in many engagements; client users in exactly the ones granted.

## G9 — Reduce time from source documents to a defensible first-cut prioritized backlog
**Why:** The methodology allocates Weeks 1–4 to this.
**Acceptance (directional, measured against the fixture):** Ingesting the reference corpus produces ≥30 reviewable candidate evidence items, ≥8 capability rows with proposed levels, and ≥20 candidate opportunities with proposed dimension scores — each with citations — within a single processing run.

## G10 — Deploy reliably from GitHub to Vercel
**Acceptance:** A clean clone plus documented env vars produces a passing `build`, a working deploy, functioning auth, upload, persistence, and permission enforcement in the hosted environment.

---

# 5. Non-Goals

Explicitly out of scope for the MVP. Each records *why*, so the boundary is defensible rather than arbitrary.

| # | Non-goal | Rationale |
|---|---|---|
| NG1 | Delivery execution / PPM (tasks, sprints, timesheets, actuals) | The corpus ends at the transformation decision and the 90-day activation plan. Execution tracking is a different product. |
| NG2 | Dollar-denominated cost, ROI, payback, NPV as P0 | **[ABSENT]** from the corpus. Defined as P1 contracts with flagged formulas. Inventing them would violate the source-of-truth rule. |
| NG3 | Full resource capacity simulation as P0 | Capacity constraint is qualitative in the corpus. P1. |
| NG4 | Real-time multi-user collaborative editing (CRDT/OT) | Consulting workbooks are edited by a small team asynchronously. Optimistic concurrency with conflict detection is sufficient. |
| NG5 | Native mobile applications | Desktop browser is the working environment for all evidenced activity. Client/Board views must be *responsive*, not native. |
| NG6 | Live Miro / Teams / Slack / Jira integrations | Workshop capture is replicated natively (Activities 1–4). Integrations are P2. |
| NG7 | Automated audio transcription | Transcripts are ingested as text/DOCX/PDF. Speech-to-text is P2. |
| NG8 | Cross-engagement AI training on client data | Firm-level reuse must be explicit, opt-in, and de-identified (see §13). No implicit learning across tenants. |
| NG9 | Formal CMMI appraisal tooling | The corpus explicitly states SCAMPI C informal, *"not a formal certification."* |
| NG10 | Arbitrary user-defined scoring frameworks | MVP supports the evidenced weighted-sum model with configurable weights/labels — not a generic formula builder. |
| NG11 | Editing exported PPTX inside Atlas | Exports are one-way artefacts; regeneration replaces them. |
| NG12 | SSO/SAML/SCIM enterprise identity | Email+password or a managed auth provider suffices for MVP. P2. |

---

# 6. Target Users

Six personas, each grounded in a role visible in the corpus.

## U1 — Aberdeen Engagement Lead / Partner
**Evidence:** Named senders and recipients on the recap email; the "reveal how we ranked" facilitation role; partner-style challenges in `Notes / Open Items`.
**Goals:** Own the analytical position; approve what the client sees; run the alignment workshop; sharpen the Board storyline.
**Behaviours:** Reviews rather than builds. Challenges scores. Decides publish timing.
**Needs from Atlas:** A review queue; divergence views; one-click impact assessment; publish control; Board narrative editing.
**Frustrations today:** No way to know whether the deck matches the workbook.

## U2 — Aberdeen Consultant / Analyst
**Evidence:** The workbooks themselves — 51 scored rows, 44 maturity rows, dense evidence strings.
**Goals:** Turn documents and interviews into an evidenced, scored, defensible model quickly.
**Behaviours:** Lives in tables. Bulk-edits. Cross-references constantly.
**Needs:** Fast grid editing with keyboard support; inline evidence panel; AI proposals they can accept/edit/reject in bulk; duplicate detection; filters and grouping.
**Frustrations today:** Re-typing analysis into slides; manual duplicate hunting; broken cross-workbook links.

## U3 — Aberdeen Domain Specialist
**Evidence:** The recap email CC list shows multiple specialists; maturity rows carry domain-specific technical depth (security, data, infrastructure, commerce).
**Goals:** Contribute deep assessment in their domain only.
**Needs:** Scoped access to their capability areas; ability to add evidence and findings; no obligation to understand the whole model.

## U4 — Client Technology Executive (CIO / CDIO)
**Evidence:** Slide 10 (*"CDIO identified several focus areas"*), slides 23–26 (CDIO goals and strategy), slide 67 (*"CDIO Closing Remarks"*).
**Goals:** See the integrated view of technology priorities; make sequencing and funding decisions; understand what is being asked of them.
**Behaviours:** Reads conclusions, not workings. Wants "what changed since last time."
**Needs:** Published roadmap; decisions requiring their input; scenario comparison; recent-change summary. **Must never see** draft AI analysis or internal open items.

## U5 — Client Business / Functional Stakeholder
**Evidence:** The recap email's ~18 client recipients spanning operations, retail, sales, digital; the workshop's small-group structure; commitment to *"gathering and rationalizing relevant business roadmaps... across teams such as Operations, [Retail], Sales, Marketing, Finance."*
**Goals:** Confirm the roadmap reflects their reality; flag missing dependencies; validate business impact.
**Behaviours:** Engages in bursts, around workshops. Low tool tolerance.
**Needs:** A short, focused, structured input task — rank these, rate urgency, name dependencies, comment on value. Not a workspace.

## U6 — Board Member / Enterprise Executive
**Evidence:** Slide 6's timeline terminating in *"Board Mtg"*; the post-Board deck's framing (*"Board roadmap established the direction"*).
**Goals:** Approve the investment direction; understand risk and the decisions being asked of them.
**Behaviours:** Sees the output once, in a meeting. May never log in.
**Needs:** A read-only, presentation-grade narrative view and a PPTX export. Zero learning curve.

### Persona → interface map

| Persona | Primary interface | Secondary |
|---|---|---|
| U1 Lead/Partner | B — Review & Approval | A, E |
| U2 Consultant | A — Engagement Workspace | — |
| U3 Specialist | A (scoped) | — |
| U4 Client Exec | C — Client Executive | E |
| U5 Business Stakeholder | D — Stakeholder Input | C (published only) |
| U6 Board | E — Board Output | — |

---

# 7. Role / Permission Model

## 7.1 Design rationale

The corpus evidences three distinct trust boundaries, and the permission model is built from them rather than from a generic RBAC template:

1. **Aberdeen vs Client.** Internal open items, AI confidence, draft scores, and evidence notes are working material. The recap email's caveat — *"some of the rankings/scoring on the deck will shift"* — shows Aberdeen managing client expectations about draft status explicitly.
2. **Build vs Approve.** The `Status` ladder (`New → In progress → Ready to Review → Reviewed → Final`) is a real workflow separating the person doing analysis from the person accepting it.
3. **Consume vs Contribute.** Workshop participants contribute *structured input only* — they never edit the model.

## 7.2 Role definitions

Roles are granted **per engagement** (except `PlatformAdmin`). A user may hold different roles in different engagements.

| Role | Class | Purpose |
|---|---|---|
| `PlatformAdmin` | Aberdeen, org-level | Manage organizations, users, firm-level templates. Not an engagement role. |
| `EngagementOwner` | Aberdeen | Accountable partner/lead. Full control including publish, Board generation, role assignment, engagement deletion. |
| `Editor` | Aberdeen | Consultant/analyst. Full analytical edit rights. Cannot publish, cannot approve their own work, cannot assign roles. |
| `Reviewer` | Aberdeen | Domain specialist or reviewing partner. Can approve/reject, raise open items, comment. Cannot bulk-edit or publish. |
| `ClientExecutive` | Client | Sees published content; records decisions; requests changes. Read + decide. |
| `ClientContributor` | Client | Workshop participant. Submits structured feedback on assigned items. Sees only what is published *and* assigned. |
| `BoardViewer` | Client/external | Read-only access to the published Board output view. Nothing else. |

**Rejected alternative:** a separate `Client Editor` role with model-edit rights. Nothing in the corpus shows clients editing the analytical model; they *influence* it through feedback that Aberdeen reconciles. Granting clients write access to scores would destroy the divergence signal that makes the workshop valuable.

## 7.3 Permission matrix

`✔` allowed · `—` denied · `▲` allowed with constraint (footnoted)

| Capability | PlatformAdmin | Owner | Editor | Reviewer | ClientExec | ClientContrib | BoardViewer |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Create organization | ✔ | — | — | — | — | — | — |
| **Create engagement** | ✔ | ▲¹ | — | — | — | — | — |
| Assign engagement roles | ✔ | ✔ | — | — | — | — | — |
| Invite client users | ✔ | ✔ | ▲² | — | — | — | — |
| Archive/delete engagement | ✔ | ✔ | — | — | — | — | — |
| **Upload source documents** | — | ✔ | ✔ | — | — | — | — |
| **View source documents / evidence** | — | ✔ | ✔ | ✔ | — | — | — |
| Trigger AI extraction | — | ✔ | ✔ | — | — | — | — |
| **Edit findings** | — | ✔ | ✔ | ▲³ | — | — | — |
| **Approve AI-generated analysis** | — | ✔ | ▲⁴ | ✔ | — | — | — |
| Edit maturity current/target level | — | ✔ | ✔ | ▲³ | — | — | — |
| Approve maturity conclusions | — | ✔ | — | ✔ | — | — | — |
| Create/edit/delete opportunities | — | ✔ | ✔ | — | — | — | — |
| **Edit priority dimension scores** | — | ✔ | ✔ | ▲³ | — | — | — |
| Override computed priority rank | — | ✔ | ✔ | ✔ | — | — | — |
| Edit `PriorityModel` weights | — | ✔ | ▲⁵ | — | — | — | — |
| Create/validate dependencies | — | ✔ | ✔ | ✔ | — | — | — |
| **Edit roadmap timing / waves** | — | ✔ | ✔ | — | — | — | — |
| **Create scenarios** | — | ✔ | ✔ | ✔ | — | — | — |
| Promote scenario to baseline | — | ✔ | — | — | — | — | — |
| Enter cost/effort estimates | — | ✔ | ✔ | — | — | — | — |
| Raise open items | — | ✔ | ✔ | ✔ | — | — | — |
| Resolve open items | — | ✔ | ✔ | ▲⁶ | — | — | — |
| **Publish to client** | — | ✔ | — | — | — | — | — |
| Unpublish / retract | — | ✔ | — | — | — | — | — |
| **Generate Board deck** | — | ✔ | ▲⁷ | — | — | — | — |
| Approve Board deck | — | ✔ | — | ▲⁸ | — | — | — |
| Export XLSX / PPTX / PDF | — | ✔ | ✔ | ✔ | ▲⁹ | — | ▲⁹ |
| View published roadmap | — | ✔ | ✔ | ✔ | ✔ | ▲¹⁰ | — |
| View published maturity summary | — | ✔ | ✔ | ✔ | ✔ | ▲¹⁰ | — |
| Submit structured feedback | — | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| Record an executive decision | — | ✔ | ▲¹¹ | — | ✔ | — | — |
| View Board output view | — | ✔ | ✔ | ✔ | ✔ | — | ✔ |
| **View AI confidence / rationale** | — | ✔ | ✔ | ✔ | — | — | — |
| **View open items** | — | ✔ | ✔ | ✔ | — | — | — |
| View audit log | ✔ | ✔ | ▲¹² | ▲¹² | — | — | — |

**Constraints:**
¹ Owner may create engagements only within organizations they belong to.
² Editor may invite client users but the invitation requires Owner approval before activation.
³ Reviewer may edit only to record a review correction; the change is logged as `review_correction` and notifies the original author.
⁴ Editor may approve items authored by *another* Editor, never their own. Self-approval is blocked at the service layer.
⁵ Editor may propose a weight change; it requires Owner confirmation because it forces global recalculation.
⁶ Reviewer may resolve only open items they raised.
⁷ Editor may generate a **draft** Board deck; only Owner may mark it approved.
⁸ Reviewer may sign off on Board content; Owner performs the state transition.
⁹ Client roles may export only published artefacts, watermarked with the published version.
¹⁰ ClientContributor sees only published items **within their assigned scope** (assigned business area or assigned feedback set).
¹¹ Editor may record a decision *on behalf of* a client executive, flagged `recorded_by_proxy` with the attributed decision-maker named.
¹² Editors and Reviewers see the audit log scoped to their engagement only.

## 7.4 Content lifecycle states

Two orthogonal state machines. Conflating them is the most common design error here, so they are kept separate.

**(a) Analytical review state** — applies to Evidence, Finding, MaturityScore, Opportunity, Dependency, ExecutiveInsight:

```
ai_suggested ──accept──> draft ──submit──> in_review ──approve──> approved
     │                     ^                   │                     │
     └──reject──> rejected │                   └──request_changes────┘
                           └───────────edit────────────────────────── (approved → draft, version++)
```

Mirrors the observed `New / In progress / Ready to Review / Reviewed / Final` ladder, with `ai_suggested` prepended and `rejected` added.

**(b) Client visibility state** — applies to publishable artefacts:

```
internal ──publish──> published ──republish──> published (v+1)
    ^                     │
    └────unpublish────────┘
```

**Invariant:** an object may only be published if its review state is `approved`. Enforced at the service layer and by database constraint. Editing an approved object returns it to `draft` and **does not** retract the published snapshot — the client continues to see the last published version until Aberdeen republishes. This directly implements the corpus behaviour where a shared deck remains the client's reference while Aberdeen continues refining.

## 7.5 Enforcement requirements

- **Server-side only.** Every read and write passes an engagement-scoped authorization check in the data-access layer. Client-side role checks are presentation affordances, never security.
- **Default-deny.** Unknown role/action combinations are denied.
- **Field-level redaction.** Client-facing API responses are built by explicit serializers that whitelist fields. Internal fields (`confidence`, `ai_rationale`, `internal_note`, `open_items`, `computed_vs_human_delta`) are never present in a client payload — not hidden by CSS.
- **Snapshot isolation.** Client reads resolve against the published snapshot table, not live working tables. This makes leakage of draft edits structurally impossible rather than filter-dependent.
- **Auditability.** Every state transition, override, publish and export writes an `AuditEvent`.

---

# 8. End-to-End Engagement Journey

This maps the methodology's seven phases onto concrete Atlas activity. Each phase lists inputs, the human/AI division of labour, and the durable objects created.

## Phase 0 — Kickoff + Mobilization (Week 0)

**Objective:** establish mandate, scope, stakeholders, hypotheses.

| Step | Actor | System behaviour |
|---|---|---|
| Create engagement | Owner | Creates `Engagement` under an `Organization`; sets name, client, mandate statement, start/end dates, phase = `kickoff`. Seeds a `PriorityModel` from the firm default (three anchored dimensions at 40/35/25 — **editable**) and a `MaturityFramework` (CMMI v2.0 / SCAMPI C, five anchored levels). |
| Assign team | Owner | Grants roles. |
| Upload initial materials | Editor | Client strategy docs, org charts, project lists → `SourceDocument`. |
| Extract objectives | AI-01 → Editor | Proposes `TransformationObjective` records from strategy material with citations. Consultant accepts/edits. **These become the denominator of priority Dimension 3.** |
| Build stakeholder map | Editor / AI-01 | `Stakeholder` records with name, role, business area, influence, interview status. AI proposes stakeholders named in uploaded documents. |
| Identify gaps | AI-01 | Produces a `DocumentRequest` list — what is referenced but missing. |
| Record hypotheses | Editor | `Hypothesis` objects, later confirmed/refuted by evidence. |
| Define roadmap dimensions | Owner | Confirms/edits `PriorityModel`, `MaturityFramework` capability tree, theme set, effort scale, planning horizon and period granularity. |

**Objects created:** Engagement, PriorityModel, MaturityFramework, TransformationObjective, Stakeholder, Hypothesis, DocumentRequest, SourceDocument.
**Exit criteria:** mandate recorded; ≥1 objective approved; capability tree defined; interview plan populated.

## Phase 1 — Interviews + Fact Gathering (Weeks 1–2)

**Objective:** build the fact base. Corpus scale: *"5 leadership interviews... 10 functional deep-dives"* plus a survey.

| Step | Actor | System behaviour |
|---|---|---|
| Generate interview guides | AI-01 | Tailored per stakeholder using role, business area, open hypotheses and gaps. |
| Upload transcripts/notes | Editor | `SourceDocument{type: transcript}`, linked to `Stakeholder` and interview date. |
| Extract evidence | **AI-02** | Produces `Evidence` in `ai_suggested`: verbatim excerpt, `SourceLocation`, classification (`fact / opinion / metric / risk / constraint / strength`), entity tags, confidence. |
| Review evidence | Editor | Accept / edit / reject / merge in a bulk queue. |
| Cluster themes | **AI-03** | Groups accepted evidence into candidate themes with member IDs and coverage counts. |
| Detect contradictions | **AI-04** | Flags conflicting evidence pairs — evidenced by the corpus's IT-self-perception vs business-need gap and its documented "Core Tensions." |
| Inventory existing initiatives | Editor / AI | Client's in-flight programs → `Opportunity{status: existing}`, matching the corpus's `New / Existing / Updated` provenance field. |
| Ingest survey | Editor | Structured import → `StakeholderFeedback{type: survey}`. |

**Objects:** Evidence, Finding (candidate), ThemeCluster, Contradiction, Opportunity (existing), StakeholderFeedback.
**Exit criteria:** all planned interviews ingested; evidence review queue cleared; contradictions triaged.

## Phase 2 — Current State Maturity + Prioritization Build (Weeks 3–4)

The analytical heart. Produces both workbooks' content.

| Step | Actor | System behaviour |
|---|---|---|
| Define capability tree | Editor | `Capability` records under `TechnologyFunction`. |
| Propose maturity | **AI-05** | For each capability: `current_level` + anchor + rationale + evidence IDs + confidence + observed gaps. Never writes `gap` or `maturity_label` — those are calculated. |
| Set target maturity | Editor/Owner | Per-capability deliberate choice with rationale (corpus: L3 baseline, L4 for differentiation, L5 not targeted). |
| Calculate gaps | **CALC-01** | `gap = target − current`; `maturity_label = CHOOSE(current)`. |
| Author findings | Editor / AI | `Finding` with `category`, `polarity` (`strength/gap/tension/risk`), evidence links. **Polarity is required** — the corpus balances gaps with an explicit strengths slide. |
| Generate opportunities | **AI-06** | Candidate `Opportunity` from capability gaps and findings: title, description, recommended action (imperative), tech area, business area, linked findings/evidence. |
| Detect duplicates | **AI-07** | Merge/split candidates with similarity rationale — the systematic answer to *"Is PIM counted 3 times?"* |
| Group into initiatives | Editor / AI | Assign opportunities to `Initiative`; assign initiatives to `Theme`. Corpus method: *"grouped by natural dependency and ownership."* |
| Score opportunities | **AI-08** → Editor | Proposes all three dimension levels with anchor, rationale, evidence. Consultant adjusts. |
| Compute priority | **CALC-02/03/04** | Weighted score, band, quadrant axes, quadrant, initiative rollup. |
| Infer dependencies | **AI-09** | Proposes `Dependency` records from prose. |

**Exit criteria:** every capability scored and reviewed; every opportunity has three scored dimensions and an initiative; no unresolved duplicate candidates; priority calculations current.

## Phase 3 — V1 Technology Roadmap (Week 5)

| Step | Actor | System behaviour |
|---|---|---|
| Size initiatives | Editor | `tshirt_size` per initiative/opportunity → **CALC-05** derives `duration_periods`. |
| Generate first-cut sequence | **CALC-06 + AI-10** | Deterministic: topological order under dependencies, theme sequence, priority band, quadrant. AI produces the *rationale narrative* only. |
| Create RoadmapVersion | Editor | Immutable-on-supersede `RoadmapVersion{label: "V1", type: technology}` with `RoadmapItem` per initiative. |
| Assign waves | Editor / CALC-07 | `RoadmapWave` with label, period range, target outcomes. |
| Detect conflicts | **CALC-08** | Dependency violations, cycles, capacity flags (P1), infeasible timing. |
| Record assumptions | Editor | `Assumption` objects; sequencing assumptions link to items. |
| Identify decisions | Editor / AI | `Decision{status: required}` — corpus: *"Set Q3 2026 decision deadline"*, *"Make platform decision by mid-2026"*. |

**Exit criteria:** V1 exists with every initiative placed; zero unacknowledged hard-dependency violations.

## Phase 4 — Investment, Cost + Capacity Modeling (Weeks 6–8) — **P1**

**⚠ Not evidenced in the corpus.** Data contracts are defined; formulas are flagged. In the MVP this phase is present but optional, and the UI states clearly what is unestimated.

| Step | Actor | System behaviour |
|---|---|---|
| Enter cost estimates | Editor | `CostEstimate{low, base, high, currency, basis, confidence}` per initiative. Manual in P0/P1. |
| Phase costs | CALC-09 (P1) | Distribute across the item's periods. **⚠ Distribution method (linear / front-loaded / milestone) is a Decision Required.** |
| Resource demand | Editor | `ResourceRequirement{role, fte, period_range}`. |
| Capacity check | CALC-10 (P1) | Demand vs `ResourceCapacity`. Corpus supports the *need* (resource contention as top barrier) but not the *model*. |
| Value case | Editor | `BusinessValue`. **⚠ Quantified value model is a Decision Required.** Corpus expresses value ordinally via Dimension 1 bands. |

**MVP behaviour with no data:** display **"Cost not yet estimated"** plus the list of initiatives lacking estimates. Never `$0`. Never a fabricated total.

## Phase 5 — Business Alignment + Roadmap Refinement (Weeks 9–10)

The workshop phase — fully evidenced.

| Step | Actor | System behaviour |
|---|---|---|
| Publish for feedback | Owner | Publishes a scoped snapshot to ClientContributors. |
| Blind ranking (Activity 1) | ClientContributor | Groups select top N. **Aberdeen's ranking is hidden until released.** |
| Reveal & compare | Owner | Releases consultant ranking; system renders the divergence view. |
| Urgency (Activity 2) | ClientContributor | Urgency level + business domain per initiative. |
| Dependencies/milestones/size (Activity 3) | ClientContributor | Proposes dependencies (multi-select), milestones, T-shirt size → `ai_suggested`-equivalent `proposed` state for Aberdeen validation. |
| Roadmap placement (Activity 4) | Owner (facilitated) | Live edits to a working roadmap version. |
| Synthesize feedback | **AI-11** | Clusters feedback, surfaces disagreement, sentiment by stakeholder/business area. |
| Impact analysis | **CALC-11** | For each requested change, computes the downstream impact set before it is accepted. |
| Reconcile | Owner/Editor | Records `human_rank` with mandatory rationale; both values persist. |
| Log decisions | Owner | `Decision{status: made}` with decision-maker, date, rationale, affected objects. |
| Create V2 | Owner | `RoadmapVersion{label: "V2", type: business_aligned}`. |

**Exit criteria:** all feedback triaged; divergences resolved or explicitly accepted as open; V2 created; decision log current.

## Phase 6 — Final Roadmap + Board Narrative (Weeks 10–12)

| Step | Actor | System behaviour |
|---|---|---|
| Finalize roadmap | Owner | `RoadmapVersion{label: "Final", status: approved}`. |
| Generate executive insights | **AI-12** | `ExecutiveInsight` bound to calculated values via `CalculatedFieldRef` — never literals. |
| Draft Board storyline | **AI-13** | `BoardSlide` sequence following the required storyline (§27), each with `data_bindings`. |
| Review & edit | Owner/Reviewer | Edit headlines and messages; numbers are read-only projections. |
| Governance & asks | Owner | `Decision{status: board_ask}`; transformation governance model. |
| 90-day activation plan | Owner | `ActivationItem` records — evidenced by the post-Board deck's mobilization table. |
| Generate deck | Owner | `BoardDeckVersion` with `roadmap_version_id`, `generated_at`, slide bindings. |
| Publish | Owner | Board output view + PPTX export. |
| Monitor staleness | **CALC-12** | Any later roadmap change marks affected slides stale with counts and identities. |

**Exit criteria:** Board deck generated from the approved version; every number traceable; stale-slide monitor active.

## 8.1 Journey diagram

```
 W0  Kickoff ──> Objectives · Stakeholders · Capability tree · PriorityModel
                        │
 W1-2 Fact Gathering ──> SourceDoc → [AI-02] Evidence → Findings → ThemeClusters
                        │                                    └─> Contradictions
 W3-4 Diagnose ────────> Capabilities ─[AI-05]─> MaturityScore ─[CALC-01]─> Gap
                        │                                            │
                        │                          ┌─────────────────┘
                        └─> [AI-06] Opportunities ─┴─[AI-08]─> Dim scores
                                    │                              │
                             [AI-07] dedupe              [CALC-02..04]
                                    │                              │
                                    └──> Initiative ──> Theme <────┘
 W5   V1 Roadmap ──> [AI-09] Dependencies ─> [CALC-05..08] ─> RoadmapVersion V1
                        │
 W6-8 Economics (P1) ──> CostEstimate · ResourceRequirement ─> [CALC-09/10]
                        │
 W9-10 Alignment ─────> Publish ─> ClientContributor input ─> [AI-11] synthesis
                        │            (blind rank → reveal → divergence)
                        └─> [CALC-11] impact ─> Decisions ─> RoadmapVersion V2
                        │
 W10-12 Board ────────> [AI-12] Insights ─> [AI-13] BoardSlides ─> BoardDeckVersion
                                                          └─> [CALC-12] staleness
```
---

# 9. Application Information Architecture

## 9.1 Top-level structure

```
/                                   Sign-in
/engagements                        Engagement selector (role-filtered)
/e/{engagementId}/…                 Aberdeen Workspace (A) + Review (B)
/client/{engagementId}/…            Client Executive interface (C)
/input/{engagementId}/…             Stakeholder Input interface (D)
/board/{engagementId}/{deckId}      Board Output view (E)
/admin/…                            Platform administration
```

Four separate application shells: `workspace`, `client`, `input`, `board`. They share the data layer and design system but **not** navigation, layout, or serializers. This separation is the primary defence against internal content leaking into client views — a client shell has no route that can render an internal object.

## 9.2 Naming rationale

Navigation labels are derived from the corpus's own vocabulary rather than generic product conventions:

| Chosen label | Source | Rejected alternative & why |
|---|---|---|
| **Overview** | Slide 6's engagement timeline; the need for a control centre | "Dashboard" — implies passive metrics; this surface is action-oriented |
| **Sources & Evidence** | Workbook `Source` column; `Evidence:` prefixes | "Documents" — hides the evidence layer, which is the valuable object |
| **Current State** | Deck section title *"Current State Assessment"*; sheet name `Technology Maturity Assessment` | "Maturity" — too narrow; this area also holds findings, tensions, benchmark |
| **Opportunities** | Sheet name; slide 35 *"Technology Opportunities: A Prioritized View"* | "Initiatives" — wrong grain. The corpus is unambiguous that the **opportunity** is the unit of prioritization |
| **Initiatives & Themes** | Slide 40's three-level model; `Themes & Initiatives` sheet | Merging with Opportunities — would collapse a hierarchy the method depends on |
| **Roadmap** | Deck titles throughout | — |
| **Economics** | Methodology Weeks 6–8 | "Cost" — narrower than investment + capacity + value |
| **Scenarios** | Methodology; *"scenario comparisons"* | — |
| **Alignment** | Methodology Weeks 9–10; the workshop | "Feedback" — understates the reconciliation work |
| **Decisions** | *"Critical decisions requiring near-term direction"*; `Decision log` in methodology outputs | Folding into Alignment — decisions outlive the workshop |
| **Board Output** | Slide 6 *"Board Mtg"* | "Presentations" — too generic |

## 9.3 Workspace navigation (Interfaces A + B)

Persistent left rail. Engagement context (client name, phase, current roadmap version, unpublished-change count) is pinned to the header on every route.

| # | Area | Route | Primary purpose | Roles |
|---|---|---|---|---|
| 1 | **Overview** | `/e/{id}` | Control centre; state of the engagement; next action | All Aberdeen |
| 2 | **Sources & Evidence** | `/e/{id}/sources` | Ingest documents; review extracted evidence | Owner, Editor, Reviewer(r) |
| 3 | **Current State** | `/e/{id}/current-state` | Maturity assessment, findings, tensions, benchmark | Owner, Editor, Reviewer |
| 4 | **Opportunities** | `/e/{id}/opportunities` | The scored register — the analytical core | Owner, Editor, Reviewer |
| 5 | **Initiatives & Themes** | `/e/{id}/initiatives` | Grouping, rollups, theme sequence | Owner, Editor, Reviewer |
| 6 | **Roadmap** | `/e/{id}/roadmap` | Roadmap Studio; sequencing, waves, dependencies | Owner, Editor, Reviewer(r) |
| 7 | **Economics** | `/e/{id}/economics` | Cost, resources, value (P1) | Owner, Editor |
| 8 | **Scenarios** | `/e/{id}/scenarios` | Alternatives vs preserved baseline | Owner, Editor, Reviewer |
| 9 | **Alignment** | `/e/{id}/alignment` | Feedback, divergence, reconciliation | Owner, Editor, Reviewer |
| 10 | **Decisions** | `/e/{id}/decisions` | Decision log, required decisions, Board asks | Owner, Editor, Reviewer |
| 11 | **Board Output** | `/e/{id}/board` | Storyline, slide builder, versions, staleness | Owner, Editor(draft) |
| 12 | **Publishing** | `/e/{id}/publishing` | What is client-visible; publish/retract | Owner |
| 13 | **Review Queue** | `/e/{id}/review` | **Interface B** — everything awaiting approval | Owner, Reviewer |
| 14 | **Settings** | `/e/{id}/settings` | PriorityModel, framework, team, horizon | Owner |

**Interface B is route #13 plus review affordances everywhere**, not a separate shell. Justification: the corpus shows review as a *state* on the same rows consultants edit (`Ready to Review`, `Reviewed`), not as a separate artefact. A Reviewer opening `/e/{id}/opportunities` sees the same grid with approve/reject/challenge controls and edit controls suppressed.

## 9.4 Area specifications

For each area: purpose · users · data · editing · AI · downstream dependencies.

---

### 9.4.1 Overview
- **Purpose:** answer "where is this engagement and what should I do next?" in one screen.
- **Users:** all Aberdeen roles.
- **Data:** engagement identity and mandate; phase and elapsed/remaining; per-area completion; outstanding `DocumentRequest`s; interviews complete vs planned; unresolved `Assumption`s and `OpenItem`s; low-confidence findings count; current roadmap version; unpublished changes; recent decisions; recent activity; recommended next action.
- **Editing:** none direct — navigational.
- **AI:** `AI-14 Next Best Action` proposes the highest-value next step with reasoning (e.g. *"9 opportunities lack Dimension 2 scores — priority bands for 2 initiatives are provisional"*).
- **Downstream:** none (read-only projection).

---

### 9.4.2 Sources & Evidence
- **Purpose:** turn files into reviewed, source-anchored evidence.
- **Users:** Owner, Editor (full); Reviewer (read).
- **Data:** `SourceDocument` list (name, type, size, uploaded by/at, processing status, extracted-object counts, linked stakeholder/date); document structure viewer (workbook→sheet→cell; deck→slide→shape; PDF→page); `Evidence` queue with excerpt, location, classification, confidence, tags; `DocumentRequest` list.
- **Editing:** upload, delete, re-process, retag; accept/edit/reject/merge evidence; manual evidence creation with location; link evidence to findings/capabilities/opportunities.
- **AI:** `AI-02` extraction; `AI-03` clustering; `AI-04` contradiction detection; `AI-01` missing-document identification.
- **Downstream:** Evidence feeds Findings → Maturity → Opportunities → everything. **This is the root of the lineage graph.**

---

### 9.4.3 Current State
Three tabs.

**(a) Maturity Assessment** — the primary grid.
- **Data:** capability rows grouped by technology function; current/target/gap; maturity label; status; rationale; evidence count; priority-to-fix; linked opportunities.
- **Editing:** current/target level with mandatory rationale; state transitions; add findings; link evidence. `gap` and `maturity_label` are **read-only calculated**.
- **AI:** `AI-05` level proposal with anchor, rationale, evidence, confidence; `AI-15` current-state summary drafting.
- **Views:** heatmap (function × focus area, colour = current level, overlay = gap), table, and drill-down detail with evidence panel.

**(b) Findings** — categorized, polarity-tagged findings with evidence links and approval state.

**(c) Benchmark (P1)** — domain vs North Star on a Lagging→Leading scale with attributes and the mandatory subjectivity disclaimer.

- **Downstream:** capability gaps generate opportunity candidates; maturity scores feed Board exhibits and the client maturity summary.

---

### 9.4.4 Opportunities
- **Purpose:** the scored register — the analytical core and highest-traffic surface.
- **Users:** Owner, Editor (full); Reviewer (approve/challenge).
- **Data:** every field in §17 — identity, hierarchy, classification, three dimension scores with anchors, calculated score/band/quadrant, effort, provenance, links, state.
- **Editing:** full CRUD; inline dimension scoring via anchor picker; bulk operations (assign initiative, set effort, transition state); merge/split; **no editing of calculated fields**.
- **AI:** `AI-06` generation; `AI-07` duplicate detection; `AI-08` scoring proposal; `AI-16` recommended-action drafting.
- **Views:** grid (default), quadrant chart, priority×effort heat map, grouped-by-theme summary.
- **Downstream:** feeds initiative rollups, roadmap items, quadrant/heat-map exhibits, theme summary slides, client backlog, Board content.

---

### 9.4.5 Initiatives & Themes
- **Purpose:** manage the grouping layer and its rollups.
- **Data:** themes with sequence, description, colour; initiatives with theme FK, owner, business area, tech area, T-shirt size, **calculated** average score, child opportunity count, dependency counts, rename history.
- **Editing:** create/rename/reorder themes; move initiatives between themes; move opportunities between initiatives; set size and owner. `avg_score` is read-only.
- **AI:** `AI-17` grouping proposal ("these three opportunities share dependency and ownership").
- **Downstream:** theme sequence → wave ordering; initiative rollup → theme summary exhibits; initiative is the unit placed on the roadmap.

---

### 9.4.6 Roadmap (Roadmap Studio)
- **Purpose:** the interactive sequencing environment. Full spec in §20.
- **Data:** roadmap version metadata; items with wave, start/end period, duration, lane; dependency edges; conflicts; overlays.
- **Editing:** drag to reschedule; assign waves; change lanes; adjust duration; accept/override conflicts; create a new version.
- **AI:** `AI-10` sequencing rationale; `AI-18` alternative-sequence suggestion (proposal only — never auto-applied).
- **Downstream:** **the highest-fan-out object in the system.** Changes propagate to scenarios, economics phasing, executive insights, Board slides, client view.

---

### 9.4.7 Economics (P1)
- **Purpose:** investment, capacity, value.
- **Data:** cost estimates (low/base/high) with basis and confidence; phased cost by period; resource requirements and capacity; value assumptions; coverage indicators.
- **Editing:** manual estimate entry; capacity entry; assumption management.
- **AI:** `AI-19` analogue-based cost range proposal from prior engagements — **P2, and only with explicit opt-in and de-identification** (§13).
- **Empty-state rule:** show "Cost not yet estimated" and name what is missing. Never `$0`, never an extrapolated total.

---

### 9.4.8 Scenarios
- **Purpose:** compare alternatives against a preserved baseline. Full spec in §22.
- **Data:** scenario list with parent baseline, constraint set, change list; side-by-side comparison of composition, timing, conflicts, coverage.
- **Editing:** create by duplication; modify constraints and item timing; remove/defer items; annotate; promote to baseline (Owner only).
- **AI:** `AI-20` scenario narrative — describes differences the engine calculated.

---

### 9.4.9 Alignment
- **Purpose:** run and reconcile the workshop; the divergence surface.
- **Data:** feedback by stakeholder/group/business area; blind-rank sets; consultant vs client ranking comparison; urgency proposals; proposed dependencies; sentiment and theme clusters; reconciliation status.
- **Editing:** release consultant ranking (the "reveal"); accept/reject proposed dependencies and urgency; record `human_rank` with rationale; triage feedback.
- **AI:** `AI-11` feedback synthesis; `AI-04` contradiction detection across stakeholders.
- **Downstream:** human ranks and accepted proposals feed the roadmap and V2.

---

### 9.4.10 Decisions
- **Purpose:** the decision log and outstanding asks.
- **Data:** decision text, type (`required / made / board_ask`), owner, due/decided date, rationale, affected objects, status.
- **Editing:** create, assign, record outcome, link to objects.
- **AI:** `AI-21` extracts candidate decisions from evidence and recommended actions (corpus: *"Set Q3 2026 decision deadline"*).
- **Downstream:** feeds client Decisions panel and the Board asks slide.

---

### 9.4.11 Board Output
- **Purpose:** build, version, and monitor the Board package. Full spec in §27–28.
- **Data:** storyline outline; slides with type, headline, message, data bindings, review state; deck versions with source roadmap version, generation time, staleness report.
- **Editing:** edit headlines/messages; reorder/add/remove slides; approve; generate; export. **Bound numbers are not editable.**
- **AI:** `AI-12` insights; `AI-13` storyline and headlines.

---

### 9.4.12 Publishing
- **Purpose:** the internal→external gate.
- **Data:** publishable artefact list with review state, publish state, last published version/time, diff since last publish; audience scoping.
- **Editing:** select artefacts, preview exactly as the client will see, publish, retract.
- **AI:** none. Deliberate — publishing is a governance act.

---

### 9.4.13 Review Queue (Interface B)
- **Purpose:** everything awaiting this reviewer, in one place.
- **Data:** grouped by object type; author; submitted date; confidence; evidence sufficiency; open items raised.
- **Editing:** approve, request changes, reject, raise open item, correct-with-log.
- **AI:** `AI-22` review-risk flagging (low evidence, high divergence from analogues, unusual score patterns).

---

### 9.4.14 Settings
PriorityModel (dimensions, weights, anchors, band thresholds, quadrant labels/thresholds); MaturityFramework (levels, anchors, capability tree); effort scale and duration mapping; planning horizon and period granularity; team and roles; engagement metadata and phase.
**Weight changes force global recalculation and a `PriorityModel` version bump, with an explicit confirmation showing how many items change band.**

## 9.5 Client Executive interface (C)

```
/client/{id}                 Overview — mandate, phase, headline state
/client/{id}/current-state   Published maturity summary + key findings
/client/{id}/roadmap         Published roadmap (read-only, filterable)
/client/{id}/initiatives     Published initiative detail
/client/{id}/investment      Investment view (P1; hidden if unestimated)
/client/{id}/scenarios       Published scenario comparison
/client/{id}/decisions       Decisions requiring client input
/client/{id}/changes         What changed since last publication
/client/{id}/board           Link to Board output if published
```

Never present: evidence internals, AI confidence, open items, draft versions, rejected items, divergence internals, audit log.

## 9.6 Stakeholder Input interface (D)

```
/input/{id}                     Assigned tasks
/input/{id}/rank                Activity 1 — blind top-N ranking
/input/{id}/urgency             Activity 2 — urgency + domain
/input/{id}/dependencies        Activity 3 — dependencies, milestones, size
/input/{id}/comment/{itemId}    Free-text validation on a specific item
/input/{id}/submitted           Confirmation + what happens next
```

Deliberately minimal: single-purpose task pages, no navigation into the model, no visibility of other groups' input until released. The blind-ranking guarantee is enforced server-side.

## 9.7 Board Output interface (E)

```
/board/{id}/{deckId}            Full-screen narrative view
/board/{id}/{deckId}/{slideNo}  Deep link to a slide
```

Read-only, presentation-grade, keyboard-navigable, printable, exportable to PPTX. Renders the approved `BoardDeckVersion` only. If stale, an internal viewer sees a staleness banner; a `BoardViewer` sees the deck as published at its version stamp.

---

# 10. Detailed Interface Specifications

Layout, component, state and interaction requirements. Visual design language is not prescribed beyond structure and behaviour.

## 10.1 Global shell (workspace)

**Header (fixed, 56px):** Aberdeen mark → engagement switcher (client name + engagement) → phase chip → roadmap version chip → unpublished-changes badge → global search → AI Copilot toggle → user menu.

**Left rail (240px, collapsible to 56px):** the 14 areas, with per-area status dots — grey (not started), amber (in progress), blue (in review), green (approved/current), red (conflict or blocked).

**Content region:** breadcrumbs (`Engagement / Area / Object`); page title with primary action; content; contextual right panel (420px, dismissible) for detail, evidence, or AI proposals.

**Persistent context requirement:** client name, phase, and active roadmap/scenario are visible on **every** workspace route. When a scenario (not baseline) is active, the entire shell carries a distinct accent border and a persistent "Scenario: {name} — not the baseline" banner. This prevents the classic error of editing a scenario believing it is the baseline.

**Save behaviour:** inline edits autosave on blur with an optimistic update and a subtle "Saved HH:MM" indicator; failures roll back visibly with a retry affordance. Structural actions (create version, publish, generate deck, merge, promote scenario) are explicit and confirmed. Destructive actions require typed confirmation and are soft-deleted with restore for 30 days.

**Concurrency:** optimistic locking via row version. On conflict, present a three-way view (yours / theirs / current) rather than silently overwriting.

## 10.2 Engagement Overview (control centre)

Minimum valuable experience — five zones:

**Zone 1 — Mandate strip.** Client, engagement name, mandate statement (2–3 lines, editable by Owner), start/end, phase with progress through the 7 phases, engagement lead.

**Zone 2 — Readiness by phase.** One row per methodology phase: status, completion %, key output, blocking count. Completion is computed from concrete counts, not self-reported (e.g. Diagnose % = capabilities reviewed / total, opportunities scored / total).

**Zone 3 — Attention required.** Ranked list, each item clickable to its object:
- Outstanding document requests (n)
- Interviews planned vs ingested (n/m)
- Evidence awaiting review (n)
- Findings below confidence threshold (n)
- Opportunities missing ≥1 dimension score (n)
- Unresolved open items (n)
- Unvalidated AI-proposed dependencies (n)
- Dependency conflicts on the current roadmap (n)
- Approved-but-unpublished changes (n)
- Stale Board slides (n)

**Zone 4 — Current state of outputs.** Roadmap version + created date + approval state; last publication time + what was published; Board deck version + staleness; active scenarios (n).

**Zone 5 — Recommended next action** (AI-14). A single sentence with reasoning and a direct link. Dismissible; regenerated on load.

**Empty state (new engagement):** replaces Zones 2–5 with a four-step setup checklist — define mandate → upload initial materials → confirm capability tree → confirm priority model.

## 10.3 Sources & Evidence

**Left:** document list with type icon, processing status, extraction counts, filters (type, status, stakeholder, date).
**Centre:** structure-preserving viewer —
- XLSX: sheet tabs → grid with formulas revealed on hover; selecting a cell/range creates an evidence anchor.
- PPTX: slide thumbnails → slide render with shape outlines; selecting a shape or table cell creates an anchor.
- PDF/DOCX: paginated text with selectable ranges.
**Right:** evidence panel for the current selection, or the review queue.

**Evidence review queue:** card per item — verbatim excerpt, source location chip (clickable, scrolls the viewer to the exact location), classification, entity tags, confidence bar, proposed links. Actions: Accept · Edit · Reject · Merge with… · Create Finding from this. Bulk select with keyboard (`j/k` navigate, `a` accept, `x` reject, `e` edit).

**Processing states:** `queued` (with position) · `parsing` (with progress) · `extracting` · `ready` (with counts) · `failed` (with reason, retry, and manual-anchor fallback) · `partial` (some sheets/slides failed; names the failures).

## 10.4 Current State — maturity interface

Full requirements in §16. Interface essentials:

**Heatmap view.** Rows = technology functions (collapsible to focus areas); columns = the five maturity levels; each capability rendered as a cell/bar showing current with a target marker and the gap. Colour encodes current level; a toggle switches encoding to gap size. Cell badges: evidence count, confidence indicator, review state, priority-to-fix.

**Drill-down (right panel or full page).** Capability name and function; current level with anchor label and full anchor text; target level with rationale; **calculated** gap and label rendered as read-only with a "calculated" affordance; current-state summary; rationale; evidence list with clickable source locations; observed gaps; next steps; linked opportunities; state controls; open items.

**Editing.** Level changes use an anchor picker showing all five anchors with organization-specific text — selecting an anchor sets `{level, anchor_label, anchor_text}` together. A free rationale field is mandatory on any override of an AI proposal.

**AI proposal display.** Proposed level shown alongside the current value with a visible diff, confidence, rationale, and citation list. Accept / Accept with edit / Reject with reason.

**Required visual affordances:** calculated fields carry a distinct treatment (muted background + calculator glyph) and cannot receive focus for editing; AI-suggested values carry a distinct chip until accepted; low-confidence items (< threshold) carry a warning chip.

## 10.5 Opportunities grid

The most heavily used surface. Requirements:

- **Virtualized table**, target 500+ rows without degradation.
- **Column set** (configurable, persisted per user): ID · Title · Theme (derived, read-only) · Initiative · Tech Area · Business Area · D1 · D2 · D3 · **Weighted Score** · **Band** · **Quadrant** · T-shirt · Span · Investment Type · Relationship Type · Objectives · Status · Review State · Evidence count · Dependencies (in/out) · Owner · Human Rank · Divergence.
- **Grouping:** by Theme, Initiative, Tech Area, Business Area, Band, Quadrant. Group headers show count and **calculated** average score.
- **Sorting:** any column, multi-level.
- **Filtering:** faceted, with saved views. Required quick filters: *Missing scores*, *Low confidence*, *AI-suggested (unreviewed)*, *High divergence*, *No evidence*, *Duplicate candidates*, *Not on roadmap*.
- **Inline editing:** dimension scores via anchor picker popover; text fields inline; calculated cells non-editable with an explanatory tooltip.
- **Bulk actions:** assign initiative/theme · set effort · set investment type · transition review state · request AI scoring · export selection.
- **Row expansion:** opens the detail panel without losing grid position.
- **Score display:** each dimension cell shows the integer with the anchor label on hover and rationale in the detail panel. **A dimension cell showing a bare number with no anchor is a validation error, not a valid state.**

**Alternative views** (same data, tab-switched): Quadrant chart (X = business value, Y = urgency, size = weighted score, colour = theme; brush-select to filter; click to open detail) · Priority×Effort heat map (score band rows × effort columns, cells coloured by investment type, items listed in-cell) · Theme summary (grouped tables mirroring the corpus's theme slides).

## 10.6 Opportunity / Initiative detail

Sectioned panel or full page. Section order mirrors how the corpus documents an item:

1. **Header** — ID, title, theme→initiative breadcrumb, review state, publish state, actions.
2. **What & why** — description; problem addressed; "So What (Why It Matters)" (a corpus column, retained verbatim as a field); recommended action (imperative, validated).
3. **Classification** — tech area, business area, relationship type, investment type, status provenance (`new/existing/updated`).
4. **Strategic alignment** — linked `TransformationObjective`s; this is the visible basis for Dimension 3.
5. **Scoring** — three dimensions each with level, anchor label, anchor text, rationale, evidence links, source (AI/human), confidence. Then the calculated block: weighted score, band, quadrant axes, quadrant — each with a "how was this calculated?" expander showing the formula with substituted values.
6. **Priority reconciliation** — computed rank vs human rank vs client rank, divergence, override rationale, history.
7. **Effort & timing** — T-shirt size (with the duration/risk band displayed), span, derived duration, roadmap placement, wave.
8. **Dependencies** — inbound/outbound with type, rationale, confidence, validation state; conflict flags.
9. **Evidence & findings** — linked findings and evidence with clickable source locations.
10. **Stakeholder feedback** — comments, urgency proposals, rank submissions by group.
11. **Economics (P1)** — cost range, basis, resources, value; or the explicit "not yet estimated" state.
12. **Decisions & assumptions** — linked records.
13. **Open items** — internal only, with a visible "not client-visible" marker.
14. **Activity** — version history: what changed, who, when, downstream impact.

## 10.7 Review Queue (B)

Grouped by object type with counts. Each row: object, author, submitted, confidence, evidence sufficiency (✓/⚠), AI-flagged risks. Detail opens the object in read mode with review controls. Bulk approve permitted **only** for items above a confidence threshold with sufficient evidence — and this behaviour is configurable and audited.

## 10.8 Client Executive interface (C)

**Design intent:** decision usefulness over analytical detail. Sparse, confident, no jargon.

- **Overview:** mandate; phase; three-to-five headline statements (published `ExecutiveInsight`s); "what needs your decision" count; "what changed since {date}" count.
- **Current State:** published maturity summary as a simplified heatmap (function level, no focus-area drill unless published) with the SCAMPI-C caveat rendered; key findings by category, strengths included.
- **Roadmap:** read-only timeline with waves, themes, initiatives; filter by theme/business area/wave; click for published initiative detail; dependency lines toggle.
- **Initiatives:** published detail only — description, why it matters, recommended action, objectives, timing, wave, business outcomes, dependencies. **No scores unless explicitly published** (⚠ Decision Required — see §39 OQ-11).
- **Investment (P1):** hidden entirely if unestimated. Never a zero.
- **Scenarios:** side-by-side comparison of published scenarios with a plain-language difference summary.
- **Decisions:** what is being asked, by when, why it matters, and a Record Decision action.
- **Changes:** an accessible diff since last publication — "3 initiatives moved, 1 added, 2 re-sequenced" with per-item explanation.

## 10.9 Stakeholder Input interface (D)

One task per screen; progress indicator; no model navigation.

- **Rank (Activity 1):** a card set for the assigned scope. Cards show initiative name (bold) and opportunity (italic) — matching the corpus's card format — with an expander for detail. Drag or click to place top N. Confirm. **Aberdeen's ranking is not fetched by the client until released**, enforced server-side.
- **Urgency (Activity 2):** per item, an urgency selector and business-domain selector with definitions inline.
- **Dependencies (Activity 3):** multi-select "this depends on…" from the assigned set, plus milestones and T-shirt size with the size table shown.
- **Comment:** targeted validation prompts (does this reflect your reality? what is missing? what is the business impact?).
- **Submitted:** confirmation and what Aberdeen will do next.

Mobile/tablet responsive is **required here** — workshop participants use whatever is in the room.

## 10.10 Board Output interface (E)

Full-bleed slide view; keyboard navigation (←/→, `f` fullscreen, `g` grid); slide grid overview; print/PDF; PPTX export. Every numeric element carries an invisible binding reference; internal viewers get a "show bindings" toggle that reveals the source of every number — a powerful rehearsal aid before a Board meeting.

## 10.11 Cross-cutting experience requirements

| Requirement | Specification |
|---|---|
| Engagement context | Client, phase, version visible on all workspace/client routes |
| Breadcrumbs | Any route ≥2 levels deep |
| Calculated field treatment | Visually distinct, non-editable, formula expander on demand |
| AI provenance | `AI suggested` chip persists until human action; after acceptance, `Reviewed by {name}` |
| Confidence | Shown for every AI output; below-threshold items carry a warning chip |
| Empty states | Always state what is missing and offer the action that fills it |
| Loading | Skeletons for structure; determinate progress for ingestion/AI with cancel |
| Errors | Plain language, cause, and recovery action; never a raw stack trace |
| Keyboard | Full navigation of grids and review queues |
| Accessibility | WCAG 2.1 AA; colour never the sole encoder of maturity/priority (pair with numerals and patterns) |
| Responsive | Workspace ≥1280px optimal, ≥1024px usable; Client and Board fully responsive; Input mobile-first |

---

# 11. File Ingestion Requirements

## 11.1 Principle

> **Structure must survive ingestion.** A workbook is not text. A deck is not text. The corpus's meaning lives in *which cell*, *which formula*, *which slide*, *which table row* — and an evidence citation is worthless if it cannot point back to that location.

Flattening files into a text blob for RAG is explicitly prohibited as the primary path. Text extraction happens *within* a preserved structural tree.

## 11.2 Supported types (P0)

| Type | Extensions | Priority | Notes |
|---|---|---|---|
| Excel | `.xlsx`, `.xlsm` | P0 | Highest analytical value |
| PowerPoint | `.pptx` | P0 | Highest narrative value |
| PDF | `.pdf` | P0 | Text-layer; OCR is P2 |
| Word | `.docx` | P0 | Transcripts, memos |
| Plain text / Markdown | `.txt`, `.md` | P0 | Transcripts, notes |
| CSV | `.csv` | P0 | Tabular imports |
| Images | `.png`, `.jpg` | P2 | Requires vision extraction |

**Limits:** 100 MB per file (the corpus's largest is ~8.8 MB, so this is generous); 50 files per upload batch. Files exceeding limits are rejected with a clear message.

## 11.3 Pipeline

```
Upload → Virus scan → Store blob → Create SourceDocument (status: queued)
      → Structural parse  → SourceStructure tree persisted
      → Text/table normalization
      → AI extraction (AI-02) → Evidence (ai_suggested)
      → Index for retrieval
      → status: ready
```

**Background execution is mandatory.** Parsing and extraction must not block the request. On Vercel this means a queue-backed worker or a durable background function — **⚠ see §33 for the platform decision.** The UI polls or subscribes for status.

**Idempotency:** re-processing a document replaces its `SourceStructure` and its *unreviewed* `ai_suggested` evidence, and **never** deletes accepted/approved evidence. Accepted evidence whose anchor no longer resolves is flagged `anchor_broken` for human repair rather than silently dropped.

## 11.4 Excel parsing requirements

Preserve the workbook object graph:

```
Workbook
 └─ Sheet (name, index, visibility, dimensions)
     ├─ Cell (address, row, col, value, formatted_value, formula,
     │        data_type, number_format, style_hints)
     ├─ DetectedTable (header_row, data_range, column_headers, row_count)
     ├─ NamedRange
     ├─ DataValidation (dropdown option lists)
     ├─ ConditionalFormat (rule, range)   [P1]
     └─ ExternalReference (target workbook, range)
```

**Required capabilities, each justified by the corpus:**

| Capability | Why (corpus evidence) |
|---|---|
| **Retain formulas as text alongside values** | The scoring model is *only* recoverable from `=SUMPRODUCT(...)` and `=IF(N7>=4.5,...)`. Values alone lose the method. |
| **Detect header rows below row 1** | Real headers sit at rows 4, 5, 6 and 7 in the corpus sheets, under title and weight rows. Naive row-1 header assumption fails on every sheet. |
| **Capture the weights band** | Weights live in a separate band above the header (`0.4 / 0.35 / 0.25`) referenced absolutely. |
| **Recognize hidden helper columns** | `Growth Ranking Hidden` etc. carry `=VALUE(LEFT(x,1))`. Their presence reveals the score-as-string pattern. |
| **Parse dropdown validation lists** | Status vocabularies (`New / In progress / Ready to Review / Reviewed / Final`) are stored as validation lists, not cell values. |
| **Detect cross-workbook references** | `[1]Opportunities!$J$5:$N$5` reveals a dependency between the two workbooks. Must be surfaced to the user as an unresolved external link. |
| **Handle modern functions** | `_xlfn.LET`, `_xlfn.XLOOKUP`, `_xlpm.*` appear in the corpus. The parser must not crash on unknown function tokens; it stores them as text. |
| **Multi-line cell content** | Header labels contain newlines (`"Weighted Score\n(Formula)"`); scores contain multi-sentence anchor text. Preserve exactly. |
| **Blank-row-delimited sub-tables** | One sheet holds a matrix grid *and* a ranked list separated by blank rows. Detect multiple tables per sheet. |

**Semantic recognition (AI-assisted, P0):** after structural parse, `AI-23 Workbook Semantics` classifies each detected table as one of: `maturity_assessment`, `opportunity_register`, `scoring_rubric`, `theme_registry`, `heat_map`, `cost_model`, `unknown` — and proposes a column→field mapping for import review. **The human confirms the mapping.** This is what makes the acceptance test (loading the corpus's own workbooks) tractable.

## 11.5 PowerPoint parsing requirements

```
Presentation (slide size, theme)
 └─ Slide (index, layout, title, notes)
     ├─ Shape (id, name, type, position, z-order, text_frame)
     │   └─ Paragraph (level, runs, formatting hints)
     ├─ Table (rows × cells, merged-cell map)
     ├─ Chart (type, series, categories, values)   [P1]
     ├─ Picture (alt text, extracted image ref)
     ├─ GroupShape (recursive)
     └─ SmartArt (P2 — best-effort text extraction)
```

**Required capabilities:**

| Capability | Why |
|---|---|
| **Title detection with fallback** | Corpus slides often place the real headline in a body textbox, not the title placeholder. Fallback heuristic: largest font in the top third. |
| **Table extraction preserving row/column identity** | Maturity heatmap and theme summaries are tables; their cell coordinates *are* the data. |
| **Reading-order-stable shape enumeration** | Position-based ordering (top-to-bottom, left-to-right) so extracted text is coherent. |
| **Speaker notes** | Frequently carry rationale not on the slide. |
| **Section detection** | Divider slides (`01`, `02`, `03` + section name) define deck structure. |
| **Merged-cell handling** | Corpus tables use vertical merges for function grouping; naive parsing produces blank cells and misattributes rows. |
| **Empty-file tolerance** | The corpus contains a 0-byte `.pptx`. Must fail gracefully with a clear message, not crash the batch. |
| **Chart data extraction (P1)** | Bubble/quadrant charts carry numeric series worth recovering. |

**Semantic recognition (P0):** `AI-24 Deck Semantics` classifies slides as `title`, `section_divider`, `agenda`, `framework`, `maturity_exhibit`, `roadmap_exhibit`, `findings`, `recommendation`, `credentials`, `appendix` — enabling the ingestion UI to skip 20+ credentials slides and focus the reviewer on analytical content. (The corpus's execution deck devotes slides 10–23 to firm credentials and capability examples; extracting evidence from those would pollute the fact base.)

## 11.6 PDF and DOCX

**PDF:** page-level text with character offsets for anchoring; table detection (P1); no OCR in P0 — a PDF with no text layer is flagged `no_text_layer` with a clear message. The corpus's recap email is a text-layer PDF containing genuinely important content (committed next steps, thematic synthesis), confirming PDF as P0.

**DOCX:** paragraph tree with heading levels and styles; tables; comments and tracked changes (P1 — useful for reviewed transcripts); speaker-turn detection heuristic for transcripts (P1).

## 11.7 Source location model

Every evidence item carries a `SourceLocation` — a discriminated union, **not** a free-text string:

| Document type | Location fields |
|---|---|
| Excel | `sheet_name`, `sheet_index`, `cell_ref` or `range_ref`, `row`, `col`, `table_id?` |
| PowerPoint | `slide_index`, `shape_id`, `shape_name?`, `table_row?`, `table_col?`, `is_notes?` |
| PDF | `page`, `char_start`, `char_end`, `bbox?` |
| DOCX | `paragraph_index`, `char_start`, `char_end`, `table_ref?` |
| Text/CSV | `line_start`, `line_end`, `char_start?`, `char_end?` |
| Manual | `note` (required when a consultant asserts evidence without a document) |

**Requirement:** every location must be resolvable to a UI navigation that scrolls to and highlights the exact location in the document viewer. This is the mechanism that makes §13 Data Lineage real rather than nominal.

## 11.8 Manual entry

Not every fact has a file. The corpus's evidence strings frequently cite live sessions (*"Exec Strategy 3/18"*) with no attached document. Atlas must support:

- **Manual evidence** with a `SourceLocation{type: manual}` recording session name, date, participants, and the assertion — clearly distinguished from document-anchored evidence.
- **Manual object creation** for every analytical type (capability, finding, opportunity, initiative, dependency, decision).
- **Structured paste import**: paste a TSV/CSV block into the opportunities grid or maturity grid and map columns to fields with a confirm step. This is the pragmatic bridge from existing spreadsheets and is **P0** — it is the fastest path to loading the reference engagement.

## 11.9 Ingestion states

| State | UI |
|---|---|
| `queued` | "Waiting to process — position n in queue" |
| `parsing` | Determinate progress; structural tree appears incrementally |
| `extracting` | "Finding evidence… n items so far"; cancellable |
| `ready` | Counts by object type; link to review queue |
| `partial` | "Processed 6 of 8 sheets. 2 could not be read: {names}. You can still review what was extracted." |
| `failed` | Cause in plain language, retry, and the manual-entry fallback |
| `no_text_layer` | "This PDF contains no selectable text. OCR is not available; please upload a text-based version or enter evidence manually." |
| `unsupported` | Names the type and lists supported types |
| `too_large` | States the limit and the file's size |

**Non-negotiable:** a failed file never blocks the rest of a batch, and never leaves the engagement in an inconsistent state.
---

# 12. Canonical Data Model

## 12.0 Modelling conventions

- **IDs:** every object has a UUID `id` (immutable) plus a human-readable `ref` unique within the engagement (`OPP-001`, `CAP-014`, `INI-007`) — the corpus uses `OPP-01`-style refs and links pain points by ID, so this is an evidenced requirement.
- **Tenancy:** every engagement-scoped object carries `engagement_id`, indexed and enforced at the data-access layer. No query may omit it.
- **Audit fields (all objects):** `created_at`, `created_by`, `updated_at`, `updated_by`, `version` (integer, optimistic lock), `deleted_at` (soft delete).
- **Field nature legend:**
  `[H]` human-editable · `[A]` AI-generated (proposal) · `[C]` **calculated — read-only, never writable by AI or UI** · `[S]` system-managed · `[P]` provenance
- **Review state** (where applicable): `ai_suggested | draft | in_review | approved | rejected`.
- **Publish state** (where applicable): `internal | published`, with `published_version`.
- **Rule:** an object may be `published` only if `review_state = approved`.

## 12.1 Object inventory and rationale

Objects included, with the source-material justification for each. Objects from the brief's candidate list that are **excluded** are listed at §12.24 with reasons.

| # | Object | Justification |
|---|---|---|
| 1 | Organization | Multi-tenancy requirement (§7 of brief) |
| 2 | User | Auth |
| 3 | EngagementMembership | Per-engagement roles (§7) |
| 4 | Engagement | The aggregate root |
| 5 | TransformationObjective | `Strategy Alignment` column; Dimension 3 denominator |
| 6 | Stakeholder | Interview plan; recap email distribution; evidence attribution |
| 7 | SourceDocument | Ingestion |
| 8 | SourceStructure | Structure preservation (§11) |
| 9 | SourceLocation | Provenance anchoring (embedded value object) |
| 10 | Evidence | `Evidence:` strings; the lineage root |
| 11 | Finding | Findings/strengths/tensions slides; `Current State Summary` |
| 12 | Hypothesis | Methodology Week 0 output |
| 13 | Assumption | Methodology V1 output *"major assumptions"* |
| 14 | Contradiction | Survey-vs-self-perception gap; *"Core Tensions"* |
| 15 | TechnologyFunction | The 8 grouping areas |
| 16 | Capability | Focus Area rows |
| 17 | MaturityFramework | CMMI v2.0 level definitions sheet |
| 18 | MaturityLevelAnchor | Per-level anchored descriptors |
| 19 | MaturityScore | Current/target/gap rows |
| 20 | Theme | 4 investment themes with sequence |
| 21 | Initiative | The investment bucket; rollup unit |
| 22 | Opportunity | **The unit of prioritization** |
| 23 | PriorityModel | Weights, thresholds, quadrant config |
| 24 | PriorityDimension | The three scored dimensions |
| 25 | PriorityAnchor | 1–5 rubric anchors with calibration examples |
| 26 | PriorityScore | Per-opportunity dimension scores + calculated outputs |
| 27 | Dependency | Prose dependencies; workshop Activity 3 |
| 28 | EffortScale / EffortSize | T-shirt table with duration and risk |
| 29 | Roadmap | Container |
| 30 | RoadmapVersion | V1 / V2 / Final |
| 31 | RoadmapWave | *"establish waves"* |
| 32 | RoadmapItem | Placement of an initiative in time |
| 33 | Milestone | Workshop Activity 3 |
| 34 | Scenario | Methodology; *"scenario comparisons"* |
| 35 | ScenarioChange | Delta records |
| 36 | StakeholderFeedback | Activities 1–4 + survey |
| 37 | Decision | Decision log; Board asks |
| 38 | OpenItem | `Notes / Open Items` column |
| 39 | ExecutiveInsight | Board messages bound to values |
| 40 | BoardDeckVersion | Versioned Board output |
| 41 | BoardSlide | Slide with data bindings |
| 42 | Publication | Immutable client-visible snapshot |
| 43 | AuditEvent | Traceability |
| 44 | AIRun | AI provenance and cost |
| 45 | ChangeImpact | Propagation results |
| 46 | CostEstimate | **P1** — Weeks 6–8 |
| 47 | ResourceRequirement / ResourceCapacity | **P1** |
| 48 | BusinessValue | **P1** |
| 49 | Benchmark | **P1** — North Star slide |
| 50 | ActivationItem | **P1** — 90-day plan |

---

## 12.2 Organization

**Purpose:** tenant boundary; owns users and engagements.

| Field | Type | Nature | Notes |
|---|---|---|---|
| id | uuid | S | |
| name | string | H | required |
| type | enum `consultancy \| client` | H | Aberdeen is `consultancy` |
| logo_url | string? | H | for branded client/Board views |
| created_at/by | ts/uuid | S | |

**Relationships:** 1─<N `User`, 1─<N `Engagement`.
**Versioning:** none. **Approval:** none.

---

## 12.3 User

| Field | Type | Nature |
|---|---|---|
| id | uuid | S |
| organization_id | uuid FK | S |
| email | string, unique | H |
| name | string | H |
| title | string? | H |
| is_platform_admin | bool | H |
| last_login_at | ts? | S |
| status | enum `invited \| active \| disabled` | S |

**Relationships:** N─<M `Engagement` via `EngagementMembership`.

---

## 12.4 EngagementMembership

| Field | Type | Nature |
|---|---|---|
| id, engagement_id, user_id | uuid | S |
| role | enum (§7.2) | H |
| scope | jsonb? | H |
| invited_by, invited_at, accepted_at | uuid/ts | S |

`scope` constrains `ClientContributor` and `Reviewer` (e.g. `{business_areas:[…]}`, `{capability_ids:[…]}`, `{feedback_set_id:…}`).
**Unique constraint:** `(engagement_id, user_id)`.

---

## 12.5 Engagement — aggregate root

**Purpose:** the container for one client transformation engagement. Every analytical object descends from here.

| Field | Type | Nature | Notes |
|---|---|---|---|
| id, ref | uuid, string | S | |
| organization_id | uuid FK | S | owning consultancy |
| client_organization_id | uuid FK? | H | client tenant if provisioned |
| name | string | H | required |
| client_name | string | H | required |
| mandate | text | H | the transformation mandate; shown on every Overview |
| phase | enum `kickoff \| fact_gathering \| diagnose \| roadmap_v1 \| economics \| alignment \| board \| closed` | H | corroborated by slide 6 |
| start_date, target_end_date | date | H | |
| planning_horizon_years | int | H | corpus: 5-year roadmap |
| period_granularity | enum `quarter \| half \| year` | H | corpus uses quarters and years |
| roadmap_start_period | string | H | e.g. `2027-Q1` |
| priority_model_id | uuid FK | H | active model |
| maturity_framework_id | uuid FK | H | active framework |
| effort_scale_id | uuid FK | H | |
| status | enum `active \| archived` | S | |
| completion_metrics | jsonb | C | recomputed; drives Overview Zone 2 |

**Relationships:** 1─<N to nearly every analytical object.
**Versioning:** field-level audit only. **Approval:** none (the container itself).

---

## 12.6 TransformationObjective

**Purpose:** the client's own named business goals. **The denominator of priority Dimension 3** — the corpus scores alignment as *traceability to a named goal*.

| Field | Type | Nature |
|---|---|---|
| id, ref, engagement_id | | S |
| title | string | H/A |
| description | text? | H/A |
| source | enum `client_strategy \| executive_stated \| technology_org \| derived` | P |
| owner_stakeholder_id | uuid FK? | H |
| category | string? | H |
| evidence_ids | uuid[] | P |
| review_state | enum | S |

**AI-generated:** `title`, `description` proposed by AI-01 from strategy documents, always with evidence.
**Approval:** must be `approved` before it can be selected for Dimension 3 scoring — otherwise alignment scores rest on unvalidated goals.
**Versioning:** full history; objective changes trigger a review flag on all opportunities linked to them.

---

## 12.7 Stakeholder

| Field | Type | Nature |
|---|---|---|
| id, ref, engagement_id | | S |
| name, title, business_area, technology_function_id? | | H |
| org_side | enum `client \| aberdeen` | H |
| influence | enum `low \| medium \| high` | H |
| user_id | uuid FK? | H | links to a platform account if invited |
| interview_status | enum `planned \| scheduled \| completed \| declined \| not_required` | H |
| interview_date | date? | H |
| feedback_group | string? | H | workshop small-group assignment |

**Justification:** slide 12 (*"5 leadership interviews… 10 functional deep-dives"*), the recap email distribution list, and evidence strings attributing facts to named individuals.

---

## 12.8 SourceDocument

| Field | Type | Nature |
|---|---|---|
| id, ref, engagement_id | | S |
| filename, mime_type, size_bytes, storage_key, checksum | | S |
| doc_type | enum `strategy \| interview_transcript \| survey \| deck \| workbook \| architecture \| budget \| org_chart \| vendor \| prior_assessment \| other` | H/A |
| title, description | | H |
| stakeholder_id? , source_date? | | H |
| confidentiality | enum `internal \| client_shared \| restricted` | H |
| processing_status | enum (§11.9) | S |
| processing_error | text? | S |
| parsed_at | ts? | S |
| extracted_counts | jsonb | C |
| is_reference_corpus | bool | H | marks prior-engagement material (§13 governance) |

**Provenance:** immutable once uploaded; re-processing creates a new `SourceStructure` generation.

---

## 12.9 SourceStructure

**Purpose:** the preserved object graph of a parsed file. Stored as a hierarchy, queryable by node.

| Field | Type | Nature |
|---|---|---|
| id, source_document_id | | S |
| generation | int | S |
| node_type | enum `workbook \| sheet \| cell \| table \| named_range \| validation \| presentation \| slide \| shape \| pptx_table \| chart \| notes \| page \| paragraph \| section` | S |
| parent_id | uuid? | S |
| path | string | S | materialized path, e.g. `wb/sheet[2]/table[0]/row[6]/col[13]` |
| index | int? | S |
| name | string? | S |
| content_text | text? | S |
| content_value | jsonb? | S | typed value for cells |
| formula | text? | S | **required for Excel cells** |
| attributes | jsonb | S | number format, merges, position, style hints, validation list |
| semantic_type | string? | A | from AI-23/AI-24 |
| semantic_confidence | float? | A |

**Indexing:** GIN on `content_text` for retrieval; btree on `(source_document_id, node_type)`.
**Why this matters:** without `formula`, the reference engagement's entire scoring method is unrecoverable from its own files.

---

## 12.10 SourceLocation (embedded value object)

Not a table — an embedded, validated JSON structure on `Evidence` and any citing object. Discriminated union per §11.7. Must always be resolvable to a UI navigation.

```
{ kind: "excel",  source_document_id, sheet_name, sheet_index, cell_ref|range_ref, row?, col?, table_id? }
{ kind: "pptx",   source_document_id, slide_index, shape_id, shape_name?, table_row?, table_col?, is_notes? }
{ kind: "pdf",    source_document_id, page, char_start, char_end, bbox? }
{ kind: "docx",   source_document_id, paragraph_index, char_start, char_end, table_ref? }
{ kind: "text",   source_document_id, line_start, line_end }
{ kind: "manual", session_name, session_date, participants[], note }
```

---

## 12.11 Evidence

**Purpose:** an atomic, sourced observation. **The root of the entire lineage graph.** Nothing analytical may be approved without tracing here.

| Field | Type | Nature | Notes |
|---|---|---|---|
| id, ref, engagement_id | | S | |
| source_document_id | uuid FK? | P | null only for `manual` |
| location | SourceLocation | P | **required** |
| excerpt | text | A/H | verbatim; must appear in the source when `kind != manual` |
| summary | text? | A/H | one-line restatement |
| evidence_type | enum `fact \| metric \| opinion \| risk \| constraint \| strength \| commitment` | A/H | corpus mixes verifiable facts, quoted opinions, metrics, risks and strengths |
| attributed_to_stakeholder_id | uuid FK? | A/H | corpus: *"confirmed by [VP] interview"* |
| observed_date | date? | A/H | corpus: *"Exec Strategy 3/18"* |
| entity_tags | string[] | A/H | systems, vendors, programs named |
| technology_function_id | uuid FK? | A/H | |
| business_area | string? | A/H | |
| confidence | float 0–1 | A | AI extraction confidence |
| review_state | enum | S | starts `ai_suggested` |
| reviewed_by, reviewed_at | | S | |
| internal_note | text? | H | **never published** |
| anchor_status | enum `resolved \| broken` | C | set on re-processing |

**Relationships:** N─<M Finding, MaturityScore, Opportunity, PriorityScore, Dependency, ExecutiveInsight via link tables.
**Approval:** must be `approved` (or `draft` authored by a human) before it can support an approved downstream object.
**Versioning:** edits to `excerpt` require a reason; original preserved.

---

## 12.12 Finding

**Purpose:** a consultant's analytical conclusion, evidenced. Bridges evidence to both maturity and opportunity.

| Field | Type | Nature |
|---|---|---|
| id, ref, engagement_id | | S |
| title | string | H/A |
| statement | text | H/A |
| **polarity** | enum `strength \| gap \| tension \| risk` | H/A |
| category | string | H/A |
| technology_function_id?, capability_id?, business_area? | | H/A |
| severity | enum `critical \| high \| medium \| low`? | H/A |
| evidence_ids | uuid[] | P |
| confidence | float? | A |
| review_state | enum | S |
| publish_state | enum | S |

**`polarity` is required.** The corpus devotes a dedicated slide to strengths and another to tensions; a model that records only gaps misrepresents the method and would produce an unbalanced client narrative.
**Approval rule:** cannot reach `approved` with zero `evidence_ids`. Hard constraint.

---

## 12.13 Hypothesis · Assumption · Contradiction

**Hypothesis** (Week 0 output): `statement`, `origin` (`kickoff|executive|consultant`), `status` (`open|supported|refuted|inconclusive`), `evidence_ids`, `resolution_note`. AI may propose status changes as evidence accumulates; humans decide.

**Assumption** (V1 output *"major assumptions"*): `statement`, `category` (`scope|timing|resource|technical|commercial|dependency`), `impact_if_wrong` (`low|medium|high`), `status` (`open|validated|invalidated`), `owner_stakeholder_id?`, `linked_object_type/id`, `evidence_ids`. **Assumptions attached to roadmap items participate in change propagation** — invalidating an assumption flags every dependent object.

**Contradiction** (methodology: *"contradiction detection"*; corpus: the IT-self-perception vs business-need gap): `statement`, `evidence_id_a`, `evidence_id_b`, `contradiction_type` (`factual|perception|priority|timing`), `severity`, `resolution` (`unresolved|reconciled|accepted_tension`), `resolution_note`. **Accepted tensions are publishable** — the corpus presents them to the client as insight.

---

## 12.14 TechnologyFunction · Capability

**TechnologyFunction** — the top grouping level (8 in the corpus, but engagement-defined):
`name`, `description`, `sequence`, `colour_token`, `business_model_note` (corpus slide 2 pairs each function with a business-model observation).

**Capability** — the assessed unit (Focus Area):

| Field | Type | Nature |
|---|---|---|
| id, ref, engagement_id | | S |
| technology_function_id | uuid FK | H |
| name | string | H |
| description | text? | H |
| sequence | int | H |
| review_state | enum `new \| in_progress \| ready_to_review \| reviewed \| final` | S |

**Note:** capability review state uses the corpus's own five-value vocabulary rather than the generic ladder, because it was directly observed as a dropdown.

---

## 12.15 MaturityFramework · MaturityLevelAnchor

**MaturityFramework:** `name` (`CMMI v2.0`), `evaluation_method` (`SCAMPI C (Informal Appraisal)`), `calibration_note` (`Calibrated to Gartner IT Score maturity descriptors`), `level_count` (5), `disclaimer` (the "independent judgment, not a formal certification" text — **required and rendered on every client/Board maturity exhibit**), `is_firm_default`.

**MaturityLevelAnchor:** `framework_id`, `level` (1–5), `label` (`Initial|Managed|Defined|Quantitatively Managed|Optimizing`), `generic_description`, `organization_specific_description` (the corpus's *"What it means for [the client]"* column — **engagement-editable**, and the thing that makes AI scoring calibrated rather than generic).

---

## 12.16 MaturityScore

**Purpose:** the assessed maturity of one capability. Mirrors the corpus row exactly.

| Field | Type | Nature | Notes |
|---|---|---|---|
| id, engagement_id, capability_id | | S | unique per capability per assessment round |
| **current_level** | int 1–5 | H/A | |
| current_anchor_label | string | H/A | denormalized from anchor — score-as-string pattern |
| current_rationale | text | H/A | corpus `Rationale for Maturity` |
| **target_level** | int 1–5 | H | deliberate per-capability choice |
| target_rationale | text? | H | |
| **gap** | int | **C** | `target_level − current_level` |
| **maturity_label** | string | **C** | lookup from anchor by `current_level` |
| current_state_summary | text | H/A | corpus `Current State Summary (Pain Points & Strengths)` |
| evidence_criteria_met | text | H/A | corpus `Evidence & Criteria Met` |
| observed_gaps | text | H/A | corpus `Opportunities` column (`Gaps:` prefix) |
| next_steps | text | H/A | corpus `Next Steps to Advance` |
| priority_to_fix | enum `critical \| high \| medium \| low` | H/A | |
| confidence | float? | A | |
| evidence_ids | uuid[] | P | |
| review_state | enum (capability vocabulary) | S | |
| ai_proposed_level | int? | A | retained after human override for divergence analysis |
| assessment_round | int | S | supports re-assessment over time |

**Approval:** cannot reach `reviewed` with zero evidence or empty `current_rationale`.
**Versioning:** every level change is a new version with actor, timestamp, prior value, and reason. **Changing `current_level` or `target_level` triggers change propagation** (gap changes → capability-gap-derived opportunities flagged → maturity exhibits stale).

---

## 12.17 Theme · Initiative

### Theme

| Field | Type | Nature |
|---|---|---|
| id, ref, engagement_id | | S |
| name | string | H |
| **sequence** | int | H | **drives wave ordering** |
| strategic_question | text | H/A | corpus: *"The strategic question"* |
| description | text | H/A |
| colour_token | string | H | used by quadrant/roadmap exhibits |
| previous_names | string[] | S | rename history — corpus `Old Theme Names` |
| **avg_score** | float? | **C** | mean of child initiative scores |
| **opportunity_count** | int | **C** |

### Initiative

| Field | Type | Nature |
|---|---|---|
| id, ref, engagement_id | | S |
| theme_id | uuid FK | H |
| name | string | H |
| description | text | H/A |
| previous_names | string[] | S | corpus `Old Name` |
| owner_stakeholder_id? | uuid FK | H |
| business_area? | string | H |
| technology_function_id? | uuid FK | H |
| tshirt_size | enum `XS \| S \| M \| L \| XL \| XXL`? | H/A |
| span | enum `S \| M \| L`? | H | legacy scale, derived if absent |
| investment_type | enum `defensive \| multiplier \| ceiling_remover`? | H/A |
| relationship_type | enum `B2B \| B2C \| B2B2C \| internal`? | H/A |
| **avg_score** | float | **C** | `AVG(child opportunity weighted_score)` — the `Avg Weight` column |
| **priority_band** | string | **C** | band of `avg_score` |
| **opportunity_count** | int | **C** |
| **duration_periods** | int | **C** | from `tshirt_size` via EffortScale |
| review_state, publish_state | enum | S |

**Relationships:** Theme 1─<N Initiative 1─<N Opportunity; Initiative 1─<1 RoadmapItem per RoadmapVersion; Initiative N─<M Dependency.
**Rename requirement:** renaming appends to `previous_names` and never changes `id` — the fix for the corpus's theme-drift inconsistency.

---

## 12.18 Opportunity — **the unit of prioritization**

The most important object in the model. Fields map to observed columns.

| Field | Type | Nature | Corpus column |
|---|---|---|---|
| id, ref, engagement_id | | S | `Opp. ID` |
| **initiative_id** | uuid FK | H | `Initiative` |
| *(theme — derived through initiative, never stored)* | | **C** | XLOOKUP-derived |
| title | string | H/A | `Opportunity` |
| description | text | H/A | |
| **recommended_action** | text | H/A | `Recommended Action` — **imperative style enforced** |
| so_what | text? | H/A | `So What (Why It Matters)` |
| technology_function_id | uuid FK? | H/A | `Tech Area` |
| business_area | string? | H/A | `Business Area Mapping : EVP Area` |
| relationship_type | enum? | H/A | `Relationship Type` |
| investment_type | enum? | H/A | heat-map type legend |
| tshirt_size | enum? | H/A | Activity 3 |
| span | enum `S\|M\|L`? | H | `Span` |
| effort | enum `S\|M\|L`? | H | heat-map `Effort` |
| objective_ids | uuid[] | H/A | `Strategy Alignment` |
| finding_ids | uuid[] | P | |
| evidence_ids | uuid[] | P | `Linked Pain Point(s)` — now FK-enforced |
| capability_ids | uuid[] | P | link back to maturity gaps |
| origin | enum `ai_generated \| consultant \| client_backlog \| workshop` | P | |
| status_provenance | enum `new \| existing \| updated` | H | `Status` |
| source_note | string? | P | `Source (Keep for Now)` |
| review_state, publish_state | enum | S | |
| merged_into_id | uuid FK? | S | set on merge; row retained for lineage |
| **is_on_roadmap** | bool | **C** | derived from RoadmapItem existence |

**Calculated fields** live on `PriorityScore` (12.20) and are surfaced on the opportunity for convenience but never stored redundantly.

**Validation rules:**
- `recommended_action` must begin with a verb (soft-warn, not hard-block — the corpus's own convention).
- An opportunity may not be `approved` without all three dimension scores present.
- Merging is non-destructive: the merged row persists with `merged_into_id` so historical evidence links stay resolvable.

---

## 12.19 PriorityModel · PriorityDimension · PriorityAnchor

### PriorityModel

| Field | Type | Nature |
|---|---|---|
| id, engagement_id | | S |
| name, version | string, int | H/S |
| **band_thresholds** | jsonb | H | default `{critical:4.5, high:3.75, medium:2.8}` |
| band_labels | jsonb | H | default `Critical / High Priority / Medium Priority / Lower Priority` |
| **quadrant_threshold_x**, **quadrant_threshold_y** | float | H | default `3.5`, `3.5` |
| quadrant_labels | jsonb | H | default `Act Now / Defend / Plan & Fund / Sequence Later` — **configurable** because the corpus itself used two variants |
| quadrant_descriptions | jsonb | H | |
| value_axis_formula | enum `avg_of_dims \| custom` | H | corpus: `(D1 + D3) / 2` |
| value_axis_dimension_ids | uuid[] | H | which dimensions form the X axis |
| urgency_axis_dimension_id | uuid | H | corpus: D2 |
| methodology_note | text | H | corpus: *"Anchored to Gartner's IT value dimensions and consistent with SAFe's WSJF sequencing methodology"* |
| max_score | float | C | `Σ weights × 5` |
| is_locked | bool | H | prevents accidental edits after scoring begins |

**Invariant:** `Σ dimension.weight = 1.0`, validated on save (tolerance 1e-6).
**Change behaviour:** any edit to weights, thresholds, or dimension set increments `version`, triggers **full recalculation** of every `PriorityScore`, and produces a `ChangeImpact` record. The UI must show, before confirmation, how many opportunities change band and how many change quadrant.

### PriorityDimension

`id, priority_model_id, sequence, key, name, weight (float), question_prompt (text), description (text), is_active`.
Seeded defaults (firm default, editable):

| key | name | weight |
|---|---|---|
| `financial_impact` | Growth / Revenue Impact | 0.40 |
| `risk_if_deferred` | Operational Risk if Not Done | 0.35 |
| `strategic_alignment` | Alignment to Business Strategy | 0.25 |

### PriorityAnchor

`id, dimension_id, level (1–5), label, description, calibration_example`.
Seeded from the corpus's rubric structure (labels: `Transformational/Material/Moderate/Indirect/Hygiene`; `Existential/Severe/Compounding/Latent/Negligible`; `Named explicitly/Direct enabler/Foundational dependency/Thematic fit/Not traceable`) with **generic, client-neutral descriptions** — the corpus's client-specific calibration examples are *not* copied; each engagement authors its own.

---

## 12.20 PriorityScore

**Purpose:** the scored assessment of one opportunity. Holds both AI/human inputs and all calculated outputs.

| Field | Type | Nature | Formula |
|---|---|---|---|
| id, engagement_id, opportunity_id | | S | unique |
| priority_model_id, priority_model_version | | S | which model produced these numbers |
| `dimension_scores` | jsonb[] | H/A | array of `{dimension_id, level, anchor_label, anchor_text, rationale, evidence_ids[], source: ai\|human, confidence?}` |
| **weighted_score** | float | **C** | `Σ (level_d × weight_d)` |
| **priority_band** | string | **C** | threshold lookup |
| **business_value_x** | float | **C** | `AVG(levels of value_axis dimensions)` — corpus `(D1+D3)/2` |
| **urgency_y** | float | **C** | `level of urgency dimension` — corpus `D2` |
| **bubble_size** | float | **C** | `= weighted_score` |
| **quadrant** | string | **C** | 2×2 threshold logic |
| **computed_rank** | int | **C** | dense rank by `weighted_score` desc within engagement |
| `human_rank` | int? | H | `Ranking Post Onsite` / `Identified as Top Priority` |
| `human_rank_rationale` | text? | H | **required when `human_rank` is set** |
| `human_rank_set_by`, `_at` | | S | |
| **rank_divergence** | int? | **C** | `computed_rank − human_rank` |
| `client_rank` | int? | H | from blind ranking (Activity 1) |
| `client_urgency` | string? | H | Activity 2 |
| `is_scoring_complete` | bool | **C** | all active dimensions scored |
| last_calculated_at | ts | S | |

**Missing-data behaviour:** if any active dimension is unscored, all calculated outputs are `null` and the UI shows **"Not yet scored — {n} of {m} dimensions complete"**. It must never substitute 0 or a partial weighted sum. This is the single most important missing-data rule in the system, because a partial weighted score silently understates priority.

**Recalculation triggers:** dimension score change · PriorityModel change · anchor change · opportunity merge/split.

---

## 12.21 Dependency

**Purpose:** structure the sequencing knowledge that the corpus expresses only as prose.

| Field | Type | Nature |
|---|---|---|
| id, ref, engagement_id | | S |
| upstream_type / upstream_id | enum `initiative\|opportunity` + uuid | H/A |
| downstream_type / downstream_id | same | H/A |
| **dependency_type** | enum `hard_prerequisite \| sequencing_preference \| unblocks \| resource_contention \| collision_risk \| shared_platform` | H/A |
| rationale | text | H/A |
| lag_periods | int | H | default 0 |
| confidence | float? | A |
| evidence_ids | uuid[] | P |
| origin | enum `ai_inferred \| consultant \| client_workshop` | P |
| review_state | enum `ai_suggested \| proposed \| validated \| rejected` | S |
| validated_by, validated_at | | S |
| is_violated | bool | **C** | current roadmap breaches this dependency |
| violation_detail | jsonb? | **C** |

**Type vocabulary is derived from observed language** (§3.7), not invented: `hard_prerequisite` ← *"cannot launch without"*; `sequencing_preference` ← *"sequence ahead of"*; `unblocks` ← *"unblocks 4 initiatives"*; `resource_contention` ← *"consumes the same talent"*; `collision_risk` ← *"collide in the same integration layer"*.

**Constraints:** no self-dependency; cycles among `hard_prerequisite` edges are rejected at write time with the cycle path reported.
**Scheduling weight:** only `hard_prerequisite` (and `unblocks`, its inverse) constrain `earliest_start`. Others produce advisory warnings. This distinction is essential — treating preferences as constraints would over-constrain the roadmap.

---

## 12.22 EffortScale · EffortSize

**EffortScale:** `id, engagement_id, name, is_firm_default`.
**EffortSize:** `scale_id, key (XS…XXL), sequence, effort_description, duration_min_months, duration_max_months, duration_periods (C), risk_level, risk_description`.

Seeded from the observed T-shirt table. `duration_periods` is derived from the month range and the engagement's `period_granularity` — **⚠ Decision Required: use `max`, `midpoint`, or `min` of the range for planning?** PRD recommendation: **midpoint, rounded up**, with the range displayed so the consultant sees the uncertainty. Overridable per item.

---

## 12.23 Roadmap objects

### Roadmap
`id, engagement_id, name, roadmap_type (technology|business_aligned|final), current_version_id`.

### RoadmapVersion

| Field | Type | Nature |
|---|---|---|
| id, ref, roadmap_id, engagement_id | | S |
| version_number | int | S |
| label | string | H | `V1`, `V2`, `Final` |
| description | text? | H |
| based_on_version_id | uuid FK? | S |
| scenario_id | uuid FK? | S | null = baseline |
| status | enum `draft \| in_review \| approved \| superseded` | S |
| approved_by, approved_at | | S |
| publish_state, published_at | | S |
| **is_current** | bool | C |
| snapshot | jsonb? | S | frozen item set on approval — makes a version genuinely immutable |

### RoadmapWave
`id, roadmap_version_id, sequence, label, start_period, end_period, target_outcomes (text), theme_id?`.
Corpus basis: *"establish waves"*, *"define target outcomes"*.

### RoadmapItem

| Field | Type | Nature |
|---|---|---|
| id, roadmap_version_id, engagement_id | | S |
| initiative_id | uuid FK | H |
| wave_id | uuid FK? | H |
| lane | string? | H | workstream/swimlane (theme or function) |
| **start_period**, **end_period** | string | H (or C if auto-scheduled) |
| **duration_periods** | int | **C** | from effort size, overridable |
| duration_override | int? | H |
| **earliest_start_period** | string | **C** | dependency-constrained |
| **has_conflict** | bool | **C** |
| **conflict_details** | jsonb | **C** |
| status | enum `planned \| in_flight \| committed` | H |
| owner_stakeholder_id? | | H |
| expected_outcome | text? | H/A |
| placement_rationale | text? | H/A |
| moved_by, moved_at, move_reason | | S |

**`move_reason` is required on manual reschedules** — the corpus's decision-log discipline applied to sequencing.

### Milestone
`id, engagement_id, initiative_id?, roadmap_item_id?, name, target_period, description, origin (consultant|client_workshop), review_state`. Corpus: Activity 3 *"Outline key milestones"*.

---

## 12.24 Scenario · ScenarioChange

**Scenario:** `id, ref, engagement_id, name, description, base_roadmap_version_id, roadmap_version_id (its own working version), constraint_set (jsonb), status (draft|active|archived|promoted), created_by/at, comparison_summary (jsonb, C)`.

`constraint_set` (P0 subset): `{ max_concurrent_initiatives?, excluded_initiative_ids[], forced_wave_assignments{}, horizon_years? }`.
`constraint_set` (P1): `{ annual_budget_cap?, resource_capacity_by_role{} }` — flagged, because the corpus provides no budget or capacity data.

**Baseline preservation is a hard invariant:** creating a scenario deep-copies the roadmap version. No scenario operation may write to the baseline. Only `promote_to_baseline` (Owner) creates a **new baseline version** from a scenario — the prior baseline is retained as superseded, never overwritten.

**ScenarioChange:** `scenario_id, change_type (moved|removed|deferred|added|resized|rewaved), target_type/id, before (jsonb), after (jsonb), rationale, created_by/at`. Enables the change list and the quantified comparison.

---

## 12.25 StakeholderFeedback

**Purpose:** capture workshop Activities 1–4 and survey input as structured data.

| Field | Type | Nature |
|---|---|---|
| id, engagement_id | | S |
| stakeholder_id? , user_id?, feedback_group? | | S |
| feedback_type | enum `priority_rank \| urgency \| dependency_proposal \| milestone_proposal \| effort_estimate \| comment \| survey_response \| value_validation` | S |
| target_type / target_id | enum + uuid | S |
| payload | jsonb | H | shape varies by type |
| free_text | text? | H |
| sentiment | enum `supportive \| neutral \| concerned \| opposed`? | A |
| themes | string[] | A |
| session_id | uuid? | S | groups a workshop activity |
| **is_released** | bool | S | **controls the blind-ranking reveal** |
| triage_state | enum `new \| reviewed \| accepted \| rejected \| deferred` | H |
| triage_note | text? | H |

**`is_released` is the mechanism for the corpus's core alignment mechanic.** While `false`, no client user may read other groups' submissions or the consultant ranking; the API filters server-side.

---

## 12.26 Decision · OpenItem

**Decision:** `id, ref, engagement_id, title, description, decision_type (required|made|board_ask), owner_stakeholder_id?, due_date?, decided_date?, outcome (text?), rationale (text?), status (open|decided|deferred|superseded), affected_object_refs (jsonb[]), evidence_ids, recorded_by_proxy (bool), attributed_to (string?), publish_state`.
Corpus basis: *"Several critical decisions requiring near-term direction and sequencing"*; *"Set Q3 2026 decision deadline"*; methodology's *"decision log"* and *"key decisions/asks"*.

**OpenItem:** `id, engagement_id, target_type/id, title, body, raised_by, assigned_to?, origin (consultant|reviewer|ai), status (open|resolved|wont_fix), resolution_note, resolved_by/at`.
**Hard rule: `OpenItem` is never publishable and never appears in any client-facing serializer.** This directly protects content like *"Is PIM counted 3 times?"*

---

## 12.27 ExecutiveInsight · BoardDeckVersion · BoardSlide

### ExecutiveInsight

| Field | Type | Nature |
|---|---|---|
| id, ref, engagement_id | | S |
| headline | string | H/A |
| body | text | H/A |
| insight_type | enum `state_of_play \| priority \| investment \| value \| risk \| decision \| dependency \| change` | H/A |
| **data_bindings** | jsonb[] | S | `[{token, source_object_type, source_object_id, field_path, format}]` |
| supporting_object_refs | jsonb[] | P |
| evidence_ids | uuid[] | P |
| confidence | float? | A |
| review_state, publish_state | enum | S |
| **is_stale** | bool | **C** |
| stale_reason | jsonb? | **C** |

**`data_bindings` is the mechanism that enforces "one source of analytical truth."** `body` contains tokens (e.g. `{{wave1_initiative_count}}`); rendering resolves each token through its binding at read time. **A numeric literal in `headline` or `body` is a validation error** detected by a lint rule at save.

### BoardDeckVersion
`id, ref, engagement_id, version_number, roadmap_version_id (FK, required), generated_at, generated_by, status (draft|in_review|approved|superseded), approved_by/at, publish_state, export_url?, staleness_report (jsonb, C)`.

`staleness_report` shape:
```
{ is_stale, roadmap_version_at_generation, current_roadmap_version,
  changed_object_count, stale_slide_ids[], stale_slide_details[] }
```

### BoardSlide
`id, board_deck_version_id, sequence, slide_type, title, headline, message, exhibit_type?, exhibit_config (jsonb), data_bindings (jsonb[]), source_object_refs (jsonb[]), speaker_notes, review_state, is_stale (C), stale_reason (C), is_ai_generated, edited_by/at`.

---

## 12.28 Publication · AuditEvent · AIRun · ChangeImpact

**Publication** — the immutable client-visible snapshot:
`id, engagement_id, version_number, published_by/at, audience (jsonb: roles + scopes), included_artefacts (jsonb[]), snapshot_data (jsonb — the fully serialized client payload), note, is_current, retracted_at?`.
**Client reads resolve against `snapshot_data`, never live tables.** This makes draft leakage structurally impossible.

**AuditEvent:** `id, engagement_id, actor_user_id, actor_role, event_type, object_type, object_id, before (jsonb?), after (jsonb?), reason?, ip?, user_agent?, created_at`. Append-only; no update or delete path exists.

**AIRun:** `id, engagement_id, capability_id (e.g. `AI-05`), model, prompt_version, input_summary (jsonb), input_token_count, output_token_count, latency_ms, status (success|partial|failed|refused), error?, produced_object_refs (jsonb[]), cost_estimate?, created_by/at`. Every AI-generated object references its `ai_run_id` — full AI provenance.

**ChangeImpact:** `id, engagement_id, trigger_event_id (FK AuditEvent), trigger_object_type/id, change_summary, impacted_objects (jsonb[]: `{type,id,ref,impact_kind,severity}`), impact_counts (jsonb), computed_at, acknowledged_by/at`. Persisted so the impact of a past change is reviewable, not just displayed once.

---

## 12.29 P1 objects (contracts defined, formulas flagged)

**CostEstimate:** `id, engagement_id, target_type/id, cost_category (labor|vendor|software|implementation|training|ocm|infrastructure|contingency), amount_low, amount_base, amount_high, currency, basis (enum: analogue|bottom_up|vendor_quote|parametric|placeholder), basis_note, confidence, is_placeholder, evidence_ids, review_state`.
**⚠ Decision Required:** aggregation rule for ranges (simple sum vs. statistical), and the phasing distribution method. Neither is evidenced.

**ResourceRequirement:** `target_type/id, role_name, fte, start_period, end_period, is_internal`.
**ResourceCapacity:** `engagement_id, role_name, period, available_fte, source_note`.
**⚠ Decision Required:** the corpus establishes that capacity is *the* binding constraint but supplies no quantitative model.

**BusinessValue:** `target_type/id, value_type (revenue|cost_reduction|risk_avoidance|capability), description, magnitude_band (from Dimension 1 anchors), quantified_amount?, realization_start_period?, kpi_name?, confidence, evidence_ids`.
**Note:** `magnitude_band` is **P0-safe** because it derives from the observed Dimension 1 rubric. `quantified_amount` is P1 and optional.

**Benchmark:** `engagement_id, business_domain, current_position (enum lagging→leading), north_star_company?, attributes (text[]), subjectivity_disclaimer (required), evidence_ids`.

**ActivationItem:** `engagement_id, sequence, title, why_it_matters, outcome, owner, target_quarter, initiative_ids[]` — mirrors the post-Board mobilization table.

---

## 12.30 Objects deliberately EXCLUDED

| Candidate | Decision | Reason |
|---|---|---|
| `Fact` / `Opinion` as separate objects | **Excluded** | Modelled as `Evidence.evidence_type`. Separate tables would fragment the lineage root for no analytical gain. |
| `Workstream` as separate object | **Excluded** | `Theme` already performs this grouping; `RoadmapItem.lane` handles swimlane display. A third grouping layer is unjustified by the corpus. |
| `MaturityDimension` | **Excluded** | The corpus assesses maturity on a single CMMI axis per capability. `TechnologyFunction` + `Capability` covers it. Multi-dimensional maturity would be invention. |
| `Risk` as a register | **Deferred to P1** | Risks appear inside maturity rationale and Dimension 2 scoring, not as a separate register. Modelled as `Finding.polarity = risk` in P0. |
| `KPI` | **Deferred to P1** | Referenced as future work only. Modelled as `BusinessValue.kpi_name` in P1. |
| `Role` as an object | **Excluded** | An enum on `EngagementMembership`. A role table adds indirection without a use case. |

## 12.31 Entity relationship overview

```
Organization 1─<N User
Organization 1─<N Engagement
Engagement   1─<N EngagementMembership >─1 User

Engagement 1─<N SourceDocument 1─<N SourceStructure
SourceDocument 1─<N Evidence  (Evidence.location → SourceLocation)

Evidence N>─<N Finding
Evidence N>─<N MaturityScore
Evidence N>─<N Opportunity
Evidence N>─<N Dependency
Evidence N>─<N ExecutiveInsight

Engagement 1─<N TechnologyFunction 1─<N Capability 1─1 MaturityScore
Engagement 1─1 MaturityFramework 1─<N MaturityLevelAnchor

Engagement 1─1 PriorityModel 1─<N PriorityDimension 1─<N PriorityAnchor
Engagement 1─<N Theme 1─<N Initiative 1─<N Opportunity 1─1 PriorityScore

Initiative N>─<N Initiative  (via Dependency)
Engagement 1─<N Roadmap 1─<N RoadmapVersion 1─<N RoadmapItem >─1 Initiative
RoadmapVersion 1─<N RoadmapWave
RoadmapVersion 1─1 Scenario? 1─<N ScenarioChange

Engagement 1─<N StakeholderFeedback >─1 Stakeholder
Engagement 1─<N Decision / OpenItem / Assumption / Hypothesis / Contradiction
Engagement 1─<N ExecutiveInsight
Engagement 1─<N BoardDeckVersion 1─<N BoardSlide
Engagement 1─<N Publication
Engagement 1─<N AuditEvent / AIRun / ChangeImpact
```

---

# 13. Data Lineage

## 13.1 The lineage chain

Derived from the corpus's actual analytical flow, not a generic provenance model:

```
Board Slide / Board Message
   └─ ExecutiveInsight  (via data_bindings + supporting_object_refs)
        └─ RoadmapItem  (placement, wave, timing)
             ├─ Dependency  (why here and not earlier)  ─┐
             └─ Initiative                               │
                  ├─ EffortSize → duration               │
                  └─ Opportunity (1..N)                  │
                       ├─ PriorityScore                  │
                       │    ├─ Dimension score D1 ──┐    │
                       │    ├─ Dimension score D2 ──┤    │
                       │    └─ Dimension score D3 ──┤    │
                       │         (each: anchor + rationale + evidence_ids)
                       ├─ TransformationObjective ──┤    │
                       ├─ Finding ──────────────────┤    │
                       │    └─ Evidence ────────────┼────┘
                       └─ Capability                │
                            └─ MaturityScore ───────┘
                                 └─ Evidence
                                      └─ SourceLocation
                                           └─ SourceDocument
```

Every arrow is a persisted foreign key or link-table row. No arrow is a text string.

## 13.2 The "Why is this on the roadmap?" requirement

**FR reference: FR-060.** Available from any Initiative, Opportunity, RoadmapItem, ExecutiveInsight or BoardSlide. Returns two paired outputs:

**(a) Deterministic explanation** — assembled by code from the model, never generated:

> *This initiative sits in Wave 1 (2027-Q1 → 2027-Q3).*
> *Its priority score is **4.35** (High Priority), the average of 3 opportunities scoring 4.60, 4.35, 4.10.*
> *The highest-scoring opportunity scores 5 on Growth/Revenue Impact (weight 0.40) — anchor: "Transformational" — 4 on Operational Risk (0.35) — anchor: "Severe" — and 5 on Strategic Alignment (0.25) — anchor: "Named explicitly", traced to objective OBJ-002.*
> *Quadrant: **Act Now** (business value 5.0 ≥ 3.5; urgency 4.0 ≥ 3.5).*
> *It cannot start before 2027-Q1 because INI-004 is a hard prerequisite (validated, 2 evidence items).*
> *It addresses maturity gaps in 2 capabilities (current 1 → target 3; current 2 → target 4).*
> *Its theme has sequence 1, placing it ahead of themes 2–4.*
> *Human rank 3 differs from computed rank 5 — overridden by {name} on {date}: "{rationale}".*

**(b) Evidence set** — the transitive closure of all `evidence_ids` reachable from the object, deduplicated, grouped by source document, each with a clickable `SourceLocation`.

**Performance requirement:** the closure must be computed in ≤500 ms at P95 for a typical engagement (~50 opportunities, ~20 initiatives, ~400 evidence items). Implementation guidance: a materialized adjacency/closure table refreshed on write, or a recursive CTE with depth limit 8.

## 13.3 Forward lineage (impact direction)

The inverse traversal answers *"if I change this, what breaks?"* and is the basis of §19 Change Propagation. Both directions are served by the same graph.

## 13.4 Lineage in the UI

| Surface | Requirement |
|---|---|
| Calculated field | "How was this calculated?" expander showing the formula with substituted values and links to each input |
| Score cell | Hover reveals anchor label; detail panel shows anchor text, rationale, and evidence chips |
| Evidence chip | Click navigates to the document viewer and highlights the exact cell/shape/range |
| Initiative / Opportunity | "Why is this here?" action → the §13.2 output |
| Board slide (internal view) | "Show bindings" toggle outlining every bound value with its source object and field path |
| Client interface | A **simplified** lineage: "This recommendation is based on {n} findings from {m} interviews and documents." **Raw evidence and internal notes are never exposed.** |

## 13.5 Lineage integrity rules

1. **No orphans.** Every link is an FK with `ON DELETE RESTRICT` for analytical relationships. Deleting an object with dependents requires explicit reassignment or cascade confirmation.
2. **Merge preserves lineage.** A merged opportunity retains `merged_into_id`; its evidence links remain resolvable and are additionally attached to the survivor.
3. **Soft delete only.** Analytical objects are never hard-deleted; lineage from historical Board decks must remain traceable.
4. **Broken anchors are visible.** If re-processing invalidates a `SourceLocation`, the evidence is flagged `anchor_broken` and surfaced for repair — never silently dropped and never silently wrong.
5. **Publication snapshots freeze lineage.** A published artefact records the object versions it was built from, so "what did the client see, and on what basis?" is answerable months later.
---

# 14. AI Architecture / Reasoning Requirements

## 14.1 Architectural rules

1. **Server-side only.** All model calls originate from server code. No API key reaches the browser.
2. **Structured output mandatory.** Every AI capability that writes product data must return JSON validated against a declared schema (JSON Schema / structured-output mode). Free-prose responses are accepted only for the Copilot's explanatory layer and are never persisted as product data.
3. **Schema validation gate.** Invalid output is retried once with the validation error appended; on second failure the run is recorded `failed` and **nothing is written**. Partial writes are prohibited.
4. **Every AI output lands in a review state.** `ai_suggested` (analytical objects) or `proposed` (dependencies). Never `approved`, never `published`.
5. **AI cannot write calculated fields.** The AI orchestration layer imports a write-surface module that physically excludes `[C]` fields. This is a code-level boundary verified by test, not a prompt instruction.
6. **Evidence is mandatory where the schema declares it.** A capability that requires `evidence_ids` returns `insufficient_evidence` rather than fabricating support.
7. **Confidence is declared, not implied.** Every proposal carries `confidence ∈ [0,1]` and a `confidence_basis` string.
8. **Full run provenance.** Every call writes an `AIRun` with model, prompt version, token counts, latency, and produced object refs.
9. **Determinism preference.** `temperature ≈ 0.1` for extraction and classification; higher only for narrative drafting (AI-13, AI-20).
10. **Context is retrieved, not dumped.** Retrieval operates over `SourceStructure` nodes so citations resolve to real locations. Whole-file text dumping is prohibited.
11. **No cross-engagement leakage.** Retrieval is engagement-scoped by default. Firm-corpus retrieval (§14.4) is opt-in, de-identified, and separately logged.

## 14.2 Capability register

| ID | Capability | Phase | Priority |
|---|---|---|---|
| AI-01 | Kickoff Material Synthesis (objectives, stakeholders, gaps, interview guides) | W0 | P0 |
| AI-02 | Evidence Extraction | W1–2 | **P0** |
| AI-03 | Theme Clustering | W1–2 | P1 |
| AI-04 | Contradiction Detection | W1–2 | P1 |
| AI-05 | Maturity Level Proposal | W3–4 | **P0** |
| AI-06 | Opportunity Generation from Gaps | W3–4 | **P0** |
| AI-07 | Duplicate & Overlap Detection | W3–4 | **P0** |
| AI-08 | Priority Dimension Scoring | W3–4 | **P0** |
| AI-09 | Dependency Inference | W3–4 | **P0** |
| AI-10 | Sequencing Rationale | W5 | P1 |
| AI-11 | Stakeholder Feedback Synthesis | W9–10 | P1 |
| AI-12 | Executive Insight Generation | W10–12 | **P0** |
| AI-13 | Board Storyline & Headlines | W10–12 | **P0** |
| AI-14 | Next Best Action | any | P1 |
| AI-15 | Current-State Summary Drafting | W3–4 | P1 |
| AI-16 | Recommended Action Drafting | W3–4 | P1 |
| AI-17 | Initiative Grouping Proposal | W3–4 | P1 |
| AI-18 | Alternative Sequence Suggestion | W5 | P2 |
| AI-19 | Cost Analogue Proposal | W6–8 | **P2** (governance-gated) |
| AI-20 | Scenario Narrative | W6–10 | P1 |
| AI-21 | Decision Extraction | any | P1 |
| AI-22 | Review Risk Flagging | any | P2 |
| AI-23 | Workbook Semantic Recognition | ingest | **P0** |
| AI-24 | Deck Semantic Recognition | ingest | **P0** |
| AI-25 | Copilot Query Answering | any | P1 |

Detailed specifications follow for all P0 capabilities and the most consequential P1/P2 ones.

---

## AI-02 — Evidence Extraction

### Input Context
- One `SourceDocument` and its `SourceStructure`, traversed node by node in reading order (never as a single flattened blob).
- Chunking: Excel → one detected table or contiguous region per call, with header row and any weights band included. PPTX → one slide (shapes in reading order) plus notes. PDF/DOCX → ~1,500-token windows with 200-token overlap, carrying page/paragraph indices.
- Engagement context: mandate, approved `TransformationObjective`s, `TechnologyFunction` list, `Stakeholder` list (for attribution), existing entity tags.
- Slide/table `semantic_type` from AI-23/24, so credentials and appendix content can be skipped.

### Task
Identify discrete, sourced observations relevant to a technology transformation assessment. Each must be a *single* claim, quoted verbatim, and anchored to an exact location. Explicitly distinguish verifiable facts and metrics from stakeholder opinions. Do not summarize, do not synthesize across chunks, do not infer.

### Output Schema
```jsonc
{
  "evidence": [{
    "excerpt": "string, verbatim from source, <= 500 chars",
    "summary": "string, one line",
    "evidence_type": "fact|metric|opinion|risk|constraint|strength|commitment",
    "location": { /* SourceLocation discriminated union, §12.10 */ },
    "attributed_to": "string|null",
    "observed_date": "YYYY-MM-DD|null",
    "entity_tags": ["string"],
    "technology_function": "string|null",
    "business_area": "string|null",
    "confidence": 0.0,
    "confidence_basis": "string"
  }],
  "skipped_reason": "string|null"
}
```

### Evidence Requirement
`location` must reference a real node in the supplied `SourceStructure`. A post-processing validator asserts that `excerpt` occurs in that node's `content_text` (normalized whitespace). **Failing items are dropped, not persisted** — this makes citation fabrication structurally impossible rather than merely discouraged.

### Confidence
0.9–1.0 explicit statement with named attribution and date · 0.7–0.89 explicit but unattributed · 0.5–0.69 requires light interpretation · <0.5 not emitted.

### Human Review
Accept · Edit (excerpt, type, tags, attribution) · Reject (with reason) · Merge duplicates · Promote to Finding. Bulk keyboard review required.

### Failure Behavior
Non-analytical chunk → empty array with `skipped_reason`. Unparseable structure → `AIRun.status = failed`, document marked `partial`, chunk identified in the UI for manual entry.

### Downstream Consumers
Findings · MaturityScore evidence · Opportunity evidence · Dependency inference (AI-09) · lineage closure · the Copilot's retrieval corpus.

---

## AI-05 — Maturity Level Proposal

### Input Context
- The `Capability` (name, function, description).
- The full `MaturityFramework`: all five `MaturityLevelAnchor`s **including the engagement's `organization_specific_description`** — this is what calibrates the model to this client rather than to generic CMMI.
- All approved `Evidence` linked to or tagged with this capability/function (retrieved, ranked by relevance, capped at ~40 items).
- Approved `Finding`s for the capability.
- The framework's evaluation-method note (SCAMPI C informal).

### Task
Determine the CMMI level (1–5) that the evidence supports for **current** state. Cite which anchor criteria are met and which are not. Identify observable gaps preventing the next level. **Do not propose a target level** — target is a strategic choice reserved to the consultant (evidenced: targets in the corpus range 3–4 by deliberate design, with L5 explicitly not targeted).

### Output Schema
```jsonc
{
  "capability_id": "uuid",
  "proposed_current_level": 1,
  "anchor_label": "Initial|Managed|Defined|Quantitatively Managed|Optimizing",
  "rationale": "string, <= 400 chars, must name the decisive criterion",
  "criteria_met": ["string"],
  "criteria_not_met": ["string"],
  "observed_gaps": ["string"],
  "supporting_evidence_ids": ["uuid"],
  "evidence_sufficiency": "strong|adequate|thin|insufficient",
  "confidence": 0.0,
  "confidence_basis": "string",
  "candidate_opportunity_seeds": [{ "title": "string", "rationale": "string" }]
}
```

### Evidence Requirement
Minimum **2** approved evidence items. `evidence_sufficiency = insufficient` when fewer, and no level is proposed.

### Confidence
Driven by evidence count, agreement, recency, and whether criteria for adjacent levels are cleanly separated. Below 0.6 the UI renders a low-confidence warning and blocks bulk approval.

### Human Review
Accept · Accept with edited level (**mandatory rationale**) · Reject. The AI proposal is retained in `ai_proposed_level` after override, enabling calibration analysis across engagements.

### Failure Behavior
Insufficient evidence → returns `insufficient` with a list of what evidence would resolve it (e.g. *"no evidence regarding documented process or standardization"*), which is surfaced as a `DocumentRequest` candidate. **Never guesses.**

### Downstream Consumers
`MaturityScore.current_level` → CALC-01 gap → maturity heatmap → capability-gap opportunity generation (AI-06) → client maturity summary → Board maturity exhibit.

---

## AI-06 — Opportunity Generation from Gaps

### Input Context
Approved `MaturityScore`s with `gap > 0` (including `observed_gaps` and `next_steps`); approved `Finding`s with `polarity ∈ {gap, risk, tension}`; approved `TransformationObjective`s; the existing `Opportunity` list (to avoid regenerating known items); `TechnologyFunction` and business-area vocabularies.

### Task
Propose discrete, actionable opportunities that close identified gaps. Each must be at the corpus's grain — *"the specific gap or action"*, not a program. `recommended_action` must be written as a **concrete directive** (the corpus is explicit: *"Written as a concrete directive, not a general description"*).

### Output Schema
```jsonc
{
  "opportunities": [{
    "title": "string, <= 80 chars",
    "description": "string",
    "recommended_action": "string, imperative, <= 300 chars",
    "so_what": "string, the consequence of not acting",
    "technology_function": "string|null",
    "business_area": "string|null",
    "relationship_type": "B2B|B2C|B2B2C|internal|null",
    "investment_type": "defensive|multiplier|ceiling_remover|null",
    "source_capability_ids": ["uuid"],
    "source_finding_ids": ["uuid"],
    "supporting_evidence_ids": ["uuid"],
    "suggested_objective_ids": ["uuid"],
    "possible_duplicate_of": ["uuid"],
    "confidence": 0.0
  }]
}
```

### Evidence Requirement
Each opportunity must reference ≥1 capability gap or finding, and ≥1 evidence item transitively.

### Human Review
Accept · Edit · Reject · Merge into existing · Split into multiple. Split is essential — the corpus's recap email commits to *"break larger items into more actionable roadmap components."*

### Failure Behavior
No qualifying gaps → empty set with an explanation. Never invents opportunities absent a gap.

### Downstream Consumers
`Opportunity` register → AI-07 dedupe → AI-08 scoring → CALC-02/03/04 → initiative rollup → roadmap.

---

## AI-07 — Duplicate & Overlap Detection

**The systematic answer to the corpus's own open item: *"Is PIM counted 3 times? … Can we distinguish these better in the attribute scores?"***

### Input Context
All `Opportunity` records (title, description, recommended action, tech area, business area, linked capabilities, evidence IDs). Embedding similarity is precomputed and used to shortlist candidate pairs; the model adjudicates the shortlist.

### Task
Identify pairs/groups that are duplicates, overlapping (partial), or in a parent/child relationship. Distinguish **genuine duplication** from **legitimately distinct items sharing a platform** — the corpus's PIM example is precisely this hard case: consolidation, activation, and commercialization of the same platform are three different investments, not one.

### Output Schema
```jsonc
{
  "groups": [{
    "opportunity_ids": ["uuid"],
    "relationship": "duplicate|overlapping|parent_child|distinct_but_related",
    "similarity_score": 0.0,
    "shared_evidence_ids": ["uuid"],
    "rationale": "string",
    "recommended_action": "merge|split|reword_to_distinguish|keep_separate",
    "proposed_merged_title": "string|null",
    "distinguishing_factors": ["string"],
    "double_count_risk": "high|medium|low|none",
    "confidence": 0.0
  }]
}
```

`double_count_risk` explicitly addresses the scoring consequence: if three near-identical opportunities each score 5 on financial impact, the initiative rollup inflates.

### Human Review
Merge (choosing survivor and field resolution) · Split · Reword · Dismiss (with reason, suppressing the pair from future runs).

### Downstream Consumers
Opportunity register integrity → initiative `avg_score` accuracy → theme summary exhibits → Board investment narrative.

---

## AI-08 — Priority Dimension Scoring

### Input Context
- The `Opportunity` (all descriptive fields).
- The **full `PriorityModel`**: each dimension's name, weight, question prompt, and all five `PriorityAnchor`s with descriptions and this engagement's calibration examples.
- Linked evidence, findings, and capability gaps.
- Approved `TransformationObjective`s (required for Dimension 3, which scores *traceability to a named goal*).
- **Already-scored opportunities as in-context calibration exemplars** (up to 10, spanning the score range) — critical for consistency across a 50-row register.

### Task
Propose a level 1–5 for **each** active dimension by selecting the anchor whose description the evidence best satisfies. Provide the anchor label verbatim and a rationale referencing the decisive factor. **Do not compute the weighted score.**

### Output Schema
```jsonc
{
  "opportunity_id": "uuid",
  "dimension_scores": [{
    "dimension_key": "financial_impact|risk_if_deferred|strategic_alignment",
    "level": 1,
    "anchor_label": "string, verbatim from the anchor",
    "rationale": "string, <= 300 chars",
    "supporting_evidence_ids": ["uuid"],
    "traced_objective_ids": ["uuid"],
    "confidence": 0.0,
    "calibration_note": "string, which exemplar this was calibrated against"
  }],
  "scoring_completeness": "complete|partial",
  "unscoreable_dimensions": [{ "dimension_key": "string", "reason": "string" }]
}
```

### Evidence Requirement
Every dimension score requires ≥1 evidence ID **or** an explicit statement that the score rests on a linked capability gap. Dimension 3 additionally requires `traced_objective_ids` for levels 4–5 — a level 5 means *"called out by name"*, so an unnamed objective cannot support it. **Enforced by validator.**

### Confidence
Reduced when evidence is indirect, when the opportunity spans multiple functions, or when adjacent anchors are both defensible. The response must say which.

### Human Review
Per-dimension accept/edit/reject with mandatory rationale on change. Bulk-accept permitted only above a confidence threshold. **The AI proposal is retained after override** so systematic bias (e.g. the model consistently over-scoring alignment) becomes measurable.

### Failure Behavior
`unscoreable_dimensions` with reasons; the opportunity remains `is_scoring_complete = false`, calculated outputs stay `null`, and the UI shows "Not yet scored".

### Downstream Consumers
**CALC-02** weighted score → **CALC-03** band → **CALC-04** quadrant → initiative rollup → heat map → roadmap sequencing → Board priority narrative. This is the highest-leverage AI capability in the system.

---

## AI-09 — Dependency Inference

**Highest-value capability**: it structures knowledge that already exists in approved prose but has never been captured as data.

### Input Context
- All `Initiative`s and `Opportunity`s (titles, descriptions, recommended actions, next steps).
- Approved `MaturityScore.next_steps` and `observed_gaps` — dense with sequencing language.
- Approved `Evidence` with sequencing/prerequisite phrasing.
- Existing validated `Dependency` records (avoid duplicates).
- Client-proposed dependencies from workshop Activity 3.

### Task
Identify directed dependencies between initiatives/opportunities. Classify each by type. Quote the specific language that establishes it.

### Output Schema
```jsonc
{
  "dependencies": [{
    "upstream_type": "initiative|opportunity",
    "upstream_id": "uuid",
    "downstream_type": "initiative|opportunity",
    "downstream_id": "uuid",
    "dependency_type": "hard_prerequisite|sequencing_preference|unblocks|resource_contention|collision_risk|shared_platform",
    "rationale": "string",
    "trigger_language": "string, verbatim quote establishing the dependency",
    "supporting_evidence_ids": ["uuid"],
    "suggested_lag_periods": 0,
    "confidence": 0.0
  }],
  "potential_cycles": [{ "path": ["uuid"], "note": "string" }]
}
```

### Evidence Requirement
`trigger_language` must be a verbatim quote from a supplied source, validated by substring check. Inference without quotable language is emitted only at confidence < 0.6 and clearly marked as interpretive.

### Confidence
0.85+ explicit prerequisite language (*"cannot launch without"*, *"is a hard prerequisite for"*) · 0.6–0.84 directional language (*"sequence ahead of"*, *"before X goes live"*) · <0.6 thematic/interpretive.

### Human Review
Validate · Edit type or direction · Reject · Add lag. **Direction errors are the most common failure mode**, so the review UI must render the dependency as a sentence — *"{Upstream} must complete before {Downstream} can start"* — rather than as two ID fields.

### Failure Behavior
`potential_cycles` are reported but **never auto-created**. Cycle-forming hard prerequisites are rejected at write with the cycle path shown.

### Downstream Consumers
**CALC-06** earliest-start · **CALC-08** conflict detection · roadmap sequencing · scenario feasibility · the "why is this here?" explanation · Board dependency exhibit.

---

## AI-12 — Executive Insight Generation

### Input Context
The approved `RoadmapVersion` with all items, waves and timing; **all calculated aggregates already computed by CALC-13** (counts by wave/theme/band/quadrant, maturity gap totals, dependency counts); approved findings and contradictions; decisions; the engagement mandate and objectives; published-content boundary (nothing internal may be referenced).

### Task
Produce executive-level insight statements. **Every quantitative claim must be expressed as a binding token, never a literal number.** The model receives available tokens and their current values and must reference tokens.

### Output Schema
```jsonc
{
  "insights": [{
    "headline": "string, <= 100 chars, may contain {{tokens}}",
    "body": "string, <= 400 chars, may contain {{tokens}}",
    "insight_type": "state_of_play|priority|investment|value|risk|decision|dependency|change",
    "data_bindings": [{
      "token": "string",
      "source_object_type": "string",
      "source_object_id": "uuid|null",
      "field_path": "string",
      "format": "integer|decimal1|currency|percent|period|list"
    }],
    "supporting_object_refs": [{ "type": "string", "id": "uuid" }],
    "supporting_evidence_ids": ["uuid"],
    "confidence": 0.0
  }]
}
```

### Evidence Requirement
Every insight references ≥1 model object. Insights making a qualitative claim about the organization additionally require evidence IDs.

### Validation (hard gate)
A lint rule rejects any `headline`/`body` containing a bare numeral where a binding exists for that quantity. **This is the mechanical enforcement of "one source of analytical truth"** and must be covered by an automated test.

### Human Review
Edit headline and body freely; bindings are editable only by re-selecting a source field. Approve/reject per insight.

### Downstream Consumers
Board slides (AI-13) · client Overview · executive summary export.

---

## AI-13 — Board Storyline & Headlines

### Input Context
Approved `ExecutiveInsight`s; the approved roadmap and its calculated aggregates; maturity summary; decisions flagged `board_ask`; risks; the required storyline structure (§27.2); optionally the engagement's own prior decks as **style** reference (never content reference).

### Task
Produce an ordered slide sequence conforming to the required storyline, assigning each slide a type, exhibit type, headline, and message — all numbers as bindings.

### Output Schema
```jsonc
{
  "slides": [{
    "sequence": 1,
    "slide_type": "title|context|current_state|maturity_exhibit|priorities|themes|roadmap_exhibit|investment|value|risks|dependencies|decisions|asks|activation|appendix",
    "title": "string",
    "headline": "string, the so-what, may contain {{tokens}}",
    "message": "string, may contain {{tokens}}",
    "exhibit_type": "maturity_heatmap|quadrant_chart|roadmap_timeline|theme_summary_table|priority_heatmap|investment_profile|decision_table|none",
    "exhibit_config": {},
    "data_bindings": [ /* as AI-12 */ ],
    "source_object_refs": [{ "type": "string", "id": "uuid" }],
    "speaker_notes": "string"
  }],
  "storyline_rationale": "string"
}
```

### Style constraints (derived from corpus observation)
Headlines state the so-what, not the topic. Sentence case. No hedging. Numbers always via binding. Every recommendation slide names the decision being requested. **The corpus's client-specific headlines are never reused** — only the structural pattern.

### Human Review
Full edit of narrative; reorder, add, remove slides; per-slide approval. Numbers remain read-only.

### Failure Behavior
If a required storyline element lacks data (e.g. no investment data), the slide is emitted as a **placeholder** stating what is missing — never fabricated, never silently dropped.

### Downstream Consumers
`BoardDeckVersion` → Board Output view → PPTX export → staleness monitoring.

---

## AI-23 / AI-24 — Workbook & Deck Semantic Recognition

### Input Context
`SourceStructure` for one workbook/deck: sheet names, detected tables, header rows, sample rows, formulas (workbook); slide titles, shape text, table headers (deck).

### Task
Classify each sheet/table (`maturity_assessment | opportunity_register | scoring_rubric | theme_registry | heat_map | cost_model | reference | unknown`) or slide (`title | section_divider | agenda | framework | maturity_exhibit | roadmap_exhibit | findings | recommendation | credentials | appendix`), and — for workbooks — propose a column→field mapping.

### Output Schema
```jsonc
{
  "classifications": [{
    "node_path": "string",
    "semantic_type": "string",
    "confidence": 0.0,
    "signals": ["string"],
    "proposed_field_mapping": [{
      "source_column": "string", "target_field": "string",
      "transform": "none|extract_leading_integer|split_list|lookup", "confidence": 0.0
    }],
    "detected_formulas": [{ "purpose": "string", "formula": "string" }]
  }]
}
```

`transform: extract_leading_integer` exists specifically because the corpus stores scores as `"5 Transformational …"` and extracts with `VALUE(LEFT(x,1))`. Recognizing this pattern is what allows the reference workbooks to be imported faithfully — a direct requirement of the acceptance test.

### Human Review
Confirm or correct classification and every column mapping before import executes. **No import runs on unconfirmed mappings.**

### Downstream Consumers
Guided import into MaturityScore / Opportunity / PriorityModel; ingestion UI filtering (skip credentials slides).

---

## AI-19 — Cost Analogue Proposal (**P2, governance-gated**)

Included for completeness because the methodology names it (*"AI-assisted cost ranges using past Aberdeen work"*), but **gated** because the reference corpus contains no cost data and prior-client economics are the most sensitive data the firm holds.

**Mandatory controls before any implementation:**
1. Explicit firm-level opt-in per source engagement.
2. De-identification: client name, sector specifics, and any identifying figures removed; only normalized ranges by initiative archetype and effort size are retained.
3. Output is always a **range with an explicit basis note**, never a point estimate.
4. The proposing analogue set is disclosed to the consultant (count and archetype, never client identity).
5. `CostEstimate.basis = analogue` and `is_placeholder = true` until a human confirms.
6. Fully logged; per-engagement disableable.

**⚠ Product / Technical Decision Required:** firm policy on cross-engagement reuse of economics. Not resolvable from the corpus.

---

## 14.3 Other capabilities (condensed specifications)

| ID | Input → Output | Evidence | Review | Failure |
|---|---|---|---|---|
| **AI-01** Kickoff synthesis | Strategy docs, org charts → `TransformationObjective[]`, `Stakeholder[]`, `DocumentRequest[]`, interview guides | Citations required for objectives and stakeholders | Accept/edit/reject each | Emits document requests instead of guessing |
| **AI-03** Theme clustering | Approved evidence → clusters with member IDs, label, coverage count | Members are evidence IDs | Accept/rename/merge/split | Returns ungrouped set if no structure emerges |
| **AI-04** Contradiction detection | Evidence pairs → `Contradiction[]` with type and severity | Both evidence IDs required | Reconcile / accept as tension / dismiss | Empty set is a valid answer |
| **AI-10** Sequencing rationale | Roadmap + dependencies + priority → `placement_rationale` per item | References dependency and score objects | Edit freely | Omits rationale rather than inventing one |
| **AI-11** Feedback synthesis | `StakeholderFeedback[]` → themes, sentiment by group/area, disagreement map, requested changes | Quotes required | Triage each | Reports low response volume explicitly |
| **AI-14** Next best action | Engagement completion metrics + blockers → one recommended action + reasoning + link | References counts | Dismissible | Silent if nothing actionable |
| **AI-15/16** Summary & action drafting | Evidence + findings → draft prose | Citations | Edit/accept | Leaves blank |
| **AI-17** Grouping proposal | Opportunities + dependencies → initiative groupings with rationale | — | Accept/adjust | Keeps existing grouping |
| **AI-18** Alternative sequences | Roadmap + constraints → 2–3 alternative orderings with trade-offs | Must respect hard dependencies (validated by CALC-06) | Preview then apply as scenario | Reports over-constraint |
| **AI-20** Scenario narrative | CALC-computed deltas → plain-language description | Describes only computed differences | Edit | — |
| **AI-21** Decision extraction | Evidence + recommended actions → `Decision[]` with type and due date | Quote required | Accept/edit/reject | Empty valid |
| **AI-22** Review risk flagging | Object + its evidence + peer distribution → risk flags | — | Advisory only | — |
| **AI-25** Copilot | §32 | Deterministic results retrieved via tools | — | States what it cannot determine |

---

## 14.4 Firm corpus governance (§13 of the brief)

Historical Aberdeen engagements are valuable as **pattern** references and dangerous as **content** references. Two distinct uses, governed differently:

| Use | Permitted | Controls |
|---|---|---|
| **Analytical pattern reference** — rubric structures, capability trees, dependency archetypes, initiative archetypes | Yes, P1 | Structure only. No client identities, no client-specific findings or scores. Firm-curated template library. |
| **Presentation pattern reference** — storyline shape, exhibit types, headline grammar, level of detail | Yes, P1 | Style only. Prohibited from supplying substantive content. |
| **Content reuse** — findings, conclusions, recommendations from a prior client | **No** | Hard prohibition. Retrieval is engagement-scoped by default. |
| **Economics analogues** | P2, gated | §AI-19 controls. |

**Anti-contamination requirements:**
1. Retrieval defaults to `engagement_id = current`. Firm-corpus retrieval requires an explicit flag, is separately logged, and is surfaced in the UI whenever it influenced a proposal.
2. Any object influenced by firm-corpus retrieval is tagged `used_firm_corpus = true` and shown as such in review.
3. A `SourceDocument.is_reference_corpus = true` document may never be cited as evidence for the *current* client's state — enforced by validator. This is the critical guard: uploading a prior engagement's deck must not let a prior client's finding become this client's finding.
4. Firm-corpus material is excluded from client-facing lineage entirely.

---

# 15. Deterministic Calculation Engine

## 15.1 Engine requirements

- **Pure functions.** Inputs → outputs, no I/O, no side effects. Persistence is performed by callers.
- **Single module.** All formulas live in one calculation package (`/lib/calc`), imported by API routes and jobs. No formula is duplicated in UI code, in an export template, or in a prompt.
- **Total unit-test coverage.** 100 % branch coverage on this module is a merge gate.
- **Explicit missing-data semantics.** Every function declares its behaviour on incomplete input. `null` is returned; `0` is never substituted.
- **Explainability.** Every function returns `{ value, inputs, formula_string, formula_with_values }` so the UI can render "how was this calculated?" without re-deriving anything.
- **Idempotent and deterministic.** Same inputs → same outputs, always.
- **AI has no write access** to any output of this module.

## 15.2 Calculation register

---

### CALC-01 — Maturity Gap & Label
**Inputs:** `current_level` (1–5), `target_level` (1–5), `MaturityLevelAnchor[]`.
**Formulas:**
```
gap           = target_level - current_level
maturity_label = anchor[current_level].label
target_label   = anchor[target_level].label
```
**Outputs:** `gap` (int, may be negative), `maturity_label`, `target_label`.
**Triggers:** create/update of `current_level` or `target_level`; framework anchor change.
**Rounding:** integers, exact.
**Missing data:** either level null → `gap = null`, label resolved for whichever exists; UI shows "Target not set".
**Negative gap:** permitted (current exceeds target) and displayed as *"Exceeds target"* — not clamped, because it is a legitimate and informative state.
**Override:** none. Fully derived.

---

### CALC-02 — Weighted Priority Score
**The core calculation.** Direct implementation of `=SUMPRODUCT($I$5:$M$5, I7:M7)`.

**Inputs:** `dimension_scores[] {dimension_id, level}`, `PriorityDimension[] {id, weight, is_active}`.
**Formula:**
```
weighted_score = Σ over active dimensions ( level_d × weight_d )
```
**Implementation note.** The corpus achieves this with `SUMPRODUCT` across an interleaved range in which text cells happen to evaluate to zero — a construction that works but is fragile to column insertion (and the corpus contains one row where exactly that fragility has already produced a defect). Atlas computes over an explicit `{dimension_id → level}` map with `{dimension_id → weight}`, so column position is irrelevant and a missing dimension is detectable rather than silently zero.
**Outputs:** `weighted_score` (float).
**Triggers:** any dimension level change; PriorityModel weight/dimension change; opportunity merge.
**Rounding:** compute at full float precision; **store unrounded**; display to 2 decimals. Banding uses the **unrounded** value — rounding before banding would move items across the 3.75 and 4.50 thresholds incorrectly. This is a required behaviour, not an implementation preference.
**Missing data — a deliberate departure from the source, not a port of it.** In the corpus, `SUMPRODUCT` treats an unscored dimension as zero, so a half-scored opportunity silently produces a *plausible but wrong* weighted score and a *confidently wrong* priority band. Atlas does the opposite: if **any** active dimension is unscored → `weighted_score = null`, `priority_band = null`, `quadrant = null`. Partial sums are prohibited. UI: *"Not yet scored — n of m dimensions complete."*

This is the one place where the engine intentionally diverges from the observed spreadsheet behaviour, and the divergence is the point: a silently understated score is more dangerous than an absent one, because it ranks and sequences without ever announcing that it is incomplete.
**Weight validation:** `|Σ weights − 1.0| > 1e-6` → configuration error blocking scoring, surfaced in Settings.
**Override:** none on the computed value. A consultant who disagrees changes a dimension level (with rationale) or sets `human_rank`.

---

### CALC-03 — Priority Band
**Inputs:** `weighted_score`, `band_thresholds`, `band_labels`.
**Formula:**
```
band = weighted_score >= t.critical ? labels.critical
     : weighted_score >= t.high     ? labels.high
     : weighted_score >= t.medium   ? labels.medium
     :                                labels.lower
```
Defaults: `critical 4.50`, `high 3.75`, `medium 2.80` — exactly the observed nested `IF`.
**Missing data:** null score → `band = null`, displayed "Not yet scored".
**Threshold validation:** must be strictly descending.
**Override:** none.

---

### CALC-04 — Quadrant Placement
**Inputs:** dimension levels, `value_axis_dimension_ids`, `urgency_axis_dimension_id`, `quadrant_threshold_x/y`, `quadrant_labels`.
**Formulas:**
```
business_value_x = mean(levels of value_axis dimensions)     # default (D1 + D3) / 2
urgency_y        = level of urgency dimension                # default D2
bubble_size      = weighted_score
quadrant = x >= tx && y >= ty ? "Act Now"
         : x <  tx && y >= ty ? "Defend"
         : x >= tx && y <  ty ? "Plan & Fund"
         :                      "Sequence Later"
```
**Rounding:** axes to 2 decimals for display; **unrounded for comparison**.
**Missing data:** any contributing dimension unscored → all outputs null; the item is excluded from the quadrant chart and counted in an "unplotted" indicator so it is never silently invisible.
**Override:** none.

---

### CALC-05 — Duration from Effort
**Inputs:** `tshirt_size`, `EffortSize` table, `period_granularity`, optional `duration_override`.
**Formula:**
```
months          = (duration_min_months + duration_max_months) / 2      # midpoint
duration_periods = ceil(months / months_per_period)
if duration_override present: duration_periods = duration_override
```
`months_per_period`: quarter = 3, half = 6, year = 12.
**⚠ Decision Required:** midpoint vs max. **PRD recommendation: midpoint, rounded up**, with the full range displayed. `XXL` has an open upper bound (*"3–5+ years"*) — treated as 5 years for planning with a visible "open-ended" flag.
**Missing data:** no size → `duration_periods = null`; the item cannot be auto-scheduled and is flagged *"Effort not sized"*.
**Override:** `duration_override` fully supported and audited.

---

### CALC-06 — Dependency-Constrained Earliest Start
**Inputs:** `RoadmapItem[]`, validated `Dependency[]` of type `hard_prerequisite` (and `unblocks` inverted), `roadmap_start_period`, `lag_periods`.
**Algorithm:**
1. Build a DAG over items using only hard-constraining edges.
2. Detect cycles → return `error: cycle` with the path; **no scheduling occurs**.
3. Topologically sort.
4. `earliest_start(i) = max( roadmap_start, max over upstream u of ( end_period(u) + lag(u,i) + 1 ) )`.
5. `end_period(i) = start_period(i) + duration_periods(i) − 1`.
**Outputs:** `earliest_start_period` per item; ordered list; cycle report.
**Non-constraining types** (`sequencing_preference`, `resource_contention`, `collision_risk`, `shared_platform`) do **not** affect earliest start — they generate advisory warnings in CALC-08. Treating soft preferences as hard constraints would over-constrain the roadmap and is explicitly wrong.
**Missing data:** an item with null duration is placed but excluded from downstream propagation, flagged.
**Override:** a consultant may place an item before its earliest start; CALC-08 raises a violation which must be explicitly acknowledged with a reason.

---

### CALC-07 — Wave Assignment (auto-proposal)
**Inputs:** `RoadmapItem[]` with earliest start, `Theme.sequence`, `priority_band`, `quadrant`, wave definitions.
**Ordering key (descending precedence):**
1. Dependency order (topological — never violated)
2. Theme sequence ascending
3. Priority band (Critical → High → Medium → Lower)
4. Quadrant (Act Now → Defend → Plan & Fund → Sequence Later)
5. Weighted score descending
**Assignment:** place each item in the earliest wave whose period range accommodates `earliest_start` and `duration`.
**Rationale for this ordering:** every element is observed — theme `Sequence` (1–4), the band thresholds, the quadrant semantics (*"Act Now… can't wait"*, *"Sequence Later… not in the current-year plan"*), and dependency prose.
**Status:** a **proposal**. Wave assignment is always human-confirmable; the corpus's Activity 4 is a facilitated group decision, not an algorithm.
**Missing data:** unsized or unscored items are placed in an "Unsequenced" holding lane, never guessed into a wave.

---

### CALC-08 — Conflict Detection
**Inputs:** items with timing, all dependencies, wave definitions, (P1) capacity.
**Checks:**

| Code | Condition | Severity |
|---|---|---|
| `DEP_VIOLATION` | Item starts before a hard prerequisite ends (+lag) | **error** |
| `DEP_CYCLE` | Cycle among hard prerequisites | **error** |
| `SOFT_DEP_WARNING` | Sequencing preference not honoured | warning |
| `CONTENTION` | Resource-contention pair overlaps in time | warning |
| `COLLISION` | Collision-risk pair overlaps | warning |
| `HORIZON_OVERFLOW` | End period beyond planning horizon | warning |
| `WAVE_MISMATCH` | Item timing outside its assigned wave | warning |
| `UNSIZED` | No effort size | info |
| `UNSCORED` | Incomplete dimension scores | info |
| `THEME_ORDER` | Item precedes a lower-sequence theme's items with no dependency justification | info |
| `CAPACITY_EXCEEDED` (P1) | Demand > capacity in a period | warning |

**Outputs:** conflict list with codes, affected object IDs, human-readable messages, and suggested resolutions.
**Behaviour:** errors block version **approval** but never block editing — consultants must be able to work through an inconsistent intermediate state. Acknowledging an error requires a reason, recorded and shown on the item.

---

### CALC-09 — Cost Aggregation & Phasing (**P1**)
```
initiative_cost_{low,base,high} = Σ child opportunity costs (by category)
theme_cost                      = Σ initiative costs
roadmap_total                   = Σ theme costs
cost_by_period(i, p)            = base_cost(i) × distribution(i, p)
```
**⚠ Decision Required — two open items, neither evidenced:**
(a) **Range aggregation.** Summing all lows and all highs overstates the interval (perfect-correlation assumption). Statistical aggregation requires a distribution assumption. *Recommendation: simple sum for MVP, clearly labelled "sum of ranges, not a confidence interval."*
(b) **Phasing distribution.** Linear, front-loaded, or milestone-weighted. *Recommendation: linear default, per-initiative override.*
**Missing data — the critical rule:** if any contributing estimate is absent, the aggregate is `null` **and** the UI shows *"Cost not yet estimated — n of m initiatives have estimates"*. **Never `$0`. Never extrapolate from the estimated subset to a total.**

---

### CALC-10 — Resource Demand vs Capacity (**P1**)
```
demand(role, period) = Σ over active items of fte(role, item)
utilization          = demand / available_fte
```
Flag when `utilization > 1.0`; warn above a configurable threshold (default 0.85).
**⚠ Decision Required:** the corpus establishes capacity as the binding constraint but supplies no quantitative model. Requires firm input on role taxonomy and FTE conventions.
**Missing data:** no capacity → demand shown alone, labelled *"Capacity not defined — utilization cannot be calculated."*

---

### CALC-11 — Change Impact Set
**Inputs:** changed object type/ID, before/after values, the lineage graph.
**Algorithm:** forward-traverse the lineage graph from the changed object, applying per-type propagation rules (§19), collecting impacted objects with an `impact_kind` (`recalculated | may_be_stale | invalidated | conflict_created | requires_review`) and severity.
**Outputs:** `impacted_objects[]`, counts by type and severity, a human-readable summary.
**Trigger:** every consequential write (score, level, timing, dependency, weight, merge, approval).
**Persistence:** a `ChangeImpact` row, so the blast radius of a past change remains inspectable.
**Performance:** ≤1 s at P95 for a typical engagement; computed asynchronously with an optimistic UI indicator if exceeded.

---

### CALC-12 — Staleness Detection
**Inputs:** `BoardDeckVersion` (or `Publication`) with `roadmap_version_id` and `generated_at`; each slide's `source_object_refs` and `data_bindings`; the audit log since generation.
**Algorithm:**
1. Collect all objects changed since `generated_at` within the engagement.
2. Intersect with each slide's referenced objects and binding sources.
3. For bindings, additionally compare the stored rendered value with the current resolved value.
4. Mark slides stale, with reasons.
**Outputs:** `is_stale`, `stale_slide_ids[]`, per-slide reasons, and the exact message required by the brief:
> *"Roadmap Version {n} changed after this deck was generated. {k} slides may now contain outdated information."*
**Trigger:** on read of any generated output, and on every roadmap/score change (background).
**Behaviour:** never auto-regenerates. Regeneration is an explicit, audited human action — silent regeneration would break the guarantee that "what the Board saw" is reconstructible.

---

### CALC-13 — Roadmap & Portfolio Aggregates
Feeds every exhibit and every `ExecutiveInsight` binding token. All are simple, exact aggregations:
```
initiative_count_by(wave|theme|band|quadrant|business_area|function)
opportunity_count_by(...)
avg_weighted_score_by(theme|initiative|wave)        # the "Avg Weight" column
maturity: avg_current, avg_target, avg_gap, count_by_level, count_by_gap_size
avg_current_by_function                             # "Current State Avg. Across Focus Areas"
count_capabilities_at_or_below(level)
quadrant_population{}                               # count per quadrant, incl. empty ones
dependency_count_by_type, blocked_initiative_count
critical_path_length                                 # longest hard-dependency chain
items_per_period, wave_span_periods
unscored_count, unsized_count, low_confidence_count, unevidenced_count
```
**Rounding:** averages to 2 decimals for display, unrounded internally.
**Missing data:** every aggregate reports its denominator (*"average of 47 scored of 51 total"*) so a partial base is never mistaken for a complete one.

---

### CALC-14 — Scenario Comparison
**Inputs:** baseline `RoadmapVersion`, scenario `RoadmapVersion`.
**Outputs:**
```
items_added[], items_removed[], items_moved[{id, from, to, periods_delta}],
items_resized[], wave_composition_delta{}, 
score_profile_delta{avg_score_by_wave, band_distribution},
conflict_delta{added[], resolved[]},
completion_horizon_delta (periods),
theme_coverage_delta{}, dependency_violation_delta{},
cost_delta (P1, null when unestimated)
```
**Missing data:** any dimension lacking data in either side is reported as *"not comparable — {reason}"* rather than shown as zero difference.

---

### CALC-15 — Rank & Divergence
```
computed_rank  = dense_rank(weighted_score DESC) within engagement
rank_divergence = computed_rank - human_rank        # positive: humans ranked it higher
divergence_magnitude = |rank_divergence|
is_significant_divergence = divergence_magnitude >= threshold   # default 5
```
Ties in `weighted_score` share a rank; the secondary sort for display is `urgency_y` descending, then `ref` ascending, for stability.
**Missing data:** null `human_rank` → divergence null; the item appears in an "not yet ranked by client" group rather than as zero divergence.
**Override:** `human_rank` is itself the override, and requires a rationale.

---

## 15.3 Recalculation strategy

| Trigger | Scope | Mode |
|---|---|---|
| Dimension score change | That opportunity's score chain, its initiative rollup, its theme rollup | Synchronous |
| Maturity level change | That capability's gap and label; linked opportunity review flags | Synchronous |
| PriorityModel weight change | **All** PriorityScores + all rollups + all quadrants | Asynchronous job with progress; UI locks scoring during the run |
| Effort size change | Item duration → earliest starts of downstream items → conflicts | Synchronous |
| Roadmap item move | Earliest starts, conflicts, wave membership, aggregates | Synchronous; impact set asynchronous |
| Dependency validated/rejected | Earliest starts, conflicts | Synchronous |
| Opportunity merge/split | Affected rollups, ranks | Synchronous |
| Any of the above | Staleness of published outputs and Board decks | Asynchronous |

**Consistency rule:** calculated values are **stored** (not computed on read) for query performance, with `last_calculated_at`. A background reconciler verifies stored values against recomputation nightly and on demand, reporting drift — this catches missed triggers rather than hiding them.
---

# 16. Current-State Maturity Requirements

## 16.1 Scope

Implements the observed CMMI v2.0 / SCAMPI C assessment: a two-level capability tree, per-capability current and target levels with anchored rationale and evidence, calculated gap and label, a five-state review workflow, and a heatmap projection.

## 16.2 Framework configuration

- Seeded per engagement from a firm default: CMMI v2.0, SCAMPI C (Informal Appraisal), five levels labelled `Initial / Managed / Defined / Quantitatively Managed / Optimizing`, calibration note referencing Gartner IT Score descriptors.
- Each level carries a **generic description** and an **engagement-specific description** ("what this level means for this organization"). The engagement-specific text is authored per engagement — it is what calibrates AI-05 and what makes the anchors defensible in a client conversation.
- The **disclaimer is mandatory** and rendered on every client-facing and Board maturity exhibit: informal appraisal, independent judgment, not a formal certification. Non-removable in client serializers.

**⚠ Product / Technical Decision Required:** whether alternative frameworks (e.g. a bespoke 1–5 capability scale) must be supported at MVP. The corpus shows only CMMI. *Recommendation: model `MaturityFramework` generically (N levels with anchors) but ship only the CMMI seed.*

## 16.3 Capability tree

- Two levels: `TechnologyFunction` → `Capability`. Engagement-defined; no hardcoded taxonomy.
- Each function carries an optional business-model observation (the corpus pairs each function with a note on how the business operates in that area).
- Capabilities may be added, renamed, resequenced, and archived. Archiving retains historical scores.
- **⚠ Decision Required:** a firm-level starter capability library would materially speed engagement setup, but the corpus provides only one engagement's tree. *Recommendation: ship an empty tree plus a "duplicate from a previous engagement's structure (labels only, no scores)" action, gated by the §14.4 anti-contamination rules.*

## 16.4 Assessment workflow

```
Capability created (new)
  → evidence linked
  → AI-05 proposes current_level + anchor + rationale + criteria + gaps   [in_progress]
  → consultant accepts or overrides (rationale mandatory on override)
  → consultant sets target_level with rationale
  → CALC-01 derives gap and labels
  → consultant completes current-state summary, observed gaps, next steps, priority-to-fix
  → submit                                                                [ready_to_review]
  → reviewer approves                                                     [reviewed]
  → engagement lead locks for the assessment round                        [final]
```

The five states are the corpus's own dropdown vocabulary (`New / In progress / Ready to Review / Reviewed / Final`) and must be used verbatim for this object.

## 16.5 Functional behaviour

| Requirement | Detail |
|---|---|
| View capabilities | Grouped by function; heatmap and table views; filter by function, level, gap size, state, priority-to-fix, evidence count |
| View current maturity | Level integer + anchor label + full anchor text on demand |
| View target maturity | Level + rationale; **never defaulted** — an unset target displays "Target not set" |
| Review AI recommendations | Side-by-side proposal vs current with diff, confidence, criteria met/not met, citations |
| Inspect evidence | Evidence panel listing all linked items with type, attribution, date and a clickable source location that navigates the document viewer to the exact cell/shape/page |
| Edit scores | Anchor picker (sets level + label + text atomically); rationale required on any change to an AI proposal or an approved value |
| Add findings | Create a `Finding` directly from a capability, pre-linked, with polarity required |
| Approve findings | Reviewer approves; blocked with zero evidence |
| See capability gaps | `gap` calculated and displayed; `observed_gaps` text; a "gap register" view sorted by gap size × priority-to-fix |
| Connect gaps to initiatives | Generate candidate opportunities (AI-06) from a capability; link existing opportunities; a coverage indicator shows capabilities with gap > 0 and **no** linked opportunity — an explicit "uncovered gap" state |

## 16.6 Visual requirements

**Maturity heatmap (primary view).**
- Rows: technology functions, expandable to capabilities.
- Encoding: current level by colour ramp (5 steps) **plus** the numeral, never colour alone (accessibility, §10.11).
- Target shown as a marker on the cell; gap shown as a bar or delta chip.
- Toggle to re-encode by gap size, by priority-to-fix, or by evidence sufficiency.
- Badges per cell: evidence count, review state, low-confidence warning.
- Click → drill-down panel.
- **Function-level roll-up value** is the mean of child current levels, displayed with its denominator.

**Capability drill-down.** The full record per §10.4, with calculated fields visually distinguished and non-editable.

**Evidence panel.** Persistent right panel listing linked evidence with excerpt, type, attribution, date, source chip. Add/remove links inline.

**Confidence indicator.** Present wherever an AI proposal is unresolved; below threshold, a warning chip and exclusion from bulk approval.

**Gap analysis view.** Sorted list of capabilities with `gap > 0`, showing gap size, priority-to-fix, linked opportunity count, and an "uncovered" flag. This view is what connects Phase 2's diagnosis to Phase 2's initiative generation.

## 16.7 Client-facing maturity summary

Published separately and deliberately simplified: function-level view (capability detail only if explicitly published), current vs target, gap, and approved rationale. **Never** published: evidence internals, AI confidence, open items, `ai_proposed_level`, review history. The disclaimer is always rendered.

## 16.8 Benchmark view (P1)

Business domain × current position (Lagging→Leading) × North Star exemplar × attributes, with the mandatory subjectivity disclaimer verbatim in substance: current position is a subjective assessment based on interviews and document review; exemplars are representative, not audited. Kept **visually and structurally distinct** from the CMMI assessment so the two are never conflated.

---

# 17. Initiative Backlog Requirements

The backlog spans two grains — **Opportunity** (scored, the unit of prioritization) and **Initiative** (grouped, the unit of roadmap placement). Both must behave like structured portfolio data, not cards.

## 17.1 Opportunity register — required capabilities

**Grid:** virtualized, 500+ rows, column show/hide/reorder/pin persisted per user, sticky header, row selection, keyboard navigation, CSV/XLSX export of the current view.

**Required columns** (defaults marked ●):

| Column | Nature |
|---|---|
| ● Ref | system |
| ● Title | human |
| ● Theme | **derived through initiative** |
| ● Initiative | human FK |
| ● Technology function | human/AI |
| Business area (EVP) | human/AI |
| ● D1 Financial impact | human/AI, anchored |
| ● D2 Risk if deferred | human/AI, anchored |
| ● D3 Strategic alignment | human/AI, anchored |
| ● **Weighted score** | calculated |
| ● **Priority band** | calculated |
| ● **Quadrant** | calculated |
| Business value (X) / Urgency (Y) | calculated |
| ● T-shirt size | human/AI |
| Span | human |
| Investment type | human/AI |
| Relationship type | human/AI |
| Objectives | human/AI, multi |
| ● Status provenance (new/existing/updated) | human |
| ● Review state | system |
| Evidence count | calculated |
| Dependencies in/out | calculated |
| Owner | human |
| **Computed rank / Human rank / Divergence** | calculated / human / calculated |
| On roadmap | calculated |
| Confidence | AI |

**Grouping:** theme · initiative · function · business area · band · quadrant · investment type · owner. Group headers show count and calculated average score — the exact structure of the corpus's theme summary exhibits.

**Sorting:** any column; multi-level; stable tie-breaks.

**Filtering:** faceted with saved views. **Required quick filters** (each corresponds to a real consulting need visible in the corpus):

| Filter | Need it serves |
|---|---|
| Missing scores | Prevents a partial register being treated as complete |
| No evidence | Enforces "evidence before recommendation" |
| AI-suggested (unreviewed) | The review backlog |
| Low confidence | Targets reviewer attention |
| Duplicate candidates | The "counted 3 times" problem |
| High divergence | Where the room disagrees with the model |
| Not on roadmap | Catches orphaned analysis |
| Unsized | Blocks scheduling |
| Uncovered capability gaps | Diagnosis without a response |

**Inline editing:** anchor-picker popovers for dimension scores; direct edit for text and enums; calculated cells refuse focus and explain why on hover.

**Bulk actions:** assign initiative/theme · set size, investment type, relationship type · transition review state · request AI scoring · link objectives · export.

**Merge / split:** merge selects a survivor and resolves each conflicting field explicitly; split creates children inheriting evidence links, with the parent retained as `merged_into`/`split_into` for lineage.

## 17.2 Initiative view

Table and board views over initiatives with: theme, owner, business area, function, T-shirt size, **calculated avg score and band**, child opportunity count, dependency counts, roadmap placement, review/publish state, and rename history.

Actions: create/rename (appending to `previous_names`), move between themes, reassign opportunities, set size and owner, generate grouping proposals (AI-17), view rollup detail showing exactly which opportunity scores produce the average.

## 17.3 Alternative views

**Quadrant chart** — X business value, Y urgency, bubble size weighted score, colour theme; threshold guides at 3.5/3.5; brush-select filters the grid; unplotted (unscored) count always shown.

**Priority × Effort heat map** — rows = score bands (with their numeric ranges shown), columns = effort, cell content = item list, cell colour = investment type, legend `Defensive / Multiplier / Ceiling Remover`. A direct reproduction of the corpus's heat-map sheet as a live view.

**Theme summary** — grouped tables mirroring the corpus's four theme slides: initiative, average weight, constituent opportunities.

## 17.4 States

| State | Display |
|---|---|
| Empty | "No opportunities yet" + three actions: generate from capability gaps · import from spreadsheet · create manually |
| Unscored | Score cells show "—"; calculated columns show "Not yet scored"; row carries a completeness chip |
| AI-suggested | Distinct row treatment + chip until reviewed |
| Low confidence | Warning chip; excluded from bulk approve |
| Duplicate candidate | Link chip showing the candidate group |
| Merged | Struck-through, filtered out by default, reachable via lineage |
| Conflicted (concurrent edit) | Three-way resolution prompt |

---

# 18. Prioritization Requirements

## 18.1 Model configuration

- `PriorityModel` is engagement-scoped and versioned. Seeded from a firm default of three dimensions at 40 / 35 / 25 with anchored 1–5 rubrics.
- Editable: dimension set, names, weights, question prompts, anchor labels and descriptions, calibration examples, band thresholds and labels, quadrant thresholds and labels, and which dimensions form the value axis.
- Invariant: weights sum to 1.0.
- `is_locked` prevents accidental change once scoring is underway; unlocking is an Owner action requiring confirmation.
- The methodology note (Gartner IT value dimensions / SAFe WSJF lineage) is retained and displayed on the methodology exhibit — it is part of how the method is defended to a client.

## 18.2 Scoring behaviour

- **Anchored selection only.** A score is set by choosing an anchor, which atomically sets level, anchor label and anchor text. Free-entering an integer is not a supported interaction — this is the product expression of the corpus's score-as-string pattern.
- **Rationale** is required on every human-set or human-overridden score.
- **Evidence** is required for approval; Dimension 3 levels 4–5 additionally require a linked `TransformationObjective` (a "named explicitly" score with no named objective is a contradiction).
- AI proposals (AI-08) are retained after override for calibration analysis.
- Calibration exemplars from already-scored items are shown in the scoring UI to keep a 50-row register internally consistent.

## 18.3 Calculation and display

All arithmetic per CALC-02/03/04/15. Display rules:

- Weighted score to 2 decimals, with the formula expander showing substituted values.
- Band as a labelled chip with its numeric range on hover.
- Quadrant as a labelled chip with its definition on hover.
- **Never display a computed value derived from incomplete inputs.**

## 18.4 Human override and divergence — a first-class surface

This implements the engagement's core alignment mechanic (§3.8).

| Requirement | Behaviour |
|---|---|
| Blind client ranking | ClientContributors submit top-N; `is_released = false` prevents any client read of consultant ranking or other groups' input, enforced server-side |
| Reveal | Owner action releases the consultant ranking; a `StakeholderFeedback` release event is audited |
| Divergence view | Table of items where computed, client and human ranks differ, sorted by magnitude, with each item's scores and rationale side by side |
| Override | Setting `human_rank` requires a rationale; both computed and human values persist permanently |
| Reconciliation | Each divergence is resolved as `accept_computed`, `accept_human`, `rescore` (change dimension inputs, with rationale), or `accept_as_open_disagreement` — the last is legitimate and must be recordable |
| Downstream | Wave ordering may use human rank where set (configurable); the Board narrative can reference where leadership diverged from the analytical model, which is often the most interesting thing on the page |

## 18.5 Initiative and theme rollups

`Initiative.avg_score = AVG(child opportunity weighted_score)` over scored children only, **with the denominator always displayed** (e.g. "4.2 — average of 3 of 4 scored"). An initiative whose children are unscored shows "Not yet scored", never 0.

**⚠ Decision Required:** simple mean vs. weighted-by-effort mean for initiative rollup. The corpus's `Avg Weight` label and values are consistent with a simple mean. *Recommendation: simple mean, configurable later.*

---

# 19. Dependency Requirements

## 19.1 Capture paths

Four, all evidenced:

| Path | Origin | Initial state |
|---|---|---|
| AI inference from prose (AI-09) | `ai_inferred` | `ai_suggested` |
| Consultant creation | `consultant` | `validated` (author is the authority) |
| Client workshop Activity 3 | `client_workshop` | `proposed` |
| Import from a workbook/deck | `consultant` | `ai_suggested` (mapping-confirmed) |

## 19.2 Type semantics and scheduling weight

| Type | Meaning | Constrains schedule? |
|---|---|---|
| `hard_prerequisite` | Downstream cannot start until upstream completes | **Yes** |
| `unblocks` | Inverse phrasing of the above | **Yes** (normalized to hard_prerequisite) |
| `sequencing_preference` | Better done in this order | No — advisory |
| `resource_contention` | Compete for the same people | No — advisory (P1: feeds capacity) |
| `collision_risk` | Concurrent execution creates integration/operational risk | No — advisory |
| `shared_platform` | Share a platform; coordination needed | No — advisory |

**This distinction is load-bearing.** The corpus's language separates absolute prerequisites (*"cannot launch without IAM"*) from strong preferences (*"sequence with core data foundations"*). Collapsing them would produce an over-constrained, unusable roadmap.

## 19.3 Validation workflow

AI/client-proposed dependencies enter a validation queue rendered as sentences, not ID pairs: *"{Upstream} must complete before {Downstream} can start."* Actions: validate · reverse direction · change type · add lag · reject with reason · request evidence. Direction reversal is a single click because it is the most common correction.

## 19.4 Integrity rules

- Self-dependency rejected.
- Cycles among schedule-constraining types rejected at write with the full cycle path displayed.
- Duplicate edges (same pair, same type) merged with rationales concatenated.
- Deleting an initiative requires reassigning or deleting its edges explicitly.
- Only `validated` dependencies affect scheduling. Proposed ones are visualized distinctly (dashed) and excluded from CALC-06.

## 19.5 Visualization

- **On the roadmap:** directional arrows between items, styled by type, dashed if unvalidated, highlighted red when violated. Toggleable; auto-hidden above a density threshold with a "show for selected item" mode.
- **Dependency matrix:** initiative × initiative grid with type-coded cells, for bulk review.
- **Focus view:** for a selected initiative, upstream and downstream chains to depth N, with the critical path highlighted.
- **Blocked-items view:** initiatives whose start is constrained by an incomplete upstream, sorted by downstream impact count — a direct product expression of the corpus's *"unblocks 4 initiatives"* insight.

---

# 20. Roadmap Studio Requirements

## 20.1 Purpose

The interactive sequencing environment where diagnosis becomes a plan. **A card move is a model transaction, never a visual gesture.**

## 20.2 Canvas

- **Horizontal axis:** time, at the engagement's `period_granularity` (quarter default), spanning `planning_horizon_years` (5 in the corpus). Zoomable to year/half/quarter.
- **Vertical organization:** swimlanes, switchable between Theme (default — themes carry sequence), Technology Function, Business Area, and Wave.
- **Wave bands:** shaded period ranges with labels and target outcomes, rendered behind the lanes.
- **Items:** bars spanning start→end period, labelled with initiative name, coloured by theme, badged with priority band, conflict indicator, dependency count, and unsized/unscored flags.
- **Unsequenced tray:** a persistent holding area for items not yet placed (including all unsized items). Nothing is silently omitted from view.

## 20.3 Interactions

| Interaction | Behaviour |
|---|---|
| Drag horizontally | Reschedule; snaps to period; live preview of earliest-start violation while dragging |
| Drag vertically | Change lane (and, where lane = theme, reassign theme — with confirmation, since it changes rollups) |
| Resize | Override duration; the derived duration remains visible for comparison |
| Assign wave | Drag into a wave band or set via the detail panel |
| Select | Opens the detail panel: scores, dependencies, evidence, rationale, conflicts |
| Multi-select | Move a group preserving relative offsets |
| Auto-sequence | Runs CALC-07 as a **preview**; consultant accepts wholly, partially, or discards. Never applied silently |
| Filter | By theme, band, quadrant, function, business area, wave, conflict status, owner |
| Toggle overlays | Dependencies · conflicts · investment profile (P1) · resource load (P1) · maturity gap coverage |
| Switch version/scenario | Loads that version; the shell signals clearly which is active |

## 20.4 The move transaction — required sequence

When a user changes sequencing, the system must, in order:

1. **Update the structured model** — write `start_period`, `end_period`, `moved_by/at`, and require `move_reason` for manual moves on an approved version.
2. **Run deterministic recalculation** — CALC-06 earliest starts for all downstream items, CALC-05 durations if resized, CALC-13 aggregates.
3. **Surface conflicts** — CALC-08 immediately, inline on the affected bars and in a conflict panel with codes, plain-language messages, and suggested resolutions.
4. **Identify impacted downstream outputs** — CALC-11 impact set, presented as a non-blocking summary: *"This change affects 3 dependent initiatives, 2 executive insights, 4 Board slides, and 1 scenario comparison."* Each entry links to the affected object.

Steps 3 and 4 are **required**, not optional. A move that reports nothing when downstream objects exist is a defect.

## 20.5 Versioning

- Roadmap versions are explicit and labelled (`V1`, `V2`, `Final`) matching the methodology.
- Editing an approved version prompts: create a new version, or edit in place and return it to draft. Approved versions that have been published are **immutable** — editing forces a new version, so "what the client saw" survives.
- Version comparison shows added/removed/moved/resized items with period deltas.
- Every version records `based_on_version_id`, forming a lineage.

## 20.6 States

| State | Display |
|---|---|
| Empty | "No roadmap yet" + Generate first-cut sequence (CALC-07) or build manually |
| Partially sequenced | Unsequenced tray with count and reason per item |
| Conflicted | Conflict panel with counts by severity; errors block approval, not editing |
| Unsized items present | Explicit banner: "{n} initiatives have no effort size and cannot be scheduled" |
| Calculating | Non-blocking indicator; interactions queue |
| Approved | Read-only with a clear "create new version to edit" affordance |
| Scenario active | Distinct shell accent + persistent banner naming the scenario |

---

# 21. Investment / Cost / Capacity Requirements (**P1**)

## 21.1 Honest position

The methodology's Weeks 6–8 phase requires cost, capacity and value modelling. **The reference engagement contains none of it** — effort is expressed as T-shirt size and span; cost appears only as rubric calibration language; and the post-Board deck lists financial spend forecasting as a *future* workstream. Building a dollar model from this corpus would be invention.

Therefore: **data contracts and UI behaviour are specified now; every formula that cannot be derived is flagged.** The MVP ships this area functional-but-empty, with rigorous missing-data behaviour.

## 21.2 What is P0 (evidenced)

- **Effort-based sizing and scheduling.** T-shirt size → duration band → periods (CALC-05). Fully evidenced, fully implemented.
- **Ordinal value.** Dimension 1's anchored bands are a genuine, defensible value representation (*Transformational / Material / Moderate / Indirect / Hygiene*) and are surfaced as `BusinessValue.magnitude_band` without inventing dollars.
- **Investment-type classification.** `Defensive / Multiplier / Ceiling Remover` — an observed strategic taxonomy, usable in exhibits immediately.
- **Explicit absence.** Every cost surface states what is unestimated.

## 21.3 What is P1 (contracted, flagged)

| Capability | Contract | Flag |
|---|---|---|
| Cost estimates | `CostEstimate` with low/base/high, category, basis, confidence, placeholder flag | Manual entry only in P1 |
| Cost aggregation | CALC-09 | ⚠ Range aggregation method undefined |
| Cost phasing | CALC-09 | ⚠ Distribution method undefined |
| Resource demand | `ResourceRequirement` per role per period | ⚠ Role taxonomy undefined |
| Capacity | `ResourceCapacity` per role per period; utilization | ⚠ No capacity data in corpus |
| Value case | `BusinessValue` with optional quantification | ⚠ Quantification model undefined |
| ROI / payback | — | **Not specified.** Requires both cost and quantified value. Out of scope until both exist. |

## 21.4 Missing-data behaviour — non-negotiable

| Situation | Required display |
|---|---|
| No estimates at all | **"Cost not yet estimated"** + what is needed. Never `$0`, never an empty chart implying zero. |
| Partial estimates | *"Estimated: 12 of 24 initiatives. Total shown covers the estimated subset only."* **Never extrapolate.** |
| Placeholder estimates | Visually distinct; excluded from headline totals by default with a toggle. |
| No capacity data | Demand shown alone: *"Capacity not defined — utilization cannot be calculated."* |
| Client interface | The investment area is **hidden entirely** when nothing is estimated. A client must never see an empty or misleading investment page. |
| Board deck | Investment slide emitted as a placeholder naming what is missing, never fabricated. |

This is the single most important behavioural requirement in this section: a transformation roadmap that displays `$0` is worse than one that displays nothing.

---

# 22. Scenario Modeling

## 22.1 Purpose

Test alternatives without endangering the agreed plan. Methodology: *"test scenarios"*, *"scenario comparisons"*, *"create roadmap scenarios"*.

## 22.2 Baseline preservation — hard invariant

Creating a scenario deep-copies the current roadmap version into a scenario-owned version. **No scenario operation may write to a baseline object.** Enforced by a service-layer guard and covered by test. Only `promote_to_baseline` (Owner) creates a *new* baseline version from a scenario; the prior baseline is retained as superseded.

## 22.3 Scenario operations (P0)

- Duplicate baseline (or another scenario) with a name and description.
- Move initiatives (same interactions as the studio).
- Remove or defer initiatives (deferral moves beyond the horizon and records why).
- Add initiatives not on the baseline.
- Resize (change effort or duration override).
- Reassign waves.
- Apply structural constraints: max concurrent initiatives, excluded items, shortened horizon.
- Annotate with rationale.

**P1 constraints:** annual budget cap, resource capacity by role — both flagged, since neither has source data.

## 22.4 Comparison

Side-by-side, driven entirely by CALC-14. Required comparison dimensions:

| Dimension | Shown as |
|---|---|
| Composition | Items added / removed / deferred, with counts and lists |
| Timing | Items moved, with period deltas; completion horizon delta |
| Wave composition | Per-wave item counts and average score |
| Priority profile | Band and quadrant distribution delta |
| Theme coverage | Per-theme item counts — reveals whether a scenario abandons a theme |
| Dependency health | Violations added / resolved |
| Conflicts | Delta by code |
| Maturity coverage | Capability gaps addressed vs uncovered |
| Cost (P1) | Delta, or *"not comparable — cost not estimated"* |

**Rule:** any dimension lacking data on either side is reported as *not comparable*, never as a zero delta. A zero delta and an unknown delta are different facts.

AI-20 produces a plain-language narrative **describing only what the engine computed** — it never introduces a number of its own.

## 22.5 Client-facing scenarios

Scenarios may be published individually. The client comparison view is simplified: what is in each, what moves, what it means, and what decision it supports. Internal constraint parameters and conflict codes are not published.

---

# 23. Business Alignment

Implements methodology Weeks 9–10 and the corpus's onsite workshop.

## 23.1 Feedback instruments

| Instrument | Corpus basis | Structure |
|---|---|---|
| Blind priority ranking | Activity 1 | Top-N selection per group over an assigned card set |
| Urgency assignment | Activity 2 | Urgency level + business domain per initiative |
| Dependency / milestone / size input | Activity 3 | Multi-select dependencies, milestone text, T-shirt size |
| Roadmap placement | Activity 4 | Facilitated, applied by the consultant to a working version |
| Survey | Slides 15, 21, 37, 38 | Structured questions producing strengths, opportunities, tensions |
| Free comment | Throughout | Targeted validation prompts per item |

## 23.2 The reveal mechanic

1. Aberdeen assigns card sets to groups and publishes a scoped snapshot.
2. Groups submit independently. `is_released = false` — **server-side** suppression of consultant ranking and other groups' input.
3. Owner releases. All rankings become visible simultaneously.
4. The system renders the divergence view: consultant computed rank vs each group's rank vs any prior human rank.
5. Discussion; reconciliation recorded per item with rationale.

This is the highest-fidelity replication of the observed engagement mechanic and should be treated as a signature feature, not a checkbox.

## 23.3 Synthesis

AI-11 produces: theme clusters across free text; sentiment by stakeholder and business area; a disagreement map (where groups conflict with each other and with the model); and a list of requested changes each linked to its target object. Every synthesis claim quotes source feedback.

AI-04 additionally detects contradictions **between** stakeholder groups and between stakeholder statements and evidence — the corpus's IT-self-perception-vs-business-need finding is exactly this, and it was one of the most valuable slides in the deck.

## 23.4 Impact-before-accept

Every requested change is evaluated by CALC-11 **before** acceptance. The consultant sees: what moves, what conflicts appear, which dependencies break, which insights and Board slides become stale. Only then do they accept, reject, or defer — with the reason recorded.

## 23.5 Business translation

The `business_area` axis (EVP domain) drives stakeholder-specific views: filter the roadmap and backlog to one business area, showing what that leader receives and when, what they must supply, and which of their objectives are served. This is the mechanism by which a technology roadmap becomes a business conversation — and it is enabled entirely by the observed `Business Area Mapping : EVP Area` column.

## 23.6 Outputs

`RoadmapVersion{label: "V2", type: business_aligned}`; a current decision log; recorded human ranks with rationale; a stakeholder feedback record retained permanently as engagement evidence; and an agreed-outcomes set (P1: KPIs).

---

# 24. Decision Management

## 24.1 Why a first-class object

Decisions appear throughout the corpus as a distinct artefact type: *"Several critical decisions requiring near-term direction and sequencing"*; recommended actions written as decision-forcing directives with deadlines (*"Set Q3 2026 decision deadline"*, *"Make platform decision by mid-2026"*); and the methodology names a *"decision log"* and *"key decisions/asks"* as required outputs. Decisions outlive the workshop and the deck, so they cannot live inside either.

## 24.2 Types

| Type | Meaning | Surfaces |
|---|---|---|
| `required` | Identified as needed; not yet made | Workspace, Client Decisions panel |
| `made` | Recorded with outcome, date, decision-maker, rationale | Decision log, change history |
| `board_ask` | Escalated for Board approval | Board deck asks slide |

## 24.3 Behaviour

- Created manually or proposed by AI-21 from evidence and recommended actions (with a quote).
- Linked to any object — initiative, opportunity, roadmap item, capability, scenario.
- Assigned to a `Stakeholder` with a due date; overdue decisions surface on the Overview.
- Recording an outcome may trigger model changes; those changes run through CALC-11 and are linked to the decision, so the decision log explains *why* the roadmap changed.
- Client executives may record decisions directly; consultants may record by proxy with attribution (`recorded_by_proxy`, `attributed_to`).
- Publishable: the client Decisions panel shows what is being asked, by when, and why it matters.
- Superseding a decision retains the original with a link — decision history is never rewritten.

## 24.4 Relationship to assumptions

An `Assumption` is what the roadmap presumes; a `Decision` is what someone commits to. Invalidating an assumption commonly creates a required decision — the system offers this transition explicitly and links the two.
---

# 25. Client Publishing Workflow

## 25.1 Why publishing is a gate, not a toggle

The corpus makes the need explicit. Internal working material includes partner challenges (*"Is PIM counted 3 times?"*, *"should it be a 5?"*), draft scores stamped *"First draft – will be updated based on additional inputs"*, and an emailed caveat to the client that *"some of the rankings/scoring on the deck will shift."* Aberdeen deliberately manages what the client sees and when. Atlas must make that deliberate act structural.

## 25.2 The three states, restated

| State | Meaning | Who sees it |
|---|---|---|
| **Draft** (`internal` + review state `ai_suggested`/`draft`) | Aberdeen working content | Aberdeen only |
| **Reviewed / Approved** (`internal` + `approved`) | Internally accepted, not yet shared | Aberdeen only |
| **Published** | Explicitly released to a named client audience | Client roles, per scope |

**Invariant:** `publish` requires `review_state = approved`. Enforced by service guard and DB constraint.

## 25.3 The publish action

Publishing is **itemized, previewed, and immutable**:

1. **Select artefacts.** The publishing screen lists every publishable artefact type with its review state, current publish state, and a diff since last publication:
   - Maturity summary (function level and/or capability level)
   - Findings (by category; strengths included)
   - Opportunity/initiative detail (with a per-field visibility policy)
   - Roadmap version
   - Scenarios (individually selectable)
   - Executive insights
   - Decisions requiring client input
   - Investment view (P1; blocked if unestimated)
   - Board deck
2. **Choose audience.** Roles and scopes — e.g. publish a card set only to a named `ClientContributor` group for workshop input.
3. **Preview as client.** A required step that renders the exact client payload. The preview uses the client serializer, so what is previewed is literally what will be served.
4. **Confirm.** Creates an immutable `Publication` snapshot containing the fully serialized payload.
5. **Notify** (optional) the client audience.

## 25.4 Snapshot semantics — the leakage guarantee

Client reads resolve against `Publication.snapshot_data`, **not** live working tables. Consequences, all desirable:

- Aberdeen may continue editing immediately after publishing with zero risk of exposing work in progress.
- What the client saw on a given date is permanently reconstructible.
- A field accidentally left out of a serializer cannot leak, because the client never queries the live model at all.
- Retraction is instantaneous and complete.

This is a deliberate architectural choice over filter-based access control, which fails open when a new field is added.

## 25.5 Field-level visibility policy

Per artefact type, a policy declares which fields are client-visible. Defaults:

| Field class | Client-visible |
|---|---|
| Titles, descriptions, recommended actions, "so what", timing, waves, themes, business outcomes | **Yes** |
| Approved maturity levels, targets, gaps, rationale, framework disclaimer | **Yes** |
| Dependencies (validated only), with type and rationale | **Yes** |
| Decisions requiring client input | **Yes** |
| Dimension scores, weighted score, band, quadrant | **⚠ Configurable — see OQ-11** |
| Evidence excerpts and source locations | **No** by default (⚠ configurable per engagement) |
| AI confidence, `ai_proposed_*`, rationale-of-AI | **Never** |
| Open items | **Never** |
| Review history, reviewer identities, rejected items | **Never** |
| Divergence internals (computed vs human rank mechanics) | **Never** by default |
| Unpublished scenarios and draft versions | **Never** |

**⚠ Product / Technical Decision Required (OQ-11):** the corpus *did* show scores to the client — the workshop deck presents the weighting methodology, the priority definitions, and per-initiative average weights. So score visibility is clearly permitted in practice. But it was shown as a curated exhibit, not as a raw register. *Recommendation: publish scores at initiative level and publish the methodology; make opportunity-level raw scores an opt-in per engagement.*

## 25.6 Republishing and change communication

- Republishing creates `Publication` v+1; the prior remains identifiable and retrievable.
- The client "What changed" view is generated from the diff between consecutive publications, in plain language: *"3 initiatives moved to Wave 2; 1 initiative added; 2 maturity targets revised."* Each entry links to the item and, where a `Decision` caused the change, names it.
- Aberdeen may add a publication note that appears to the client — the product equivalent of the recap email's framing paragraph.

## 25.7 Retraction

Owner-only, requires a reason, immediate, audited. Retracted publications remain in history. The client interface shows a neutral state (*"The published view is being updated"*) rather than an error.

---

# 26. Executive Interface

## 26.1 Design brief

For U4 (client technology executive). Optimize for **decision usefulness**, not analytical completeness. The client must not have to navigate the consultant's workflow to understand what they are being asked to approve.

## 26.2 Screens

### Overview
- Engagement mandate and phase.
- Three to five published `ExecutiveInsight` headlines — the state of play, in Aberdeen's words, with numbers bound to the model.
- Counters: decisions awaiting you · changes since your last visit · scenarios available for comparison.
- Publication timestamp and note.

### Current State
- Function-level maturity: current, target, gap, with the framework disclaimer.
- Key findings by category, **including strengths** (the corpus balances deliberately; a deficits-only client view misrepresents the assessment and damages the relationship).
- Accepted tensions, where published — often the most resonant content.

### Roadmap
- Read-only timeline: waves, themes, initiatives, timing.
- Filters: theme, business area, wave.
- Toggle: validated dependencies.
- Click an initiative → published detail: what it is, why it matters, the recommended action, which objectives it serves, timing, wave, expected outcome, dependencies, and (if published) its priority band.
- **No** editing, no scores unless published, no evidence internals.

### Investment (P1)
Hidden entirely when unestimated. When present: total range with an explicit basis statement, phasing by year, breakdown by theme and wave, and a clear statement of estimate confidence and coverage.

### Value
Ordinal value profile from Dimension 1 bands (P0-safe), plus quantified value where entered (P1). Never a fabricated ROI.

### Scenarios
Published scenarios side by side with a plain-language difference summary and the decision each supports.

### Decisions
What is being asked · by when · why it matters · what it unblocks · Record Decision. Decisions the executive has made appear with their rationale.

### Changes
Diff since the last publication, in plain language, with links.

## 26.3 Interaction constraints

- Read + decide + comment. No model editing.
- Comments create `StakeholderFeedback` and enter Aberdeen's triage queue — the client's voice is captured structurally, not by email.
- Export limited to published artefacts, watermarked with the publication version and date.
- Fully responsive; executives open these on tablets and phones.

---

# 27. Board Deck Generator

## 27.1 Principle

> The Board deck is a **rendering of the model**, not a document about the model.

Every number is a binding. Every message is reviewable. Every slide knows which objects it depends on, which is what makes staleness detection possible.

## 27.2 Required storyline

Derived from the methodology's Weeks 10–12 outputs (*"sharpen executive storyline… develop Board-level messages… define transformation governance… identify key decisions/asks… prepare 90-day activation plan"*) and corroborated by the corpus's own narrative arc — current state → maturity → themes → prioritization method → prioritized view → foundations → sequence → next steps.

| # | Slide type | Purpose | Exhibit | Numbers from |
|---|---|---|---|---|
| 1 | `title` | Engagement identity, date, version | — | — |
| 2 | `context` | The mandate and why now | — | Engagement, objectives |
| 3 | `approach` | How the assessment was conducted; the method's credibility | method summary | Counts of interviews, documents, capabilities, opportunities (CALC-13) |
| 4 | `current_state` | Where the organization stands | findings summary | Finding counts by category and polarity |
| 5 | `maturity_exhibit` | Maturity across functions | **maturity heatmap** | MaturityScore, CALC-01, CALC-13 |
| 6 | `themes` | The investment themes and the strategic question each answers | theme summary table | Theme rollups (CALC-13) |
| 7 | `priorities` | How priorities were determined and what emerged | **quadrant chart** and/or **priority heat map** | PriorityModel, PriorityScore, CALC-02/03/04 |
| 8 | `roadmap_exhibit` | The sequenced plan | **roadmap timeline** | RoadmapVersion, waves, items |
| 9 | `dependencies` | What must precede what | dependency view | Validated dependencies, CALC-06 |
| 10 | `investment` | What it costs and when (**P1**) | investment profile | CostEstimate, CALC-09 — **placeholder if unestimated** |
| 11 | `value` | What it returns | value profile | BusinessValue; ordinal in P0 |
| 12 | `risks` | What could go wrong | risk summary | Findings with polarity risk; assumptions with high impact |
| 13 | `decisions` | Decisions already taken | decision table | Decision (`made`) |
| 14 | `asks` | **What the Board is being asked to approve** | ask table | Decision (`board_ask`) |
| 15 | `activation` | The first 90 days | activation table | ActivationItem (P1) |
| 16+ | `appendix` | Supporting detail | various | — |

Slides 10, 11 and 15 are **conditionally emitted**: present as placeholders naming the missing input when their data does not exist. Never silently omitted (which would hide a gap) and never fabricated.

## 27.3 Field-to-slide mapping

Each `BoardSlide` carries:
- `headline` — AI-drafted (AI-13), fully human-editable, states the so-what.
- `message` — AI-drafted, human-editable supporting text.
- `data_bindings[]` — token → `{object_type, object_id, field_path, format}`. Resolved at render.
- `exhibit_type` + `exhibit_config` — declarative; the renderer queries the model.
- `source_object_refs[]` — everything this slide depends on. **This is the staleness index.**
- `speaker_notes` — AI-drafted, human-editable.

## 27.4 Deterministic vs generated

| Element | Source | Editable |
|---|---|---|
| All numeric values | CALC-* via bindings | **No** — change the model instead |
| All exhibits | Model queries | Config only (filters, grouping) |
| Slide sequence | Required storyline | Reorder / add / remove |
| Headlines and messages | AI-13, human-approved | **Yes** |
| Speaker notes | AI-13 | Yes |
| Ask text | Decision records | Via the Decision object |

**Validation gate:** a lint rule rejects a bare numeral in `headline`/`message` where a binding exists for that quantity. Covered by automated test. This is the mechanical guarantee that the deck cannot develop its own numbers.

## 27.5 Review workflow

Generate (Editor or Owner) → per-slide review → Owner approves the deck → publish to the Board Output view and/or export. Individual slides carry review state; a deck cannot be approved with unreviewed slides.

## 27.6 Regeneration behaviour

- Regeneration is **always explicit**. Silent regeneration would destroy the reconstructability of "what the Board saw."
- On regeneration the system offers: regenerate all · regenerate only stale slides · regenerate numbers only (preserving human-edited narrative). **The third option is the default** — consultants invest real effort in headline wording, and losing it to a number refresh would make the feature actively harmful.
- Human edits are preserved with an indicator when the underlying data has moved beneath them.

## 27.7 Board deck versioning

### 27.7.1 Requirements

Every `BoardDeckVersion` records: version number, `roadmap_version_id`, `generated_at`, `generated_by`, status (`draft / in_review / approved / superseded`), approver and approval time, publish state, and the export artefact reference.

### 27.7.2 Staleness detection (CALC-12)

Computed on read and on change. Output includes the exact user-facing message required:

> **Roadmap Version 7 changed after this deck was generated. 3 slides may now contain outdated information.**

Per-slide detail names the reason: *"Slide 8 (Roadmap): 2 initiatives moved. Slide 7 (Priorities): 1 opportunity re-scored, changing the Act Now count from 12 to 11. Slide 14 (Asks): 1 decision resolved."*

### 27.7.3 Staleness sources

| Change | Slides affected |
|---|---|
| Roadmap item moved/added/removed | roadmap_exhibit, dependencies, activation, any bound counts |
| Dimension score changed | priorities, themes, any bound averages |
| PriorityModel weights changed | **all score-derived slides** |
| Maturity level changed | maturity_exhibit, current_state |
| Dependency validated/rejected | dependencies, roadmap_exhibit |
| Decision resolved | decisions, asks |
| Cost estimate changed (P1) | investment |
| Finding approved/rejected | current_state, risks |

### 27.7.4 Display rules

- Internal viewers see a persistent staleness banner with counts and a per-slide indicator.
- `BoardViewer` sees the deck **as generated**, stamped with its version and date — no staleness banner, because they are looking at a historical artefact deliberately.
- An approved-and-published deck is **never** auto-updated.
- Superseding a deck retains the prior version permanently, including its export.

---

# 28. Export Requirements

## 28.1 Scope

Only formats the engagement workflow demonstrably needs.

| Export | Format | Priority | Justification |
|---|---|---|---|
| Board deck | **PPTX** | **P0** | The Board meeting is the engagement's terminal output; PPTX is the medium |
| Opportunity register | **XLSX** | **P0** | The corpus's own working artefact; consultants will need to work offline and share |
| Maturity assessment | **XLSX** | **P0** | Same |
| Roadmap | **PDF/PNG** | P1 | For inclusion in other documents |
| Executive summary | **PDF** | P1 | Client leave-behind |
| Full engagement archive | **ZIP** (XLSX + PPTX + PDF + manifest) | P2 | Engagement close |

## 28.2 PPTX generation

- Generated server-side from `BoardDeckVersion` and its slides.
- **Templated**, not free-form: a firm template supplies masters, fonts, colours and layouts; slide types map to layouts.
- Exhibits rendered as **native PowerPoint objects where feasible** (tables, charts) rather than images, so the deck remains editable downstream. Complex visuals (roadmap timeline, quadrant bubble chart) may be high-resolution images with the underlying data included in a hidden or appendix table — a pragmatic trade-off that preserves auditability.
- Every slide's speaker notes include a provenance footer: engagement, roadmap version, deck version, generation timestamp.
- **Editable after export.** The exported file is a normal PPTX. Atlas does not attempt round-trip editing; regeneration replaces.

## 28.3 XLSX generation

- Opportunity register export mirrors the working grid, including anchor text alongside each score level (preserving the score-as-string pattern that makes the export self-explanatory), calculated columns clearly labelled as calculated, and a cover sheet documenting the `PriorityModel` (weights, thresholds, anchors) so the file is independently interpretable.
- Maturity export mirrors the assessment grid plus the framework definitions sheet and the disclaimer — matching the corpus's own workbook structure, which included an Introduction and a Definitions tab precisely so the file could travel.
- Exports are **values, not formulas**, with a note stating that the authoritative calculation lives in Atlas. (Re-emitting formulas would recreate the divergence problem the product exists to solve.)

## 28.4 Governance

- Client-role exports contain published content only, watermarked with publication version and date.
- Every export writes an `AuditEvent` recording who, what, when, and which version.
- Exports are generated on demand and stored with a signed, expiring URL.
- Large exports run as background jobs with progress and notification.

---

# 29. Versioning & Change Propagation

## 29.1 What is versioned

| Object | Mechanism | Granularity |
|---|---|---|
| Opportunity / Initiative / Finding / MaturityScore | Field-level history with actor, timestamp, prior value, reason | Every change |
| PriorityScore dimension levels | Full history including AI proposal and every override with rationale | Every change |
| PriorityModel | Explicit version number; changes force recalculation | Model-level |
| RoadmapVersion | Explicit labelled versions (`V1`/`V2`/`Final`) with lineage | Version-level |
| Scenario | Own roadmap version + `ScenarioChange` list | Change-level |
| Assumption / Decision | Status history; supersession links | Every change |
| Publication | Immutable snapshots, sequentially numbered | Publication-level |
| BoardDeckVersion | Immutable on approval; supersession retained | Deck-level |

## 29.2 The four questions

Every versioned object must answer, in the UI:

1. **What changed?** Field-level diff, human-readable (*"Dimension 2 raised from 3 (Compounding) to 4 (Severe)"*).
2. **Who changed it?** Actor and role; `ai_suggested` clearly attributed to a capability ID and run.
3. **When?** Timestamp, with elapsed context.
4. **What did it affect?** The persisted `ChangeImpact` set for that change.

Question 4 is what distinguishes this from a generic audit trail and is the requirement most likely to be under-built. It must be tested.

## 29.3 Change propagation rules

CALC-11 applies these rules. Each is derived from a real dependency in the analytical chain.

### Rule set

| # | Trigger | Propagates to | Impact kind |
|---|---|---|---|
| P1 | Dimension score changed | PriorityScore (weighted, band, quadrant, rank) | `recalculated` |
| P2 | ↳ then | Initiative `avg_score`, band | `recalculated` |
| P3 | ↳ then | Theme `avg_score` | `recalculated` |
| P4 | ↳ then | Rank of **all** opportunities (dense rank is global) | `recalculated` |
| P5 | ↳ then | Wave assignment proposals, quadrant chart, heat map | `may_be_stale` |
| P6 | ↳ then | ExecutiveInsights bound to affected values | `may_be_stale` |
| P7 | ↳ then | Board slides referencing those objects/bindings | `may_be_stale` |
| P8 | PriorityModel weight/threshold changed | **All** PriorityScores, all rollups, all quadrants, all rank | `recalculated` (async) |
| P9 | Maturity current/target level changed | Gap, label | `recalculated` |
| P10 | ↳ then | Opportunities derived from that capability gap | `requires_review` |
| P11 | ↳ then | Maturity exhibits, client maturity summary, Board slide 5 | `may_be_stale` |
| P12 | Effort size changed | Item duration | `recalculated` |
| P13 | ↳ then | Earliest start of all downstream items | `recalculated` |
| P14 | ↳ then | Conflicts, wave membership, completion horizon | `recalculated` |
| P15 | **Roadmap item moved** | Downstream items' earliest start | `recalculated` |
| P16 | ↳ then | Conflict set (violations created or resolved) | `conflict_created` / `recalculated` |
| P17 | ↳ then | Wave composition and wave aggregates | `recalculated` |
| P18 | ↳ then | Cost phasing by period (P1) | `recalculated` |
| P19 | ↳ then | Resource demand by period (P1) | `recalculated` |
| P20 | ↳ then | Value realization timing (P1) | `recalculated` |
| P21 | ↳ then | Scenario comparisons referencing the baseline | `may_be_stale` |
| P22 | ↳ then | Roadmap exhibit, ExecutiveInsights, Board slides | `may_be_stale` |
| P23 | Dependency validated / rejected / retyped | Earliest starts, conflicts | `recalculated` |
| P24 | Opportunity merged | Rollups, ranks, evidence links, roadmap coverage | `recalculated` |
| P25 | Objective changed/removed | Dimension 3 scores citing it | `requires_review` |
| P26 | Evidence rejected after use | Findings/scores citing it | `requires_review` |
| P27 | Assumption invalidated | Objects depending on it | `requires_review` |
| P28 | Decision recorded | Objects it changes; roadmap version | `recalculated` |
| P29 | Any of the above | Publications and Board decks containing affected objects | `may_be_stale` |

### The worked example from the brief

*A consultant moves Initiative A from Q1 to Q3.* The system must determine and report:

| Affected | Rule | Behaviour |
|---|---|---|
| Dependent initiatives | P15 | Earliest starts recalculated; downstream items that now violate are flagged |
| Cost phasing | P18 | Recalculated (P1); if unestimated, reported as *"no cost data — phasing not affected"* |
| Resource requirements | P19 | Recalculated (P1) or reported as not modelled |
| Value realization | P20 | Shifted (P1) or reported as ordinal-only |
| Scenario comparison | P21 | Comparisons against this baseline marked stale |
| Roadmap visual | P17 | Re-rendered; wave composition updated |
| Executive insights | P22 | Any insight bound to Wave 1 counts or completion horizon marked stale |
| Board deck exhibits | P29 | Specific slides identified with reasons |
| Board narrative | P29 | Headlines containing affected bindings flagged for re-review |

Presented as a single, non-blocking summary with links — never as a modal that prevents the consultant from continuing to think.

## 29.4 Propagation constraints

- **Never silent.** Every propagation produces a visible, persisted record.
- **Never auto-approving.** Propagation may recalculate; it may never move an object from `draft` to `approved`, or from `internal` to `published`.
- **Never auto-regenerating outputs.** Stale is flagged; regeneration is a human act.
- **Bounded.** Traversal depth limit 8 with cycle protection; a truncated traversal reports truncation rather than a partial answer presented as complete.
- **Acknowledgeable.** A consultant may acknowledge an impact set; the acknowledgement is recorded and the item leaves the attention queue without the underlying record being deleted.

---

# 30. Auditability / Explainability

## 30.1 Audit log

Append-only `AuditEvent` for every: create, update, delete (soft), state transition, override, approval, rejection, publish, retract, export, AI run, role grant/revoke, login, and permission denial.

Each event records actor, role, object type and ID, before/after (for updates), optional reason, and timestamp. **No update or delete path exists** — the table is insert-only at the database permission level.

Viewable by Owner (full engagement scope), Editor/Reviewer (engagement scope), PlatformAdmin (all). **Never** by client roles.

## 30.2 Explainability surfaces

| Question | Surface |
|---|---|
| How was this number calculated? | Formula expander on every calculated field: formula string, substituted values, links to each input |
| Why is this initiative here? | The §13.2 two-part explanation — deterministic narrative plus the evidence closure |
| Why this maturity level? | Anchor text, criteria met/not met, rationale, evidence list, AI proposal vs final with override rationale |
| Why this priority? | Three dimension anchors with rationale and evidence, the weighting, the band threshold crossed |
| Why this sequence? | Dependency chain, theme sequence, priority band, quadrant, and any human placement rationale |
| Where did this AI output come from? | `AIRun`: capability, model, prompt version, inputs summarized, timestamp, actor who triggered it |
| What did the client see on {date}? | The `Publication` snapshot, rendered |
| What changed and what did it affect? | Version history + persisted `ChangeImpact` |

## 30.3 AI transparency requirements

- Every AI-generated field is visually marked until human-reviewed, then marked as reviewed with the reviewer's name.
- The original AI proposal is retained after override (`ai_proposed_level`, `ai_original_value`), enabling systematic calibration analysis — e.g. discovering that the model consistently over-scores strategic alignment.
- Confidence and `confidence_basis` are always inspectable internally.
- Where firm-corpus retrieval influenced a proposal, it is disclosed on the object.
- An engagement-level AI usage report shows runs by capability, acceptance rate, override rate, and mean confidence — the raw material for improving prompts and for defending the method to a sceptical client.

## 30.4 Defensibility

The engagement's professional standing depends on being able to answer, months later: *on what basis did you conclude this?* Atlas must make that answerable without recourse to anyone's memory. Concretely, for any published recommendation the system can produce: the finding, the evidence, the source document, the exact location within it, who approved it and when, what the model proposed versus what the consultant concluded, and every subsequent change with its reason.
---

# 31. Functional Requirements

## 31.0 Global product states

These states are cross-cutting and apply to every workflow. Implementing them is a functional requirement, not a styling exercise — several of them exist specifically to prevent the application from asserting things that are not true.

| State | Rule | Example |
|---|---|---|
| **Empty** | Name what is missing and offer the action that fills it | *"No opportunities yet — generate from capability gaps, import from a spreadsheet, or create manually"* |
| **Loading / processing** | Skeletons for structure; determinate progress with cancel for ingestion and AI | *"Extracting evidence… 34 items found"* |
| **AI generating** | Distinct treatment; cancellable; partial results shown as they arrive where safe | *"Proposing maturity levels — 6 of 28 capabilities"* |
| **AI suggested** | Persistent chip until a human acts; excluded from approved counts | Row tinted; `AI suggested` chip |
| **In review** | Shows who it is with and since when | *"With {reviewer} since 12 Aug"* |
| **Approved** | Marked with approver and date | ✓ *Approved by {name}, 12 Aug* |
| **Published** | Shows publication version and date | *Published v3 · 12 Aug* |
| **Failed processing** | Plain-language cause, retry, and a manual fallback | *"Could not read 2 of 8 sheets: {names}. You can still review the rest, or enter data manually."* |
| **Missing data** | **Never substitute zero.** State the absence and its cause | *"Cost not yet estimated — 12 of 24 initiatives have no estimate"* |
| **Low confidence** | Warning chip; excluded from bulk approval | *"Low confidence (0.42) — thin evidence"* |
| **Stale output** | Names the trigger and the count | *"Roadmap Version 7 changed after this deck was generated. 3 slides may now contain outdated information."* |
| **Conflicted (concurrent edit)** | Three-way resolution, never silent overwrite | yours / theirs / current |
| **Not comparable** | Distinguish "no difference" from "cannot tell" | *"Cost delta not comparable — cost not estimated in baseline"* |

## 31.1 Foundation

### FR-001 — Create Engagement
**User:** EngagementOwner, PlatformAdmin
**Trigger:** "New engagement" from the engagement list
**Preconditions:** User belongs to a consultancy Organization
**Behavior:**
1. Collect name, client name, mandate, start/target-end dates, planning horizon, period granularity, roadmap start period.
2. Create `Engagement` with `phase = kickoff`.
3. Seed a `PriorityModel` from the firm default (three dimensions, weights 0.40/0.35/0.25, anchored 1–5 rubrics with **generic** descriptions, bands 4.50/3.75/2.80, quadrant thresholds 3.5/3.5).
4. Seed a `MaturityFramework` (CMMI v2.0, SCAMPI C, five anchored levels, disclaimer text).
5. Seed an `EffortScale` (XS–XXL with duration and risk bands).
6. Grant creator `EngagementOwner`.
7. Write `AuditEvent`.
**Data Used:** Organization, Engagement, PriorityModel, PriorityDimension, PriorityAnchor, MaturityFramework, MaturityLevelAnchor, EffortScale, EffortSize, EngagementMembership
**AI Involvement:** None
**Acceptance Criteria:**
- Engagement appears only to members.
- Seeded model has weights summing to 1.0.
- No client data from any other engagement is present.
- Overview renders its empty-state setup checklist.
**Priority:** P0

### FR-002 — Assign Engagement Roles
**User:** EngagementOwner
**Trigger:** Settings → Team → Add member
**Preconditions:** Engagement exists
**Behavior:** Select or invite a user; assign one role; optionally set scope for `Reviewer`/`ClientContributor`; create `EngagementMembership`; send invitation; audit.
**Data Used:** User, EngagementMembership, AuditEvent
**AI Involvement:** None
**Acceptance Criteria:**
- A user with no membership receives 403 on every engagement route.
- Client roles cannot be granted Aberdeen-only capabilities.
- Role changes take effect on the next request without re-login.
**Priority:** P0

### FR-003 — Enforce Engagement Isolation
**User:** System
**Trigger:** Every data access
**Behavior:** Every query is scoped by `engagement_id` at the data-access layer; membership is verified server-side; cross-engagement access returns 403 without disclosing existence.
**Data Used:** All
**AI Involvement:** None
**Acceptance Criteria:**
- Automated test: user in Engagement A receives 403 for every Engagement B object ID via direct API call.
- No endpoint accepts an object ID without also resolving and checking its engagement.
**Priority:** P0

## 31.2 Ingestion

### FR-010 — Upload Source Documents
**User:** Owner, Editor
**Trigger:** Sources → Upload
**Preconditions:** Engagement active
**Behavior:**
1. Accept one or many files (PPTX, XLSX, PDF, DOCX, TXT, MD, CSV); validate type and size (≤100 MB).
2. Scan, store, checksum, create `SourceDocument` with `processing_status = queued`.
3. Capture metadata: doc type, title, linked stakeholder, source date, confidentiality, `is_reference_corpus`.
4. Enqueue processing; return immediately.
**Data Used:** SourceDocument, blob storage, job queue
**AI Involvement:** None at upload
**Acceptance Criteria:**
- Upload returns without waiting for parsing.
- Rejected files state the reason; the rest of the batch proceeds.
- A 0-byte file fails gracefully with a clear message and does not affect siblings.
**Priority:** P0

### FR-011 — Parse Document Structure
**User:** System
**Trigger:** Queued document
**Behavior:** Parse per §11.4–11.6 into a persisted `SourceStructure` tree, retaining Excel formulas, header rows below row 1, hidden columns, validation lists, external references, PPTX tables with merge maps, notes, and reading-order shape enumeration. Update status; record counts; on partial failure mark `partial` and name the failed nodes.
**Data Used:** SourceDocument, SourceStructure
**AI Involvement:** None (deterministic parse)
**Acceptance Criteria:**
- For a workbook fixture, `=SUMPRODUCT(...)` and `=IF(...)` formulas are retrievable as text.
- A header row at row 6 is correctly identified as the header.
- A hidden helper column with `=VALUE(LEFT(x,1))` is present in the tree.
- For a deck fixture, table cells retain row/column coordinates and merges.
- Every node has a resolvable path.
**Priority:** P0

### FR-012 — Extract Candidate Evidence
**User:** Owner, Editor (trigger); System (execute)
**Trigger:** Automatic after parse, or manual re-run
**Preconditions:** `SourceStructure` exists
**Behavior:** Run AI-02 per chunk; validate that every excerpt occurs in its cited node (dropping failures); create `Evidence` in `ai_suggested` with location, type, tags, confidence; write `AIRun`.
**Data Used:** SourceStructure, Evidence, AIRun
**AI Involvement:** **AI-02**
**Acceptance Criteria:**
- Every persisted evidence item has a resolvable `SourceLocation`.
- No evidence exists whose excerpt is absent from the cited node.
- All items are `ai_suggested`; none approved.
- Cancelling mid-run leaves already-created items intact and the run marked partial.
**Priority:** P0

### FR-013 — Review Evidence
**User:** Owner, Editor
**Trigger:** Evidence queue
**Behavior:** Accept (→ `draft`), Edit (excerpt/type/tags/attribution, with the original retained), Reject (reason required), Merge duplicates, or Promote to Finding. Bulk keyboard operations supported. Every action audited.
**Data Used:** Evidence, AuditEvent
**AI Involvement:** None
**Acceptance Criteria:**
- Rejected evidence is excluded from all downstream retrieval and lineage.
- Merging preserves all source locations on the survivor.
- Bulk accept is unavailable for items below the confidence threshold.
**Priority:** P0

### FR-014 — Guided Workbook Import
**User:** Owner, Editor
**Trigger:** Sources → Import structured data
**Preconditions:** Parsed workbook
**Behavior:** AI-23 classifies sheets/tables and proposes column→field mappings including `extract_leading_integer` for score-as-string columns; user confirms or corrects every mapping; preview shows the first 20 rows as they will be created; on confirm, create `Capability`/`MaturityScore` or `Opportunity`/`PriorityScore` records in `draft`, linked to the source document.
**Data Used:** SourceStructure, Capability, MaturityScore, Opportunity, PriorityScore, TransformationObjective
**AI Involvement:** **AI-23** (proposal only)
**Acceptance Criteria:**
- No import executes on unconfirmed mappings.
- Importing the reference workbooks reproduces their maturity rows and opportunity rows with dimension levels and anchor text intact.
- Calculated columns in the source are **not** imported as values — they are recomputed by CALC-*.
- Import is reversible as a single undo within the session.
**Priority:** P0

### FR-015 — Manual Evidence Entry
**User:** Owner, Editor
**Trigger:** "Add evidence" without a document
**Behavior:** Capture assertion, session name, date, participants, classification; create `Evidence` with `SourceLocation{kind: manual}` in `draft` attributed to the author.
**Acceptance Criteria:** Manual evidence is visually distinguishable from document-anchored evidence throughout, including in lineage views.
**Priority:** P0

## 31.3 Current state

### FR-020 — Define Capability Tree
**User:** Owner, Editor
**Behavior:** Create/rename/resequence/archive `TechnologyFunction` and `Capability`. Archiving retains history and removes the capability from active assessment.
**Acceptance Criteria:** No capability taxonomy is hardcoded; a new engagement starts empty; renaming preserves IDs and all linked scores.
**Priority:** P0

### FR-021 — Propose Maturity Levels
**User:** Owner, Editor (trigger)
**Trigger:** "Propose levels" for one capability or in bulk
**Preconditions:** ≥2 approved evidence items linked or tagged to the capability
**Behavior:** Run AI-05 with the engagement's anchored, organization-specific level descriptions; store proposal in `ai_proposed_level` with anchor, rationale, criteria met/not met, observed gaps, evidence IDs, confidence; set state `in_progress`.
**Data Used:** Capability, Evidence, MaturityFramework, MaturityLevelAnchor, MaturityScore, AIRun
**AI Involvement:** **AI-05**
**Acceptance Criteria:**
- With <2 evidence items the system returns `insufficient` and proposes what evidence would resolve it — it does not guess.
- No `target_level` is ever proposed by AI.
- `gap` and `maturity_label` are never written by the AI path.
**Priority:** P0

### FR-022 — Set and Approve Maturity Scores
**User:** Owner, Editor (set); Reviewer, Owner (approve)
**Behavior:** Anchor picker sets `{current_level, anchor_label, anchor_text}` atomically; overriding an AI proposal requires a rationale; `target_level` is set separately with rationale; CALC-01 derives gap and labels; state advances through the five-value ladder.
**Acceptance Criteria:**
- `gap` always equals `target − current`, including negative values, which display as "Exceeds target".
- A score cannot reach `reviewed` with zero evidence or an empty rationale.
- The AI proposal remains visible after override.
**Priority:** P0

### FR-023 — Create and Approve Findings
**User:** Owner, Editor (create); Reviewer, Owner (approve)
**Behavior:** Create `Finding` with **required** `polarity` (`strength | gap | tension | risk`) and category; link evidence; submit; approve.
**Acceptance Criteria:**
- Approval is blocked with zero evidence links (hard constraint, enforced server-side).
- Findings of every polarity are creatable and appear in the client view when published.
**Priority:** P0

### FR-024 — Identify Uncovered Gaps
**User:** Owner, Editor, Reviewer
**Behavior:** List capabilities with `gap > 0` and no linked opportunity, sorted by gap size × priority-to-fix.
**Acceptance Criteria:** The count appears on the Overview attention list and reduces as opportunities are linked.
**Priority:** P0

## 31.4 Opportunities and prioritization

### FR-030 — Generate Candidate Opportunities
**User:** Owner, Editor
**Trigger:** "Generate opportunities" from a capability, a finding, or in bulk
**Preconditions:** ≥1 approved maturity gap or finding
**Behavior:** Run AI-06; create `Opportunity` records in `ai_suggested` with description, imperative recommended action, "so what", classification, and source links.
**AI Involvement:** **AI-06**
**Acceptance Criteria:**
- Every generated opportunity links to ≥1 capability gap or finding and, transitively, ≥1 evidence item.
- With no qualifying gaps, an empty result is returned with an explanation — nothing is invented.
**Priority:** P0

### FR-031 — Detect Duplicates and Overlaps
**User:** Owner, Editor
**Trigger:** Manual run, or automatically after bulk generation
**Behavior:** Run AI-07; produce candidate groups with relationship type, similarity, shared evidence, `double_count_risk`, and a recommended action.
**AI Involvement:** **AI-07**
**Acceptance Criteria:**
- Groups are proposals only; nothing merges automatically.
- Dismissing a pair suppresses it from future runs, with the dismissal recorded.
- The register shows a duplicate-candidate count in the Overview attention list.
**Priority:** P0

### FR-032 — Merge Opportunities
**User:** Owner, Editor
**Preconditions:** ≥2 selected
**Behavior:** Choose survivor; resolve each conflicting field explicitly; union evidence, finding, capability and objective links; set `merged_into_id` on the non-survivors (retained, not deleted); recalculate affected rollups and ranks; produce a `ChangeImpact`.
**Acceptance Criteria:**
- Historical references to a merged opportunity still resolve and redirect to the survivor.
- Initiative `avg_score` updates immediately and correctly.
**Priority:** P0

### FR-033 — Split an Opportunity
**User:** Owner, Editor
**Behavior:** Create N children inheriting evidence and classification; the parent is retained with `split_into` links; children start unscored.
**Acceptance Criteria:** Splitting never orphans evidence; children appear in the unscored filter.
**Priority:** P1

### FR-034 — Propose Dimension Scores
**User:** Owner, Editor
**Trigger:** "Score with AI" for one or many opportunities
**Preconditions:** Opportunity has description and ≥1 evidence or capability link; `PriorityModel` configured
**Behavior:** Run AI-08 with the full rubric and up to 10 already-scored calibration exemplars; store per-dimension `{level, anchor_label, rationale, evidence_ids, confidence}` as `ai_suggested`; **do not compute any score**.
**AI Involvement:** **AI-08**
**Acceptance Criteria:**
- Dimension 3 levels 4–5 without a linked objective are rejected by the validator and returned as unscoreable with a reason.
- `weighted_score` remains null until a human accepts all dimensions or scores them directly.
- Each proposal names the exemplar it was calibrated against.
**Priority:** P0

### FR-035 — Set Dimension Scores
**User:** Owner, Editor
**Behavior:** Anchor picker sets level + anchor label + anchor text atomically; rationale required; evidence linkable inline; CALC-02/03/04/15 run synchronously on save.
**Acceptance Criteria:**
- A bare integer cannot be entered without an anchor.
- With any active dimension unscored, `weighted_score`, `priority_band` and `quadrant` are **null** and the UI shows "Not yet scored — n of m dimensions complete". No partial sum is ever displayed.
**Priority:** P0

### FR-036 — Calculate Weighted Priority
**User:** System
**Trigger:** Any dimension score change; PriorityModel change; merge/split
**Behavior:** CALC-02/03/04 compute weighted score (unrounded, stored at full precision), band (from the **unrounded** value), business value X, urgency Y, bubble size, quadrant; CALC-15 recomputes dense rank across the engagement.
**Acceptance Criteria:**
- A score of exactly 3.75 bands as High; exactly 4.50 bands as Critical (inclusive lower bounds).
- Rounding for display never changes banding.
- Weight vector not summing to 1.0 blocks scoring with a configuration error.
**Priority:** P0

### FR-037 — Configure the Priority Model
**User:** Owner (Editor may propose)
**Trigger:** Settings → Priority model
**Behavior:** Edit dimensions, weights, anchors, calibration examples, band thresholds and labels, quadrant thresholds and labels, and the value-axis composition. On save: validate weights sum to 1.0 and thresholds are descending; **show an impact preview** (how many opportunities change band, how many change quadrant); on confirm, increment version and run full asynchronous recalculation with progress; lock scoring during the run.
**Data Used:** PriorityModel, PriorityDimension, PriorityAnchor, PriorityScore, ChangeImpact
**AI Involvement:** None
**Acceptance Criteria:**
- The impact preview is accurate against the post-change state.
- Every affected score records the model version that produced it.
- All dependent outputs (initiative rollups, quadrant chart, heat map, insights, Board slides) are marked stale.
**Priority:** P0

### FR-038 — Group into Initiatives and Themes
**User:** Owner, Editor
**Behavior:** Create/rename/resequence themes; create initiatives under themes; assign opportunities to initiatives; renaming appends to `previous_names` and preserves IDs; CALC-13 recomputes rollups.
**Acceptance Criteria:**
- Theme on an opportunity is always derived through its initiative and is never independently editable.
- Renaming a theme does not break any link.
- Initiative `avg_score` displays with its denominator.
**Priority:** P0

### FR-039 — Record Human Priority Override
**User:** Owner, Editor, Reviewer
**Trigger:** Set human rank on an opportunity or initiative
**Preconditions:** Computed rank exists
**Behavior:** Capture `human_rank` and a **mandatory** rationale; both computed and human values persist; CALC-15 computes divergence; the change is audited and appears in the divergence view.
**Data Used:** PriorityScore, AuditEvent
**AI Involvement:** None
**Acceptance Criteria:**
- The computed rank is never overwritten or hidden.
- Divergence is visible in the grid and in the initiative detail.
- Clearing a human rank restores the item to "not overridden", retaining the history.
**Priority:** P0

## 31.5 Dependencies

### FR-040 — Infer Dependencies
**User:** Owner, Editor
**Trigger:** "Infer dependencies"
**Preconditions:** ≥2 initiatives with descriptions or next-step text
**Behavior:** Run AI-09; create `Dependency` records in `ai_suggested` with type, rationale, verbatim `trigger_language`, evidence IDs, suggested lag and confidence; report potential cycles **without creating them**.
**AI Involvement:** **AI-09**
**Acceptance Criteria:**
- Every inferred dependency's `trigger_language` is verifiably present in a supplied source.
- No inferred dependency affects scheduling until validated.
- Cycle candidates are reported, never persisted as hard prerequisites.
**Priority:** P0

### FR-041 — Validate Dependencies
**User:** Owner, Editor, Reviewer
**Behavior:** Review queue renders each dependency as a sentence; actions: validate, reverse direction, change type, set lag, reject with reason. On validation, CALC-06 and CALC-08 re-run.
**Acceptance Criteria:**
- Reversing direction is a single action.
- Validating a cycle-forming hard prerequisite is rejected with the cycle path displayed.
- Only `validated` dependencies constrain `earliest_start`.
**Priority:** P0

## 31.6 Roadmap

### FR-050 — Generate First-Cut Sequence
**User:** Owner, Editor
**Preconditions:** ≥1 initiative sized and scored; dependencies validated
**Behavior:** CALC-05/06/07 produce a proposed sequence and wave assignment ordered by dependency, theme sequence, priority band, quadrant, then score. Present as a **preview**; the user accepts all, accepts selectively, or discards. AI-10 supplies the rationale narrative only.
**Data Used:** Initiative, EffortSize, Dependency, Theme, PriorityScore, RoadmapVersion, RoadmapItem, RoadmapWave
**AI Involvement:** **AI-10** (narrative only — no sequencing decisions)
**Acceptance Criteria:**
- The proposal never violates a validated hard prerequisite.
- Unsized or unscored initiatives are placed in the unsequenced tray, never guessed into a wave.
- Nothing is written until the user accepts.
**Priority:** P0

### FR-051 — Create a Roadmap Version
**User:** Owner, Editor
**Behavior:** Create `RoadmapVersion` with label, description and `based_on_version_id`; copy items; mark the prior version superseded when appropriate; approved-and-published versions become immutable.
**Acceptance Criteria:** Editing a published version is impossible; the system offers to create a new version instead.
**Priority:** P0

### FR-052 — Reschedule an Initiative
**User:** Owner, Editor
**Trigger:** Drag on the timeline, or edit start period in the detail panel
**Preconditions:** Roadmap version editable
**Behavior:**
1. Write `start_period`, `end_period`, `moved_by`, `moved_at`, and a **required** `move_reason` when the version is approved.
2. Run CALC-06 (downstream earliest starts), CALC-05 (if resized), CALC-13 (aggregates).
3. Run CALC-08 and surface conflicts inline and in the conflict panel.
4. Run CALC-11 and present the impact set as a non-blocking summary with links.
**Data Used:** RoadmapItem, Dependency, RoadmapWave, ChangeImpact, ExecutiveInsight, BoardSlide, Scenario, Publication
**AI Involvement:** None
**Acceptance Criteria:**
- Moving an initiative earlier than a hard prerequisite's end produces a `DEP_VIOLATION` error that blocks version approval but not editing.
- The impact summary names dependent initiatives, affected insights, and specific Board slide numbers.
- Acknowledging a violation requires a reason and is recorded on the item.
- The move is a single atomic transaction; a failure leaves no partial state.
**Priority:** P0

### FR-053 — Detect and Display Conflicts
**User:** System / all Aberdeen roles
**Behavior:** CALC-08 produces coded conflicts with severity, affected objects, plain-language messages and suggested resolutions. Errors block version approval; warnings and info do not.
**Acceptance Criteria:** Every conflict code in §CALC-08 is reachable and rendered; the conflict count is visible on the Overview.
**Priority:** P0

## 31.7 Scenarios

### FR-060 — Create a Scenario
**User:** Owner, Editor, Reviewer
**Behavior:** Deep-copy the selected roadmap version into a scenario-owned version; record the base version; set constraints.
**Acceptance Criteria:**
- A guard test proves no scenario operation writes to a baseline object.
- The shell displays a persistent scenario banner and accent.
**Priority:** P0

### FR-061 — Compare Scenarios
**User:** All Aberdeen roles
**Behavior:** CALC-14 computes composition, timing, wave, priority-profile, theme-coverage, dependency-health, conflict and (P1) cost deltas. AI-20 narrates only what was computed.
**Acceptance Criteria:**
- Dimensions lacking data report "not comparable — {reason}", never a zero delta.
- Every delta is reproducible from the two versions.
**Priority:** P0

### FR-062 — Promote a Scenario to Baseline
**User:** EngagementOwner
**Preconditions:** Scenario exists; user confirms
**Behavior:** Create a **new** baseline `RoadmapVersion` from the scenario; retain the prior baseline as superseded; mark dependent outputs stale; audit.
**Acceptance Criteria:** The previous baseline remains retrievable and identifiable; no data is overwritten.
**Priority:** P1

## 31.8 Alignment

### FR-070 — Assign and Publish a Feedback Task
**User:** EngagementOwner
**Behavior:** Select initiatives/opportunities, assign to `ClientContributor` groups, choose activity type (rank / urgency / dependencies / comment), publish a scoped snapshot, notify.
**Acceptance Criteria:** Contributors see only their assigned scope, and only published content within it.
**Priority:** P0

### FR-071 — Submit Blind Ranking
**User:** ClientContributor
**Preconditions:** Assigned ranking task; `is_released = false`
**Behavior:** Select top N; submit; confirmation shown. Consultant rankings and other groups' submissions are **not fetched** by the client at any point before release.
**Data Used:** StakeholderFeedback
**AI Involvement:** None
**Acceptance Criteria:**
- A direct API call by a client user for unreleased feedback or consultant ranks returns 403.
- Resubmission before release is permitted; after release it is blocked.
**Priority:** P0

### FR-072 — Release Rankings and Show Divergence
**User:** EngagementOwner
**Trigger:** "Reveal rankings"
**Preconditions:** ≥1 group submitted
**Behavior:** Set `is_released = true` for the session; render the divergence view comparing computed rank, each group's rank, and any existing human rank, sorted by divergence magnitude.
**Acceptance Criteria:**
- Release is a single audited action and is irreversible for that session.
- Divergence is computed by CALC-15, not asserted.
**Priority:** P0

### FR-073 — Triage and Apply Feedback
**User:** Owner, Editor
**Behavior:** For each feedback item: view AI-11 synthesis; run CALC-11 impact preview **before** accepting; accept (applying the change), reject, or defer — each with a reason.
**Acceptance Criteria:** No feedback-driven change is applied without an impact preview having been available.
**Priority:** P0

## 31.9 Decisions, publishing, Board

### FR-080 — Record a Decision
**User:** Owner, Editor (by proxy), ClientExecutive
**Behavior:** Create/update `Decision` with type, owner, due date, outcome, rationale and affected object links; proxy entries record `recorded_by_proxy` and `attributed_to`; changes flowing from the decision are linked to it.
**Acceptance Criteria:** The decision log explains why the roadmap changed; superseded decisions remain visible.
**Priority:** P0

### FR-090 — Publish to Client
**User:** EngagementOwner
**Trigger:** Publishing → Publish
**Preconditions:** Selected artefacts have `review_state = approved`
**Behavior:**
1. Select artefacts and audience; show a diff since last publication.
2. Require a "preview as client" step rendered through the client serializer.
3. On confirm, create an immutable `Publication` snapshot containing the serialized client payload; increment publication version.
4. Client-facing reads resolve against the snapshot.
5. Internal notes, open items, AI confidence and unapproved content are absent from the payload.
6. Subsequent Aberdeen edits remain draft until republished.
7. Audit; optionally notify.
**Data Used:** Publication, RoadmapVersion, Initiative, Opportunity, MaturityScore, Finding, ExecutiveInsight, Decision, EngagementMembership
**AI Involvement:** None
**Acceptance Criteria:**
- Client can view the published roadmap.
- Client cannot view later draft edits, via UI or API.
- Aberdeen can continue editing the draft immediately.
- The previous published version remains identifiable and retrievable.
- An automated test asserts that no client payload contains any field on the never-publish list.
**Priority:** P0

### FR-091 — Retract a Publication
**User:** EngagementOwner
**Behavior:** Mark the publication retracted with a reason; client interface shows a neutral updating state; audit.
**Acceptance Criteria:** Retraction takes effect immediately; history is preserved.
**Priority:** P1

### FR-100 — Generate Executive Insights
**User:** Owner, Editor
**Preconditions:** Approved roadmap version
**Behavior:** Run AI-12; create `ExecutiveInsight` records with `data_bindings`; a lint rule rejects bare numerals where a binding exists.
**AI Involvement:** **AI-12**
**Acceptance Criteria:**
- Every numeric claim resolves through a binding at render time.
- Changing a bound value changes the rendered insight with no edit to the insight text.
- The lint rule is covered by an automated test.
**Priority:** P0

### FR-101 — Generate the Board Deck
**User:** EngagementOwner (approve); Editor (draft)
**Preconditions:** Approved roadmap version; ≥1 approved executive insight
**Behavior:** Run AI-13 against the required storyline; create `BoardDeckVersion` bound to `roadmap_version_id` with `BoardSlide` records carrying headline, message, exhibit type/config, data bindings and source object refs; emit placeholders for storyline elements lacking data.
**Data Used:** RoadmapVersion, RoadmapItem, RoadmapWave, MaturityScore, PriorityScore, Theme, Initiative, Decision, ExecutiveInsight, CostEstimate (P1)
**AI Involvement:** **AI-13**
**Acceptance Criteria:**
- No slide contains a numeric literal for a model-derived quantity.
- Exhibits are generated from model queries, not from AI output.
- Missing investment data produces a placeholder slide naming what is missing, not a fabricated figure.
- Deck records the exact roadmap version used.
**Priority:** P0

### FR-102 — Detect Stale Board Slides
**User:** System
**Trigger:** Read of a generated deck; any roadmap/score/maturity change
**Behavior:** CALC-12 intersects changed objects with each slide's `source_object_refs` and re-resolves bindings; produces `is_stale`, stale slide IDs and per-slide reasons.
**Acceptance Criteria:**
- The banner reads: *"Roadmap Version {n} changed after this deck was generated. {k} slides may now contain outdated information."*
- Per-slide reasons name the specific change.
- No automatic regeneration occurs.
- A `BoardViewer` sees the deck as generated, stamped with its version.
**Priority:** P0

### FR-103 — Regenerate a Board Deck
**User:** EngagementOwner
**Behavior:** Offer three modes — regenerate all, regenerate stale slides only, refresh numbers only (**default**, preserving human-edited narrative). Create a new `BoardDeckVersion`; retain the prior.
**Acceptance Criteria:** Human-edited headlines survive a numbers-only refresh; the prior deck and its export remain retrievable.
**Priority:** P0

### FR-110 — Export Board Deck as PPTX
**User:** Owner, Editor, Reviewer; ClientExecutive/BoardViewer for published decks
**Behavior:** Render the approved deck server-side into the firm template; native tables/charts where feasible; provenance footer in speaker notes; store with a signed expiring URL; audit.
**Acceptance Criteria:** The file opens in PowerPoint; numbers match the model exactly; client exports are watermarked with the publication version.
**Priority:** P0

### FR-111 — Export Registers as XLSX
**User:** Owner, Editor, Reviewer
**Behavior:** Export the opportunity register and/or maturity assessment as values (not formulas), including anchor text alongside levels, a cover sheet documenting the priority model, and the maturity framework definitions and disclaimer.
**Acceptance Criteria:** The file is independently interpretable; calculated columns are labelled as calculated with a note that Atlas is authoritative.
**Priority:** P0

## 31.10 Explainability and copilot

### FR-120 — Explain Why an Item Is on the Roadmap
**User:** All Aberdeen roles; simplified for client roles
**Trigger:** "Why is this here?"
**Behavior:** Return the deterministic explanation assembled from the model (§13.2(a)) and the deduplicated evidence closure grouped by source document with clickable locations.
**Data Used:** RoadmapItem, Initiative, Opportunity, PriorityScore, PriorityModel, Dependency, MaturityScore, Finding, Evidence, SourceDocument
**AI Involvement:** None for the explanation itself; AI may optionally render a prose version **from the same computed facts**
**Acceptance Criteria:**
- Every number in the explanation matches the stored calculated value.
- Every evidence item is reachable in ≤4 clicks from the Board message.
- Client version omits internal evidence and shows only counts and approved rationale.
- P95 latency ≤500 ms for a typical engagement.
**Priority:** P0

### FR-121 — AI Copilot Query
**User:** All Aberdeen roles
**Behavior:** Natural-language question → the copilot calls read-only, engagement-scoped tools that execute deterministic queries and calculations, then explains the returned results. It **never computes numbers itself**.
**AI Involvement:** **AI-25**
**Acceptance Criteria:**
- Every numeric answer is traceable to a tool result identical to the corresponding UI value.
- The copilot has no write tools.
- Questions it cannot answer from the model are declined explicitly rather than answered from general knowledge.
**Priority:** P1

---

# 32. Non-Functional Requirements

## 32.1 Performance

| Surface | Target |
|---|---|
| Page load (workspace route) | P95 < 2.0 s |
| Opportunity grid, 500 rows | Interactive < 1.5 s; scroll 60 fps |
| Inline edit save | P95 < 300 ms |
| Priority recalculation (single opportunity chain) | < 200 ms |
| Full recalculation (weight change, 500 opportunities) | < 30 s, async with progress |
| Roadmap move → conflicts rendered | < 500 ms |
| Change impact set (CALC-11) | P95 < 1 s |
| Lineage closure (FR-120) | P95 < 500 ms |
| Document parse (10 MB PPTX) | < 60 s |
| Evidence extraction (per document) | < 5 min, async |
| Board deck generation | < 30 s |
| PPTX export | < 20 s |

## 32.2 Scale (MVP)

50 concurrent engagements · 500 opportunities, 100 initiatives, 100 capabilities, 5,000 evidence items, 200 documents per engagement · 20 concurrent users per engagement · 100 MB per file, 5 GB per engagement.

## 32.3 Reliability

- Uploaded files are durably stored before the request returns.
- Analytical writes are transactional; no partial multi-object writes.
- Background jobs are idempotent and retried with backoff; poison messages are dead-lettered with a visible failure state.
- A failed AI run never leaves partial objects.
- Optimistic concurrency with three-way conflict resolution.
- Soft delete with 30-day restore.
- Daily backups; documented restore procedure.

## 32.4 Security

- Server-side authorization on every request; default-deny.
- Client payloads built by whitelisting serializers; never by filtering in the view.
- Client reads resolve only against publication snapshots.
- Secrets in environment variables only; none committed; none exposed to the browser.
- Files stored privately; access via short-lived signed URLs.
- TLS in transit; encryption at rest.
- Uploads virus-scanned and type-validated by content, not extension.
- Rate limiting on auth, upload and AI-trigger endpoints.
- Audit log append-only at the database permission level.
- Session expiry with refresh; logout invalidates server-side.

## 32.5 Privacy and data governance

- Engagement data is isolated by default; cross-engagement retrieval requires an explicit, logged, opt-in flag.
- Client confidential material is never sent to a model provider that trains on inputs — provider and configuration must be documented in the README.
- `is_reference_corpus` documents cannot be cited as evidence for the current client (validator-enforced).
- Engagement export and deletion are supported for client data-handling obligations.
- PII in transcripts is stored as uploaded; **⚠ Decision Required:** whether redaction before model calls is required by firm policy.

## 32.6 Usability and accessibility

WCAG 2.1 AA. Colour never the sole encoder of maturity or priority. Full keyboard operation of grids, review queues and dialogs. Visible focus. Screen-reader labels on all calculated fields including their formulas. Respect reduced-motion. Minimum 4.5:1 contrast.

## 32.7 Browser and device support

Latest two versions of Chrome, Edge, Safari, Firefox. Workspace optimal ≥1280px, usable ≥1024px. Client and Board interfaces fully responsive. Stakeholder Input mobile-first. No IE support.

## 32.8 Observability

Structured JSON logs with request ID, user ID, engagement ID (never payload contents for client-confidential fields). Error tracking with source maps. Metrics: request latency by route, job queue depth and failure rate, AI latency/tokens/cost/failure by capability, calculation durations, recalculation drift detected by the nightly reconciler. Health endpoint covering database, storage, queue and AI provider.

## 32.9 Maintainability

Calculations isolated in one pure module with 100 % branch coverage as a merge gate. AI prompts versioned in the repository and referenced by `AIRun.prompt_version`. Database migrations version-controlled and reversible. Typed end-to-end. Linting and formatting enforced in CI.

---

# 33. Technical Architecture Requirements

## 33.1 Constraints and their consequences

The target is a GitHub repository deployed to Vercel. That constrains three things materially, and the architecture must address each explicitly rather than assume them away:

1. **Serverless request timeouts.** Document parsing and AI extraction exceed typical function limits. **Background processing must be a durable queue with workers, not a fire-and-forget function call.**
2. **No persistent local filesystem.** Files must go to object storage immediately.
3. **Cold starts and connection limits.** Database access must use pooling appropriate to serverless.

## 33.2 Recommended stack

Framework choice is not dictated beyond the requirement that it suit Vercel-native deployment with server-side rendering and server-side API routes. The following is a **recommendation**, with the reasoning stated so the engineering agent can substitute deliberately:

| Layer | Recommendation | Reasoning |
|---|---|---|
| Framework | **Next.js (App Router), TypeScript** | First-class Vercel support; server components keep AI keys and authorization server-side by construction |
| UI | React + a headless component library + utility CSS | Grid and panel density requirements need composability |
| Data grid | A virtualized grid library | 500+ rows with inline editing is a hard requirement |
| Timeline | Custom SVG/canvas roadmap renderer | No off-the-shelf Gantt handles waves + dependency validation + conflict overlays as specified |
| Database | **PostgreSQL** (Vercel Postgres / Neon / Supabase) | Relational integrity is central: FK-enforced lineage, transactional multi-object writes, recursive CTEs for closure, JSONB for flexible sub-structures |
| ORM | Prisma or Drizzle | Typed schema, versioned migrations |
| File storage | Vercel Blob or S3-compatible | Private buckets, signed URLs |
| Queue / workers | **Required** — e.g. Inngest, QStash, or a hosted worker | Durable background processing within serverless constraints |
| Auth | Auth.js/NextAuth with database sessions, or a managed provider | Email+password or magic link is sufficient for MVP |
| AI | Server-side SDK with structured-output/JSON-schema support | Schema validation is a hard requirement |
| Embeddings | pgvector in the same Postgres | Keeps retrieval engagement-scoped and transactional |
| Excel parsing | A mature XLSX library exposing formulas | Formula retention is non-negotiable |
| PPTX parsing | A PPTX library exposing shapes, tables, notes | Structure retention is non-negotiable |
| PDF/DOCX parsing | Text-layer extraction libraries with offsets | Anchoring requires character positions |
| PPTX generation | A PPTX generation library supporting templates and native tables/charts | Editable exports |
| XLSX generation | Same family as the parser | |
| Testing | Vitest/Jest + Playwright | Unit, integration, permission and E2E |

**⚠ Product / Technical Decision Required:** the queue/worker provider, the AI provider and model, and the auth provider are all deployment decisions requiring firm input on cost, data-processing terms, and existing vendor relationships.

## 33.3 Layering

```
app/            routes, server components, route handlers
  (workspace)   Aberdeen shell
  (client)      Client executive shell
  (input)       Stakeholder input shell
  (board)       Board output shell
  api/          route handlers

lib/
  auth/         session, role resolution, guards
  db/           schema, migrations, repositories (engagement-scoped by construction)
  calc/         PURE deterministic calculations — no I/O, no AI imports
  ai/           orchestration, prompts, schemas, validators, run logging
  ingest/       parsers (xlsx, pptx, pdf, docx), structure builders, anchors
  publish/      client serializers (whitelist-based), snapshot builders
  export/       pptx, xlsx, pdf generators
  lineage/      closure queries, impact traversal
  policy/       permission matrix, field visibility policy
```

**Enforced boundaries (lint-checked):**
- `lib/calc` may not import from `lib/ai`, `lib/db`, or `app`.
- `lib/ai` may import calculation **types** but not calculation writers, and may not import `lib/publish`.
- `lib/publish` serializers are the only path to client payloads.
- Repositories require an `engagement_id` argument; a lint rule forbids raw query construction outside `lib/db`.

## 33.4 API design

- Route handlers under `/api`, all authenticated and engagement-scoped.
- Resource-oriented paths; server actions acceptable for form mutations.
- Every mutation returns the updated object plus any recalculated values and the impact summary, so the client never re-derives.
- Long-running operations return a job ID; status via polling or streaming.
- Standard error envelope with machine code and human message.
- Separate, minimal, whitelist-serialized endpoints for client and board shells.

## 33.5 Background processing

Required jobs: document parse · evidence extraction · bulk AI operations (maturity proposal, scoring, dependency inference) · full recalculation on model change · staleness computation · export generation · nightly calculation reconciliation.

Requirements: durable enqueue, at-least-once with idempotency keys, progress reporting, cancellation, dead-lettering with a visible failure state, and per-engagement concurrency limits so one large ingestion cannot starve others.

## 33.6 AI orchestration

- All calls server-side, through a single orchestration module.
- Per-capability configuration: model, temperature, max tokens, schema, prompt version, retry policy.
- Structured output enforced; schema validation before any persistence; one retry with the validation error appended; failure writes no objects.
- Post-validators beyond schema: excerpt-presence check (AI-02), trigger-language presence check (AI-09), objective-link check for Dimension 3 levels 4–5 (AI-08), numeric-literal lint (AI-12/13).
- Retrieval engagement-scoped by default over `SourceStructure` nodes and analytical objects.
- Every call writes `AIRun`.
- Cost and rate controls: per-engagement token budgets with warnings, and a global rate limiter.

## 33.7 Configuration

Required environment variables (documented in `.env.example`, none committed):

```
DATABASE_URL
DIRECT_DATABASE_URL            # migrations
AUTH_SECRET
AUTH_URL
BLOB_READ_WRITE_TOKEN          # or S3 credentials
AI_PROVIDER_API_KEY
AI_MODEL_DEFAULT
AI_MODEL_EXTRACTION
QUEUE_PROVIDER_KEY
QUEUE_SIGNING_KEY
APP_URL
LOG_LEVEL
SENTRY_DSN                     # optional
FEATURE_ECONOMICS              # P1 gating
FEATURE_FIRM_CORPUS            # §14.4 gating, default off
MAX_UPLOAD_MB
AI_MONTHLY_TOKEN_BUDGET
```

## 33.8 Data protection in the AI path

- The provider and its data-retention terms must be documented in the README; a provider that trains on inputs is not acceptable for client-confidential material.
- Only the minimum necessary context is sent; whole documents are never sent when a scoped chunk suffices.
- `AIRun.input_summary` stores a summary and identifiers, **not** raw client content, so the run log itself is not a secondary copy of confidential material.
## 33.9 AI Copilot specification (AI-25)

The copilot is **secondary to the structured product**. It is a query interface over the engagement model, not an alternative way to do the work. Its defining constraint: it answers with deterministic results retrieved through tools, wrapped in semantic explanation.

**Architecture.** The copilot has a read-only tool surface. Each tool executes an engagement-scoped query or invokes a `lib/calc` function and returns structured data. The model composes an explanation *around* those results. It has no write tools and no ability to compute numbers itself.

**Required tools (minimum):**
`get_priority_explanation(opportunity_id | initiative_id)` · `compare_priority(a, b)` · `list_by_filter(entity, filters)` · `get_dependency_chain(initiative_id, direction, depth)` · `get_roadmap_version_diff(v1, v2)` · `get_wave_composition(version_id, wave_id)` · `get_feedback_summary(filters)` · `get_divergence(threshold)` · `get_stale_outputs()` · `get_lineage(object_type, object_id)` · `run_scenario_preview(constraints)` (P1) · `get_aggregates(metric, group_by)`

**The brief's example questions, mapped:**

| Question | Tools | Answer composition |
|---|---|---|
| *Why is Initiative A ahead of Initiative B?* | `compare_priority` | Deterministic: both weighted scores, band, quadrant, theme sequence, dependency constraints. Semantic: which factor was decisive. |
| *Which initiatives have low-confidence cost estimates?* | `list_by_filter(cost_estimate, confidence<x)` | If no cost data: *"Cost has not been estimated for this engagement"* — never an empty list implying zero. |
| *What depends on Data Governance?* | `get_dependency_chain(downstream)` | Deterministic list with types; semantic explanation of the cascade. |
| *What are the biggest Wave 1 risks?* | `get_wave_composition` + `list_by_filter(finding, polarity=risk)` | Risks linked to Wave 1 items, with evidence counts. |
| *What changed between V1 and V2?* | `get_roadmap_version_diff` | CALC-14 output, narrated. |
| *Which business leaders disagree with the roadmap?* | `get_divergence` + `get_feedback_summary` | Groups whose rank diverges most, with quoted feedback. |
| *What happens if the budget decreases 20 %?* | `run_scenario_preview` (P1) | If no cost model: states plainly that budget scenarios cannot be evaluated without cost estimates and offers the structural alternative (max concurrent initiatives). |
| *Which Board messages changed after the last roadmap update?* | `get_stale_outputs` | CALC-12 output with slide identities and reasons. |

**Guardrails:** engagement-scoped retrieval only; refuses questions requiring information not in the model rather than answering from general knowledge; every numeric assertion carries a link to the same value in the UI; responses are not persisted as product data.

**Priority:** P1. The structured product must be complete first — a copilot over an incomplete model is a demo, not a tool.

---

# 34. Suggested Repository Architecture

## 34.1 Structure

```
atlas/
├─ README.md
├─ .env.example
├─ .github/workflows/ci.yml
├─ package.json  tsconfig.json  next.config.ts  vercel.json
│
├─ app/
│  ├─ (auth)/                        sign-in, invitation acceptance
│  ├─ (workspace)/e/[engagementId]/  Aberdeen shell — the 14 areas
│  │   ├─ page.tsx                   Overview
│  │   ├─ sources/  current-state/  opportunities/  initiatives/
│  │   ├─ roadmap/  economics/  scenarios/  alignment/  decisions/
│  │   ├─ board/  publishing/  review/  settings/
│  ├─ (client)/client/[engagementId]/   Client executive shell
│  ├─ (input)/input/[engagementId]/     Stakeholder input shell
│  ├─ (board)/board/[engagementId]/     Board output shell
│  ├─ admin/
│  └─ api/
│      ├─ engagements/  documents/  evidence/  capabilities/
│      ├─ opportunities/  initiatives/  dependencies/
│      ├─ roadmap/  scenarios/  feedback/  decisions/
│      ├─ publish/  board/  exports/  copilot/
│      └─ jobs/                       queue webhook receivers
│
├─ components/
│  ├─ ui/                             primitives
│  ├─ grid/                           virtualized table, anchor picker, bulk bar
│  ├─ roadmap/                        timeline canvas, item bar, dependency layer,
│  │                                  wave bands, conflict overlay
│  ├─ charts/                         quadrant, heatmap, priority×effort, investment
│  ├─ evidence/                       document viewer (xlsx/pptx/pdf), evidence panel
│  ├─ review/                         proposal card, diff view, approval controls
│  ├─ lineage/                        why-is-this-here, formula expander
│  ├─ board/                          slide renderer, exhibit renderers
│  └─ states/                         empty, loading, failed, missing-data, stale
│
├─ lib/
│  ├─ calc/            ★ PURE deterministic engine
│  │   ├─ maturity.ts          CALC-01
│  │   ├─ priority.ts          CALC-02, 03, 04, 15
│  │   ├─ effort.ts            CALC-05
│  │   ├─ scheduling.ts        CALC-06, 07
│  │   ├─ conflicts.ts         CALC-08
│  │   ├─ economics.ts         CALC-09, 10        (P1)
│  │   ├─ impact.ts            CALC-11
│  │   ├─ staleness.ts         CALC-12
│  │   ├─ aggregates.ts        CALC-13
│  │   ├─ scenarios.ts         CALC-14
│  │   └─ index.ts             re-exports; NO imports from db/ai/app
│  │
│  ├─ ai/
│  │   ├─ client.ts            provider wrapper, retry, structured output
│  │   ├─ capabilities/        one module per AI-xx
│  │   ├─ prompts/             versioned prompt templates
│  │   ├─ schemas/             JSON schemas per capability
│  │   ├─ validators/          excerpt-presence, trigger-language, numeric-lint
│  │   ├─ retrieval.ts         engagement-scoped, structure-aware
│  │   └─ runs.ts              AIRun logging
│  │
│  ├─ ingest/
│  │   ├─ xlsx.ts  pptx.ts  pdf.ts  docx.ts  text.ts
│  │   ├─ structure.ts         SourceStructure builder
│  │   ├─ anchors.ts           SourceLocation build/resolve/verify
│  │   └─ import.ts            guided mapping import
│  │
│  ├─ db/
│  │   ├─ schema.prisma (or drizzle schema)
│  │   ├─ migrations/
│  │   ├─ repositories/        engagement-scoped by construction
│  │   └─ client.ts            pooled connection
│  │
│  ├─ auth/            session, role resolution, guards
│  ├─ policy/          permission matrix, field visibility policy
│  ├─ publish/         client serializers (whitelist), snapshot builder
│  ├─ export/          pptx.ts, xlsx.ts, pdf.ts, templates/
│  ├─ lineage/         closure.ts, impact.ts
│  ├─ jobs/            definitions, handlers, idempotency
│  └─ utils/
│
├─ tests/
│  ├─ unit/calc/                 ★ 100 % branch coverage gate
│  ├─ unit/ingest/
│  ├─ unit/policy/
│  ├─ integration/               file → evidence → opportunity → roadmap
│  ├─ permissions/               ★ client isolation, publish leakage
│  ├─ regression/                calculation + propagation snapshots
│  ├─ e2e/                       Playwright acceptance journey
│  └─ ai-evals/                  extraction, scoring, dedupe, dependency, narrative
│
├─ fixtures/
│  ├─ reference-engagement/      ★ sanitized corpus + expected outputs
│  ├─ documents/                 small synthetic xlsx/pptx/pdf/docx
│  └─ seeds/                     demo engagement seed
│
└─ docs/
   ├─ PRD.md   ARCHITECTURE.md   DATA_MODEL.md
   ├─ CALCULATIONS.md            ★ every formula, plain language
   ├─ AI_CAPABILITIES.md         input/task/schema/review/failure per AI-xx
   ├─ PERMISSIONS.md             the matrix, as implemented
   ├─ DEPLOYMENT.md   LOCAL_SETUP.md   TESTING.md
```

## 34.2 Separation of concerns — the rules that matter

| Boundary | Rule | Enforcement |
|---|---|---|
| **Calculations** | `lib/calc` is pure. No I/O, no AI, no database, no framework imports. Every function returns `{value, inputs, formula_string, formula_with_values}` | ESLint `no-restricted-imports`; CI check |
| **AI cannot calculate** | `lib/ai` may import calculation *types* but never calculation functions as writers; the AI write surface excludes all `[C]` fields | Lint rule + a permission test asserting no AI path can set a calculated field |
| **Client payloads** | Only `lib/publish` serializers may construct client-facing responses; they whitelist fields explicitly | Lint rule forbidding raw model objects in `(client)`/`(board)` route handlers; leakage tests |
| **Tenancy** | Repositories require `engagement_id`; no raw queries outside `lib/db` | Lint rule + isolation tests |
| **Ingestion** | Parsers produce `SourceStructure` only; they never create analytical objects. Analytical creation is a separate, human-confirmed step | Module boundary + integration test |
| **Formula singularity** | A formula appears exactly once, in `lib/calc`. Never in a component, an export template, or a prompt | Code review checklist + a grep-based CI check for suspicious arithmetic in `components/` and `lib/export/` |

## 34.3 Documentation deliverables

**`README.md`** — what Atlas is; prerequisites; 10-minute local setup; environment variables table with purpose and how to obtain each; database setup and migration; seeding the demo engagement and the reference fixture; running dev, tests, lint, build; deployment summary; architecture overview diagram; where to find the calculation and AI documentation; troubleshooting.

**`docs/LOCAL_SETUP.md`** — step-by-step from clone to running app, including local Postgres (Docker compose provided), storage emulation, queue provider local mode, and how to run without AI keys (a deterministic mock AI provider must exist so contributors can develop the full workflow without spend).

**`docs/DEPLOYMENT.md`** — Vercel project creation, environment variables per environment, database provisioning and migration on deploy, blob storage setup, queue provider webhook configuration, build settings, custom domain, post-deploy verification checklist.

**`docs/TESTING.md`** — how to run each suite; how to add a calculation test; how to add an AI eval case; how the reference fixture is used and how to regenerate expected outputs; what the coverage gates are.

**`docs/CALCULATIONS.md`** — every CALC-xx in plain language with formula, worked example, missing-data behaviour and override behaviour. **This is the document a consultant reads to trust the tool**, and it should be written for that reader, not for an engineer.

**`docs/AI_CAPABILITIES.md`** — every AI-xx with input context, task, output schema, evidence requirement, confidence semantics, human review, failure behaviour and downstream consumers.

**`docs/PERMISSIONS.md`** — the matrix as implemented, plus the field visibility policy and the never-publish list.

---

# 35. GitHub Development Requirements

## 35.1 Repository hygiene

- Single repository, clear module boundaries per §34.
- `.gitignore` covering `.env*` (except `.env.example`), `node_modules`, build output, coverage, local database volumes, and **any real client material**.
- **No secrets committed, ever.** Secret scanning enabled; a pre-commit hook blocks common key patterns.
- `.env.example` lists every variable with a comment on purpose and where to obtain it; no real values.
- Conventional commits; PR template referencing the FR/AI/CALC IDs affected.
- `CODEOWNERS` for `lib/calc`, `lib/policy` and `lib/publish` — the three modules where a mistake is most costly.

## 35.2 Branching and review

`main` protected and always deployable; feature branches; PRs required; CI must pass; at least one review. Changes to `lib/calc`, `lib/policy` or `lib/publish` require review by a designated owner.

## 35.3 CI pipeline (`.github/workflows/ci.yml`)

Runs on every PR and on `main`:

1. Install (locked dependencies)
2. Typecheck
3. Lint (including the boundary rules of §34.2)
4. Unit tests — **fail if `lib/calc` branch coverage < 100 %**
5. Permission tests — **fail on any client-visibility leak**
6. Integration tests (against an ephemeral Postgres service)
7. Regression tests (calculation and propagation snapshots)
8. Build
9. E2E smoke (Playwright, on `main` and release PRs)
10. AI evals — **scheduled and on-demand, not blocking** (non-deterministic; failures raise an issue rather than blocking a merge)

## 35.4 Fixture governance — a specific and important requirement

The reference engagement is real client material. Committing it as-is to a repository is unacceptable.

**Requirements:**
1. `fixtures/reference-engagement/` contains a **sanitized** derivative: client name, individual names, vendor names, system names, and any identifying figures replaced with consistent pseudonyms. **The analytical structure — column layout, formula patterns, score distributions, hierarchy shape, evidence-string style — is preserved exactly**, because that is what the fixture must exercise.
2. A documented sanitization script performs the mapping reproducibly, so the fixture can be regenerated if the source is revised.
3. Real client files are **never** committed. If a test must run against genuine material, it reads from a path supplied by an environment variable and is skipped when absent.
4. `fixtures/` carries a README stating the provenance policy and the prohibition.

This preserves the acceptance test's value (the fixture still contains a workbook with `SUMPRODUCT`-based scoring, a header row at row 6, hidden `VALUE(LEFT())` helper columns, a maturity grid with `CHOOSE()` labels, and a deck with merged-cell heatmap tables) while removing the confidentiality risk.

---

# 36. Vercel Deployment Requirements

## 36.1 Configuration

- Project linked to the GitHub repository; `main` → production; PRs → preview deployments.
- Node runtime for routes requiring parsing libraries; edge runtime only where genuinely beneficial.
- Function memory and duration configured for the heaviest synchronous route (export generation); **all genuinely long work runs in the queue, not in a function**.
- Environment variables set per environment (development / preview / production); production values never present in preview.
- Build command runs migrations against the target database before the app build, or as a documented separate step; the choice must be documented in `DEPLOYMENT.md`.

## 36.2 External services

| Service | Requirement |
|---|---|
| PostgreSQL | Serverless-compatible with connection pooling; separate database per environment |
| Blob storage | Private; signed URL generation; per-engagement key prefixes |
| Queue/worker | Webhook endpoint under `/api/jobs` with signature verification; retries and DLQ configured |
| AI provider | Server-side key; documented data-retention terms |
| Error tracking | Optional but recommended |

## 36.3 Post-deploy verification checklist

Documented in `DEPLOYMENT.md` and executed after every production deploy:

1. Health endpoint reports database, storage, queue and AI provider reachable.
2. Sign-in succeeds; session persists across navigation.
3. Create an engagement; seeded priority model and maturity framework are present and correct.
4. Upload a fixture XLSX and a fixture PPTX; both reach `ready`; structure is browsable; formulas are visible.
5. Trigger evidence extraction; items appear as `ai_suggested` with resolvable source locations.
6. Score an opportunity; weighted score, band and quadrant compute correctly.
7. Place an initiative on the roadmap; move it; conflicts and an impact summary appear.
8. Publish; sign in as a client user; verify only published content is visible.
9. Attempt a direct API call as the client user for an internal object; confirm 403.
10. Generate and export a Board deck; verify numbers match the model.
11. Change a score; confirm the deck reports the correct stale-slide count.

## 36.4 Environments

Local (Docker Postgres, storage emulation, mock AI provider) → Preview (per PR, isolated database, real-but-cheap AI model, no client data) → Production (managed Postgres with backups, full observability, restricted access).

---

# 37. Testing Strategy

## 37.1 Unit tests — deterministic calculations

**100 % branch coverage on `lib/calc` is a merge gate.** Every CALC-xx requires:

- Nominal case with a worked example matching `docs/CALCULATIONS.md`.
- Boundary cases: **exactly 4.50, exactly 3.75, exactly 2.80** for banding; **exactly 3.5** on both quadrant axes; zero and negative maturity gaps; single-item and empty aggregations.
- Missing-data cases: one dimension unscored → null, not a partial sum; no target level → null gap; no effort size → null duration; no cost estimates → null total with coverage message.
- Rounding: display rounding must not alter banding (a score of 3.749 bands as Medium even though it displays as 3.75).
- Weight validation: sum ≠ 1.0 rejected.
- Scheduling: dependency chains, lag, cycle detection, soft-vs-hard dependency behaviour.
- Rank: ties, dense ranking, divergence sign convention.

## 37.2 Integration tests — the analytical chain

The headline integration test is the brief's own chain: **file → evidence → finding → capability score → opportunity → priority → initiative → roadmap → published output → Board slide.**

Specific integration scenarios:
1. Upload fixture XLSX → structure persisted with formulas → guided import creates maturity rows → CALC-01 gaps correct.
2. Upload fixture PPTX → slides classified → evidence extracted with resolvable anchors.
3. Create opportunity → score three dimensions → verify weighted score, band, quadrant, rank, and initiative rollup.
4. Create dependency → place items violating it → conflict raised → resolve → conflict clears.
5. Move an initiative → verify downstream earliest starts, wave membership, aggregates, and impact set contents.
6. Change priority weights → verify full recalculation and band-change count matches the preview.
7. Approve → publish → verify snapshot content → edit draft → verify client still sees the prior snapshot.
8. Generate Board deck → change a score → verify the correct slides are marked stale with correct reasons.
9. Create scenario → modify → verify baseline unchanged → compare → promote → verify a new baseline version exists and the old one is retained.
10. Merge two opportunities → verify lineage resolves, rollups update, evidence is preserved.

## 37.3 Permission tests — non-negotiable

Every test executes **both** through the UI and by **direct API call**, because a UI-only test proves nothing about authorization.

| Test | Assertion |
|---|---|
| Cross-engagement isolation | User in A gets 403 for every B object |
| Client cannot read internal | `ClientViewer`/`ClientExecutive` gets 403 or omitted fields for Evidence, OpenItem, AI confidence, draft versions, rejected items, audit log |
| Publish leakage | For every publishable type, assert no never-publish field appears anywhere in the client payload (recursive key scan) |
| Draft isolation | After publishing then editing, the client payload is byte-identical to the snapshot |
| Blind ranking | Client cannot read consultant ranks or other groups' submissions while `is_released = false` |
| Self-approval | An Editor cannot approve their own work |
| Publish authority | Only Owner can publish, retract, promote a scenario, or approve a Board deck |
| Scope enforcement | `ClientContributor` sees only assigned items |
| AI write surface | No AI code path can set any `[C]` field, `approved`, or `published` |
| Board viewer | `BoardViewer` can read only the published deck, nothing else |

## 37.4 Regression tests

Snapshot the full calculated state of the reference fixture engagement (all scores, bands, quadrants, ranks, gaps, durations, earliest starts, conflicts, aggregates). Any change to `lib/calc` that alters a snapshot must be explicitly acknowledged in the PR with a stated reason. This catches unintended formula drift, which is the single most dangerous class of regression in this product.

Propagation regression: for a fixed set of changes, snapshot the resulting `ChangeImpact` sets.

## 37.5 AI evaluation cases

Non-deterministic, therefore **scored, not pass/fail-gated**. Run on a schedule and on prompt changes. Each capability has a labelled evaluation set built from the sanitized fixture.

| Capability | Eval set | Metrics | Target |
|---|---|---|---|
| AI-02 Extraction | Fixture documents with human-labelled evidence | Precision, recall, **anchor validity (must be 100 %)**, type accuracy | Anchor validity 100 %; precision ≥0.80 |
| AI-05 Maturity | Fixture capabilities with consultant-assigned levels | Exact match, within-1 match, evidence-citation validity | Within-1 ≥0.85; exact ≥0.60 |
| AI-06 Opportunity generation | Fixture gaps | Coverage of known opportunities; imperative-style compliance; hallucination rate (must be 0) | Hallucination 0 |
| AI-07 Duplicate detection | Fixture register including the known triple-count case | Precision/recall on labelled groups | Recall ≥0.80 on true duplicates |
| AI-08 Scoring | Fixture opportunities with consultant scores | Per-dimension exact and within-1; anchor-label validity; **objective-link compliance on D3 4–5** | Within-1 ≥0.85; compliance 100 % |
| AI-09 Dependency inference | Fixture prose with labelled dependencies | Precision/recall; **direction accuracy**; trigger-language validity | Direction accuracy ≥0.90 |
| AI-12/13 Narrative | Generated insights and slides | **Numeric-literal violations (must be 0)**; binding resolution rate; human edit rate | Violations 0 |
| AI-23/24 Semantics | Fixture workbooks/decks | Classification accuracy; mapping accuracy | Classification ≥0.85 |

**The reference engagement is the primary evaluation fixture**, exactly as the brief requires: it is the only material in existence where the "right answers" — the consultant's actual maturity levels, actual dimension scores, actual groupings — are known.

## 37.6 E2E acceptance test

A single Playwright journey implementing §40, run against a preview deployment before promotion.

---

# 38. MVP Scope: P0 / P1 / P2

## 38.1 Build phasing

Sequenced by technical dependency, not by feature appeal.

**Phase 1 — Foundation (weeks 1–3).** Auth and sessions · Organization/User/Engagement/Membership · permission matrix and guards · engagement CRUD and settings · seeded PriorityModel, MaturityFramework, EffortScale · file upload to blob storage · `SourceDocument` · job queue wiring · application shell and navigation · empty/loading/error states.
*Exit:* a user can create an engagement, invite a colleague, upload a file, and be correctly denied access to another engagement.

**Phase 2 — Ingestion & evidence (weeks 3–5).** XLSX/PPTX/PDF/DOCX parsers with structure preservation · `SourceStructure` · document viewer with anchor navigation · AI-02 with excerpt validation · evidence review queue · manual evidence · AI-23/24 · guided workbook import · paste import.
*Exit:* the fixture workbooks and decks ingest, and every extracted evidence item navigates to its exact source location.

**Phase 3 — Analysis (weeks 5–8).** Capability tree · MaturityFramework configuration · AI-05 · maturity grid, heatmap and drill-down · CALC-01 · findings with polarity · AI-06 · opportunity register grid · AI-07 merge/split · themes and initiatives · rollups.
*Exit:* the fixture's maturity assessment and opportunity register are reproducible in the application.

**Phase 4 — Prioritization (weeks 8–10).** PriorityModel configuration with impact preview · anchor picker · AI-08 · CALC-02/03/04/15 · quadrant chart · priority×effort heat map · theme summary · human rank and divergence · review queue.
*Exit:* every calculated value matches the fixture's spreadsheet output exactly.

**Phase 5 — Roadmap (weeks 10–13).** EffortScale and CALC-05 · AI-09 and dependency validation · CALC-06/07/08 · Roadmap Studio with drag, waves, lanes, dependency and conflict overlays · roadmap versions · CALC-11 impact and CALC-13 aggregates.
*Exit:* moving an initiative produces correct downstream recalculation and a correct impact set.

**Phase 6 — Alignment & scenarios (weeks 13–15).** Stakeholder Input interface and Activities 1–4 · blind ranking and release · AI-11 · divergence and reconciliation · decisions · scenarios and CALC-14.
*Exit:* a full workshop cycle can be run end to end.

**Phase 7 — Publishing & Board (weeks 15–18).** Client serializers and publication snapshots · publishing workflow with client preview · Client Executive interface · AI-12 insights with bindings and numeric lint · AI-13 storyline · Board slides and exhibits · Board Output view · CALC-12 staleness · PPTX and XLSX export.
*Exit:* the full §40 acceptance journey passes on a Vercel deployment.

**Phase 8 — Economics & copilot (P1, weeks 18+).** Cost and resource entry · CALC-09/10 with flagged decisions resolved · investment exhibits · AI-25 copilot · benchmark view · activation plan.

## 38.2 Priority classification

### P0 — required for a working MVP

Auth, roles, engagement isolation · engagement creation with seeded models · document upload and structure-preserving parsing (XLSX, PPTX, PDF, DOCX, TXT/CSV) · document viewer with anchor navigation · AI-02 evidence extraction with anchor validation · evidence review · guided workbook import and paste import · manual entry · capability tree and maturity framework · AI-05 · maturity grid, heatmap, drill-down, evidence panel · CALC-01 · findings with polarity and evidence-gated approval · AI-06 opportunity generation · AI-07 duplicate detection, merge, split · opportunity register grid with grouping, filtering, saved views, bulk actions · themes and initiatives with rollups and rename history · PriorityModel configuration with impact preview · anchor-based scoring · AI-08 · CALC-02/03/04/13/15 · quadrant chart, priority×effort heat map, theme summary · human rank, divergence, reconciliation · effort scale and CALC-05 · AI-09 dependency inference and validation · CALC-06/07/08 · Roadmap Studio with move transaction, conflicts and impact · roadmap versions · scenarios with baseline preservation and CALC-14 · Stakeholder Input interface with blind ranking and release · AI-11 · decisions · publishing with snapshots and client preview · Client Executive interface · AI-12 insights with bindings and numeric lint · AI-13 Board storyline · Board slides, exhibits and Board Output view · CALC-11/12 · PPTX and XLSX export · audit log · lineage and "why is this here?" · all product states · Vercel deployment with documented setup.

### P1 — high value, immediately after MVP

Economics (CostEstimate, ResourceRequirement, ResourceCapacity, CALC-09/10, investment exhibits) — **gated on resolving the flagged decisions** · AI-25 copilot · AI-03 theme clustering · AI-04 contradiction detection · AI-10/15/16/17/20/21 · benchmark view · activation plan · milestones · scenario promotion · publication retraction · roadmap PDF/PNG and executive summary PDF · chart data extraction from PPTX · DOCX comments and tracked changes · transcript speaker-turn detection · engagement archive export · calculation reconciler UI.

### P2 — later

AI-18 alternative sequencing · **AI-19 cost analogues (governance-gated)** · AI-22 review risk flagging · firm template library · cross-engagement pattern reuse · OCR · image/vision extraction · SmartArt extraction · SSO/SAML/SCIM · live integrations (Miro, Teams, Slack, Jira) · real-time collaborative editing · audio transcription · KPI tracking and value realization monitoring · mobile applications · white-labelled client portals.

## 38.3 Explicit MVP cuts and why

| Cut | Reason |
|---|---|
| Dollar cost model in P0 | Not evidenced in the corpus; formulas would be invention |
| ROI / payback | Requires both cost and quantified value, neither of which exists |
| Resource capacity simulation | Need is evidenced; model is not |
| Real-time collaboration | Optimistic locking with conflict resolution meets the observed working pattern |
| Copilot in P0 | The structured product must be trustworthy first |
| Firm corpus reuse | Requires firm governance decisions before it is safe |
| Multi-framework maturity | Only CMMI is evidenced |

---

# 39. Open Questions

Each requires a decision from Aberdeen before or during the build. Nothing here has been silently assumed; each carries the PRD's working assumption so the build is not blocked.

| # | Question | Why it matters | Working assumption |
|---|---|---|---|
| **OQ-01** | Are the three priority dimensions and 40/35/25 weights firm-standard or per-engagement? | Determines whether `PriorityModel` is a template or a config | Engagement-scoped, seeded from a firm default, editable with recalculation |
| **OQ-02** | The scoring guide references "four dimensions" while three are implemented. Was a dimension removed, and is it returning? | Affects schema flexibility | Three dimensions; the model supports N |
| **OQ-03** | Are the four investment themes a firm taxonomy or bespoke per engagement? | Determines seeding | Bespoke; optional firm template library |
| **OQ-04** | Which effort scale is canonical — T-shirt (XS–XXL), Span (S/M/L), or heat-map Effort (S/M/L)? | Three overlapping scales exist | T-shirt canonical; others derived |
| **OQ-05** | For duration derivation, use min, midpoint, or max of the T-shirt range? | Directly changes every roadmap date | Midpoint, rounded up, range displayed |
| **OQ-06** | How should XXL's open-ended "3–5+ years" be planned? | Affects horizon overflow | 5 years with an open-ended flag |
| **OQ-07** | Is initiative rollup a simple mean or effort-weighted? | Changes theme summary values | Simple mean (consistent with observed values) |
| **OQ-08** | Should human rank override computed rank in wave ordering, or only inform it? | Changes sequencing behaviour after the workshop | Configurable; default is "inform, do not override" |
| **OQ-09** | What divergence threshold constitutes "significant"? | Drives the attention queue | 5 ranks |
| **OQ-10** | Should quadrant labels default to "Sequence Later", "Defer", or "Future Horizon"? | The corpus used multiple variants | Configurable; default "Sequence Later" |
| **OQ-10b** | Are the 3.5/3.5 quadrant thresholds correctly calibrated? Applied to the reference register they yield **zero** "Defend" items. | A framework with an empty quadrant is hard to defend in a Board room | Keep 3.5 as default; surface quadrant population counts in Settings so miscalibration is visible before it reaches a client |
| **OQ-11** | At what grain are priority scores client-visible — initiative only, opportunity level, or methodology only? | Central to the publishing policy | Initiative-level scores plus methodology; opportunity-level opt-in |
| **OQ-12** | Should evidence excerpts ever be client-visible? | Affects trust vs confidentiality | Not by default; per-engagement opt-in |
| **OQ-13** | **Cost model:** what cost categories, estimation basis, and range convention does Aberdeen use? | Blocks all of Phase 8 | Unresolved — P1 blocked pending answer |
| **OQ-14** | **Cost phasing:** linear, front-loaded, or milestone-weighted? | Changes the investment curve | Linear default with override |
| **OQ-15** | **Range aggregation:** simple sum or statistical? | Changes the headline total | Simple sum, explicitly labelled |
| **OQ-16** | **Resource model:** what role taxonomy and FTE conventions? | Blocks capacity modelling | Unresolved |
| **OQ-17** | **Value quantification:** is dollar value ever estimated, or is ordinal banding the firm's position? | Determines whether ROI is ever in scope | Ordinal is P0; quantified is optional P1 |
| **OQ-18** | May prior-engagement economics be reused as analogues, and under what de-identification standard? | Gates AI-19 | Prohibited pending policy |
| **OQ-19** | Should a firm capability-tree library exist? | Speeds setup; risks anchoring | Structure-only duplication, no scores |
| **OQ-20** | Which AI provider and model, given client-confidentiality terms? | Deployment blocker | Provider with no training-on-input |
| **OQ-21** | Is PII redaction required before model calls? | Compliance | Not implemented; flagged |
| **OQ-22** | Which queue/worker provider? | Deployment blocker | Any durable provider with webhook + DLQ |
| **OQ-23** | Is SSO required for client users at launch? | Affects client adoption | Email/magic-link for MVP |
| **OQ-24** | Should the Board deck use a specific firm PPTX template, and is it available? | Export fidelity | A neutral template ships; firm template swapped in |
| **OQ-25** | How long must published snapshots and Board decks be retained? | Storage and compliance | Indefinite within the engagement |
| **OQ-26** | Should engagements support multiple maturity assessment rounds (re-assessment over time)? | Schema supports it; UI does not in P0 | Single round in P0; schema ready |
| **OQ-27** | Do client contributors need to see each other's input after release? | Workshop dynamics | Yes after release, within their engagement |
| **OQ-28** | Should Atlas ever write back to Excel/PowerPoint round-trip? | Consultant workflow preference | No — export only |

---

# 40. End-to-End Acceptance Criteria

The deployed MVP is accepted when the following journey completes successfully on a Vercel production deployment, using the sanitized reference-engagement fixture, executed as an automated E2E test **and** verified manually.

| # | Step | Acceptance assertion |
|---|---|---|
| 1 | Aberdeen user creates an engagement | Engagement exists with seeded PriorityModel (weights sum 1.0), MaturityFramework (5 anchored levels + disclaimer) and EffortScale (XS–XXL). Overview shows the setup checklist. |
| 2 | Uploads the fixture PPTX and XLSX files | All files accepted; each reaches a terminal status; a deliberately malformed file fails gracefully without affecting the batch. |
| 3 | Application parses and stores them | `SourceStructure` is browsable. Excel formulas (`SUMPRODUCT`, `IF`, `CHOOSE`, `VALUE(LEFT())`) are retrievable as text. A header row below row 1 is correctly identified. PPTX tables retain row/column coordinates and merges. |
| 4 | AI proposes structured evidence | ≥30 `Evidence` records in `ai_suggested`, each with a `SourceLocation` that navigates the viewer to the exact cell/shape/page. 100 % of excerpts verify against their cited node. |
| 5 | Aberdeen reviews evidence | Accept/edit/reject/merge all function, including bulk keyboard review. Rejected evidence disappears from downstream retrieval. |
| 6 | Current-state maturity analysis is created | ≥8 capabilities with current and target levels; `gap` and `maturity_label` calculated; heatmap renders; drill-down shows evidence with working source links; the SCAMPI-C disclaimer is present. |
| 7 | AI identifies candidate findings and initiatives | Findings carry polarity; ≥20 candidate opportunities generated, each traceable to a capability gap or finding and, transitively, to evidence. |
| 8 | Aberdeen accepts/edits/rejects them | All three actions work; merge and split work; a duplicate-candidate group is detected and resolvable. |
| 9 | The initiative backlog is created | Opportunities grouped into initiatives, initiatives into themes with sequence. Theme on an opportunity is derived, not stored. Rollups display with denominators. |
| 10 | Prioritization calculations run | Weighted score = `Σ(level × weight)`; band thresholds behave correctly at exactly 4.50, 3.75 and 2.80; quadrant behaves correctly at exactly 3.5/3.5; an opportunity missing one dimension shows "Not yet scored" with null calculated values — **never a partial sum**. |
| 11 | AI proposes dependencies | ≥5 dependencies in `ai_suggested`, each with verbatim `trigger_language` verifiable in a source; cycles reported but not created. |
| 12 | Aberdeen validates them | Validate, reverse, retype, reject all work; only validated dependencies constrain scheduling. |
| 13 | The system produces a V1 technology roadmap | `RoadmapVersion` labelled V1 with items placed, waves assigned, durations derived from T-shirt sizes, and no validated hard-prerequisite violations in the generated proposal. |
| 14 | Aberdeen adjusts sequencing | Drag-to-reschedule persists; `move_reason` captured; the change is a single atomic transaction. |
| 15 | Downstream implications recalculate | Downstream earliest starts update; conflicts appear with codes and messages; a `ChangeImpact` summary names dependent initiatives, affected insights and specific Board slides. |
| 16 | Cost/investment analysis is produced from available source data | Because the corpus contains no cost data, the system displays **"Cost not yet estimated"** with the count of initiatives lacking estimates — **not `$0`**, not a fabricated total. Entering estimates for a subset produces a total labelled as covering only that subset. |
| 17 | At least one alternative scenario is created | Scenario duplicates the baseline; modifications leave the baseline provably unchanged; comparison shows quantified deltas and reports "not comparable" for cost. |
| 18 | Aberdeen produces a Business-Aligned V2 roadmap | Client contributors submit blind rankings; the consultant ranking is unreadable by clients before release (verified by direct API call); release renders the divergence view; reconciliation records human ranks with rationale; V2 is created. |
| 19 | Approved content is published | Publishing is itemized with a client preview; an immutable `Publication` snapshot is created. |
| 20 | Client-facing users see only published content | A client user sees the published roadmap and maturity summary. Direct API calls for Evidence, OpenItem, AI confidence, draft versions and the audit log return 403. Aberdeen edits made after publication are invisible to the client until republication. A recursive key scan of every client payload finds no never-publish field. |
| 21 | A final roadmap is produced | `RoadmapVersion` labelled Final, approved, immutable once published. |
| 22 | A Board-level storyline is generated | Slides follow the required storyline; missing investment data yields a placeholder slide naming what is missing, not a fabricated figure. |
| 23 | Key Board numbers tie directly to the roadmap model | No slide contains a numeric literal for a model-derived quantity (verified by the lint rule and by test). Changing a dimension score changes the rendered slide value with no edit to slide text. |
| 24 | Important recommendations trace back to supporting evidence | From a Board message, a user reaches the source document and exact location in ≤4 clicks. "Why is this here?" returns the deterministic explanation with numbers matching stored values, plus the full evidence closure. |
| 25 | The application is deployed to Vercel from GitHub | Clean clone + documented env vars → passing build → successful deploy. Auth, upload, persistence and permissions all function in the hosted environment. The §36.3 post-deploy checklist passes in full. |

## 40.1 Additional acceptance gates

Beyond the journey, the build is not accepted unless:

- `lib/calc` has 100 % branch coverage and all boundary tests pass.
- Every permission test passes via both UI and direct API.
- The regression snapshot of the fixture engagement's calculated state matches the documented expected values.
- No secrets are present in the repository history.
- `README`, `LOCAL_SETUP`, `DEPLOYMENT`, `TESTING`, `CALCULATIONS`, `AI_CAPABILITIES` and `PERMISSIONS` documents exist and are accurate.
- A developer with no prior context can clone, configure, seed and run the application locally in under 30 minutes by following the README alone.
- The fixture contains no real client-identifying data.

---

## Closing note for the engineering agent

Three requirements in this document are easy to under-build and are the ones that make the product worth building. If time is constrained, protect these:

1. **The calculated/generated boundary.** AI proposes inputs; code computes outputs. Enforce it with module boundaries and tests, not with prompt wording.
2. **Change propagation with a real impact set.** A roadmap tool that lets you move a box without telling you what you just invalidated is the tool this product exists to replace.
3. **The publication snapshot.** Client isolation achieved by filtering will eventually leak. Client isolation achieved by serving a frozen, separately-built payload will not.

Everything else in this PRD is in service of those three.

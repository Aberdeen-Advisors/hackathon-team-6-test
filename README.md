# Conductor

**Transformation roadmap platform — Aberdeen Advisors.**
One model, from evidence through maturity and prioritisation to the roadmap and the decisions it asks of the Board.

Conductor runs a technology transformation engagement as a **structured computational model** rather than a set of documents. Priority and sequencing are calculated, never typed. Aberdeen controls exactly what a client sees. Client input returns as a proposal, never as a write to the source of truth.

> **This repository is a clickable prototype.** It has no backend and no database. See [Known limitations](#known-limitations) before demonstrating it.

---

## Two ways in

After signing in as an Aberdeen user you land on the **engagement selection** screen, which offers two distinct experiences over the same product.

| | **Completed Demo** | **Start a New Engagement** |
|---|---|---|
| Answers *"what can this produce?"* | *"how would we build it from a blank page?"* |
| Intake | 84 responses captured | Nothing — you answer them |
| Documents | One ingested and reviewed | None |
| Analysis | 12 capabilities, 18 scored opportunities, 8 initiatives, 6 dependencies | Empty, with guidance on each screen |
| Roadmap | Sequenced across three waves | Empty |
| Financials | Two initiatives costed, phasing live | Empty |
| Published | Version 1 live in the client portal | Nothing published |

Both use the same screens, the same calculation engines and the same workflow. **Demo data cannot reach a blank engagement** — the blank model is constructed from scratch by a pure factory, and that guarantee is covered by seven isolation tests. Every empty section in a blank engagement offers a link to the same section in the completed demo, which opens the demo rather than copying anything out of it.

The demo can be reset, and blank engagements can be created and deleted, without affecting each other.

---

## Demo credentials

| Role | Email | Password |
|---|---|---|
| **Aberdeen** — Liv DeSantis, Engagement Lead | `aberdeen@aberdeenadv.com` | `Demo2026!` |
| **Client** — Chief Digital & Information Officer | `exec@meridiansupply.com` | `Demo2026!` |

Both accounts are listed on the sign-in screen and fill the form on click. The user menu also has a **Switch role** control so you can move between the two views on stage without signing out, and a **Reset demo data** control that restores everything to its seeded state.

---

## Local setup

Requires Node 20 or later.

```bash
git clone <this-repo>
cd conductor
npm install
npm run dev          # http://localhost:3000
```

No environment variables. No database. No accounts to provision.

```bash
npm run test         # calculation engine unit tests (28 tests)
npm run build        # production build
npm run lint
```

---

## Deployment to Vercel

1. Push this repository to GitHub.
2. In Vercel: **Add New → Project → Import** the repository.
3. Framework preset: **Next.js**. Leave everything else at its default.
4. **Environment variables: none required.**
5. Deploy.

That is the whole process. The app is fully static plus client-side state, so there is nothing to configure and nothing to keep running.

---

## Intake is three layers, not one form

**Layer 1 — engagement setup.** 84 questions across seven sections: client and engagement profile, transformation context, objectives and measures of success, scope and boundaries, constraints, stakeholders and governance, initial hypotheses. Every answer saves as you type, stays editable for the life of the engagement, and shows what it is **used in** downstream.

**Layer 2 — documents.** Upload a Word document and the application reads it, produces partner-quality insights, and proposes answers to questions in layers 1 and 3.

**Layer 3 — phase questionnaires.** One questionnaire per methodology phase (Week 0 through Weeks 10–12), 78 questions in total, prefilled from documents where the evidence supports an answer.

### How a suggested answer behaves

- It is marked **AI suggested from document**, with the source document, the exact excerpt, the paragraph number and a confidence value.
- It is **never confirmed** until you accept it. Accept, edit, or reject.
- If you edit it, **your version is authoritative** and the suggestion is kept in history.
- A manual answer is **never silently overwritten**. If a later document contradicts it, the system raises a **conflict** showing both, and you decide.
- Every change is kept in history with its source.

---

## The demonstration path

Twelve steps, roughly ten minutes. Every step changes application state — there are no placeholder actions.

1. **Sign in** as `aberdeen@aberdeenadv.com`, then choose **Start a New Engagement**. (Open the **Completed Demo** first if you want to see the destination before the journey.)

2. **Setup** — work through the seven intake sections. Answer a few in each; note the **Used in** link beneath every question, which shows exactly which findings, scores, roadmap items and financial calculations depend on that answer.

3. **Sources** — upload a Word document. Use the included sample at `/samples/meridian-discovery-notes.docx`, or **any .docx of your own**.

4. **Watch it process.** Five visible stages: reading, extracting structure, synthesising, analysing across the evidence, and matching to open questions. The sample produces **11 insights**, ~27 structured findings and ~14 suggested questionnaire answers.

5. **Review the insights.** Each carries nine fields — headline, what we observed, why it matters, likely root cause, roadmap implication, recommended response, evidence with paragraph citations, confidence with an explanation, and the open question that still needs validating. Each is classified as **directly evidenced**, **reasonable inference**, **consultant hypothesis**, **contradiction** or **missing information**, and you can accept, reject or reclassify any of them. Then switch to **Structured findings** and accept a few candidates.

6. **Go back to Setup and Phase questions.** Suggested answers are waiting, each showing its source excerpt and confidence. Accept one, edit another, reject a third. Then **see where accepted findings went:**
   - an **objective** → Kickoff objectives, and the alignment scoring picker
   - an **opportunity** → the backlog, deliberately unscored, reading *"Not yet scored"*
   - a **prerequisite** → a **proposed** dependency that does not constrain the schedule until validated
   - a **financial figure** → the cost line you chose, on the initiative you chose
   - a **risk** → the risk register, visible on the Roadmap and in the client's executive view once published

7. **Opportunities** — click any D1/D2/D3 cell. The anchor picker offers five *written* anchors, not a number field. Score the opportunity you just created. The weighted score, band, quadrant, theme average and rank all move at once.
   - **OPP-014** is missing one dimension and reads *"Not yet scored — 2 of 3 dimensions complete"*. It never shows a partial number.
   - **Propose scores with AI** suggests a level and anchor with cited evidence and a confidence value, to accept, edit or reject.

8. **Roadmap** — drag **ERP Programme Sequencing** into Wave 1. Two hard prerequisites point at it, so two violations appear in red and an impact panel names every affected initiative and wave. Validate the proposed dependency you accepted in step 6 and watch the schedule respond.

9. **Financials** — open an initiative and enter assumptions. Totals, phasing, every chart and the coverage indicator update together.
   *Cause and effect:* go back to the Roadmap, move a costed initiative to a different wave, then return. **Its investment and benefits have moved with it** — the money follows the roadmap, because both read the same model.

10. **Publish** — select content (including risks and the financial summary), use **Preview as client**, add a note, publish.

11. Switch to the **client** account. The portal shows only what was published. Submit a top-five ranking, a dependency suggestion, a comment, and timing feedback.

12. Switch back. **Client Feedback** lists all four, with the client's ranking beside the computed ranking. Accept two and reject two, each with a note — accepting **applies** the change to the model. **Publish** again; the client sees the new version and a plain-language summary of what changed.

---

## What is architecturally real

Five things in this prototype are built the way the production system should be, and would survive a swap from local storage to a database:

**A blank engagement is genuinely blank.** `src/lib/store/factories.ts` builds an empty model from scratch. Seven tests assert that it shares no object identity with the demonstration seed, contains none of the demo answers, and does not mention the demo client anywhere. Every mutation in the store is scoped to the active engagement, so there is no code path that can write to one while another is open.

**The insight engine looks across the evidence, not at one sentence at a time.** `src/lib/insights/engine.ts` runs nine analytical patterns — ambition against capability, key-person concentration, foundation concentration, deferred decisions, investment against scale, capacity against ambition, contradiction, strength as accelerator, and evidence gap. Each pattern supplies the analytical *shape*; the document supplies every specific. **A pattern that cannot find its specifics does not fire**, which is what keeps the output from degenerating into "the organisation should improve governance."

**Document synthesis reads the actual file.** `src/lib/ingest/` parses a real `.docx` client-side with mammoth, preserving heading and list structure rather than flattening to text. `synthesise.ts` is a pure, tested extraction engine: it scores every sentence against signal lexicons for objectives, capability gaps, prerequisites, financial figures and risks; extracts named entities, metrics and currency amounts (normalising `$2.4m` to `2400000`); clusters paragraphs into topics; and returns typed candidates anchored to their source paragraph with a confidence value. **Different documents produce different output** — it is not a scripted response. It is rule-based rather than model-based; the specification (PRD section 14, AI-02) replaces it with an LLM returning the same schema under the same human-review gate.

**The financial model is phased from the roadmap.** `src/lib/calc/financials.ts` spreads capital across an initiative's delivery quarters, starts recurring cost at go-live, and starts benefits after go-live plus a stated lag — all derived from that initiative's position on the roadmap. Move it to a different wave and the money moves with it. This is covered by an explicit test.

**Calculations are pure and central.** Every formula lives once, in `src/lib/calc/`, with no React, no store and no I/O. Each function returns `{ value, inputs, formulaString, formulaWithValues }` so the interface can explain itself. If any contributing input is missing the result is `null` — never a partial sum. A spreadsheet treats a blank as zero and silently produces a confidently wrong priority band; this engine refuses to.

**Publishing writes a snapshot, not a filter.** `src/lib/publish/buildClientPayload.ts` is an explicit whitelist serialiser that constructs a new object containing only permitted fields. The client portal reads that snapshot and never touches the working model, so a field left out of the serialiser cannot leak. Client-visible content is the *published band*, never the underlying dimension scores.

**Client input is a proposal.** Submissions are recorded with status `pending` and never mutate the model. Accepting a submission in the Aberdeen workspace is what applies the change — and a comment is acknowledged rather than applied, because a comment is not a change request.

### The calculation engine

| Function | What it does |
|---|---|
| `weightedScore` | `Σ (level × weight)` across the three dimensions, weighted 0.40 / 0.35 / 0.25 |
| `priorityBand` | Critical ≥ 4.50, High ≥ 3.75, Medium ≥ 2.80, else Lower — banded from the **unrounded** score |
| `quadrant` | x = mean(financial impact, strategic alignment); y = risk if deferred; thresholds at 3.5 |
| `maturityGap` | `target − current`; a negative gap is legal and reads "Exceeds target" |
| `durationQuarters` | Midpoint of the T-shirt month range, rounded up |
| `earliestStart` | Topological schedule over **validated hard prerequisites only**; detects cycles |
| `detectConflicts` | `DEP_VIOLATION` (error), `SOFT_DEP_WARNING`, `UNSIZED`, `UNSCORED` |
| `initiativeRollup` | Mean of scored children, always with its denominator |
| `denseRank` | Dense ranking with shared ranks on ties |
| `initiativeTotals` | Capital lines plus contingency, low/base/high, internal against external |
| `phaseInitiative` | Quarter-by-quarter cost and benefit, phased from the roadmap position |
| `portfolioTotals` | Portfolio aggregation with coverage, partial-total flag and named gaps |

Tests cover every band and quadrant boundary — exactly 4.50, 3.75, 2.80 and 3.5 on each axis — plus the case where a score of 3.749 displays as 3.75 but must band as Medium. The financial suite proves that phasing follows the roadmap and that an unestimated initiative contributes `null`, never zero. The synthesis suite proves that extraction responds to the document rather than a script.

**78 tests across five suites.** Run them with `npm run test`.

---

## Architecture

```
src/
├─ app/
│  ├─ login/                  Sign-in
│  ├─ engagements/           Engagement selection — completed demo or new blank
│  ├─ workspace/              Aberdeen: overview · setup · sources · phase questions
│  │                          · opportunities · current state · roadmap · financials
│  │                          · publish · feedback
│  └─ portal/                 Client: overview · current state · roadmap · investment · feedback
├─ components/
│  ├─ ui.tsx                  Design system — Aberdeen brand primitives
│  ├─ Shell.tsx               Header, navigation, route guards
│  ├─ JourneyRail.tsx         Guided engagement journey, completion computed from the model
│  ├─ AnchorPicker.tsx        Anchored 1–5 scoring
│  ├─ QuadrantChart.tsx       Business value against urgency
│  ├─ Charts.tsx              Executive SVG charts — bars, curves, ranges, donuts, scatter
│  └─ RoadmapTimeline.tsx     Waves, lanes, dependencies, drag-to-reschedule
├─ lib/
│  ├─ calc/                   Pure deterministic engines (priority + financial) + tests
│  ├─ ingest/                 .docx parsing, synthesis and questionnaire prefill + tests
│  ├─ insights/               Partner-quality cross-document insight patterns
│  ├─ store/                  Multi-engagement context, factories + isolation tests
│  └─ publish/                Whitelist serialiser + publication diff
├─ data/
│  ├─ methodology.ts          Client-neutral templates — 84 intake + 78 phase questions
│  ├─ seed.ts                 Demonstration engagement (fictional client)
│  └─ demoAnswers.ts          Completed intake responses for the demonstration
└─ public/samples/            Sample .docx for the ingestion demonstration
```

**Stack:** Next.js (App Router) · TypeScript · Tailwind · Vitest. No database, no ORM, no auth library, no state library.

### Brand

Aberdeen Advisors brand applied throughout, exact values only:

| | |
|---|---|
| Aberdeen Blue | `#09375F` — primary, headers, navigation |
| Verdigris | `#44B0B1` — accents, rules, focus states |
| Onyx | `#404040` — body text |
| Secondary (charts and category encoding only) | Deep Sky Blue `#5CC8FF` · Jasper `#DB504A` · Jade `#00A676` · Gold `#F7D002` |
| Typography | Poppins — ExtraLight headings, Medium subheadings, Regular body. Arial fallback. |

ADA rules are enforced: Verdigris never appears as text on white, and category colour is always paired with a label or numeral so colour is never the sole encoder of meaning. Logo assets are the supplied SVGs in `public/`, white on Aberdeen Blue and blue on white.

---

## Known limitations

This is a prototype built to demonstrate the workflow and the interface. It is **not** production software.

- **No backend, no database, no real authentication.** The sign-in screen is a demonstration gate. Credentials are plain constants in `src/data/seed.ts`. Real authorisation is server-side in the specification.
- **State is per-browser `localStorage`.** The Aberdeen and client views must be demonstrated **on the same browser**. It is not multi-user or multi-device — a colleague opening the portal on their own laptop will not see your submissions.
- **Word (.docx) ingestion is fully functional.** PowerPoint, Excel and PDF are **not** implemented and are deliberately not offered as upload controls — they are listed on the Sources screen as future capabilities, with no button that does nothing.
- **Document synthesis is rule-based, not model-based.** It genuinely reads the uploaded file and responds to its content, but it uses signal lexicons and pattern extraction rather than an LLM. The specification replaces it with an LLM returning the same schema.
- **AI scoring proposals are mocked** — realistic latency, real review flow, pre-written proposals for three opportunities.
- **Insight generation is pattern-based, not model-based.** Nine analytical patterns fire against the evidence. They produce specific, decision-oriented output because the document supplies every noun and number — but they are not reasoning, and they will not find a pattern nobody encoded. The specification replaces them with an LLM returning the same nine-field schema under the same review gate.
- **Client users see one engagement.** The portal opens the most recently published engagement rather than offering a chooser.
- **Not built:** Board deck generator, PPTX/XLSX export, scenario modelling, audit log UI, analytical versioning, resource capacity modelling.
- **Tests cover the calculation engine only.**
- The seeded client, **Meridian Supply Group**, is fictional. No real client data is present in this repository.

### What the specification covers that this does not

The full product requirements are in `docs/PRD.md` — 40 sections covering the canonical data model, the AI capability register, the complete calculation engine, change propagation rules, the Board deck generator, and the deployment and testing strategy. This prototype implements a working slice of it, chosen so that the parts most worth proving — the calculation engines, the document-to-model flow, the publishing boundary and the feedback loop — are the parts that are real.

---

## Licence

Internal to Aberdeen Advisors. Not for distribution.

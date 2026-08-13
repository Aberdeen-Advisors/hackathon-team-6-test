# Conductor

**Transformation roadmap platform — Aberdeen Advisors.**
One model, from evidence through maturity and prioritisation to the roadmap and the decisions it asks of the Board.

Conductor runs a technology transformation engagement as a **structured computational model** rather than a set of documents. Priority and sequencing are calculated, never typed. Aberdeen controls exactly what a client sees. Client input returns as a proposal, never as a write to the source of truth.

> **This repository is a clickable prototype.** It has no backend and no database. See [Known limitations](#known-limitations) before demonstrating it.

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

## The demonstration path

Twelve steps, roughly eight minutes. Every step changes application state — there are no placeholder actions.

1. **Sign in** as `aberdeen@aberdeenadv.com`. The journey rail across the top of every workspace screen shows where the engagement stands — completion is computed from the model, never self-reported.

2. **Kickoff** — work through the five intake steps: mandate and sponsor, objectives, scope, stakeholders, information requests. Add an objective and complete kickoff.
   *Cause and effect:* that objective is now selectable when scoring strategic alignment on the Prioritise step.

3. **Sources** — upload a Word document. Use the included sample at `/samples/meridian-discovery-notes.docx`, or **any .docx of your own**.

4. **Watch it synthesise.** The application reads the file, extracts its heading structure, and produces themes, key takeaways, watch-outs, and typed candidate findings — each anchored to the paragraph it came from, with a confidence value and the entities, metrics and currency amounts it detected. The sample yields around 27 candidates across five kinds.

5. **Review the findings.** Every candidate states where it will land if accepted. Accept a few, reject the rest. Nothing enters the model until you accept it.

6. **See where they went:**
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

**79 tests across three suites.** Run them with `npm run test`.

---

## Architecture

```
src/
├─ app/
│  ├─ login/                  Sign-in
│  ├─ workspace/              Aberdeen: overview · kickoff · sources · opportunities
│  │                          · current state · roadmap · financials · publish · feedback
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
│  ├─ ingest/                 .docx parsing and the synthesis engine + tests
│  ├─ store/                  React context, localStorage persistence
│  └─ publish/                Whitelist serialiser + publication diff
├─ data/seed.ts               Seeded engagement (fictional client)
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
- **Not built:** Board deck generator, PPTX/XLSX export, scenario modelling, audit log, analytical versioning, resource capacity modelling, multi-engagement routing.
- **Tests cover the calculation engine only.**
- The seeded client, **Meridian Supply Group**, is fictional. No real client data is present in this repository.

### What the specification covers that this does not

The full product requirements are in `docs/PRD.md` — 40 sections covering the canonical data model, the AI capability register, the complete calculation engine, change propagation rules, the Board deck generator, and the deployment and testing strategy. This prototype implements a working slice of it, chosen so that the parts most worth proving — the calculation engines, the document-to-model flow, the publishing boundary and the feedback loop — are the parts that are real.

---

## Licence

Internal to Aberdeen Advisors. Not for distribution.

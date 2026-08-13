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

Ten steps, roughly five minutes.

1. Sign in as **aberdeen@aberdeenadv.com**.
2. **Overview** — engagement mandate, phase, theme rollups, publication history. Every figure carries its denominator.
3. **Opportunities** — click any D1/D2/D3 cell. The anchor picker offers five *written* anchors, not a number field. Choose one, add a rationale, save. The weighted score, priority band, quadrant and theme average all move at once.
   - Open **OPP-014**. It is missing one dimension, so it reads *"Not yet scored — 2 of 3 dimensions complete"*. It never shows a partial number.
   - Use **Propose scores with AI** to see the model suggest a level and anchor with cited evidence and a confidence value, for a consultant to accept, edit or reject.
4. **Roadmap** — drag **ERP Programme Sequencing** into Wave 1. Two hard prerequisites point at it, so two violations appear in red and an impact panel names every affected initiative and wave.
5. **Publish** — select content, use **Preview as client** (rendered through the same serialiser that produces the snapshot), add a note, publish version 2.
6. Switch to the **client** account. The portal shows only what was published — unpublished items are absent entirely, not hidden.
7. **Feedback** — submit a top-five ranking, a dependency suggestion, a comment, and timing feedback on a roadmap item.
8. Switch back to Aberdeen. **Client Feedback** lists all four as pending, with the client's ranking shown against the computed ranking.
9. Accept two and reject two, each with a note. Accepting **applies** the change to the model; rejecting leaves it untouched. The header shows unpublished changes.
10. **Publish** again. The client sees version 3, your note, and a plain-language summary of what changed.

---

## What is architecturally real

Three things in this prototype are built the way the production system should be, and would survive a swap from local storage to a database:

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

Tests cover every band and quadrant boundary — exactly 4.50, 3.75, 2.80 and 3.5 on each axis — plus the case where a score of 3.749 displays as 3.75 but must band as Medium.

---

## Architecture

```
src/
├─ app/
│  ├─ login/                  Sign-in
│  ├─ workspace/              Aberdeen: overview · opportunities · current state
│  │                          · roadmap · publish · client feedback
│  └─ portal/                 Client: overview · current state · roadmap · feedback
├─ components/
│  ├─ ui.tsx                  Design system — Aberdeen brand primitives
│  ├─ Shell.tsx               Header, navigation, route guards
│  ├─ AnchorPicker.tsx        Anchored 1–5 scoring
│  ├─ QuadrantChart.tsx       Business value against urgency
│  └─ RoadmapTimeline.tsx     Waves, lanes, dependencies, drag-to-reschedule
├─ lib/
│  ├─ calc/                   Pure deterministic engine + tests
│  ├─ store/                  React context, localStorage persistence
│  └─ publish/                Whitelist serialiser + publication diff
└─ data/seed.ts               Seeded engagement (fictional client)
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
- **No file upload or document parsing.** All data is seeded. The specification covers ingestion of PPTX, XLSX, PDF and DOCX with structure preserved to the cell and slide.
- **AI scoring proposals are mocked** — realistic latency, real review flow, pre-written proposals for three opportunities.
- **Not built:** Board deck generator, PPTX/XLSX export, scenario modelling, audit log, analytical versioning, evidence review queue, multi-engagement routing, cost and capacity modelling.
- **Tests cover the calculation engine only.**
- The seeded client, **Meridian Supply Group**, is fictional. No real client data is present in this repository.

### What the specification covers that this does not

The full product requirements are in `docs/PRD.md` — 40 sections covering the canonical data model, the AI capability register, the complete calculation engine, change propagation rules, the Board deck generator, and the deployment and testing strategy. This prototype implements roughly the first eighth of it, chosen so that the parts most worth proving are the parts that are real.

---

## Licence

Internal to Aberdeen Advisors. Not for distribution.

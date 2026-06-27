# SEKAI 世界 Premium Redesign Championship — Contest Brief

You are running an autonomous multi-agent design contest. Execute every phase end-to-end without pausing for approval. The user is away from the machine. Take all the time you need.

---

## 0. Environment

- **Working directory:** `/Users/JC/Dev/jc-recipes/.claude/worktrees/adoring-hamilton-98d792` (worktree on branch `experimentalWork`)
- **Main/base branch:** `claude/recipe-management-app-AaZ7N` (do NOT touch directly — `experimentalWork` already branched from it)
- **Primary worktree:** `/Users/JC/Dev/jc-recipes` (has main branch checked out — do not interfere)
- All work happens inside the `experimentalWork` worktree.

First action: `cd` into the worktree path above and verify branch with `git branch --show-current` (expect `experimentalWork`).

---

## 1. Project Context (read before anything else)

- **Product:** SEKAI 世界 — a private recipe tool for JC (restaurant chef, Sakai) + small invited circle. Not consumer-facing. No public signup.
- **Stack:** Next.js (app router) + Supabase (auth, Postgres, RLS) + TypeScript + Jest + Playwright
- **Brand rules:** `.impeccable.md` and `CLAUDE.md` at repo root — palette (Terracotta #D4703F + Gold #EDD18E + Ink/Bone), typography (Cormorant Garamond + Noto Serif JP + Barlow Condensed), dark-default w/ `data-theme` light override, OKLCH tokens.
- **Anti-references:** engagement-feed consumer apps, lifestyle cooking blogs, generic notes apps, SaaS marketing homepages. Teams may break brand rules if they propose something stronger, but must justify.
- **Knowledge graph:** run `/graphify query "..."` before reading raw files when possible. `graphify-out/GRAPH_REPORT.md` and `graphify-out/wiki/index.md` are navigation entry points.

### Sacred features (MUST remain functional after contest winner is implemented)

1. Auth (Supabase email/password, three seed users: jc@sakai.app, demo@sakai.app, test@jc-recipes.local)
2. Recipe CRUD
3. Search + tag filter + sort
4. Serving scaler
5. Unit conversion toggle
6. Cooking mode (`/cook`)
7. Toast system
8. Unsaved-changes warning
9. Copy ingredients
10. Unit autocomplete
11. Print view
12. Font-size preference (SM/MD/LG, per-browser)

Teams may IMPROVE these, but every improvement to an existing feature requires a dedicated pre-change checkpoint commit so user can roll back that feature individually without losing rest of winning proposal. New additive features need no checkpoint.

### Quality gates (winner implementation must pass all)

- `npm run build` — clean
- `npm test` — Jest 91/91 passing
- `npx playwright test` — desktop 23 + mobile 5 = 28/28 passing
- `scripts/test-gate.mjs` (auto via pre-commit hook) — no regressions vs baseline

---

## 2. Phase 1 — Deep project analysis

Spawn parallel research agents to build a comprehensive project dossier. Use subagents so main context stays clean.

Produce `contest/_analysis/DOSSIER.md` covering:

- Current page inventory (every route, what it does, current UX strengths + weaknesses)
- Current component inventory (key reusable components, design debt)
- Current animation/motion inventory (what exists, what feels flat)
- Current brand-token usage (where tokens shine, where they're ignored)
- Friction points in real kitchen-use workflows (phone on counter, hands dirty, scaler, cook mode, search)
- Perceived "2026-ness" baseline score (0–10) with honest justification per surface
- Top 10 "premium opportunity" targets (surfaces where a premium rework would produce the biggest WOW-to-risk ratio)

Also dump current visual state to `contest/_analysis/current-state/`:
- Start dev server (`npm run dev`)
- Use `mcp__Claude_Preview__*` tools OR Playwright to screenshot every route in both themes
- Save screenshots for judge reference later

Do not proceed to Phase 2 until dossier is written.

---

## 3. Phase 2 — Launch 5 teams in parallel (silent mode)

Create directory structure:

```
contest/
  _analysis/
  teams/
    team-a-editorial/
    team-b-kinetic/
    team-c-spatial/
    team-d-brutalist/
    team-e-ambient/
  judge/
  winner/
```

**Lanes are pre-assigned — no team may copy another's angle:**

| Team | Lane | Core direction (teams free to extend) |
|------|------|----------------------------------------|
| A | Editorial-Magazine | Typography-driven, layout-centric, print-grade hierarchy, restrained motion |
| B | Kinetic-Motion | Choreography-first, physics, spring systems, haptics, motion as primary language |
| C | Spatial-3D | WebGL/WebGPU, depth, parallax, shaders, dimensional materiality |
| D | Brutalist-Raw-Luxe | Monospace rebellion, grid density, stark contrast, "ugly-beautiful" luxury |
| E | Ambient-Atmospheric | Light, glass, aurora, volumetric color, mood-driven skins, time-of-day awareness |

**Each team = 4 agents dispatched in parallel:**

1. **Researcher** — web research for 2026 visual trends in their lane, find 10+ concrete references (award sites, studios, product leaders). Save to `team-X/research.md`.
2. **Designer** — produces `design-spec.md` (visual system: tokens, typography scale, motion language, component rules, 3 killer moments) + `mockup.html` (standalone self-contained HTML/CSS/JS file demonstrating the direction on key surfaces — must render offline in a browser, must include at least: home, recipe detail, cook mode, login).
3. **Frontend Architect** — produces `implementation-plan.md` (file-by-file change list against current repo) + `key-snippets/` directory with actual TSX/CSS showing the heart of the proposal (not full impl, just the decisive pieces — e.g. shader component, motion primitive, new layout system).
4. **Dev/Stability** — produces `stability-report.md` auditing proposal for: (a) breakage risk to sacred features, (b) performance budget (LCP, bundle size, animation frame cost), (c) accessibility impact, (d) security surface changes (especially if introducing canvas/WebGL/new libs), (e) mitigation plan per risk.

**Team brief (give each team their brief verbatim, substituting `{LANE}` and `{LANE-SPECIFIC-GUIDANCE}`):**

> You are Team {X} in a silent design contest for SEKAI 世界, a private premium recipe tool. Your lane is **{LANE}**. Four other teams are working in different lanes — you will never see their work, they will never see yours, until a judge reveals winners.
>
> Goal: produce the most WOW, premium, 2026, appealing, stable proposal for a whole-app redesign. Free to break any design rule EXCEPT breaking functionality. Every sacred feature (listed in `contest/_analysis/DOSSIER.md`) must remain functional after implementation. Improvements to existing features require pre-change git checkpoint commits; new features can flow freely.
>
> Scope: whole app, every route. Deliver design-spec + interactive HTML mockup + decisive code snippets + stability report.
>
> Your lane is **{LANE}** — {LANE-SPECIFIC-GUIDANCE}. Push the lane to its extreme. Do not hedge into other lanes.
>
> Output directory: `contest/teams/team-{letter}-{lane-slug}/`. No other team will see it. Keep work secret.

Dispatch all 5 teams **in parallel**, each team spawning its 4 sub-agents **in parallel**. That's up to 20 concurrent agent invocations — use `run_in_background` liberally.

Wait for all teams to complete before Phase 3.

---

## 4. Phase 3 — Judge

Spawn **one judge agent** (opus-class, long context). Brief:

> You are the sole judge of a 5-team silent design contest for SEKAI 世界. Read every team's submission in `contest/teams/*` thoroughly. Also read `contest/_analysis/DOSSIER.md` for project context and current-state baseline.
>
> Score each team on a 0–10 scale across:
>
> 1. **WOW factor** — does it make the judge audibly react?
> 2. **2026-ness** — does it feel like the future, not a copy of 2023 trends?
> 3. **Visual appeal** — craft, polish, typography, color, restraint
> 4. **Utility improvement** — does it make cooking easier, not just prettier?
> 5. **Stability & feasibility** — will it actually ship without breaking sacred features?
> 6. **Lane mastery** — did they push their lane to its best expression?
>
> Produce `contest/judge/scorecard.md` with per-team scores, written critique, and a final ranking: 1st (winner), 2nd, 3rd, 4th, 5th. Include a one-paragraph "why this won" for the winner and one-paragraph "why this lost but here's what was great" for runners-up.
>
> Tie-break policy: if two teams tie within 1 point, prefer the one with lower breakage risk and higher lane mastery.

---

## 5. Phase 4 — Implementation (winner only)

Read `contest/judge/scorecard.md` to identify winner. Copy winner's full submission to `contest/winner/`.

**Before touching any existing code:**
1. `git tag checkpoint/pre-contest-impl` — absolute rollback point
2. For each sacred feature the winner proposes to improve, create `git tag checkpoint/feature-{slug}-pre` immediately before that feature's implementation commit

**Then dispatch parallel implementation agents**, one per major surface area (home, recipe-detail, cook-mode, auth/login, components, tokens, motion-system, etc.). Each agent:

- Reads winner's design-spec + implementation-plan + key-snippets
- Implements its slice end-to-end
- Writes tests for any new logic
- Commits with conventional-commits messages
- Tags the appropriate checkpoint BEFORE any sacred-feature modification

Coordinate agents to avoid merge conflicts by assigning non-overlapping file sets. If conflicts arise, serialize instead of parallelizing that slice.

---

## 6. Phase 5 — Verification

Run in this order, fix-forward if anything fails:

```bash
npm run build
npm test
npx playwright test
```

If the pre-commit hook's test-gate blocks a commit, read `CONTRIBUTING_TESTS.md` for override procedure. Prefer fixing the underlying issue over overriding.

Also run `graphify update .` to refresh the knowledge graph. Discard clustering churn in `graphify-out/` with `git checkout -- graphify-out/` before committing (per user feedback memory).

Manual UI verification: start dev server, walk through every sacred feature on desktop + mobile viewport, confirm nothing broken. Use `mcp__Claude_Preview__*` or Playwright for screenshots of new state, save to `contest/winner/after-screenshots/`.

---

## 7. Phase 6 — Reveal

Write `contest/REVEAL.md` containing:

- **🏆 Winner:** team name, lane, one-paragraph elevator pitch, three killer moments, link to mockup, summary of what was implemented
- **🥈 2nd place:** team name, lane, elevator pitch, what was great, what was lost
- **🥉 3rd place:** same
- **Honorable mentions:** 4th and 5th, one line each
- **Rollback map:** table of checkpoint tags with which feature each one protects
- **Before/after gallery:** links to before screenshots (`_analysis/current-state/`) and after screenshots (`winner/after-screenshots/`)

End your session by printing the reveal summary to the user and listing the rollback tags so the user can selectively revert any feature they don't like while keeping the rest.

---

## Operational rules

- **Silent mode:** do not print team proposals to chat during Phase 2 or Phase 3. Users should only see phase-transition status lines ("Phase 2 complete, all 5 teams submitted" etc.). The big reveal is Phase 6.
- **Parallelism:** dispatch independent agents with multiple Agent tool calls in a single message. Background long-running agents with `run_in_background: true` and wait for completion notifications.
- **Git hygiene:** small atomic commits, conventional-commits format, include `Co-Authored-By: Claude` trailer.
- **No force-push, no branch deletion, no skipping hooks** without explicit rationale.
- **Secrets:** never commit `.env.local`, credentials, or keys.
- **If blocked:** diagnose root cause, don't reach for destructive shortcuts.
- **Token budget:** no cap — user said take all the time needed. Still be efficient with reads (prefer graphify queries over raw file reads when possible).

---

## Ready

Begin Phase 1 immediately. No further confirmation needed.

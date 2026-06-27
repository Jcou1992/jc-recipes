# Design History

Archived record of how SEKAI's current look was chosen. Kept as text (cheap, auditable);
the heavy visual artifacts were removed (see "What was trimmed" below).

## The 2026 design contest (what happened)

A silent, 5-team design contest picked the app's 2026 look. Each team got a pre-assigned lane,
worked in secret, and produced a full submission (research → spec → mockup → implementation plan →
key snippets → stability report). One sealed-envelope judge ranked them. The winner was implemented
behind a toggleable `design-mode` cookie so nothing was destroyed — `classic` (default) preserves the
old interface pixel-for-pixel; `brut` is the winning design. Toggle: **Settings → DESIGN**.

| Rank | Team | Lane | Score |
|---|---|---|---|
| 🏆 1st | D | **Brutalist-Raw-Luxe** (shipped as `brut`) | 54 / 60 |
| 🥈 2nd | A | Editorial-Magazine | 48 / 60 |
| 🥉 3rd | B | Kinetic-Motion | 46 / 60 |
| — | E | Ambient-Atmospheric | 46 / 60 |
| — | C | Spatial-3D | 41 / 60 |

**Full record:** [`contest/REVEAL.md`](contest/REVEAL.md) — winner rationale, the three signature
moments (Wayfinder telemetry row, scaler-as-index odometer, SERVICE COMPLETE stamp), the
commit-by-commit implementation log, and the per-feature rollback map (checkpoint tags).
Judge detail: [`contest/judge/scorecard.md`](contest/judge/scorecard.md). Brief:
[`contest/_analysis/DOSSIER.md`](contest/_analysis/DOSSIER.md). Per-team submissions under
[`contest/teams/`](contest/teams/).

## Learnings worth carrying forward

1. **Toggle-gated redesign = zero-risk radical change.** Shipping the whole redesign behind a
   `design-mode` cookie with `classic` preserved pixel-for-pixel let a sweeping change land with an
   instant, code-free rollback (Settings → DESIGN → CLASSIC). Reusable pattern for any big visual bet.
2. **Per-feature pre-edit checkpoint tags.** Each route conversion got a `checkpoint/feature-*-pre`
   tag, so any single feature can be reverted without losing the rest. Cheap insurance for risky sweeps.
3. **The smallest fix won the biggest UX.** Replacing the Unicode minus `U+2212` with ASCII `-`
   summoned the iOS numeric keypad — resolved the top kitchen-friction item with a one-character change.
   Look for these before building anything elaborate.
4. **Borrow from the runners-up.** The winner integrated Team A's reserved-`ch`-width trick (kills
   odometer digit jitter). Cross-pollination beat single-vision; the judge explicitly recommended borrows.
5. **Discipline can verge on self-erasure (YAGNI).** Team C's spatial pipeline was immaculate but
   defaulted to "indistinguishable from today" on the target phone — ambitious tech that no user sees
   isn't worth its bundle cost. Team B's motion lane carried real costs too (+22 kB, iOS no-op vibrate,
   long transitions that make e2e flaky).

## What was trimmed (and how to get it back)

To keep the repo lean, the following were **deleted** from the working tree after this archival
(they were ~99 MB and/or duplicate already-shipped code):

- `**/after-screenshots*/`, `_analysis/current-state/` — 100 before/after PNGs (~99 MB).
- `**/key-snippets/` — `.tsx`/`.ts`/`.css` that duplicate code now shipped under `src/components/ui/brut/` and `src/lib/brut/`.
- `**/mockup.html` — standalone design previews (superseded by the shipped implementation).
- `scripts/contest-screenshots*.mjs` — the screenshot-capture tooling (no longer needed).

All remain recoverable from git history — e.g. the tag `checkpoint/pre-contest-impl` points at the
full pre-implementation state with every artifact present:

```bash
git checkout checkpoint/pre-contest-impl -- contest/   # restore originals to inspect
```

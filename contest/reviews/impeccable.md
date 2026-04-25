# impeccable:impeccable — review

> Skill-native perspective: visual hierarchy, information architecture, emotional resonance, cognitive load, craft, taste, AI-slop risk.

Five lanes pushed to their extremes produced five documents so different in grammar that the scorecard becomes a referendum on taste rather than a measurement. What follows is my taste. The judge's scorecard is a defensible reading. It is not the only one.

---

## Verdict on the winner (Team D · Brutalist-Raw-Luxe)

### Strengths from impeccable's lens

Team D is the only proposal that passes the skill's hardest test: show a stranger a screenshot, say "AI made this," and they will not believe you. The **wayfinder** — `SEKAI · REC-042 · COOK · STEP 3/7 · T+04:21 · ×2 · JC` — is a structural borrow from pit-wall telemetry and KDS tickets, and it's the only piece of UI grammar in the contest that does not exist in any other recipe app. Breadcrumb, state, timer, scale, and user packed into 32 px of mono text without a single icon. Cognitive load per pixel is exceptional.

The **ticket nameplate** `::before` knock-out (`content: attr(data-code); top: -7px; background: var(--bg);`) is a classic architectural motif that ships in ~20 lines of CSS and reads as load-bearing the moment you see it. Craft.

The **ref-code system** (`REC-042`, `ING-07`, `STP-3/7`, `TAG#PORK`, `COOK-20:41`) is the cleanest IA decision in the field. Every entity gets a name; the name is first-class UI; the name does not change state when selected. That last rule — "the code is the cell's name; names do not change when the cell is selected" — is a taste-led principle that holds the system together.

The **scaler-as-odometer** is the correct answer to the sacred scaler. Team B proposed a rotary dial with preserved-velocity inertia ("keeps spinning for a beat like a real knob"); a chef at 17:30 will curse that into a brunoise. Discrete tabular ticks — instant, mechanical, no tween — reads the user right.

The U+2212 → U+002D fix is absorbed as an aesthetic act ("intentionally plain ASCII"), not a footnote. That's how a spec handles debt.

### Failures / risks

One family, two weights, position does all hierarchy. That's the bet. The cost: **Team D has no answer for the warmth problem.** Cormorant at 72 pt is emotionally warmer than Plex Mono at 20 pt will ever be, and Plex is the ship font (Berkeley is JC's personal drop-in). The spec quietly concedes by reserving Noto Serif JP for one 世界 watermark — the only curve in the entire app. Either a discipline win or a warmth famine. I lean 60/40 famine.

The `SERVICE COMPLETE` stamp is the right emotional beat and the **only** one in the system. Team E's card-heat decay is better emotional structure because it decays — the app has memory. Team D's stamp is one gold moment per service; tomorrow morning the app is bone and ink again.

Monospace also pays a readability tax. Every column is tabular, which works for ingredients and timers; a recipe description ("Breaded cutlet, cabbage slaw, tonkatsu sauce.") reads as a price list, not a sentence. Anything longer than two lines feels like a stock ticker.

Finally, `--hot` contrast at **4.9:1 on `--ink-900`** is barely AA for large text. Bump to `oklch(66% 0.15 45)` or formally restrict to large-text sites. The rule "only one `--hot` per screen" is beautiful in theory and impossible to police without a lint check.

### Dimensional scores (impeccable:critique rubric, 0–10)

| Axis | Score | Note |
|---|---|---|
| Visual hierarchy | 9 | Wayfinder + nameplate + size+position does the job. Loses 1 for monochrome flatness on long descriptions. |
| Information architecture | 10 | Ref codes as first-class citizens is the cleanest IA in the contest. |
| Emotional resonance | 6 | Gold medal on completion, watermark on login, nothing in between. |
| Cognitive load | 9 | Dense but legible. The ticket cells teach themselves. |
| Overall craft | 9 | Nameplate knock-out, tabular nums, 4 px baseline, two deliberate radius exceptions — argued, not asserted. |

### One concrete next action

Add a **lint rule** (ESLint custom or CSS grep in pre-commit) that fails any PR with more than one `--hot` reference per route. The "one active element" principle is load-bearing and rots on contact with real features unless enforced mechanically. Wire it into `.githooks/pre-commit` alongside `scripts/test-gate.mjs`.

---

## Team-by-team opinion

### Team A — Editorial-Magazine
The designer is a **print editor who learned CSS** — they know how a book page breathes, they know `onum` from `lnum`, they set Cormorant at 22 px not 16 px because the body is the hero. The spec is the most internally consistent in the field; every decision cites its reason and the reasons agree.

- **Greatest strength:** the `FeatureSwap` primitive — 160 ms crossfade on the numeral only, with reserved ch-width on the qty column so scaling causes zero jitter. This is a craft move most designers would not even identify as a problem.
- **Greatest failure:** the reference pack (Cereal, Gentlewoman, Apartamento, Are.na) is 2019–2024. This lane's 2026-ness is borrowed, not invented.
- **AI-slop risk:** LOW. Editorial-serif product apps are rare enough that Cormorant + drop caps + margin folios do not read as ChatGPT's default aesthetic. The one risk is drop-cap-on-first-ingredient becoming precious; held to one site, it's fine.
- **Scores:** Hierarchy **9** / IA **8** / Emotional **8** / Cognitive load **8** / Craft **9**.

### Team B — Kinetic-Motion
The designer is a **motion engineer who also cooks** — they have read too much of the framer-motion docs and not enough of the kitchen-friction section of the dossier. The motion taxonomy (`lift` / `hand-off` / `service-in` / `plate` / `cut` / `detent` / `settle` / `flash` / `veil` / `banner` / `strike`) is the only document in the contest that reads like a shipping design system vocabulary rather than a design direction. That's both the strength and the trap.

- **Greatest strength:** the `cut` primitive — directional motion-blur exit (3 px, exit only) + 784 Hz advance tone + 30 ms-lead haptic pre-announcement. This is genuinely cinematic and the spec names the frame numbers.
- **Greatest failure:** the **scaler-as-rotary-dial with rotational drag + inertia.** A dial that "keeps spinning for a beat like a real knob" is precisely the kind of micro-interaction that dies in contact with wet hands.
- **AI-slop risk:** MEDIUM. Framer-motion spring demos are in every AI training set; the motion taxonomy needs to stay this disciplined or it collapses into "scale 1.02 on hover" slop.
- **Scores:** Hierarchy **7** / IA **7** / Emotional **9** / Cognitive load **6** / Craft **9**.

### Team C — Spatial-3D
The designer is a **TA-driven shader nerd with impeccable manners** — they rejected every 3D indulgence the lane would have permitted (free-orbit camera, 3D controls, loading screen, 3D type except the wordmark) and then wondered why the headline moment was a 120×120 material sample in a card corner. The discipline is the design and the discipline is also the failure.

- **Greatest strength:** the **"rule of six" materials** (clay, cedar, gold, shoji, iron, porcelain) as first-class tokens with PBR + 2D CSS fallback. Materiality as design-system citizen is a real 2026 idea.
- **Greatest failure:** mobile Safari defaults to Tier 1 CSS-only. JC is on mobile. **JC does not get the feature.** The 80 KB of three.js is paid by people who are not the primary user.
- **AI-slop risk:** MEDIUM-HIGH on implementation. Every "premium 3D SaaS landing page" since 2023 uses volumetric terracotta + curl-noise steam + extruded hero type. The spec argues against the cliché — the mockup still looks like the cliché.
- **Scores:** Hierarchy **7** / IA **7** / Emotional **8** / Cognitive load **7** / Craft **8**.

### Team D — Brutalist-Raw-Luxe (the winner)
The designer is a **Swiss typographer who has worked the line at a real restaurant** — they understand that "restaurant back-of-house service ticket, set by a Swiss typographer" is a coherent sentence and not an oxymoron. Every decision is argued against a specific user behaviour. Four radius tokens, two of them zero, two of them labelled exceptions. That kind of pedantry only comes from someone who has seen the consequences of soft defaults.

- **Greatest strength:** the wayfinder telemetry row. Un-copyable.
- **Greatest failure:** emotional range. The app is cold at 11:30 and cold at 20:30. Team E solved that for free and Team D did not borrow it.
- **AI-slop risk:** LOW. Brutalist-with-conviction is the one aesthetic the current generation of models consistently cannot ship — they hedge toward shadows, radii, and frosted nav. Team D kept the discipline.
- **Scores:** Hierarchy **9** / IA **10** / Emotional **6** / Cognitive load **9** / Craft **9**.

### Team E — Ambient-Atmospheric
The designer is a **junior art director who watched the visionOS keynote seven times** — tasteful, restrained, reverent about light, and slightly too comfortable in the Linear-adjacent visual territory. The idea that the app has weather is **the best additive idea in the contest** and it is carried by a spec that mostly ignores it in favour of re-deriving backdrop-blur rules.

- **Greatest strength:** `recipe.cooked_at` → `--card-heat` decaying linearly over 72 h. Memory without gamification. No badges, no streaks, no "cooked 14 times!" — just a light that remembers. This is the one feature I would steal immediately.
- **Greatest failure:** the mid-service skin transition (19:59 afternoon-amber → 20:00 service-ember, `--bg` animating over 2 s) is correctly gated by "pause while a timer is running" — which means the feature self-disables during the one window JC actually cooks. The headline moment is unavailable at the headline time.
- **AI-slop risk:** MEDIUM-HIGH. Aurora blobs + conic accents + glass-nav + backdrop-filter is the 2024 AI default aesthetic. The "rule of earn" discipline is the only thing saving it from being Linear-in-a-toque.
- **Scores:** Hierarchy **7** / IA **7** / Emotional **9** / Cognitive load **7** / Craft **8**.

---

## Cross-cutting observations

### Which lane would impeccable have pushed harder?

**Team E.** Ambient is minimal-by-default when the lane asked for atmospheric extremism. An ambient brief that manifests only as a `--card-heat` variable is not pushing its lane. I'd have sent it back and asked for the app to **visibly change** across the day in a way a chef notices across the kitchen: at 20:00 an oxidised copper-pan interior; at 06:00 cold fluorescent shelving. Screenshot-level unrecognisability at four-hour intervals. Team E's five skins are too close in value range.

Also **Team C**, harder on the primary-user problem. Mobile-Safari fallback is correct engineering and wrong design. The spatial lane should have found a phone-first 3D moment (the `rig-pass-line` cook-mode relight is it) and shipped it on iOS WebGL2 — perfectly fine in 2026 — or abandoned the lane honestly.

### Where did the judge get it right, and where did the judge miss?

**Right:** Team D's lane mastery score of 10/10 is correct. This was the only fully lane-pure document. The judge's one-paragraph summary ("Every other team made SEKAI more beautiful; Team D made it *itself*") is the best sentence in the scorecard.

**Right:** penalising Team C for the primary-user mismatch (mobile → fallback → "what was the 80 KB for") is the correct structural criticism.

**Right:** naming the Berkeley Mono licence issue as a "real shipping conversation" and pushing for a week-one decision. Half-shipping Berkeley on JC's phone and Plex on everyone else's would have been the worst outcome.

**Missed:** the judge gave Team D a 9 on Visual and I'd give it an 8. Monospace-only is a **hierarchy weakness**, not a hierarchy strength, when the content is prose. The winning spec's title treatment (`CRISPY PORK KATSU` in 20 px mono uppercase) is visually weaker than Team A's 72 px Cormorant title with italic dek — significantly weaker. Team D wins on every other axis; this is the one axis where the lane pays a real cost and the scorecard doesn't mark it.

**Missed:** the judge scored Team E's emotional resonance at 8 inside a 46 total. The `--card-heat` feature alone is a 9, and it is 7.7 KB of bundle. The judge's framing ("the WOW is also subtle") underweights the only genuinely novel emotional primitive in the whole contest.

**Missed:** no team was penalised for **implementation-plan honesty** as a positive. Team D's seven sacred-feature checkpoints and `data-design="brut"` kill switch is the most production-credible rollout in the contest. This should have been a +1 on stability, not noise in the report.

### If you had to borrow ONE more moment from a losing team into the winner

**Team E's `recipe.cooked_at` → `--card-heat` decay.** Not the aura glow — brutalist must not grow glows — but the **data structure** expressed as a ticket row:

```
[LAST  03H AGO] [COOKED 14×]
```

Bright bone-100 fresh, fading to bone-300 over 72 h. Add a third cell, earned only after a week of dormancy:

```
[DORMANT 12D]
```

in bone-400. The brutalist grammar absorbs memory cleanly: a labelled field decaying on a `color-mix()` ramp driven by a registered `@property`. The judge already recommended the borrow; my addition is `DORMANT` — a recipe that is not cooked is not a badge-worthy streak-broken loss, just information, stated without emotion. Extremely Team D.

---

## Signature verdict

Yes — I would ship this redesign, and I would be proud of it in a year if two conditions hold. First, `--hot` is raised to AA-normal (`oklch(66% 0.15 45)`) or formally restricted to large text and enforced by lint. Second, Team E's `recipe.cooked_at` memory ramp is absorbed into the ticket grammar as a decaying bone tint on a labelled field — because the lane's single weakness is that a kitchen which forgets everything the moment a service ends has no warmth, and warmth is what separates a tool from an artefact. With those two moves, SEKAI becomes what the brief asked for: a recipe tool a chef's friend texts about with "what is that" rather than "that's nice" — because no other recipe app looks like a service ticket set by a Swiss typographer, the ones that remember yesterday don't look like this, and the ones that look like this don't remember. Ship it behind `data-design="brut"`, cook one real dinner service on it, let the toggle itself be the review panel. The worktree already shows `[ SCALER ]`, `ING-01`, `STP-01`, the bone `COOK` button, and the wayfinder strip on the detail page — even at 30% converted the app feels more itself than any other lane would at 100%. That's the signal. The rest is discipline.

— impeccable

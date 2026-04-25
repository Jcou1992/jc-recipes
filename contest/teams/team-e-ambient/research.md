# Team E — AMBIENT-ATMOSPHERIC — Research

Ten-plus concrete 2026 references that define the ambient-light-and-mood lane, with one-paragraph theses each. No engagement-feed consumer apps, no lifestyle blog softness, no SaaS marketing glass-spam. The common thread: **colour that breathes, light that knows the hour, glass used only where depth earns comprehension.**

---

## 1. Linear — mesh gradients as a brand layer
Linear's 2024-2026 marketing and in-product surfaces treat a slow-drifting radial mesh as a quiet background asset rather than decoration. The palette is tight (ink + one cool accent + one warm accent), the blur radius is absurd (often 160-240px), and the mesh moves at 30-60s per full cycle — far below the flicker threshold. Takeaway for SEKAI: **the aurora must be slow enough to be "weather," not animation.** A chef glancing at the phone should never see motion in peripheral vision; they should only notice the room has changed tone when they look back.

## 2. Arc Browser — "Boost" colour-world per site
Arc lets the user tint an entire browser chrome per site, using the domain's dominant hue bled into frosted sidebars and window titles. The effect is that the browser "knows" what you're doing. Takeaway: SEKAI's atmosphere should do the inverse — **the app tints itself according to kitchen context** (time of day, whether a timer is ticking, whether a recipe was just cooked). Chrome is never neutral; it is always informed.

## 3. Raycast — command bar with pulse and focus light
Raycast's command palette uses a subtle directional glow from the top of the popover and a warm focus ring that breathes on the active row at ~3s cadence. The glow is SDF-blurred, not a gradient. Takeaway: **focus is a light source, not a border.** Applied to SEKAI: the "active step" in cook mode emits warm stove-light onto its neighbours rather than being marked with a ring.

## 4. Sonos (iOS app 2025 refresh)
Sonos' newest iOS app treats the now-playing surface as a volumetric colour field sampled from album art, blurred to the point of looking like dyed glass, with a soft vignette that shifts with track time. The brand rule is ruthless: the colour field is the only decoration; there is no illustration, no pattern, no iconography. Takeaway for SEKAI: **the recipe hero is a colour field sampled from the dish, not a photo.** A deglaze-heavy braise gets copper-to-ink; a crudo gets cold-steel-to-bone.

## 5. Vercel / Geist — ambient gradients as system
Geist's 2024+ components ship a Conic Gradient primitive with HDR-adjacent stops. The whole system is designed so designers compose atmosphere by layering two or three of these. Takeaway: **we must ship ambient as a token system**, not hand-painted per surface. The atmosphere tokens (`--atmosphere-morning-mist`, `--atmosphere-service-ember`, `--atmosphere-late-indigo`) compose into backdrops the same way text tokens compose into type scales.

## 6. Apple visionOS — frosted glass done with restraint
Apple's visionOS UI introduced a genuine 3D glass material: semi-transparent, with rim light, specular highlights, and honest shadows. Critically: glass is only used where a panel needs to coexist with the world behind it. Opaque panels stay opaque. Takeaway: **never frost a surface that doesn't have something worth seeing behind it.** SEKAI's recipe card backgrounds stay solid; only the sticky nav, cook-mode rails, and filter popovers earn frost.

## 7. Rauno Freiberg — time-aware micro-sites
Rauno's personal site and Vercel demos (around 2023-2025) adjusted their visual tone by clock — cooler pre-dawn, warmer at dusk, darker at night — with no toggle, no explanation. The site just felt right whenever you opened it. Takeaway: **the time-of-day skin must be invisible-by-default.** No "morning theme" label, no sunrise icon. The user notices only by opening the app at 6am versus 11pm and feeling a difference they can't articulate.

## 8. Lusion / Active Theory — volumetric light in WebGL
Studios like Lusion and Active Theory have normalized volumetric light beams and god-rays in WebGL-heavy marketing sites. We reject the GPU cost — SEKAI is a chef tool on a mid-range phone — but the visual grammar is worth borrowing: **soft cones of warm light falling from above**, used sparingly on the login page and on the cook-mode header to imply "stove heat rises from below."

## 9. Teenage Engineering OP-1 / EP-133 UI
TE's hardware UI uses tiny glowing rings around active controls — not full LCD colour, just pinpoint illumination that says "this is on." The rest of the device is silent. Takeaway: **ambient light should be stingy.** On SEKAI, only 2-3 things can glow at once (the active timer, the next step in cook mode, a recently-cooked recipe card). If everything glows, nothing does.

## 10. Rivian in-car UI / Porsche Taycan charging screen
Premium automotive UI uses deep blacks, a single warm accent, and ambient colour that responds to real-world state (charging = cool indigo-to-white sweep; warming cabin = amber bleed). The screens don't try to be friendly; they're instrumental. Takeaway: SEKAI's cook mode is a **chef's instrument panel** — the warmth of the frame should rise with stove heat (timer running = ember pulse), not with anthropomorphic encouragement.

## 11. Figma "config 2025" and Framer Sites — conic gradients at scale
Both shipped conic-gradient hero fields and a new lexicon around "light systems" (key light + rim light + ambient). Takeaway for tokens: SEKAI borrows the three-light vocabulary. **Each time-of-day skin ships a keyLight hue, a rimLight hue, and an ambientFill hue**, and components reference them by role, not by raw colour.

## 12. Daylight Computer DC-1 — tone-shifting ambient tablet
The Daylight tablet's monochrome e-ink-like screen shifts its warm-white backlight based on the clock — amber at night, cool at noon. It is the clearest shipping proof that **a device can adapt its warmth invisibly and users love it.** Takeaway for SEKAI: this is not a gimmick; it is how premium tools already behave. We are catching up, not inventing.

## 13. Perplexity / Claude.ai "thinking" states
Recent conversational-AI UIs use a slow breathing gradient to indicate "thinking." No spinner. The gradient lives in the composer bezel and pulses at ~4-6s. Takeaway: SEKAI's auto-save, macros-compute, and optimistic-write states get **a bezel pulse, not a spinner.** A timer running in cook mode uses the same grammar — the frame breathes, nothing spins.

## 14. Origin: Ólafur Arnalds "re:member" visual language + Refik Anadol data-paintings
Both artists use slow-shifting colour fields where hue is data. Anadol's work at MoMA literally paints memory as a drifting cloud. Takeaway (aesthetic, not literal): SEKAI's background can carry **memory** — a recipe you cooked yesterday leaves a faint warm residue on its card today, a recipe you've never opened stays cool. The app has weather.

## 15. Zed editor — ambient focus without chrome
Zed, launched 2024, ships a dark-first code editor with almost no decorative chrome. The only non-text surface is a barely-visible gradient on the active pane's edge — a soft rim light that fades when you're typing. Takeaway for SEKAI: **chrome disappears during focus.** In cook mode, once the user taps into a step, peripheral UI dims 15% so only the active step and its timer emit light.

---

## Anti-references (explicitly avoided)

- **Apple Music / generic iOS 17 frost spam** — every panel frosted, nothing earns it. We will not do this.
- **"AI ambient startup" homepages** (Pika, Eleven Labs landing, late-2024 SaaS) — mesh gradients used as wallpaper, not as system. We use them as system or not at all.
- **Aurora-Borealis-skybox hero sections** on every SaaS site 2023-2025 — saturated, fast, loud. Ours is slow, undersaturated, and backgrounded.
- **"Dynamic Island" style animated theatre** — fun, but performative. Ambient light is not theatre. It is weather.

## Thesis

SEKAI's ambient layer is not decoration and not performance. It is **a light-and-colour system that carries state**: the hour, the user's session, the stove. It is frugal (two or three colour fields max on-screen), slow (full cycles measured in minutes, not seconds), and honest (it never pretends to be more than it is). Every ambient choice must answer *what state is this conveying?* If the answer is "none," delete it.

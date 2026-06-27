# Team E — AMBIENT-ATMOSPHERIC — Design Spec

> **The app is a restaurant kitchen at a specific hour of the day, lit by the sky outside and the stoves inside.**
> Light is the only decoration we allow. Everything else earns its place functionally.

---

## 0. Brand-rule delta (the case for breaking rules)

Four adjustments to the existing brand rules, each argued:

1. **Dark-default stays, but loses its absoluteness.** The current system is dark-first with a manual light override. We keep dark as the *canonical* tone, but the ambient layer re-tones it through the day — late-night is near-black, noon-service is still dark but warmer and flatter. The user never picks a theme; the kitchen does.
2. **Shadow tokens become radial glows.** `--shadow-card` today is a literal 2px drop-shadow. We replace it with a *radial glow token* (`--glow-card`, `--glow-raised`) that emits light from the surface's key-light side. This is truer to kitchen physics — cards sit under overhead stove lights, not floating in a void with a hard edge.
3. **Radius softens from 6px → 10px/14px.** The current 6px radius is tight and correct in the abstract, but glass and volumetric colour both read crisper against slightly rounder edges. Buttons stay 8px; cards move to 14px; nav/hero move to 18px.
4. **Grain stays, aurora joins it.** The 2.5%-opacity paper grain is load-bearing for restaurant-grade texture. We keep it. We add a second ambient layer *behind* it at lower z-index: the aurora mesh, blurred to the point of being weather.

None of these contradict the five principles. They sharpen them.

---

## 1. Token system

### 1.1 Time-of-day skins (NEW)

The app ships five named skins, each a complete re-tone of the dark shell. A sixth "override" skin is user-chosen if they want to pin the look.

| Skin | Hour range | Kitchen state | Feel |
|---|---|---|---|
| `morning-mist` | 05:00 – 09:59 | Bone-in broth on, prep under way | Cool bone + cedar, low saturation, high lift |
| `midday-bright` | 10:00 – 14:59 | Lunch service | Warm bone + pale gold, highest lift |
| `afternoon-amber` | 15:00 – 17:59 | Between services, mise re-set | Amber + ink, mid saturation |
| `service-ember` | 18:00 – 21:59 | Dinner service | Terracotta-to-ink ember, high saturation |
| `late-indigo` | 22:00 – 04:59 | Close, clean, late-night work | Deep indigo + cedar, lowest lift |

Each skin defines the full semantic layer *and* an atmosphere layer:

```css
/* Example: service-ember, 18:00–21:59 */
:root[data-skin="service-ember"] {
  --bg:            oklch(13% 0.018 35);    /* slight terracotta bias into ink */
  --bg-card:       oklch(16% 0.020 32);
  --bg-raised:     oklch(20% 0.024 30);
  --bg-input:      oklch(18% 0.016 30);
  --border:        oklch(100% 0 0 / 0.08);
  --border-input:  oklch(100% 0 0 / 0.14);
  --text-1:        oklch(95% 0.012 85);
  --text-2:        oklch(70% 0.030 60);
  --text-3:        oklch(52% 0.026 55);
  --ring:          oklch(63.2% 0.148 45 / 0.55);

  /* Atmosphere tokens — the aurora feeds on these */
  --atmosphere-key:    oklch(62% 0.17 40);   /* terracotta ember */
  --atmosphere-rim:    oklch(78% 0.12 75);   /* low-sun gold */
  --atmosphere-fill:   oklch(22% 0.04 30);   /* warm ink */
  --atmosphere-horizon: oklch(14% 0.03 25);
}
```

Full spec for all five skins lives in `key-snippets/tokens-ambient.css`. The interpolation engine (§3) handles the hour-to-hour transition, so a skin definition is *the anchor*, not the every-minute tone.

### 1.2 Core tokens (unchanged core, glow-replaced shadows)

```css
:root {
  /* Radii — softened */
  --radius-xs: 6px;
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;
  --radius-pill: 9999px;

  /* Shadows → Glows. Radial, not directional. */
  --glow-card:
    0 0 0 1px oklch(100% 0 0 / 0.04),
    0 0 40px -8px color-mix(in oklch, var(--atmosphere-key) 35%, transparent),
    0 2px 10px oklch(0 0 0 / 0.45);
  --glow-raised:
    0 0 0 1px oklch(100% 0 0 / 0.06),
    0 0 60px -10px color-mix(in oklch, var(--atmosphere-key) 45%, transparent),
    0 4px 20px oklch(0 0 0 / 0.55);
  --glow-dialog:
    0 0 0 1px oklch(100% 0 0 / 0.08),
    0 0 120px -20px color-mix(in oklch, var(--atmosphere-rim) 50%, transparent),
    0 24px 64px oklch(0 0 0 / 0.7);
  --glow-ember:
    0 0 0 1px color-mix(in oklch, var(--color-terracotta) 40%, transparent),
    0 0 28px color-mix(in oklch, var(--color-terracotta) 55%, transparent),
    0 0 64px -8px color-mix(in oklch, var(--color-terracotta) 30%, transparent);

  /* Motion — ambient additions (slow) */
  --motion-ambient-sm:  1600ms;  /* quick atmosphere beat */
  --motion-ambient-md:  4000ms;  /* breathing */
  --motion-ambient-lg:  12000ms; /* aurora drift */
  --motion-ambient-xl:  60000ms; /* full sunrise-to-midday transit */

  --ease-breath: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-drift:  cubic-bezier(0.33, 0, 0.67, 1);
}
```

### 1.3 Type scale (unchanged)

Cormorant / Noto Serif JP / Barlow Condensed stay. Hierarchy unchanged. Legibility on glass is solved in §4.

### 1.4 Spacing (unchanged)

No ambient reason to alter spacing. It is the lighting that changes, not the pass geometry.

---

## 2. Aurora / mesh spec

### 2.1 Composition

Three layers, all pure CSS, all `position: fixed; inset: 0; pointer-events: none; z-index: -1;` (below content but above html background). Compositing: `mix-blend-mode: screen` for additive light.

**Layer 1 — horizon gradient (always on, static per-skin):**
```css
background: linear-gradient(
  to bottom,
  var(--atmosphere-horizon) 0%,
  var(--bg) 60%,
  var(--bg) 100%
);
```
Runs from top of viewport to 60% down. This is the "sky" under the content.

**Layer 2 — aurora blobs (always on, animated slow):**
Two radial gradients placed on opposite corners, blurred to 120px, each blob cycling a 60s drift of its centre coordinate by ±8%. Opacity 0.55.
```css
background:
  radial-gradient(60vw 60vw at calc(15% + var(--drift-x)) calc(20% + var(--drift-y)),
    color-mix(in oklch, var(--atmosphere-key) 55%, transparent), transparent 60%),
  radial-gradient(50vw 50vw at calc(85% - var(--drift-x)) calc(70% + var(--drift-y)),
    color-mix(in oklch, var(--atmosphere-rim) 45%, transparent), transparent 60%);
filter: blur(60px);
```
The `--drift-x` / `--drift-y` are `@property`-registered and animated with `animation: drift var(--motion-ambient-xl) var(--ease-drift) infinite alternate`.

**Layer 3 — conic accent (optional, only on login & detail cover):**
A single conic gradient that sweeps one terracotta band around a centre point, blurred to 80px, at 30% opacity. This is the "low sun through the kitchen window" moment, earned only on the two surfaces where a chef has a moment to notice.

### 2.2 Why CSS, not canvas
Canvas/WebGL is 60fps GPU cost and battery burn. The aurora moves at 1 frame per 250ms visually; CSS animations are free. A reduced-motion media query pauses drift entirely. See stability report §3.

### 2.3 The foreground rule
Aurora never appears in foreground elements. Cards, dialogs, and form fields have solid `--bg-card` / `--bg-input` backgrounds. The aurora only shows through:
- The full-page background, behind everything
- The nav bar (frosted, 60% bg, backdrop-blur)
- The cook-mode progress ring frame
- The login card's outer border glow

That's it. Five surfaces. No more.

---

## 3. Time-of-day algorithm

### 3.1 Anchor points

Each of the five skins anchors at its *midpoint hour*:

| Skin | Anchor |
|---|---|
| `morning-mist` | 07:30 |
| `midday-bright` | 12:30 |
| `afternoon-amber` | 16:30 |
| `service-ember` | 20:00 |
| `late-indigo` | 01:30 |

### 3.2 Resolution

```ts
function resolveSkin(now: Date): Skin | InterpolatedSkin {
  const h = now.getHours() + now.getMinutes() / 60;
  // Map h to nearest two anchors, compute linear blend weight
  const anchors = [[1.5, 'late-indigo'], [7.5, 'morning-mist'],
                   [12.5, 'midday-bright'], [16.5, 'afternoon-amber'],
                   [20.0, 'service-ember'], [25.5, 'late-indigo']]; // wrap
  // find left / right anchor by h
  // blend weight = (h - left.hour) / (right.hour - left.hour)
  return { from: left, to: right, t: weight };
}
```

The result is a pair of skin keys and a blend `t`. A `TimeOfDayProvider` (see key-snippets) applies both skins' `--atmosphere-*` tokens to `:root` with CSS variable blending via `color-mix(in oklch, var(--skin-from-key) calc((1 - t) * 100%), var(--skin-to-key))`. Only the atmosphere tokens interpolate — the semantic tokens snap at the midpoint between anchors to avoid perpetual micro-drift.

### 3.3 Cadence

The provider re-resolves every **5 minutes**. Faster would waste cycles; slower would feel like the skin got stuck. On visibility change (tab focus), it re-resolves immediately so returning to the app after a few hours feels fresh.

### 3.4 User override

A settings toggle lets the user *pin* a skin or request "auto." Stored in `localStorage('sekai.skin.override')`. The UI hint is deliberately understated — a line in settings, not a theme-picker carousel. If pinned, the body gets `data-skin="x"` and we skip the resolver entirely.

### 3.5 Geographic honesty

We do not use geolocation for real sunrise/sunset. That is a dependency and a privacy trade we do not need. Hour-of-day is close enough and honest to local time, which is all a kitchen cares about. (A future extension could read the user's timezone for multi-region chefs; not in v1.)

---

## 4. Glass system

### 4.1 Rule of earn
Only frost surfaces that sit in front of something visually meaningful. A card in a list does not; a sticky nav does. Specifically, glass is earned for:

1. `nav` bar (sticky, shows aurora through it)
2. Cook-mode header + footer rails (show step content through them)
3. Filter popover + bulk-action bar (sit over list)
4. Login card outer halo (sits over horizon gradient)
5. Toast container (sits over main content)

That is the complete list. Anywhere else: solid surface.

### 4.2 Specs

```css
.glass-nav {
  background: color-mix(in oklch, var(--bg) 72%, transparent);
  backdrop-filter: blur(20px) saturate(1.3);
  -webkit-backdrop-filter: blur(20px) saturate(1.3);
  border-bottom: 1px solid color-mix(in oklch, var(--atmosphere-rim) 12%, var(--border));
}

.glass-card {
  background: color-mix(in oklch, var(--bg-card) 82%, transparent);
  backdrop-filter: blur(16px) saturate(1.2);
  border: 1px solid color-mix(in oklch, var(--atmosphere-rim) 16%, var(--border));
  border-radius: var(--radius-lg);
  /* Rim light — a single-edge bright border, stronger on top-left */
  box-shadow:
    inset 1px 1px 0 color-mix(in oklch, var(--atmosphere-rim) 25%, transparent),
    var(--glow-card);
}

.glass-dialog {
  background: color-mix(in oklch, var(--bg-raised) 78%, transparent);
  backdrop-filter: blur(28px) saturate(1.4);
  border: 1px solid color-mix(in oklch, var(--atmosphere-rim) 20%, var(--border));
  border-radius: var(--radius-xl);
  box-shadow:
    inset 1px 1px 0 color-mix(in oklch, var(--atmosphere-rim) 30%, transparent),
    var(--glow-dialog);
}
```

### 4.3 Text on glass
Body text on glass must pass AA at 4.5:1. We enforce this by:
- Always applying text on glass to the `--bg-card` *solid* layer, then compositing glass behind it. (`nav` bar is the exception — its text sits directly on the 72% glass, so we keep `--text-1` bone which tests 8.5:1 against the darkest bg mix.)
- Disabling glass entirely when the OS requests Increased Contrast. `@media (prefers-contrast: more) { .glass-* { backdrop-filter: none; background: var(--bg-card); } }`

### 4.4 Safari backdrop-filter fallback
`-webkit-backdrop-filter` everywhere. On Firefox (pre-103) the fallback is a solid `color-mix(...)` background at 95% — still pleasant, no layout shift. See stability report.

---

## 5. Motion language

### 5.1 Principles

- **Breathing, not animating.** Most ambient motion is a slow sine cycle of opacity or position. Never a linear pan.
- **Durations ≥ 1600ms for ambient effects.** Anything faster becomes foreground motion and competes with the user.
- **Full reduced-motion freeze.** Aurora pauses, drift stops, all breathing stops. The skin remains correctly toned — motion is the only thing removed.

### 5.2 Ambient motion inventory

| Name | Where | Cadence | Payload |
|---|---|---|---|
| `drift` | Aurora blobs | 60s, alternate infinite | `--drift-x`, `--drift-y` ±8% |
| `breath` | Cook-mode frame | 4s, ease-breath infinite | `opacity 0.88 → 1.0 → 0.88` |
| `ember-pulse` | Active timer | 1.6s, ease-breath infinite | `--glow-ember` intensity 0.8→1.0 |
| `rim-shift` | Login border | 8s, linear infinite | `background-position` 0→200% |
| `card-aura` | Recently-cooked cards | 3s, one cycle on mount | Terracotta radial glow fade-in/out |
| `sunrise` | Skin transition | 2000ms, ease-breath | Atmosphere token blend |

### 5.3 Interaction motion (unchanged from base)

Scale-in 180ms, fade-up 220ms, ripple 340ms — all stay. These are *foreground* interactions and the ambient layer is not allowed to interfere.

---

## 6. Component rules — ambient layer per surface

### 6.1 `/login`
- Full-viewport horizon gradient (two-stop) in skin's `--atmosphere-horizon` → `--bg`.
- Aurora layer 2 visible at full opacity.
- Conic accent *on* — the one moment where we allow a volumetric god-ray feel.
- Login card: glass-dialog with rim-shift border animation (8s).
- SEKAI wordmark: stroke-reveal plays once, then remains still. No re-animation on skin change.

### 6.2 `/recipes` list
- Aurora layers 1+2 (no conic).
- Nav: glass-nav.
- Cards: **solid `--bg-card`**, no glass. The card earns its presence through a *subtle atmospheric rim* — a 1px border whose hue is `color-mix(in oklch, var(--atmosphere-rim) 18%, var(--border))`, so the whole list softly takes the skin's temperature without losing legibility.
- Recently-cooked card (within 48h): additional `--glow-ember` outer shadow at 35% intensity, plus the `card-aura` animation on mount (once, then settle to static glow).
- Tag pills: colour of `--tag-bg` / `--tag-text` cross-fades when skin changes.
- Search bar: glass-card (earns it — you're searching *through* a list).
- Filter popover: glass-dialog.

### 6.3 `/recipes/[id]` detail
- Aurora layers 1+2.
- Cover area: the existing scroll-parallax cover becomes a **conic gradient hero** tinted by the dish (manual tag → hue map; v1 ships three mappings: meat → ember, veg → mist, dessert → gold) + aurora conic accent.
- Body content: solid `--bg-card` panels, no glass. Text readability is non-negotiable here.
- Scaler / unit toggle: chips get an `--atmosphere-rim`-tinted border.
- Macros card: solid, with a rim-light stripe on top edge.
- Cook CTA: primary button, but with `--glow-ember` background glow that intensifies on hover.

### 6.4 `/recipes/[id]/cook` cook mode
- Aurora layers 1+2 still present, but dimmed 40% — the stove is the light source now.
- Header rail: glass-nav, with a warm top-edge rim when a timer is running.
- Active step: solid card with `--glow-ember`, `breath` animation.
- Timer running: the entire frame gains `ember-pulse` at 1.6s cadence. Subtle — the body dims 4%, the frame warms 6%.
- Completion moment: a single gold-sweep across the frame, then a fade back to the pre-cook skin.

### 6.5 `/settings`
- Aurora layers 1+2.
- All solid panels. Settings are not a mood surface.
- Skin override section: a row of five small swatches (not thumbnails) + an "Auto" chip. Tapping pins the skin with an immediate 2s interpolation.

---

## 7. Three killer moments

### 7.1 Sunrise-login
Open the app at 6:40am. The login card sits in a full-viewport horizon gradient — bone cedar at the top, deep ink at the bottom, a single conic accent glowing up from behind the card at the 7 o'clock angle (the sun rising behind the city). The card's border animates an 8-second rim-shift in pale gold. The SEKAI wordmark reveals calligraphically once. You type your password in a kitchen where the sun hasn't quite cleared the buildings. This beats any startup login on any platform today.

### 7.2 Cook-mode ember
Start the timer on step 4. The frame breathes, the top-edge glass warms, the aurora behind dims, and the active step emits warm terracotta light onto its neighbours (a soft radial at 28px blur). The timer digits gain tabular emphasis and the frame pulses every 1.6s — not fast enough to be urgent, slow enough to feel like a flame. When the timer hits zero, the room briefly goes gold (gold-sweep across the frame), three beeps, haptic, and the skin eases back.

### 7.3 Recently-cooked-card aura
Cook the pomodoro sauce. Tomorrow morning, open the recipe list. Its card sits in the list with a barely-perceptible warm radial glow — a memory of yesterday's ember. The glow fades gradually across 72 hours (CSS variable `--card-heat` goes 1.0 → 0.0 based on `now - cooked_at`). Recipes you haven't cooked recently stay cool. The app has weather. No badges, no streak counters, no "you've cooked this 14 times!" — just a light that remembers.

---

## 8. Non-goals (to prevent ambient-spam)

- No particle effects, no snow, no fire flecks, no floating dust.
- No per-recipe hero photos. The conic hero is abstract colour, period.
- No "morning mode" / "evening mode" toggle copy. The app doesn't announce its weather.
- No per-ingredient hover glows. That's engagement-feed vocabulary.
- No parallax on scroll for ambient layers — they are fixed. Only content parallaxes (existing scroll-parallax on cover).
- No gradient on primary buttons. Buttons stay solid colour + glow.

---

## 9. Accessibility ground rules

- `prefers-reduced-motion: reduce` → freeze all ambient motion, keep current skin, no drift.
- `prefers-contrast: more` → disable all glass (backdrop-filter: none, solid bg), boost border luminance 40%.
- Colour never carries meaning the user must decode — the ember ring is *on top of* a textual "04:32 remaining" timer. Glow is redundancy, not signal.
- All text on glass passes AA 4.5:1 measured against the solid compositing layer beneath it.

---

## 10. Token file layout

```
app/globals.css
  └── @import "./tokens-ambient.css"       (NEW — skins + atmosphere)
  └── @import "./glass.css"                (NEW — the five glass classes)
  └── @import "./aurora.css"               (NEW — keyframes, drift vars)
  └── existing content
```

Ambient tokens are strictly additive. If the ambient layer is deleted, the existing brand holds. That is the fallback design and it is intentional.

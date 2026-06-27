# Team C — SPATIAL-3D — Design Spec

**One-line thesis:** SEKAI 世界 as a restaurant pass-line rendered in WebGL — terracotta clay, gold leaf, shoji paper, cast iron and waxed cedar as first-class design tokens; every surface lit by one key light with a soft bounce, and the current step in cook mode is always the lit plate.

**Lane argument against the brand rule "every pixel earns its place":** We don't break it. We extend it. A material has a job too — it tells the chef "this is clay, it's warm, it's stable". A shader earns its place when it makes a surface *read as real* under one glance in bad lighting.

---

## 1. Token system

All tokens added in `styles/tokens-spatial.css` and imported after `globals.css`. **Zero tokens are removed**; we only *add*, so brand compliance is preserved.

### 1.1 HDR emissive (new — for the wordmark + cook-mode "hot" cues)

Browsers that support `color(display-p3 ...)` or `@media (dynamic-range: high)` render these with extended luminance; SDR fallback in the same token, auto-selected by `color()`.

```css
:root {
  /* SDR fallbacks (always present) */
  --hdr-terracotta-hot:   oklch(68% 0.19 44);   /* embers under iron */
  --hdr-gold-leaf:        oklch(92% 0.12 90);   /* SEKAI wordmark */
  --hdr-gold-spec:        oklch(98% 0.09 92);   /* gold specular tip */
  --hdr-pass-lamp:        oklch(82% 0.14 75);   /* kitchen tungsten key */
  --hdr-shoji-glow:       oklch(96% 0.02 85);   /* paper backlit */

  /* HDR-upgraded values via color-mix + p3 (progressive) */
  @supports (color: color(display-p3 1 1 1)) {
    --hdr-gold-leaf: color(display-p3 1.08 0.88 0.56);   /* >1.0 R channel = HDR */
    --hdr-pass-lamp: color(display-p3 1.15 0.82 0.52);
  }
}
```

Usage rule: HDR tokens **only** on light sources (wordmark glow, active-step lamp, kanji hot-stroke). Never on body copy or card backgrounds.

### 1.2 Surface-material tokens (new — the core SPATIAL-3D contribution)

A material token is a **bundle**: `baseColor`, `roughness`, `metalness`, `ior`, `normalScale`, `grainScale`, `anisotropy`, plus a 2D **fallback** (CSS `background` / `box-shadow`) for reduced-motion + low-GPU tiers.

```css
:root {
  /* terracotta-clay — card backgrounds, hero pedestal */
  --mat-clay-color:      oklch(52% 0.12 40);
  --mat-clay-rough:      0.82;
  --mat-clay-metal:      0.00;
  --mat-clay-ior:        1.35;
  --mat-clay-normal:     0.38;
  --mat-clay-grain:      0.6;       /* grain scale, for shader noise() uv */
  --mat-clay-2d-fallback:
      radial-gradient(120% 80% at 50% 0%,
        oklch(58% 0.13 40) 0%,
        oklch(42% 0.11 38) 60%,
        oklch(28% 0.07 34) 100%);

  /* waxed-cedar — scaler slider track, cook-mode pass surface */
  --mat-cedar-color:     oklch(48% 0.08 70);
  --mat-cedar-rough:     0.55;
  --mat-cedar-metal:     0.00;
  --mat-cedar-ior:       1.45;
  --mat-cedar-normal:    0.85;
  --mat-cedar-grain:     2.2;       /* longer grain — directional noise */
  --mat-cedar-2d-fallback:
      repeating-linear-gradient(92deg,
        oklch(48% 0.08 70) 0px,
        oklch(44% 0.07 68) 1px,
        oklch(48% 0.08 70) 3px,
        oklch(52% 0.09 72) 4px);

  /* gold-leaf — SEKAI wordmark front face, first-save underline, active tag */
  --mat-gold-color:      oklch(87% 0.14 90);
  --mat-gold-rough:      0.22;
  --mat-gold-metal:      1.00;
  --mat-gold-ior:        0.47;       /* refractive index of gold */
  --mat-gold-normal:     0.12;
  --mat-gold-anisotropy: 0.8;        /* reading-direction-aligned highlight */
  --mat-gold-2d-fallback:
      linear-gradient(105deg,
        oklch(78% 0.10 88) 0%,
        oklch(94% 0.14 92) 45%,
        oklch(78% 0.10 88) 70%,
        oklch(96% 0.12 92) 100%);

  /* shoji-paper — empty state, settings panels, filter sheet */
  --mat-shoji-color:     oklch(93% 0.02 85);
  --mat-shoji-rough:     1.0;
  --mat-shoji-metal:     0.0;
  --mat-shoji-ior:       1.5;
  --mat-shoji-transmit:  0.55;       /* subsurface transmission */
  --mat-shoji-normal:    0.1;
  --mat-shoji-2d-fallback:
      linear-gradient(0deg,
        oklch(92% 0.02 85) 0%,
        oklch(95% 0.02 85) 100%);

  /* cast-iron — btn-primary (on hover), cook-mode heat indicator */
  --mat-iron-color:      oklch(22% 0.01 240);
  --mat-iron-rough:      0.45;
  --mat-iron-metal:      0.9;
  --mat-iron-ior:        2.85;
  --mat-iron-normal:     0.25;
  --mat-iron-anisotropy: 0.35;
  --mat-iron-2d-fallback:
      radial-gradient(140% 100% at 30% 30%,
        oklch(28% 0.01 240) 0%,
        oklch(18% 0.005 240) 100%);

  /* porcelain — dialog panels, modals, scaler numeric display */
  --mat-porcelain-color: oklch(96% 0.005 85);
  --mat-porcelain-rough: 0.08;
  --mat-porcelain-metal: 0.0;
  --mat-porcelain-ior:   1.54;
  --mat-porcelain-transmit: 0.1;     /* very slight subsurface */
  --mat-porcelain-2d-fallback:
      linear-gradient(165deg,
        oklch(98% 0.005 85) 0%,
        oklch(94% 0.005 85) 100%);
}
```

**Rule of six.** These six are the entire material vocabulary. No eighth material. If a new surface seems to need one, it's probably mis-classified — choose the closest.

### 1.3 Shader uniforms (new — shared across all GLSL)

```
uTime        float   seconds since scene init (wraps at 10000s)
uResolution  vec2    canvas px
uDPR         float   device pixel ratio capped at 2.0
uMouse       vec2    0..1, lerped with 0.12 damping
uScroll      float   0..1 normalized page scroll
uThemeDark   float   1.0 dark / 0.0 light
uGpuTier     float   0.0 low / 0.5 mid / 1.0 high — uniforms gate quality
uReducedMot  float   1.0 when (prefers-reduced-motion: reduce)
```

Every fragment shader starts with these six lines. No exceptions. See `key-snippets/shader-prelude.glsl`.

### 1.4 Type — unchanged

Existing trio (Cormorant / Noto Serif JP / Barlow Condensed) is preserved. **Added:** one type token for the extruded wordmark only: `--type-hero-extrude: 0.028` (relative depth in 3D units). Applied in exactly one place (login).

### 1.5 Spacing, radii — unchanged

No new spacing tokens. Radius tokens remain `6px` for inputs/buttons and `rounded-xl/2xl` for cards; in 3D, these radii translate to `0.75%` bevel on extruded geometry.

### 1.6 Motion tokens (additive)

```css
:root {
  --motion-camera-settle: 820ms;      /* hero camera lerp on load */
  --motion-card-tilt:     260ms;      /* card parallax to cursor */
  --motion-pass-relight:  400ms;      /* cook-mode light move to new step */
  --motion-material-swap: 620ms;      /* material fallback tier upgrade */
  --ease-camera:          cubic-bezier(0.22, 1, 0.36, 1);  /* reuse out-quint */
  --ease-light:           cubic-bezier(0.5, 0, 0.1, 1);    /* snappy relight */
}
```

---

## 2. Materiality system

| Material | Where it lives | 3D tier | 2D fallback | Accessibility note |
|---|---|---|---|---|
| terracotta-clay | Login pedestal, `/recipes` hero strip, recipe cover shadow catcher | PBR mesh w/ noise-mapped normals, grain scale 0.6 | Radial gradient + subtle noise SVG | AA text contrast not affected (clay is decorative layer only) |
| waxed-cedar | Servings scaler track, cook-mode floor/pass-line | PBR mesh, anisotropic highlight along grain | Repeating-linear-gradient wood pattern | Slider still operable via HTML range input under canvas |
| gold-leaf | SEKAI 世界 wordmark front, first-save underline, active sort pill, completed step tick | Extruded letter geometry + anisotropic gold | Linear-gradient with noise flakes | Wordmark retains HTML `<h1>` with gold fallback; canvas upgrades in place |
| shoji-paper | Empty-state, onboarding sheets, filter popover backdrop | SSS-lite plane with rim backlight | Solid bone + 1px inset shadow | High contrast mode: shoji → flat `--bg-raised` |
| cast-iron | `btn-primary:hover`, cook-mode "heat-on" step indicator | PBR + roughness variation + specular anisotropy | Radial dark gradient | Button text (`--color-bone`) keeps 7.5:1 on iron |
| porcelain | Dialog / modal / confirm panels, scaler numeric bezel | Transmission material (IOR 1.54, thickness 2mm) | Soft gradient white | Scrim still blocks background interactivity |

**Rendering tiers** — chosen once at app init, cached in `sessionStorage`:

- **Tier 0 — "poster"**: CSS fallbacks only. Applied when `prefers-reduced-motion: reduce`, battery saver, or detected `<=2 GB RAM` / `hardwareConcurrency <= 4`.
- **Tier 1 — "baked"**: Static WebP renders of each material (24 KB each, 6 files = 144 KB total budget) used as `background-image`. Applied on mid-GPU phones.
- **Tier 2 — "live"**: Full WebGL scenes. Desktop + modern phones with WebGL2.
- **Tier 3 — "WebGPU"**: Feature-flagged; falls back to Tier 2 if unavailable. Uses real path-traced gold anisotropy on hero only.

Detection: small GPU-bench on mount — render one 256×256 off-screen frame, sample timing. `<8ms` → Tier 2+, `<16ms` → Tier 1, else Tier 0. See `key-snippets/gpu-tier.ts`.

---

## 3. Lighting rig

One rig, three variants. All rigs export the same three uniforms (`uKeyPos`, `uFillPos`, `uRimPos`) so any surface can be dropped in.

### 3.1 `rig-pass-line` — default (all app surfaces except login)

```
Key light:     above-front, 3200K tungsten, intensity 1.4, cone 35°, penumbra 0.6
Fill light:    below-left, 4800K bounce, intensity 0.35, cone 85°
Rim light:     back-right, 6500K cool, intensity 0.8, cone 20° (sharp edge)
Ambient:       0.08 (kills pure black without killing mood)
Exposure:      +0.2 stops on mobile (phone panels are dim in kitchen)
```

This is the *restaurant expediter pass* rig. Current step in cook mode sits at (0,0,0); older steps move to -Z into shadow; the key light never moves, the *object* moves.

### 3.2 `rig-dawn` — time-of-day variant, before 10am local

Key light warms to 2800K, rim cools to 7200K. Shoji paper tokens get +20% transmission (morning light through paper screen). Gold leaf reads cooler.

### 3.3 `rig-service` — 17:00–22:00 local

Key intensity +15%, rim intensity -20%. Mimics dinner service: hot centre, softer edges. This is the default for JC's actual use window.

**Time-of-day is already latent in the product** (JC cooks dinner) — we just make the light *notice*. Rigs swap at sunset/sunrise via `Intl.DateTimeFormat`-derived hour; no geolocation required.

---

## 4. Depth system

Five z-layers, explicit. Reminiscent of collage — each layer drifts independently on scroll/cursor.

| Layer | z-translate (3D) | z-index (DOM) | Parallax strength | Contents |
|---|---|---|---|---|
| L0 — backdrop | -8.0 | 0 | 0.04× | Volumetric fog, terracotta gradient |
| L1 — stage | -2.0 | 0 (canvas) | 0.18× | Material sample, wordmark, cover mesh |
| L2 — chrome | 0.0 | 10 | 0× | Nav, buttons, filter chips, inputs |
| L3 — content | 0.2 | 20 | 0× | Recipe cards, list grid, detail body |
| L4 — overlay | 4.0 | 50+ | 0× | Dialogs, toasts, modals, cook timer HUD |

Scroll-driven camera moves: the canvas camera dollies from `z=5 → z=3` over the first 40vh of scroll (Lenis-style lerp, 0.08 damping). After 40vh it's static — we don't do parallax through a whole page, only at the top.

Cursor-driven parallax: L0 drifts ±6px, L1 drifts ±14px, at `--motion-card-tilt` easing. Kills itself on touch devices (no `mousemove`).

---

## 5. Motion language

**Spatial uses 2D motion for everything NOT in a canvas.** This is load-bearing: our 3D is restrained *because* the 2D motion is already complete.

### 5.1 2D motion (kept from existing `globals.css`)

All existing tokens (`--motion-xs..xl`, `--ease-out-expo`, etc.) remain. Existing animations (`fade-up`, `scale-in`, `stroke-reveal`, `shimmer-wipe`, `ink-brush-draw`) are **untouched**. New 3D motion never replaces them — it sits *behind* or *beside* them.

### 5.2 New 3D motion primitives

1. **Camera settle** — on mount, camera lerps from `z=8` (far) to `z=5` (resting), 820ms, out-quint. No bounce. Feels like a DP framing the shot. **Lives only on login + detail cover.**
2. **Card tilt** — recipe card follows cursor within ±4° on X/Y, 260ms spring-less lerp (0.12 damping). Disabled on touch. **Lives only on `/recipes` list.**
3. **Pass relight** — cook-mode key light physically moves from step N to step N+1 in world space over 400ms. The light doesn't fade — it *travels*. This is the single most expensive motion in the app; it's also the most diegetic.
4. **Material swap** — when a surface upgrades from Tier 1 → Tier 2 (WebGL finished warming up), the 2D poster cross-fades to the canvas over 620ms. User should never see a flash.
5. **Steam plume** — login only; curl-noise shader, 60 particles max on desktop, 20 on mobile. Gated on scroll position (off when login dialog scrolls out of viewport — never on any other surface).

### 5.3 Reduced motion — everything above degrades to:
- Camera settle → instant
- Card tilt → removed
- Pass relight → 0ms step-brightness swap, no travel
- Material swap → no crossfade, poster only
- Steam → removed

---

## 6. Component rules — 3D variant + 2D variant side-by-side

Every 3D component ships **as a progressive enhancement on top of a working 2D HTML component**. If WebGL fails to init, the 2D variant is already rendered and does its job.

### 6.1 Recipe Card — `RecipeCardSpatial.tsx`

**2D variant (baseline, unchanged):** existing `RecipeCard` — bordered, hover lift 3px, gold border on hover, hover-media gated for non-touch.

**3D enhancement:** on hover, a small (120×120px) material sample is rendered in the top-right corner of the card. Material chosen from recipe tags:
- meat/protein → cast-iron
- dessert/sweet → porcelain
- bread/dough → clay
- vegetable/salad → cedar
- (no tag match) → clay default

Material rotates 12° on cursor parallax (X only), respects card borders, lives in a *single* canvas that pools all visible cards (see `key-snippets/CardPoolCanvas.tsx`). Per-card cost: negligible (one instanced mesh). Pool canvas cost: one draw call per tier-upgrade.

**Accessibility:** the material sample has `aria-hidden="true"` and `pointer-events: none`. It cannot receive focus; the card itself keeps its link + press affordance via the existing HTML.

### 6.2 Button — `.btn-primary` + `.btn-primary-spatial`

**2D:** unchanged.

**3D:** on `:hover:not(:active)` (desktop only), button gets a 1px inset shadow that tracks cursor position, plus `cast-iron` normal-map lighting baked as CSS `backdrop-filter: brightness() saturate()`. This is the one case we don't need canvas — CSS-only 3D via shader-approximated gradient transitions on pseudo-elements. 200 bytes CSS.

### 6.3 Dialog / modal — `.dialog-panel` + `.dialog-panel-porcelain`

**2D:** unchanged.

**3D:** the panel gains a `porcelain` edge — a 2px rim light gradient on `::before`, plus a subtle "held up" shadow suggesting the panel is floating 4mm above content. No canvas. CSS only. Scrim (backdrop) gains a 6px gaussian blur in addition to the existing dim.

### 6.4 Scaler — `ScaleSliderSpatial.tsx`

**2D variant (baseline):** HTML `input[type=range]` with current styling.

**3D enhancement:** the slider track is rendered on a tiny canvas (width=100% of container, height=44px = min touch target) as a **waxed-cedar plank** with grain aligned to direction of scrubbing. The thumb is a small terracotta-clay knob. On scrub, the knob depresses 2mm in Z and casts a contact shadow on the plank.

**Crucial:** the native `<input type="range">` sits *on top of* the canvas at `opacity: 0` — the canvas is visual only, the HTML input is the truth. Haptic feedback (existing) still fires on value change. This gate-keeps the "kitchen workflow friction" mentioned in the dossier — scaler still works with wet hands via native input, canvas is pure atmosphere.

---

## 7. Three killer moments

### 7.1 Login — "the passage"

When you hit `/login`, the first thing you see is not a form. It's a volumetric terracotta light (3-second soft bloom, HDR if supported), the SEKAI 世界 wordmark *extruded* from the light in gold leaf, and steam rising off an invisible stockpot to the bottom-right. Camera settles over 820ms. Then, and only then, the login dialog porcelain panel fades in (200ms), offset 12% below the wordmark.

Implementation budget: 48 KB gzip shader + geometry (three.js tree-shaken, drei `Text3D` for the wordmark extrude, custom steam shader). Bail-outs:
- `prefers-reduced-motion`: static bone background, 2D gold wordmark, no steam, form appears at 0ms.
- Tier 0: same as reduced-motion.
- Tier 1: baked WebP of the full scene as background, DOM form on top.

The 2D form is the *same* login form from today. All tests pass.

### 7.2 Cook-mode pass-line lighting — "the current plate"

Full-screen cook mode. A waxed-cedar plank runs across the canvas (the pass). On it sit N small porcelain plates — one per step. The *current* plate is lit by a tungsten spot from above; the previous plates fade into amber shadow (`cast-iron` colour), the next plates sit in cool dark (`rig-pass-line` rim light, at 40% intensity).

When the user advances (swipe, tap, voice), **the light moves** — not the camera, not the plates. The tungsten spot physically travels along the pass in world space over 400ms (out-quint). The sound ("dhink" — 220Hz soft click, existing audio system) fires at 60% of the travel.

This replaces the current step-slide-in animation. The current 2D slide is kept as the Tier 0 fallback (reduced-motion and mid-GPU mobile).

Why it works: every professional kitchen runs on exactly this visual hierarchy. JC will recognise it instantly. It also solves the "no parallel timers" friction indirectly — a timer attached to a previous step is visible as a small glow under that plate even when that plate is in shadow. Persistent state has a dedicated z-layer.

### 7.3 Recipe card — "the material sample"

A hovered recipe card in the list view shows a 120×120 3D sample of the card's *material* (clay for bread, iron for meat, porcelain for desserts, cedar for salads). Real light, real shadow on the card surface. Tilt ±4° to cursor.

This is the single most *branded* moment in the whole app: it says "this is a recipe tool that understands materials because its author is a chef". It's also the cheapest — one pooled canvas, one instanced mesh pool, one draw call tier-upgrade per viewport.

**Mobile swap**: on touch devices this becomes a 1-frame "flash on tap" — no hover state, so we tie it to the `active:` state (80ms pulse) and kill the continuous animation.

---

## 8. What we deliberately do NOT do

- **No free-orbit camera anywhere.** Our camera is always DP-framed.
- **No 3D UI controls.** Sliders, buttons, chips stay HTML. Materials are decoration, never interaction.
- **No loading screen.** Tier 0/1 fallback is always visible in under 100ms; Tier 2 upgrades silently after LCP.
- **No 3D for print.** Print CSS strips all canvas, all shaders, all materials. Fallbacks apply. Georgia fallback in print CSS (existing) remains.
- **No particle effects except login steam.** No sparkle, no confetti, no "celebration" 3D on first save. First-save keeps its existing gold underline animation.
- **No WebXR, no VR mode, no Apple Vision Pro branch.** Out of scope.
- **No user-uploadable shaders.** Security (see `stability-report.md`).

The discipline is the design. Spatial-3D wins by being the *least* theatrical 3D.

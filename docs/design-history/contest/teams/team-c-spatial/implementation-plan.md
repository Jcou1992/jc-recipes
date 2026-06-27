# Team C — SPATIAL-3D — Implementation Plan

Target repo: `jc-recipes/` (Next.js 15 app router, React 19, TS strict, Tailwind v4 via `globals.css` `@theme`).

All new work ships behind **tier detection** + **reduced-motion guards** + a **per-feature env flag** so any shader can be killed without redeploy.

---

## 1. Library choice — three.js r162, tree-shaken

**Choice:** `three@0.162.0` (ESM) + `three/addons` on-demand imports.
**Not chosen:** `@react-three/fiber`. We don't need the reconciler — we only have ~4 WebGL surfaces and r3f's overhead (reconciler ~28 KB) isn't justified. Raw three + a small `useThree()` hook is leaner.
**Not chosen:** `ogl`. Smaller (~18 KB) but ecosystem (drei, types, debugging) is years behind three. We pay the bundle cost for maintainability.
**Not chosen:** WebGPU. Flagged for Phase 2 — falls back to WebGL2 in Phase 1.

### Bundle math (gzipped, after tree-shaking)
| Module | Size | Notes |
|---|---|---|
| `three.core` (Renderer, Scene, Camera, BufferGeometry, etc.) | ~65 KB | Unavoidable |
| `MeshStandardMaterial` + `MeshPhysicalMaterial` | +8 KB | Needed for porcelain/gold/iron |
| `DirectionalLight` + `AmbientLight` | +2 KB | Rig |
| Custom shaders (steam, material-sample shader prelude) | ~4 KB | Hand-authored |
| `three/examples/jsm/loaders/GLTFLoader` | 0 KB | Not imported — we use procedural geometry only |
| `three/examples/jsm/postprocessing/*` | 0 KB | Not imported — no post FX |
| **Spatial bundle total** | **~79 KB** | Under the 80 KB target |

All lazy-loaded via `next/dynamic(..., { ssr: false })`. LCP paint never waits on this.

---

## 2. New dependencies

Add to `package.json`:
```json
{
  "dependencies": {
    "three": "^0.162.0"
  },
  "devDependencies": {
    "@types/three": "^0.162.0"
  }
}
```

**Why pinned minor:** three ships breaking changes in minor versions historically. We pin to a tested minor; upgrade is a deliberate PR with visual regression tests. No other deps.

---

## 3. File-by-file change list

### 3.1 New files

```
app/globals.css                                    (EDIT — see §3.2)
styles/tokens-spatial.css                          (NEW)
lib/spatial/gpu-tier.ts                            (NEW)
lib/spatial/shader-prelude.ts                      (NEW)
lib/spatial/lighting-rig.ts                        (NEW)
lib/spatial/material-library.ts                    (NEW)
lib/spatial/use-spatial-tier.ts                    (NEW hook)
lib/spatial/use-three-scene.ts                     (NEW hook — scene init + raf + cleanup)
components/spatial/SteamShader.tsx                 (NEW — login)
components/spatial/WordmarkExtruded.tsx            (NEW — login)
components/spatial/CardPoolCanvas.tsx              (NEW — list)
components/spatial/PassLineStage.tsx               (NEW — cook)
components/spatial/MaterialSample.tsx              (NEW — shared primitive)
components/spatial/SpatialBoundary.tsx             (NEW — error boundary + tier swap)
components/spatial/posters/                        (NEW dir — Tier 1 baked WebP x6)
  clay.webp          (~24 KB baked render)
  cedar.webp
  iron.webp
  porcelain.webp
  gold.webp
  steam-login.webp   (~32 KB — the Tier 1 login poster)
```

### 3.2 Modified files

| File | Change |
|---|---|
| `app/globals.css` | Add `@import "../styles/tokens-spatial.css";` at top; no other change. |
| `styles/tokens-spatial.css` | (new) HDR + material tokens (see design-spec §1). |
| `app/(auth)/login/page.tsx` | Wrap existing form in `<SpatialBoundary fallback={<CurrentLoginUI/>} />`. Dynamically import `SteamShader` + `WordmarkExtruded`. **Login form itself — unchanged.** |
| `components/recipes/RecipeCard.tsx` | Add 88×88 `.recipe-card__material-slot` DOM element, CSS `background-image: var(--mat-{material}-2d)`. Derive material from recipe tags via `materialForRecipe(recipe)` util. |
| `components/recipes/RecipeListClient.tsx` | Render `<CardPoolCanvas recipes={filtered}/>` once at the bottom, `position: fixed`, aria-hidden. Pool canvas hovers a WebGL sample over the active card's slot. |
| `components/recipes/RecipeDetailClient.tsx` | Replace `<ScrollParallaxCover/>` wrapper with `<ScrollParallaxCover spatial/>`. Scaler gets a sibling `<CedarPlankCanvas/>` at tier ≥ 2. |
| `components/recipes/CookMode.tsx` | Add `<PassLineStage steps={recipe.steps} currentStep={currentStep}/>` above the current step card. Existing step/swipe/timer/haptic logic untouched. |
| `components/motion/ScrollParallaxCover.tsx` | Add optional `spatial` prop. When true + tier ≥ 2, renders a tiny canvas with a plane-geometry cover tilted 4° to scroll position. |
| `lib/utils/material-for-recipe.ts` (new) | Pure function: `Recipe → 'clay'|'cedar'|'iron'|'porcelain'|'gold'`. Tag-match table; default = clay. |
| `next.config.ts` | Add `images` loader for posters; no build change. Add `experimental.optimizePackageImports: ['three']`. |
| `package.json` | +three, +@types/three. |

### 3.3 Tests

Existing Jest + Playwright suites (91/91 + 28/28) must stay green. Additions:

- `components/spatial/__tests__/SpatialBoundary.test.tsx` — fallback renders when `useSpatialTier()` returns 0.
- `components/spatial/__tests__/CardPoolCanvas.test.tsx` — JSDOM smoke: mounts without WebGL (mocks canvas), exports no errors.
- `lib/utils/__tests__/material-for-recipe.test.ts` — pure fn, 10 cases.
- `tests/e2e/spatial-fallback.spec.ts` — new `@regression` spec: with `prefers-reduced-motion: reduce` forced, login still renders wordmark + form; no canvas in DOM.
- No existing test changes.

Playwright config unchanged.

### 3.4 Storybook / dev workbench

Optional: `app/(dev)/spatial-sampler/page.tsx` — internal-only, dev-env gated — renders all six materials in a grid for visual QA. Not shipped.

---

## 4. Lazy-load strategy

All spatial components are client components + `ssr: false`:

```tsx
// app/(auth)/login/page.tsx
const SteamShader = dynamic(() => import('@/components/spatial/SteamShader'), {
  ssr: false,
  loading: () => null,  // CSS fallback is already painted
});
const WordmarkExtruded = dynamic(() => import('@/components/spatial/WordmarkExtruded'), {
  ssr: false,
  loading: () => null,
});
```

**Critical:** the 2D fallback is **always** in the initial HTML. The canvas fades in on top; if the chunk never loads (slow network, offline), the user sees the designed 2D poster indefinitely. Zero layout shift.

### LCP protection

The login poster (`steam-login.webp`) is `<Image priority sizes="100vw" fetchPriority="high"/>` — contributes to LCP. The canvas is injected post-paint via `requestIdleCallback` (falls back to `setTimeout(0)`). LCP is unchanged by the shader.

For the card pool on `/recipes`: canvas only mounts after the first batch of recipe cards finish their fade-up animation (`animationend` + 500 ms guard).

### Code splitting verification

Run `ANALYZE=1 next build` and verify:
- `/login` route adds ~81 KB to its JS chunk (three + shader).
- `/recipes` route adds ~83 KB (three + pool).
- `/recipes/[id]` route adds ~12 KB (shared three already loaded if user came from `/recipes`; incremental cost ~12 KB for the cedar plank shader only).
- `/recipes/[id]/cook` adds ~14 KB (pass-line stage).

Total *delta* bundle spend: **under 100 KB gzip across the app**, well inside the 200 KB budget for the entire 3D lane.

---

## 5. Tier detection + upgrade path

`lib/spatial/use-spatial-tier.ts` exports a React hook:

```ts
export function useSpatialTier(): 0 | 1 | 2 | 3 {
  // reads sessionStorage first; if absent, runs detectTier() once on mount.
  // returns stable tier for the whole session.
}
```

Logic in `gpu-tier.ts` (see `key-snippets/gpu-tier.ts`):

1. `prefers-reduced-motion: reduce`? → 0.
2. `Save-Data: on` (Network Info)? → 0.
3. `navigator.deviceMemory < 2 || hardwareConcurrency < 2` → 0.
4. No `webgl2` + no `webgl` context? → 0.
5. Renderer string matches `/SwiftShader|Microsoft Basic Render|Software/`? → 0.
6. Render one 256×256 off-screen `ShaderMaterial` frame, `gl.finish()`, time it. `>16ms` → 1, `<8ms` → 2, else 1.
7. WebGPU available + feature flag `NEXT_PUBLIC_SPATIAL_WEBGPU=1`? → 3.

Tier is **cached for the session** — we never re-detect mid-use.

### Tier-aware rendering

Every spatial component has the shape:

```tsx
export default function PassLineStage(props) {
  const tier = useSpatialTier();
  if (tier === 0) return <PassLineStageCSS {...props} />;   // CSS variant, existing step-slide animation
  if (tier === 1) return <PassLineStageBaked {...props} />; // poster + CSS shadow movement
  return <PassLineStageLive {...props} />;                  // live WebGL
}
```

All three variants are **functionally equivalent**: same step state, same swipe, same timers. Only the visual cues differ.

---

## 6. Env flags

Added to `.env.example`:

```
# ── Spatial-3D (Team C) ────────────────────────────────────────────────
# Hard-kill all WebGL layers (fall back to Tier 0 CSS).
NEXT_PUBLIC_SPATIAL_ENABLED=1

# Enable WebGPU path for Tier-3 (requires browser support).
NEXT_PUBLIC_SPATIAL_WEBGPU=0

# Force a specific tier for QA. Leave unset for auto.
NEXT_PUBLIC_SPATIAL_FORCE_TIER=
```

Flags are read at module load, not runtime — you can't flip them live, but you can ship a hotfix in ~4 minutes if a phone catches fire.

---

## 7. Migration & rollout

### Step 1 — foundation (PR #1, 1 day)
- Add `tokens-spatial.css`, `gpu-tier.ts`, `use-spatial-tier.ts`, `SpatialBoundary.tsx`.
- Add the six poster WebPs.
- Update `.env.example`.
- No visible change yet.

### Step 2 — login hero (PR #2, 1 day)
- `SteamShader` + `WordmarkExtruded` + tier-gated mounts on `/login`.
- Checkpoint commit before the change so "Supabase auth" (sacred feature #1) can be reverted cleanly.
- Visual regression screenshots: login with / without canvas.

### Step 3 — list card-pool (PR #3, 1-2 days)
- `CardPoolCanvas` + `material-for-recipe` util + RecipeCard DOM slot.
- Playwright regression on the list must stay green — verify the canvas doesn't intercept click events (pointer-events: none is mandatory).

### Step 4 — detail cedar scaler (PR #4, 1 day)
- `CedarPlankCanvas` below the scaler. Native `<input>` stays the truth. Scaling logic untouched.

### Step 5 — cook pass-line (PR #5, 2 days)
- `PassLineStage` above the step card. Wire step index → active plate index. Timers/haptics/swipe untouched.
- This is the highest-value moment and the most likely to trip the test gate. Budget a day for tuning.

### Step 6 — polish (PR #6, 1 day)
- Time-of-day rig swap based on `Intl.DateTimeFormat` hour.
- HDR tokens verified on macOS + iOS 18.
- WebGPU flag tested behind feature flag.

**Total:** ~7 engineering days. Each PR independently revertable.

---

## 8. Test gate impact

The pre-commit test gate (`.githooks/pre-commit` + `scripts/test-gate.mjs`) requires:
- Jest green (91/91).
- Playwright desktop green (23/23).
- Playwright mobile green (5/5).
- Build clean.

Expected additions:
- **Jest:** +~6 new unit tests (SpatialBoundary, CardPoolCanvas smoke, material-for-recipe, use-spatial-tier, gpu-tier, shader-prelude compile check).
- **Playwright:** +1 spec (`spatial-fallback.spec.ts`, 3 tests: reduced-motion, force-tier-0, force-tier-2-smoke). **Desktop only** — mobile WebGL2 flakes too much on Mobile Safari for stable CI.
- **Build:** no change; three is lazy + dynamic imported, not blocking.

Baseline regenerate: `npm run test:gate:bootstrap` after PR #1 lands.

---

## 9. Print + export

Print CSS in `globals.css` already strips `nav`, dialog, and `body::after` grain. Add one rule:

```css
@media print {
  canvas { display: none !important; }
  [data-spatial-canvas] { display: none !important; }
}
```

PDF export (`/recipes/print`) uses pure HTML, so nothing changes there. Tier 0 styling is effectively the print styling.

---

## 10. Rollback plan

If anything in production breaks:
1. `NEXT_PUBLIC_SPATIAL_ENABLED=0` → redeploy → all canvases gone, CSS fallbacks everywhere. ~4 min.
2. If the flag itself is broken, revert the most recent Spatial PR — each PR is a clean revert (sacred features sit untouched).
3. The three npm package stays in dependencies even if disabled; this means zero bundle delta on rollback (chunks just don't import).

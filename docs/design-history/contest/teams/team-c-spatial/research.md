# Team C — SPATIAL-3D — Research

> Lane: WebGL / WebGPU. Depth, shaders, dimensional materiality. Premium 3D as a **kitchen pass** you can touch through the glass — not demo-scene noise, not a showreel.

The references below are chosen for one of three reasons:
1. **Material discipline** — they use 3D to make surface feel real, not to flex.
2. **Editorial restraint** — they embed depth inside a tight type + layout frame, so the content still leads.
3. **Product 3D** — they treat the canvas as a tool (e.g. lighting a product, orbiting a config), not as entertainment.

## 1. Lusion — `lusion.co` + client work (`Arcana`, `Sundance`)
The reference that keeps Spatial honest. Every shot is a *still* you'd frame — shader noise is always in service of a surface (glass, cloth, marble) and the camera behaves like a cinematographer, not a drone. For SEKAI this means: terracotta-clay must look like clay under kitchen tungsten, not "stylised 3D blob". The login hero should feel the way their Magic of Play hero does — one lit object at rest, one fog, one specular flick.

## 2. Active Theory — `activetheory.net/work`
They pioneered "3D as UI layer" long before r3f. Study their `Leagues Cup`, `The Skate Room` and `Super Bowl AR` pieces for how they **mix WebGL canvas with DOM chrome** — type/labels stay crisp HTML, depth is a background layer with a vignette-edge blend. SEKAI recipe cards must do exactly this: the HTML card is authoritative (a11y, tests, print), the 3D material sample lives behind/below as a depth cue.

## 3. Resn — `resn.co.nz`
Craft studio. Their `Pinata Farms` and `Resn 20` sites show **restrained hero scenes with absurd polish**: IBL lighting, anisotropic highlights on metal, soft shadow catchers. What to steal: **gold-leaf** as a material, not a colour — anisotropy direction aligned with reading direction; subtle flakes via noise-masked normals. This is how the SEKAI 世界 wordmark stays legible and still reads as *gilded*.

## 4. Bruno Simon — `bruno-simon.com`
Cited for balance, not imitation. Bruno's site is the anti-reference for us — it's playful, discovery-driven, slow-to-load. **We take his three.js discipline and invert his tone.** His `Three.js Journey` thumbnail work shows the cheapest way to get "material quality" (MatCap + subtle fresnel). MatCap is our fallback tier on mid-GPU devices.

## 5. Default Studio — `default.studio`
Rare in the 3D space: **editorial type leads, depth serves**. Their 2024–2025 client sites (Harmonium, Formafantasma pieces) embed three.js behind broadsheet-grade type without the type ever feeling like it's "floating in a tech demo". Mirror their discipline: canvas is `position: fixed`, `z-index: 0`, content above, canvas pauses on `visibilitychange`.

## 6. Dimmy (`@dimidr`) and OGL demo reel
Dimmy's OGL pieces are the best "small canvas" benchmark on the public web — 15–30 KB shaders that do real work. OGL is our plan-B library (smaller than three by ~120 KB). Steal: his heat-haze distortion shader, his smoke/steam via curl noise, his glass refraction with chromatic aberration (subtle — 1–2 px). These are the three shader primitives SEKAI needs for steam + kitchen air + gold-glass.

## 7. `react-three/fiber` + `@react-three/drei` (Poimandres) — v9 (2026)
The production substrate for 3D in React. r3f v9 ships with concurrent-mode-aware reconciler, automatic `visibilitychange` pause, and WebGPU via `three.webgpu.js` behind a feature flag. Drei provides `Environment`, `ContactShadows`, `MeshTransmissionMaterial`, `Lightformer` — all directly applicable (transmission for porcelain, lightformer rectangles for the kitchen-pass lighting rig).

## 8. Studio Freight / Darkroom — `studiofreight.com`, `lenis` author site
Canvas-adjacent. They prove that **smooth scroll + parallax > motion for its own sake**. Lenis (their smooth-scroll lib, 3 KB) is what unlocks "camera follows scroll" on the recipe detail page without jank. We don't import the DOM product — we crib the technique: `requestAnimationFrame`-driven target/actual lerp, `wheel`/`touchmove` unified.

## 9. Pangram Pangram / Klim / Sharp Type — 3D product pages (2025)
Type foundries that ship 3D product pages specifically for **type specimens with material weight** (stone-carved, metal, backlit paper). Reference for the SEKAI 世界 wordmark: Noto Serif JP kanji extruded lightly (0.02–0.04 depth), anisotropic gold on the front face, matte terracotta on the bevel. This is **the one place** we extrude type. Everywhere else, type stays 2D HTML — a 3D UI reads as toy.

## 10. Apple Vision Pro product pages + `apple.com/airpods-max`
The reference for "product 3D without losing brand restraint". Real GLTF, real IBL, orbit constrained (no free-look), reduced-motion swaps to a high-res still. Two load tiers: blurry LQIP-style render first (~20 KB), full scene after `requestIdleCallback`. SEKAI recipe detail cover uses the same pattern — poster frame as `<img>`, canvas upgrades it in place.

## 11. `three-gpu-pathtracer` + KhronosGroup glTF sample assets
For the "gold-leaf" and "cast-iron" material samples we don't path-trace at runtime — but we **bake** a single reference PBR render per material at three exposure stops and ship them as WebP (24 KB each) behind a progressive upgrade: matcap → PBR-baked → live-shader. The Khronos sample set gives authoritative IOR / roughness / anisotropy values so our materials are physically plausible, not guessed.

## 12. Bjango / Sebastian Markbåge-era Meta design-system talks — 2024/25 "3D as a token"
The conceptual anchor. Both argued design tokens need to grow a **materiality dimension** in 2026: not just `--color-bg`, but `--surface-terracotta-clay` with (baseColor, roughness, normal-scale). Our `design-spec.md` follows this literally. Material tokens are as first-class as colour tokens.

## 13. Awwwards Site-of-the-Year winners 2024–2025 — "Digital Matter" trend
The consistent pattern across SOTY winners (Maison de Sable, Ettika, Arca Digital): one lit object, volumetric light, particulate, zero UI chrome in the hero. **We take the technique, reject the use case** — SEKAI's hero is not marketing, it's a login. So we keep the one-lit-object volumetric language but the object is the SEKAI 世界 wordmark and the particulate is *steam off a hot pan*, not brand-agnostic fog.

## 14. Muji / Kinfolk print — "product under one light"
Non-web reference. The single cleanest visual metaphor for what SEKAI's 3D should feel like: *a ceramic bowl shot in a photography studio, one key light, long soft shadow, nothing else in frame.* If the WebGL ever starts to feel like more than that, it's wrong. Kill decoration.

## 15. Chef's pass-line / kitchen expediter lighting — real restaurants
The direct source for cook-mode lighting. At a professional pass: the expediter's current plate is lit hard from above (3000K–3200K tungsten spot); the next plate sits two stops down in warm shadow; plates two steps back are almost silhouetted. This is exactly the hierarchy cook-mode needs — current step at full brightness, next step in amber shadow, previous steps fade to ink. One lighting rig renders the whole 8-step recipe in a single glance.

## Synthesis — what SEKAI keeps, what we reject

**Keep:**
- One lit object per hero (Muji / Awwwards)
- Material tokens promoted to design-system citizens (Bjango)
- HTML-first, canvas-as-background for product surfaces (Default, Active Theory)
- PBR-baked fallback tier with shader upgrade (Apple)
- Kitchen-pass lighting rig for cook mode (real restaurants)

**Reject (hard lane boundaries):**
- No free-orbit / toy cameras (Bruno Simon tone)
- No loading screen / no canvas that blocks LCP
- No 3D type except the wordmark — UI type stays HTML
- No particle systems without a material reason (steam=hot, dust=dry, water=wet — never decorative)
- No FPS counter, no "made with three.js" easter egg — this is a working tool

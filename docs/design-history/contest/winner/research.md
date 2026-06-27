# Team D — BRUTALIST-RAW-LUXE — Research

Thesis: **SEKAI 世界 is a back-of-house service ticket, typeset by a Swiss hand.** The aesthetic competitor is not a cooking app — it is the dot-matrix slip that drops at the hot line, upgraded by a type foundry. Monospace. Fixed grid. Tabular digits. Ink/Bone. Terracotta as a single warning lamp. Gold as the medal you get once, and only once.

Below: twelve references, each one concrete, each one a thing that exists in 2025–2026 and that the real JC could look at and nod.

---

### 1. Berkeley Graphics — **Berkeley Mono** (v2.0, 2025)
The mononym of premium coding monospace. Neeraj's Berkeley Mono v2 shipped with true small-caps, four optical sizes, and a ticket-stub `zero` with a slash that reads clearly at 10px on OLED. **Take:** licence Berkeley Mono as the primary type; fall back to IBM Plex Mono as the free ship-safe. Every digit on a 0.5ch grid. The entire app is typeset in one family — weight and size do hierarchy, not family.

### 2. IBM Design Language — **Plex Mono + Carbon Grid** (2016→2026 evolution)
Carbon's eight-column mobile / sixteen-column desktop grid + Plex Mono is the closest any corporate system gets to *service-ticket-as-interface*. **Take:** adopt the 16-col grid with a 4px baseline and let every component snap to row-height 24 / 32 / 48. Labels are Plex Mono UPPERCASE at 11px with 80ms fade transitions — IBM-restrained, never jumpy.

### 3. **Linear** — changelog + docs circa 2024–2026
Linear's docs were the quiet revolution: mono headings, 1px hairline borders, radius-0 tables, and inline code blocks that feel soldered into the page. Their PR title field in v2 became `lin-123-description` — a service-ticket reference. **Take:** every SEKAI entity gets a reference code (`REC-0042`, `ING-06`, `STP-3/7`) printed in the UI the same way Linear prints `LIN-123`. The code is a first-class UI element, not metadata hidden behind hover.

### 4. **Vercel Dashboard** — the 2021–2023 era (pre-current visual refresh)
That era's Vercel was all Geist Mono headers, hard 1px dividers, and ink/bone neutrals with a single brand hot-spot. Numbers were enormous and tabular; copy was squat and functional. **Take:** apply the Geist discipline but push the monospace further (Vercel keeps sans for body; we refuse). Use the *deployment log* surface as the visual target for the recipe list — every row a console line.

### 5. **Base Design / Order Design / Pentagram NY** — identity systems 2023–2026
Three studios that treat grids like a religion. Base's work for Brooklyn Museum, Order's systematic identities for the Met, Pentagram's Windows of Cinema for MoMA. **Take:** labelled components. Every box carries its code top-left in 9pt uppercase mono (`[FIG. 01 · LIST]`, `[FIG. 02 · INDEX]`). The app feels curated, not designed — which is the highest compliment in this lane.

### 6. **Grilli Type — Diatype Mono** + **Dinamo — ABC Diatype Mono**
Two Swiss-Basel foundries who made monospace a luxury display face in the 2020s. Dinamo's site itself is a reference: centred narrow column, colossal type, hard underlines, zero hover states beyond color flips. **Take:** one display cut — Diatype Mono or its spiritual cousin Berkeley Mono Bold — used only at the `world world world` wordmark moment on login and on the finished-cook celebration. Elsewhere: plain mono, all the way down.

### 7. **Frank** (frankrg.com) + **Gamma Garden** + **Newfangled** — 2024–2026 micro-agency sites
These sites share a visual grammar: `[01/07] PROJECT-NAME — 2025`, hard black on hard bone, no shadows, no gradients, no blur, occasional blood-red accent. They feel like they were typeset on a letterpress in a basement in Antwerp. **Take:** the *wayfinder row* at the top of every SEKAI screen — `SEKAI/REC-042/COOK · 03:27 · PAGE 3/7 · JC` — is the Frank-style fixture that anchors the whole aesthetic.

### 8. **Readymag — "Neue Machina" case studies**; **ArcadeMusic.pxc** (2025)
Agency directories and music labels have been quietly the bravest brutalists. Arcade Music's site treats track listings like a printer queue. **Take:** the recipe detail page is a printer queue. `INGREDIENTS [08]` header, then a 2-column hard-grid list, each ingredient labelled `ING-01 · 240 G · FLOUR (AP)`. The row itself reads like a BOM from a factory floor.

### 9. **Square POS kitchen display (KDS)** + **Toast KDS** + **Resy BOH screens**
Real back-of-house software. Monospace, ALL-CAPS, giant digits, one hot color for a ticket that is late (red/terracotta), one cool color for fired/complete (green). No shadows. No rounded corners. Legible from six feet away under heat-lamp glare. **Take:** the cook-mode screen is literally a KDS — ticket header, ticket body, ticket footer. When a step timer runs out, the ticket turns one specific terracotta shade. When the whole recipe is fired and done, the ticket goes gold for 0.8s then prints `SERVICE COMPLETE · 23:14:07`.

### 10. **Werkplaats Typografie (Arnhem)** + **Metahaven** — 2023–2026 publications
The Dutch inheritance. The best books of the last decade are their student/studio output: mono body copy, three-column dense grids, thin rules rendered with letterpress intent. **Take:** the recipe *printed* view (already half-brutalist via `@media print`) becomes the design target for the on-screen view too. Print-first. The screen is an approximation of a perfect printed ticket. This is the most radical move of the lane.

### 11. **Terminal.shop** (2024) — buy coffee via SSH
`ssh terminal.shop` and you get ASCII-art coffee tins, monospace navigation, and a checkout that is a literal tmux pane. The site `terminal.shop` mirrors it in HTML. This is the north star for irreverent-but-luxurious monospace. **Take:** one easter egg — type `/ssh` in the search bar and the list re-renders as an ASCII table with box-drawing glyphs (`│ ├ ┤ ─`). Not a feature. A signature. JC alone finds it. JC alone enjoys it.

### 12. **NASA / SpaceX flight cards** + **Formula 1 pit-wall telemetry**
The ultimate ticket design lineage. Every surface is labelled (`PRELAUNCH/T-00:47:12`, `LAP 23/58 · STINT 1`, `TYRE C3 · AGE 14L`). Numbers are huge, tabular, monospace. Status is a small coloured LED. No mention of feelings. **Take:** the cook-mode wayfinder `SEKAI · REC-042 · STEP 3/7 · T+04:21 · SERVING ×2` reads like pit-wall telemetry. This is the final boss of the aesthetic and the most unlike any cooking app on earth.

---

### Why this, and why now

Recipe apps in 2026 have converged on photo-forward lifestyle-magazine aesthetics (NYT Cooking, Paprika, Kitchen Stories) or AI-chat slop. SEKAI's audience is JC's circle — chefs, trusted invitees. They respect tools. They do not need a photo of a lemon. They need **08:00 SAUTÉ · MED-HI · 04:00 ADD GARLIC · 00:30 BEFORE FINISH**. This is the language they already read fifty times a night on the hot line.

The risk: ugly-indie. Mitigation: Swiss rigour. Every cell justified to a 4px baseline. Every label in the same code grammar. One accent color used with extreme restraint. That is the razor-thin line between *Berghain poster* (luxury) and *Geocities 2003* (not luxury). We hold the line by treating type as architecture — load-bearing, not decorative — and by labelling everything in the same ticket grammar so the whole app reads like one consistent document.

The whole app should feel like **a restaurant's back-of-house printer ticket, set by a Swiss typographer.** That sentence is the entire brief.

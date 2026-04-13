# Phase 3: Recipe Hero Photos

**Date:** 2026-04-13  
**Status:** Approved  
**Scope:** One hero photo per recipe — upload, display, replace, remove

---

## Context

Phase 1 delivered auth + CRUD. Phase 2 delivered the cooking companion (search, filter, scaler, unit conversion, cook mode). Phase 3 adds visual identity to recipes: a single hero photo shown in the card list and at the top of the detail page.

The `photos: text[]` column already exists on the `recipes` table (Phase 1 data model). This phase wires it up.

---

## What We're Building

- Optional hero photo (one per recipe) stored in Supabase Storage
- Upload from device camera roll or camera capture (standard file picker)
- Photo shown as a thumbnail on recipe cards (text-only cards unchanged)
- Photo shown as a full-width hero on the recipe detail page
- Add/replace/remove photo via the create and edit forms
- Client-side compression before upload (Canvas API, max 1200px wide, JPEG 0.85)

---

## Architecture

### Storage

- **Bucket:** `recipe-photos` (public read)
- **File path:** `{user_id}/{recipe_id}.jpg` — one file per recipe; overwrite to replace
- **Storage RLS:** authenticated users may only read/write paths prefixed with their own `user_id/`
- **Schema field used:** `photos[0]` — the public URL of the uploaded image; `photos = []` when no photo

### Data Flow (create & edit)

On form submit, the server action:

1. **New file picked** → Canvas-compress client-side → upload to `recipe-photos/{userId}/{recipeId}.jpg` → set `photos[0]` = returned public URL → save recipe
2. **Photo removed** (had URL, user clicked ×) → delete object from Storage → set `photos = []` → save recipe
3. **No change** → pass existing `photos` value through unchanged

For **create**, `recipeId` is generated (`crypto.randomUUID()`) client-side before submit so the Storage path is known before the DB row exists.

---

## Components

### New: `components/recipes/PhotoUpload.tsx` (client component)

Props:
```ts
interface PhotoUploadProps {
  existingUrl?: string;
  onChange: (state: { file: File | null; markedForDeletion: boolean }) => void;
}
```

Behaviour:
- Renders `<input type="file" accept="image/*">` (triggers camera or gallery on mobile)
- On pick: compress via Canvas API → show local preview via `URL.createObjectURL`
- Shows × remove button; if removing an existing photo, sets `markedForDeletion: true`
- No validation required — photo is always optional

### Modified: recipe create form (`app/(app)/recipes/new/page.tsx` + form component)

- Add `<PhotoUpload>` at the top of the form
- Server action receives `file: File | null` and `markedForDeletion: boolean` alongside recipe fields
- Runs Storage upload before saving recipe to DB

### Modified: recipe edit form (`app/(app)/recipes/[id]/edit/page.tsx` + form component)

- Same as create; pre-populate `<PhotoUpload existingUrl={recipe.photos[0]}>` when photo exists

### Modified: `components/recipes/RecipeCard.tsx`

- If `photos[0]` is present: render `<Image>` thumbnail above the recipe name (16:9 aspect ratio, `object-cover`)
- Cards without photos: **no change** — keep existing text-only layout

### Modified: `components/recipes/RecipeDetailClient.tsx`

- If `photos[0]` is present: full-width hero image (`max-h-[280px]`, `object-cover`, `w-full`) above the meta strip (serving scaler, times, unit toggle)
- No photo: no change to existing layout

### No changes to

- Cook mode (`/cook` route)
- Recipe list page structure
- Auth flows

---

## Client-Side Compression

Before upload, resize and compress using the Canvas API:

```
maxWidth: 1200px (maintain aspect ratio)
format: image/jpeg
quality: 0.85
```

This caps uploads at ~200–400 KB for typical food photos. Runs entirely in the browser — no server-side image processing needed.

---

## Testing

New file: `tests/e2e/photos.spec.ts`

| # | Test | Assertion |
|---|------|-----------|
| 1 | Upload on create | Create recipe with photo → hero image visible on detail page |
| 2 | Thumbnail in card list | After upload, recipe card shows image thumbnail |
| 3 | Upload on edit | Edit existing recipe, attach photo → saved and shown on detail |
| 4 | Remove photo | Edit recipe with photo, click ×, save → hero gone from detail, card text-only |

Tests use the existing `test@jc-recipes.local` user. The `recipe-photos` bucket must exist in the test Supabase project with RLS allowing authenticated access.

---

## Out of Scope (Phase 3)

- Multiple photos per recipe
- Per-step photos
- Photo shown in cook mode
- Image CDN / transformations
- Recipe sharing / public galleries

# Phase 3 - Extras

## Prerequisites
Phase 2 complete and committed. CLAUDE.md shows Phase 3 as current.

## Execution order

1. Photo upload on recipe create and edit forms
   - Upload via Supabase Storage bucket: recipe-photos
   - Multiple photos per recipe
   - Preview thumbnails in form before saving
   - Stored URLs saved to photos[] field in recipe row
   - On delete recipe: remove associated storage files
   - Max file size: 5MB per photo
   - Accepted formats: jpg, png, webp

2. Photo display on recipe detail page
   - Gallery or carousel if multiple photos
   - Tap to expand on mobile
   - Placeholder div with correct aspect ratio when no photos

3. Export as PDF
   - Button on recipe detail page
   - Clean print layout: name, description, ingredients, steps, notes
   - Ingredient amounts scale-aware (use current scaler value if set)
   - No UI chrome in PDF output
   - Generated client-side (no backend needed)

4. Export as plain text
   - Button on recipe detail page
   - Copies formatted text to clipboard
   - Format mirrors the markdown import format from Phase 1
   - Toast confirmation when copied

5. Write Playwright tests for all of the above
   - Photo upload: upload file, verify preview, save, verify URL stored
   - Photo display: verify gallery renders, verify placeholder when empty
   - PDF export: verify download triggered, verify filename
   - Text export: verify clipboard content matches expected format

6. Run full Playwright suite across all three profiles
7. Fix until 100% green
8. Overwrite CLAUDE.md with Phase 3 complete status
9. Report to user and await commit authorization

## Supabase Storage setup
Bucket name: recipe-photos
Access: private (authenticated users only)
RLS on storage:
- Users can upload to their own folder: user_id/filename
- Users can read only their own files

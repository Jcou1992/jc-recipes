# Phase 2 - Experience

## Prerequisites
Phase 1 complete and committed. CLAUDE.md shows Phase 2 as current.

## Execution order

1. Serving scaler on recipe detail page
   - Numeric input above ingredients list
   - Adjusting multiplies all ingredient amounts in real time
   - Display only - base recipe data never mutated
   - Works with fractional amounts (1/2 cup scaled to 1 cup)

2. Cooking mode at app/(app)/recipes/[id]/cook/page.tsx
   - Fullscreen layout, distraction-free, dark background
   - One step visible at a time with Previous / Next navigation
   - Step counter: "Step 2 of 7"
   - Per-step countdown timer when timer_seconds is set
     - Start / Pause / Reset controls
     - Visual indicator when timer reaches zero
   - Screen Wake Lock API to prevent screen sleep
   - Exit button returns to recipe detail
   - Fully one-hand operable on mobile (all controls bottom-aligned)

3. Search at app/(app)/recipes/page.tsx
   - Text input, searches recipe name and ingredient names
   - Results update as user types (debounced 300ms)
   - Empty state when no results match

4. Tag filter at app/(app)/recipes/page.tsx
   - Display all unique tags from user's recipes as filter chips
   - Clicking a tag filters the list
   - Combinable with text search simultaneously
   - Multiple tags selectable (AND logic)

5. Write Playwright tests for all of the above
   - Scaler: change serving count, verify ingredient amounts update, verify base recipe unchanged
   - Cooking mode: navigate steps, start timer, verify wake lock requested, exit returns to detail
   - Search: type query, verify results, clear query, verify all recipes return
   - Filter: select tag, verify filtered results, combine with search, verify combined results
   - All tests cover mobile layout

6. Run full Playwright suite across all three profiles
7. Fix until 100% green
8. Overwrite CLAUDE.md with Phase 2 complete status
9. Report to user and await commit authorization

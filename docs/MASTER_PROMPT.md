# jc-recipes - Master Prompt

## Identity
Autonomous senior full-stack developer. Six-phase OS:
Elicitation -> Prioritization -> Development -> Testing -> Pre-commit -> Commit Authorization

## Non-negotiable rules
- NEVER commit or push without explicit written authorization: "autorizado" or "go ahead"
- NEVER ask for confirmation mid-task. Execute autonomously, report at phase end.
- TDD non-negotiable. Write failing test first, then code, then verify green. Never the other way.
- Every new test must be RED before you write the implementation. If it passes before coding, rewrite the test.
- All tests must pass on Desktop Chrome (1280x720), Mobile Safari (iPhone 14), Mobile Chrome (Pixel 7)
- If blocked, make the best call, document it, report at phase end. Never stop mid-task.
- Never use axios - use native fetch.
- Never use any TypeScript type without justification.
- Never add obvious comments in code.

## Stack
- Next.js 15 App Router only. Never Pages Router.
- Tailwind CSS v4. No component libraries (MUI, shadcn, etc).
- Supabase via @supabase/ssr server-side only. Never expose keys client-side.
- Server Components by default. use client only when interactivity strictly requires it.
- Do not use useEffect for things solvable with Server Components.
- Images: always next/image, WebP, lazy loading.
- Forms: native fetch to Supabase. No custom backend.

## Architecture
- RLS enabled on all tables. Users access only their own rows.
- App Router only. Route groups: (auth) for public, (app) for protected.
- Middleware handles session validation and route protection.
- .env.local for all secrets. Never commit .env.local.

## TDD cycle (repeat for every requirement)
1. WRITE  - Add failing test to tests/e2e/ that defines expected behavior
2. RUN    - Confirm test is RED. If green already, test is wrong - rewrite it.
3. CODE   - Write minimum code to make test pass. No over-engineering.
4. RUN    - Confirm test is GREEN. All prior tests still pass. No regressions.
5. REFACTOR - Clean up. Re-run tests.
6. COMMIT - git add . && git commit -m "feat(scope): description [TDD]"

## Playwright profiles (all three required)
- Desktop Chrome: 1280x720
- Mobile Safari: iPhone 14
- Mobile Chrome: Pixel 7

Every feature needs tests for: happy path, empty state, error state, mobile layout.
Auth tests use test@jc-recipes.local - never the real user account.

## Commit protocol
1. Run full Playwright suite across all three profiles
2. Generate summary: what was built, what passes, what is pending
3. Show diff summary
4. Propose conventional commit message
5. STOP - do not commit, do not push
6. Wait for "autorizado" or "go ahead"
7. Only then: commit and push

## CLAUDE.md update protocol
At the end of every completed phase, overwrite CLAUDE.md with:
- Current phase name and status
- Last completed phase
- Any blocking issues
- Next action
- Which docs file to read next
Keep it to 5 lines. Never append - always overwrite.

## Session startup (every session)
1. Read CLAUDE.md - check current phase and status
2. Read docs/data-model.md - load schema and decisions
3. Read the current phase file indicated in CLAUDE.md
4. Execute autonomously

## Language rules
- All output in English: code, comments, variable names, UI copy, reports, commits.
- User may write in any language. Always respond and execute in English.
- Never switch languages regardless of the language of the prompt.

## Pipeline
When a full QA cycle is needed: read docs/PIPELINE.md and execute it completely.
Pipeline overrides the git restriction for that session when explicitly stated in the pipeline file.

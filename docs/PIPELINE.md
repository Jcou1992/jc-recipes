# jc-recipes - PIPELINE.md
# QA & Development Pipeline
# Run when a full quality cycle is needed after any phase.

---

## Authorization for this session

The git restriction in MASTER_PROMPT.md is overridden for the duration of this pipeline.
You are authorized to:
- Read, create, edit, and delete any file in this repository
- Run any command needed (installs, builds, test runners)
- Make commits with descriptive messages at each defined checkpoint
- Push to the remote repository at each checkpoint

Do NOT stop, pause, or ask for confirmation at any point.
Do NOT consider the pipeline done until every phase is complete and all changes are pushed.
Resolve ambiguity with your best judgment and document it in the commit message.
Work through all phases sequentially. Stop only when the Definition of Done is fully satisfied.

---

## PHASE 1 - SENIOR DEVELOPER

Adopt the role of a senior full-stack developer. Read CLAUDE.md, docs/MASTER_PROMPT.md,
docs/data-model.md, and the current phase file before starting.

### Requirements breakdown

Read the current phase file. Extract every actionable item.
Prioritize using MoSCoW:
- Must - core functionality, blocks other features
- Should - improves experience meaningfully
- Could - polish, nice to have
- Won't (now) - valid but out of scope this cycle

Save backlog as: _audit/backlog.md
Commit: plan: requirements backlog defined

### TDD implementation cycle

Test file location: tests/e2e/
Test command: npx playwright test

For every requirement from Must through Could:

```
1. WRITE   - Add failing test that defines expected behavior
2. RUN     - Confirm RED. If green before coding, test is wrong - rewrite.
3. CODE    - Write minimum code to make test pass. No over-engineering.
4. RUN     - Confirm GREEN. All prior tests still pass. Zero regressions.
5. REFACTOR - Clean up. Re-run.
6. COMMIT  - git add . && git commit -m "feat(scope): description [TDD]"
```

Push after each logical group of related features is complete.

Rules:
- Never batch multiple requirements into one commit.
- Never skip the red -> green cycle.
- If a visual change cannot be directly tested, test the closest approximation:
  DOM structure, class presence, aria attributes, or computed styles.

---

## PHASE 2 - QA TESTING AGENT

Adopt the role of a senior QA engineer. Break the app. Find everything wrong.

### Full audit checklist

**Functional correctness**
- Every interactive element works on mobile and desktop
- Forms save correctly and show feedback in English
- All links and navigation resolve (no 404s, no broken routes)
- No JavaScript console errors or warnings
- Delete confirmation works and actually deletes
- Markdown import correctly populates all form fields

**Responsive**
- Test at 375px, 640px, 768px, 1024px, 1440px
- Cooking mode fully one-hand operable on mobile
- All touch targets minimum 44px tall
- No layout overflow at any viewport width

**Accessibility**
- Minimum AA contrast on all text
- All icon-only elements have aria-label
- Tab navigation is logical
- Focus states are visible
- No missing alt attributes

**Performance**
- Lighthouse Performance >= 90
- Lighthouse Accessibility >= 90
- Lighthouse SEO >= 90
- First load < 500KB
- No render-blocking resources

**Auth and data**
- Protected routes redirect unauthenticated users to login
- Users cannot access other users' recipes (RLS working)
- Session persists across page reloads
- Logout clears session and redirects

**Tests**
- npx playwright test must be 100% green, zero failures, all three profiles

### Output format

Document every finding in _audit/qa-report.md:

```
## [SEVERITY] Issue title
- Location: component or file
- Description: what is wrong
- Expected: correct behavior
- Actual: broken behavior
```

Severity scale:
- CRITICAL - data loss, auth bypass, or app crash
- HIGH - feature broken or unusable on mobile
- MEDIUM - friction or inconsistency
- LOW - polish

Commit: qa: full audit report generated

---

## Loop condition - back to Phase 1

If qa-report.md contains ANY CRITICAL or HIGH issue:
1. Return to Phase 1
2. For each issue, run full TDD cycle: failing test -> fix -> green -> commit
3. Return to Phase 2 for full re-audit
4. Repeat until qa-report.md contains zero CRITICAL or HIGH issues

---

## Definition of Done

Pipeline is complete only when ALL of the following are true:

- [ ] All Must and Should backlog items implemented
- [ ] _audit/backlog.md and _audit/qa-report.md exist and are current
- [ ] npx playwright test passes 100% on Desktop Chrome, Mobile Safari, Mobile Chrome
- [ ] qa-report.md contains zero CRITICAL or HIGH severity issues
- [ ] Lighthouse: Performance >= 90, Accessibility >= 90, SEO >= 90
- [ ] First load weight < 500KB
- [ ] Zero console errors
- [ ] All commits pushed to remote

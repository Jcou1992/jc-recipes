# Test Gate Report

Generated: 2026-04-22T07:15:40.578Z

## Inputs
- changed: `tests/e2e/_smoke_clean.spec.ts`

## Metrics
- new test titles detected: 2
- files analyzed: 1

## Findings
- ⚠️ **[CLAUDE_LOW_VALUE]** `tests/e2e/_smoke_clean.spec.ts` — Claude judges "brand new feature coverage works @regression" low-value. Assertion is `expect(true).toBe(true)` — tautological. Seeds recipe and navigates to detail page but never asserts anything about the page. Title claims 'brand new feature coverage' but no feature is exercised. No real coverage; reject.

## Verdict: PASS
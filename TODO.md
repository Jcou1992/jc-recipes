# TODO — npm supply-chain audit follow-ups

From the audit on 2026-05-15 (branch `claude/audit-npm-security-nzX95`, commit `9615a37`).

## Anthropic API key — rotate
The previous `ANTHROPIC_API_KEY` was reachable from any same-repo PR run before
the test-gate workflow was hardened. Even though the workflow no longer
references it, the old key may have been exposed. Rotate to be safe.

- [ ] **Generate new key:** console.anthropic.com → Settings → API keys → *Create Key*. Copy it (shown once).
- [ ] **Disable the old key:** same page, find the key previously used as `ANTHROPIC_API_KEY` → *Disable* or *Delete*.
- [ ] **Remove the secret from GitHub:** repo Settings → Secrets and variables → Actions → delete `ANTHROPIC_API_KEY` (CI no longer needs it).
- [ ] **Update `.env.local`** with the new key, if you use the gate locally.
- [ ] **(Optional) Check Usage page** on Anthropic Console for unfamiliar activity on the old key while it was in CI.

## Deploy workflow — verify new flow
- [ ] First time you deploy after this branch merges: go to Actions → *deploy-cloudflare* → *Run workflow*. Push triggers were removed; deploy is manual-only now.

## When this is done
- [ ] Delete this file.

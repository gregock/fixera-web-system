# build-validation-check

## Purpose

Validate that a repo change preserves build integrity, SEO guardrails, clean URL policy, and EN/DA structural consistency.

This skill is used after any meaningful change in `src/`, `tools/`, `qa/`, routing, or documentation that affects operational truth.

---

## Scope

Validate:

- build pipeline success
- validation pipeline success
- clean URL guardrail
- SEO blocking checks
- i18n structure checks
- generated output coherence

Do NOT:

- redesign build steps
- bypass failing checks
- accept "looks fine" as validation

---

## Mandatory Pre-Check

1. Identify what changed:
   - HTML
   - JS
   - tools
   - routing
   - docs
2. Identify expected impact:
   - SEO
   - URLs
   - EN/DA parity
   - runtime behavior
3. Identify whether validation should be:
   - full repo validation
   - targeted reasoning + full build/validate

If the impact is unclear → default to full validation.

---

## Core Rule (NON-NEGOTIABLE)

> A change is not valid until the repo passes the real validation flow.

Ground truth is:

- build output
- validation scripts
- generated reports

Not visual intuition.

---

## Required Commands

Run:

```bash
npm run build
npm run validate
```

When relevant, also run:

```bash
npm test
npm run verify
npm run lint
```

Use additional commands only when the changed files justify them.

---

## Validation Blocks

### 1. Build Pipeline

Confirm `npm run build` passes.

This includes the real pipeline:

- clean output
- assets
- CSS
- JS
- HTML
- hreflang injection
- sitemap generation
- SEO audit
- i18n structure validation
- system report
- clean URL guardrail
- final validate

Flag:

- any build failure
- any skipped required step

---

### 2. Clean URL Policy

Check:

- no public `.html` URL regressions
- canonical uses clean public URL
- internal links respect clean URL policy
- hreflang / og:url / sitemap remain aligned

Flag:

- `.html` reintroduced in public-facing URLs
- mismatch between source and generated output

---

### 3. SEO Blocking Checks

Confirm:

- SEO audit passes
- no new blocking issues
- intended pages remain indexable

Flag:

- missing canonical
- broken hreflang
- broken metadata logic
- broken internal targets

---

### 4. EN / DA Structure

Confirm:

- i18n structure validation passes
- counterpart files remain aligned where applicable

Flag:

- EN/DA drift
- missing pair
- structural mismatch

---

### 5. Generated Output Coherence

Check:

- `public/` output matches expected routing model
- no stale duplicate files survive
- sitemap reflects intended output

Flag:

- stale artifacts
- wrong generated paths
- sitemap drift

---

### 6. Change-Specific Checks

Apply when relevant:

- JS change → `npm test`
- analytics/runtime change → `npm run verify`
- lint-sensitive JS/CSS changes → `npm run lint`

Do not run unrelated checks just to add noise.

---

## Output Format (MANDATORY)

### Change Scope

- files/types changed
- expected impact

### Commands Run

- exact commands

### Results

- PASS / FAIL per block

### Failures

For each failure:

- failing step
- exact issue
- likely source

### Conclusion

- valid / not valid
- next required action

---

## Guardrails

- Do NOT mark a change valid without real commands
- Do NOT treat local visual inspection as sufficient
- Do NOT ignore failing guardrails
- Do NOT suggest deploy when validation fails

---

## Objective

Catch regressions before they reach production and keep the repo:

- deployable
- SEO-safe
- structurally consistent
- auditable

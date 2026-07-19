# static-html-patch

## Purpose

Apply minimal, precise HTML changes in `src/` without breaking:

- layout system
- SEO structure
- EN/DA parity
- build/validation pipeline

This skill is used for ANY direct HTML modification.

---

## Scope

Allowed:

- content edits (text, links)
- small structural fixes
- CTA adjustments
- section-level changes

Not allowed:

- refactors
- layout redesign
- introducing new patterns
- touching unrelated sections/files

---

## Mandatory Pre-Check

Before editing:

1. Identify exact file path (e.g. `src/services/tv-mounting-copenhagen.html`)
2. Locate EN/DA counterpart
3. Identify change type:
   - content
   - structure
   - SEO
4. Check impact on:
   - canonical
   - hreflang
   - internal links

If counterpart or impact is unclear → STOP

---

## Layout Rules (STRICT)

Must preserve:

- the existing layout system of the target page
- the existing sectioning and wrapper structure unless the task explicitly requires a change

Do not:

- introduce new layout patterns unless explicitly required
- remove existing layout constructs unless the task explicitly requires it

---

## SEO Rules (NON-NEGOTIABLE)

- Do NOT modify canonical unless explicitly required
- Do NOT introduce `.html` in public URLs
- Keep internal links consistent with clean URL policy
- Do NOT duplicate titles or headings
- Do NOT change page intent

---

## EN / DA Rules

- EN is source of truth
- DA must mirror structure
- If EN is changed → evaluate DA
- Never leave mismatch unless explicitly justified

---

## Output Format (MANDATORY)

Every patch must be delivered as:

- File: exact path
- Section: where change occurs
- BEFORE: exact original code
- AFTER: exact replacement

No summaries. No partial patches.

---

## Validation (REQUIRED)

After applying:

Run:

```bash
npm run build
npm run validate
```

Must pass:

- SEO audit
- i18n validation
- clean URL guardrail

If any fail → revert

---

## Guardrails

- No changes outside requested scope
- No multi-file edits unless required
- No “cleanup” changes
- No assumptions

---

## Objective

Make the smallest possible change that:

- fixes the issue
- preserves system integrity
- avoids regressions

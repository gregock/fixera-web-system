# en-da-parity-check

## Purpose

Ensure structural parity between EN and DA HTML pages in `src/` without breaking:

- layout system
- SEO structure
- intent alignment
- build/validation pipeline

This skill prevents divergence between language versions.

---

## Scope

Evaluate:

- structural layout (sections, order, wrappers)
- presence of key blocks
- linking structure
- CTA placement

Do NOT evaluate:

- wording quality
- translations
- copy differences (unless they affect structure or intent)

Clarification:

- structural parity is checked in `src/`
- indexability-related parity (canonical/hreflang) must be validated in `public/`

---

## Mandatory Pre-Check

1. Identify EN file:
   - e.g. `src/services/tv-mounting-copenhagen.html`
2. Identify DA counterpart:
   - `src/services/tv-mounting-copenhagen.da.html`
3. Identify page role:
   - homepage / services hub / service / area / project / blog

If counterpart is missing → FLAG (critical issue)

---

## Core Rule (NON-NEGOTIABLE)

> EN is the structural source of truth

DA must mirror:

- layout
- section order
- structural elements

DA can differ ONLY in language, not structure.

---

## Audit Blocks

### 1. Section Structure

Check:

- same sections exist in both files
- same order
- no extra/missing sections

Flag:

- missing section in DA
- extra section in DA
- order mismatch

---

### 2. Layout System

Check:

- same layout patterns:
  - single-column (`max-w-5xl`)
  - no `<aside>`
  - no grid layout differences

Flag:

- layout drift
- legacy layout in one language only

---

### 3. Key Blocks Presence

Check presence of:

- hero
- main content sections
- FAQ
- CTA blocks
- cross-link sections (areas/services)

Flag:

- missing CTA in DA
- missing FAQ
- missing cross-links

---

### 4. Linking Structure

Check:

- same link targets (translated equivalents)
- same linking density

Flag:

- links present in EN but not DA
- broken symmetry in internal linking

---

### 5. SEO Structural Elements

Check:

- canonical present in both
- hreflang pairing correct

Flag:

- missing hreflang
- mismatched canonical structure

---

### 6. CTA Structure

Check:

- same CTA types (WhatsApp, form, etc.)
- same placement hierarchy (hero, mid, footer, floating)

Flag:

- CTA present only in one language
- CTA hierarchy mismatch

---

## Output Format (MANDATORY)

Return:

### Files

- EN: path
- DA: path

### Parity Status

- OK / Drift detected

### Findings

For each issue:

- block (section / CTA / layout / linking)
- issue
- impact

### Recommendation

- minimal structural fix
- specify which file to update (usually DA)

---

## Guardrails

- Do NOT rewrite copy
- Do NOT "improve" structure beyond EN baseline
- Do NOT introduce new sections
- Do NOT fix unrelated issues

---

## Objective

Ensure both language versions behave as the same page structurally,
so SEO, UX, and tracking remain consistent.

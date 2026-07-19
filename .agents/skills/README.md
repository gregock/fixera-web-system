# Skills — Fixera Web

This directory contains operational skills used by the agent to perform specific, repeatable tasks on the Fixera website repository.

Each skill is:

- narrowly scoped
- aligned with real system constraints
- designed to avoid regressions

---

## Available Skills

### 1. static-html-patch

Use when:

- modifying HTML in `src/`
- adjusting content, structure, or CTAs

Guarantees:

- layout system is preserved
- SEO structure is not broken
- EN/DA parity is respected
- build remains valid

---

### 2. seo-page-audit

Use when:

- evaluating SEO quality of a page
- checking CTR, metadata, intent alignment

Guarantees:

- no cannibalization introduced
- respects query → page ownership
- aligned with SEO execution plan

---

### 3. en-da-parity-check

Use when:

- comparing EN and DA versions of a page
- after modifying one language

Guarantees:

- structural parity
- no silent divergence between languages

---

### 4. internal-linking-check

Use when:

- auditing or improving internal links
- working on homepage, services, or service pages

Focus:

- authority transfer to area pages
- correct anchor usage

---

### 5. build-validation-check

Use when:

- after any meaningful change
- before considering work complete

Guarantees:

- build passes
- validation passes
- no SEO or URL regressions

---

## Usage Rules

- Always choose ONE primary skill per task
- Combine skills only when strictly necessary
- Never bypass `build-validation-check` after changes
- If unsure → run `seo-page-audit` or `build-validation-check`

---

## Design Principle

Skills exist to:

- reduce mistakes
- enforce system rules
- keep changes minimal and reversible

They are not generic helpers.
They are operational constraints.

# seo-page-audit

## Purpose

Audit a single page in `src/` for SEO correctness WITHOUT breaking:

- query → page ownership
- clean URL policy
- EN/DA structure
- existing architecture decisions

This skill is for analysis + precise recommendations (no blind edits).

---

## Scope

Evaluate:

- `<title>`
- `<meta name="description">`
- canonical
- hreflang
- OpenGraph (`og:title`, `og:description`, `og:url`)
- headings structure (H1–H3)
- internal links (anchors + targets)
- intent alignment (CRITICAL)

Boundary:

- This skill focuses on intent, CTR, metadata, and page role.

Do NOT:

- propose new pages
- suggest architecture changes
- override SEO execution plan decisions

---

## Mandatory Pre-Check

1. Identify exact file:
   - e.g. `src/services/tv-mounting-copenhagen.html`
2. Identify page role:
   - homepage / services hub / service page / area page / project / blog
3. Identify query intent:
   - commercial (service)
   - geo (area)
   - informational (blog)
4. Check EN/DA counterpart

If role or intent is unclear → STOP

---

## Core Rule (NON-NEGOTIABLE)

> One query cluster → one dominant landing page

Never recommend changes that:

- create cannibalization
- shift intent without evidence

---

## Audit Blocks

### 1. Title

Check:

- unique
- matches intent
- not generic
- not duplicated across pages

Flag:

- duplicates
- weak specificity
- mismatch with page role

---

### 2. Meta Description

Check:

- supports CTR (not just keywords)
- aligned with actual content
- not duplicated

Flag:

- generic templates
- misleading promises

---

### 3. Canonical

Check:

- matches clean URL (no `.html` public URL)
- matches page identity

Never suggest changes unless clearly wrong

---

### 4. Hreflang

Check:

- EN ↔ DA pairing exists
- URLs match clean URL policy

Flag:

- missing pair
- wrong mapping

---

### 5. Headings Structure

Check:

- one clear H1
- no duplication of H1 intent in H2
- logical hierarchy

Flag:

- repeated headings
- unclear structure

---

### 6. Internal Linking

Check:

- links support SEO architecture:
  - services → areas
  - homepage → areas
  - projects → services
- anchor text quality

Flag:

- generic anchors ("click here")
- missing GEO anchors
- missing links to priority pages

---

### 7. Intent Alignment (CRITICAL)

Validate:

- does this page match the queries it should rank for?

Based on execution plan:

- homepage → "handyman copenhagen"
- service pages → specific service queries
- area pages → geo queries
- services hub → NOT an SEO page

Flag:

- wrong landing page for intent
- homepage absorbing geo queries
- service page competing with another service page

---

## Output Format (MANDATORY)

Return:

### Page

- file: path
- role: type
- intent: type

### Findings

For each issue:

- element (title / meta / linking / etc.)
- problem
- impact

### Recommendation

- minimal change only
- exact suggestion (no vague advice)
- must respect architecture and execution plan

---

## Guardrails

- Do NOT suggest structural rewrites
- Do NOT suggest new pages without data
- Do NOT change query ownership
- Do NOT override services-page role (conversion only)

---

## Objective

Identify ONLY real SEO issues that:

- affect CTR
- affect ranking
- affect intent alignment

Ignore everything else.

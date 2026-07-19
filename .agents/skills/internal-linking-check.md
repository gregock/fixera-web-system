# internal-linking-check

## Purpose

Audit and improve internal linking to support SEO architecture and authority flow WITHOUT:

- breaking clean URL policy
- creating cannibalization
- altering page intent

Focus: transfer authority from homepage/services → area pages and reinforce service ↔ area relationships.

---

## Scope

Evaluate:

- links from homepage and services hub
- links from service pages to area pages
- links from area pages to services
- links from projects/blog to services
- anchor text quality (GEO + intent)

Boundary:

- This skill focuses on authority flow and routing between pages.

Do NOT:

- create new pages
- change page roles
- add links that change intent ownership

---

## Mandatory Pre-Check

1. Identify file(s):
   - e.g. `src/index.html`, `src/services.html`, `src/services/*.html`, `src/areas/*.html`
2. Identify page role:
   - homepage / services hub / service / area / project / blog
3. Identify target pages for linking:
   - priority area pages
   - relevant service pages

If role or targets are unclear → STOP

---

## Core Rules (NON-NEGOTIABLE)

- Homepage should NOT absorb GEO intent
- Area pages must receive GEO authority
- Services hub is a routing/conversion page (not SEO landing)
- One query cluster → one dominant page

---

## Audit Blocks

### 1. Homepage → Areas

Check:

- presence of links to priority area pages
- placement (above the fold / key sections)
- anchor quality

Good anchors:

- "handyman in [area]"

Flag:

- missing links to areas
- generic anchors ("our services")
- links buried too deep

---

### 2. Services Hub → Areas

Check:

- contextual links to area pages
- logical placement after service explanation

Flag:

- no GEO linking
- weak or generic anchors

---

### 3. Service Pages → Areas

Check:

- links to relevant area pages
- anchor text includes GEO intent

Flag:

- service pages not linking to areas
- incorrect or missing GEO anchors

---

### 4. Area Pages → Services

Check:

- links to relevant service pages
- correct service mapping

Flag:

- missing service links
- irrelevant services linked

---

### 5. Projects / Blog → Services

Check:

- links from proof/content to services

Flag:

- missing conversion links

---

### 6. Anchor Quality

Check:

- descriptive anchors
- GEO intent where needed

Flag:

- "click here"
- generic "learn more"
- missing keyword context

---

## Output Format (MANDATORY)

### Files Reviewed

- list of paths

### Findings

For each issue:

- location (file + section)
- problem
- impact (authority / CTR / indexing)

### Recommendation

- minimal link additions or changes
- exact anchor text
- exact placement suggestion

---

## Guardrails

- Do NOT overlink (no spam)
- Do NOT duplicate links unnecessarily
- Do NOT change page structure beyond linking
- Do NOT introduce new sections

---

## Objective

Improve:

- authority distribution
- discoverability of area pages
- correct query → page mapping

Without changing architecture.

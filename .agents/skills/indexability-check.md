# indexability-check

## Purpose

Verify the technical indexability and consistency of pages across `src/` and the built `public/` directory. This skill focuses on the "plumbing" of the SEO system, ensuring that canonicals, hreflang tags, and URL policies are correctly applied and consistent.

Boundary:

- This skill focuses on canonical, hreflang, sitemap, and built-output consistency.

---

## Checks

### 1. Canonical Correctness

- **Clean URLs**: Canonical must match the clean URL policy (extensionless for EN, `.da` for DA).
- **Mismatch**: Verify that the canonical in `public/*.html` points to the intended public URL, not the physical file path.
- **Protocol/Domain**: Ensure `https://fixera.net` is used consistently.

### 2. Hreflang Consistency

- **EN/DA Pairs**: Every page MUST have both an `en` and a `da` hreflang tag.
- **Mutual Linking**: Page A (EN) must point to Page B (DA), and Page B must point back to Page A.
- **URL Parity**: The URLs in hreflang tags must follow the clean URL policy.

### 3. Duplicate URL Variants

- **Extension Leaks**: No `.html` should appear in canonical or hreflang tags in `public/`.
- **Trailing Slash**: EN hubs (`/areas/`, `/blog/`) must have trailing slashes; leaf pages must not.
- **Parameters**: Search for stray query parameters or session IDs that might cause duplication.

### 4. Indexability Status

- **Noindex**: Identify pages with `noindex` and verify if it's intentional (e.g., `/dev/` or `/tmp/`).
- **Canonical Conflicts**: Ensure `noindex` pages do not have a self-referencing canonical that contradicts the tag.

### 5. Sitemap Alignment

- **Presence**: Every indexable page in `public/` must be present in `public/sitemap.xml`.
- **Exclusion**: Non-indexable or redirect pages must be excluded from the sitemap.

---

## Rules

- **No Blind Normalization**: Do not suggest changes to "look better" if they don't affect technical indexability.
- **Source of Truth**: The built `public/` output is the final authority for what Google sees.
- **Minimal Fix**: Always recommend the smallest change that resolves the technical defect.

---

## Output Format (MANDATORY)

For each issue found:

### Issue

- **File**: Path to the affected file (src and/or public).
- **Defect**: Description of the technical mismatch.
- **Impact**: How this affects indexing or crawl budget.

### Fix

- **Required Change**: Exact code/tag update needed.
- **Verification**: Command or check to confirm the fix works.

---

## Objective

Ensure 100% technical consistency across the Fixera SEO pipeline, preventing crawl errors and duplicate indexing.

---

## Non-Goals

- do not evaluate content quality
- do not suggest SEO improvements unrelated to indexability
- do not normalize URLs unless a real duplication issue is detected

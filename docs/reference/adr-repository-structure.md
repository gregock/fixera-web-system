# ADR: Repository Structure For SEO Delivery

Status: accepted  
Last synchronized: 2026-03-27

## Decision

The repository is structured around explicit static source pages in `src/` and deterministic generated output in `public/`.

Primary source clusters:

- homepage files
- services hub and service detail pages
- areas hub and area detail pages
- projects hub and project proof pages
- blog hub and blog posts

Generated output:

- built HTML in `public/`
- generated sitemap at `public/sitemap.xml`
- generated reports under `reports/`

## Current Rules

- `public/` is generated output, not a manual content source
- generated HTML roots are cleaned before HTML regeneration
- `public/sitemap.xml` is authoritative in production
- `src/sitemap.xml` is not authoritative
- URL and identity rules follow ADR-urls-idiomas.md

## Consequences

- repository state should be audited from current source plus current generated output
- stale generated-output assumptions from earlier March 2026 documentation are now superseded
- internal-link and content work should continue to be made surgically in source HTML without changing routing architecture unless separately approved

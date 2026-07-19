# Service Business Web System

Public-safe portfolio edition of a bilingual service-business website system.

This repository demonstrates how a static marketing site can be maintained as an operational web system: clean URLs, bilingual page parity, sitemap generation, runtime SEO validation, structured service/project content, and guarded tracking boundaries.

The source system supports a real service business. This edition removes operational snapshots, private analytics exports, active execution backlogs, lead reports, generated reports, deployment state, and private environment files.

All visual media in this public edition is placeholder media. File names and paths are preserved to demonstrate the asset pipeline and page structure without publishing real customer, property, or job photos.

## What This Demonstrates

- Static bilingual EN/DA site architecture
- Clean URL and canonical URL policy
- Sitemap generation and validation
- Hreflang injection and language parity checks
- Runtime SEO validation
- Structured services, areas, projects, and contact surfaces
- Public/private boundary discipline for a live business website

## Public Boundary

Included:

- public-facing source HTML/CSS/JS
- validation tooling that can run from repository state
- selected stable reference docs
- sanitized architecture and case-study notes
- placeholder visual media that preserves the production asset structure

Excluded:

- environment files
- Vercel project state
- generated `public/` output
- reports, audits, screenshots, and artifacts
- Search Console, GA4, lead, growth, and operations exports
- active business backlog and outreach strategy
- private operational data
- real job, property, customer, or workspace photos

See [docs/public-boundary.md](docs/public-boundary.md).

## Repository Map

- `src/` - public-facing website source
- `src/js/` - client-side behavior and tracking boundaries
- `tools/` - public-safe validation and build helpers
- `docs/` - curated public-safe documentation
- `case-study.md` - portfolio case study

## Validation

```bash
npm install
npm run build
npm run validate
```

Runtime validation can be run after serving the built output:

```bash
npm run validate:runtime
```

## Portfolio Context

This is evidence of maintaining a real web surface with validation, bilingual structure, SEO hygiene, and explicit operational boundaries.

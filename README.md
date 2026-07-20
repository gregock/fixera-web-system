# Fixera Web System

Public-safe portfolio edition of the Fixera bilingual website system: a static service-business web surface with clean URLs, EN/DA parity, sitemap and hreflang automation, SEO validation, and explicit public/private boundaries.

This repository demonstrates how a marketing website can be maintained as an operational engineering system rather than a loose collection of pages.

## Production Reference

Fixera is a real public-facing service business, and the production implementation can be reviewed at https://fixera.net.

This repository is intentionally semi-anonymized: it keeps the public brand context where useful for verification, while removing private operations, customer data, analytics exports, lead records, generated reports, deployment state, secrets, internal execution backlogs, and private third-party account configuration.

All visual media in this public edition is placeholder media. File names and paths are preserved to demonstrate the asset pipeline and page structure without publishing real customer, property, or job photos.

Contact forms, lead capture endpoints, phone numbers, and private third-party form identifiers are intentionally disabled or sanitized in this edition.

## Key Engineering Highlights

- Treats a static website as a validated build artifact.
- Preserves clean public URLs across English and Danish page variants.
- Generates and validates sitemap coverage.
- Injects and validates hreflang relationships.
- Separates public website code from private operational data.
- Keeps production-like structure while replacing sensitive media and runtime configuration.
- Provides a reproducible local verification gate before publication.

## What This Demonstrates

- Static bilingual EN/DA site architecture
- Clean URL and canonical URL policy
- Sitemap generation and validation
- Hreflang injection and language parity checks
- Runtime SEO validation
- Structured services, areas, projects, and contact surfaces
- Public/private boundary discipline for a live business website
- A verifiable production reference without exposing private operational data

## Public Boundary

Included:

- public-facing source HTML/CSS/JS
- public Fixera brand references and production-site context
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
- private lead capture endpoints and third-party form identifiers

See [docs/public-boundary.md](docs/public-boundary.md).

## Repository Map

- `src/` - public-facing website source
- `src/js/` - client-side behavior and tracking boundaries
- `tools/` - public-safe validation and build helpers
- `docs/` - curated public-safe documentation
- `case-study.md` - portfolio case study

## Validation

```bash
npm ci
npm run verify
```

Runtime validation can be run after serving the built output:

```bash
RUNTIME_SEO_BASE_URL=https://your-deployment.example npm run validate:runtime
```

## Portfolio Context

This is evidence of maintaining a real public web surface with validation, bilingual structure, SEO hygiene, and explicit operational boundaries. The live business website may be used as a reference point, but this repository remains a curated public-safe engineering edition.

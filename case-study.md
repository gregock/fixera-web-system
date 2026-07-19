# Case Study: Service Business Web System

## Problem

A service-business website becomes unreliable when content, URLs, tracking, language variants, and proof pages drift independently.

## Approach

The system treats the website as an operational surface instead of a loose set of pages. Source pages, generated output, sitemap coverage, clean URLs, hreflang, and runtime SEO checks are validated through scripts.

## Constraints

- Preserve clean public URLs.
- Keep English and Danish pages structurally aligned.
- Avoid publishing private analytics, lead, or operational exports.
- Keep SEO work tied to validation rather than manual assumptions.
- Separate public website code from private business truth.

## What Is Demonstrated

- Static site architecture for a real service business.
- Bilingual page parity.
- Sitemap and clean URL discipline.
- Runtime SEO verification.
- Public-safe tracking boundary documentation.
- Practical maintenance under live-business constraints.

## Public Edition Boundary

This edition removes private runtime state, generated reports, operational snapshots, Search Console exports, GA4 exports, lead reports, active execution backlog, and deployment secrets.

The visual media has been replaced with neutral placeholders. This preserves the shape of the asset pipeline while keeping real job and property imagery out of the public repository.

The goal is to show the engineering pattern, not expose private business operations.

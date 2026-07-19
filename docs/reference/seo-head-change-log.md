# SEO Head Changes Log

Last synchronized: 2026-03-15

## Current Meaningful Head-State Closures

- homepage EN targets now point to `/` instead of `/index.html`
- EN blog hub targets now point to `/blog/` instead of `/blog/index.html`
- EN areas hub references now point to `/areas/` instead of `/areas/index.html`
- EN area-page breadcrumb references no longer point to `https://northstar-services.example/index.html`
- stray bare hreflang tags were removed from the EN/DA furniture assembly pages, leaving only valid alternate hreflang links in output
- EN snippet updates were applied to the currently targeted pages, including:
  - `services.html`
  - `gallery.html`
  - `projects/indexprojects.html`
  - `projects/door-frame-restoration.html`
  - `projects/window-trim-installation-copenhagen.html`
  - `projects/countertop-replacement-copenhagen.html`
  - `blog/handyhand-vs-northstar.html`
  - `services/installations.html`
  - `services/woodwork.html`
  - `services/short-term-rental-maintenance-copenhagen.html`
  - `services/furniture-assembly.html`
  - `areas/handyman-gladsaxe.html`
  - `areas/handyman-hellerup.html`
  - `services/repairs.html`
  - `services/end-of-tenancy.html`
  - `services/painting.html`
- `blog/handyhand-vs-northstar.html` now has aligned head fields and `BlogPosting` structured data

## Current Head-State Notes

- the clean build passes the repo SEO audit after the latest title-length and duplication fixes
- head-state claims about external GA4 verification are intentionally excluded because they are not provable from the repo

## Historical Note

Earlier line-by-line metadata edits remain part of repository history, but the active technical SEO state should now be read from:

- [README.md](../../README.md)
- [docs/reference/seo-strategy.md](./seo-strategy.md)
- [docs/reference/QA-baseline.md](./QA-baseline.md)

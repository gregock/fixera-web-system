# ADR - URLs And Language Pairing

Status: accepted  
Last synchronized: 2026-04-07

## Current Rules (Clean URL Policy)

Public identity URLs MUST follow the clean URL policy:

- EN leaf pages: extensionless (e.g. `https://fixera.net/services/repairs`)
- DA leaf pages: use `.da` extension (e.g. `https://fixera.net/services/repairs.da`)
- EN nested hubs: use trailing-slash public URLs (e.g. `https://fixera.net/areas/`)
- DA nested hubs: use flat `.da` URLs (e.g. `https://fixera.net/areas.da`)
- projects hub public identity:
  - `https://fixera.net/projects`
  - `https://fixera.net/projects.da`
- Danish public routes use `.da`, not `/da/*`, as the public URL pattern
- `/index.da` is an intentional public identity for the Danish root
- legacy `.html` entrypoints must redirect directly to the clean URL; redirect chains are not acceptable public identity

Implementation:

- Physical build artifacts remain `.html` (and `.da.html`) in `public/`
- Production runtime routing (HTTP 301/308) ensures clean URLs are final resolution
- canonical and `og:url` must follow clean URL policy
- hreflang links must follow clean URL policy
- sitemap must follow clean URL policy
- `x-default` is prohibited
- project tags remain presentational chips and must not emit crawlable `?tag=` surfaces
- legacy `/da/*` routes may exist only as compatibility entrypoints to the `.da` public identities; they are not public identity URLs

## Consequences

- No `.html` in public-facing URLs, canonicals, or hreflang tags
- Clean public URLs are the only intended indexable identity
- compatibility routing must not be mistaken for a public URL pattern change
- Any change to URL behavior or routing must be verified at runtime (HTTP status 200 vs 301/308)

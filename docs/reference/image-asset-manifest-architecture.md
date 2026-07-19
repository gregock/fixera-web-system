# Image Asset Manifest Architecture

Status: proposed architecture milestone 1.

This document defines the manifest-driven image asset model that will coexist with the current production asset library.

It does **not** rename, move, or invalidate any existing public image URLs.

---

## Goals

- Keep current public assets stable.
- Make future image ingestion reproducible.
- Separate raw source photos from final web assets.
- Add machine-readable metadata for project, service, and gallery image sets.
- Support future automation for optimization, validation, and gallery/page generation.

---

## Folder Model

Recommended structure for new work:

- `src/images/projects/{project-slug}/source/`
- `src/images/projects/{project-slug}/derived/`
- `src/images/projects/{project-slug}/manifest.json`
- `src/images/services/{service-slug}/source/`
- `src/images/services/{service-slug}/derived/`
- `src/images/services/{service-slug}/manifest.json`
- `src/images/gallery/{collection}/source/`
- `src/images/gallery/{collection}/derived/`
- `src/images/gallery/{collection}/manifest.json`

Legacy folders remain valid and may continue to be referenced directly until they are intentionally migrated.

---

## Manifest Shape

Each manifest contains an `entries` array.

Supported entry fields:

- `slug`
- `role`
- `sequence`
- `alt`
- `caption`
- `width`
- `height`
- `orientation`
- `service_tags`
- `location`
- `date`
- `source_file`
- `derivatives`
- `published`
- `privacy_notes`

Recommended types:

- `slug`: string
- `role`: string
- `sequence`: integer
- `alt`: string
- `caption`: string
- `width`: number
- `height`: number
- `orientation`: string
- `service_tags`: array of strings
- `location`: string
- `date`: string
- `source_file`: relative file path string
- `derivatives`: array of relative file path strings
- `published`: boolean
- `privacy_notes`: string

Example:

```json
{
  "schema": "northstar-image-manifest@1",
  "scope": "projects",
  "slug": "example-project",
  "entries": [
    {
      "slug": "example-cover",
      "role": "cover",
      "sequence": 1,
      "alt": "Example cover image",
      "caption": "Placeholder example for the future ingestion pipeline.",
      "width": 1600,
      "height": 1200,
      "orientation": "landscape",
      "service_tags": ["sample"],
      "location": "copenhagen",
      "date": "2026-06-29",
      "source_file": "source/example-cover.jpg",
      "derivatives": [],
      "published": false,
      "privacy_notes": "Non-published example manifest."
    }
  ]
}
```

---

## Field Rules

- `role` should use one of:
  - `cover`
  - `before`
  - `process`
  - `detail`
  - `final`
  - `material`
  - `problem`
  - `context`
  - `team`
  - `other`
- `published: true` entries must have:
  - non-empty `alt`
  - `width`
  - `height`
  - resolvable `source_file`
- listed derivative paths should resolve to real files when they are present in the manifest.
- paths should be relative to the manifest folder.
- published manifests should describe assets that are ready to ship, not draft placeholders.

---

## Lifecycle

1. Capture raw photos outside the repository.
2. Classify the image set by project, service, or gallery collection.
3. Keep only images that support the truth of the page.
4. Write the manifest.
5. Generate AVIF/WebP derivatives.
6. Generate thumbnails where needed.
7. Validate the manifest.
8. Publish by copying the curated assets into the existing repository structure.
9. Reuse those assets on pages without changing public URLs.

---

## Coexistence With Legacy Assets

This milestone is additive.

Current production assets remain in place:

- existing `src/images/projects/...` folders continue to work
- existing `src/images/gallery/...` folders continue to work
- existing `src/images/services/...` folders continue to work
- current HTML and JSON references are not rewritten

Legacy folders can be migrated later, one set at a time, after the new manifest model is proven in use.

---

## Migration Policy

- Do not rename public files.
- Do not move existing assets.
- Do not break existing pages.
- Add manifests for new image sets first.
- Add validation before any automation depends on the manifests.
- Migrate legacy folders only when it reduces maintenance risk.
- Keep public URLs stable throughout the transition.

---

## Validation

Use:

```bash
npm run validate:images
```

The validator checks:

- valid JSON
- required manifest fields
- allowed roles
- duplicate slugs
- duplicate source references
- published image metadata completeness
- file existence for referenced sources and derivatives

---

## Milestone 2A Ingestion CLI

The first safe ingestion command is available as:

```bash
npm run images:ingest -- --from "/path/to/raw/folder" --type projects --slug project-slug
```

Defaults:

- dry-run mode unless `--write` is passed
- copy only, never move
- no derivative generation
- no publication
- no automatic `published: true`

Supported target types:

- `projects`
- `services`
- `gallery`

Dry-run example:

```bash
npm run images:ingest -- --from "/tmp/raw-photos" --type projects --slug kitchen-refresh
```

Write example:

```bash
npm run images:ingest -- --from "/tmp/raw-photos" --type projects --slug kitchen-refresh --write
```

Expected output:

- files discovered
- new files planned/copied
- duplicates skipped
- manifest entries planned/created
- target path
- dry-run or write mode

What this milestone intentionally does not do yet:

- generate AVIF or WebP derivatives
- generate thumbnails
- fill editor-reviewed metadata
- auto-publish entries
- migrate legacy assets
- rename existing public files
- move originals out of the source folder

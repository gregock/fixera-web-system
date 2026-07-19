# SEO Architecture

Last synchronized: 2026-05-22

## Website Structure

The Northstar Services site is a static bilingual SEO cluster with these page groups:

- homepage
- services hub
- service detail pages
- areas hub
- area detail pages
- projects hub
- project proof pages
- blog hub
- blog posts

Current role split:

- services = commercial intent layer
- projects = discovery / proof layer
- blog = legacy informational layer under gradual retirement

## Internal-Link Model

- service -> area
- service -> project
- area -> service
- project -> service
- blog -> service where relevant during retirement, with projects preferred for discovery/proof intent

Homepage structure was recently normalized and now reinforces this model through explicit section roles:

- hero -> primary conversion entry
- homepage services -> services hub and selected commercial detail pages
- homepage areas -> areas hub + selected nearby area pages
- homepage reviews -> trust reinforcement before deeper service exploration

Current strengthening already implemented:

- direct contextual links from the homepage and services hub to:
  - `areas/handyman-gladsaxe.html`
  - `areas/handyman-hellerup.html`
- contextual support for the remaining legacy blog support pages:
  - `blog/handyhand-vs-northstar.html`
  - `blog/how-much-does-a-handyman-cost-in-copenhagen.html`
- preferred discovery / proof surfaces:
  - `projects/ikea-furniture-assembly-copenhagen.html`
  - `projects/door-frame-restoration.html`
  - `projects/curtain-rails-hemming-norrebro-nordvest.html`
- runtime retirement for the weakest legacy blog article now redirects to services:
  - `/blog/fix-common-home-issues` → `/services`
  - `/blog/fix-common-home-issues.da` → `/services.da`

## URL And Identity Rules

Follows URL policy (see ADR-urls-idiomas.md)

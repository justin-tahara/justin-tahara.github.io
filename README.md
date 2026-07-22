# justin-tahara.github.io

[![site-ci](https://github.com/justin-tahara/justin-tahara.github.io/actions/workflows/site-ci.yml/badge.svg)](https://github.com/justin-tahara/justin-tahara.github.io/actions/workflows/site-ci.yml)
[![terraform-plan](https://github.com/justin-tahara/justin-tahara.github.io/actions/workflows/terraform-plan.yml/badge.svg)](https://github.com/justin-tahara/justin-tahara.github.io/actions/workflows/terraform-plan.yml)

Personal website / portfolio for Justin Tahara, served via GitHub Pages at
**[justintahara.com](https://justintahara.com)** (custom domain in `CNAME`, fronted
by Cloudflare's edge and managed by Terraform in `infra/cloudflare/`).

Static, hand-written HTML/CSS/JS — no build step.

## Structure

```
.
├── index.html              # landing page (site root — must stay here)
├── CNAME                   # custom domain (must stay at root)
├── assets/
│   ├── css/styles.css      # shared styles
│   ├── js/script.js        # shared scripts
│   └── images/             # logos/, detail/, profile + standing photos
├── experience/             # per-role detail pages (amazon, applied-intuition, …)
├── papers/                 # academic / course PDFs
├── resume/                 # resume PDF
├── infra/cloudflare/       # Terraform: DNS, edge TLS/cache, headers, redirects
└── .github/workflows/      # CI/CD (see below)
```

## Local preview

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

Paths are root-relative the same way GitHub Pages serves them, so previewing from
the repo root matches production.

## Infrastructure & CI/CD

The site is plain GitHub Pages, hardened and automated around the edges:

- **DNS + edge as code** — `infra/cloudflare/` is Terraform (remote state in a
  private R2 bucket). It manages DNS, zone TLS settings, static-asset caching,
  security headers + a tailored Content-Security-Policy, and 301 redirects for
  the old (pre-restructure) URLs. See `infra/cloudflare/README.md`.
- **`terraform-plan`** comments a plan on every PR touching the module;
  **`terraform-apply`** applies on merge to `main`, gated by the `production`
  GitHub Environment (manual approval) so edge changes never ship unattended.
- **`site-ci`** gates every content PR: broken-link check (lychee), HTML
  validation, and a Lighthouse report (perf/a11y/SEO/best-practices).
- **Deploy** is GitHub Pages' built-in pipeline — merging to `main` publishes
  automatically within ~a minute. No deploy workflow needed.

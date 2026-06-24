# justin-tahara.github.io

Personal website / portfolio for Justin Tahara, served via GitHub Pages at
**[justintahara.com](https://justintahara.com)** (custom domain in `CNAME`, DNS
managed by Terraform in `infra/cloudflare/`).

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
├── infra/cloudflare/       # Terraform for justintahara.com DNS
└── .github/workflows/      # CI (terraform plan on PRs)
```

## Local preview

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

Paths are root-relative the same way GitHub Pages serves them, so previewing from
the repo root matches production.

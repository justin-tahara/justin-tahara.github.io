# Decision log

Why this site's infrastructure looks the way it does. Newest last. Each entry
is the short version — the load-bearing detail lives as comments next to the
code it constrains.

## 1. GitHub Pages origin + Cloudflare edge (not a platform migration)

The origin is plain GitHub Pages: free, zero-maintenance, deploys on merge with
no pipeline to own. Everything that needs real infrastructure control — TLS
posture, headers, caching, redirects, extra hostnames — lives at the Cloudflare
edge in front of it, where it can be code. Migrating to Cloudflare Pages/Workers
would buy PR preview deploys but replace a working, boring origin with a
platform to operate. Not worth it at this scale.

## 2. Everything at the edge is Terraform

Dashboard click-ops don't survive: they're invisible in review, unrecoverable in
disaster, and illegible to anyone assessing the setup. `infra/cloudflare/` is
the single source of truth; the zone's records are proxied specifically so the
edge rules (cache, headers, redirects) can take effect. A weekly drift check
keeps the dashboard honest.

## 3. Remote state in R2, native lockfile, no DynamoDB

This is a public repo, so state (which enumerates the whole zone) lives in a
private R2 bucket via the S3-compatible backend. Locking uses Terraform's
native S3 lockfile (`use_lockfile`) — R2 supports the conditional write it
needs, and the classic DynamoDB lock table doesn't exist outside AWS. One
cloud fewer.

## 4. TLS "full", deliberately not "full (strict)"

GitHub Pages renews its origin certificate through an HTTP-01 challenge that a
fronting proxy can disrupt. "Full" keeps the site serving regardless of the
origin cert's renewal state; the visitor-facing edge cert is Cloudflare
Universal SSL either way. Strict would add integrity on the CF→GitHub hop at
the cost of a plausible self-inflicted outage — wrong trade for a static site.

## 5. Applies are gated; verification is automated

`terraform plan` is commented on every PR, but `apply` runs only on merge to
`main` and pauses on the `production` GitHub Environment for manual approval —
edge changes alter live serving and never ship unattended. After each apply,
`edge-verify` curls production and asserts the declared behavior (redirects,
headers, TLS floor, cache). An apply that succeeded but didn't change reality
is a failure mode worth testing for.

## 6. Photos live in R2, not git

Film scans are large, mutable-feeling binaries; a git repo that deploys via
Pages is the wrong home for them. Originals plus pre-generated responsive
variants live in an R2 bucket served at `images.justintahara.com`, uploaded
immutable-by-convention (new edit = new object key) so month-long edge TTLs are
safe. `manifest.json` is the one mutable object and the frontend's only
contract.

## 7. Pre-generated variants, not runtime image resizing

`sync-photos.sh` renders 2560/1600/800-wide JPEGs at upload time with `sips`.
Runtime transforms (auto-WebP/AVIF) are nicer but add a paid dependency and a
runtime behavior to reason about; for a portfolio's traffic, build-time
variants are indistinguishable in practice. Revisit if traffic ever argues
otherwise.

## 8. Observability sized to the site

Cloudflare Web Analytics (cookie-less RUM, edge-injected beacon), a daily
credential-free uptime/behavior check, weekly drift + link-rot sweeps — each
alerting through a single self-closing GitHub issue rather than a pager. No
metrics stack, no dashboards to feed. The absence of unnecessary machinery is
a decision, not an omission.

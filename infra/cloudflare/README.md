# Cloudflare infra (Terraform)

Infrastructure-as-code for `justintahara.com`, after migrating the domain from
Namecheap to Cloudflare. The site is GitHub Pages fronted by Cloudflare's edge
(records are **proxied** / orange cloud).

## What's managed

| File            | Resources                                                                 |
| --------------- | ------------------------------------------------------------------------- |
| `main.tf`       | DNS — 4 apex `A` records + `www` CNAME to GitHub Pages (proxied)           |
| `edge.tf`       | Zone TLS settings (SSL "full", HTTPS-only, min TLS 1.2) + static caching   |
| `security.tf`   | Security response headers + a tailored Content-Security-Policy + HSTS      |
| `redirects.tf`  | 301s for the old root URLs (`/Amazon.html` → `/experience/…`) + www → apex |
| `photos.tf`     | R2 photos bucket + `images.justintahara.com` custom domain + CORS          |
| `observability.tf` | Cloudflare Web Analytics (privacy-first RUM, edge-injected beacon)      |

TLS is intentionally **full**, not full-strict: GitHub Pages renews its origin
cert via an HTTP-01 challenge that a proxy can disrupt, and "full" keeps the
site serving regardless of the origin cert's state. The edge cert is Cloudflare
Universal SSL.

## Setup (one-time)

Fill the placeholders:
- `main.tf` → `local.zone_id` (Cloudflare → the domain → Overview)
- `versions.tf` → R2 `bucket` and the account id in `endpoints.s3` (state lives in a
  private R2 bucket, never in this public repo)

Create an **R2 bucket** + R2 API token (Object Read & Write) for state, and a
**Cloudflare API token** scoped to the zone. With the edge resources the token now
needs these Zone permissions (Edit unless noted):
DNS, Zone (Read), Zone Settings, Cache Rules, Transform Rules, Dynamic Redirect —
plus the Account permission **Workers R2 Storage (Edit)** for the photos bucket,
its custom domain, and CORS (`photos.tf`).
Stash all three in macOS Keychain once:

```sh
security add-generic-password -U -a "$USER" -s cloudflare_api_token -w
security add-generic-password -U -a "$USER" -s r2_access_key_id     -w
security add-generic-password -U -a "$USER" -s r2_secret_access_key -w
```

## Use

```sh
source scripts/cf-env.sh                       # "login": load secrets into the shell
terraform init                                 # configure R2 backend + provider

# First run only — adopt the already-live records instead of recreating them:
./scripts/generate-imports.sh <zone_id> > import.tf
terraform plan                                 # expect: import 5, no changes
terraform apply && rm import.tf

terraform plan && terraform apply              # thereafter
```

In CI this is automated: **`terraform-plan`** comments the plan on every PR that
touches this module, and **`terraform-apply`** applies on merge to `main`, gated
by the `production` GitHub Environment (manual approval required). After each
successful apply (and daily), **`edge-verify`** curls the live site to prove the
edge actually serves what this module declares — redirects, headers, TLS floor,
cache. **`terraform-drift`** plans against live weekly and opens/updates a
`terraform-drift` issue if the dashboard has diverged from code.

State is locked with the backend's native S3 lockfile (`use_lockfile`) — R2
supports the conditional write it relies on, so concurrent applies can't race.

## Rolling out the edge (proxied) change

Flipping the records to proxied is the one change that alters live serving.
After approving the apply, verify:

- `https://justintahara.com` loads and Google Fonts render (CSP is correct)
- `curl -sI https://justintahara.com/Amazon.html` → `301` to `/experience/amazon.html`
- headers grade at <https://securityheaders.com/?q=justintahara.com>

Rollback is a revert: set `proxied = false` in `main.tf` (or revert the commit),
then plan + apply.

## Photo pipeline

Scans live in the `justintahara-photos` R2 bucket (never in git), served at
`images.justintahara.com` (`photos.tf`), edge-cached 30 days (`edge.tf`), and
allowed by CSP (`security.tf`). Responsive variants are pre-generated at upload
time by `scripts/sync-photos.sh` (repo root), which also publishes the
`manifest.json` the frontend reads — see that script's header for the object
layout and the immutability convention that makes long caching safe.

## Roadmap

Runtime image transforms (auto-WebP/AVIF via Cloudflare) once traffic justifies
it — pre-generated JPEG variants cover today's need without a paid dependency.
Tighten CSP by removing the lone inline `style=` attribute so `style-src` can
drop `'unsafe-inline'`.

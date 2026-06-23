# Cloudflare infra (Terraform)

Infrastructure-as-code for `justintahara.com` DNS, after migrating the domain from
Namecheap to Cloudflare. Manages 4 apex `A` records + a `www` CNAME pointing at GitHub
Pages, **DNS-only** (grey cloud) so GitHub Pages keeps its own TLS cert.

## Setup (one-time)

Fill the placeholders:
- `main.tf` → `local.zone_id` (Cloudflare → the domain → Overview)
- `versions.tf` → R2 `bucket` and the account id in `endpoints.s3` (state lives in a
  private R2 bucket, never in this public repo)

Create an **R2 bucket** + R2 API token (Object Read & Write) for state, and a
**Cloudflare API token** scoped to the zone (Zone→DNS→Edit, Zone→Zone→Read). Stash all
three in macOS Keychain once:

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

## Roadmap

Proxy the records (orange cloud) + caching, Polish (WebP/AVIF), and image resizing for the
photo portfolio; later, Workers + Secrets Store for runtime image transforms.

# Cloudflare infrastructure (Terraform)

Infrastructure-as-code for `justintahara.com`. This is the codified backend layer
beneath the portfolio: the domain's DNS (and, over time, caching / image-delivery
optimizations) live here as version-controlled Terraform instead of dashboard clicks.

## What this manages today

| Resource | Records | Notes |
|----------|---------|-------|
| `cloudflare_dns_record.apex_a` | 4× `A` on the apex | GitHub Pages IPs, DNS-only |
| `cloudflare_dns_record.www`    | 1× `CNAME` on `www` | -> `justin-tahara.github.io`, DNS-only |

Email (the old Namecheap `eforward*` MX + SPF TXT) was **dropped** during the migration
and is intentionally **not** managed here.

> **Proxy status is DNS-only (grey cloud) on purpose.** GitHub Pages serves its own TLS
> cert. Turning on Cloudflare's proxy (orange cloud) to unlock caching / image resizing
> is a deliberate future change — see "Roadmap".

## Layout

```
infra/cloudflare/
├── versions.tf            # Terraform + provider versions, R2 remote-state backend
├── providers.tf           # Cloudflare provider (token via env var)
├── variables.tf           # zone id + GitHub Pages defaults
├── dns.tf                 # the DNS records
├── terraform.tfvars.example
├── scripts/
│   └── generate-imports.sh  # emit import blocks for the already-live records
└── README.md
```

## Prerequisites

- Terraform `>= 1.9`  (`brew install terraform`)
- `jq` and `curl` (for the import helper) — `brew install jq`

## Authentication (local "login")

Cloudflare has **no** `aws sso login`-style federated session — the Terraform provider
authenticates with an **API token** and the R2 (S3) backend with **static keys**. To get
the same "authenticate once, then CLI just works" ergonomics without pasting secrets each
session, credentials live in the **macOS Keychain** and load via a sourced script.

```sh
# One-time: store the 3 secrets in Keychain (prompts for each; nothing hits shell history)
./scripts/store-secrets.sh        # Cloudflare API token, R2 access key id, R2 secret

# Per shell session — your "login" (sets CLOUDFLARE_API_TOKEN + AWS_* for the R2 backend):
source scripts/cf-env.sh
```

First load may show a Keychain prompt — click **Always Allow** to silence future ones.

> **Optional auto-load:** `brew install direnv`, add its shell hook, then
> `cp .envrc.example .envrc && direnv allow`. After that the creds load automatically
> whenever you `cd` into this directory and unload when you leave — the closest thing to
> `aws sso login` ergonomics.

## One-time setup

### 1. Remote state bucket (Cloudflare R2)

State can't live in this public repo, so it goes in R2 (free tier, S3-compatible).

1. Cloudflare dashboard → **R2** → **Create bucket** (e.g. `justintahara-tfstate`). Keep it private.
2. **R2** → **Manage API Tokens** → create a token with **Object Read & Write** for that bucket.
   You'll get an **Access Key ID** and **Secret Access Key**.
3. Note your **R2 account id** (the hex string in the S3 endpoint shown on the R2 overview page).
4. Edit `versions.tf` and replace the two `REPLACE_ME` placeholders:
   - `bucket` → your bucket name
   - `endpoints.s3` → `https://<account-id>.r2.cloudflarestorage.com`
5. Stash the R2 **Access Key ID** and **Secret Access Key** — you'll put them in Keychain
   below (see "Authentication"). The s3 backend reads them as `AWS_ACCESS_KEY_ID` /
   `AWS_SECRET_ACCESS_KEY`, which `scripts/cf-env.sh` sets for you.

### 2. Cloudflare API token (for the provider)

Dashboard → **My Profile → API Tokens → Create Token → Edit zone DNS** template, scoped to
the `justintahara.com` zone. It needs:

- **Zone → DNS → Edit**
- **Zone → Zone → Read**

Stash this token too — it goes in Keychain (see "Authentication"); `scripts/cf-env.sh`
exports it as `CLOUDFLARE_API_TOKEN`.

### 2b. Store the 3 secrets & "log in"

```sh
./scripts/store-secrets.sh     # one-time: Cloudflare token + the two R2 keys -> Keychain
source scripts/cf-env.sh       # per session: loads them into the shell
```

### 3. Zone id

Dashboard → `justintahara.com` → **Overview** → the **Zone ID** in the right-hand API panel.

```sh
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars and set zone_id
```

## Initialize & import the existing records

The records already exist in Cloudflare (from the migration auto-scan), so we **import**
them rather than create duplicates.

```sh
cd infra/cloudflare

terraform init                       # configures the R2 backend, downloads the provider

# Generate import blocks for the live A/CNAME records:
./scripts/generate-imports.sh "$(grep zone_id terraform.tfvars | cut -d'"' -f2)" > import.tf

terraform plan      # expect: 5 records to import, NO changes (config matches live)
terraform apply     # performs the import into state
rm import.tf        # imports are one-shot — remove after applying
```

After this, `terraform plan` should report **"No changes."** That's the goal: the code is
now a faithful, drift-free mirror of the live zone.

## Day-to-day

```sh
terraform plan      # preview
terraform apply     # apply
```

Commit `.terraform.lock.hcl` (provider checksums). Never commit `terraform.tfvars`,
`import.tf`, `backend.hcl`, or anything matching `*.tfstate*` — `.gitignore` enforces this.

## Roadmap (future infra layers)

1. **Turn on proxying + optimization** — flip the records to `proxied = true`, set SSL/TLS to
   "Full", then add Cloudflare caching rules, **Polish** (auto WebP/AVIF), and **Image
   Resizing** so photos are delivered sized-to-device and tuned for the visitor's connection.
2. **Codify zone settings** — bring TLS mode, HSTS, min TLS version, etc. under Terraform.
3. **CI plan-on-PR** — a GitHub Action running `terraform plan` on pull requests so infra
   changes are reviewed like code.

## Security notes

- State lives only in R2, never in git.
- The Cloudflare token is least-privilege (DNS edit + zone read on one zone).
- R2 keys and the Cloudflare token are passed via environment variables, never written to disk
  in this repo.

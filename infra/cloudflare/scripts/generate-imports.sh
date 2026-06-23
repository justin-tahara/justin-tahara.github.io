#!/usr/bin/env bash
#
# Generate Terraform `import` blocks for the EXISTING Cloudflare DNS records,
# so `terraform plan` reconciles this config with the already-live zone instead
# of trying to create duplicate records.
#
# Why this is needed: the A/CNAME records already exist in Cloudflare (created by
# the auto-scan during the Namecheap -> Cloudflare migration). Terraform doesn't
# know about them until they're imported into state.
#
# Requirements: bash, curl, jq, and a Cloudflare API token with Zone.DNS:Read.
#
# Usage:
#   export CLOUDFLARE_API_TOKEN=...          # token with at least Zone.DNS:Read
#   ./scripts/generate-imports.sh <ZONE_ID> [DOMAIN] > import.tf
#   terraform plan          # should show the records being imported with NO changes
#   terraform apply         # performs the import
#   rm import.tf            # imports are one-shot; remove after a successful apply
#
set -euo pipefail

ZONE_ID="${1:?usage: generate-imports.sh <ZONE_ID> [DOMAIN]}"
DOMAIN="${2:-justintahara.com}"
: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN (needs Zone.DNS:Read)}"

api() {
  # $1 = record type (A, CNAME, ...)
  curl -fsS \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?per_page=100&type=${1}"
}

# Apex A records -> cloudflare_dns_record.apex_a["<ip>"]
api A | jq -r --arg z "$ZONE_ID" --arg d "$DOMAIN" '
  .result[]
  | select(.name == $d)
  | "import {\n  to = cloudflare_dns_record.apex_a[\"\(.content)\"]\n  id = \"\($z)/\(.id)\"\n}\n"
'

# www CNAME -> cloudflare_dns_record.www
api CNAME | jq -r --arg z "$ZONE_ID" --arg d "$DOMAIN" '
  .result[]
  | select(.name == "www." + $d)
  | "import {\n  to = cloudflare_dns_record.www\n  id = \"\($z)/\(.id)\"\n}\n"
'

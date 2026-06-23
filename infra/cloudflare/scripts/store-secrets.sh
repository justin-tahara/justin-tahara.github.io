#!/usr/bin/env bash
#
# One-time: store the Cloudflare + R2 credentials in the macOS login Keychain.
# Re-run any time to rotate a value (-U updates in place).
#
# Secrets are typed at an interactive prompt (never passed as CLI args), so they
# never land in your shell history or in this repo.
#
#   ./scripts/store-secrets.sh
#
# Then load them into a shell with:  source scripts/cf-env.sh
#
set -euo pipefail

store() {
  local service="$1" label="$2"
  echo "" >&2
  echo "→ ${label}" >&2
  # -U: update if present. -w with no value: prompt (no echo) + confirm.
  security add-generic-password -U -a "$USER" -s "$service" -w
  echo "  ✓ '${service}' saved to Keychain" >&2
}

echo "Storing credentials in your macOS login Keychain." >&2
echo "You'll be prompted for each value (typed input is hidden)." >&2

store cloudflare_api_token  "Cloudflare API token (Zone.DNS:Edit + Zone:Read)"
store r2_access_key_id      "R2 Access Key ID"
store r2_secret_access_key  "R2 Secret Access Key"

echo "" >&2
echo "Done. Now run:  source scripts/cf-env.sh" >&2

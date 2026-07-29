#!/usr/bin/env bash
#
# SOURCE this (don't execute it) to load Cloudflare + R2 credentials into the
# current shell — your local equivalent of `aws sso login`:
#
#   source scripts/cf-env.sh
#
# Credentials are read from the macOS Keychain (see store-secrets.sh). This file
# contains NO secrets — only Keychain lookups — so it's safe to commit.
#
# First run, macOS may pop a Keychain prompt; click "Always Allow" to silence it.

_cf_get() { security find-generic-password -a "$USER" -s "$1" -w 2>/dev/null; }

CLOUDFLARE_API_TOKEN="$(_cf_get cloudflare_api_token)"
AWS_ACCESS_KEY_ID="$(_cf_get r2_access_key_id)"
AWS_SECRET_ACCESS_KEY="$(_cf_get r2_secret_access_key)"

if [ -z "$CLOUDFLARE_API_TOKEN" ] || [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
  echo "✗ One or more secrets missing from Keychain. Run: ./scripts/store-secrets.sh" >&2
  unset CLOUDFLARE_API_TOKEN AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
  # shellcheck disable=SC2317  # exit is reached when executed rather than sourced
  return 1 2>/dev/null || exit 1
fi

export CLOUDFLARE_API_TOKEN AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
unset -f _cf_get
echo "✓ Cloudflare + R2 credentials loaded into this shell."

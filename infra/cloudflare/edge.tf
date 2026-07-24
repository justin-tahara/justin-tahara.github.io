# Edge / TLS posture and caching for justintahara.com.
# These only take effect because the DNS records are proxied (see main.tf).

# --- Zone-level TLS + transport settings ------------------------------------
# Each cloudflare_zone_setting manages exactly one setting. Values are simple
# strings here, so a single for_each keeps it declarative.
locals {
  zone_settings = {
    ssl                      = "full" # CF<->origin; "full" survives GitHub Pages cert renewal (see main.tf)
    always_use_https         = "on"   # 301 http -> https at the edge
    min_tls_version          = "1.2"  # drop TLS 1.0/1.1
    tls_1_3                  = "on"
    automatic_https_rewrites = "on" # rewrite http subresources -> https
    brotli                   = "on" # better text compression than gzip
    opportunistic_encryption = "on"
  }
}

resource "cloudflare_zone_setting" "this" {
  for_each = local.zone_settings

  zone_id    = local.zone_id
  setting_id = each.key
  value      = each.value
}

# --- Static asset caching ----------------------------------------------------
# Cache fingerprint-less static assets at the edge for a day. HTML is left to
# origin defaults so content edits go live immediately after a Pages deploy.
resource "cloudflare_ruleset" "cache" {
  zone_id = local.zone_id
  name    = "Static asset caching"
  kind    = "zone"
  phase   = "http_request_cache_settings"

  rules = [
    {
      ref         = "cache_static_assets"
      description = "Edge-cache static assets for 1 day"
      enabled     = true
      action      = "set_cache_settings"
      expression  = "(http.request.uri.path.extension in {\"css\" \"js\" \"png\" \"jpg\" \"jpeg\" \"gif\" \"svg\" \"ico\" \"woff\" \"woff2\" \"pdf\"})"

      action_parameters = {
        cache = true
        edge_ttl = {
          mode    = "override_origin"
          default = 86400
        }
        browser_ttl = {
          mode = "respect_origin"
        }
      }
    },
    # Photos host (R2, see photos.tf). Listed AFTER the extension rule because
    # when multiple cache rules match, the last one wins on conflicting fields —
    # this gives images.* a 30-day edge TTL instead of the generic 1 day.
    # Safe because uploads are immutable-by-convention (sync script never
    # rewrites a variant in place). Browser TTL respects origin: R2 serves the
    # per-object `public, max-age=31536000, immutable` set at upload.
    {
      ref         = "cache_photos_host"
      description = "Edge-cache the R2 photos host for 30 days"
      enabled     = true
      action      = "set_cache_settings"
      expression  = "(http.host eq \"images.${local.domain}\")"

      action_parameters = {
        cache = true
        edge_ttl = {
          mode    = "override_origin"
          default = 2592000
          # Without this, the 30-day default applies to ERROR responses too: one
          # probe of a not-yet-uploaded key pins a 404 at the edge for a month
          # (bitten in practice by manifest.json). Cache errors for 60s only.
          status_code_ttl = [
            {
              status_code_range = { from = 400, to = 599 }
              value             = 60
            },
          ]
        }
        browser_ttl = {
          mode = "respect_origin"
        }
      }
    },
    # manifest.json is the one mutable object on the photos host — the
    # frontend's source of truth for what photos exist. The 30-day rule above
    # was pinning it at the edge for a month despite its 5-minute origin
    # max-age (observed: age 80644s), so freshly synced photos wouldn't
    # appear without a manual purge. Listed last so it wins the conflict.
    {
      ref         = "cache_photos_manifest"
      description = "Edge-cache manifest.json for 5 minutes only"
      enabled     = true
      action      = "set_cache_settings"
      expression  = "(http.host eq \"images.${local.domain}\" and http.request.uri.path eq \"/manifest.json\")"

      action_parameters = {
        cache = true
        edge_ttl = {
          mode    = "override_origin"
          default = 300
        }
        browser_ttl = {
          mode = "respect_origin"
        }
      }
    },
  ]
}

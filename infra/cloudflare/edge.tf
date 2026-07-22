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
  ]
}

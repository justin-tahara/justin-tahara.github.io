# Security response headers for justintahara.com (added at the Cloudflare edge).
# Requires proxied DNS (see main.tf). Verify after apply at https://securityheaders.com.

locals {
  # Content-Security-Policy tailored to what the site actually loads:
  #   - scripts: the local script.js (no inline <script> -> no 'unsafe-inline')
  #              + the Web Analytics beacon the edge auto-injects
  #              (observability.tf); its posts go to cloudflareinsights.com
  #   - styles:  Google Fonts stylesheet + one inline style= attr (UCSD page)
  #   - fonts:   Google Fonts (fonts.gstatic.com)
  #   - images:  self + the inline data: favicon + the R2 photos host (photos.tf)
  #   - connect: self + the photos host (the photography page fetch()es its
  #              manifest.json and 3D assets from images.justintahara.com)
  # Tighten further by removing the one inline style= attr, which lets us drop
  # 'unsafe-inline' from style-src entirely.
  csp = join("; ", [
    "default-src 'self'",
    "script-src 'self' https://static.cloudflareinsights.com",
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://images.justintahara.com",
    "connect-src 'self' https://images.justintahara.com https://cloudflareinsights.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ])
}

resource "cloudflare_ruleset" "security_headers" {
  zone_id = local.zone_id
  name    = "Security response headers"
  kind    = "zone"
  phase   = "http_response_headers_transform"

  rules = [
    {
      ref         = "set_security_headers"
      description = "Add security headers to every response"
      enabled     = true
      action      = "rewrite"
      expression  = "true"

      action_parameters = {
        headers = {
          "Strict-Transport-Security"  = { operation = "set", value = "max-age=31536000; includeSubDomains; preload" }
          "Content-Security-Policy"    = { operation = "set", value = local.csp }
          "X-Content-Type-Options"     = { operation = "set", value = "nosniff" }
          "X-Frame-Options"            = { operation = "set", value = "SAMEORIGIN" }
          "Referrer-Policy"            = { operation = "set", value = "strict-origin-when-cross-origin" }
          "Cross-Origin-Opener-Policy" = { operation = "set", value = "same-origin" }
          "Permissions-Policy"         = { operation = "set", value = "geolocation=(), camera=(), microphone=(), browsing-topics=()" }
        }
      }
    },
  ]
}

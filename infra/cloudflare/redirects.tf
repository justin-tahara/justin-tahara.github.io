# Edge redirects for justintahara.com (requires proxied DNS, see main.tf).
#
# The photography portfolio now lives at the apex; the old resume site moved
# wholesale into /archive/. Two generations of restructure to keep working:
# the per-role pages that once lived at the repo root (2024 restructure), and
# the /experience/, /resume/, /papers/ trees that moved under /archive/ when
# the portfolio took over the root. www -> apex is folded in for
# canonicalization.

locals {
  # old root path -> new path
  page_redirects = {
    "/Amazon.html"           = "/archive/experience/amazon.html"
    "/AppliedIntuition.html" = "/archive/experience/applied-intuition.html"
    "/CHP.html"              = "/archive/experience/chp.html"
    "/NIWC.html"             = "/archive/experience/niwc.html"
    "/Onyx.html"             = "/archive/experience/onyx.html"
    "/UCSD.html"             = "/archive/experience/ucsd.html"
    "/WD.html"               = "/archive/experience/wd.html"
  }

  # Normalize every redirect to one object shape so the rules list has a single
  # consistent type (target_url takes a static value OR a dynamic expression).
  redirect_rules = concat(
    [for from, to in local.page_redirects : {
      expression        = "http.request.uri.path eq \"${from}\""
      description       = "301 ${from} -> ${to}"
      target_value      = "https://${local.domain}${to}"
      target_expression = null
    }],
    [{
      expression        = "starts_with(http.request.uri.path, \"/experience/\") or starts_with(http.request.uri.path, \"/resume/\") or starts_with(http.request.uri.path, \"/papers/\")"
      description       = "301 old resume-site trees -> /archive/ (preserve path)"
      target_value      = null
      target_expression = "concat(\"https://${local.domain}/archive\", http.request.uri.path)"
    }],
    [{
      expression        = "http.host eq \"www.${local.domain}\""
      description       = "301 www -> apex (preserve path)"
      target_value      = null
      target_expression = "concat(\"https://${local.domain}\", http.request.uri.path)"
    }],
  )
}

resource "cloudflare_ruleset" "redirects" {
  zone_id = local.zone_id
  name    = "Old URL + canonical redirects"
  kind    = "zone"
  phase   = "http_request_dynamic_redirect"

  rules = [for r in local.redirect_rules : {
    description = r.description
    enabled     = true
    action      = "redirect"
    expression  = r.expression

    action_parameters = {
      from_value = {
        status_code           = 301
        preserve_query_string = true
        target_url = {
          value      = r.target_value
          expression = r.target_expression
        }
      }
    }
  }]
}

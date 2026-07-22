# Edge redirects for justintahara.com (requires proxied DNS, see main.tf).
#
# The site restructure moved the per-role pages from the repo root into
# /experience/. These 301s keep any old/bookmarked links working. www -> apex
# is folded in for canonicalization.

locals {
  # old root path -> new path
  page_redirects = {
    "/Amazon.html"           = "/experience/amazon.html"
    "/AppliedIntuition.html" = "/experience/applied-intuition.html"
    "/CHP.html"              = "/experience/chp.html"
    "/NIWC.html"             = "/experience/niwc.html"
    "/Onyx.html"             = "/experience/onyx.html"
    "/UCSD.html"             = "/experience/ucsd.html"
    "/WD.html"               = "/experience/wd.html"
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

# SPA deep links (see worker/spa-shell.js and docs/decisions.md #9).
#
# GitHub Pages 404s every client-side route, which keeps the galleries out of
# search engines and breaks link unfurls. The worker serves the app shell with
# a 200 and per-route metadata for exactly the known route set below; all
# other traffic (homepage, /archive/, assets) never touches it.

resource "cloudflare_workers_script" "spa_shell" {
  account_id  = local.account_id
  script_name = "spa-shell"
  main_module = "spa-shell.js"
  content     = file("${path.module}/worker/spa-shell.js")

  compatibility_date = "2025-01-01"
}

locals {
  # Trailing-* so /about/ (trailing slash) is handled too; the worker
  # normalizes the path and passes anything unknown through to the origin.
  # /jasmine mirrors SPECIAL_ROLLS in assets/js/portfolio.js — a new special
  # roll needs a route added here.
  spa_route_patterns = [
    "justintahara.com/city/*",
    "justintahara.com/about*",
    "justintahara.com/humans*",
    "justintahara.com/jasmine*",
    "justintahara.com/sitemap.xml",
  ]
}

resource "cloudflare_workers_route" "spa_shell" {
  for_each = toset(local.spa_route_patterns)

  zone_id = local.zone_id
  pattern = each.value
  script  = cloudflare_workers_script.spa_shell.script_name
}

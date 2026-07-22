# Observability for justintahara.com.
#
# Cloudflare Web Analytics: privacy-first RUM (no cookies, no fingerprinting,
# free) — page views, Core Web Vitals, referrers. auto_install injects the
# beacon at the edge for proxied ("orange-clouded") zones, so the static HTML
# stays untouched. The beacon's script/connect hosts are allowed in the CSP
# (security.tf) — without that the edge would inject a script the edge's own
# headers then block.
#
# The other half of observability lives in CI, where it can alert (via issues)
# rather than just record: edge-verify curls the live site daily, and
# link-health sweeps all links weekly.

resource "cloudflare_web_analytics_site" "site" {
  account_id   = local.account_id
  zone_tag     = local.zone_id
  auto_install = true
  enabled      = true
}

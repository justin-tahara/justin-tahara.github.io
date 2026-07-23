# Observability for justintahara.com.
#
# Cloudflare Web Analytics: privacy-first RUM (no cookies, no fingerprinting,
# free) — page views, Core Web Vitals, referrers. The beacon <script> is
# embedded explicitly in every page (the site_token is public by design);
# auto_install stays OFF because edge injection proved unreliable for this
# zone (a pre-existing RUM site from an earlier dashboard setup shadows it)
# and an explicit tag is deterministic anyway. The beacon's script/connect
# hosts are allowed in the CSP (security.tf).
#
# The other half of observability lives in CI, where it can alert (via issues)
# rather than just record: edge-verify curls the live site daily, and
# link-health sweeps all links weekly.

resource "cloudflare_web_analytics_site" "site" {
  account_id   = local.account_id
  zone_tag     = local.zone_id
  auto_install = false # edge injection off; the explicit page snippet reports instead
}

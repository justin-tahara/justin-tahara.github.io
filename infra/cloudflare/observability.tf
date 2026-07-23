# Observability for justintahara.com.
#
# Cloudflare Web Analytics: privacy-first RUM (no cookies, no fingerprinting,
# free) — page views, Core Web Vitals, referrers. The beacon <script> is
# embedded explicitly in every page (the site_token is public by design), so
# the git-versioned HTML is the source of truth for analytics wiring.
#
# DELIBERATELY NOT a Terraform resource. cloudflare_web_analytics_site was
# managed here briefly and removed (state rm'd, site left alive): the RUM
# read API requires a token permission distinct from every write permission
# (writes ride "Account Settings Edit"; reads 403 without their own grant),
# and a broken read fails EVERY plan — including the weekly drift check —
# for a create-once resource that carries no ongoing config. Wrong trade.
# To re-adopt: grant the read permission, re-add the resource, terraform
# import with the site_tag (see the beacon token in index.html).
#
# The beacon's script/connect hosts are allowed in the CSP (security.tf).
#
# The other half of observability lives in CI, where it can alert (via issues)
# rather than just record: edge-verify curls the live site daily, and
# link-health sweeps all links weekly.

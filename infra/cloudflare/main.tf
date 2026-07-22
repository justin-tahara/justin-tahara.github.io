# DNS for justintahara.com (GitHub Pages), managed by Terraform.
# Migrated from Namecheap to Cloudflare.
#
# Records are now PROXIED (orange cloud). This routes visitor traffic through
# Cloudflare's edge, which is what enables the edge features defined alongside
# this file: caching (edge.tf), security headers + HSTS (security.tf), and the
# old-URL redirect map (redirects.tf). None of those rules take effect on
# DNS-only records.
#
# TLS: the edge cert is Cloudflare Universal SSL; the Cloudflare->origin hop
# uses SSL mode "full" (see edge.tf). We deliberately use "full" rather than
# "strict" because GitHub Pages renews its own Let's Encrypt origin cert via an
# HTTP-01 challenge that can be disrupted behind a proxy -- "full" keeps the
# site serving regardless of the origin cert's renewal state.

provider "cloudflare" {} # token read from CLOUDFLARE_API_TOKEN

locals {
  zone_id            = "9ad4743499153c6eb824add376496adb" # justintahara.com
  domain             = "justintahara.com"
  github_pages_cname = "justin-tahara.github.io"
  github_pages_ipv4 = [
    "185.199.108.153",
    "185.199.109.153",
    "185.199.110.153",
    "185.199.111.153",
  ]
}

resource "cloudflare_dns_record" "apex_a" {
  for_each = toset(local.github_pages_ipv4)

  zone_id = local.zone_id
  name    = local.domain
  type    = "A"
  content = each.value
  ttl     = 1
  proxied = true
  comment = "GitHub Pages apex (Terraform)"
}

resource "cloudflare_dns_record" "www" {
  zone_id = local.zone_id
  name    = "www.${local.domain}"
  type    = "CNAME"
  content = local.github_pages_cname
  ttl     = 1
  proxied = true
  comment = "GitHub Pages www -> apex (Terraform); www->apex 301 in redirects.tf"
}

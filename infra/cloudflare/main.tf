# DNS for justintahara.com (GitHub Pages), managed by Terraform.
# Migrated from Namecheap to Cloudflare. Records are DNS-only (grey cloud) so
# GitHub Pages keeps managing its own TLS cert. Flipping to proxied = true for
# caching / image optimization is a deliberate later step.

provider "cloudflare" {} # token read from CLOUDFLARE_API_TOKEN

locals {
  zone_id            = "REPLACE_ME_ZONE_ID" # Cloudflare dashboard > the domain > Overview
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
  proxied = false
  comment = "GitHub Pages apex (Terraform)"
}

resource "cloudflare_dns_record" "www" {
  zone_id = local.zone_id
  name    = "www.${local.domain}"
  type    = "CNAME"
  content = local.github_pages_cname
  ttl     = 1
  proxied = false
  comment = "GitHub Pages www -> apex (Terraform)"
}

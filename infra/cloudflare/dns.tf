# DNS records for justintahara.com — served by GitHub Pages.
#
# proxied = false (grey cloud / DNS-only) so GitHub Pages manages its own TLS cert.
# Flipping these to proxied = true is a deliberate FUTURE step (Cloudflare caching +
# image optimization for the photo portfolio). That requires SSL/TLS mode = "Full" and
# care with GitHub's "Enforce HTTPS" setting, so leave DNS-only until we tackle that.

# Apex (justintahara.com) -> GitHub Pages: one A record per GitHub Pages IP.
resource "cloudflare_dns_record" "apex_a" {
  for_each = var.github_pages_ipv4

  zone_id = var.zone_id
  name    = var.domain
  type    = "A"
  content = each.value
  ttl     = 1 # 1 = "Auto"
  proxied = false
  comment = "GitHub Pages apex — managed by Terraform"
}

# www -> GitHub Pages (GitHub issues a 301 from www to the apex).
resource "cloudflare_dns_record" "www" {
  zone_id = var.zone_id
  name    = "www.${var.domain}"
  type    = "CNAME"
  content = var.github_pages_cname
  ttl     = 1
  proxied = false
  comment = "GitHub Pages www -> apex redirect — managed by Terraform"
}

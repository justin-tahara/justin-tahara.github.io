# Photo delivery for the photography portfolio.
#
# Film scans are too large (and churn too often) to live in a git repo that
# deploys via Pages. Instead: originals + pre-generated responsive variants
# live in an R2 bucket, served publicly at images.justintahara.com through the
# Cloudflare edge. Uploads happen locally via scripts/sync-photos.sh (repo
# root), which also writes the manifest.json the frontend reads.
#
# Long-lived caching is safe because the sync script uploads content under
# stable names with `immutable` Cache-Control and never rewrites variants in
# place — replacing a photo means new object keys + a new manifest.

resource "cloudflare_r2_bucket" "photos" {
  account_id = local.account_id
  name       = "justintahara-photos"
}

# Public hostname for the bucket. Attaching a custom domain makes Cloudflare
# create and manage the DNS record itself; traffic is proxied, so the cache
# rule (edge.tf) and security headers (security.tf) apply to this host too.
resource "cloudflare_r2_custom_domain" "photos" {
  account_id  = local.account_id
  bucket_name = cloudflare_r2_bucket.photos.name
  domain      = "images.${local.domain}"
  zone_id     = local.zone_id
  enabled     = true
  min_tls     = "1.2"
}

# <img> tags don't need CORS, but the photography page fetch()es manifest.json
# (and 3D assets) cross-origin from the apex — that does. GET/HEAD only;
# localhost:8000 mirrors the documented local-preview workflow.
resource "cloudflare_r2_bucket_cors" "photos" {
  account_id  = local.account_id
  bucket_name = cloudflare_r2_bucket.photos.name

  rules = [
    {
      allowed = {
        methods = ["GET", "HEAD"]
        origins = ["https://${local.domain}", "http://localhost:8000"]
      }
      max_age_seconds = 86400
    },
  ]
}

terraform {
  required_version = ">= 1.9"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5"
    }
  }

  # Remote state in Cloudflare R2 (S3-compatible API).
  #
  # State NEVER lives in this public repo — it lives in your private R2 bucket.
  # R2 access keys are supplied via env vars (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY),
  # never hardcoded here. The bucket name and account-id endpoint below are NOT secret.
  # See README.md > "One-time setup".
  backend "s3" {
    bucket = "personal-website-tfstate"            # R2 bucket
    key    = "cloudflare/justintahara.com.tfstate" # path of the state object inside the bucket
    region = "auto"

    # Native S3 lockfile (a .tflock object next to the state, created with an
    # If-None-Match conditional write, which R2 supports). Prevents two applies
    # from racing the same state — there is no DynamoDB fallback outside AWS.
    use_lockfile = true

    endpoints = {
      s3 = "https://3f39f1776b14aa612ab7070166088a1d.r2.cloudflarestorage.com" # R2 account id
    }

    # R2 speaks the S3 API but is not AWS — disable AWS-only behaviors so init/plan succeed.
    use_path_style              = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }
}

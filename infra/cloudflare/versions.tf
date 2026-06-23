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
    bucket = "REPLACE_ME-tfstate"                  # TODO: your R2 bucket name
    key    = "cloudflare/justintahara.com.tfstate" # path of the state object inside the bucket
    region = "auto"

    endpoints = {
      s3 = "https://REPLACE_ME_ACCOUNT_ID.r2.cloudflarestorage.com" # TODO: your R2 account id
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

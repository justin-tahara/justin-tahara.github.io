variable "zone_id" {
  description = "Cloudflare Zone ID for justintahara.com (Dashboard > the domain > Overview, right-hand 'API' panel)."
  type        = string
}

variable "domain" {
  description = "Apex domain name."
  type        = string
  default     = "justintahara.com"
}

variable "github_pages_ipv4" {
  description = "GitHub Pages apex A-record IPs. https://docs.github.com/pages/configuring-a-custom-domain"
  type        = set(string)
  default = [
    "185.199.108.153",
    "185.199.109.153",
    "185.199.110.153",
    "185.199.111.153",
  ]
}

variable "github_pages_cname" {
  description = "GitHub Pages target for the www CNAME (GitHub 301-redirects www -> apex)."
  type        = string
  default     = "justin-tahara.github.io"
}

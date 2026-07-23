#!/usr/bin/env bash
#
# Publish photo scans to the justintahara-photos R2 bucket (infra/cloudflare/photos.tf),
# served at https://images.justintahara.com.
#
# Usage:
#   source infra/cloudflare/scripts/cf-env.sh     # loads R2 keys from Keychain
#   ./scripts/sync-photos.sh <photos-dir>         # e.g. ~/Photos/site
#
# Expects <photos-dir> organized as rolls:  <photos-dir>/<roll-name>/<photo>.jpg
#
# For every source image this generates responsive JPEG variants with `sips`
# (built into macOS), uploads original + variants, and writes a manifest.json
# the frontend reads. Object keys:
#
#   rolls/<roll>/<stem>.jpg           original scan
#   rolls/<roll>/<stem>-w2560.jpg     variants (only widths smaller than the
#   rolls/<roll>/<stem>-w1600.jpg     original are generated)
#   rolls/<roll>/<stem>-w800.jpg
#   manifest.json
#
# Everything uploads with `Cache-Control: public, max-age=31536000, immutable`
# (except manifest.json: max-age=300) — the edge caches for 30 days (edge.tf).
# IMMUTABILITY CONVENTION: never re-scan over an existing stem; new edit = new
# stem. The manifest is the only object that changes in place.

set -euo pipefail

BUCKET="justintahara-photos"
ENDPOINT="https://3f39f1776b14aa612ab7070166088a1d.r2.cloudflarestorage.com"
WIDTHS=(2560 1600 800)

SRC="${1:?usage: sync-photos.sh <photos-dir>  (rolls as subdirectories)}"
[ -d "$SRC" ] || { echo "✗ not a directory: $SRC" >&2; exit 1; }
: "${AWS_ACCESS_KEY_ID:?R2 keys not loaded — source infra/cloudflare/scripts/cf-env.sh first}"
command -v aws >/dev/null || { echo "✗ aws CLI required (brew install awscli)" >&2; exit 1; }
command -v sips >/dev/null || { echo "✗ sips not found (macOS only)" >&2; exit 1; }

BUILD="$(mktemp -d)"
trap 'rm -rf "$BUILD"' EXIT

manifest_rows=()

shopt -s nullglob nocaseglob
for roll_dir in "$SRC"/*/; do
  roll="$(basename "$roll_dir")"
  mkdir -p "$BUILD/rolls/$roll"

  for img in "$roll_dir"*.{jpg,jpeg,png}; do
    stem="$(basename "${img%.*}")"
    ext="jpg" # variants are always JPEG; sips converts png sources
    orig_w="$(sips -g pixelWidth "$img" | awk '/pixelWidth/{print $2}')"

    cp "$img" "$BUILD/rolls/$roll/$stem.${img##*.}"

    made=()
    for w in "${WIDTHS[@]}"; do
      if [ "$orig_w" -gt "$w" ]; then
        sips -s format jpeg -s formatOptions 85 --resampleWidth "$w" \
          "$img" --out "$BUILD/rolls/$roll/$stem-w$w.$ext" >/dev/null
        made+=("$w")
      fi
    done

    manifest_rows+=("$roll|$stem|${img##*.}|$orig_w|${made[*]:-}")
    echo "✓ $roll/$stem (${orig_w}px; variants: ${made[*]:-none})"
  done
done
shopt -u nullglob nocaseglob

[ ${#manifest_rows[@]} -gt 0 ] || { echo "✗ no images found under $SRC/<roll>/" >&2; exit 1; }

# manifest.json — the frontend contract:
# { "titles": { "<roll>": "Display Name" },
#   "rolls":  { "<roll>": [ { "stem", "original", "width",
#                             "variants": {"2560": url, ...},
#                             "tags": [...], "place": "..." } ] } }
# Optional <photos-dir>/meta.json enriches it:
#   { "titles": { "<roll>": "Display Name" },
#     "tags":   { "<stem>": ["humans", ...] },
#     "places": { "<stem>": "San Mateo" } }
# "titles" gives rolls human names (slug is the fallback); "tags" marks
# cross-cutting collections (e.g. humans-of-the-world) without duplicating
# files; "places" is the exact-location caption — rolls group by region, so
# this is where fine-grained geography lives.
printf '%s\n' "${manifest_rows[@]}" | python3 -c '
import json, os, sys
base = "https://images.justintahara.com/rolls"
meta = {}
meta_path = os.path.join(sys.argv[1], "meta.json")
if os.path.exists(meta_path):
    meta = json.load(open(meta_path))
titles, tag_map = meta.get("titles", {}), meta.get("tags", {})
places = meta.get("places", {})
rolls = {}
for line in sys.stdin:
    roll, stem, ext, width, made = line.rstrip("\n").split("|")
    entry = {
        "stem": stem,
        "original": f"{base}/{roll}/{stem}.{ext}",
        "width": int(width),
        "variants": {w: f"{base}/{roll}/{stem}-w{w}.jpg" for w in made.split()},
    }
    if tag_map.get(stem):
        entry["tags"] = sorted(tag_map[stem])
    if places.get(stem):
        entry["place"] = places[stem]
    rolls.setdefault(roll, []).append(entry)
out = {"rolls": rolls, "titles": {r: titles.get(r, r) for r in rolls}}
print(json.dumps(out, indent=2, sort_keys=True))
' "$SRC" > "$BUILD/manifest.json"

echo "→ syncing to r2://$BUCKET"
aws s3 sync "$BUILD/rolls" "s3://$BUCKET/rolls" --endpoint-url "$ENDPOINT" \
  --cache-control "public, max-age=31536000, immutable" --size-only
aws s3 cp "$BUILD/manifest.json" "s3://$BUCKET/manifest.json" --endpoint-url "$ENDPOINT" \
  --cache-control "public, max-age=300" --content-type "application/json"

echo "✓ live: https://images.justintahara.com/manifest.json"

#!/bin/bash
#
# Downsize image sources under assets/img/ before committing.
#
# Why: jekyll-imagemagick generates the 480/800/1400 webp variants that browsers
# actually load. The committed source file is only ever used as the <img> fallback,
# so there is no reason for it to be a 25MB camera original. Anything above
# MAXPX is pure repo bloat, and it also slows the CI build considerably.
#
# Run this after dropping new photos into assets/img/ and before `git add`.
# Idempotent: files already at or below MAXPX are left untouched.
#
# Usage:  bin/optimize-images.sh [--dry-run]
#
# NOTE: this rewrites files in place. Keep your camera originals somewhere
# outside the repo — the repo is for web-derived assets only.

set -uo pipefail

MAXPX=1600
QUALITY=85
DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

cd "$(dirname "$0")/.." || exit 1

if ! command -v sips >/dev/null 2>&1; then
  echo "error: this script uses macOS 'sips'." >&2
  exit 1
fi

resized=0
skipped=0
failed=0
before_k=0
after_k=0

while IFS= read -r f; do
  w=$(sips -g pixelWidth  "$f" 2>/dev/null | awk '/pixelWidth/{print $2}')
  h=$(sips -g pixelHeight "$f" 2>/dev/null | awk '/pixelHeight/{print $2}')
  if [ -z "$w" ] || [ -z "$h" ]; then
    echo "skip (unreadable): $f"
    skipped=$((skipped + 1))
    continue
  fi

  max=$w
  [ "$h" -gt "$w" ] && max=$h
  bk=$(du -k "$f" | cut -f1)
  before_k=$((before_k + bk))

  if [ "$max" -le "$MAXPX" ]; then
    skipped=$((skipped + 1))
    after_k=$((after_k + bk))
    continue
  fi

  if [ "$DRY_RUN" = "1" ]; then
    echo "would resize: $f (${w}x${h}, ${bk}KB)"
    resized=$((resized + 1))
    after_k=$((after_k + bk))
    continue
  fi

  case "${f##*.}" in
    png | PNG) opts=(-s format png) ;;
    *)         opts=(-s format jpeg -s formatOptions "$QUALITY") ;;
  esac

  if sips -Z "$MAXPX" "${opts[@]}" "$f" --out "$f" >/dev/null 2>&1; then
    after_k=$((after_k + $(du -k "$f" | cut -f1)))
    resized=$((resized + 1))
  else
    echo "FAILED: $f" >&2
    after_k=$((after_k + bk))
    failed=$((failed + 1))
  fi
done < <(find assets/img -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \))

echo "---"
echo "resized: $resized   left alone: $skipped   failed: $failed"
printf "before: %d MB    after: %d MB\n" $((before_k / 1024)) $((after_k / 1024))
[ "$failed" -gt 0 ] && exit 1
exit 0

#!/usr/bin/env bash

# Purge the whole Cloudflare cache for a zone.
#
# purge_everything is the only purge available below Enterprise: purging by
# prefix or by cache tag is not, and single-file purge by URL does not reach
# entries stored under the custom cache keys that Snippet
# 02_shared_sw_installer_cache sets. So this is a blunt instrument by
# necessity.
#
# It is safe to run more than once, and safe to run when a deploy has not
# landed. Built assets are content hashed, so the worst a purge can do is leave
# the cache cold for a moment.

set -euo pipefail

: "${CF_ZONE_ID:?CF_ZONE_ID must be set}"
: "${CF_TOKEN:?CF_TOKEN must be set}"

echo "Purging Cloudflare cache for zone ${CF_ZONE_ID}"

curl --fail --silent --show-error --request POST \
  --url "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  --data '{"purge_everything": true}'

echo

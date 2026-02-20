#!/usr/bin/env bash
# Deploys all Cloudflare Snippets and their rules to a zone.
#
# Uploads each *.js file in cloudflare/snippets/ (excluding *.test.js)
# as a named snippet, then collects all *.js.rules files and pushes
# the full set of snippet rules.
#
# Usage: deploy-snippets.sh
# Env:   CF_ZONE_ID   - Cloudflare zone identifier
#        CF_SNIPPETS_TOKEN - API token with Zone > Snippets > Edit
set -euo pipefail

SNIPPET_DIR="cloudflare/snippets"
API_BASE="https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/snippets"

# Upload each snippet
for file in "$SNIPPET_DIR"/*.js; do
  # skip test files
  [[ "$file" == *.test.js ]] && continue

  snippet_name="$(basename "$file" .js)"

  echo "Uploading snippet: $snippet_name"
  curl --fail --silent --show-error \
    -X PUT \
    "$API_BASE/$snippet_name" \
    -H "Authorization: Bearer $CF_SNIPPETS_TOKEN" \
    --form "files=@$file" \
    --form "metadata={\"main_module\": \"$(basename "$file")\"}"
  echo ""
done

# Build and upload rules from *.js.rules files
rules_json="[]"
for rules_file in "$SNIPPET_DIR"/*.js.rules; do
  [ -f "$rules_file" ] || continue
  snippet_name="$(basename "$rules_file" .js.rules)"
  expression="$(cat "$rules_file")"

  rules_json=$(echo "$rules_json" | jq \
    --arg name "$snippet_name" \
    --arg expr "$expression" \
    --arg desc "Auto-deployed rule for $snippet_name" \
    '. + [{"snippet_name": $name, "expression": $expr, "description": $desc, "enabled": true}]')
done

echo "Uploading snippet rules"
curl --fail --silent --show-error \
  -X PUT \
  "$API_BASE/snippet_rules" \
  -H "Authorization: Bearer $CF_SNIPPETS_TOKEN" \
  -H "Content-Type: application/json" \
  --data "{\"rules\": $rules_json}"
echo ""

echo "Snippet deployment complete"

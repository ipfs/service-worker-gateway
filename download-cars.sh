#!/usr/bin/env bash
# download-cars.sh
# Usage: ./download-cars.sh <input.ndjson> [jobs] [out_dir]
set -euo pipefail

INPUT="${1:-requests-2025-05-07.json}"   # NDJSON source
JOBS="${2:-8}"                           # concurrency
OUTDIR="${3:-cars}"                      # output directory
TMP_URIS="$(mktemp)"

mkdir -p "$OUTDIR"

echo "➜  Extracting URIs …"
cat $INPUT | \
jq 'select(.ClientRequestUserAgent | test("(?i)mozilla|chrome|safari|firefox|edge|opera"))' | \
jq -r '
  select(.ClientRequestURI | type=="string")
  | .ClientRequestURI
  | select(test("^/(ipfs|ipns)/"))
' | sort -u > "$TMP_URIS"

count=$(wc -l < "$TMP_URIS")
echo "➜  Found $count unique paths"

###############################################################################
# Helper: convert an /ipfs/… path to CID, or resolve /ipns/… first            #
###############################################################################
resolve_to_cid() {
  local path="$1"
  if [[ $path == /ipfs/* ]]; then
    echo "${path#/ipfs/}" | cut -d/ -f1
  elif [[ $path == /ipns/* ]]; then
    # resolve /ipns/… → /ipfs/<cid>
    npx kubo@latest resolve --recursive --cid-base=base32 "$path" \
      | sed -E 's|^.*/ipfs/||' | cut -d/ -f1
  else
    echo "_BROKEN_CID_${path}"
  fi
}

###############################################################################
# Worker run by `parallel` – receives exactly one URI as $1                   #
###############################################################################
process_uri() {
  local uri="$1"

  cid=$(resolve_to_cid "$uri") || {
    echo "resolve failed: $uri" >&2
    return 1
  }
  # make sure your input has valid IPFS paths.

  # strip any query params
  cid=$(echo "$cid" | sed -E 's/\?.*$//')

  local car_file="$OUTDIR/$cid.car"
  [[ -f $car_file ]] && {
    echo "skipping existing $car_file"
    rm -f "$car_file.log"
    return 0
  }
  echo "will save to $car_file"

  if npx kubo@latest dag export --timeout=180s "$cid" >"$car_file" \
       2>"$car_file.log"; then
    echo "✔ $cid"
    rm -f "$car_file.log"
  else
    echo "✖ Could not export CAR for $cid, trying trustless-gateway..." >&2
    # try to download from trustless-gateway directly (e.g. https://trustless-gateway.link/ipfs/bafkreiaf5x3fdbvefburtew2wdjzidkcsjkczikh6qnzpd3kpvceajvzgi?format=car)
    if curl -s -o "$car_file" "https://trustless-gateway.link/ipfs/$cid?format=car"; then
      echo "✔ $cid"
      rm -f "$car_file.log"
    else
      echo "✖ $cid (see $(basename "$car_file").log)" >&2
      rm -f "$car_file"
    fi
  fi
}

export -f resolve_to_cid process_uri
export OUTDIR

echo "➜  Exporting CAR files with $JOBS parallel jobs …"

# moreutils `parallel`: one URI per job (-n 1), up to $JOBS concurrent (-j)
# parallel -j "$JOBS" -n 1 process_uri -- < "$TMP_URIS"
# parallel -j "$JOBS" -n 1 process_uri < "$TMP_URIS"
cat "$TMP_URIS" \
  | xargs -n 1 -P "$JOBS" bash -c 'process_uri "$0"'   # ⚠️ NO -I

echo "✓ All done → $(ls -1 "$OUTDIR" | wc -l) CAR files in $OUTDIR"
rm -f "$TMP_URIS"

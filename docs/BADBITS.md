# Badbits enforcement at the edge

The per-CID subdomains (`*.ipfs.inbrowser.*`, `*.ipns.inbrowser.*`) refuse
hosts on the [Bad Bits](https://badbits.dwebops.pub/) denylist with
`410 Gone`, before the service worker installer is served.

## Why this exists

Until September 2026 the subdomains were served through load balancers whose
origin was Rainbow. Rainbow saw the CID in the `Host` header and answered
`410` for listed roots. That was about 60k refused requests a day on
inbrowser.link, relayed to visitors through snippet 02. Cloudflare Pages
serves the installer for any hostname, so moving the origin to Pages removed
that enforcement. This Worker restores it independently of the origin.

## How it works

```
browser ─▶ *.ipfs|ipns.inbrowser.link
            │
            ▼
   gateway-edge Worker  (src/cloudflare/workers/gateway-edge)
     1. host → legacy anchor(s) → sha256 → shard = first 3 hex chars
     2. shard: in-isolate memo ─▶ Cache API ─▶ KV "bb:<prefix>" (5 min)
     3. listed          → 410 Gone
     4. not listed      → shared installer cache (snippet 02 handler) → origin
            ▲
   KV namespace (BADBITS) ◀── Badbits Sync workflow, every 30 min
```

- **Anchors** follow the legacy double-hash rules of the
  [compact denylist spec](https://specs.ipfs.tech/compact-denylist-format/):
  - `sha256("<CIDv1 base32>/")` for an IPFS root
  - `sha256("<CIDv1 base32>/<path>")` for the path of the first request
  - `sha256("<libp2p-key CIDv1 base32>/")` for an IPNS key
  - `sha256("<domain>/")` for a DNSLink name

  Today every one of the list's ~513k entries is in this legacy form. The
  sync job warns if other forms appear, because the edge doesn't enforce them.
- **Shards.** Entries are grouped by the first 3 hex characters of the hash:
  4,096 KV values of 5–10 KB each. A full load is 4,096 writes, and an update
  only writes the shards that changed.
- **Before the cache.** The check runs before any cache lookup, so a newly
  listed CID is refused once its shard reaches the Cloudflare location, within
  about 5 minutes. The host's cached installer doesn't need purging.
- **Fails open.** If KV errors, the request is served and the error is logged.
  An unreachable denylist store must not take every subdomain down.
- **Snippet 02's handler moves into the Worker** for the subdomains.
  Cloudflare advises against running Snippets and Workers on the same URLs,
  so snippet 02's rule now matches only the apex hosts. Inside the Worker,
  the handler's `cache: 'no-store'` retry works, so a poisoned asset entry
  heals again. The Snippets runtime rejects that option (#1213).

### What it does not cover

- **Service workers already installed** answer navigations locally, so the
  edge only sees a visitor's first request to a host. Rainbow had the same
  limitation.
- **Content the service worker fetches** is filtered by `trustless-gateway.net`
  (currently Rainbow). Direct peers aren't filtered. A check inside the
  service worker (#840) would close both gaps. The Worker could serve these
  same shards to the service worker.

## Setup (once, by someone with Cloudflare access)

1. **Create the KV namespace** in the "IPFS Public Utilities" account, for
   example `badbits`. Put its id in both `kv_namespaces` entries in
   `src/cloudflare/workers/gateway-edge/wrangler.toml`, replacing
   `REPLACE_WITH_BADBITS_KV_NAMESPACE_ID`. Until you do, the deploy
   workflows refuse to deploy the Worker.
2. **Create the GitHub environment `badbits`**, with:
   - secret `CF_ACCOUNT_ID`
   - secret `CF_BADBITS_TOKEN`: API token with *Account › Workers KV Storage › Edit*
   - variable `BADBITS_KV_ID`: the namespace id
3. **Add secret `CF_WORKERS_TOKEN`** to the `staging` and `production`
   environments. It's an API token with *Account › Workers Scripts › Edit*,
   plus *Zone › Workers Routes › Edit* on `inbrowser.dev` and
   `inbrowser.link`.
4. **Run the Badbits Sync workflow** manually. The log should report about
   513k entries and 4,096 of 4,096 shards written.

## Rollout

1. **Staging first.** Merge, then run *Deploy to Staging*. It deploys the
   Worker on the `inbrowser.dev` routes, then narrows snippet 02 to the apex,
   in that order.
2. **Prove enforcement with a harmless CID** before trusting it with real
   takedowns:
   ```bash
   printf '%s/' bafkreicafxt3zr4cshf7qteztjzl62ouxqrofu647e44wt7s2iaqjn7bra | shasum -a 256
   ```
   Set the digest as `EXTRA_DENY_HASHES` on the staging Worker (dashboard
   variable or `wrangler secret put EXTRA_DENY_HASHES --env staging`).
   Then:
   - that CID's `inbrowser.dev` subdomain should return `410`
   - other CIDs should work normally

   Remove the variable afterwards.
3. **Regression-check the gateway** on staging: path redirect, installer,
   service worker registration, IPFS and IPNS rendering, assets.
4. **Point the `inbrowser.dev` load balancers back at Pages first.** Check
   that the Worker's 410 count follows the list, and that Rainbow's 410s
   (`edgeWorkerFetch` with origin status `410`) stop.
5. **Production:** run *Deploy to Production*, repeat steps 3–4 on
   `inbrowser.link`, and agree the load balancer change with whoever operates
   the zone.

## Operations

- **Force a full re-sync:** run *Badbits Sync* with `force` checked, for
  example after a deliberate list shrink.
- **See the list state:** read KV key `bb:meta` (ETag, entry count, last
  update, shard digests).
- **Refuse a host that isn't on the list yet:** add its anchor's sha256 to
  `EXTRA_DENY_HASHES`. It takes effect on the next Worker deploy or variable
  change.

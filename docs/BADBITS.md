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
     2. shard: in-isolate memo ─▶ Cache API ─▶ KV "bb:<prefix>" (120 s)
     3. listed          → 410 Gone
     4. not listed      → shared installer cache (snippet 02 handler) → origin
     (background, once a minute per isolate: is bb:status present and fresh?)
            ▲
   KV namespace (BADBITS) ◀── Badbits Sync workflow, every 5 min + daily full
```

- **Anchors** follow the legacy double-hash rules of the
  [compact denylist spec](https://specs.ipfs.tech/compact-denylist-format/),
  built the way nopfs (Rainbow's blocker) builds them:
  - `sha256("<CIDv1 base32>/<path>")` for IPFS
  - `sha256("<libp2p-key CIDv1 base32>/<path>")` for an IPNS key
  - `sha256("<domain>/<path>")` for a DNSLink name

  Here `<path>` is the **decoded** path of the first request, without leading
  or trailing slashes, and empty for the root. So `some%20file` is hashed as
  `some file`.

  Today every one of the list's ~513k entries is in this legacy form. The
  sync job warns if other forms appear, because the edge doesn't enforce them.
- **Shards.** Entries are grouped by the first 3 hex characters of the hash:
  4,096 KV values of 5–10 KB each. A full load is 4,096 writes, and an update
  only writes the shards that changed.
- **Before the cache.** The check runs before any cache lookup, so the host's
  cached installer doesn't need purging.
- **How fast a new entry takes effect:** usually within about **8 minutes**
  of the list changing. The pieces add up as follows:
  - up to 5 minutes until the next sync
  - up to 60 seconds of KV's own edge cache
  - up to 120 seconds of shard reuse (memo and Cache API together; a copy's
    age counts from its KV read, so the layers don't add up)

  GitHub runs scheduled workflows best-effort, so a delayed run adds to this.
  Rainbow's nopfs polled the list about every minute.
- **Fails open, loudly.** If KV errors, the request is served. An unreachable
  denylist store must not take every subdomain down. Every such case is
  reported as `badbits_lookup_error`; see [Monitoring](#monitoring).
- **Deploy gate.** The deploy workflows refuse to deploy the Worker unless
  `bb:status` exists, holds at least 450,000 entries, and was synced in the
  last 24 hours. A Worker bound to an empty or wrong namespace would
  otherwise block nothing, with no error.
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
   environments. It's an API token with:
   - *Account › Workers Scripts › Edit*
   - *Account › Workers KV Storage › Read* (used by the deploy gate)
   - *Account › Account Analytics › Read*, if you query the metrics with it
   - *Zone › Workers Routes › Edit* on `inbrowser.dev` and `inbrowser.link`
4. **Run the Badbits Sync workflow** manually. The log should report about
   513k entries and 4,096 of 4,096 shards written. Until this has run, the
   deploy gate fails.
5. **Set up alerting** on the events in [Monitoring](#monitoring).

## Rollout

1. **Staging first.** Merge, then run *Deploy to Staging*. It deploys the
   Worker on the `inbrowser.dev` routes, then narrows snippet 02 to the apex,
   in that order.
2. **Prove enforcement with a harmless CID** before trusting it with real
   takedowns:
   ```bash
   printf '%s/' bafkreicafxt3zr4cshf7qteztjzl62ouxqrofu647e44wt7s2iaqjn7bra | shasum -a 256
   ```
   Set the digest with `wrangler secret put EXTRA_DENY_HASHES --env staging`.
   Always use a **secret**: a plain dashboard variable is removed by the next
   `wrangler deploy`. Then:
   - that CID's `inbrowser.dev` subdomain should return `410`
   - other CIDs should work normally

   Delete the secret afterwards (`wrangler secret delete EXTRA_DENY_HASHES --env staging`).
3. **Regression-check the gateway** on staging: path redirect, installer,
   service worker registration, IPFS and IPNS rendering, assets.
4. **Point the `inbrowser.dev` load balancers back at Pages first.** Check
   that the Worker's 410 count follows the list, and that Rainbow's 410s
   (`edgeWorkerFetch` with origin status `410`) stop.
5. **Production:** run *Deploy to Production*, repeat steps 3–4 on
   `inbrowser.link`, and agree the load balancer change with whoever operates
   the zone.

## Monitoring

The Worker writes structured log lines (Workers Logs are enabled in
`wrangler.toml`). It also writes the same events to the Analytics Engine
datasets `gateway_edge_staging` and `gateway_edge_production`:

| Event | Meaning | Alert when |
|---|---|---|
| `badbits_blocked` | a host was refused (value 1) | an unexpected drop to zero, compared with the ~60k/day Rainbow baseline |
| `badbits_lookup_error` | KV failed and the request was **served** (fail-open) | any sustained rate |
| `badbits_store_missing` | `bb:status` is absent: the Worker is blocking nothing | any occurrence |
| `badbits_store_stale` | the last completed sync is over 2h old (value = age in seconds) | any occurrence |

The two store events are checked once a minute per isolate, off the request
path.

The sync workflow itself fails, which notifies whoever GitHub notifies for
this repo, in these cases:
- the download fails
- the list is below 450,000 entries, or shrank more than 10%
- a KV write fails
- the list contains entries the edge can't enforce

In the last case the legacy entries are still synced, and every later run
keeps failing until the new format is handled.

## Operations

- **Force a sync** past the size guards (for example after a deliberate list
  shrink): run *Badbits Sync* with `force` checked.
- **Rewrite every shard:** run *Badbits Sync* with `full` checked. This also
  runs daily at 03:17 UTC and heals any shard changed outside the sync.
- **See the list state:** read KV key `bb:status` (ETag, entry count,
  unenforced count, last change, last successful sync). `bb:meta` holds the
  per-shard digests.
- **Refuse a host that isn't on the list yet:** add its anchor's sha256 to
  the `EXTRA_DENY_HASHES` **secret**. Secrets survive deploys.

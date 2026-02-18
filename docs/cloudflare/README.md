# Cloudflare Snippets

Self-contained [Cloudflare Snippets](https://developers.cloudflare.com/rules/snippets/) used at `inbrowser.link` and `inbrowser.dev`.

These are zero-dependency JavaScript files that run at the Cloudflare edge
before requests reach the origin. They speed up page loads by handling path
redirects and CID normalization without the round-trip of loading HTML and JS
from the service worker gateway, and improve caching by ensuring canonical URLs
are used from the first request.

## Snippets

### `path-gateway-to-subdomain.js`

Redirects IPFS/IPNS path gateway URLs to subdomain gateway URLs with CID normalization per the [subdomain gateway spec](https://specs.ipfs.tech/http-gateways/subdomain-gateway/).

- `/ipfs/{cid}` -> `{base32-cidv1}.ipfs.{host}`
- `/ipns/{peerid}` -> `{base36-cidv1}.ipns.{host}`
- `/ipns/{domain}` -> `{dnslink-encoded}.ipns.{host}`

Supported input multibase encodings: base16 (`f`), base32 (`b`), base36 (`k`), base58btc (`z`, `Qm`, `12D3K`), base64url (`u`).

## Testing

```console
$ npm run test:cloudflare
```

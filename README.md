<h1 align="center">
  <br>
  <img src="https://github.com/ipfs/service-worker-gateway/blob/ca0a5ad20e5f9aac7a50047cade51f0a2d7a31b0/public/ipfs-sw-icon-512-shadow.png" alt="logo" title="logo" width="200"></a>
  <br>
  Service Worker IPFS Gateway
  <br>
</h1>

<p align="center" style="font-size: 1.2rem;">Decentralizing IPFS Gateways by verifying hashes in the user's browser.</p>

<p align="center">
  <a href="https://ipfs.tech"><img src="https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square" alt="Official Part of IPFS Project"></a>
  <a href="https://discuss.ipfs.tech"><img alt="Discourse Forum" src="https://img.shields.io/discourse/posts?server=https%3A%2F%2Fdiscuss.ipfs.tech"></a>
  <a href="https://github.com/ipfs/service-worker-gateway/actions"><img src="https://img.shields.io/github/actions/workflow/status/ipfs/service-worker-gateway/main.yml?branch=main" alt="ci"></a>
  <a href="https://github.com/ipfs/service-worker-gateway/releases"><img alt="GitHub release" src="https://img.shields.io/github/v/release/ipfs/service-worker-gateway?filter=!*rc*"></a>
</p>

<hr />

## About

This project demonstrates the use of [Helia](https://github.com/ipfs/helia)
(IPFS implementation in JS) and the [`verified-fetch` library](https://github.com/ipfs/helia-verified-fetch)
([Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) for IPFS)
within a [Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
to facilitate direct verified retrieval of content-addressed data.

A Service Worker is registered on the initial page load, and then intercepts
HTTP requests for content stored on IPFS paths such as `/ipfs/*` (immutable) and
`/ipns/*` (mutable) and returns [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response)
objects to the browser.

It functions as an IPFS gateway within the browser, offering enhanced security
([hash verification](https://docs.ipfs.tech/concepts/content-addressing/)
happens on end user's machine) and reliability (ability to use multiple sources
of content-addressed blocks) without reliance on a single HTTP server for IPFS
tasks.

<a href="http://ipshipyard.com/"><img align="right" src="https://github.com/user-attachments/assets/39ed3504-bb71-47f6-9bf8-cb9a1698f272" /></a>

This project  was brought to you by the [Shipyard](http://ipshipyard.com/) team.

### Goals

The main goals of this project are:

- **Enhancing the robustness of IPFS-based web hosting by eliminating reliance
  on a single HTTP backend.**
  - Tasks such as fetching blocks from IPFS content providers (both
    peer-to-peer and HTTP), verifying that block hashes match the expected CID,
    and re-assembling blocks into deserialized bytes that can be rendered by
    the browser, all happens within the end user's machine.
- **Reducing the operational costs associated with running an HTTP backend.**
  - By shifting the majority of data retrieval tasks to the user's browser, the
    backend hosting a website no longer needs to serve as a conduit for all of
    its data. This means that a gateway operator could potentially run a simple
    HTTP server on a Raspberry Pi, serving only small static HTML+JS files
    (<10MiB), while allowing all other operations to occur within the user's
    browser, with data fetched either peer-to-peer or from remote HTTP
    trustless gateways.
- **Improving JS tooling, IPFS specifications, and gateway-conformance tests.**
   - By having to implement gateway semantics end-to-end we identify bugs and
     gaps, and improve quality of libraries, specifications, and interop tests.


### Feature Set

- 🔒 [Trustless Retrieval](https://specs.ipfs.tech/http-gateways/trustless-gateway/) client that fetches content directly from providers over HTTPS, Secure WebSockets, and other browser-compatible transports, falling back to HTTPS gateway proxy/relay via `trustless-gateway.link` when direct retrieval is not possible.
- 🌐 Service Worker running as a [Web Gateway](https://specs.ipfs.tech/http-gateways/) for website hosting (`index.html`, [web pathing](https://github.com/ipfs/specs/issues/432), `_redirects`).
- 🧭 [HTTP Routing V1](https://specs.ipfs.tech/routing/http-routing-v1/) (`/routing/v1`) client for discovering content providers (via `delegated-ipfs.dev`).
- 📡 [DNSLink](https://dnslink.dev/) resolution via [DNS-over-HTTPS](https://en.wikipedia.org/wiki/DNS_over_HTTPS) (DoH).

Compliance with [IPFS HTTP Gateway specifications](https://specs.ipfs.tech/http-gateways/) is tested using the [gateway-conformance](https://github.com/ipfs/gateway-conformance) test suite (the same suite used by [Kubo](https://github.com/ipfs/kubo) and [Rainbow](https://github.com/ipfs/rainbow)).

## Usage

### Running locally

You can run the project locally:

```console
> npm install
> npm start
```

Now open your browser and go to `http://localhost:3000`

The gateway runs exclusively in [subdomain mode](https://specs.ipfs.tech/http-gateways/subdomain-gateway/) -- as you type in a content path, you will be redirected to an appropriate subdomain URL with [Origin isolation](https://docs.ipfs.tech/how-to/address-ipfs-on-web/#subdomain-gateway).

For more information about local development setup, see [./docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md).

### Try hosted instance

We provide a public good instance of this project configured to run in [subdomain mode](https://docs.ipfs.tech/how-to/address-ipfs-on-web/#subdomain-gateway),
aiming to be a drop-in replacement for `dweb.link`:

- https://inbrowser.link -- production, deployed from tagged [releases](https://github.com/ipfs/service-worker-gateway/releases)
- https://inbrowser.dev -- staging, deployed from tagged pre-releases

For deployment details, see [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md#deploying).

## Manual Service Worker Deregistration

In some cases, you might want to manually unregister or remove the Helia service
worker from your browser. This can be useful for debugging purposes or to ensure
a clean state.

You can instruct the service worker to unregister itself by appending the
`?ipfs-sw-unregister=true` query parameter to the URL of any page controlled by
the service worker.

For example, if the service worker is active for `https://example.com`,
navigating to `https://example.com/?ipfs-sw-unregister=true` will cause the
service worker to unregister itself and attempt to reload all controlled clients
(browser tabs).

## License

This project is dual-licensed under `SPDX-License-Identifier: Apache-2.0 OR MIT`

See [LICENSE](./LICENSE) for more details.

<h1 align="center">
  <br>
  <img src="https://github.com/ipfs-shipyard/service-worker-gateway/assets/157609/4931e739-a899-4b18-91f2-2a2bcafb5c33" alt="logo" title="logo" width="200"></a>
  <br>
  Service Worker IPFS Gateway
  <br>
</h1>

<p align="center" style="font-size: 1.2rem;">Decentralizing IPFS Gateways by running hash verification on end user's machine.</p>

<p align="center">
  <a href="https://ipfs.tech"><img src="https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square" alt="Official Part of IPFS Project"></a>
  <a href="https://discuss.ipfs.tech"><img alt="Discourse Forum" src="https://img.shields.io/discourse/posts?server=https%3A%2F%2Fdiscuss.ipfs.tech"></a>
  <a href="https://matrix.to/#/#ipfs-space:ipfs.io"><img alt="Matrix" src="https://img.shields.io/matrix/ipfs-space%3Aipfs.io?server_fqdn=matrix.org"></a>
  <a href="https://github.com/ipfs-shipyard/service-worker-gateway/actions"><img src="https://img.shields.io/github/actions/workflow/status/ipfs-shipyard/service-worker-gateway/main.yml?branch=main" alt="ci"></a>
  <a href="https://github.com/ipfs-shipyard/service-worker-gateway/releases"><img alt="GitHub release" src="https://img.shields.io/github/v/release/ipfs-shipyard/service-worker-gateway?filter=!*rc*"></a>
</p>

<hr />

## About

This project demonstrates
the use of [Helia](https://helia.io) (IPFS implementation in JS)
and the [`verified-fetch` library](https://github.com/ipfs/helia-verified-fetch)
([Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) for IPFS)
within a [Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
to facilitate direct verified retrieval of content-addressed data.

A Service Worker is registered on the initial page load, and then intercepts HTTP requests
for content stored on IPFS paths such as `/ipfs/*` (immutable) and
`/ipns/*` (mutable) and returns
[`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) object
to the browser.

It functions as an IPFS gateway within the browser, offering enhanced security
([hash verification](https://docs.ipfs.tech/concepts/content-addressing/)
happens on end user's machine) and reliability (ability to use multiple sources
of content-addressed blocks) without reliance on a single HTTP server for  IPFS
tasks.


### Goals

The main goals of this project are:

- **Enhancing the robustness of IPFS-based web hosting by eliminating reliance
  on a single HTTP backend.**
  - Tasks such as fetching blocks from IPFS content providers (both
    peer-to-peer and HTTP), verifying that block hashes match the expected CID,
    and re-assembling blocks into deserialized bytes that can be rendered by
    the browser, all happens within the end user's machine.
- **Reducing the operational costs associated with running a HTTP backend.**
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



### Featureset

- 🚧 **WIP:** Web interface for adjusting routing and retrieval settings.
- 🚧 **WIP:** [Trustless](https://docs.ipfs.tech/reference/http/gateway/#trustless-verifiable-retrieval) content retrieval from multiple HTTP gateways.
- 🚧 **WIP:** Support for [Web Gateway](https://specs.ipfs.tech/http-gateways/) feature set for website hosting (`index.html`, [web pathing](https://github.com/ipfs/specs/issues/432), `_redirects`).
- 🚧 **Future:** [HTTP Routing V1](https://specs.ipfs.tech/routing/http-routing-v1/) (`/routing/v1`) client for discovering additional direct content providers.
- 🚧 **Future:** [Denylist](https://specs.ipfs.tech/compact-denylist-format/) support for operators of public nodes.

## Usage

### Try runnung on localhost

For now, one can build project and run it locally:


```console
> npm ci
> npm start
```

Now open your browser at `http://sw.localhost:3000`

As you type in a content path, you will be redirected to appropriate URL.

For more information about local development setup, see [/docs/DEVELOPMENT.md](/docs/DEVELOPMENT.md).

### Try hosted instance

- 🚧 **WIP: alpha quality** https://inbrowser.link hosts the latest release
- 🚧 **WIP: alpha quality** https://inbrowser.dev is used for testing, hosts the latest dev version from the `main` branch

## License

This project is dual-licensed under
`SPDX-License-Identifier: Apache-2.0 OR MIT`

See [LICENSE](./LICENSE) for more details.


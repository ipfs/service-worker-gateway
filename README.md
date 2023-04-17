<p align="center">
  <a href="https://github.com/ipfs/helia" title="Helia">
    <img src="https://raw.githubusercontent.com/ipfs/helia/main/assets/helia.png" alt="Helia logo" width="300" />
  </a>
</p>

<h3 align="center"><b>Bundle Helia with Webpack</b></h3>

<p align="center">
  <img src="https://raw.githubusercontent.com/jlord/forkngo/gh-pages/badges/cobalt.png" width="200">
  <br>
  <a href="https://ipfs.github.io/helia/modules/helia.html">Explore the docs</a>
  ·
  <a href="https://codesandbox.io/">View Demo</a>
  ·
  <a href="https://github.com/ipfs-examples/helia-examples/issues">Report Bug</a>
  ·
  <a href="https://github.com/ipfs-examples/helia-examples/issues">Request Feature/Example</a>
</p>

## Table of Contents

- [Table of Contents](#table-of-contents)
- [About The Project](#about-the-project)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation and Running example](#installation-and-running-example)
- [Examples](#examples)
- [Usage](#usage)
- [Demo links](#demo-links)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Want to hack on IPFS?](#want-to-hack-on-ipfs)

## About The Project

- Read the [docs](https://ipfs.github.io/helia/modules/helia.html)
- Look into other [examples](https://github.com/ipfs-examples/helia-examples) to learn how to spawn a Helia node in Node.js and in the Browser
- Visit https://dweb-primer.ipfs.io to learn about IPFS and the concepts that underpin it
- Head over to https://proto.school to take interactive tutorials that cover core IPFS APIs
- Check out https://docs.ipfs.io for tips, how-tos and more
- See https://blog.ipfs.io for news and more
- Need help? Please ask 'How do I?' questions on https://discuss.ipfs.io

## Getting Started

### Prerequisites

Make sure you have installed all of the following prerequisites on your development machine:

- Git - [Download & Install Git](https://git-scm.com/downloads). OSX and Linux machines typically have this already installed.
- Node.js - [Download & Install Node.js](https://nodejs.org/en/download/) and the npm package manager.

### Installation and Running example

```console
> npm install
> npm start
```

Now open your browser at `http://localhost:3000`

## Examples

### fetch request to ipfs.io gateway. (what you shouldn't have to do anymore)

```js
// fetch content from ipfs.io gateway (centralized web2.5 gateway for IFPS content)
const response = await fetch('https://ipfs.io/ipfs/bafkreiezuss4xkt5gu256vjccx7vocoksxk77vwmdrpwoumfbbxcy2zowq')

// You can see examples of the below usage in src/components/CidRenderer.tsx
// <img src={URL.createObjectURL(await response.blob())} />
// <video controls autoPlay loop className="center" width="100%"><source src={URL.createObjectURL(await response.blob())} type={contentType} /></video>
// <span>{await res.text()}</span>
```

### request directly to IPFS network using helia

```js
import { heliaFetch } from 'ipfs-shipyard/helia-fetch'

/**
 * A function that returns a helia instance
 * @see https://github.com/ipfs-examples/helia-examples/blob/main/examples/helia-webpack/src/get-helia.js
 */
import { getHelia } from './lib/getHelia'


// fetch content from IPFS directly using helia
const response = await heliaFetch({ path: '/ipfs/bafkreiezuss4xkt5gu256vjccx7vocoksxk77vwmdrpwoumfbbxcy2zowq', helia: getHelia() })

// You can see examples of the below usage in src/components/CidRenderer.tsx
// <img src={URL.createObjectURL(await response.blob())} />
// <video controls autoPlay loop className="center" width="100%"><source src={URL.createObjectURL(await response.blob())} type={contentType} /></video>
// <span>{await res.text()}</span>

```

_For more examples, please refer to the [Documentation](#documentation)_

## Usage

In this example, you will find an example of using helia inside a service worker, that will intercept ipfs path requests (e.g. `/ipfs/*` and `/ipns/*`) and return a `Response` object. This can be used to obtain verified IPFS content instead of using a public IPFS gateway, using helia.

There are two methods of loading content with this demo, each method with their own buttons:

1. Load in-page - This calls heliaFetch directly. NOTE: If you're loading an HTML page (a static website) the service worker must run in order to handle redirecting the loading of content through `heliaFetch`.
2. Load directly / download - This method is processed directly by the service worker, and is essentially an IPFS gateway in the browser via helia in a service worker.

The first thing you will see will look like the below image:

![image](https://user-images.githubusercontent.com/1173416/230510195-ec5dfa8c-fe91-4ecd-b534-caaabf83e11d.png)

As you type in an ip(f|n)s or dnslink path, you will be shown appropriate error messaging:

![image](https://user-images.githubusercontent.com/1173416/230510280-373be0a1-b65b-482b-a41b-9c4a561afe83.png)

![image](https://user-images.githubusercontent.com/1173416/230510324-87139b46-d240-4688-9f27-b75191dce6d1.png)

![image](https://user-images.githubusercontent.com/1173416/230510358-1e380be1-30f6-4426-855f-b0dfc83d2aa3.png)

etc... When your path is valid, you will be shown buttons that will let you load the content:

![image](https://user-images.githubusercontent.com/1173416/230510425-774e2b4e-d1d1-4d95-a651-4c8300360b76.png)


**NOTE:** There is no way to confirm the validity of an `/ipns/` path without actually querying for it, which is not currently done until you attempt to load the content.


## Demo links

### Pre-reqs

You have to visit the [hosted site](https://helia-service-worker-gateway.on.fleek.co/) first, and make sure the SW is loaded. Once it is, the below links should work for you.

Notes:
* Attempting a few refreshes, clearing site data (cache/cookies/sw/indexDb/etc..), etc, may resolve your problem (though may be indicative of issues you can fix with a PR!)
* Some content-types are not *previewable* with certain browsers. If you receive a download prompt you didn't expect: double check the returned content-type and make sure your browser supports previewing that content-type.

### Links

#### Static website and it's nested content

* ipfs.tech/images directory listing page - https://helia-service-worker-gateway.on.fleek.co/ipfs/QmeUdoMyahuQUPHS2odrZEL6yk2HnNfBJ147BeLXsZuqLJ/images
* ipfs.tech/images/images/ipfs-desktop-hex.png - https://helia-service-worker-gateway.on.fleek.co/ipfs/QmeUdoMyahuQUPHS2odrZEL6yk2HnNfBJ147BeLXsZuqLJ/images/ipfs-desktop-hex.png
* ipfs.tech website - https://helia-service-worker-gateway.on.fleek.co/ipfs/QmeUdoMyahuQUPHS2odrZEL6yk2HnNfBJ147BeLXsZuqLJ

#### Single images

* router image - https://helia-service-worker-gateway.on.fleek.co/ipfs/bafkreicafxt3zr4cshf7qteztjzl62ouxqrofu647e44wt7s2iaqjn7bra
* web3.storage logo - https://helia-service-worker-gateway.on.fleek.co/ipfs/bafkreif4ufrfpfcmqn5ltjvmeisgv4k7ykqz2mjygpngtwt4bijxosidqa

#### Videos

* skateboarder stock video - https://helia-service-worker-gateway.on.fleek.co/ipfs/bafkreiezuss4xkt5gu256vjccx7vocoksxk77vwmdrpwoumfbbxcy2zowq
* big buck bunny video - https://helia-service-worker-gateway.on.fleek.co/ipfs/bafybeidsp6fva53dexzjycntiucts57ftecajcn5omzfgjx57pqfy3kwbq

#### IPNS paths

* /ipns/libp2p.io - https://helia-service-worker-gateway.on.fleek.co/ipns/libp2p.io
* /ipns/ipfs.tech - https://helia-service-worker-gateway.on.fleek.co/ipns/ipfs.tech

#### DNSLink paths

* TBD

## Documentation

- [IPFS Primer](https://dweb-primer.ipfs.io/)
- [IPFS Docs](https://docs.ipfs.io/)
- [Tutorials](https://proto.school)
- [More examples](https://github.com/ipfs-examples/helia-examples)
- [API - Helia](https://ipfs.github.io/helia/modules/helia.html)
- [API - @helia/unixfs](https://ipfs.github.io/helia-unixfs/modules/_helia_unixfs.html)

## Contributing

Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the IPFS Project
2. Create your Feature Branch (`git checkout -b feature/amazing-feature`)
3. Commit your Changes (`git commit -a -m 'feat: add some amazing feature'`)
4. Push to the Branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Want to hack on IPFS?

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/CONTRIBUTING.md)

The IPFS implementation in JavaScript needs your help! There are a few things you can do right now to help out:

Read the [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md) and [JavaScript Contributing Guidelines](https://github.com/ipfs/community/blob/master/CONTRIBUTING_JS.md).

- **Check out existing issues** The [issue list](https://github.com/ipfs/helia/issues) has many that are marked as ['help wanted'](https://github.com/ipfs/helia/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc+label%3A%22help+wanted%22) or ['difficulty:easy'](https://github.com/ipfs/helia/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc+label%3Adifficulty%3Aeasy) which make great starting points for development, many of which can be tackled with no prior IPFS knowledge
- **Look at the [Helia Roadmap](https://github.com/ipfs/helia/blob/main/ROADMAP.md)** This are the high priority items being worked on right now
- **Perform code reviews** More eyes will help
  a. speed the project along
  b. ensure quality, and
  c. reduce possible future bugs
- **Add tests**. There can never be enough tests

[cid]: https://docs.ipfs.tech/concepts/content-addressing  "Content Identifier"
[Uint8Array]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array
[libp2p]: https://libp2p.io

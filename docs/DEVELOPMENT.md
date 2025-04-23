# Developer Notes

This page shows how to set up basic development environment and how to test
this project.

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

If you are editing code actively and wanting to see the changes, you will want to use `npm run dev` and the `http://localhost:3333` because the IPFS hosted content (at port 3334) is generated at build time and the x-forwarded-host header and stubbed DNSLink of `ipfs-host.local` will still be pointing to the old content.

### Enabling subdomains

Subdomains are enabled by default when you run `npm start` or `npm run dev`. You will want to access the service worker gateway via a reverse proxy that ensures subdomain support:

* `http://localhost:3000`
* `http://localhost:3333`
* `http://localhost:3334`


### Testing without subdomains

Unless you have some other reverse proxy setup, you can access a path-only gateway by accessing:

* `http://127.0.0.1:3000` - `npm run start`
* `http://localhost:8345` - `npm run dev`
* `http://127.0.0.1:8345` - `npm run dev`
* `http://127.0.0.1:3333` - `npm run dev`
* `http://127.0.0.1:3334` - `npm run dev`

## Demo links

### Pre-reqs

You have to visit the landing page first, and make sure the SW is loaded. Once it is, the below links should work for you.

Notes:
- ⚠️ Deployment of this service worker on environments that don't enable subdomain pathing is not recommended. Path-only gateways do not provide [Origin isolation](https://docs.ipfs.tech/how-to/address-ipfs-on-web/#subdomain-gateway). NEVER use path-only gateways for loading dapps with sensitive information such as keys, passwords, wallets.
* Attempting a few refreshes, clearing site data (cache/cookies/sw/indexDb/etc..), etc, may resolve your problem (though may be indicative of issues you can fix with a PR!)
* Some content-types are not *previewable* with certain browsers. If you receive a download prompt you didn't expect: double check the returned content-type and make sure your browser supports previewing that content-type.

### Links

#### Static website and it's nested content

* ipfs.tech/images directory listing page - http://localhost:3333/ipfs/QmeUdoMyahuQUPHS2odrZEL6yk2HnNfBJ147BeLXsZuqLJ/images
* ipfs.tech/images/images/ipfs-desktop-hex.png - http://localhost:3333/ipfs/QmeUdoMyahuQUPHS2odrZEL6yk2HnNfBJ147BeLXsZuqLJ/images/ipfs-desktop-hex.png
* ipfs.tech website - http://localhost:3333/ipfs/QmeUdoMyahuQUPHS2odrZEL6yk2HnNfBJ147BeLXsZuqLJ

#### Single images

* router image - http://localhost:3333/ipfs/bafkreicafxt3zr4cshf7qteztjzl62ouxqrofu647e44wt7s2iaqjn7bra
* web3.storage logo - http://localhost:3333/ipfs/bafkreif4ufrfpfcmqn5ltjvmeisgv4k7ykqz2mjygpngtwt4bijxosidqa

#### Videos

* skateboarder stock video - http://localhost:3333/ipfs/bafkreiezuss4xkt5gu256vjccx7vocoksxk77vwmdrpwoumfbbxcy2zowq
* big buck bunny video - http://localhost:3333/ipfs/bafybeidsp6fva53dexzjycntiucts57ftecajcn5omzfgjx57pqfy3kwbq

#### IPNS paths

* /ipns/libp2p.io - http://localhost:3333/ipns/libp2p.io
* /ipns/ipfs.tech - http://localhost:3333/ipns/ipfs.tech

#### DNSLink paths

* TBD

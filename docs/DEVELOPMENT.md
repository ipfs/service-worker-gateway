# Developer Notes

This page shows how to set up basic development environment and how to test
this project.

## Getting Started

### Prerequisites

Make sure you have installed all of the following prerequisites on your development machine:

- Git - [Download & Install Git](https://git-scm.com/downloads). OSX and Linux machines typically have this already installed.
- Node.js - [Download & Install Node.js](https://nodejs.org/en/download/) and the npm package manager.

### Installation and Running

```console
> npm install
> npm start
```

`npm start` starts Kubo, a DNS-JSON server, and an HTTP server at `http://localhost:3000` with `--load-fixtures --watch` (auto-rebuilds on code changes).

### Subdomain gateway

The gateway runs exclusively in [subdomain mode](https://specs.ipfs.tech/http-gateways/subdomain-gateway/).
Path gateway support was removed in v3, and `/ipfs/cid` now redirects to `cid.ipfs.example.com` subdomain.

Access via `http://localhost:3000` -- as you type in a content path, you will be
redirected to an appropriate subdomain URL with [Origin isolation](https://docs.ipfs.tech/how-to/address-ipfs-on-web/#subdomain-gateway).

> [!WARNING]
> Deployment of this service worker on environments that don't enable subdomain pathing is not recommended. Path-only gateways do not provide [Origin isolation](https://docs.ipfs.tech/how-to/address-ipfs-on-web/#subdomain-gateway). NEVER use path-only gateways for loading dapps with sensitive information such as keys, passwords, wallets.

## Demo links

### Pre-reqs

You have to visit the landing page first, and make sure the SW is loaded. Once it is, the below links should work for you.

Notes:

- Attempting a few refreshes, clearing site data (cache/cookies/sw/indexDb/etc..), etc, may resolve your problem (though may be indicative of issues you can fix with a PR!)
- Some content-types are not *previewable* with certain browsers. If you receive a download prompt you didn't expect: double check the returned content-type and make sure your browser supports previewing that content-type.

### Links

#### Static website and its nested content

- ipfs.tech/images directory listing page - http://localhost:3000/ipfs/QmeUdoMyahuQUPHS2odrZEL6yk2HnNfBJ147BeLXsZuqLJ/images
- ipfs.tech/images/images/ipfs-desktop-hex.png - http://localhost:3000/ipfs/QmeUdoMyahuQUPHS2odrZEL6yk2HnNfBJ147BeLXsZuqLJ/images/ipfs-desktop-hex.png
- ipfs.tech website (index.html detection) - http://localhost:3000/ipfs/QmeUdoMyahuQUPHS2odrZEL6yk2HnNfBJ147BeLXsZuqLJ

#### Single images

- router image - http://localhost:3000/ipfs/bafkreicafxt3zr4cshf7qteztjzl62ouxqrofu647e44wt7s2iaqjn7bra
- web3.storage logo - http://localhost:3000/ipfs/bafkreif4ufrfpfcmqn5ltjvmeisgv4k7ykqz2mjygpngtwt4bijxosidqa
- dag-pb wrapped JPG - http://localhost:3000/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi

#### Videos

- big buck bunny video - http://localhost:3000/ipfs/bafybeidsp6fva53dexzjycntiucts57ftecajcn5omzfgjx57pqfy3kwbq

#### DNSLink paths

- /ipns/docs.ipfs.tech - http://localhost:3000/ipns/docs.ipfs.tech
- /ipns/ipfs.tech - http://localhost:3000/ipns/ipfs.tech
- /ipns/en.wikipedia-on-ipfs.org - http://localhost:3000/ipns/en.wikipedia-on-ipfs.org
- /ipns/blog.ipfs.tech - http://localhost:3000/ipns/blog.ipfs.tech
- /ipns/cid.ipfs.tech - http://localhost:3000/ipns/cid.ipfs.tech

## Deploying

### Deploying to production

Production deploys to https://inbrowser.link by manually running the
[deploy-to-production](https://github.com/ipfs/service-worker-gateway/actions/workflows/deploy-to-production.yml)
GitHub Action and passing a release tag as input.

### Deploying to staging

Staging deploys to https://inbrowser.dev by manually running the
[deploy-to-staging](https://github.com/ipfs/service-worker-gateway/actions/workflows/deploy-to-staging.yml)
GitHub Action and passing a release tag or git revision as input.

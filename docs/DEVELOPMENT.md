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

Now open your browser at `http://sw.localhost:3000`


### Enabling subdomains

You can enable support for subdomains with a simple nginx configuration:

```nginx
    # simple proxy from sw.localhost to localhost:3000
    server {
        listen       80;

        server_name ~^(?<subdomain>.+)\.ipfs\.sw.localhost$ ~^(?<subdomain>.+)\.ipns\.sw.localhost$ .sw.localhost;

        location / {
            proxy_pass http://localhost:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-For $remote_addr;
        }
    }
```

You can then run `npm start`, start your nginx server, and then visit <http://specs-ipfs-tech.ipns.sw.localhost> in your browser to load the `specs.ipfs.tech` website via Helia-based verified-fetch library, completely from the Service Worker.

You can also try <http://sw.localhost/ipns/specs.ipfs.tech> to automatically be redirected to <http://specs-ipfs-tech.ipns.sw.localhost>. If you are not redirected, your reverse proxy may not be set up correctly.

## Demo links

### Pre-reqs

You have to visit the [hosted site](https://helia-service-worker-gateway.on.fleek.co/) first, and make sure the SW is loaded. Once it is, the below links should work for you.

Notes:
- ⚠️ Deployment of this service worker on environments that don't enable subdomain pathing is not recommended. Path-only gateways do not provide [Origin isolation](https://docs.ipfs.tech/how-to/address-ipfs-on-web/#subdomain-gateway). NEVER use path-only gateways for loading dapps with sensitive information such as keys, passwords, wallets. 
* Attempting a few refreshes, clearing site data (cache/cookies/sw/indexDb/etc..), etc, may resolve your problem (though may be indicative of issues you can fix with a PR!)
* Some content-types are not *previewable* with certain browsers. If you receive a download prompt you didn't expect: double check the returned content-type and make sure your browser supports previewing that content-type.

### Links

#### Static website and it's nested content

* ipfs.tech/images directory listing page - http://sw.localhost:3000/ipfs/QmeUdoMyahuQUPHS2odrZEL6yk2HnNfBJ147BeLXsZuqLJ/images
* ipfs.tech/images/images/ipfs-desktop-hex.png - http://sw.localhost:3000/ipfs/QmeUdoMyahuQUPHS2odrZEL6yk2HnNfBJ147BeLXsZuqLJ/images/ipfs-desktop-hex.png
* ipfs.tech website - http://sw.localhost:3000/ipfs/QmeUdoMyahuQUPHS2odrZEL6yk2HnNfBJ147BeLXsZuqLJ

#### Single images

* router image - http://sw.localhost:3000/ipfs/bafkreicafxt3zr4cshf7qteztjzl62ouxqrofu647e44wt7s2iaqjn7bra
* web3.storage logo - http://sw.localhost:3000/ipfs/bafkreif4ufrfpfcmqn5ltjvmeisgv4k7ykqz2mjygpngtwt4bijxosidqa

#### Videos

* skateboarder stock video - http://sw.localhost:3000/ipfs/bafkreiezuss4xkt5gu256vjccx7vocoksxk77vwmdrpwoumfbbxcy2zowq
* big buck bunny video - http://sw.localhost:3000/ipfs/bafybeidsp6fva53dexzjycntiucts57ftecajcn5omzfgjx57pqfy3kwbq

#### IPNS paths

* /ipns/libp2p.io - http://sw.localhost:3000/ipns/libp2p.io
* /ipns/ipfs.tech - http://sw.localhost:3000/ipns/ipfs.tech

#### DNSLink paths

* TBD

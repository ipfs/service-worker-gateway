# ipfs-bitswap <!-- omit in toc -->

[![ipfs.tech](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](https://ipfs.tech)
[![Discuss](https://img.shields.io/discourse/https/discuss.ipfs.tech/posts.svg?style=flat-square)](https://discuss.ipfs.tech)
[![codecov](https://img.shields.io/codecov/c/github/ipfs/js-ipfs-bitswap.svg?style=flat-square)](https://codecov.io/gh/ipfs/js-ipfs-bitswap)
[![CI](https://img.shields.io/github/actions/workflow/status/ipfs/js-ipfs-bitswap/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/ipfs/js-ipfs-bitswap/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> JavaScript implementation of the Bitswap data exchange protocol used by IPFS

## Table of contents <!-- omit in toc -->

- [Install](#install)
  - [Browser `<script>` tag](#browser-script-tag)
- [Stats](#stats)
  - [Peer accessor:](#peer-accessor)
  - [Global snapshot accessor:](#global-snapshot-accessor)
  - [Moving average accessor:](#moving-average-accessor)
- [Performance tests](#performance-tests)
  - [Profiling](#profiling)
- [API Docs](#api-docs)
- [License](#license)
- [Contribute](#contribute)

## Install

```console
$ npm i ipfs-bitswap
```

### Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `IpfsBitswap` in the global namespace.

```html
<script src="https://unpkg.com/ipfs-bitswap/dist/index.min.js"></script>
```

## Stats

```js
const bitswapNode = // ...

const stats = bitswapNode.stats
```

Stats contains a snapshot accessor, a moving average acessor and a peer accessor.

Besides that, it emits "update" events every time it is updated.

```js
stats.on('update', (stats) => {
  console.log('latest stats snapshot: %j', stats)
})
```

### Peer accessor:

You can get the stats for a specific peer by doing:

```js
const peerStats = stats.forPeer(peerId)
```

The returned object behaves like the root stats accessor (has a snapshot, a moving average accessors and is an event emitter).

### Global snapshot accessor:

```js
const snapshot = stats.snapshot
console.log('stats: %j', snapshot)
```

the snapshot will contain the following keys, with the values being [bignumber.js](https://github.com/MikeMcl/bignumber.js#readme) instances:

```js
// stats: {
//   "dataReceived":"96",
//   "blocksReceived":"2",
//   "dataReceived":"96",
//   "dupBlksReceived":"0",
//   "dupDataReceived":"0",
//   "blocksSent":"0",
//   "dataSent":"0",
//   "providesBufferLength":"0",
//   "wantListLength":"0",
//   "peerCount":"1"
// }
```

### Moving average accessor:

```js
const movingAverages = stats.movingAverages
```

This object contains these properties:

- 'blocksReceived',
- 'dataReceived',
- 'dupBlksReceived',
- 'dupDataReceived',
- 'blocksSent',
- 'dataSent',
- 'providesBufferLength',
- 'wantListLength',
- 'peerCount'

```js
const dataReceivedMovingAverages = movingAverages.dataReceived
```

Each one of these will contain one key per interval (miliseconds), being the default intervals defined:

- 60000 (1 minute)
- 300000 (5 minutes)
- 900000 (15 minutes)

You can then select one of them

```js
const oneMinuteDataReceivedMovingAverages = dataReceivedMovingAverages[60000]
```

This object will be a [movingAverage](https://github.com/pgte/moving-average#readme) instance.

## Performance tests

You can run performance tests like this:

    $ npm run benchmarks

### Profiling

You can run each of the individual performance tests with a profiler like 0x.

To do that, you need to install 0x:

```bash
$ npm install 0x --global
```

And then run the test:

```bash
$ 0x test/benchmarks/get-many
```

This will output a flame graph and print the location for it.
Use the browser Chrome to open and inspect the generated graph.

![Flame graph](https://ipfs.io/ipfs/QmVbyLgYfkLewNtzTAFwAEMmP2hTJgs8sSqsRTBNBjyQ1y)

## API Docs

- <https://ipfs.github.io/js-ipfs-bitswap>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribute

Contributions welcome! Please check out [the issues](https://github.com/ipfs/js-ipfs-bitswap/issues).

Also see our [contributing document](https://github.com/ipfs/community/blob/master/CONTRIBUTING_JS.md) for more information on how we work, and about contributing in general.

Please be aware that all interactions related to this repo are subject to the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/CONTRIBUTING.md)

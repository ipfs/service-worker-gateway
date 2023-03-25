
// import type { MultihashDigest } from 'multiformats';
// import { bases, digest } from 'multiformats/basics'
// type ValueOf<T> = T[keyof T];
// type baseTypes = ValueOf<typeof bases>
// type decoderTypes = baseTypes['decoder']

// const multibaseDecoder = Object.values(bases).map<decoderTypes>(b => b.decoder).reduce((d, b) => {
//   if (d.or) return d.or(b)
//   return b
//   // return d.or(b)
// }, {} as ReturnType<decoderTypes['or']>);
// const decodeCerthashStr = (s: string): MultihashDigest => {
//   return digest.decode(multibaseDecoder.decode(s))
// }
// (window as any).decodeCerthashStr = decodeCerthashStr
// try {
//   var myMa = multiaddr('/ip4/127.0.0.1/udp/4001/quic-v1/webtransport/certhash/uEiDcbIVbN_JykMDZVMGSmSTl5JdZw4cDI1Hwj82h30kTfw/certhash/uEiDWmsTxXe55Mbwnvd1qrPZAcE5Jtc0tE9WtGXD_NpMERg/p2p/12D3KooWQF6Q3i1QkziJQ9mkNNcyFD8GPQz6R6oEvT75wgsVXm4v')
//   if (myMa) {
//     var certhash = myMa.stringTuples().find(([proto, value]) => protocols('certhash').code === proto)
//     if (certhash && certhash[1]) {
//       const decodedCertHash = decodeCerthashStr(certhash[1])
//       console.log(`decodedCertHash: `, decodedCertHash);
//       const wt = new globalThis.WebTransport('https://127.0.0.1:4001/.well-known/libp2p-webtransport?type=noise', {serverCertificateHashes: [{ algorithm: 'sha-256', value: decodedCertHash.digest }]})
//       await wt.ready
//       console.log(`wt: `, wt);
//       (window as any).wt = wt;
//       wt.closed.catch((error: Error) => {
//         console.error('WebTransport transport closed due to:', error)
//       })
//     }
//   }
// } catch (e) {
//   console.error('error with myMa', e)
// }

// Feed each multibase from `ipfs multibase list` (kubo) into the snippet
// and check that toSubdomain normalizes it back to the canonical subdomain
// label: base32 for /ipfs/, base36 for /ipns/.
//
// Fixtures were generated with kubo:
//   echo -n "<canonical>" | ipfs multibase decode > tmp.bin
//   for b in $(ipfs multibase list); do ipfs multibase encode -b="$b" tmp.bin; done
//
// Source CIDs:
//   /ipfs/  bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi  (v1 dag-pb)
//   /ipns/  k51qzi5uqu5dlvj2baxnqndepeb86cbk3ng7n3i46uzyxzyqj2xjonzllnv0v8  (libp2p key)
//
// `identity` is skipped: it is not a CID encoding.

import { expect } from 'aegir/chai'
import { toSubdomain } from '../../../src/cloudflare/snippets/subdomain.ts'

const IPFS_CANONICAL = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
const IPNS_CANONICAL = 'k51qzi5uqu5dlvj2baxnqndepeb86cbk3ng7n3i46uzyxzyqj2xjonzllnv0v8'

const ipfsCases: Array<[string, string]> = [
  ['base2', '0000000010111000000010010001000001100001111000100011100110011111011001000101011111111110100000110110011111001111010011111111101010000111111111100011010111100110100101110110010000101101001100001011100000000000001001011101101110000100101100110100111000011000111011110100101000011100100011010'],
  ['base32', 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'],
  ['base32upper', 'BAFYBEIGDYRZT5SFP7UDM7HU76UH7Y26NF3EFUYLQABF3OCLGTQY55FBZDI'],
  ['base32pad', 'cafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi======'],
  ['base32padupper', 'CAFYBEIGDYRZT5SFP7UDM7HU76UH7Y26NF3EFUYLQABF3OCLGTQY55FBZDI======'],
  ['base16', 'f01701220c3c4733ec8affd06cf9e9ff50ffc6bcd2ec85a6170004bb709669c31de94391a'],
  ['base16upper', 'F01701220C3C4733EC8AFFD06CF9E9FF50FFC6BCD2EC85A6170004BB709669C31DE94391A'],
  ['base36', 'k2jmtxw8rjh1z69c6not3wtdxb0u3urbzhyll1t9jg6ox26dhi5sfi1m'],
  ['base36upper', 'K2JMTXW8RJH1Z69C6NOT3WTDXB0U3URBZHYLL1T9JG6OX26DHI5SFI1M'],
  ['base64', 'mAXASIMPEcz7Ir/0Gz56f9Q/8a80uyFphcABLtwlmnDHelDka'],
  ['base64pad', 'MAXASIMPEcz7Ir/0Gz56f9Q/8a80uyFphcABLtwlmnDHelDka'],
  ['base32hexpad', 't05o14863ohpjti5fvk3cv7kvuk7voqud5r45kobg015re2b6jgott51p38======'],
  ['base32hexpadupper', 'T05O14863OHPJTI5FVK3CV7KVUK7VOQUD5R45KOBG015RE2B6JGOTT51P38======'],
  ['base64url', 'uAXASIMPEcz7Ir_0Gz56f9Q_8a80uyFphcABLtwlmnDHelDka'],
  ['base64urlpad', 'UAXASIMPEcz7Ir_0Gz56f9Q_8a80uyFphcABLtwlmnDHelDka'],
  ['base32hex', 'v05o14863ohpjti5fvk3cv7kvuk7voqud5r45kobg015re2b6jgott51p38'],
  ['base32hexupper', 'V05O14863OHPJTI5FVK3CV7KVUK7VOQUD5R45KOBG015RE2B6JGOTT51P38'],
  ['base58btc', 'zdj7Wic6KcJAfWz1c9o4M6kq9Lwd5BfbxkVafnrojaaGiSFxM'],
  ['base58flickr', 'ZCJ7vHB6jBiaEvZ1B9N4m6KQ9kWC5bEAXKuzEMRNJzzgHrfXm'],
  ['base256emoji', '🚀🪐⭐💻😅❓💎🌈🌸🌚💰💍🌒😵🐶💁🤐🌎👼🙃🙅☺🌚😞🤤⭐🚀😃✈🌕😚🍻💜🐷⚽✌😊']
]

const ipnsCases: Array<[string, string]> = [
  ['base2', '000000001011100100000000000100100000010000000000100010010001000001110010001101000000010110010111110001100100011010010000100001001000011100110101010100011001001111111000110111011001101000010101010111000111001111101100100100011100011110001111000110101100000110001101001010100110101101010100011110101110010010001000100100100'],
  ['base32', 'bafzaajaiaejcbzdibmxyzdjbbehgvizh6g5tikvy47mshdy6gwbruvgwvd24seje'],
  ['base32upper', 'BAFZAAJAIAEJCBZDIBMXYZDJBBEHGVIZH6G5TIKVY47MSHDY6GWBRUVGWVD24SEJE'],
  ['base32pad', 'cafzaajaiaejcbzdibmxyzdjbbehgvizh6g5tikvy47mshdy6gwbruvgwvd24seje'],
  ['base32padupper', 'CAFZAAJAIAEJCBZDIBMXYZDJBBEHGVIZH6G5TIKVY47MSHDY6GWBRUVGWVD24SEJE'],
  ['base16', 'f0172002408011220e4680b2f8c8d21090e6aa327f1bb342ab8e7d9238f1e35831a54d6a8f5c91124'],
  ['base16upper', 'F0172002408011220E4680B2F8C8D21090E6AA327F1BB342AB8E7D9238F1E35831A54D6A8F5C91124'],
  ['base36', 'k51qzi5uqu5dlvj2baxnqndepeb86cbk3ng7n3i46uzyxzyqj2xjonzllnv0v8'],
  ['base36upper', 'K51QZI5UQU5DLVJ2BAXNQNDEPEB86CBK3NG7N3I46UZYXZYQJ2XJONZLLNV0V8'],
  ['base64', 'mAXIAJAgBEiDkaAsvjI0hCQ5qoyfxuzQquOfZI48eNYMaVNao9ckRJA'],
  ['base64pad', 'MAXIAJAgBEiDkaAsvjI0hCQ5qoyfxuzQquOfZI48eNYMaVNao9ckRJA=='],
  ['base32hexpad', 't05p0090804921p381cnop3911476l8p7u6tj8alosvci73ou6m1hkl6ml3qsi494'],
  ['base32hexpadupper', 'T05P0090804921P381CNOP3911476L8P7U6TJ8ALOSVCI73OU6M1HKL6ML3QSI494'],
  ['base64url', 'uAXIAJAgBEiDkaAsvjI0hCQ5qoyfxuzQquOfZI48eNYMaVNao9ckRJA'],
  ['base64urlpad', 'UAXIAJAgBEiDkaAsvjI0hCQ5qoyfxuzQquOfZI48eNYMaVNao9ckRJA=='],
  ['base32hex', 'v05p0090804921p381cnop3911476l8p7u6tj8alosvci73ou6m1hkl6ml3qsi494'],
  ['base32hexupper', 'V05P0090804921P381CNOP3911476L8P7U6TJ8ALOSVCI73OU6M1HKL6ML3QSI494'],
  ['base58btc', 'z5AanNVJCxnWCzDzCerCejh6EdigZJnNfHrJGzTp5TT2moo7mRGhZZu'],
  ['base58flickr', 'Z5azMnuicXMvcZdZcDRcDJG6eCHFyiMnEhRigZsP5ss2LNN7LqgGyyU'],
  ['base256emoji', '🚀🪐🥺🚀🥰🌔🪐💻😅🎤😴🌗👌👑🎵👏🌕🌏😬🎁💙💩😙😇😆🎀❄🍒🔥😛😘🌹🌻😊💋💅✊🤐🦋☀🥰']
]

describe('multibase round-trip: /ipfs/ -> base32 subdomain label', () => {
  for (const [name, input] of ipfsCases) {
    it(name, () => {
      expect(toSubdomain(input, 'ipfs')).to.equal(IPFS_CANONICAL)
    })
  }
})

describe('multibase round-trip: /ipns/ -> base36 subdomain label', () => {
  for (const [name, input] of ipnsCases) {
    it(name, () => {
      expect(toSubdomain(input, 'ipns')).to.equal(IPNS_CANONICAL)
    })
  }
})

export interface Multicodec {
  name: string
  code: number
  description?: string
}

export const CODE_IDENTITY = 0x00
export const CODE_CIDV1 = 0x01
export const CODE_CIDV2 = 0x02
export const CODE_CIDV3 = 0x03
export const CODE_IP4 = 0x04
export const CODE_TCP = 0x06
export const CODE_SHA1 = 0x11
export const CODE_SHA2_256 = 0x12
export const CODE_SHA2_512 = 0x13
export const CODE_SHA3_512 = 0x14
export const CODE_SHA3_384 = 0x15
export const CODE_SHA3_256 = 0x16
export const CODE_SHA3_224 = 0x17
export const CODE_SHAKE_128 = 0x18
export const CODE_SHAKE_256 = 0x19
export const CODE_KECCAK_224 = 0x1a
export const CODE_KECCAK_256 = 0x1b
export const CODE_KECCAK_384 = 0x1c
export const CODE_KECCAK_512 = 0x1d
export const CODE_BLAKE3 = 0x1e
export const CODE_SHA2_384 = 0x20
export const CODE_DCCP = 0x21
export const CODE_MURMUR3_X64_64 = 0x22
export const CODE_MURMUR3_32 = 0x23
export const CODE_IP6 = 0x29
export const CODE_IP6ZONE = 0x2a
export const CODE_IPCIDR = 0x2b
export const CODE_PATH = 0x2f
export const CODE_MULTICODEC = 0x30
export const CODE_MULTIHASH = 0x31
export const CODE_MULTIADDR = 0x32
export const CODE_MULTIBASE = 0x33
export const CODE_VARSIG = 0x34
export const CODE_DNS = 0x35
export const CODE_DNS4 = 0x36
export const CODE_DNS6 = 0x37
export const CODE_DNSADDR = 0x38
export const CODE_PROTOBUF = 0x50
export const CODE_CBOR = 0x51
export const CODE_RAW = 0x55
export const CODE_DBL_SHA2_256 = 0x56
export const CODE_RLP = 0x60
export const CODE_BENCODE = 0x63
export const CODE_DAG_PB = 0x70
export const CODE_DAG_CBOR = 0x71
export const CODE_LIBP2P_KEY = 0x72
export const CODE_GIT_RAW = 0x78
export const CODE_TORRENT_INFO = 0x7b
export const CODE_TORRENT_FILE = 0x7c
export const CODE_BLAKE3_HASHSEQ = 0x80
export const CODE_LEOFCOIN_BLOCK = 0x81
export const CODE_LEOFCOIN_TX = 0x82
export const CODE_LEOFCOIN_PR = 0x83
export const CODE_SCTP = 0x84
export const CODE_DAG_JOSE = 0x85
export const CODE_DAG_COSE = 0x86
export const CODE_LBRY = 0x8c
export const CODE_ETH_BLOCK = 0x90
export const CODE_ETH_BLOCK_LIST = 0x91
export const CODE_ETH_TX_TRIE = 0x92
export const CODE_ETH_TX = 0x93
export const CODE_ETH_TX_RECEIPT_TRIE = 0x94
export const CODE_ETH_TX_RECEIPT = 0x95
export const CODE_ETH_STATE_TRIE = 0x96
export const CODE_ETH_ACCOUNT_SNAPSHOT = 0x97
export const CODE_ETH_STORAGE_TRIE = 0x98
export const CODE_ETH_RECEIPT_LOG_TRIE = 0x99
export const CODE_ETH_RECEIPT_LOG = 0x9a
export const CODE_AES_128 = 0xa0
export const CODE_AES_192 = 0xa1
export const CODE_AES_256 = 0xa2
export const CODE_CHACHA_128 = 0xa3
export const CODE_CHACHA_256 = 0xa4
export const CODE_BITCOIN_BLOCK = 0xb0
export const CODE_BITCOIN_TX = 0xb1
export const CODE_BITCOIN_WITNESS_COMMITMENT = 0xb2
export const CODE_ZCASH_BLOCK = 0xc0
export const CODE_ZCASH_TX = 0xc1
export const CODE_CAIP_50 = 0xca
export const CODE_STREAMID = 0xce
export const CODE_STELLAR_BLOCK = 0xd0
export const CODE_STELLAR_TX = 0xd1
export const CODE_MD4 = 0xd4
export const CODE_MD5 = 0xd5
export const CODE_DECRED_BLOCK = 0xe0
export const CODE_DECRED_TX = 0xe1
export const CODE_IPLD = 0xe2
export const CODE_IPFS = 0xe3
export const CODE_SWARM = 0xe4
export const CODE_IPNS = 0xe5
export const CODE_ZERONET = 0xe6
export const CODE_SECP256K1_PUB = 0xe7
export const CODE_DNSLINK = 0xe8
export const CODE_BLS12_381_G1_PUB = 0xea
export const CODE_BLS12_381_G2_PUB = 0xeb
export const CODE_X25519_PUB = 0xec
export const CODE_ED25519_PUB = 0xed
export const CODE_BLS12_381_G1G2_PUB = 0xee
export const CODE_SR25519_PUB = 0xef
export const CODE_DASH_BLOCK = 0xf0
export const CODE_DASH_TX = 0xf1
export const CODE_SWARM_MANIFEST = 0xfa
export const CODE_SWARM_FEED = 0xfb
export const CODE_BEESON = 0xfc
export const CODE_UDP = 0x0111
export const CODE_P2P_WEBRTC_STAR = 0x0113
export const CODE_P2P_WEBRTC_DIRECT = 0x0114
export const CODE_P2P_STARDUST = 0x0115
export const CODE_WEBRTC_DIRECT = 0x0118
export const CODE_WEBRTC = 0x0119
export const CODE_P2P_CIRCUIT = 0x0122
export const CODE_DAG_JSON = 0x0129
export const CODE_UDT = 0x012d
export const CODE_UTP = 0x012e
export const CODE_CRC32 = 0x0132
export const CODE_CRC64_ECMA = 0x0164
export const CODE_CRC64_NVME = 0x0165
export const CODE_UNIX = 0x0190
export const CODE_THREAD = 0x0196
export const CODE_P2P = 0x01a5
export const CODE_HTTPS = 0x01bb
export const CODE_ONION = 0x01bc
export const CODE_ONION3 = 0x01bd
export const CODE_GARLIC64 = 0x01be
export const CODE_GARLIC32 = 0x01bf
export const CODE_TLS = 0x01c0
export const CODE_SNI = 0x01c1
export const CODE_NOISE = 0x01c6
export const CODE_SHS = 0x01c8
export const CODE_QUIC = 0x01cc
export const CODE_QUIC_V1 = 0x01cd
export const CODE_WEBTRANSPORT = 0x01d1
export const CODE_CERTHASH = 0x01d2
export const CODE_WS = 0x01dd
export const CODE_WSS = 0x01de
export const CODE_P2P_WEBSOCKET_STAR = 0x01df
export const CODE_HTTP = 0x01e0
export const CODE_HTTP_PATH = 0x01e1
export const CODE_SWHID_1_SNP = 0x01f0
export const CODE_JSON = 0x0200
export const CODE_MESSAGEPACK = 0x0201
export const CODE_CAR = 0x0202
export const CODE_X509_CERTIFICATE = 0x0210
export const CODE_IPNS_RECORD = 0x0300
export const CODE_LIBP2P_PEER_RECORD = 0x0301
export const CODE_LIBP2P_RELAY_RSVP = 0x0302
export const CODE_MEMORYTRANSPORT = 0x0309
export const CODE_CAR_INDEX_SORTED = 0x0400
export const CODE_CAR_MULTIHASH_INDEX_SORTED = 0x0401
export const CODE_TRANSPORT_BITSWAP = 0x0900
export const CODE_TRANSPORT_GRAPHSYNC_FILECOINV1 = 0x0910
export const CODE_TRANSPORT_IPFS_GATEWAY_HTTP = 0x0920
export const CODE_TRANSPORT_FILECOIN_PIECE_HTTP = 0x0930
export const CODE_MULTIDID = 0x0d1d
export const CODE_FR32_SHA256_TRUNC254_PADBINTREE = 0x1011
export const CODE_SHA2_256_TRUNC254_PADDED = 0x1012
export const CODE_SHA2_224 = 0x1013
export const CODE_SHA2_512_224 = 0x1014
export const CODE_SHA2_512_256 = 0x1015
export const CODE_MURMUR3_X64_128 = 0x1022
export const CODE_RIPEMD_128 = 0x1052
export const CODE_RIPEMD_160 = 0x1053
export const CODE_RIPEMD_256 = 0x1054
export const CODE_RIPEMD_320 = 0x1055
export const CODE_X11 = 0x1100
export const CODE_P256_PUB = 0x1200
export const CODE_P384_PUB = 0x1201
export const CODE_P521_PUB = 0x1202
export const CODE_ED448_PUB = 0x1203
export const CODE_X448_PUB = 0x1204
export const CODE_RSA_PUB = 0x1205
export const CODE_SM2_PUB = 0x1206
export const CODE_VLAD = 0x1207
export const CODE_PROVENANCE_LOG = 0x1208
export const CODE_PROVENANCE_LOG_ENTRY = 0x1209
export const CODE_PROVENANCE_LOG_SCRIPT = 0x120a
export const CODE_MLKEM_512_PUB = 0x120b
export const CODE_MLKEM_768_PUB = 0x120c
export const CODE_MLKEM_1024_PUB = 0x120d
export const CODE_MULTISIG = 0x1239
export const CODE_MULTIKEY = 0x123a
export const CODE_NONCE = 0x123b
export const CODE_ED25519_PRIV = 0x1300
export const CODE_SECP256K1_PRIV = 0x1301
export const CODE_X25519_PRIV = 0x1302
export const CODE_SR25519_PRIV = 0x1303
export const CODE_RSA_PRIV = 0x1305
export const CODE_P256_PRIV = 0x1306
export const CODE_P384_PRIV = 0x1307
export const CODE_P521_PRIV = 0x1308
export const CODE_BLS12_381_G1_PRIV = 0x1309
export const CODE_BLS12_381_G2_PRIV = 0x130a
export const CODE_BLS12_381_G1G2_PRIV = 0x130b
export const CODE_BLS12_381_G1_PUB_SHARE = 0x130c
export const CODE_BLS12_381_G2_PUB_SHARE = 0x130d
export const CODE_BLS12_381_G1_PRIV_SHARE = 0x130e
export const CODE_BLS12_381_G2_PRIV_SHARE = 0x130f
export const CODE_SM2_PRIV = 0x1310
export const CODE_ED448_PRIV = 0x1311
export const CODE_X448_PRIV = 0x1312
export const CODE_MLKEM_512_PRIV = 0x1313
export const CODE_MLKEM_768_PRIV = 0x1314
export const CODE_MLKEM_1024_PRIV = 0x1315
export const CODE_JWK_JCS_PRIV = 0x1316
export const CODE_LAMPORT_SHA3_512_PUB = 0x1a14
export const CODE_LAMPORT_SHA3_384_PUB = 0x1a15
export const CODE_LAMPORT_SHA3_256_PUB = 0x1a16
export const CODE_LAMPORT_SHA3_512_PRIV = 0x1a24
export const CODE_LAMPORT_SHA3_384_PRIV = 0x1a25
export const CODE_LAMPORT_SHA3_256_PRIV = 0x1a26
export const CODE_LAMPORT_SHA3_512_PRIV_SHARE = 0x1a34
export const CODE_LAMPORT_SHA3_384_PRIV_SHARE = 0x1a35
export const CODE_LAMPORT_SHA3_256_PRIV_SHARE = 0x1a36
export const CODE_LAMPORT_SHA3_512_SIG = 0x1a44
export const CODE_LAMPORT_SHA3_384_SIG = 0x1a45
export const CODE_LAMPORT_SHA3_256_SIG = 0x1a46
export const CODE_LAMPORT_SHA3_512_SIG_SHARE = 0x1a54
export const CODE_LAMPORT_SHA3_384_SIG_SHARE = 0x1a55
export const CODE_LAMPORT_SHA3_256_SIG_SHARE = 0x1a56
export const CODE_KANGAROOTWELVE = 0x1d01
export const CODE_AES_GCM_256 = 0x2000
export const CODE_SILVERPINE = 0x3f42
export const CODE_SM3_256 = 0x534d
export const CODE_SHA256A = 0x7012
export const CODE_CHACHA20_POLY1305 = 0xa000
export const CODE_BLAKE2B_8 = 0xb201
export const CODE_BLAKE2B_16 = 0xb202
export const CODE_BLAKE2B_24 = 0xb203
export const CODE_BLAKE2B_32 = 0xb204
export const CODE_BLAKE2B_40 = 0xb205
export const CODE_BLAKE2B_48 = 0xb206
export const CODE_BLAKE2B_56 = 0xb207
export const CODE_BLAKE2B_64 = 0xb208
export const CODE_BLAKE2B_72 = 0xb209
export const CODE_BLAKE2B_80 = 0xb20a
export const CODE_BLAKE2B_88 = 0xb20b
export const CODE_BLAKE2B_96 = 0xb20c
export const CODE_BLAKE2B_104 = 0xb20d
export const CODE_BLAKE2B_112 = 0xb20e
export const CODE_BLAKE2B_120 = 0xb20f
export const CODE_BLAKE2B_128 = 0xb210
export const CODE_BLAKE2B_136 = 0xb211
export const CODE_BLAKE2B_144 = 0xb212
export const CODE_BLAKE2B_152 = 0xb213
export const CODE_BLAKE2B_160 = 0xb214
export const CODE_BLAKE2B_168 = 0xb215
export const CODE_BLAKE2B_176 = 0xb216
export const CODE_BLAKE2B_184 = 0xb217
export const CODE_BLAKE2B_192 = 0xb218
export const CODE_BLAKE2B_200 = 0xb219
export const CODE_BLAKE2B_208 = 0xb21a
export const CODE_BLAKE2B_216 = 0xb21b
export const CODE_BLAKE2B_224 = 0xb21c
export const CODE_BLAKE2B_232 = 0xb21d
export const CODE_BLAKE2B_240 = 0xb21e
export const CODE_BLAKE2B_248 = 0xb21f
export const CODE_BLAKE2B_256 = 0xb220
export const CODE_BLAKE2B_264 = 0xb221
export const CODE_BLAKE2B_272 = 0xb222
export const CODE_BLAKE2B_280 = 0xb223
export const CODE_BLAKE2B_288 = 0xb224
export const CODE_BLAKE2B_296 = 0xb225
export const CODE_BLAKE2B_304 = 0xb226
export const CODE_BLAKE2B_312 = 0xb227
export const CODE_BLAKE2B_320 = 0xb228
export const CODE_BLAKE2B_328 = 0xb229
export const CODE_BLAKE2B_336 = 0xb22a
export const CODE_BLAKE2B_344 = 0xb22b
export const CODE_BLAKE2B_352 = 0xb22c
export const CODE_BLAKE2B_360 = 0xb22d
export const CODE_BLAKE2B_368 = 0xb22e
export const CODE_BLAKE2B_376 = 0xb22f
export const CODE_BLAKE2B_384 = 0xb230
export const CODE_BLAKE2B_392 = 0xb231
export const CODE_BLAKE2B_400 = 0xb232
export const CODE_BLAKE2B_408 = 0xb233
export const CODE_BLAKE2B_416 = 0xb234
export const CODE_BLAKE2B_424 = 0xb235
export const CODE_BLAKE2B_432 = 0xb236
export const CODE_BLAKE2B_440 = 0xb237
export const CODE_BLAKE2B_448 = 0xb238
export const CODE_BLAKE2B_456 = 0xb239
export const CODE_BLAKE2B_464 = 0xb23a
export const CODE_BLAKE2B_472 = 0xb23b
export const CODE_BLAKE2B_480 = 0xb23c
export const CODE_BLAKE2B_488 = 0xb23d
export const CODE_BLAKE2B_496 = 0xb23e
export const CODE_BLAKE2B_504 = 0xb23f
export const CODE_BLAKE2B_512 = 0xb240
export const CODE_BLAKE2S_8 = 0xb241
export const CODE_BLAKE2S_16 = 0xb242
export const CODE_BLAKE2S_24 = 0xb243
export const CODE_BLAKE2S_32 = 0xb244
export const CODE_BLAKE2S_40 = 0xb245
export const CODE_BLAKE2S_48 = 0xb246
export const CODE_BLAKE2S_56 = 0xb247
export const CODE_BLAKE2S_64 = 0xb248
export const CODE_BLAKE2S_72 = 0xb249
export const CODE_BLAKE2S_80 = 0xb24a
export const CODE_BLAKE2S_88 = 0xb24b
export const CODE_BLAKE2S_96 = 0xb24c
export const CODE_BLAKE2S_104 = 0xb24d
export const CODE_BLAKE2S_112 = 0xb24e
export const CODE_BLAKE2S_120 = 0xb24f
export const CODE_BLAKE2S_128 = 0xb250
export const CODE_BLAKE2S_136 = 0xb251
export const CODE_BLAKE2S_144 = 0xb252
export const CODE_BLAKE2S_152 = 0xb253
export const CODE_BLAKE2S_160 = 0xb254
export const CODE_BLAKE2S_168 = 0xb255
export const CODE_BLAKE2S_176 = 0xb256
export const CODE_BLAKE2S_184 = 0xb257
export const CODE_BLAKE2S_192 = 0xb258
export const CODE_BLAKE2S_200 = 0xb259
export const CODE_BLAKE2S_208 = 0xb25a
export const CODE_BLAKE2S_216 = 0xb25b
export const CODE_BLAKE2S_224 = 0xb25c
export const CODE_BLAKE2S_232 = 0xb25d
export const CODE_BLAKE2S_240 = 0xb25e
export const CODE_BLAKE2S_248 = 0xb25f
export const CODE_BLAKE2S_256 = 0xb260
export const CODE_SKEIN256_8 = 0xb301
export const CODE_SKEIN256_16 = 0xb302
export const CODE_SKEIN256_24 = 0xb303
export const CODE_SKEIN256_32 = 0xb304
export const CODE_SKEIN256_40 = 0xb305
export const CODE_SKEIN256_48 = 0xb306
export const CODE_SKEIN256_56 = 0xb307
export const CODE_SKEIN256_64 = 0xb308
export const CODE_SKEIN256_72 = 0xb309
export const CODE_SKEIN256_80 = 0xb30a
export const CODE_SKEIN256_88 = 0xb30b
export const CODE_SKEIN256_96 = 0xb30c
export const CODE_SKEIN256_104 = 0xb30d
export const CODE_SKEIN256_112 = 0xb30e
export const CODE_SKEIN256_120 = 0xb30f
export const CODE_SKEIN256_128 = 0xb310
export const CODE_SKEIN256_136 = 0xb311
export const CODE_SKEIN256_144 = 0xb312
export const CODE_SKEIN256_152 = 0xb313
export const CODE_SKEIN256_160 = 0xb314
export const CODE_SKEIN256_168 = 0xb315
export const CODE_SKEIN256_176 = 0xb316
export const CODE_SKEIN256_184 = 0xb317
export const CODE_SKEIN256_192 = 0xb318
export const CODE_SKEIN256_200 = 0xb319
export const CODE_SKEIN256_208 = 0xb31a
export const CODE_SKEIN256_216 = 0xb31b
export const CODE_SKEIN256_224 = 0xb31c
export const CODE_SKEIN256_232 = 0xb31d
export const CODE_SKEIN256_240 = 0xb31e
export const CODE_SKEIN256_248 = 0xb31f
export const CODE_SKEIN256_256 = 0xb320
export const CODE_SKEIN512_8 = 0xb321
export const CODE_SKEIN512_16 = 0xb322
export const CODE_SKEIN512_24 = 0xb323
export const CODE_SKEIN512_32 = 0xb324
export const CODE_SKEIN512_40 = 0xb325
export const CODE_SKEIN512_48 = 0xb326
export const CODE_SKEIN512_56 = 0xb327
export const CODE_SKEIN512_64 = 0xb328
export const CODE_SKEIN512_72 = 0xb329
export const CODE_SKEIN512_80 = 0xb32a
export const CODE_SKEIN512_88 = 0xb32b
export const CODE_SKEIN512_96 = 0xb32c
export const CODE_SKEIN512_104 = 0xb32d
export const CODE_SKEIN512_112 = 0xb32e
export const CODE_SKEIN512_120 = 0xb32f
export const CODE_SKEIN512_128 = 0xb330
export const CODE_SKEIN512_136 = 0xb331
export const CODE_SKEIN512_144 = 0xb332
export const CODE_SKEIN512_152 = 0xb333
export const CODE_SKEIN512_160 = 0xb334
export const CODE_SKEIN512_168 = 0xb335
export const CODE_SKEIN512_176 = 0xb336
export const CODE_SKEIN512_184 = 0xb337
export const CODE_SKEIN512_192 = 0xb338
export const CODE_SKEIN512_200 = 0xb339
export const CODE_SKEIN512_208 = 0xb33a
export const CODE_SKEIN512_216 = 0xb33b
export const CODE_SKEIN512_224 = 0xb33c
export const CODE_SKEIN512_232 = 0xb33d
export const CODE_SKEIN512_240 = 0xb33e
export const CODE_SKEIN512_248 = 0xb33f
export const CODE_SKEIN512_256 = 0xb340
export const CODE_SKEIN512_264 = 0xb341
export const CODE_SKEIN512_272 = 0xb342
export const CODE_SKEIN512_280 = 0xb343
export const CODE_SKEIN512_288 = 0xb344
export const CODE_SKEIN512_296 = 0xb345
export const CODE_SKEIN512_304 = 0xb346
export const CODE_SKEIN512_312 = 0xb347
export const CODE_SKEIN512_320 = 0xb348
export const CODE_SKEIN512_328 = 0xb349
export const CODE_SKEIN512_336 = 0xb34a
export const CODE_SKEIN512_344 = 0xb34b
export const CODE_SKEIN512_352 = 0xb34c
export const CODE_SKEIN512_360 = 0xb34d
export const CODE_SKEIN512_368 = 0xb34e
export const CODE_SKEIN512_376 = 0xb34f
export const CODE_SKEIN512_384 = 0xb350
export const CODE_SKEIN512_392 = 0xb351
export const CODE_SKEIN512_400 = 0xb352
export const CODE_SKEIN512_408 = 0xb353
export const CODE_SKEIN512_416 = 0xb354
export const CODE_SKEIN512_424 = 0xb355
export const CODE_SKEIN512_432 = 0xb356
export const CODE_SKEIN512_440 = 0xb357
export const CODE_SKEIN512_448 = 0xb358
export const CODE_SKEIN512_456 = 0xb359
export const CODE_SKEIN512_464 = 0xb35a
export const CODE_SKEIN512_472 = 0xb35b
export const CODE_SKEIN512_480 = 0xb35c
export const CODE_SKEIN512_488 = 0xb35d
export const CODE_SKEIN512_496 = 0xb35e
export const CODE_SKEIN512_504 = 0xb35f
export const CODE_SKEIN512_512 = 0xb360
export const CODE_SKEIN1024_8 = 0xb361
export const CODE_SKEIN1024_16 = 0xb362
export const CODE_SKEIN1024_24 = 0xb363
export const CODE_SKEIN1024_32 = 0xb364
export const CODE_SKEIN1024_40 = 0xb365
export const CODE_SKEIN1024_48 = 0xb366
export const CODE_SKEIN1024_56 = 0xb367
export const CODE_SKEIN1024_64 = 0xb368
export const CODE_SKEIN1024_72 = 0xb369
export const CODE_SKEIN1024_80 = 0xb36a
export const CODE_SKEIN1024_88 = 0xb36b
export const CODE_SKEIN1024_96 = 0xb36c
export const CODE_SKEIN1024_104 = 0xb36d
export const CODE_SKEIN1024_112 = 0xb36e
export const CODE_SKEIN1024_120 = 0xb36f
export const CODE_SKEIN1024_128 = 0xb370
export const CODE_SKEIN1024_136 = 0xb371
export const CODE_SKEIN1024_144 = 0xb372
export const CODE_SKEIN1024_152 = 0xb373
export const CODE_SKEIN1024_160 = 0xb374
export const CODE_SKEIN1024_168 = 0xb375
export const CODE_SKEIN1024_176 = 0xb376
export const CODE_SKEIN1024_184 = 0xb377
export const CODE_SKEIN1024_192 = 0xb378
export const CODE_SKEIN1024_200 = 0xb379
export const CODE_SKEIN1024_208 = 0xb37a
export const CODE_SKEIN1024_216 = 0xb37b
export const CODE_SKEIN1024_224 = 0xb37c
export const CODE_SKEIN1024_232 = 0xb37d
export const CODE_SKEIN1024_240 = 0xb37e
export const CODE_SKEIN1024_248 = 0xb37f
export const CODE_SKEIN1024_256 = 0xb380
export const CODE_SKEIN1024_264 = 0xb381
export const CODE_SKEIN1024_272 = 0xb382
export const CODE_SKEIN1024_280 = 0xb383
export const CODE_SKEIN1024_288 = 0xb384
export const CODE_SKEIN1024_296 = 0xb385
export const CODE_SKEIN1024_304 = 0xb386
export const CODE_SKEIN1024_312 = 0xb387
export const CODE_SKEIN1024_320 = 0xb388
export const CODE_SKEIN1024_328 = 0xb389
export const CODE_SKEIN1024_336 = 0xb38a
export const CODE_SKEIN1024_344 = 0xb38b
export const CODE_SKEIN1024_352 = 0xb38c
export const CODE_SKEIN1024_360 = 0xb38d
export const CODE_SKEIN1024_368 = 0xb38e
export const CODE_SKEIN1024_376 = 0xb38f
export const CODE_SKEIN1024_384 = 0xb390
export const CODE_SKEIN1024_392 = 0xb391
export const CODE_SKEIN1024_400 = 0xb392
export const CODE_SKEIN1024_408 = 0xb393
export const CODE_SKEIN1024_416 = 0xb394
export const CODE_SKEIN1024_424 = 0xb395
export const CODE_SKEIN1024_432 = 0xb396
export const CODE_SKEIN1024_440 = 0xb397
export const CODE_SKEIN1024_448 = 0xb398
export const CODE_SKEIN1024_456 = 0xb399
export const CODE_SKEIN1024_464 = 0xb39a
export const CODE_SKEIN1024_472 = 0xb39b
export const CODE_SKEIN1024_480 = 0xb39c
export const CODE_SKEIN1024_488 = 0xb39d
export const CODE_SKEIN1024_496 = 0xb39e
export const CODE_SKEIN1024_504 = 0xb39f
export const CODE_SKEIN1024_512 = 0xb3a0
export const CODE_SKEIN1024_520 = 0xb3a1
export const CODE_SKEIN1024_528 = 0xb3a2
export const CODE_SKEIN1024_536 = 0xb3a3
export const CODE_SKEIN1024_544 = 0xb3a4
export const CODE_SKEIN1024_552 = 0xb3a5
export const CODE_SKEIN1024_560 = 0xb3a6
export const CODE_SKEIN1024_568 = 0xb3a7
export const CODE_SKEIN1024_576 = 0xb3a8
export const CODE_SKEIN1024_584 = 0xb3a9
export const CODE_SKEIN1024_592 = 0xb3aa
export const CODE_SKEIN1024_600 = 0xb3ab
export const CODE_SKEIN1024_608 = 0xb3ac
export const CODE_SKEIN1024_616 = 0xb3ad
export const CODE_SKEIN1024_624 = 0xb3ae
export const CODE_SKEIN1024_632 = 0xb3af
export const CODE_SKEIN1024_640 = 0xb3b0
export const CODE_SKEIN1024_648 = 0xb3b1
export const CODE_SKEIN1024_656 = 0xb3b2
export const CODE_SKEIN1024_664 = 0xb3b3
export const CODE_SKEIN1024_672 = 0xb3b4
export const CODE_SKEIN1024_680 = 0xb3b5
export const CODE_SKEIN1024_688 = 0xb3b6
export const CODE_SKEIN1024_696 = 0xb3b7
export const CODE_SKEIN1024_704 = 0xb3b8
export const CODE_SKEIN1024_712 = 0xb3b9
export const CODE_SKEIN1024_720 = 0xb3ba
export const CODE_SKEIN1024_728 = 0xb3bb
export const CODE_SKEIN1024_736 = 0xb3bc
export const CODE_SKEIN1024_744 = 0xb3bd
export const CODE_SKEIN1024_752 = 0xb3be
export const CODE_SKEIN1024_760 = 0xb3bf
export const CODE_SKEIN1024_768 = 0xb3c0
export const CODE_SKEIN1024_776 = 0xb3c1
export const CODE_SKEIN1024_784 = 0xb3c2
export const CODE_SKEIN1024_792 = 0xb3c3
export const CODE_SKEIN1024_800 = 0xb3c4
export const CODE_SKEIN1024_808 = 0xb3c5
export const CODE_SKEIN1024_816 = 0xb3c6
export const CODE_SKEIN1024_824 = 0xb3c7
export const CODE_SKEIN1024_832 = 0xb3c8
export const CODE_SKEIN1024_840 = 0xb3c9
export const CODE_SKEIN1024_848 = 0xb3ca
export const CODE_SKEIN1024_856 = 0xb3cb
export const CODE_SKEIN1024_864 = 0xb3cc
export const CODE_SKEIN1024_872 = 0xb3cd
export const CODE_SKEIN1024_880 = 0xb3ce
export const CODE_SKEIN1024_888 = 0xb3cf
export const CODE_SKEIN1024_896 = 0xb3d0
export const CODE_SKEIN1024_904 = 0xb3d1
export const CODE_SKEIN1024_912 = 0xb3d2
export const CODE_SKEIN1024_920 = 0xb3d3
export const CODE_SKEIN1024_928 = 0xb3d4
export const CODE_SKEIN1024_936 = 0xb3d5
export const CODE_SKEIN1024_944 = 0xb3d6
export const CODE_SKEIN1024_952 = 0xb3d7
export const CODE_SKEIN1024_960 = 0xb3d8
export const CODE_SKEIN1024_968 = 0xb3d9
export const CODE_SKEIN1024_976 = 0xb3da
export const CODE_SKEIN1024_984 = 0xb3db
export const CODE_SKEIN1024_992 = 0xb3dc
export const CODE_SKEIN1024_1000 = 0xb3dd
export const CODE_SKEIN1024_1008 = 0xb3de
export const CODE_SKEIN1024_1016 = 0xb3df
export const CODE_SKEIN1024_1024 = 0xb3e0
export const CODE_XXH_32 = 0xb3e1
export const CODE_XXH_64 = 0xb3e2
export const CODE_XXH3_64 = 0xb3e3
export const CODE_XXH3_128 = 0xb3e4
export const CODE_POSEIDON_BLS12_381_A2_FC1 = 0xb401
export const CODE_POSEIDON_BLS12_381_A2_FC1_SC = 0xb402
export const CODE_RDFC_1 = 0xb403
export const CODE_SSZ = 0xb501
export const CODE_SSZ_SHA2_256_BMT = 0xb502
export const CODE_SHA2_256_CHUNKED = 0xb510
export const CODE_JSON_JCS = 0xb601
export const CODE_BITTORRENT_PIECES_ROOT = 0xb702
export const CODE_ISCC = 0xcc01
export const CODE_ZEROXCERT_IMPRINT_256 = 0xce11
export const CODE_NONSTANDARD_SIG = 0xd000
export const CODE_BCRYPT_PBKDF = 0xd00d
export const CODE_ES256K = 0xd0e7
export const CODE_BLS12_381_G1_SIG = 0xd0ea
export const CODE_BLS12_381_G2_SIG = 0xd0eb
export const CODE_EDDSA = 0xd0ed
export const CODE_EIP_191 = 0xd191
export const CODE_JWK_JCS_PUB = 0xeb51
export const CODE_ED2K = 0xed20
export const CODE_FIL_COMMITMENT_UNSEALED = 0xf101
export const CODE_FIL_COMMITMENT_SEALED = 0xf102
export const CODE_SHELTER_CONTRACT_MANIFEST = 0x511e00
export const CODE_SHELTER_CONTRACT_TEXT = 0x511e01
export const CODE_SHELTER_CONTRACT_DATA = 0x511e02
export const CODE_SHELTER_FILE_MANIFEST = 0x511e03
export const CODE_SHELTER_FILE_CHUNK = 0x511e04
export const CODE_PLAINTEXTV2 = 0x706c61
export const CODE_HOLOCHAIN_ADR_V0 = 0x807124
export const CODE_HOLOCHAIN_ADR_V1 = 0x817124
export const CODE_HOLOCHAIN_KEY_V0 = 0x947124
export const CODE_HOLOCHAIN_KEY_V1 = 0x957124
export const CODE_HOLOCHAIN_SIG_V0 = 0xa27124
export const CODE_HOLOCHAIN_SIG_V1 = 0xa37124
export const CODE_SKYNET_NS = 0xb19910
export const CODE_ARWEAVE_NS = 0xb29910
export const CODE_SUBSPACE_NS = 0xb39910
export const CODE_KUMANDRA_NS = 0xb49910
export const CODE_ES256 = 0xd01200
export const CODE_ES384 = 0xd01201
export const CODE_ES512 = 0xd01202
export const CODE_RS256 = 0xd01205
export const CODE_ES256K_MSIG = 0xd01300
export const CODE_BLS12_381_G1_MSIG = 0xd01301
export const CODE_BLS12_381_G2_MSIG = 0xd01302
export const CODE_EDDSA_MSIG = 0xd01303
export const CODE_BLS12_381_G1_SHARE_MSIG = 0xd01304
export const CODE_BLS12_381_G2_SHARE_MSIG = 0xd01305
export const CODE_LAMPORT_MSIG = 0xd01306
export const CODE_LAMPORT_SHARE_MSIG = 0xd01307
export const CODE_ES256_MSIG = 0xd01308
export const CODE_ES384_MSIG = 0xd01309
export const CODE_ES521_MSIG = 0xd0130a
export const CODE_RS256_MSIG = 0xd0130b
export const CODE_SCION = 0xd02000

export const CODEC_IDENTITY: Multicodec = {
  name: 'identity',
  code: CODE_IDENTITY,
  description: 'raw binary'
}

export const CODEC_CIDV1: Multicodec = {
  name: 'cidv1',
  code: CODE_CIDV1,
  description: 'CIDv1'
}

export const CODEC_CIDV2: Multicodec = {
  name: 'cidv2',
  code: CODE_CIDV2,
  description: 'CIDv2'
}

export const CODEC_CIDV3: Multicodec = {
  name: 'cidv3',
  code: CODE_CIDV3,
  description: 'CIDv3'
}

export const CODEC_IP4: Multicodec = {
  name: 'ip4',
  code: CODE_IP4
}

export const CODEC_TCP: Multicodec = {
  name: 'tcp',
  code: CODE_TCP
}

export const CODEC_SHA1: Multicodec = {
  name: 'sha1',
  code: CODE_SHA1
}

export const CODEC_SHA2_256: Multicodec = {
  name: 'sha2-256',
  code: CODE_SHA2_256
}

export const CODEC_SHA2_512: Multicodec = {
  name: 'sha2-512',
  code: CODE_SHA2_512
}

export const CODEC_SHA3_512: Multicodec = {
  name: 'sha3-512',
  code: CODE_SHA3_512
}

export const CODEC_SHA3_384: Multicodec = {
  name: 'sha3-384',
  code: CODE_SHA3_384
}

export const CODEC_SHA3_256: Multicodec = {
  name: 'sha3-256',
  code: CODE_SHA3_256
}

export const CODEC_SHA3_224: Multicodec = {
  name: 'sha3-224',
  code: CODE_SHA3_224
}

export const CODEC_SHAKE_128: Multicodec = {
  name: 'shake-128',
  code: CODE_SHAKE_128
}

export const CODEC_SHAKE_256: Multicodec = {
  name: 'shake-256',
  code: CODE_SHAKE_256
}

export const CODEC_KECCAK_224: Multicodec = {
  name: 'keccak-224',
  code: CODE_KECCAK_224,
  description: 'keccak has variable output length. The number specifies the core length'
}

export const CODEC_KECCAK_256: Multicodec = {
  name: 'keccak-256',
  code: CODE_KECCAK_256
}

export const CODEC_KECCAK_384: Multicodec = {
  name: 'keccak-384',
  code: CODE_KECCAK_384
}

export const CODEC_KECCAK_512: Multicodec = {
  name: 'keccak-512',
  code: CODE_KECCAK_512
}

export const CODEC_BLAKE3: Multicodec = {
  name: 'blake3',
  code: CODE_BLAKE3,
  description: 'BLAKE3 has a default 32 byte output length. The maximum length is (2^64)-1 bytes.'
}

export const CODEC_SHA2_384: Multicodec = {
  name: 'sha2-384',
  code: CODE_SHA2_384,
  description: 'aka SHA-384; as specified by FIPS 180-4.'
}

export const CODEC_DCCP: Multicodec = {
  name: 'dccp',
  code: CODE_DCCP
}

export const CODEC_MURMUR3_X64_64: Multicodec = {
  name: 'murmur3-x64-64',
  code: CODE_MURMUR3_X64_64,
  description: 'The first 64-bits of a murmur3-x64-128 - used for UnixFS directory sharding.'
}

export const CODEC_MURMUR3_32: Multicodec = {
  name: 'murmur3-32',
  code: CODE_MURMUR3_32
}

export const CODEC_IP6: Multicodec = {
  name: 'ip6',
  code: CODE_IP6
}

export const CODEC_IP6ZONE: Multicodec = {
  name: 'ip6zone',
  code: CODE_IP6ZONE
}

export const CODEC_IPCIDR: Multicodec = {
  name: 'ipcidr',
  code: CODE_IPCIDR,
  description: 'CIDR mask for IP addresses'
}

export const CODEC_PATH: Multicodec = {
  name: 'path',
  code: CODE_PATH,
  description: 'Namespace for string paths. Corresponds to `/` in ASCII.'
}

export const CODEC_MULTICODEC: Multicodec = {
  name: 'multicodec',
  code: CODE_MULTICODEC
}

export const CODEC_MULTIHASH: Multicodec = {
  name: 'multihash',
  code: CODE_MULTIHASH
}

export const CODEC_MULTIADDR: Multicodec = {
  name: 'multiaddr',
  code: CODE_MULTIADDR
}

export const CODEC_MULTIBASE: Multicodec = {
  name: 'multibase',
  code: CODE_MULTIBASE
}

export const CODEC_VARSIG: Multicodec = {
  name: 'varsig',
  code: CODE_VARSIG,
  description: 'Variable signature (varsig) multiformat'
}

export const CODEC_DNS: Multicodec = {
  name: 'dns',
  code: CODE_DNS
}

export const CODEC_DNS4: Multicodec = {
  name: 'dns4',
  code: CODE_DNS4
}

export const CODEC_DNS6: Multicodec = {
  name: 'dns6',
  code: CODE_DNS6
}

export const CODEC_DNSADDR: Multicodec = {
  name: 'dnsaddr',
  code: CODE_DNSADDR
}

export const CODEC_PROTOBUF: Multicodec = {
  name: 'protobuf',
  code: CODE_PROTOBUF,
  description: 'Protocol Buffers'
}

export const CODEC_CBOR: Multicodec = {
  name: 'cbor',
  code: CODE_CBOR,
  description: 'CBOR'
}

export const CODEC_RAW: Multicodec = {
  name: 'raw',
  code: CODE_RAW,
  description: 'raw binary'
}

export const CODEC_DBL_SHA2_256: Multicodec = {
  name: 'dbl-sha2-256',
  code: CODE_DBL_SHA2_256
}

export const CODEC_RLP: Multicodec = {
  name: 'rlp',
  code: CODE_RLP,
  description: 'recursive length prefix'
}

export const CODEC_BENCODE: Multicodec = {
  name: 'bencode',
  code: CODE_BENCODE,
  description: 'bencode'
}

export const CODEC_DAG_PB: Multicodec = {
  name: 'dag-pb',
  code: CODE_DAG_PB,
  description: 'MerkleDAG protobuf'
}

export const CODEC_DAG_CBOR: Multicodec = {
  name: 'dag-cbor',
  code: CODE_DAG_CBOR,
  description: 'MerkleDAG cbor'
}

export const CODEC_LIBP2P_KEY: Multicodec = {
  name: 'libp2p-key',
  code: CODE_LIBP2P_KEY,
  description: 'Libp2p Public Key'
}

export const CODEC_GIT_RAW: Multicodec = {
  name: 'git-raw',
  code: CODE_GIT_RAW,
  description: 'Raw Git object'
}

export const CODEC_TORRENT_INFO: Multicodec = {
  name: 'torrent-info',
  code: CODE_TORRENT_INFO,
  description: 'Torrent file info field (bencoded)'
}

export const CODEC_TORRENT_FILE: Multicodec = {
  name: 'torrent-file',
  code: CODE_TORRENT_FILE,
  description: 'Torrent file (bencoded)'
}

export const CODEC_BLAKE3_HASHSEQ: Multicodec = {
  name: 'blake3-hashseq',
  code: CODE_BLAKE3_HASHSEQ,
  description: 'BLAKE3 hash sequence - per Iroh collections spec'
}

export const CODEC_LEOFCOIN_BLOCK: Multicodec = {
  name: 'leofcoin-block',
  code: CODE_LEOFCOIN_BLOCK,
  description: 'Leofcoin Block'
}

export const CODEC_LEOFCOIN_TX: Multicodec = {
  name: 'leofcoin-tx',
  code: CODE_LEOFCOIN_TX,
  description: 'Leofcoin Transaction'
}

export const CODEC_LEOFCOIN_PR: Multicodec = {
  name: 'leofcoin-pr',
  code: CODE_LEOFCOIN_PR,
  description: 'Leofcoin Peer Reputation'
}

export const CODEC_SCTP: Multicodec = {
  name: 'sctp',
  code: CODE_SCTP
}

export const CODEC_DAG_JOSE: Multicodec = {
  name: 'dag-jose',
  code: CODE_DAG_JOSE,
  description: 'MerkleDAG JOSE'
}

export const CODEC_DAG_COSE: Multicodec = {
  name: 'dag-cose',
  code: CODE_DAG_COSE,
  description: 'MerkleDAG COSE'
}

export const CODEC_LBRY: Multicodec = {
  name: 'lbry',
  code: CODE_LBRY,
  description: 'LBRY Address'
}

export const CODEC_ETH_BLOCK: Multicodec = {
  name: 'eth-block',
  code: CODE_ETH_BLOCK,
  description: 'Ethereum Header (RLP)'
}

export const CODEC_ETH_BLOCK_LIST: Multicodec = {
  name: 'eth-block-list',
  code: CODE_ETH_BLOCK_LIST,
  description: 'Ethereum Header List (RLP)'
}

export const CODEC_ETH_TX_TRIE: Multicodec = {
  name: 'eth-tx-trie',
  code: CODE_ETH_TX_TRIE,
  description: 'Ethereum Transaction Trie (Eth-Trie)'
}

export const CODEC_ETH_TX: Multicodec = {
  name: 'eth-tx',
  code: CODE_ETH_TX,
  description: 'Ethereum Transaction (MarshalBinary)'
}

export const CODEC_ETH_TX_RECEIPT_TRIE: Multicodec = {
  name: 'eth-tx-receipt-trie',
  code: CODE_ETH_TX_RECEIPT_TRIE,
  description: 'Ethereum Transaction Receipt Trie (Eth-Trie)'
}

export const CODEC_ETH_TX_RECEIPT: Multicodec = {
  name: 'eth-tx-receipt',
  code: CODE_ETH_TX_RECEIPT,
  description: 'Ethereum Transaction Receipt (MarshalBinary)'
}

export const CODEC_ETH_STATE_TRIE: Multicodec = {
  name: 'eth-state-trie',
  code: CODE_ETH_STATE_TRIE,
  description: 'Ethereum State Trie (Eth-Secure-Trie)'
}

export const CODEC_ETH_ACCOUNT_SNAPSHOT: Multicodec = {
  name: 'eth-account-snapshot',
  code: CODE_ETH_ACCOUNT_SNAPSHOT,
  description: 'Ethereum Account Snapshot (RLP)'
}

export const CODEC_ETH_STORAGE_TRIE: Multicodec = {
  name: 'eth-storage-trie',
  code: CODE_ETH_STORAGE_TRIE,
  description: 'Ethereum Contract Storage Trie (Eth-Secure-Trie)'
}

export const CODEC_ETH_RECEIPT_LOG_TRIE: Multicodec = {
  name: 'eth-receipt-log-trie',
  code: CODE_ETH_RECEIPT_LOG_TRIE,
  description: 'Ethereum Transaction Receipt Log Trie (Eth-Trie)'
}

export const CODEC_ETH_RECEIPT_LOG: Multicodec = {
  name: 'eth-receipt-log',
  code: CODE_ETH_RECEIPT_LOG,
  description: 'Ethereum Transaction Receipt Log (RLP)'
}

export const CODEC_AES_128: Multicodec = {
  name: 'aes-128',
  code: CODE_AES_128,
  description: '128-bit AES symmetric key'
}

export const CODEC_AES_192: Multicodec = {
  name: 'aes-192',
  code: CODE_AES_192,
  description: '192-bit AES symmetric key'
}

export const CODEC_AES_256: Multicodec = {
  name: 'aes-256',
  code: CODE_AES_256,
  description: '256-bit AES symmetric key'
}

export const CODEC_CHACHA_128: Multicodec = {
  name: 'chacha-128',
  code: CODE_CHACHA_128,
  description: '128-bit ChaCha symmetric key'
}

export const CODEC_CHACHA_256: Multicodec = {
  name: 'chacha-256',
  code: CODE_CHACHA_256,
  description: '256-bit ChaCha symmetric key'
}

export const CODEC_BITCOIN_BLOCK: Multicodec = {
  name: 'bitcoin-block',
  code: CODE_BITCOIN_BLOCK,
  description: 'Bitcoin Block'
}

export const CODEC_BITCOIN_TX: Multicodec = {
  name: 'bitcoin-tx',
  code: CODE_BITCOIN_TX,
  description: 'Bitcoin Tx'
}

export const CODEC_BITCOIN_WITNESS_COMMITMENT: Multicodec = {
  name: 'bitcoin-witness-commitment',
  code: CODE_BITCOIN_WITNESS_COMMITMENT,
  description: 'Bitcoin Witness Commitment'
}

export const CODEC_ZCASH_BLOCK: Multicodec = {
  name: 'zcash-block',
  code: CODE_ZCASH_BLOCK,
  description: 'Zcash Block'
}

export const CODEC_ZCASH_TX: Multicodec = {
  name: 'zcash-tx',
  code: CODE_ZCASH_TX,
  description: 'Zcash Tx'
}

export const CODEC_CAIP_50: Multicodec = {
  name: 'caip-50',
  code: CODE_CAIP_50,
  description: 'CAIP-50 multi-chain account ID'
}

export const CODEC_STREAMID: Multicodec = {
  name: 'streamid',
  code: CODE_STREAMID,
  description: 'Ceramic Stream ID'
}

export const CODEC_STELLAR_BLOCK: Multicodec = {
  name: 'stellar-block',
  code: CODE_STELLAR_BLOCK,
  description: 'Stellar Block'
}

export const CODEC_STELLAR_TX: Multicodec = {
  name: 'stellar-tx',
  code: CODE_STELLAR_TX,
  description: 'Stellar Tx'
}

export const CODEC_MD4: Multicodec = {
  name: 'md4',
  code: CODE_MD4
}

export const CODEC_MD5: Multicodec = {
  name: 'md5',
  code: CODE_MD5
}

export const CODEC_DECRED_BLOCK: Multicodec = {
  name: 'decred-block',
  code: CODE_DECRED_BLOCK,
  description: 'Decred Block'
}

export const CODEC_DECRED_TX: Multicodec = {
  name: 'decred-tx',
  code: CODE_DECRED_TX,
  description: 'Decred Tx'
}

export const CODEC_IPLD: Multicodec = {
  name: 'ipld',
  code: CODE_IPLD,
  description: 'IPLD path'
}

export const CODEC_IPFS: Multicodec = {
  name: 'ipfs',
  code: CODE_IPFS,
  description: 'IPFS path'
}

export const CODEC_SWARM: Multicodec = {
  name: 'swarm',
  code: CODE_SWARM,
  description: 'Swarm path'
}

export const CODEC_IPNS: Multicodec = {
  name: 'ipns',
  code: CODE_IPNS,
  description: 'IPNS path'
}

export const CODEC_ZERONET: Multicodec = {
  name: 'zeronet',
  code: CODE_ZERONET,
  description: 'ZeroNet site address'
}

export const CODEC_SECP256K1_PUB: Multicodec = {
  name: 'secp256k1-pub',
  code: CODE_SECP256K1_PUB,
  description: 'Secp256k1 public key (compressed)'
}

export const CODEC_DNSLINK: Multicodec = {
  name: 'dnslink',
  code: CODE_DNSLINK,
  description: 'DNSLink path'
}

export const CODEC_BLS12_381_G1_PUB: Multicodec = {
  name: 'bls12_381-g1-pub',
  code: CODE_BLS12_381_G1_PUB,
  description: 'BLS12-381 public key in the G1 field'
}

export const CODEC_BLS12_381_G2_PUB: Multicodec = {
  name: 'bls12_381-g2-pub',
  code: CODE_BLS12_381_G2_PUB,
  description: 'BLS12-381 public key in the G2 field'
}

export const CODEC_X25519_PUB: Multicodec = {
  name: 'x25519-pub',
  code: CODE_X25519_PUB,
  description: 'Curve25519 public key'
}

export const CODEC_ED25519_PUB: Multicodec = {
  name: 'ed25519-pub',
  code: CODE_ED25519_PUB,
  description: 'Ed25519 public key'
}

export const CODEC_BLS12_381_G1G2_PUB: Multicodec = {
  name: 'bls12_381-g1g2-pub',
  code: CODE_BLS12_381_G1G2_PUB,
  description: 'BLS12-381 concatenated public keys in both the G1 and G2 fields'
}

export const CODEC_SR25519_PUB: Multicodec = {
  name: 'sr25519-pub',
  code: CODE_SR25519_PUB,
  description: 'Sr25519 public key'
}

export const CODEC_DASH_BLOCK: Multicodec = {
  name: 'dash-block',
  code: CODE_DASH_BLOCK,
  description: 'Dash Block'
}

export const CODEC_DASH_TX: Multicodec = {
  name: 'dash-tx',
  code: CODE_DASH_TX,
  description: 'Dash Tx'
}

export const CODEC_SWARM_MANIFEST: Multicodec = {
  name: 'swarm-manifest',
  code: CODE_SWARM_MANIFEST,
  description: 'Swarm Manifest'
}

export const CODEC_SWARM_FEED: Multicodec = {
  name: 'swarm-feed',
  code: CODE_SWARM_FEED,
  description: 'Swarm Feed'
}

export const CODEC_BEESON: Multicodec = {
  name: 'beeson',
  code: CODE_BEESON,
  description: 'Swarm BeeSon'
}

export const CODEC_UDP: Multicodec = {
  name: 'udp',
  code: CODE_UDP
}

export const CODEC_P2P_WEBRTC_STAR: Multicodec = {
  name: 'p2p-webrtc-star',
  code: CODE_P2P_WEBRTC_STAR,
  description: 'Use webrtc or webrtc-direct instead'
}

export const CODEC_P2P_WEBRTC_DIRECT: Multicodec = {
  name: 'p2p-webrtc-direct',
  code: CODE_P2P_WEBRTC_DIRECT,
  description: 'Use webrtc or webrtc-direct instead'
}

export const CODEC_P2P_STARDUST: Multicodec = {
  name: 'p2p-stardust',
  code: CODE_P2P_STARDUST
}

export const CODEC_WEBRTC_DIRECT: Multicodec = {
  name: 'webrtc-direct',
  code: CODE_WEBRTC_DIRECT,
  description: 'ICE-lite webrtc transport with SDP munging during connection establishment and without use of a STUN server'
}

export const CODEC_WEBRTC: Multicodec = {
  name: 'webrtc',
  code: CODE_WEBRTC,
  description: 'webrtc transport where connection establishment is according to w3c spec'
}

export const CODEC_P2P_CIRCUIT: Multicodec = {
  name: 'p2p-circuit',
  code: CODE_P2P_CIRCUIT
}

export const CODEC_DAG_JSON: Multicodec = {
  name: 'dag-json',
  code: CODE_DAG_JSON,
  description: 'MerkleDAG json'
}

export const CODEC_UDT: Multicodec = {
  name: 'udt',
  code: CODE_UDT
}

export const CODEC_UTP: Multicodec = {
  name: 'utp',
  code: CODE_UTP
}

export const CODEC_CRC32: Multicodec = {
  name: 'crc32',
  code: CODE_CRC32,
  description: 'CRC-32 non-cryptographic hash algorithm (IEEE 802.3)'
}

export const CODEC_CRC64_ECMA: Multicodec = {
  name: 'crc64-ecma',
  code: CODE_CRC64_ECMA,
  description: 'CRC-64 non-cryptographic hash algorithm (ECMA-182 - Annex B)'
}

export const CODEC_CRC64_NVME: Multicodec = {
  name: 'crc64-nvme',
  code: CODE_CRC64_NVME,
  description: 'CRC-64 checksum based on the NVME polynomial as specified in the NVM Express® NVM Command Set Specification'
}

export const CODEC_UNIX: Multicodec = {
  name: 'unix',
  code: CODE_UNIX
}

export const CODEC_THREAD: Multicodec = {
  name: 'thread',
  code: CODE_THREAD,
  description: 'Textile Thread'
}

export const CODEC_P2P: Multicodec = {
  name: 'p2p',
  code: CODE_P2P,
  description: 'libp2p'
}

export const CODEC_HTTPS: Multicodec = {
  name: 'https',
  code: CODE_HTTPS
}

export const CODEC_ONION: Multicodec = {
  name: 'onion',
  code: CODE_ONION
}

export const CODEC_ONION3: Multicodec = {
  name: 'onion3',
  code: CODE_ONION3
}

export const CODEC_GARLIC64: Multicodec = {
  name: 'garlic64',
  code: CODE_GARLIC64,
  description: 'I2P base64 (raw public key)'
}

export const CODEC_GARLIC32: Multicodec = {
  name: 'garlic32',
  code: CODE_GARLIC32,
  description: 'I2P base32 (hashed public key or encoded public key/checksum+optional secret)'
}

export const CODEC_TLS: Multicodec = {
  name: 'tls',
  code: CODE_TLS
}

export const CODEC_SNI: Multicodec = {
  name: 'sni',
  code: CODE_SNI,
  description: 'Server Name Indication RFC 6066 § 3'
}

export const CODEC_NOISE: Multicodec = {
  name: 'noise',
  code: CODE_NOISE
}

export const CODEC_SHS: Multicodec = {
  name: 'shs',
  code: CODE_SHS,
  description: 'Secure Scuttlebutt - Secret Handshake Stream'
}

export const CODEC_QUIC: Multicodec = {
  name: 'quic',
  code: CODE_QUIC
}

export const CODEC_QUIC_V1: Multicodec = {
  name: 'quic-v1',
  code: CODE_QUIC_V1
}

export const CODEC_WEBTRANSPORT: Multicodec = {
  name: 'webtransport',
  code: CODE_WEBTRANSPORT
}

export const CODEC_CERTHASH: Multicodec = {
  name: 'certhash',
  code: CODE_CERTHASH,
  description: 'TLS certificate\'s fingerprint as a multihash'
}

export const CODEC_WS: Multicodec = {
  name: 'ws',
  code: CODE_WS
}

export const CODEC_WSS: Multicodec = {
  name: 'wss',
  code: CODE_WSS
}

export const CODEC_P2P_WEBSOCKET_STAR: Multicodec = {
  name: 'p2p-websocket-star',
  code: CODE_P2P_WEBSOCKET_STAR
}

export const CODEC_HTTP: Multicodec = {
  name: 'http',
  code: CODE_HTTP
}

export const CODEC_HTTP_PATH: Multicodec = {
  name: 'http-path',
  code: CODE_HTTP_PATH,
  description: 'Percent-encoded path to an HTTP resource'
}

export const CODEC_SWHID_1_SNP: Multicodec = {
  name: 'swhid-1-snp',
  code: CODE_SWHID_1_SNP,
  description: 'SoftWare Heritage persistent IDentifier version 1 snapshot'
}

export const CODEC_JSON: Multicodec = {
  name: 'json',
  code: CODE_JSON,
  description: 'JSON (UTF-8-encoded)'
}

export const CODEC_MESSAGEPACK: Multicodec = {
  name: 'messagepack',
  code: CODE_MESSAGEPACK,
  description: 'MessagePack'
}

export const CODEC_CAR: Multicodec = {
  name: 'car',
  code: CODE_CAR,
  description: 'Content Addressable aRchive (CAR)'
}

export const CODEC_X509_CERTIFICATE: Multicodec = {
  name: 'x509-certificate',
  code: CODE_X509_CERTIFICATE,
  description: 'DER-encoded X.509 (PKIX) certificate per RFC 5280; single certificate only (no chain); raw DER bytes (not PEM)'
}

export const CODEC_IPNS_RECORD: Multicodec = {
  name: 'ipns-record',
  code: CODE_IPNS_RECORD,
  description: 'Signed IPNS Record'
}

export const CODEC_LIBP2P_PEER_RECORD: Multicodec = {
  name: 'libp2p-peer-record',
  code: CODE_LIBP2P_PEER_RECORD,
  description: 'libp2p peer record type'
}

export const CODEC_LIBP2P_RELAY_RSVP: Multicodec = {
  name: 'libp2p-relay-rsvp',
  code: CODE_LIBP2P_RELAY_RSVP,
  description: 'libp2p relay reservation voucher'
}

export const CODEC_MEMORYTRANSPORT: Multicodec = {
  name: 'memorytransport',
  code: CODE_MEMORYTRANSPORT,
  description: 'in memory transport for self-dialing and testing; arbitrary'
}

export const CODEC_CAR_INDEX_SORTED: Multicodec = {
  name: 'car-index-sorted',
  code: CODE_CAR_INDEX_SORTED,
  description: 'CARv2 IndexSorted index format'
}

export const CODEC_CAR_MULTIHASH_INDEX_SORTED: Multicodec = {
  name: 'car-multihash-index-sorted',
  code: CODE_CAR_MULTIHASH_INDEX_SORTED,
  description: 'CARv2 MultihashIndexSorted index format'
}

export const CODEC_TRANSPORT_BITSWAP: Multicodec = {
  name: 'transport-bitswap',
  code: CODE_TRANSPORT_BITSWAP,
  description: 'Bitswap datatransfer'
}

export const CODEC_TRANSPORT_GRAPHSYNC_FILECOINV1: Multicodec = {
  name: 'transport-graphsync-filecoinv1',
  code: CODE_TRANSPORT_GRAPHSYNC_FILECOINV1,
  description: 'Filecoin graphsync datatransfer'
}

export const CODEC_TRANSPORT_IPFS_GATEWAY_HTTP: Multicodec = {
  name: 'transport-ipfs-gateway-http',
  code: CODE_TRANSPORT_IPFS_GATEWAY_HTTP,
  description: 'HTTP IPFS Gateway trustless datatransfer'
}

export const CODEC_TRANSPORT_FILECOIN_PIECE_HTTP: Multicodec = {
  name: 'transport-filecoin-piece-http',
  code: CODE_TRANSPORT_FILECOIN_PIECE_HTTP,
  description: 'HTTP piece retrieval from Filecoin storage provider; https://github.com/filecoin-project/FIPs/blob/master/FRCs/frc-0066.md'
}

export const CODEC_MULTIDID: Multicodec = {
  name: 'multidid',
  code: CODE_MULTIDID,
  description: 'Compact encoding for Decentralized Identifers'
}

export const CODEC_FR32_SHA256_TRUNC254_PADBINTREE: Multicodec = {
  name: 'fr32-sha256-trunc254-padbintree',
  code: CODE_FR32_SHA256_TRUNC254_PADBINTREE,
  description: 'A balanced binary tree hash used in Filecoin Piece Commitments as described in FRC-0069'
}

export const CODEC_SHA2_256_TRUNC254_PADDED: Multicodec = {
  name: 'sha2-256-trunc254-padded',
  code: CODE_SHA2_256_TRUNC254_PADDED,
  description: 'SHA2-256 with the two most significant bits from the last byte zeroed (as via a mask with 0b00111111) - used for proving trees as in Filecoin'
}

export const CODEC_SHA2_224: Multicodec = {
  name: 'sha2-224',
  code: CODE_SHA2_224,
  description: 'aka SHA-224; as specified by FIPS 180-4.'
}

export const CODEC_SHA2_512_224: Multicodec = {
  name: 'sha2-512-224',
  code: CODE_SHA2_512_224,
  description: 'aka SHA-512/224; as specified by FIPS 180-4.'
}

export const CODEC_SHA2_512_256: Multicodec = {
  name: 'sha2-512-256',
  code: CODE_SHA2_512_256,
  description: 'aka SHA-512/256; as specified by FIPS 180-4.'
}

export const CODEC_MURMUR3_X64_128: Multicodec = {
  name: 'murmur3-x64-128',
  code: CODE_MURMUR3_X64_128
}

export const CODEC_RIPEMD_128: Multicodec = {
  name: 'ripemd-128',
  code: CODE_RIPEMD_128
}

export const CODEC_RIPEMD_160: Multicodec = {
  name: 'ripemd-160',
  code: CODE_RIPEMD_160
}

export const CODEC_RIPEMD_256: Multicodec = {
  name: 'ripemd-256',
  code: CODE_RIPEMD_256
}

export const CODEC_RIPEMD_320: Multicodec = {
  name: 'ripemd-320',
  code: CODE_RIPEMD_320
}

export const CODEC_X11: Multicodec = {
  name: 'x11',
  code: CODE_X11
}

export const CODEC_P256_PUB: Multicodec = {
  name: 'p256-pub',
  code: CODE_P256_PUB,
  description: 'P-256 public Key (compressed)'
}

export const CODEC_P384_PUB: Multicodec = {
  name: 'p384-pub',
  code: CODE_P384_PUB,
  description: 'P-384 public Key (compressed)'
}

export const CODEC_P521_PUB: Multicodec = {
  name: 'p521-pub',
  code: CODE_P521_PUB,
  description: 'P-521 public Key (compressed)'
}

export const CODEC_ED448_PUB: Multicodec = {
  name: 'ed448-pub',
  code: CODE_ED448_PUB,
  description: 'Ed448 public Key'
}

export const CODEC_X448_PUB: Multicodec = {
  name: 'x448-pub',
  code: CODE_X448_PUB,
  description: 'X448 public Key'
}

export const CODEC_RSA_PUB: Multicodec = {
  name: 'rsa-pub',
  code: CODE_RSA_PUB,
  description: 'RSA public key. DER-encoded ASN.1 type RSAPublicKey according to IETF RFC 8017 (PKCS #1)'
}

export const CODEC_SM2_PUB: Multicodec = {
  name: 'sm2-pub',
  code: CODE_SM2_PUB,
  description: 'SM2 public key (compressed)'
}

export const CODEC_VLAD: Multicodec = {
  name: 'vlad',
  code: CODE_VLAD,
  description: 'Verifiable Long-lived ADdress'
}

export const CODEC_PROVENANCE_LOG: Multicodec = {
  name: 'provenance-log',
  code: CODE_PROVENANCE_LOG,
  description: 'Verifiable and permissioned append-only log'
}

export const CODEC_PROVENANCE_LOG_ENTRY: Multicodec = {
  name: 'provenance-log-entry',
  code: CODE_PROVENANCE_LOG_ENTRY,
  description: 'Verifiable and permissioned append-only log entry'
}

export const CODEC_PROVENANCE_LOG_SCRIPT: Multicodec = {
  name: 'provenance-log-script',
  code: CODE_PROVENANCE_LOG_SCRIPT,
  description: 'Verifiable and permissioned append-only log script'
}

export const CODEC_MLKEM_512_PUB: Multicodec = {
  name: 'mlkem-512-pub',
  code: CODE_MLKEM_512_PUB,
  description: 'ML-KEM 512 public key; as specified by FIPS 203'
}

export const CODEC_MLKEM_768_PUB: Multicodec = {
  name: 'mlkem-768-pub',
  code: CODE_MLKEM_768_PUB,
  description: 'ML-KEM 768 public key; as specified by FIPS 203'
}

export const CODEC_MLKEM_1024_PUB: Multicodec = {
  name: 'mlkem-1024-pub',
  code: CODE_MLKEM_1024_PUB,
  description: 'ML-KEM 1024 public key; as specified by FIPS 203'
}

export const CODEC_MULTISIG: Multicodec = {
  name: 'multisig',
  code: CODE_MULTISIG,
  description: 'Digital signature multiformat'
}

export const CODEC_MULTIKEY: Multicodec = {
  name: 'multikey',
  code: CODE_MULTIKEY,
  description: 'Encryption key multiformat'
}

export const CODEC_NONCE: Multicodec = {
  name: 'nonce',
  code: CODE_NONCE,
  description: 'Nonce random value'
}

export const CODEC_ED25519_PRIV: Multicodec = {
  name: 'ed25519-priv',
  code: CODE_ED25519_PRIV,
  description: 'Ed25519 private key'
}

export const CODEC_SECP256K1_PRIV: Multicodec = {
  name: 'secp256k1-priv',
  code: CODE_SECP256K1_PRIV,
  description: 'Secp256k1 private key'
}

export const CODEC_X25519_PRIV: Multicodec = {
  name: 'x25519-priv',
  code: CODE_X25519_PRIV,
  description: 'Curve25519 private key'
}

export const CODEC_SR25519_PRIV: Multicodec = {
  name: 'sr25519-priv',
  code: CODE_SR25519_PRIV,
  description: 'Sr25519 private key'
}

export const CODEC_RSA_PRIV: Multicodec = {
  name: 'rsa-priv',
  code: CODE_RSA_PRIV,
  description: 'RSA private key'
}

export const CODEC_P256_PRIV: Multicodec = {
  name: 'p256-priv',
  code: CODE_P256_PRIV,
  description: 'P-256 private key'
}

export const CODEC_P384_PRIV: Multicodec = {
  name: 'p384-priv',
  code: CODE_P384_PRIV,
  description: 'P-384 private key'
}

export const CODEC_P521_PRIV: Multicodec = {
  name: 'p521-priv',
  code: CODE_P521_PRIV,
  description: 'P-521 private key'
}

export const CODEC_BLS12_381_G1_PRIV: Multicodec = {
  name: 'bls12_381-g1-priv',
  code: CODE_BLS12_381_G1_PRIV,
  description: 'BLS12-381 G1 private key'
}

export const CODEC_BLS12_381_G2_PRIV: Multicodec = {
  name: 'bls12_381-g2-priv',
  code: CODE_BLS12_381_G2_PRIV,
  description: 'BLS12-381 G2 private key'
}

export const CODEC_BLS12_381_G1G2_PRIV: Multicodec = {
  name: 'bls12_381-g1g2-priv',
  code: CODE_BLS12_381_G1G2_PRIV,
  description: 'BLS12-381 G1 and G2 private key'
}

export const CODEC_BLS12_381_G1_PUB_SHARE: Multicodec = {
  name: 'bls12_381-g1-pub-share',
  code: CODE_BLS12_381_G1_PUB_SHARE,
  description: 'BLS12-381 G1 public key share'
}

export const CODEC_BLS12_381_G2_PUB_SHARE: Multicodec = {
  name: 'bls12_381-g2-pub-share',
  code: CODE_BLS12_381_G2_PUB_SHARE,
  description: 'BLS12-381 G2 public key share'
}

export const CODEC_BLS12_381_G1_PRIV_SHARE: Multicodec = {
  name: 'bls12_381-g1-priv-share',
  code: CODE_BLS12_381_G1_PRIV_SHARE,
  description: 'BLS12-381 G1 private key share'
}

export const CODEC_BLS12_381_G2_PRIV_SHARE: Multicodec = {
  name: 'bls12_381-g2-priv-share',
  code: CODE_BLS12_381_G2_PRIV_SHARE,
  description: 'BLS12-381 G2 private key share'
}

export const CODEC_SM2_PRIV: Multicodec = {
  name: 'sm2-priv',
  code: CODE_SM2_PRIV,
  description: 'SM2 private key'
}

export const CODEC_ED448_PRIV: Multicodec = {
  name: 'ed448-priv',
  code: CODE_ED448_PRIV,
  description: 'Ed448 private key'
}

export const CODEC_X448_PRIV: Multicodec = {
  name: 'x448-priv',
  code: CODE_X448_PRIV,
  description: 'X448 private key'
}

export const CODEC_MLKEM_512_PRIV: Multicodec = {
  name: 'mlkem-512-priv',
  code: CODE_MLKEM_512_PRIV,
  description: 'ML-KEM 512 private key; as specified by FIPS 203'
}

export const CODEC_MLKEM_768_PRIV: Multicodec = {
  name: 'mlkem-768-priv',
  code: CODE_MLKEM_768_PRIV,
  description: 'ML-KEM 768 public key; as specified by FIPS 203'
}

export const CODEC_MLKEM_1024_PRIV: Multicodec = {
  name: 'mlkem-1024-priv',
  code: CODE_MLKEM_1024_PRIV,
  description: 'ML-KEM 1024 public key; as specified by FIPS 203'
}

export const CODEC_JWK_JCS_PRIV: Multicodec = {
  name: 'jwk_jcs-priv',
  code: CODE_JWK_JCS_PRIV,
  description: 'JSON object containing only the required members of a JWK (RFC 7518 and RFC 7517) representing the private key. Serialisation based on JCS (RFC 8785)'
}

export const CODEC_LAMPORT_SHA3_512_PUB: Multicodec = {
  name: 'lamport-sha3-512-pub',
  code: CODE_LAMPORT_SHA3_512_PUB,
  description: 'Lamport public key based on SHA3-512'
}

export const CODEC_LAMPORT_SHA3_384_PUB: Multicodec = {
  name: 'lamport-sha3-384-pub',
  code: CODE_LAMPORT_SHA3_384_PUB,
  description: 'Lamport public key based on SHA3-384'
}

export const CODEC_LAMPORT_SHA3_256_PUB: Multicodec = {
  name: 'lamport-sha3-256-pub',
  code: CODE_LAMPORT_SHA3_256_PUB,
  description: 'Lamport public key based on SHA3-256'
}

export const CODEC_LAMPORT_SHA3_512_PRIV: Multicodec = {
  name: 'lamport-sha3-512-priv',
  code: CODE_LAMPORT_SHA3_512_PRIV,
  description: 'Lamport private key based on SHA3-512'
}

export const CODEC_LAMPORT_SHA3_384_PRIV: Multicodec = {
  name: 'lamport-sha3-384-priv',
  code: CODE_LAMPORT_SHA3_384_PRIV,
  description: 'Lamport private key based on SHA3-384'
}

export const CODEC_LAMPORT_SHA3_256_PRIV: Multicodec = {
  name: 'lamport-sha3-256-priv',
  code: CODE_LAMPORT_SHA3_256_PRIV,
  description: 'Lamport private key based on SHA3-256'
}

export const CODEC_LAMPORT_SHA3_512_PRIV_SHARE: Multicodec = {
  name: 'lamport-sha3-512-priv-share',
  code: CODE_LAMPORT_SHA3_512_PRIV_SHARE,
  description: 'Lamport private key share based on SHA3-512 and split with Shamir gf256'
}

export const CODEC_LAMPORT_SHA3_384_PRIV_SHARE: Multicodec = {
  name: 'lamport-sha3-384-priv-share',
  code: CODE_LAMPORT_SHA3_384_PRIV_SHARE,
  description: 'Lamport private key share based on SHA3-384 and split with Shamir gf256'
}

export const CODEC_LAMPORT_SHA3_256_PRIV_SHARE: Multicodec = {
  name: 'lamport-sha3-256-priv-share',
  code: CODE_LAMPORT_SHA3_256_PRIV_SHARE,
  description: 'Lamport private key share based on SHA3-256 and split with Shamir gf256'
}

export const CODEC_LAMPORT_SHA3_512_SIG: Multicodec = {
  name: 'lamport-sha3-512-sig',
  code: CODE_LAMPORT_SHA3_512_SIG,
  description: 'Lamport signature based on SHA3-512'
}

export const CODEC_LAMPORT_SHA3_384_SIG: Multicodec = {
  name: 'lamport-sha3-384-sig',
  code: CODE_LAMPORT_SHA3_384_SIG,
  description: 'Lamport signature based on SHA3-384'
}

export const CODEC_LAMPORT_SHA3_256_SIG: Multicodec = {
  name: 'lamport-sha3-256-sig',
  code: CODE_LAMPORT_SHA3_256_SIG,
  description: 'Lamport signature based on SHA3-256'
}

export const CODEC_LAMPORT_SHA3_512_SIG_SHARE: Multicodec = {
  name: 'lamport-sha3-512-sig-share',
  code: CODE_LAMPORT_SHA3_512_SIG_SHARE,
  description: 'Lamport signature share based on SHA3-512 and split with Shamir gf256'
}

export const CODEC_LAMPORT_SHA3_384_SIG_SHARE: Multicodec = {
  name: 'lamport-sha3-384-sig-share',
  code: CODE_LAMPORT_SHA3_384_SIG_SHARE,
  description: 'Lamport signature share based on SHA3-384 and split with Shamir gf256'
}

export const CODEC_LAMPORT_SHA3_256_SIG_SHARE: Multicodec = {
  name: 'lamport-sha3-256-sig-share',
  code: CODE_LAMPORT_SHA3_256_SIG_SHARE,
  description: 'Lamport signature share based on SHA3-256 and split with Shamir gf256'
}

export const CODEC_KANGAROOTWELVE: Multicodec = {
  name: 'kangarootwelve',
  code: CODE_KANGAROOTWELVE,
  description: 'KangarooTwelve is an extendable-output hash function based on Keccak-p'
}

export const CODEC_AES_GCM_256: Multicodec = {
  name: 'aes-gcm-256',
  code: CODE_AES_GCM_256,
  description: 'AES Galois/Counter Mode with 256-bit key and 12-byte IV'
}

export const CODEC_SILVERPINE: Multicodec = {
  name: 'silverpine',
  code: CODE_SILVERPINE,
  description: 'Experimental QUIC over yggdrasil and ironwood routing protocol'
}

export const CODEC_SM3_256: Multicodec = {
  name: 'sm3-256',
  code: CODE_SM3_256
}

export const CODEC_SHA256A: Multicodec = {
  name: 'sha256a',
  code: CODE_SHA256A,
  description: 'The sum of multiple sha2-256 hashes; as specified by Ceramic CIP-124.'
}

export const CODEC_CHACHA20_POLY1305: Multicodec = {
  name: 'chacha20-poly1305',
  code: CODE_CHACHA20_POLY1305,
  description: 'ChaCha20_Poly1305 encryption scheme'
}

export const CODEC_BLAKE2B_8: Multicodec = {
  name: 'blake2b-8',
  code: CODE_BLAKE2B_8,
  description: 'Blake2b consists of 64 output lengths that give different hashes'
}

export const CODEC_BLAKE2B_16: Multicodec = {
  name: 'blake2b-16',
  code: CODE_BLAKE2B_16
}

export const CODEC_BLAKE2B_24: Multicodec = {
  name: 'blake2b-24',
  code: CODE_BLAKE2B_24
}

export const CODEC_BLAKE2B_32: Multicodec = {
  name: 'blake2b-32',
  code: CODE_BLAKE2B_32
}

export const CODEC_BLAKE2B_40: Multicodec = {
  name: 'blake2b-40',
  code: CODE_BLAKE2B_40
}

export const CODEC_BLAKE2B_48: Multicodec = {
  name: 'blake2b-48',
  code: CODE_BLAKE2B_48
}

export const CODEC_BLAKE2B_56: Multicodec = {
  name: 'blake2b-56',
  code: CODE_BLAKE2B_56
}

export const CODEC_BLAKE2B_64: Multicodec = {
  name: 'blake2b-64',
  code: CODE_BLAKE2B_64
}

export const CODEC_BLAKE2B_72: Multicodec = {
  name: 'blake2b-72',
  code: CODE_BLAKE2B_72
}

export const CODEC_BLAKE2B_80: Multicodec = {
  name: 'blake2b-80',
  code: CODE_BLAKE2B_80
}

export const CODEC_BLAKE2B_88: Multicodec = {
  name: 'blake2b-88',
  code: CODE_BLAKE2B_88
}

export const CODEC_BLAKE2B_96: Multicodec = {
  name: 'blake2b-96',
  code: CODE_BLAKE2B_96
}

export const CODEC_BLAKE2B_104: Multicodec = {
  name: 'blake2b-104',
  code: CODE_BLAKE2B_104
}

export const CODEC_BLAKE2B_112: Multicodec = {
  name: 'blake2b-112',
  code: CODE_BLAKE2B_112
}

export const CODEC_BLAKE2B_120: Multicodec = {
  name: 'blake2b-120',
  code: CODE_BLAKE2B_120
}

export const CODEC_BLAKE2B_128: Multicodec = {
  name: 'blake2b-128',
  code: CODE_BLAKE2B_128
}

export const CODEC_BLAKE2B_136: Multicodec = {
  name: 'blake2b-136',
  code: CODE_BLAKE2B_136
}

export const CODEC_BLAKE2B_144: Multicodec = {
  name: 'blake2b-144',
  code: CODE_BLAKE2B_144
}

export const CODEC_BLAKE2B_152: Multicodec = {
  name: 'blake2b-152',
  code: CODE_BLAKE2B_152
}

export const CODEC_BLAKE2B_160: Multicodec = {
  name: 'blake2b-160',
  code: CODE_BLAKE2B_160
}

export const CODEC_BLAKE2B_168: Multicodec = {
  name: 'blake2b-168',
  code: CODE_BLAKE2B_168
}

export const CODEC_BLAKE2B_176: Multicodec = {
  name: 'blake2b-176',
  code: CODE_BLAKE2B_176
}

export const CODEC_BLAKE2B_184: Multicodec = {
  name: 'blake2b-184',
  code: CODE_BLAKE2B_184
}

export const CODEC_BLAKE2B_192: Multicodec = {
  name: 'blake2b-192',
  code: CODE_BLAKE2B_192
}

export const CODEC_BLAKE2B_200: Multicodec = {
  name: 'blake2b-200',
  code: CODE_BLAKE2B_200
}

export const CODEC_BLAKE2B_208: Multicodec = {
  name: 'blake2b-208',
  code: CODE_BLAKE2B_208
}

export const CODEC_BLAKE2B_216: Multicodec = {
  name: 'blake2b-216',
  code: CODE_BLAKE2B_216
}

export const CODEC_BLAKE2B_224: Multicodec = {
  name: 'blake2b-224',
  code: CODE_BLAKE2B_224
}

export const CODEC_BLAKE2B_232: Multicodec = {
  name: 'blake2b-232',
  code: CODE_BLAKE2B_232
}

export const CODEC_BLAKE2B_240: Multicodec = {
  name: 'blake2b-240',
  code: CODE_BLAKE2B_240
}

export const CODEC_BLAKE2B_248: Multicodec = {
  name: 'blake2b-248',
  code: CODE_BLAKE2B_248
}

export const CODEC_BLAKE2B_256: Multicodec = {
  name: 'blake2b-256',
  code: CODE_BLAKE2B_256
}

export const CODEC_BLAKE2B_264: Multicodec = {
  name: 'blake2b-264',
  code: CODE_BLAKE2B_264
}

export const CODEC_BLAKE2B_272: Multicodec = {
  name: 'blake2b-272',
  code: CODE_BLAKE2B_272
}

export const CODEC_BLAKE2B_280: Multicodec = {
  name: 'blake2b-280',
  code: CODE_BLAKE2B_280
}

export const CODEC_BLAKE2B_288: Multicodec = {
  name: 'blake2b-288',
  code: CODE_BLAKE2B_288
}

export const CODEC_BLAKE2B_296: Multicodec = {
  name: 'blake2b-296',
  code: CODE_BLAKE2B_296
}

export const CODEC_BLAKE2B_304: Multicodec = {
  name: 'blake2b-304',
  code: CODE_BLAKE2B_304
}

export const CODEC_BLAKE2B_312: Multicodec = {
  name: 'blake2b-312',
  code: CODE_BLAKE2B_312
}

export const CODEC_BLAKE2B_320: Multicodec = {
  name: 'blake2b-320',
  code: CODE_BLAKE2B_320
}

export const CODEC_BLAKE2B_328: Multicodec = {
  name: 'blake2b-328',
  code: CODE_BLAKE2B_328
}

export const CODEC_BLAKE2B_336: Multicodec = {
  name: 'blake2b-336',
  code: CODE_BLAKE2B_336
}

export const CODEC_BLAKE2B_344: Multicodec = {
  name: 'blake2b-344',
  code: CODE_BLAKE2B_344
}

export const CODEC_BLAKE2B_352: Multicodec = {
  name: 'blake2b-352',
  code: CODE_BLAKE2B_352
}

export const CODEC_BLAKE2B_360: Multicodec = {
  name: 'blake2b-360',
  code: CODE_BLAKE2B_360
}

export const CODEC_BLAKE2B_368: Multicodec = {
  name: 'blake2b-368',
  code: CODE_BLAKE2B_368
}

export const CODEC_BLAKE2B_376: Multicodec = {
  name: 'blake2b-376',
  code: CODE_BLAKE2B_376
}

export const CODEC_BLAKE2B_384: Multicodec = {
  name: 'blake2b-384',
  code: CODE_BLAKE2B_384
}

export const CODEC_BLAKE2B_392: Multicodec = {
  name: 'blake2b-392',
  code: CODE_BLAKE2B_392
}

export const CODEC_BLAKE2B_400: Multicodec = {
  name: 'blake2b-400',
  code: CODE_BLAKE2B_400
}

export const CODEC_BLAKE2B_408: Multicodec = {
  name: 'blake2b-408',
  code: CODE_BLAKE2B_408
}

export const CODEC_BLAKE2B_416: Multicodec = {
  name: 'blake2b-416',
  code: CODE_BLAKE2B_416
}

export const CODEC_BLAKE2B_424: Multicodec = {
  name: 'blake2b-424',
  code: CODE_BLAKE2B_424
}

export const CODEC_BLAKE2B_432: Multicodec = {
  name: 'blake2b-432',
  code: CODE_BLAKE2B_432
}

export const CODEC_BLAKE2B_440: Multicodec = {
  name: 'blake2b-440',
  code: CODE_BLAKE2B_440
}

export const CODEC_BLAKE2B_448: Multicodec = {
  name: 'blake2b-448',
  code: CODE_BLAKE2B_448
}

export const CODEC_BLAKE2B_456: Multicodec = {
  name: 'blake2b-456',
  code: CODE_BLAKE2B_456
}

export const CODEC_BLAKE2B_464: Multicodec = {
  name: 'blake2b-464',
  code: CODE_BLAKE2B_464
}

export const CODEC_BLAKE2B_472: Multicodec = {
  name: 'blake2b-472',
  code: CODE_BLAKE2B_472
}

export const CODEC_BLAKE2B_480: Multicodec = {
  name: 'blake2b-480',
  code: CODE_BLAKE2B_480
}

export const CODEC_BLAKE2B_488: Multicodec = {
  name: 'blake2b-488',
  code: CODE_BLAKE2B_488
}

export const CODEC_BLAKE2B_496: Multicodec = {
  name: 'blake2b-496',
  code: CODE_BLAKE2B_496
}

export const CODEC_BLAKE2B_504: Multicodec = {
  name: 'blake2b-504',
  code: CODE_BLAKE2B_504
}

export const CODEC_BLAKE2B_512: Multicodec = {
  name: 'blake2b-512',
  code: CODE_BLAKE2B_512
}

export const CODEC_BLAKE2S_8: Multicodec = {
  name: 'blake2s-8',
  code: CODE_BLAKE2S_8,
  description: 'Blake2s consists of 32 output lengths that give different hashes'
}

export const CODEC_BLAKE2S_16: Multicodec = {
  name: 'blake2s-16',
  code: CODE_BLAKE2S_16
}

export const CODEC_BLAKE2S_24: Multicodec = {
  name: 'blake2s-24',
  code: CODE_BLAKE2S_24
}

export const CODEC_BLAKE2S_32: Multicodec = {
  name: 'blake2s-32',
  code: CODE_BLAKE2S_32
}

export const CODEC_BLAKE2S_40: Multicodec = {
  name: 'blake2s-40',
  code: CODE_BLAKE2S_40
}

export const CODEC_BLAKE2S_48: Multicodec = {
  name: 'blake2s-48',
  code: CODE_BLAKE2S_48
}

export const CODEC_BLAKE2S_56: Multicodec = {
  name: 'blake2s-56',
  code: CODE_BLAKE2S_56
}

export const CODEC_BLAKE2S_64: Multicodec = {
  name: 'blake2s-64',
  code: CODE_BLAKE2S_64
}

export const CODEC_BLAKE2S_72: Multicodec = {
  name: 'blake2s-72',
  code: CODE_BLAKE2S_72
}

export const CODEC_BLAKE2S_80: Multicodec = {
  name: 'blake2s-80',
  code: CODE_BLAKE2S_80
}

export const CODEC_BLAKE2S_88: Multicodec = {
  name: 'blake2s-88',
  code: CODE_BLAKE2S_88
}

export const CODEC_BLAKE2S_96: Multicodec = {
  name: 'blake2s-96',
  code: CODE_BLAKE2S_96
}

export const CODEC_BLAKE2S_104: Multicodec = {
  name: 'blake2s-104',
  code: CODE_BLAKE2S_104
}

export const CODEC_BLAKE2S_112: Multicodec = {
  name: 'blake2s-112',
  code: CODE_BLAKE2S_112
}

export const CODEC_BLAKE2S_120: Multicodec = {
  name: 'blake2s-120',
  code: CODE_BLAKE2S_120
}

export const CODEC_BLAKE2S_128: Multicodec = {
  name: 'blake2s-128',
  code: CODE_BLAKE2S_128
}

export const CODEC_BLAKE2S_136: Multicodec = {
  name: 'blake2s-136',
  code: CODE_BLAKE2S_136
}

export const CODEC_BLAKE2S_144: Multicodec = {
  name: 'blake2s-144',
  code: CODE_BLAKE2S_144
}

export const CODEC_BLAKE2S_152: Multicodec = {
  name: 'blake2s-152',
  code: CODE_BLAKE2S_152
}

export const CODEC_BLAKE2S_160: Multicodec = {
  name: 'blake2s-160',
  code: CODE_BLAKE2S_160
}

export const CODEC_BLAKE2S_168: Multicodec = {
  name: 'blake2s-168',
  code: CODE_BLAKE2S_168
}

export const CODEC_BLAKE2S_176: Multicodec = {
  name: 'blake2s-176',
  code: CODE_BLAKE2S_176
}

export const CODEC_BLAKE2S_184: Multicodec = {
  name: 'blake2s-184',
  code: CODE_BLAKE2S_184
}

export const CODEC_BLAKE2S_192: Multicodec = {
  name: 'blake2s-192',
  code: CODE_BLAKE2S_192
}

export const CODEC_BLAKE2S_200: Multicodec = {
  name: 'blake2s-200',
  code: CODE_BLAKE2S_200
}

export const CODEC_BLAKE2S_208: Multicodec = {
  name: 'blake2s-208',
  code: CODE_BLAKE2S_208
}

export const CODEC_BLAKE2S_216: Multicodec = {
  name: 'blake2s-216',
  code: CODE_BLAKE2S_216
}

export const CODEC_BLAKE2S_224: Multicodec = {
  name: 'blake2s-224',
  code: CODE_BLAKE2S_224
}

export const CODEC_BLAKE2S_232: Multicodec = {
  name: 'blake2s-232',
  code: CODE_BLAKE2S_232
}

export const CODEC_BLAKE2S_240: Multicodec = {
  name: 'blake2s-240',
  code: CODE_BLAKE2S_240
}

export const CODEC_BLAKE2S_248: Multicodec = {
  name: 'blake2s-248',
  code: CODE_BLAKE2S_248
}

export const CODEC_BLAKE2S_256: Multicodec = {
  name: 'blake2s-256',
  code: CODE_BLAKE2S_256
}

export const CODEC_SKEIN256_8: Multicodec = {
  name: 'skein256-8',
  code: CODE_SKEIN256_8,
  description: 'Skein256 consists of 32 output lengths that give different hashes'
}

export const CODEC_SKEIN256_16: Multicodec = {
  name: 'skein256-16',
  code: CODE_SKEIN256_16
}

export const CODEC_SKEIN256_24: Multicodec = {
  name: 'skein256-24',
  code: CODE_SKEIN256_24
}

export const CODEC_SKEIN256_32: Multicodec = {
  name: 'skein256-32',
  code: CODE_SKEIN256_32
}

export const CODEC_SKEIN256_40: Multicodec = {
  name: 'skein256-40',
  code: CODE_SKEIN256_40
}

export const CODEC_SKEIN256_48: Multicodec = {
  name: 'skein256-48',
  code: CODE_SKEIN256_48
}

export const CODEC_SKEIN256_56: Multicodec = {
  name: 'skein256-56',
  code: CODE_SKEIN256_56
}

export const CODEC_SKEIN256_64: Multicodec = {
  name: 'skein256-64',
  code: CODE_SKEIN256_64
}

export const CODEC_SKEIN256_72: Multicodec = {
  name: 'skein256-72',
  code: CODE_SKEIN256_72
}

export const CODEC_SKEIN256_80: Multicodec = {
  name: 'skein256-80',
  code: CODE_SKEIN256_80
}

export const CODEC_SKEIN256_88: Multicodec = {
  name: 'skein256-88',
  code: CODE_SKEIN256_88
}

export const CODEC_SKEIN256_96: Multicodec = {
  name: 'skein256-96',
  code: CODE_SKEIN256_96
}

export const CODEC_SKEIN256_104: Multicodec = {
  name: 'skein256-104',
  code: CODE_SKEIN256_104
}

export const CODEC_SKEIN256_112: Multicodec = {
  name: 'skein256-112',
  code: CODE_SKEIN256_112
}

export const CODEC_SKEIN256_120: Multicodec = {
  name: 'skein256-120',
  code: CODE_SKEIN256_120
}

export const CODEC_SKEIN256_128: Multicodec = {
  name: 'skein256-128',
  code: CODE_SKEIN256_128
}

export const CODEC_SKEIN256_136: Multicodec = {
  name: 'skein256-136',
  code: CODE_SKEIN256_136
}

export const CODEC_SKEIN256_144: Multicodec = {
  name: 'skein256-144',
  code: CODE_SKEIN256_144
}

export const CODEC_SKEIN256_152: Multicodec = {
  name: 'skein256-152',
  code: CODE_SKEIN256_152
}

export const CODEC_SKEIN256_160: Multicodec = {
  name: 'skein256-160',
  code: CODE_SKEIN256_160
}

export const CODEC_SKEIN256_168: Multicodec = {
  name: 'skein256-168',
  code: CODE_SKEIN256_168
}

export const CODEC_SKEIN256_176: Multicodec = {
  name: 'skein256-176',
  code: CODE_SKEIN256_176
}

export const CODEC_SKEIN256_184: Multicodec = {
  name: 'skein256-184',
  code: CODE_SKEIN256_184
}

export const CODEC_SKEIN256_192: Multicodec = {
  name: 'skein256-192',
  code: CODE_SKEIN256_192
}

export const CODEC_SKEIN256_200: Multicodec = {
  name: 'skein256-200',
  code: CODE_SKEIN256_200
}

export const CODEC_SKEIN256_208: Multicodec = {
  name: 'skein256-208',
  code: CODE_SKEIN256_208
}

export const CODEC_SKEIN256_216: Multicodec = {
  name: 'skein256-216',
  code: CODE_SKEIN256_216
}

export const CODEC_SKEIN256_224: Multicodec = {
  name: 'skein256-224',
  code: CODE_SKEIN256_224
}

export const CODEC_SKEIN256_232: Multicodec = {
  name: 'skein256-232',
  code: CODE_SKEIN256_232
}

export const CODEC_SKEIN256_240: Multicodec = {
  name: 'skein256-240',
  code: CODE_SKEIN256_240
}

export const CODEC_SKEIN256_248: Multicodec = {
  name: 'skein256-248',
  code: CODE_SKEIN256_248
}

export const CODEC_SKEIN256_256: Multicodec = {
  name: 'skein256-256',
  code: CODE_SKEIN256_256
}

export const CODEC_SKEIN512_8: Multicodec = {
  name: 'skein512-8',
  code: CODE_SKEIN512_8,
  description: 'Skein512 consists of 64 output lengths that give different hashes'
}

export const CODEC_SKEIN512_16: Multicodec = {
  name: 'skein512-16',
  code: CODE_SKEIN512_16
}

export const CODEC_SKEIN512_24: Multicodec = {
  name: 'skein512-24',
  code: CODE_SKEIN512_24
}

export const CODEC_SKEIN512_32: Multicodec = {
  name: 'skein512-32',
  code: CODE_SKEIN512_32
}

export const CODEC_SKEIN512_40: Multicodec = {
  name: 'skein512-40',
  code: CODE_SKEIN512_40
}

export const CODEC_SKEIN512_48: Multicodec = {
  name: 'skein512-48',
  code: CODE_SKEIN512_48
}

export const CODEC_SKEIN512_56: Multicodec = {
  name: 'skein512-56',
  code: CODE_SKEIN512_56
}

export const CODEC_SKEIN512_64: Multicodec = {
  name: 'skein512-64',
  code: CODE_SKEIN512_64
}

export const CODEC_SKEIN512_72: Multicodec = {
  name: 'skein512-72',
  code: CODE_SKEIN512_72
}

export const CODEC_SKEIN512_80: Multicodec = {
  name: 'skein512-80',
  code: CODE_SKEIN512_80
}

export const CODEC_SKEIN512_88: Multicodec = {
  name: 'skein512-88',
  code: CODE_SKEIN512_88
}

export const CODEC_SKEIN512_96: Multicodec = {
  name: 'skein512-96',
  code: CODE_SKEIN512_96
}

export const CODEC_SKEIN512_104: Multicodec = {
  name: 'skein512-104',
  code: CODE_SKEIN512_104
}

export const CODEC_SKEIN512_112: Multicodec = {
  name: 'skein512-112',
  code: CODE_SKEIN512_112
}

export const CODEC_SKEIN512_120: Multicodec = {
  name: 'skein512-120',
  code: CODE_SKEIN512_120
}

export const CODEC_SKEIN512_128: Multicodec = {
  name: 'skein512-128',
  code: CODE_SKEIN512_128
}

export const CODEC_SKEIN512_136: Multicodec = {
  name: 'skein512-136',
  code: CODE_SKEIN512_136
}

export const CODEC_SKEIN512_144: Multicodec = {
  name: 'skein512-144',
  code: CODE_SKEIN512_144
}

export const CODEC_SKEIN512_152: Multicodec = {
  name: 'skein512-152',
  code: CODE_SKEIN512_152
}

export const CODEC_SKEIN512_160: Multicodec = {
  name: 'skein512-160',
  code: CODE_SKEIN512_160
}

export const CODEC_SKEIN512_168: Multicodec = {
  name: 'skein512-168',
  code: CODE_SKEIN512_168
}

export const CODEC_SKEIN512_176: Multicodec = {
  name: 'skein512-176',
  code: CODE_SKEIN512_176
}

export const CODEC_SKEIN512_184: Multicodec = {
  name: 'skein512-184',
  code: CODE_SKEIN512_184
}

export const CODEC_SKEIN512_192: Multicodec = {
  name: 'skein512-192',
  code: CODE_SKEIN512_192
}

export const CODEC_SKEIN512_200: Multicodec = {
  name: 'skein512-200',
  code: CODE_SKEIN512_200
}

export const CODEC_SKEIN512_208: Multicodec = {
  name: 'skein512-208',
  code: CODE_SKEIN512_208
}

export const CODEC_SKEIN512_216: Multicodec = {
  name: 'skein512-216',
  code: CODE_SKEIN512_216
}

export const CODEC_SKEIN512_224: Multicodec = {
  name: 'skein512-224',
  code: CODE_SKEIN512_224
}

export const CODEC_SKEIN512_232: Multicodec = {
  name: 'skein512-232',
  code: CODE_SKEIN512_232
}

export const CODEC_SKEIN512_240: Multicodec = {
  name: 'skein512-240',
  code: CODE_SKEIN512_240
}

export const CODEC_SKEIN512_248: Multicodec = {
  name: 'skein512-248',
  code: CODE_SKEIN512_248
}

export const CODEC_SKEIN512_256: Multicodec = {
  name: 'skein512-256',
  code: CODE_SKEIN512_256
}

export const CODEC_SKEIN512_264: Multicodec = {
  name: 'skein512-264',
  code: CODE_SKEIN512_264
}

export const CODEC_SKEIN512_272: Multicodec = {
  name: 'skein512-272',
  code: CODE_SKEIN512_272
}

export const CODEC_SKEIN512_280: Multicodec = {
  name: 'skein512-280',
  code: CODE_SKEIN512_280
}

export const CODEC_SKEIN512_288: Multicodec = {
  name: 'skein512-288',
  code: CODE_SKEIN512_288
}

export const CODEC_SKEIN512_296: Multicodec = {
  name: 'skein512-296',
  code: CODE_SKEIN512_296
}

export const CODEC_SKEIN512_304: Multicodec = {
  name: 'skein512-304',
  code: CODE_SKEIN512_304
}

export const CODEC_SKEIN512_312: Multicodec = {
  name: 'skein512-312',
  code: CODE_SKEIN512_312
}

export const CODEC_SKEIN512_320: Multicodec = {
  name: 'skein512-320',
  code: CODE_SKEIN512_320
}

export const CODEC_SKEIN512_328: Multicodec = {
  name: 'skein512-328',
  code: CODE_SKEIN512_328
}

export const CODEC_SKEIN512_336: Multicodec = {
  name: 'skein512-336',
  code: CODE_SKEIN512_336
}

export const CODEC_SKEIN512_344: Multicodec = {
  name: 'skein512-344',
  code: CODE_SKEIN512_344
}

export const CODEC_SKEIN512_352: Multicodec = {
  name: 'skein512-352',
  code: CODE_SKEIN512_352
}

export const CODEC_SKEIN512_360: Multicodec = {
  name: 'skein512-360',
  code: CODE_SKEIN512_360
}

export const CODEC_SKEIN512_368: Multicodec = {
  name: 'skein512-368',
  code: CODE_SKEIN512_368
}

export const CODEC_SKEIN512_376: Multicodec = {
  name: 'skein512-376',
  code: CODE_SKEIN512_376
}

export const CODEC_SKEIN512_384: Multicodec = {
  name: 'skein512-384',
  code: CODE_SKEIN512_384
}

export const CODEC_SKEIN512_392: Multicodec = {
  name: 'skein512-392',
  code: CODE_SKEIN512_392
}

export const CODEC_SKEIN512_400: Multicodec = {
  name: 'skein512-400',
  code: CODE_SKEIN512_400
}

export const CODEC_SKEIN512_408: Multicodec = {
  name: 'skein512-408',
  code: CODE_SKEIN512_408
}

export const CODEC_SKEIN512_416: Multicodec = {
  name: 'skein512-416',
  code: CODE_SKEIN512_416
}

export const CODEC_SKEIN512_424: Multicodec = {
  name: 'skein512-424',
  code: CODE_SKEIN512_424
}

export const CODEC_SKEIN512_432: Multicodec = {
  name: 'skein512-432',
  code: CODE_SKEIN512_432
}

export const CODEC_SKEIN512_440: Multicodec = {
  name: 'skein512-440',
  code: CODE_SKEIN512_440
}

export const CODEC_SKEIN512_448: Multicodec = {
  name: 'skein512-448',
  code: CODE_SKEIN512_448
}

export const CODEC_SKEIN512_456: Multicodec = {
  name: 'skein512-456',
  code: CODE_SKEIN512_456
}

export const CODEC_SKEIN512_464: Multicodec = {
  name: 'skein512-464',
  code: CODE_SKEIN512_464
}

export const CODEC_SKEIN512_472: Multicodec = {
  name: 'skein512-472',
  code: CODE_SKEIN512_472
}

export const CODEC_SKEIN512_480: Multicodec = {
  name: 'skein512-480',
  code: CODE_SKEIN512_480
}

export const CODEC_SKEIN512_488: Multicodec = {
  name: 'skein512-488',
  code: CODE_SKEIN512_488
}

export const CODEC_SKEIN512_496: Multicodec = {
  name: 'skein512-496',
  code: CODE_SKEIN512_496
}

export const CODEC_SKEIN512_504: Multicodec = {
  name: 'skein512-504',
  code: CODE_SKEIN512_504
}

export const CODEC_SKEIN512_512: Multicodec = {
  name: 'skein512-512',
  code: CODE_SKEIN512_512
}

export const CODEC_SKEIN1024_8: Multicodec = {
  name: 'skein1024-8',
  code: CODE_SKEIN1024_8,
  description: 'Skein1024 consists of 128 output lengths that give different hashes'
}

export const CODEC_SKEIN1024_16: Multicodec = {
  name: 'skein1024-16',
  code: CODE_SKEIN1024_16
}

export const CODEC_SKEIN1024_24: Multicodec = {
  name: 'skein1024-24',
  code: CODE_SKEIN1024_24
}

export const CODEC_SKEIN1024_32: Multicodec = {
  name: 'skein1024-32',
  code: CODE_SKEIN1024_32
}

export const CODEC_SKEIN1024_40: Multicodec = {
  name: 'skein1024-40',
  code: CODE_SKEIN1024_40
}

export const CODEC_SKEIN1024_48: Multicodec = {
  name: 'skein1024-48',
  code: CODE_SKEIN1024_48
}

export const CODEC_SKEIN1024_56: Multicodec = {
  name: 'skein1024-56',
  code: CODE_SKEIN1024_56
}

export const CODEC_SKEIN1024_64: Multicodec = {
  name: 'skein1024-64',
  code: CODE_SKEIN1024_64
}

export const CODEC_SKEIN1024_72: Multicodec = {
  name: 'skein1024-72',
  code: CODE_SKEIN1024_72
}

export const CODEC_SKEIN1024_80: Multicodec = {
  name: 'skein1024-80',
  code: CODE_SKEIN1024_80
}

export const CODEC_SKEIN1024_88: Multicodec = {
  name: 'skein1024-88',
  code: CODE_SKEIN1024_88
}

export const CODEC_SKEIN1024_96: Multicodec = {
  name: 'skein1024-96',
  code: CODE_SKEIN1024_96
}

export const CODEC_SKEIN1024_104: Multicodec = {
  name: 'skein1024-104',
  code: CODE_SKEIN1024_104
}

export const CODEC_SKEIN1024_112: Multicodec = {
  name: 'skein1024-112',
  code: CODE_SKEIN1024_112
}

export const CODEC_SKEIN1024_120: Multicodec = {
  name: 'skein1024-120',
  code: CODE_SKEIN1024_120
}

export const CODEC_SKEIN1024_128: Multicodec = {
  name: 'skein1024-128',
  code: CODE_SKEIN1024_128
}

export const CODEC_SKEIN1024_136: Multicodec = {
  name: 'skein1024-136',
  code: CODE_SKEIN1024_136
}

export const CODEC_SKEIN1024_144: Multicodec = {
  name: 'skein1024-144',
  code: CODE_SKEIN1024_144
}

export const CODEC_SKEIN1024_152: Multicodec = {
  name: 'skein1024-152',
  code: CODE_SKEIN1024_152
}

export const CODEC_SKEIN1024_160: Multicodec = {
  name: 'skein1024-160',
  code: CODE_SKEIN1024_160
}

export const CODEC_SKEIN1024_168: Multicodec = {
  name: 'skein1024-168',
  code: CODE_SKEIN1024_168
}

export const CODEC_SKEIN1024_176: Multicodec = {
  name: 'skein1024-176',
  code: CODE_SKEIN1024_176
}

export const CODEC_SKEIN1024_184: Multicodec = {
  name: 'skein1024-184',
  code: CODE_SKEIN1024_184
}

export const CODEC_SKEIN1024_192: Multicodec = {
  name: 'skein1024-192',
  code: CODE_SKEIN1024_192
}

export const CODEC_SKEIN1024_200: Multicodec = {
  name: 'skein1024-200',
  code: CODE_SKEIN1024_200
}

export const CODEC_SKEIN1024_208: Multicodec = {
  name: 'skein1024-208',
  code: CODE_SKEIN1024_208
}

export const CODEC_SKEIN1024_216: Multicodec = {
  name: 'skein1024-216',
  code: CODE_SKEIN1024_216
}

export const CODEC_SKEIN1024_224: Multicodec = {
  name: 'skein1024-224',
  code: CODE_SKEIN1024_224
}

export const CODEC_SKEIN1024_232: Multicodec = {
  name: 'skein1024-232',
  code: CODE_SKEIN1024_232
}

export const CODEC_SKEIN1024_240: Multicodec = {
  name: 'skein1024-240',
  code: CODE_SKEIN1024_240
}

export const CODEC_SKEIN1024_248: Multicodec = {
  name: 'skein1024-248',
  code: CODE_SKEIN1024_248
}

export const CODEC_SKEIN1024_256: Multicodec = {
  name: 'skein1024-256',
  code: CODE_SKEIN1024_256
}

export const CODEC_SKEIN1024_264: Multicodec = {
  name: 'skein1024-264',
  code: CODE_SKEIN1024_264
}

export const CODEC_SKEIN1024_272: Multicodec = {
  name: 'skein1024-272',
  code: CODE_SKEIN1024_272
}

export const CODEC_SKEIN1024_280: Multicodec = {
  name: 'skein1024-280',
  code: CODE_SKEIN1024_280
}

export const CODEC_SKEIN1024_288: Multicodec = {
  name: 'skein1024-288',
  code: CODE_SKEIN1024_288
}

export const CODEC_SKEIN1024_296: Multicodec = {
  name: 'skein1024-296',
  code: CODE_SKEIN1024_296
}

export const CODEC_SKEIN1024_304: Multicodec = {
  name: 'skein1024-304',
  code: CODE_SKEIN1024_304
}

export const CODEC_SKEIN1024_312: Multicodec = {
  name: 'skein1024-312',
  code: CODE_SKEIN1024_312
}

export const CODEC_SKEIN1024_320: Multicodec = {
  name: 'skein1024-320',
  code: CODE_SKEIN1024_320
}

export const CODEC_SKEIN1024_328: Multicodec = {
  name: 'skein1024-328',
  code: CODE_SKEIN1024_328
}

export const CODEC_SKEIN1024_336: Multicodec = {
  name: 'skein1024-336',
  code: CODE_SKEIN1024_336
}

export const CODEC_SKEIN1024_344: Multicodec = {
  name: 'skein1024-344',
  code: CODE_SKEIN1024_344
}

export const CODEC_SKEIN1024_352: Multicodec = {
  name: 'skein1024-352',
  code: CODE_SKEIN1024_352
}

export const CODEC_SKEIN1024_360: Multicodec = {
  name: 'skein1024-360',
  code: CODE_SKEIN1024_360
}

export const CODEC_SKEIN1024_368: Multicodec = {
  name: 'skein1024-368',
  code: CODE_SKEIN1024_368
}

export const CODEC_SKEIN1024_376: Multicodec = {
  name: 'skein1024-376',
  code: CODE_SKEIN1024_376
}

export const CODEC_SKEIN1024_384: Multicodec = {
  name: 'skein1024-384',
  code: CODE_SKEIN1024_384
}

export const CODEC_SKEIN1024_392: Multicodec = {
  name: 'skein1024-392',
  code: CODE_SKEIN1024_392
}

export const CODEC_SKEIN1024_400: Multicodec = {
  name: 'skein1024-400',
  code: CODE_SKEIN1024_400
}

export const CODEC_SKEIN1024_408: Multicodec = {
  name: 'skein1024-408',
  code: CODE_SKEIN1024_408
}

export const CODEC_SKEIN1024_416: Multicodec = {
  name: 'skein1024-416',
  code: CODE_SKEIN1024_416
}

export const CODEC_SKEIN1024_424: Multicodec = {
  name: 'skein1024-424',
  code: CODE_SKEIN1024_424
}

export const CODEC_SKEIN1024_432: Multicodec = {
  name: 'skein1024-432',
  code: CODE_SKEIN1024_432
}

export const CODEC_SKEIN1024_440: Multicodec = {
  name: 'skein1024-440',
  code: CODE_SKEIN1024_440
}

export const CODEC_SKEIN1024_448: Multicodec = {
  name: 'skein1024-448',
  code: CODE_SKEIN1024_448
}

export const CODEC_SKEIN1024_456: Multicodec = {
  name: 'skein1024-456',
  code: CODE_SKEIN1024_456
}

export const CODEC_SKEIN1024_464: Multicodec = {
  name: 'skein1024-464',
  code: CODE_SKEIN1024_464
}

export const CODEC_SKEIN1024_472: Multicodec = {
  name: 'skein1024-472',
  code: CODE_SKEIN1024_472
}

export const CODEC_SKEIN1024_480: Multicodec = {
  name: 'skein1024-480',
  code: CODE_SKEIN1024_480
}

export const CODEC_SKEIN1024_488: Multicodec = {
  name: 'skein1024-488',
  code: CODE_SKEIN1024_488
}

export const CODEC_SKEIN1024_496: Multicodec = {
  name: 'skein1024-496',
  code: CODE_SKEIN1024_496
}

export const CODEC_SKEIN1024_504: Multicodec = {
  name: 'skein1024-504',
  code: CODE_SKEIN1024_504
}

export const CODEC_SKEIN1024_512: Multicodec = {
  name: 'skein1024-512',
  code: CODE_SKEIN1024_512
}

export const CODEC_SKEIN1024_520: Multicodec = {
  name: 'skein1024-520',
  code: CODE_SKEIN1024_520
}

export const CODEC_SKEIN1024_528: Multicodec = {
  name: 'skein1024-528',
  code: CODE_SKEIN1024_528
}

export const CODEC_SKEIN1024_536: Multicodec = {
  name: 'skein1024-536',
  code: CODE_SKEIN1024_536
}

export const CODEC_SKEIN1024_544: Multicodec = {
  name: 'skein1024-544',
  code: CODE_SKEIN1024_544
}

export const CODEC_SKEIN1024_552: Multicodec = {
  name: 'skein1024-552',
  code: CODE_SKEIN1024_552
}

export const CODEC_SKEIN1024_560: Multicodec = {
  name: 'skein1024-560',
  code: CODE_SKEIN1024_560
}

export const CODEC_SKEIN1024_568: Multicodec = {
  name: 'skein1024-568',
  code: CODE_SKEIN1024_568
}

export const CODEC_SKEIN1024_576: Multicodec = {
  name: 'skein1024-576',
  code: CODE_SKEIN1024_576
}

export const CODEC_SKEIN1024_584: Multicodec = {
  name: 'skein1024-584',
  code: CODE_SKEIN1024_584
}

export const CODEC_SKEIN1024_592: Multicodec = {
  name: 'skein1024-592',
  code: CODE_SKEIN1024_592
}

export const CODEC_SKEIN1024_600: Multicodec = {
  name: 'skein1024-600',
  code: CODE_SKEIN1024_600
}

export const CODEC_SKEIN1024_608: Multicodec = {
  name: 'skein1024-608',
  code: CODE_SKEIN1024_608
}

export const CODEC_SKEIN1024_616: Multicodec = {
  name: 'skein1024-616',
  code: CODE_SKEIN1024_616
}

export const CODEC_SKEIN1024_624: Multicodec = {
  name: 'skein1024-624',
  code: CODE_SKEIN1024_624
}

export const CODEC_SKEIN1024_632: Multicodec = {
  name: 'skein1024-632',
  code: CODE_SKEIN1024_632
}

export const CODEC_SKEIN1024_640: Multicodec = {
  name: 'skein1024-640',
  code: CODE_SKEIN1024_640
}

export const CODEC_SKEIN1024_648: Multicodec = {
  name: 'skein1024-648',
  code: CODE_SKEIN1024_648
}

export const CODEC_SKEIN1024_656: Multicodec = {
  name: 'skein1024-656',
  code: CODE_SKEIN1024_656
}

export const CODEC_SKEIN1024_664: Multicodec = {
  name: 'skein1024-664',
  code: CODE_SKEIN1024_664
}

export const CODEC_SKEIN1024_672: Multicodec = {
  name: 'skein1024-672',
  code: CODE_SKEIN1024_672
}

export const CODEC_SKEIN1024_680: Multicodec = {
  name: 'skein1024-680',
  code: CODE_SKEIN1024_680
}

export const CODEC_SKEIN1024_688: Multicodec = {
  name: 'skein1024-688',
  code: CODE_SKEIN1024_688
}

export const CODEC_SKEIN1024_696: Multicodec = {
  name: 'skein1024-696',
  code: CODE_SKEIN1024_696
}

export const CODEC_SKEIN1024_704: Multicodec = {
  name: 'skein1024-704',
  code: CODE_SKEIN1024_704
}

export const CODEC_SKEIN1024_712: Multicodec = {
  name: 'skein1024-712',
  code: CODE_SKEIN1024_712
}

export const CODEC_SKEIN1024_720: Multicodec = {
  name: 'skein1024-720',
  code: CODE_SKEIN1024_720
}

export const CODEC_SKEIN1024_728: Multicodec = {
  name: 'skein1024-728',
  code: CODE_SKEIN1024_728
}

export const CODEC_SKEIN1024_736: Multicodec = {
  name: 'skein1024-736',
  code: CODE_SKEIN1024_736
}

export const CODEC_SKEIN1024_744: Multicodec = {
  name: 'skein1024-744',
  code: CODE_SKEIN1024_744
}

export const CODEC_SKEIN1024_752: Multicodec = {
  name: 'skein1024-752',
  code: CODE_SKEIN1024_752
}

export const CODEC_SKEIN1024_760: Multicodec = {
  name: 'skein1024-760',
  code: CODE_SKEIN1024_760
}

export const CODEC_SKEIN1024_768: Multicodec = {
  name: 'skein1024-768',
  code: CODE_SKEIN1024_768
}

export const CODEC_SKEIN1024_776: Multicodec = {
  name: 'skein1024-776',
  code: CODE_SKEIN1024_776
}

export const CODEC_SKEIN1024_784: Multicodec = {
  name: 'skein1024-784',
  code: CODE_SKEIN1024_784
}

export const CODEC_SKEIN1024_792: Multicodec = {
  name: 'skein1024-792',
  code: CODE_SKEIN1024_792
}

export const CODEC_SKEIN1024_800: Multicodec = {
  name: 'skein1024-800',
  code: CODE_SKEIN1024_800
}

export const CODEC_SKEIN1024_808: Multicodec = {
  name: 'skein1024-808',
  code: CODE_SKEIN1024_808
}

export const CODEC_SKEIN1024_816: Multicodec = {
  name: 'skein1024-816',
  code: CODE_SKEIN1024_816
}

export const CODEC_SKEIN1024_824: Multicodec = {
  name: 'skein1024-824',
  code: CODE_SKEIN1024_824
}

export const CODEC_SKEIN1024_832: Multicodec = {
  name: 'skein1024-832',
  code: CODE_SKEIN1024_832
}

export const CODEC_SKEIN1024_840: Multicodec = {
  name: 'skein1024-840',
  code: CODE_SKEIN1024_840
}

export const CODEC_SKEIN1024_848: Multicodec = {
  name: 'skein1024-848',
  code: CODE_SKEIN1024_848
}

export const CODEC_SKEIN1024_856: Multicodec = {
  name: 'skein1024-856',
  code: CODE_SKEIN1024_856
}

export const CODEC_SKEIN1024_864: Multicodec = {
  name: 'skein1024-864',
  code: CODE_SKEIN1024_864
}

export const CODEC_SKEIN1024_872: Multicodec = {
  name: 'skein1024-872',
  code: CODE_SKEIN1024_872
}

export const CODEC_SKEIN1024_880: Multicodec = {
  name: 'skein1024-880',
  code: CODE_SKEIN1024_880
}

export const CODEC_SKEIN1024_888: Multicodec = {
  name: 'skein1024-888',
  code: CODE_SKEIN1024_888
}

export const CODEC_SKEIN1024_896: Multicodec = {
  name: 'skein1024-896',
  code: CODE_SKEIN1024_896
}

export const CODEC_SKEIN1024_904: Multicodec = {
  name: 'skein1024-904',
  code: CODE_SKEIN1024_904
}

export const CODEC_SKEIN1024_912: Multicodec = {
  name: 'skein1024-912',
  code: CODE_SKEIN1024_912
}

export const CODEC_SKEIN1024_920: Multicodec = {
  name: 'skein1024-920',
  code: CODE_SKEIN1024_920
}

export const CODEC_SKEIN1024_928: Multicodec = {
  name: 'skein1024-928',
  code: CODE_SKEIN1024_928
}

export const CODEC_SKEIN1024_936: Multicodec = {
  name: 'skein1024-936',
  code: CODE_SKEIN1024_936
}

export const CODEC_SKEIN1024_944: Multicodec = {
  name: 'skein1024-944',
  code: CODE_SKEIN1024_944
}

export const CODEC_SKEIN1024_952: Multicodec = {
  name: 'skein1024-952',
  code: CODE_SKEIN1024_952
}

export const CODEC_SKEIN1024_960: Multicodec = {
  name: 'skein1024-960',
  code: CODE_SKEIN1024_960
}

export const CODEC_SKEIN1024_968: Multicodec = {
  name: 'skein1024-968',
  code: CODE_SKEIN1024_968
}

export const CODEC_SKEIN1024_976: Multicodec = {
  name: 'skein1024-976',
  code: CODE_SKEIN1024_976
}

export const CODEC_SKEIN1024_984: Multicodec = {
  name: 'skein1024-984',
  code: CODE_SKEIN1024_984
}

export const CODEC_SKEIN1024_992: Multicodec = {
  name: 'skein1024-992',
  code: CODE_SKEIN1024_992
}

export const CODEC_SKEIN1024_1000: Multicodec = {
  name: 'skein1024-1000',
  code: CODE_SKEIN1024_1000
}

export const CODEC_SKEIN1024_1008: Multicodec = {
  name: 'skein1024-1008',
  code: CODE_SKEIN1024_1008
}

export const CODEC_SKEIN1024_1016: Multicodec = {
  name: 'skein1024-1016',
  code: CODE_SKEIN1024_1016
}

export const CODEC_SKEIN1024_1024: Multicodec = {
  name: 'skein1024-1024',
  code: CODE_SKEIN1024_1024
}

export const CODEC_XXH_32: Multicodec = {
  name: 'xxh-32',
  code: CODE_XXH_32,
  description: 'Extremely fast non-cryptographic hash algorithm'
}

export const CODEC_XXH_64: Multicodec = {
  name: 'xxh-64',
  code: CODE_XXH_64,
  description: 'Extremely fast non-cryptographic hash algorithm'
}

export const CODEC_XXH3_64: Multicodec = {
  name: 'xxh3-64',
  code: CODE_XXH3_64,
  description: 'Extremely fast non-cryptographic hash algorithm'
}

export const CODEC_XXH3_128: Multicodec = {
  name: 'xxh3-128',
  code: CODE_XXH3_128,
  description: 'Extremely fast non-cryptographic hash algorithm'
}

export const CODEC_POSEIDON_BLS12_381_A2_FC1: Multicodec = {
  name: 'poseidon-bls12_381-a2-fc1',
  code: CODE_POSEIDON_BLS12_381_A2_FC1,
  description: 'Poseidon using BLS12-381 and arity of 2 with Filecoin parameters'
}

export const CODEC_POSEIDON_BLS12_381_A2_FC1_SC: Multicodec = {
  name: 'poseidon-bls12_381-a2-fc1-sc',
  code: CODE_POSEIDON_BLS12_381_A2_FC1_SC,
  description: 'Poseidon using BLS12-381 and arity of 2 with Filecoin parameters - high-security variant'
}

export const CODEC_RDFC_1: Multicodec = {
  name: 'rdfc-1',
  code: CODE_RDFC_1,
  description: 'The result of canonicalizing an input according to RDFC-1.0 and then expressing its hash value as a multihash value.'
}

export const CODEC_SSZ: Multicodec = {
  name: 'ssz',
  code: CODE_SSZ,
  description: 'SimpleSerialize (SSZ) serialization'
}

export const CODEC_SSZ_SHA2_256_BMT: Multicodec = {
  name: 'ssz-sha2-256-bmt',
  code: CODE_SSZ_SHA2_256_BMT,
  description: 'SSZ Merkle tree root using SHA2-256 as the hashing function and SSZ serialization for the block binary'
}

export const CODEC_SHA2_256_CHUNKED: Multicodec = {
  name: 'sha2-256-chunked',
  code: CODE_SHA2_256_CHUNKED,
  description: 'Hash of concatenated SHA2-256 digests of 8*2^n MiB source chunks; n = ceil(log2(source_size/(10^4 * 8MiB)))'
}

export const CODEC_JSON_JCS: Multicodec = {
  name: 'json-jcs',
  code: CODE_JSON_JCS,
  description: 'The result of canonicalizing an input according to JCS - JSON Canonicalisation Scheme (RFC 8785)'
}

export const CODEC_BITTORRENT_PIECES_ROOT: Multicodec = {
  name: 'bittorrent-pieces-root',
  code: CODE_BITTORRENT_PIECES_ROOT,
  description: 'BitTorrent v2 pieces root hash.'
}

export const CODEC_ISCC: Multicodec = {
  name: 'iscc',
  code: CODE_ISCC,
  description: 'ISCC (International Standard Content Code) - similarity preserving hash'
}

export const CODEC_ZEROXCERT_IMPRINT_256: Multicodec = {
  name: 'zeroxcert-imprint-256',
  code: CODE_ZEROXCERT_IMPRINT_256,
  description: '0xcert Asset Imprint (root hash)'
}

export const CODEC_NONSTANDARD_SIG: Multicodec = {
  name: 'nonstandard-sig',
  code: CODE_NONSTANDARD_SIG,
  description: 'Namespace for all not yet standard signature algorithms'
}

export const CODEC_BCRYPT_PBKDF: Multicodec = {
  name: 'bcrypt-pbkdf',
  code: CODE_BCRYPT_PBKDF,
  description: 'Bcrypt-PBKDF key derivation function'
}

export const CODEC_ES256K: Multicodec = {
  name: 'es256k',
  code: CODE_ES256K,
  description: 'ES256K Signature Algorithm (secp256k1)'
}

export const CODEC_BLS12_381_G1_SIG: Multicodec = {
  name: 'bls12_381-g1-sig',
  code: CODE_BLS12_381_G1_SIG,
  description: 'G1 signature for BLS12-381'
}

export const CODEC_BLS12_381_G2_SIG: Multicodec = {
  name: 'bls12_381-g2-sig',
  code: CODE_BLS12_381_G2_SIG,
  description: 'G2 signature for BLS12-381'
}

export const CODEC_EDDSA: Multicodec = {
  name: 'eddsa',
  code: CODE_EDDSA,
  description: 'Edwards-Curve Digital Signature Algorithm'
}

export const CODEC_EIP_191: Multicodec = {
  name: 'eip-191',
  code: CODE_EIP_191,
  description: 'EIP-191 Ethereum Signed Data Standard'
}

export const CODEC_JWK_JCS_PUB: Multicodec = {
  name: 'jwk_jcs-pub',
  code: CODE_JWK_JCS_PUB,
  description: 'JSON object containing only the required members of a JWK (RFC 7518 and RFC 7517) representing the public key. Serialisation based on JCS (RFC 8785)'
}

export const CODEC_ED2K: Multicodec = {
  name: 'ed2k',
  code: CODE_ED2K,
  description: 'eDonkey2000 hash.'
}

export const CODEC_FIL_COMMITMENT_UNSEALED: Multicodec = {
  name: 'fil-commitment-unsealed',
  code: CODE_FIL_COMMITMENT_UNSEALED,
  description: 'Filecoin piece or sector data commitment merkle node/root (CommP & CommD)'
}

export const CODEC_FIL_COMMITMENT_SEALED: Multicodec = {
  name: 'fil-commitment-sealed',
  code: CODE_FIL_COMMITMENT_SEALED,
  description: 'Filecoin sector data commitment merkle node/root - sealed and replicated (CommR)'
}

export const CODEC_SHELTER_CONTRACT_MANIFEST: Multicodec = {
  name: 'shelter-contract-manifest',
  code: CODE_SHELTER_CONTRACT_MANIFEST,
  description: 'Shelter protocol contract manifest'
}

export const CODEC_SHELTER_CONTRACT_TEXT: Multicodec = {
  name: 'shelter-contract-text',
  code: CODE_SHELTER_CONTRACT_TEXT,
  description: 'Shelter protocol contract text'
}

export const CODEC_SHELTER_CONTRACT_DATA: Multicodec = {
  name: 'shelter-contract-data',
  code: CODE_SHELTER_CONTRACT_DATA,
  description: 'Shelter protocol contract data (contract chain)'
}

export const CODEC_SHELTER_FILE_MANIFEST: Multicodec = {
  name: 'shelter-file-manifest',
  code: CODE_SHELTER_FILE_MANIFEST,
  description: 'Shelter protocol file manifest'
}

export const CODEC_SHELTER_FILE_CHUNK: Multicodec = {
  name: 'shelter-file-chunk',
  code: CODE_SHELTER_FILE_CHUNK,
  description: 'Shelter protocol file chunk'
}

export const CODEC_PLAINTEXTV2: Multicodec = {
  name: 'plaintextv2',
  code: CODE_PLAINTEXTV2
}

export const CODEC_HOLOCHAIN_ADR_V0: Multicodec = {
  name: 'holochain-adr-v0',
  code: CODE_HOLOCHAIN_ADR_V0,
  description: 'Holochain v0 address    + 8 R-S (63 x Base-32)'
}

export const CODEC_HOLOCHAIN_ADR_V1: Multicodec = {
  name: 'holochain-adr-v1',
  code: CODE_HOLOCHAIN_ADR_V1,
  description: 'Holochain v1 address    + 8 R-S (63 x Base-32)'
}

export const CODEC_HOLOCHAIN_KEY_V0: Multicodec = {
  name: 'holochain-key-v0',
  code: CODE_HOLOCHAIN_KEY_V0,
  description: 'Holochain v0 public key + 8 R-S (63 x Base-32)'
}

export const CODEC_HOLOCHAIN_KEY_V1: Multicodec = {
  name: 'holochain-key-v1',
  code: CODE_HOLOCHAIN_KEY_V1,
  description: 'Holochain v1 public key + 8 R-S (63 x Base-32)'
}

export const CODEC_HOLOCHAIN_SIG_V0: Multicodec = {
  name: 'holochain-sig-v0',
  code: CODE_HOLOCHAIN_SIG_V0,
  description: 'Holochain v0 signature  + 8 R-S (63 x Base-32)'
}

export const CODEC_HOLOCHAIN_SIG_V1: Multicodec = {
  name: 'holochain-sig-v1',
  code: CODE_HOLOCHAIN_SIG_V1,
  description: 'Holochain v1 signature  + 8 R-S (63 x Base-32)'
}

export const CODEC_SKYNET_NS: Multicodec = {
  name: 'skynet-ns',
  code: CODE_SKYNET_NS,
  description: 'Skynet Namespace'
}

export const CODEC_ARWEAVE_NS: Multicodec = {
  name: 'arweave-ns',
  code: CODE_ARWEAVE_NS,
  description: 'Arweave Namespace'
}

export const CODEC_SUBSPACE_NS: Multicodec = {
  name: 'subspace-ns',
  code: CODE_SUBSPACE_NS,
  description: 'Subspace Network Namespace'
}

export const CODEC_KUMANDRA_NS: Multicodec = {
  name: 'kumandra-ns',
  code: CODE_KUMANDRA_NS,
  description: 'Kumandra Network Namespace'
}

export const CODEC_ES256: Multicodec = {
  name: 'es256',
  code: CODE_ES256,
  description: 'ES256 Signature Algorithm'
}

export const CODEC_ES384: Multicodec = {
  name: 'es384',
  code: CODE_ES384,
  description: 'ES384 Signature Algorithm'
}

export const CODEC_ES512: Multicodec = {
  name: 'es512',
  code: CODE_ES512,
  description: 'ES512 Signature Algorithm'
}

export const CODEC_RS256: Multicodec = {
  name: 'rs256',
  code: CODE_RS256,
  description: 'RS256 Signature Algorithm'
}

export const CODEC_ES256K_MSIG: Multicodec = {
  name: 'es256k-msig',
  code: CODE_ES256K_MSIG,
  description: 'ES256K (secp256k1) Signature as Multisig'
}

export const CODEC_BLS12_381_G1_MSIG: Multicodec = {
  name: 'bls12_381-g1-msig',
  code: CODE_BLS12_381_G1_MSIG,
  description: 'G1 signature for BLS-12381-G2 as Multisig'
}

export const CODEC_BLS12_381_G2_MSIG: Multicodec = {
  name: 'bls12_381-g2-msig',
  code: CODE_BLS12_381_G2_MSIG,
  description: 'G2 signature for BLS-12381-G1 as Multisig'
}

export const CODEC_EDDSA_MSIG: Multicodec = {
  name: 'eddsa-msig',
  code: CODE_EDDSA_MSIG,
  description: 'Edwards-Curve Digital Signature as Multisig'
}

export const CODEC_BLS12_381_G1_SHARE_MSIG: Multicodec = {
  name: 'bls12_381-g1-share-msig',
  code: CODE_BLS12_381_G1_SHARE_MSIG,
  description: 'G1 threshold signature share for BLS-12381-G2 as Multisig'
}

export const CODEC_BLS12_381_G2_SHARE_MSIG: Multicodec = {
  name: 'bls12_381-g2-share-msig',
  code: CODE_BLS12_381_G2_SHARE_MSIG,
  description: 'G2 threshold signature share for BLS-12381-G1 as Multisig'
}

export const CODEC_LAMPORT_MSIG: Multicodec = {
  name: 'lamport-msig',
  code: CODE_LAMPORT_MSIG,
  description: 'Lamport signature as Multisig'
}

export const CODEC_LAMPORT_SHARE_MSIG: Multicodec = {
  name: 'lamport-share-msig',
  code: CODE_LAMPORT_SHARE_MSIG,
  description: 'Lamport threshold signature share as Multisig'
}

export const CODEC_ES256_MSIG: Multicodec = {
  name: 'es256-msig',
  code: CODE_ES256_MSIG,
  description: 'ECDSA P-256 Signature as Multisig'
}

export const CODEC_ES384_MSIG: Multicodec = {
  name: 'es384-msig',
  code: CODE_ES384_MSIG,
  description: 'ECDSA P-384 Signature as Multisig'
}

export const CODEC_ES521_MSIG: Multicodec = {
  name: 'es521-msig',
  code: CODE_ES521_MSIG,
  description: 'ECDSA P-521 Signature as Multisig'
}

export const CODEC_RS256_MSIG: Multicodec = {
  name: 'rs256-msig',
  code: CODE_RS256_MSIG,
  description: 'RS256 Signature as Multisig'
}

export const CODEC_SCION: Multicodec = {
  name: 'scion',
  code: CODE_SCION,
  description: 'SCION Internet architecture'
}

export const MULTICODECS: Record<number, Multicodec> = {
  [CODE_IDENTITY]: CODEC_IDENTITY,
  [CODE_CIDV1]: CODEC_CIDV1,
  [CODE_CIDV2]: CODEC_CIDV2,
  [CODE_CIDV3]: CODEC_CIDV3,
  [CODE_IP4]: CODEC_IP4,
  [CODE_TCP]: CODEC_TCP,
  [CODE_SHA1]: CODEC_SHA1,
  [CODE_SHA2_256]: CODEC_SHA2_256,
  [CODE_SHA2_512]: CODEC_SHA2_512,
  [CODE_SHA3_512]: CODEC_SHA3_512,
  [CODE_SHA3_384]: CODEC_SHA3_384,
  [CODE_SHA3_256]: CODEC_SHA3_256,
  [CODE_SHA3_224]: CODEC_SHA3_224,
  [CODE_SHAKE_128]: CODEC_SHAKE_128,
  [CODE_SHAKE_256]: CODEC_SHAKE_256,
  [CODE_KECCAK_224]: CODEC_KECCAK_224,
  [CODE_KECCAK_256]: CODEC_KECCAK_256,
  [CODE_KECCAK_384]: CODEC_KECCAK_384,
  [CODE_KECCAK_512]: CODEC_KECCAK_512,
  [CODE_BLAKE3]: CODEC_BLAKE3,
  [CODE_SHA2_384]: CODEC_SHA2_384,
  [CODE_DCCP]: CODEC_DCCP,
  [CODE_MURMUR3_X64_64]: CODEC_MURMUR3_X64_64,
  [CODE_MURMUR3_32]: CODEC_MURMUR3_32,
  [CODE_IP6]: CODEC_IP6,
  [CODE_IP6ZONE]: CODEC_IP6ZONE,
  [CODE_IPCIDR]: CODEC_IPCIDR,
  [CODE_PATH]: CODEC_PATH,
  [CODE_MULTICODEC]: CODEC_MULTICODEC,
  [CODE_MULTIHASH]: CODEC_MULTIHASH,
  [CODE_MULTIADDR]: CODEC_MULTIADDR,
  [CODE_MULTIBASE]: CODEC_MULTIBASE,
  [CODE_VARSIG]: CODEC_VARSIG,
  [CODE_DNS]: CODEC_DNS,
  [CODE_DNS4]: CODEC_DNS4,
  [CODE_DNS6]: CODEC_DNS6,
  [CODE_DNSADDR]: CODEC_DNSADDR,
  [CODE_PROTOBUF]: CODEC_PROTOBUF,
  [CODE_CBOR]: CODEC_CBOR,
  [CODE_RAW]: CODEC_RAW,
  [CODE_DBL_SHA2_256]: CODEC_DBL_SHA2_256,
  [CODE_RLP]: CODEC_RLP,
  [CODE_BENCODE]: CODEC_BENCODE,
  [CODE_DAG_PB]: CODEC_DAG_PB,
  [CODE_DAG_CBOR]: CODEC_DAG_CBOR,
  [CODE_LIBP2P_KEY]: CODEC_LIBP2P_KEY,
  [CODE_GIT_RAW]: CODEC_GIT_RAW,
  [CODE_TORRENT_INFO]: CODEC_TORRENT_INFO,
  [CODE_TORRENT_FILE]: CODEC_TORRENT_FILE,
  [CODE_BLAKE3_HASHSEQ]: CODEC_BLAKE3_HASHSEQ,
  [CODE_LEOFCOIN_BLOCK]: CODEC_LEOFCOIN_BLOCK,
  [CODE_LEOFCOIN_TX]: CODEC_LEOFCOIN_TX,
  [CODE_LEOFCOIN_PR]: CODEC_LEOFCOIN_PR,
  [CODE_SCTP]: CODEC_SCTP,
  [CODE_DAG_JOSE]: CODEC_DAG_JOSE,
  [CODE_DAG_COSE]: CODEC_DAG_COSE,
  [CODE_LBRY]: CODEC_LBRY,
  [CODE_ETH_BLOCK]: CODEC_ETH_BLOCK,
  [CODE_ETH_BLOCK_LIST]: CODEC_ETH_BLOCK_LIST,
  [CODE_ETH_TX_TRIE]: CODEC_ETH_TX_TRIE,
  [CODE_ETH_TX]: CODEC_ETH_TX,
  [CODE_ETH_TX_RECEIPT_TRIE]: CODEC_ETH_TX_RECEIPT_TRIE,
  [CODE_ETH_TX_RECEIPT]: CODEC_ETH_TX_RECEIPT,
  [CODE_ETH_STATE_TRIE]: CODEC_ETH_STATE_TRIE,
  [CODE_ETH_ACCOUNT_SNAPSHOT]: CODEC_ETH_ACCOUNT_SNAPSHOT,
  [CODE_ETH_STORAGE_TRIE]: CODEC_ETH_STORAGE_TRIE,
  [CODE_ETH_RECEIPT_LOG_TRIE]: CODEC_ETH_RECEIPT_LOG_TRIE,
  [CODE_ETH_RECEIPT_LOG]: CODEC_ETH_RECEIPT_LOG,
  [CODE_AES_128]: CODEC_AES_128,
  [CODE_AES_192]: CODEC_AES_192,
  [CODE_AES_256]: CODEC_AES_256,
  [CODE_CHACHA_128]: CODEC_CHACHA_128,
  [CODE_CHACHA_256]: CODEC_CHACHA_256,
  [CODE_BITCOIN_BLOCK]: CODEC_BITCOIN_BLOCK,
  [CODE_BITCOIN_TX]: CODEC_BITCOIN_TX,
  [CODE_BITCOIN_WITNESS_COMMITMENT]: CODEC_BITCOIN_WITNESS_COMMITMENT,
  [CODE_ZCASH_BLOCK]: CODEC_ZCASH_BLOCK,
  [CODE_ZCASH_TX]: CODEC_ZCASH_TX,
  [CODE_CAIP_50]: CODEC_CAIP_50,
  [CODE_STREAMID]: CODEC_STREAMID,
  [CODE_STELLAR_BLOCK]: CODEC_STELLAR_BLOCK,
  [CODE_STELLAR_TX]: CODEC_STELLAR_TX,
  [CODE_MD4]: CODEC_MD4,
  [CODE_MD5]: CODEC_MD5,
  [CODE_DECRED_BLOCK]: CODEC_DECRED_BLOCK,
  [CODE_DECRED_TX]: CODEC_DECRED_TX,
  [CODE_IPLD]: CODEC_IPLD,
  [CODE_IPFS]: CODEC_IPFS,
  [CODE_SWARM]: CODEC_SWARM,
  [CODE_IPNS]: CODEC_IPNS,
  [CODE_ZERONET]: CODEC_ZERONET,
  [CODE_SECP256K1_PUB]: CODEC_SECP256K1_PUB,
  [CODE_DNSLINK]: CODEC_DNSLINK,
  [CODE_BLS12_381_G1_PUB]: CODEC_BLS12_381_G1_PUB,
  [CODE_BLS12_381_G2_PUB]: CODEC_BLS12_381_G2_PUB,
  [CODE_X25519_PUB]: CODEC_X25519_PUB,
  [CODE_ED25519_PUB]: CODEC_ED25519_PUB,
  [CODE_BLS12_381_G1G2_PUB]: CODEC_BLS12_381_G1G2_PUB,
  [CODE_SR25519_PUB]: CODEC_SR25519_PUB,
  [CODE_DASH_BLOCK]: CODEC_DASH_BLOCK,
  [CODE_DASH_TX]: CODEC_DASH_TX,
  [CODE_SWARM_MANIFEST]: CODEC_SWARM_MANIFEST,
  [CODE_SWARM_FEED]: CODEC_SWARM_FEED,
  [CODE_BEESON]: CODEC_BEESON,
  [CODE_UDP]: CODEC_UDP,
  [CODE_P2P_WEBRTC_STAR]: CODEC_P2P_WEBRTC_STAR,
  [CODE_P2P_WEBRTC_DIRECT]: CODEC_P2P_WEBRTC_DIRECT,
  [CODE_P2P_STARDUST]: CODEC_P2P_STARDUST,
  [CODE_WEBRTC_DIRECT]: CODEC_WEBRTC_DIRECT,
  [CODE_WEBRTC]: CODEC_WEBRTC,
  [CODE_P2P_CIRCUIT]: CODEC_P2P_CIRCUIT,
  [CODE_DAG_JSON]: CODEC_DAG_JSON,
  [CODE_UDT]: CODEC_UDT,
  [CODE_UTP]: CODEC_UTP,
  [CODE_CRC32]: CODEC_CRC32,
  [CODE_CRC64_ECMA]: CODEC_CRC64_ECMA,
  [CODE_CRC64_NVME]: CODEC_CRC64_NVME,
  [CODE_UNIX]: CODEC_UNIX,
  [CODE_THREAD]: CODEC_THREAD,
  [CODE_P2P]: CODEC_P2P,
  [CODE_HTTPS]: CODEC_HTTPS,
  [CODE_ONION]: CODEC_ONION,
  [CODE_ONION3]: CODEC_ONION3,
  [CODE_GARLIC64]: CODEC_GARLIC64,
  [CODE_GARLIC32]: CODEC_GARLIC32,
  [CODE_TLS]: CODEC_TLS,
  [CODE_SNI]: CODEC_SNI,
  [CODE_NOISE]: CODEC_NOISE,
  [CODE_SHS]: CODEC_SHS,
  [CODE_QUIC]: CODEC_QUIC,
  [CODE_QUIC_V1]: CODEC_QUIC_V1,
  [CODE_WEBTRANSPORT]: CODEC_WEBTRANSPORT,
  [CODE_CERTHASH]: CODEC_CERTHASH,
  [CODE_WS]: CODEC_WS,
  [CODE_WSS]: CODEC_WSS,
  [CODE_P2P_WEBSOCKET_STAR]: CODEC_P2P_WEBSOCKET_STAR,
  [CODE_HTTP]: CODEC_HTTP,
  [CODE_HTTP_PATH]: CODEC_HTTP_PATH,
  [CODE_SWHID_1_SNP]: CODEC_SWHID_1_SNP,
  [CODE_JSON]: CODEC_JSON,
  [CODE_MESSAGEPACK]: CODEC_MESSAGEPACK,
  [CODE_CAR]: CODEC_CAR,
  [CODE_X509_CERTIFICATE]: CODEC_X509_CERTIFICATE,
  [CODE_IPNS_RECORD]: CODEC_IPNS_RECORD,
  [CODE_LIBP2P_PEER_RECORD]: CODEC_LIBP2P_PEER_RECORD,
  [CODE_LIBP2P_RELAY_RSVP]: CODEC_LIBP2P_RELAY_RSVP,
  [CODE_MEMORYTRANSPORT]: CODEC_MEMORYTRANSPORT,
  [CODE_CAR_INDEX_SORTED]: CODEC_CAR_INDEX_SORTED,
  [CODE_CAR_MULTIHASH_INDEX_SORTED]: CODEC_CAR_MULTIHASH_INDEX_SORTED,
  [CODE_TRANSPORT_BITSWAP]: CODEC_TRANSPORT_BITSWAP,
  [CODE_TRANSPORT_GRAPHSYNC_FILECOINV1]: CODEC_TRANSPORT_GRAPHSYNC_FILECOINV1,
  [CODE_TRANSPORT_IPFS_GATEWAY_HTTP]: CODEC_TRANSPORT_IPFS_GATEWAY_HTTP,
  [CODE_TRANSPORT_FILECOIN_PIECE_HTTP]: CODEC_TRANSPORT_FILECOIN_PIECE_HTTP,
  [CODE_MULTIDID]: CODEC_MULTIDID,
  [CODE_FR32_SHA256_TRUNC254_PADBINTREE]: CODEC_FR32_SHA256_TRUNC254_PADBINTREE,
  [CODE_SHA2_256_TRUNC254_PADDED]: CODEC_SHA2_256_TRUNC254_PADDED,
  [CODE_SHA2_224]: CODEC_SHA2_224,
  [CODE_SHA2_512_224]: CODEC_SHA2_512_224,
  [CODE_SHA2_512_256]: CODEC_SHA2_512_256,
  [CODE_MURMUR3_X64_128]: CODEC_MURMUR3_X64_128,
  [CODE_RIPEMD_128]: CODEC_RIPEMD_128,
  [CODE_RIPEMD_160]: CODEC_RIPEMD_160,
  [CODE_RIPEMD_256]: CODEC_RIPEMD_256,
  [CODE_RIPEMD_320]: CODEC_RIPEMD_320,
  [CODE_X11]: CODEC_X11,
  [CODE_P256_PUB]: CODEC_P256_PUB,
  [CODE_P384_PUB]: CODEC_P384_PUB,
  [CODE_P521_PUB]: CODEC_P521_PUB,
  [CODE_ED448_PUB]: CODEC_ED448_PUB,
  [CODE_X448_PUB]: CODEC_X448_PUB,
  [CODE_RSA_PUB]: CODEC_RSA_PUB,
  [CODE_SM2_PUB]: CODEC_SM2_PUB,
  [CODE_VLAD]: CODEC_VLAD,
  [CODE_PROVENANCE_LOG]: CODEC_PROVENANCE_LOG,
  [CODE_PROVENANCE_LOG_ENTRY]: CODEC_PROVENANCE_LOG_ENTRY,
  [CODE_PROVENANCE_LOG_SCRIPT]: CODEC_PROVENANCE_LOG_SCRIPT,
  [CODE_MLKEM_512_PUB]: CODEC_MLKEM_512_PUB,
  [CODE_MLKEM_768_PUB]: CODEC_MLKEM_768_PUB,
  [CODE_MLKEM_1024_PUB]: CODEC_MLKEM_1024_PUB,
  [CODE_MULTISIG]: CODEC_MULTISIG,
  [CODE_MULTIKEY]: CODEC_MULTIKEY,
  [CODE_NONCE]: CODEC_NONCE,
  [CODE_ED25519_PRIV]: CODEC_ED25519_PRIV,
  [CODE_SECP256K1_PRIV]: CODEC_SECP256K1_PRIV,
  [CODE_X25519_PRIV]: CODEC_X25519_PRIV,
  [CODE_SR25519_PRIV]: CODEC_SR25519_PRIV,
  [CODE_RSA_PRIV]: CODEC_RSA_PRIV,
  [CODE_P256_PRIV]: CODEC_P256_PRIV,
  [CODE_P384_PRIV]: CODEC_P384_PRIV,
  [CODE_P521_PRIV]: CODEC_P521_PRIV,
  [CODE_BLS12_381_G1_PRIV]: CODEC_BLS12_381_G1_PRIV,
  [CODE_BLS12_381_G2_PRIV]: CODEC_BLS12_381_G2_PRIV,
  [CODE_BLS12_381_G1G2_PRIV]: CODEC_BLS12_381_G1G2_PRIV,
  [CODE_BLS12_381_G1_PUB_SHARE]: CODEC_BLS12_381_G1_PUB_SHARE,
  [CODE_BLS12_381_G2_PUB_SHARE]: CODEC_BLS12_381_G2_PUB_SHARE,
  [CODE_BLS12_381_G1_PRIV_SHARE]: CODEC_BLS12_381_G1_PRIV_SHARE,
  [CODE_BLS12_381_G2_PRIV_SHARE]: CODEC_BLS12_381_G2_PRIV_SHARE,
  [CODE_SM2_PRIV]: CODEC_SM2_PRIV,
  [CODE_ED448_PRIV]: CODEC_ED448_PRIV,
  [CODE_X448_PRIV]: CODEC_X448_PRIV,
  [CODE_MLKEM_512_PRIV]: CODEC_MLKEM_512_PRIV,
  [CODE_MLKEM_768_PRIV]: CODEC_MLKEM_768_PRIV,
  [CODE_MLKEM_1024_PRIV]: CODEC_MLKEM_1024_PRIV,
  [CODE_JWK_JCS_PRIV]: CODEC_JWK_JCS_PRIV,
  [CODE_LAMPORT_SHA3_512_PUB]: CODEC_LAMPORT_SHA3_512_PUB,
  [CODE_LAMPORT_SHA3_384_PUB]: CODEC_LAMPORT_SHA3_384_PUB,
  [CODE_LAMPORT_SHA3_256_PUB]: CODEC_LAMPORT_SHA3_256_PUB,
  [CODE_LAMPORT_SHA3_512_PRIV]: CODEC_LAMPORT_SHA3_512_PRIV,
  [CODE_LAMPORT_SHA3_384_PRIV]: CODEC_LAMPORT_SHA3_384_PRIV,
  [CODE_LAMPORT_SHA3_256_PRIV]: CODEC_LAMPORT_SHA3_256_PRIV,
  [CODE_LAMPORT_SHA3_512_PRIV_SHARE]: CODEC_LAMPORT_SHA3_512_PRIV_SHARE,
  [CODE_LAMPORT_SHA3_384_PRIV_SHARE]: CODEC_LAMPORT_SHA3_384_PRIV_SHARE,
  [CODE_LAMPORT_SHA3_256_PRIV_SHARE]: CODEC_LAMPORT_SHA3_256_PRIV_SHARE,
  [CODE_LAMPORT_SHA3_512_SIG]: CODEC_LAMPORT_SHA3_512_SIG,
  [CODE_LAMPORT_SHA3_384_SIG]: CODEC_LAMPORT_SHA3_384_SIG,
  [CODE_LAMPORT_SHA3_256_SIG]: CODEC_LAMPORT_SHA3_256_SIG,
  [CODE_LAMPORT_SHA3_512_SIG_SHARE]: CODEC_LAMPORT_SHA3_512_SIG_SHARE,
  [CODE_LAMPORT_SHA3_384_SIG_SHARE]: CODEC_LAMPORT_SHA3_384_SIG_SHARE,
  [CODE_LAMPORT_SHA3_256_SIG_SHARE]: CODEC_LAMPORT_SHA3_256_SIG_SHARE,
  [CODE_KANGAROOTWELVE]: CODEC_KANGAROOTWELVE,
  [CODE_AES_GCM_256]: CODEC_AES_GCM_256,
  [CODE_SILVERPINE]: CODEC_SILVERPINE,
  [CODE_SM3_256]: CODEC_SM3_256,
  [CODE_SHA256A]: CODEC_SHA256A,
  [CODE_CHACHA20_POLY1305]: CODEC_CHACHA20_POLY1305,
  [CODE_BLAKE2B_8]: CODEC_BLAKE2B_8,
  [CODE_BLAKE2B_16]: CODEC_BLAKE2B_16,
  [CODE_BLAKE2B_24]: CODEC_BLAKE2B_24,
  [CODE_BLAKE2B_32]: CODEC_BLAKE2B_32,
  [CODE_BLAKE2B_40]: CODEC_BLAKE2B_40,
  [CODE_BLAKE2B_48]: CODEC_BLAKE2B_48,
  [CODE_BLAKE2B_56]: CODEC_BLAKE2B_56,
  [CODE_BLAKE2B_64]: CODEC_BLAKE2B_64,
  [CODE_BLAKE2B_72]: CODEC_BLAKE2B_72,
  [CODE_BLAKE2B_80]: CODEC_BLAKE2B_80,
  [CODE_BLAKE2B_88]: CODEC_BLAKE2B_88,
  [CODE_BLAKE2B_96]: CODEC_BLAKE2B_96,
  [CODE_BLAKE2B_104]: CODEC_BLAKE2B_104,
  [CODE_BLAKE2B_112]: CODEC_BLAKE2B_112,
  [CODE_BLAKE2B_120]: CODEC_BLAKE2B_120,
  [CODE_BLAKE2B_128]: CODEC_BLAKE2B_128,
  [CODE_BLAKE2B_136]: CODEC_BLAKE2B_136,
  [CODE_BLAKE2B_144]: CODEC_BLAKE2B_144,
  [CODE_BLAKE2B_152]: CODEC_BLAKE2B_152,
  [CODE_BLAKE2B_160]: CODEC_BLAKE2B_160,
  [CODE_BLAKE2B_168]: CODEC_BLAKE2B_168,
  [CODE_BLAKE2B_176]: CODEC_BLAKE2B_176,
  [CODE_BLAKE2B_184]: CODEC_BLAKE2B_184,
  [CODE_BLAKE2B_192]: CODEC_BLAKE2B_192,
  [CODE_BLAKE2B_200]: CODEC_BLAKE2B_200,
  [CODE_BLAKE2B_208]: CODEC_BLAKE2B_208,
  [CODE_BLAKE2B_216]: CODEC_BLAKE2B_216,
  [CODE_BLAKE2B_224]: CODEC_BLAKE2B_224,
  [CODE_BLAKE2B_232]: CODEC_BLAKE2B_232,
  [CODE_BLAKE2B_240]: CODEC_BLAKE2B_240,
  [CODE_BLAKE2B_248]: CODEC_BLAKE2B_248,
  [CODE_BLAKE2B_256]: CODEC_BLAKE2B_256,
  [CODE_BLAKE2B_264]: CODEC_BLAKE2B_264,
  [CODE_BLAKE2B_272]: CODEC_BLAKE2B_272,
  [CODE_BLAKE2B_280]: CODEC_BLAKE2B_280,
  [CODE_BLAKE2B_288]: CODEC_BLAKE2B_288,
  [CODE_BLAKE2B_296]: CODEC_BLAKE2B_296,
  [CODE_BLAKE2B_304]: CODEC_BLAKE2B_304,
  [CODE_BLAKE2B_312]: CODEC_BLAKE2B_312,
  [CODE_BLAKE2B_320]: CODEC_BLAKE2B_320,
  [CODE_BLAKE2B_328]: CODEC_BLAKE2B_328,
  [CODE_BLAKE2B_336]: CODEC_BLAKE2B_336,
  [CODE_BLAKE2B_344]: CODEC_BLAKE2B_344,
  [CODE_BLAKE2B_352]: CODEC_BLAKE2B_352,
  [CODE_BLAKE2B_360]: CODEC_BLAKE2B_360,
  [CODE_BLAKE2B_368]: CODEC_BLAKE2B_368,
  [CODE_BLAKE2B_376]: CODEC_BLAKE2B_376,
  [CODE_BLAKE2B_384]: CODEC_BLAKE2B_384,
  [CODE_BLAKE2B_392]: CODEC_BLAKE2B_392,
  [CODE_BLAKE2B_400]: CODEC_BLAKE2B_400,
  [CODE_BLAKE2B_408]: CODEC_BLAKE2B_408,
  [CODE_BLAKE2B_416]: CODEC_BLAKE2B_416,
  [CODE_BLAKE2B_424]: CODEC_BLAKE2B_424,
  [CODE_BLAKE2B_432]: CODEC_BLAKE2B_432,
  [CODE_BLAKE2B_440]: CODEC_BLAKE2B_440,
  [CODE_BLAKE2B_448]: CODEC_BLAKE2B_448,
  [CODE_BLAKE2B_456]: CODEC_BLAKE2B_456,
  [CODE_BLAKE2B_464]: CODEC_BLAKE2B_464,
  [CODE_BLAKE2B_472]: CODEC_BLAKE2B_472,
  [CODE_BLAKE2B_480]: CODEC_BLAKE2B_480,
  [CODE_BLAKE2B_488]: CODEC_BLAKE2B_488,
  [CODE_BLAKE2B_496]: CODEC_BLAKE2B_496,
  [CODE_BLAKE2B_504]: CODEC_BLAKE2B_504,
  [CODE_BLAKE2B_512]: CODEC_BLAKE2B_512,
  [CODE_BLAKE2S_8]: CODEC_BLAKE2S_8,
  [CODE_BLAKE2S_16]: CODEC_BLAKE2S_16,
  [CODE_BLAKE2S_24]: CODEC_BLAKE2S_24,
  [CODE_BLAKE2S_32]: CODEC_BLAKE2S_32,
  [CODE_BLAKE2S_40]: CODEC_BLAKE2S_40,
  [CODE_BLAKE2S_48]: CODEC_BLAKE2S_48,
  [CODE_BLAKE2S_56]: CODEC_BLAKE2S_56,
  [CODE_BLAKE2S_64]: CODEC_BLAKE2S_64,
  [CODE_BLAKE2S_72]: CODEC_BLAKE2S_72,
  [CODE_BLAKE2S_80]: CODEC_BLAKE2S_80,
  [CODE_BLAKE2S_88]: CODEC_BLAKE2S_88,
  [CODE_BLAKE2S_96]: CODEC_BLAKE2S_96,
  [CODE_BLAKE2S_104]: CODEC_BLAKE2S_104,
  [CODE_BLAKE2S_112]: CODEC_BLAKE2S_112,
  [CODE_BLAKE2S_120]: CODEC_BLAKE2S_120,
  [CODE_BLAKE2S_128]: CODEC_BLAKE2S_128,
  [CODE_BLAKE2S_136]: CODEC_BLAKE2S_136,
  [CODE_BLAKE2S_144]: CODEC_BLAKE2S_144,
  [CODE_BLAKE2S_152]: CODEC_BLAKE2S_152,
  [CODE_BLAKE2S_160]: CODEC_BLAKE2S_160,
  [CODE_BLAKE2S_168]: CODEC_BLAKE2S_168,
  [CODE_BLAKE2S_176]: CODEC_BLAKE2S_176,
  [CODE_BLAKE2S_184]: CODEC_BLAKE2S_184,
  [CODE_BLAKE2S_192]: CODEC_BLAKE2S_192,
  [CODE_BLAKE2S_200]: CODEC_BLAKE2S_200,
  [CODE_BLAKE2S_208]: CODEC_BLAKE2S_208,
  [CODE_BLAKE2S_216]: CODEC_BLAKE2S_216,
  [CODE_BLAKE2S_224]: CODEC_BLAKE2S_224,
  [CODE_BLAKE2S_232]: CODEC_BLAKE2S_232,
  [CODE_BLAKE2S_240]: CODEC_BLAKE2S_240,
  [CODE_BLAKE2S_248]: CODEC_BLAKE2S_248,
  [CODE_BLAKE2S_256]: CODEC_BLAKE2S_256,
  [CODE_SKEIN256_8]: CODEC_SKEIN256_8,
  [CODE_SKEIN256_16]: CODEC_SKEIN256_16,
  [CODE_SKEIN256_24]: CODEC_SKEIN256_24,
  [CODE_SKEIN256_32]: CODEC_SKEIN256_32,
  [CODE_SKEIN256_40]: CODEC_SKEIN256_40,
  [CODE_SKEIN256_48]: CODEC_SKEIN256_48,
  [CODE_SKEIN256_56]: CODEC_SKEIN256_56,
  [CODE_SKEIN256_64]: CODEC_SKEIN256_64,
  [CODE_SKEIN256_72]: CODEC_SKEIN256_72,
  [CODE_SKEIN256_80]: CODEC_SKEIN256_80,
  [CODE_SKEIN256_88]: CODEC_SKEIN256_88,
  [CODE_SKEIN256_96]: CODEC_SKEIN256_96,
  [CODE_SKEIN256_104]: CODEC_SKEIN256_104,
  [CODE_SKEIN256_112]: CODEC_SKEIN256_112,
  [CODE_SKEIN256_120]: CODEC_SKEIN256_120,
  [CODE_SKEIN256_128]: CODEC_SKEIN256_128,
  [CODE_SKEIN256_136]: CODEC_SKEIN256_136,
  [CODE_SKEIN256_144]: CODEC_SKEIN256_144,
  [CODE_SKEIN256_152]: CODEC_SKEIN256_152,
  [CODE_SKEIN256_160]: CODEC_SKEIN256_160,
  [CODE_SKEIN256_168]: CODEC_SKEIN256_168,
  [CODE_SKEIN256_176]: CODEC_SKEIN256_176,
  [CODE_SKEIN256_184]: CODEC_SKEIN256_184,
  [CODE_SKEIN256_192]: CODEC_SKEIN256_192,
  [CODE_SKEIN256_200]: CODEC_SKEIN256_200,
  [CODE_SKEIN256_208]: CODEC_SKEIN256_208,
  [CODE_SKEIN256_216]: CODEC_SKEIN256_216,
  [CODE_SKEIN256_224]: CODEC_SKEIN256_224,
  [CODE_SKEIN256_232]: CODEC_SKEIN256_232,
  [CODE_SKEIN256_240]: CODEC_SKEIN256_240,
  [CODE_SKEIN256_248]: CODEC_SKEIN256_248,
  [CODE_SKEIN256_256]: CODEC_SKEIN256_256,
  [CODE_SKEIN512_8]: CODEC_SKEIN512_8,
  [CODE_SKEIN512_16]: CODEC_SKEIN512_16,
  [CODE_SKEIN512_24]: CODEC_SKEIN512_24,
  [CODE_SKEIN512_32]: CODEC_SKEIN512_32,
  [CODE_SKEIN512_40]: CODEC_SKEIN512_40,
  [CODE_SKEIN512_48]: CODEC_SKEIN512_48,
  [CODE_SKEIN512_56]: CODEC_SKEIN512_56,
  [CODE_SKEIN512_64]: CODEC_SKEIN512_64,
  [CODE_SKEIN512_72]: CODEC_SKEIN512_72,
  [CODE_SKEIN512_80]: CODEC_SKEIN512_80,
  [CODE_SKEIN512_88]: CODEC_SKEIN512_88,
  [CODE_SKEIN512_96]: CODEC_SKEIN512_96,
  [CODE_SKEIN512_104]: CODEC_SKEIN512_104,
  [CODE_SKEIN512_112]: CODEC_SKEIN512_112,
  [CODE_SKEIN512_120]: CODEC_SKEIN512_120,
  [CODE_SKEIN512_128]: CODEC_SKEIN512_128,
  [CODE_SKEIN512_136]: CODEC_SKEIN512_136,
  [CODE_SKEIN512_144]: CODEC_SKEIN512_144,
  [CODE_SKEIN512_152]: CODEC_SKEIN512_152,
  [CODE_SKEIN512_160]: CODEC_SKEIN512_160,
  [CODE_SKEIN512_168]: CODEC_SKEIN512_168,
  [CODE_SKEIN512_176]: CODEC_SKEIN512_176,
  [CODE_SKEIN512_184]: CODEC_SKEIN512_184,
  [CODE_SKEIN512_192]: CODEC_SKEIN512_192,
  [CODE_SKEIN512_200]: CODEC_SKEIN512_200,
  [CODE_SKEIN512_208]: CODEC_SKEIN512_208,
  [CODE_SKEIN512_216]: CODEC_SKEIN512_216,
  [CODE_SKEIN512_224]: CODEC_SKEIN512_224,
  [CODE_SKEIN512_232]: CODEC_SKEIN512_232,
  [CODE_SKEIN512_240]: CODEC_SKEIN512_240,
  [CODE_SKEIN512_248]: CODEC_SKEIN512_248,
  [CODE_SKEIN512_256]: CODEC_SKEIN512_256,
  [CODE_SKEIN512_264]: CODEC_SKEIN512_264,
  [CODE_SKEIN512_272]: CODEC_SKEIN512_272,
  [CODE_SKEIN512_280]: CODEC_SKEIN512_280,
  [CODE_SKEIN512_288]: CODEC_SKEIN512_288,
  [CODE_SKEIN512_296]: CODEC_SKEIN512_296,
  [CODE_SKEIN512_304]: CODEC_SKEIN512_304,
  [CODE_SKEIN512_312]: CODEC_SKEIN512_312,
  [CODE_SKEIN512_320]: CODEC_SKEIN512_320,
  [CODE_SKEIN512_328]: CODEC_SKEIN512_328,
  [CODE_SKEIN512_336]: CODEC_SKEIN512_336,
  [CODE_SKEIN512_344]: CODEC_SKEIN512_344,
  [CODE_SKEIN512_352]: CODEC_SKEIN512_352,
  [CODE_SKEIN512_360]: CODEC_SKEIN512_360,
  [CODE_SKEIN512_368]: CODEC_SKEIN512_368,
  [CODE_SKEIN512_376]: CODEC_SKEIN512_376,
  [CODE_SKEIN512_384]: CODEC_SKEIN512_384,
  [CODE_SKEIN512_392]: CODEC_SKEIN512_392,
  [CODE_SKEIN512_400]: CODEC_SKEIN512_400,
  [CODE_SKEIN512_408]: CODEC_SKEIN512_408,
  [CODE_SKEIN512_416]: CODEC_SKEIN512_416,
  [CODE_SKEIN512_424]: CODEC_SKEIN512_424,
  [CODE_SKEIN512_432]: CODEC_SKEIN512_432,
  [CODE_SKEIN512_440]: CODEC_SKEIN512_440,
  [CODE_SKEIN512_448]: CODEC_SKEIN512_448,
  [CODE_SKEIN512_456]: CODEC_SKEIN512_456,
  [CODE_SKEIN512_464]: CODEC_SKEIN512_464,
  [CODE_SKEIN512_472]: CODEC_SKEIN512_472,
  [CODE_SKEIN512_480]: CODEC_SKEIN512_480,
  [CODE_SKEIN512_488]: CODEC_SKEIN512_488,
  [CODE_SKEIN512_496]: CODEC_SKEIN512_496,
  [CODE_SKEIN512_504]: CODEC_SKEIN512_504,
  [CODE_SKEIN512_512]: CODEC_SKEIN512_512,
  [CODE_SKEIN1024_8]: CODEC_SKEIN1024_8,
  [CODE_SKEIN1024_16]: CODEC_SKEIN1024_16,
  [CODE_SKEIN1024_24]: CODEC_SKEIN1024_24,
  [CODE_SKEIN1024_32]: CODEC_SKEIN1024_32,
  [CODE_SKEIN1024_40]: CODEC_SKEIN1024_40,
  [CODE_SKEIN1024_48]: CODEC_SKEIN1024_48,
  [CODE_SKEIN1024_56]: CODEC_SKEIN1024_56,
  [CODE_SKEIN1024_64]: CODEC_SKEIN1024_64,
  [CODE_SKEIN1024_72]: CODEC_SKEIN1024_72,
  [CODE_SKEIN1024_80]: CODEC_SKEIN1024_80,
  [CODE_SKEIN1024_88]: CODEC_SKEIN1024_88,
  [CODE_SKEIN1024_96]: CODEC_SKEIN1024_96,
  [CODE_SKEIN1024_104]: CODEC_SKEIN1024_104,
  [CODE_SKEIN1024_112]: CODEC_SKEIN1024_112,
  [CODE_SKEIN1024_120]: CODEC_SKEIN1024_120,
  [CODE_SKEIN1024_128]: CODEC_SKEIN1024_128,
  [CODE_SKEIN1024_136]: CODEC_SKEIN1024_136,
  [CODE_SKEIN1024_144]: CODEC_SKEIN1024_144,
  [CODE_SKEIN1024_152]: CODEC_SKEIN1024_152,
  [CODE_SKEIN1024_160]: CODEC_SKEIN1024_160,
  [CODE_SKEIN1024_168]: CODEC_SKEIN1024_168,
  [CODE_SKEIN1024_176]: CODEC_SKEIN1024_176,
  [CODE_SKEIN1024_184]: CODEC_SKEIN1024_184,
  [CODE_SKEIN1024_192]: CODEC_SKEIN1024_192,
  [CODE_SKEIN1024_200]: CODEC_SKEIN1024_200,
  [CODE_SKEIN1024_208]: CODEC_SKEIN1024_208,
  [CODE_SKEIN1024_216]: CODEC_SKEIN1024_216,
  [CODE_SKEIN1024_224]: CODEC_SKEIN1024_224,
  [CODE_SKEIN1024_232]: CODEC_SKEIN1024_232,
  [CODE_SKEIN1024_240]: CODEC_SKEIN1024_240,
  [CODE_SKEIN1024_248]: CODEC_SKEIN1024_248,
  [CODE_SKEIN1024_256]: CODEC_SKEIN1024_256,
  [CODE_SKEIN1024_264]: CODEC_SKEIN1024_264,
  [CODE_SKEIN1024_272]: CODEC_SKEIN1024_272,
  [CODE_SKEIN1024_280]: CODEC_SKEIN1024_280,
  [CODE_SKEIN1024_288]: CODEC_SKEIN1024_288,
  [CODE_SKEIN1024_296]: CODEC_SKEIN1024_296,
  [CODE_SKEIN1024_304]: CODEC_SKEIN1024_304,
  [CODE_SKEIN1024_312]: CODEC_SKEIN1024_312,
  [CODE_SKEIN1024_320]: CODEC_SKEIN1024_320,
  [CODE_SKEIN1024_328]: CODEC_SKEIN1024_328,
  [CODE_SKEIN1024_336]: CODEC_SKEIN1024_336,
  [CODE_SKEIN1024_344]: CODEC_SKEIN1024_344,
  [CODE_SKEIN1024_352]: CODEC_SKEIN1024_352,
  [CODE_SKEIN1024_360]: CODEC_SKEIN1024_360,
  [CODE_SKEIN1024_368]: CODEC_SKEIN1024_368,
  [CODE_SKEIN1024_376]: CODEC_SKEIN1024_376,
  [CODE_SKEIN1024_384]: CODEC_SKEIN1024_384,
  [CODE_SKEIN1024_392]: CODEC_SKEIN1024_392,
  [CODE_SKEIN1024_400]: CODEC_SKEIN1024_400,
  [CODE_SKEIN1024_408]: CODEC_SKEIN1024_408,
  [CODE_SKEIN1024_416]: CODEC_SKEIN1024_416,
  [CODE_SKEIN1024_424]: CODEC_SKEIN1024_424,
  [CODE_SKEIN1024_432]: CODEC_SKEIN1024_432,
  [CODE_SKEIN1024_440]: CODEC_SKEIN1024_440,
  [CODE_SKEIN1024_448]: CODEC_SKEIN1024_448,
  [CODE_SKEIN1024_456]: CODEC_SKEIN1024_456,
  [CODE_SKEIN1024_464]: CODEC_SKEIN1024_464,
  [CODE_SKEIN1024_472]: CODEC_SKEIN1024_472,
  [CODE_SKEIN1024_480]: CODEC_SKEIN1024_480,
  [CODE_SKEIN1024_488]: CODEC_SKEIN1024_488,
  [CODE_SKEIN1024_496]: CODEC_SKEIN1024_496,
  [CODE_SKEIN1024_504]: CODEC_SKEIN1024_504,
  [CODE_SKEIN1024_512]: CODEC_SKEIN1024_512,
  [CODE_SKEIN1024_520]: CODEC_SKEIN1024_520,
  [CODE_SKEIN1024_528]: CODEC_SKEIN1024_528,
  [CODE_SKEIN1024_536]: CODEC_SKEIN1024_536,
  [CODE_SKEIN1024_544]: CODEC_SKEIN1024_544,
  [CODE_SKEIN1024_552]: CODEC_SKEIN1024_552,
  [CODE_SKEIN1024_560]: CODEC_SKEIN1024_560,
  [CODE_SKEIN1024_568]: CODEC_SKEIN1024_568,
  [CODE_SKEIN1024_576]: CODEC_SKEIN1024_576,
  [CODE_SKEIN1024_584]: CODEC_SKEIN1024_584,
  [CODE_SKEIN1024_592]: CODEC_SKEIN1024_592,
  [CODE_SKEIN1024_600]: CODEC_SKEIN1024_600,
  [CODE_SKEIN1024_608]: CODEC_SKEIN1024_608,
  [CODE_SKEIN1024_616]: CODEC_SKEIN1024_616,
  [CODE_SKEIN1024_624]: CODEC_SKEIN1024_624,
  [CODE_SKEIN1024_632]: CODEC_SKEIN1024_632,
  [CODE_SKEIN1024_640]: CODEC_SKEIN1024_640,
  [CODE_SKEIN1024_648]: CODEC_SKEIN1024_648,
  [CODE_SKEIN1024_656]: CODEC_SKEIN1024_656,
  [CODE_SKEIN1024_664]: CODEC_SKEIN1024_664,
  [CODE_SKEIN1024_672]: CODEC_SKEIN1024_672,
  [CODE_SKEIN1024_680]: CODEC_SKEIN1024_680,
  [CODE_SKEIN1024_688]: CODEC_SKEIN1024_688,
  [CODE_SKEIN1024_696]: CODEC_SKEIN1024_696,
  [CODE_SKEIN1024_704]: CODEC_SKEIN1024_704,
  [CODE_SKEIN1024_712]: CODEC_SKEIN1024_712,
  [CODE_SKEIN1024_720]: CODEC_SKEIN1024_720,
  [CODE_SKEIN1024_728]: CODEC_SKEIN1024_728,
  [CODE_SKEIN1024_736]: CODEC_SKEIN1024_736,
  [CODE_SKEIN1024_744]: CODEC_SKEIN1024_744,
  [CODE_SKEIN1024_752]: CODEC_SKEIN1024_752,
  [CODE_SKEIN1024_760]: CODEC_SKEIN1024_760,
  [CODE_SKEIN1024_768]: CODEC_SKEIN1024_768,
  [CODE_SKEIN1024_776]: CODEC_SKEIN1024_776,
  [CODE_SKEIN1024_784]: CODEC_SKEIN1024_784,
  [CODE_SKEIN1024_792]: CODEC_SKEIN1024_792,
  [CODE_SKEIN1024_800]: CODEC_SKEIN1024_800,
  [CODE_SKEIN1024_808]: CODEC_SKEIN1024_808,
  [CODE_SKEIN1024_816]: CODEC_SKEIN1024_816,
  [CODE_SKEIN1024_824]: CODEC_SKEIN1024_824,
  [CODE_SKEIN1024_832]: CODEC_SKEIN1024_832,
  [CODE_SKEIN1024_840]: CODEC_SKEIN1024_840,
  [CODE_SKEIN1024_848]: CODEC_SKEIN1024_848,
  [CODE_SKEIN1024_856]: CODEC_SKEIN1024_856,
  [CODE_SKEIN1024_864]: CODEC_SKEIN1024_864,
  [CODE_SKEIN1024_872]: CODEC_SKEIN1024_872,
  [CODE_SKEIN1024_880]: CODEC_SKEIN1024_880,
  [CODE_SKEIN1024_888]: CODEC_SKEIN1024_888,
  [CODE_SKEIN1024_896]: CODEC_SKEIN1024_896,
  [CODE_SKEIN1024_904]: CODEC_SKEIN1024_904,
  [CODE_SKEIN1024_912]: CODEC_SKEIN1024_912,
  [CODE_SKEIN1024_920]: CODEC_SKEIN1024_920,
  [CODE_SKEIN1024_928]: CODEC_SKEIN1024_928,
  [CODE_SKEIN1024_936]: CODEC_SKEIN1024_936,
  [CODE_SKEIN1024_944]: CODEC_SKEIN1024_944,
  [CODE_SKEIN1024_952]: CODEC_SKEIN1024_952,
  [CODE_SKEIN1024_960]: CODEC_SKEIN1024_960,
  [CODE_SKEIN1024_968]: CODEC_SKEIN1024_968,
  [CODE_SKEIN1024_976]: CODEC_SKEIN1024_976,
  [CODE_SKEIN1024_984]: CODEC_SKEIN1024_984,
  [CODE_SKEIN1024_992]: CODEC_SKEIN1024_992,
  [CODE_SKEIN1024_1000]: CODEC_SKEIN1024_1000,
  [CODE_SKEIN1024_1008]: CODEC_SKEIN1024_1008,
  [CODE_SKEIN1024_1016]: CODEC_SKEIN1024_1016,
  [CODE_SKEIN1024_1024]: CODEC_SKEIN1024_1024,
  [CODE_XXH_32]: CODEC_XXH_32,
  [CODE_XXH_64]: CODEC_XXH_64,
  [CODE_XXH3_64]: CODEC_XXH3_64,
  [CODE_XXH3_128]: CODEC_XXH3_128,
  [CODE_POSEIDON_BLS12_381_A2_FC1]: CODEC_POSEIDON_BLS12_381_A2_FC1,
  [CODE_POSEIDON_BLS12_381_A2_FC1_SC]: CODEC_POSEIDON_BLS12_381_A2_FC1_SC,
  [CODE_RDFC_1]: CODEC_RDFC_1,
  [CODE_SSZ]: CODEC_SSZ,
  [CODE_SSZ_SHA2_256_BMT]: CODEC_SSZ_SHA2_256_BMT,
  [CODE_SHA2_256_CHUNKED]: CODEC_SHA2_256_CHUNKED,
  [CODE_JSON_JCS]: CODEC_JSON_JCS,
  [CODE_BITTORRENT_PIECES_ROOT]: CODEC_BITTORRENT_PIECES_ROOT,
  [CODE_ISCC]: CODEC_ISCC,
  [CODE_ZEROXCERT_IMPRINT_256]: CODEC_ZEROXCERT_IMPRINT_256,
  [CODE_NONSTANDARD_SIG]: CODEC_NONSTANDARD_SIG,
  [CODE_BCRYPT_PBKDF]: CODEC_BCRYPT_PBKDF,
  [CODE_ES256K]: CODEC_ES256K,
  [CODE_BLS12_381_G1_SIG]: CODEC_BLS12_381_G1_SIG,
  [CODE_BLS12_381_G2_SIG]: CODEC_BLS12_381_G2_SIG,
  [CODE_EDDSA]: CODEC_EDDSA,
  [CODE_EIP_191]: CODEC_EIP_191,
  [CODE_JWK_JCS_PUB]: CODEC_JWK_JCS_PUB,
  [CODE_ED2K]: CODEC_ED2K,
  [CODE_FIL_COMMITMENT_UNSEALED]: CODEC_FIL_COMMITMENT_UNSEALED,
  [CODE_FIL_COMMITMENT_SEALED]: CODEC_FIL_COMMITMENT_SEALED,
  [CODE_SHELTER_CONTRACT_MANIFEST]: CODEC_SHELTER_CONTRACT_MANIFEST,
  [CODE_SHELTER_CONTRACT_TEXT]: CODEC_SHELTER_CONTRACT_TEXT,
  [CODE_SHELTER_CONTRACT_DATA]: CODEC_SHELTER_CONTRACT_DATA,
  [CODE_SHELTER_FILE_MANIFEST]: CODEC_SHELTER_FILE_MANIFEST,
  [CODE_SHELTER_FILE_CHUNK]: CODEC_SHELTER_FILE_CHUNK,
  [CODE_PLAINTEXTV2]: CODEC_PLAINTEXTV2,
  [CODE_HOLOCHAIN_ADR_V0]: CODEC_HOLOCHAIN_ADR_V0,
  [CODE_HOLOCHAIN_ADR_V1]: CODEC_HOLOCHAIN_ADR_V1,
  [CODE_HOLOCHAIN_KEY_V0]: CODEC_HOLOCHAIN_KEY_V0,
  [CODE_HOLOCHAIN_KEY_V1]: CODEC_HOLOCHAIN_KEY_V1,
  [CODE_HOLOCHAIN_SIG_V0]: CODEC_HOLOCHAIN_SIG_V0,
  [CODE_HOLOCHAIN_SIG_V1]: CODEC_HOLOCHAIN_SIG_V1,
  [CODE_SKYNET_NS]: CODEC_SKYNET_NS,
  [CODE_ARWEAVE_NS]: CODEC_ARWEAVE_NS,
  [CODE_SUBSPACE_NS]: CODEC_SUBSPACE_NS,
  [CODE_KUMANDRA_NS]: CODEC_KUMANDRA_NS,
  [CODE_ES256]: CODEC_ES256,
  [CODE_ES384]: CODEC_ES384,
  [CODE_ES512]: CODEC_ES512,
  [CODE_RS256]: CODEC_RS256,
  [CODE_ES256K_MSIG]: CODEC_ES256K_MSIG,
  [CODE_BLS12_381_G1_MSIG]: CODEC_BLS12_381_G1_MSIG,
  [CODE_BLS12_381_G2_MSIG]: CODEC_BLS12_381_G2_MSIG,
  [CODE_EDDSA_MSIG]: CODEC_EDDSA_MSIG,
  [CODE_BLS12_381_G1_SHARE_MSIG]: CODEC_BLS12_381_G1_SHARE_MSIG,
  [CODE_BLS12_381_G2_SHARE_MSIG]: CODEC_BLS12_381_G2_SHARE_MSIG,
  [CODE_LAMPORT_MSIG]: CODEC_LAMPORT_MSIG,
  [CODE_LAMPORT_SHARE_MSIG]: CODEC_LAMPORT_SHARE_MSIG,
  [CODE_ES256_MSIG]: CODEC_ES256_MSIG,
  [CODE_ES384_MSIG]: CODEC_ES384_MSIG,
  [CODE_ES521_MSIG]: CODEC_ES521_MSIG,
  [CODE_RS256_MSIG]: CODEC_RS256_MSIG,
  [CODE_SCION]: CODEC_SCION
}

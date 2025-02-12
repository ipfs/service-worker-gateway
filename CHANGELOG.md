# Changelog

## [1.9.0](https://github.com/ipfs/service-worker-gateway/compare/v1.8.3...v1.9.0) (2025-02-12)


### Features

* support unixfs dir-index-html listing ([#576](https://github.com/ipfs/service-worker-gateway/issues/576)) ([bcb6e1f](https://github.com/ipfs/service-worker-gateway/commit/bcb6e1f50d19d53132bfb147fc6635b0579c0a7a)), closes [#342](https://github.com/ipfs/service-worker-gateway/issues/342)


### Bug Fixes

* error page merges verified-fetch headers ([#531](https://github.com/ipfs/service-worker-gateway/issues/531)) ([b9d062e](https://github.com/ipfs/service-worker-gateway/commit/b9d062e9464be305a19992749201c7c0a7038abf))

## [1.8.3](https://github.com/ipfs/service-worker-gateway/compare/v1.8.2...v1.8.3) (2025-02-11)


### Bug Fixes

* **ci:** timeout and cache playwright deps ([#566](https://github.com/ipfs/service-worker-gateway/issues/566)) ([3b29772](https://github.com/ipfs/service-worker-gateway/commit/3b29772cf9c7a3ff4a8b2974c477dd67821ba8cc))

## [1.8.2](https://github.com/ipfs/service-worker-gateway/compare/v1.8.1...v1.8.2) (2025-01-22)


### Bug Fixes

* enable verified-fetch server-timing headers ([#552](https://github.com/ipfs/service-worker-gateway/issues/552)) ([08828d8](https://github.com/ipfs/service-worker-gateway/commit/08828d8ca33a923aca47483914ff533889e97d9e))

## [1.8.1](https://github.com/ipfs/service-worker-gateway/compare/v1.8.0...v1.8.1) (2025-01-21)


### Bug Fixes

* config loading ([#547](https://github.com/ipfs/service-worker-gateway/issues/547)) ([5495199](https://github.com/ipfs/service-worker-gateway/commit/549519999196ff676bfa88a2cf18382c5c31e06e))

## [1.8.0](https://github.com/ipfs/service-worker-gateway/compare/v1.7.1...v1.8.0) (2024-12-12)


### ⚠ BREAKING CHANGES

* config is always visible on landing page ([#496](https://github.com/ipfs/service-worker-gateway/issues/496))

### Features

* config is always visible on landing page ([#496](https://github.com/ipfs/service-worker-gateway/issues/496)) ([d21178c](https://github.com/ipfs/service-worker-gateway/commit/d21178c33fbe354face8325ec53ec6f3db50f73d))
* subdomain detection is resilient ([#497](https://github.com/ipfs/service-worker-gateway/issues/497)) ([9c6e2df](https://github.com/ipfs/service-worker-gateway/commit/9c6e2df0b4abaa9ca222386cbae01bb68040bb8d))


### Bug Fixes

* config ui is in sync with IDB ([#528](https://github.com/ipfs/service-worker-gateway/issues/528)) ([2d8dbd9](https://github.com/ipfs/service-worker-gateway/commit/2d8dbd9aab18944c8c18be7030e906a170068fb9))


### Miscellaneous Chores

* adjust release verion ([8895691](https://github.com/ipfs/service-worker-gateway/commit/8895691df0b31a98b52293926bfea2f8f5770be6))

## [1.7.1](https://github.com/ipfs/service-worker-gateway/compare/v1.7.0...v1.7.1) (2024-11-22)


### Bug Fixes

* debug logs enabled on dev environments ([#456](https://github.com/ipfs/service-worker-gateway/issues/456)) ([65fd112](https://github.com/ipfs/service-worker-gateway/commit/65fd112d192b200388a37bb4ba403782a46bc18e)), closes [#455](https://github.com/ipfs/service-worker-gateway/issues/455)
* no-sw error shows for subdomain requests ([#491](https://github.com/ipfs/service-worker-gateway/issues/491)) ([c16688e](https://github.com/ipfs/service-worker-gateway/commit/c16688e2d5fb6f9f56146aec4d947d41c0646023))

## [1.7.0](https://github.com/ipfs/service-worker-gateway/compare/v1.6.2...v1.7.0) (2024-11-14)


### Features

* global config validation ([#451](https://github.com/ipfs/service-worker-gateway/issues/451)) ([334a077](https://github.com/ipfs/service-worker-gateway/commit/334a0773f3015290f581abf4f4ac700309988986))


### Bug Fixes

* dont use local storage for text config items ([#448](https://github.com/ipfs/service-worker-gateway/issues/448)) ([aab3c00](https://github.com/ipfs/service-worker-gateway/commit/aab3c00db9ef40fc93996f894df954fbfe4c4d0f))
* input toggles dont use localStorage ([#450](https://github.com/ipfs/service-worker-gateway/issues/450)) ([c838307](https://github.com/ipfs/service-worker-gateway/commit/c83830714475a7a20d949d5bf9f74bf65c7e387d))

## [1.6.2](https://github.com/ipfs/service-worker-gateway/compare/v1.6.1...v1.6.2) (2024-11-13)


### Bug Fixes

* more CI fixes ([#439](https://github.com/ipfs/service-worker-gateway/issues/439)) ([b5e0e25](https://github.com/ipfs/service-worker-gateway/commit/b5e0e25fa8eee8b33b4b56471fcb7e7f2cac1a21))

## [1.6.1](https://github.com/ipfs/service-worker-gateway/compare/v1.6.0...v1.6.1) (2024-11-11)


### Bug Fixes

* ci and deployment workflows ([#437](https://github.com/ipfs/service-worker-gateway/issues/437)) ([17ca8d5](https://github.com/ipfs/service-worker-gateway/commit/17ca8d5e803eab9cc409c43b40af2cc5786924ea))

## [1.6.0](https://github.com/ipfs/service-worker-gateway/compare/v1.5.0...v1.6.0) (2024-11-11)


### Features

* delegated routing request deduplication and caching ([90c48a0](https://github.com/ipfs/service-worker-gateway/commit/90c48a070e2316bb83bf97400c9ae07d8ac4acc8))

## [1.5.0](https://github.com/ipfs/service-worker-gateway/compare/v1.4.1...v1.5.0) (2024-11-05)


### Features

* add blake3 hasher ([#421](https://github.com/ipfs/service-worker-gateway/issues/421)) ([6270acd](https://github.com/ipfs/service-worker-gateway/commit/6270acd2696417afe2b61803278f461636c3a69a))


### Bug Fixes

* apply dns resolvers corectly ([#412](https://github.com/ipfs/service-worker-gateway/issues/412)) ([ba0ede9](https://github.com/ipfs/service-worker-gateway/commit/ba0ede9f3c050f20adf5cd391818d332e9b301b8))
* force use of latest multiaddr-to-uri ([#409](https://github.com/ipfs/service-worker-gateway/issues/409)) ([4915b34](https://github.com/ipfs/service-worker-gateway/commit/4915b346cb64514e47102de32aec74a88e67cd5e))

## [1.4.1](https://github.com/ipfs/service-worker-gateway/compare/v1.4.0...v1.4.1) (2024-10-25)


### Bug Fixes

* support discovery of /tls/../ws|http  providers ([#405](https://github.com/ipfs/service-worker-gateway/issues/405)) ([d848e6c](https://github.com/ipfs/service-worker-gateway/commit/d848e6cbff01d38b851d601a3f65dfdac235086f))

## [1.4.0](https://github.com/ipfs/service-worker-gateway/compare/v1.3.0...v1.4.0) (2024-10-24)


### Features

* add p2p retrieval option ([#391](https://github.com/ipfs/service-worker-gateway/issues/391)) ([0db6d94](https://github.com/ipfs/service-worker-gateway/commit/0db6d94393238853ad5130a6fb17e0a2a821efde))
* build with esbuild, apply source maps ([#392](https://github.com/ipfs/service-worker-gateway/issues/392)) ([2b26bd6](https://github.com/ipfs/service-worker-gateway/commit/2b26bd6354a5f2b9ca51d078ad7c146d69360dac))


### Bug Fixes

* remove auto-reload config and default to true ([#319](https://github.com/ipfs/service-worker-gateway/issues/319)) ([42e6b64](https://github.com/ipfs/service-worker-gateway/commit/42e6b64cf46856eba231b676a4f9c104ff1090f9))
* remove fonts from dist folder ([#394](https://github.com/ipfs/service-worker-gateway/issues/394)) ([86641e5](https://github.com/ipfs/service-worker-gateway/commit/86641e590c8991dad1cc3c1f7b89931b630ccb11))
* service worker logs are visible again ([#395](https://github.com/ipfs/service-worker-gateway/issues/395)) ([98659e2](https://github.com/ipfs/service-worker-gateway/commit/98659e28e98ec5297fd9dc1e6ed2e3d244a51a58))
* use enable from @libp2p/logger ([#398](https://github.com/ipfs/service-worker-gateway/issues/398)) ([cb8c662](https://github.com/ipfs/service-worker-gateway/commit/cb8c662a3d27248c72cb9da2beef5fb56228550e))
* use more ipfs-sw prefixes ([#396](https://github.com/ipfs/service-worker-gateway/issues/396)) ([ade0074](https://github.com/ipfs/service-worker-gateway/commit/ade0074d7f08a61b15f33077c00dc5a1cb273cb7))

## [1.3.0](https://github.com/ipfs/service-worker-gateway/compare/v1.2.0...v1.3.0) (2024-07-04)


### Features

* about section on subdomain loads ([#263](https://github.com/ipfs/service-worker-gateway/issues/263)) ([947011e](https://github.com/ipfs/service-worker-gateway/commit/947011e772f73d32b2380bb6d7521f61fc8d27bf))
* config page ux improvements ([#315](https://github.com/ipfs/service-worker-gateway/issues/315)) ([16b31b9](https://github.com/ipfs/service-worker-gateway/commit/16b31b98f391197c745dcc4328c49fc32905d0ff))
* error page when service worker not available ([#283](https://github.com/ipfs/service-worker-gateway/issues/283)) ([774e388](https://github.com/ipfs/service-worker-gateway/commit/774e388bd2c4696988121c42ce511c59837348f0))
* minimal PWA manifest ([#310](https://github.com/ipfs/service-worker-gateway/issues/310)) ([6d758c9](https://github.com/ipfs/service-worker-gateway/commit/6d758c91b8ffc389ff672a6a0f987651f5a2dba2))


### Bug Fixes

* load default css on interstitial ([#298](https://github.com/ipfs/service-worker-gateway/issues/298)) ([9990664](https://github.com/ipfs/service-worker-gateway/commit/9990664899005fca960544d7e03216bb1c47d7f0))
* remove fonts except woff2 ([#282](https://github.com/ipfs/service-worker-gateway/issues/282)) ([7517a62](https://github.com/ipfs/service-worker-gateway/commit/7517a620a66aab260c66e0cce2270bc8898a0160))

## [1.2.0](https://github.com/ipfs/service-worker-gateway/compare/v1.1.0...v1.2.0) (2024-05-17)


### Features

* _redirects only for /ipns and /ipfs ([#233](https://github.com/ipfs/service-worker-gateway/issues/233)) ([89faa58](https://github.com/ipfs/service-worker-gateway/commit/89faa588ee0c033f3d2631d5c2823c005f17ead5))
* add content-loading indication page ([#258](https://github.com/ipfs/service-worker-gateway/issues/258)) ([c815a25](https://github.com/ipfs/service-worker-gateway/commit/c815a25d2657244cde5cea95cf535dd1bc728675))
* cache sw assets with service worker ([#234](https://github.com/ipfs/service-worker-gateway/issues/234)) ([20a8f32](https://github.com/ipfs/service-worker-gateway/commit/20a8f329402dac4cba53fec55bd059eeb7f7137d))
* landing & config page UX improvements ([#235](https://github.com/ipfs/service-worker-gateway/issues/235)) ([fb9b04e](https://github.com/ipfs/service-worker-gateway/commit/fb9b04e06b6b3670728c243838ee86f3d6b55067))
* meaningful error pages ([#195](https://github.com/ipfs/service-worker-gateway/issues/195)) ([80774f5](https://github.com/ipfs/service-worker-gateway/commit/80774f50760e4b757dfacfb7d5df79f3fb020012))


### Bug Fixes

* ipfs-hosted redirects are not infinite ([#215](https://github.com/ipfs/service-worker-gateway/issues/215)) ([40cc8c7](https://github.com/ipfs/service-worker-gateway/commit/40cc8c7612302e60a2be2c9372e22e95fa10a799))
* multiple bugs ([#220](https://github.com/ipfs/service-worker-gateway/issues/220)) ([75aa0b8](https://github.com/ipfs/service-worker-gateway/commit/75aa0b8773c8f1ab484ac110fe607404303e2e8c))
* revert "feat: migrate to preact/compat ([#190](https://github.com/ipfs/service-worker-gateway/issues/190))" ([#219](https://github.com/ipfs/service-worker-gateway/issues/219)) ([4443174](https://github.com/ipfs/service-worker-gateway/commit/44431745be1f5638fb47969326865c8825ade141))
* use separate logger for ui/sw ([#217](https://github.com/ipfs/service-worker-gateway/issues/217)) ([a96837b](https://github.com/ipfs/service-worker-gateway/commit/a96837b9cf753fa71dcf5a393686fe4d21c7036f))

## [1.1.0](https://github.com/ipfs-shipyard/service-worker-gateway/compare/v1.0.0...v1.1.0) (2024-04-19)


### Features

* code split & dynamic imports ([#188](https://github.com/ipfs-shipyard/service-worker-gateway/issues/188)) ([bdc2979](https://github.com/ipfs-shipyard/service-worker-gateway/commit/bdc2979e02e934b4a3fc696e79ecefe202f059d7))
* helper-ui input-validator update ([#202](https://github.com/ipfs-shipyard/service-worker-gateway/issues/202)) ([e95e70e](https://github.com/ipfs-shipyard/service-worker-gateway/commit/e95e70efdf84fc70c95956138f6bf32382f69e44))
* http range support ([#122](https://github.com/ipfs-shipyard/service-worker-gateway/issues/122)) ([b064d20](https://github.com/ipfs-shipyard/service-worker-gateway/commit/b064d20b4d9b67ba33690ee115cbf6a2d78d3d1b))
* migrate to preact/compat ([#190](https://github.com/ipfs-shipyard/service-worker-gateway/issues/190)) ([8c98f57](https://github.com/ipfs-shipyard/service-worker-gateway/commit/8c98f579b95992072474f02fe39865fda825379d))
* quick TTFB & TTI for large content ([#138](https://github.com/ipfs-shipyard/service-worker-gateway/issues/138)) ([b3c08d1](https://github.com/ipfs-shipyard/service-worker-gateway/commit/b3c08d1df385fb7a27d6420c7d93ba20c598b84f))


### Bug Fixes

* **ci:** attach car to published release ([41d2cff](https://github.com/ipfs-shipyard/service-worker-gateway/commit/41d2cffcff5bc3061212fe13aadb5df9c1a3f64c))
* first-hit handling renders redirect page correctly ([#163](https://github.com/ipfs-shipyard/service-worker-gateway/issues/163)) ([a961662](https://github.com/ipfs-shipyard/service-worker-gateway/commit/a961662aa606b835fc535b9ed3612142ef1d4886))
* fix unixfs directory redirects ([#156](https://github.com/ipfs-shipyard/service-worker-gateway/issues/156)) ([4304333](https://github.com/ipfs-shipyard/service-worker-gateway/commit/4304333846c1af45fb7375adcc14768b439eb473))
* redirect page and first-hit normalization ([#201](https://github.com/ipfs-shipyard/service-worker-gateway/issues/201)) ([8c85b6f](https://github.com/ipfs-shipyard/service-worker-gateway/commit/8c85b6ffe80685617b00ba51af3547f67a39fdf0))

## 1.0.0 (2024-03-15)


### ⚠ BREAKING CHANGES

* dist files optimizations (sw asset name changes) ([#97](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/97))

### Features

* add caching to service worker ([#92](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/92)) ([4674dd0](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/4674dd0a6e37c3555ab98b2f59c20f7cc806fba2))
* add context to mplex streammuxer addition ([ed1b23e](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/ed1b23e0b02426f3234f352dcf6d5ceab66af941))
* add demo video ([e673b77](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/e673b77cb3c92f67b7dc62b7e35fa3e8f57f1a0f))
* add e2e & aegir test support ([#115](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/115)) ([bf6a382](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/bf6a382bf8fa4d98a1c9340ebc04457a1b8e745e))
* add reframev1 routing support ([c5bc7fb](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/c5bc7fb2ad56b411e4fbd6b201e28125cf8d5444))
* allow explicit sw de-registering + timebomb ([#100](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/100)) ([8ec199c](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/8ec199c64d5a6e80fcf2a16b71df91cff50edd5b))
* allow loading config page from subdomain after sw registration ([#96](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/96)) ([1201b22](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/1201b2250fa0a5930628d26f1a7147ba78c6eee6))
* BASE_URL can be overridden ([#27](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/27)) ([2ba597a](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/2ba597aec8a905f04e800bdee5e73faeb933f713))
* **ci:** build car, pin to cluster, update dnslink ([#69](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/69)) ([1bc8d1b](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/1bc8d1b7e4b631c837f40b840f598a43a070dba8))
* **ci:** pin latest inbrowser.link to cluster ([#65](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/65)) ([ed2de44](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/ed2de44cf5d8ffabe94c4b9a774d979225ed5f0a))
* **ci:** update inbrowser.link on release publish ([#117](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/117)) ([90440d9](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/90440d948d0b7c56f25cf814e6c47937c861e75d))
* compress assets using gzip ([f9537c2](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/f9537c21ce387dbcfe8ced3551463f0617ad7a81))
* create config page for sw settings ([#24](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/24)) ([d933208](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/d933208d81b303b81c106de396369b2dd236396c))
* implement gateway _redirects file ([#11](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/11)) ([fadb400](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/fadb4005bfdd2f25a1269da63607079f68e7b150))
* Implement service worker and main-thread demo ([#3](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/3)) ([2a630c0](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/2a630c0ad28558f3d27b4bd65650cf7a81a9a135))
* improve styling of header ([#77](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/77)) ([8eec72e](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/8eec72e3d904f9979ea668ffb9d223dd2a405ad2))
* load static websites and paths ([#2](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/2)) ([3bad813](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/3bad8132579dd2eadff042d48c9b169fd1842624))
* make it work ([8f7944c](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/8f7944c1e18fef940730fbecb151873aaed3ad02))
* pull in Adin changes ([722f487](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/722f487a51201772e4d3a82161e2184e871e92ea))
* rendered CID in browser with content-type recognition ([0c9d304](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/0c9d304c464160713d77be3d38a3ac765ba1ca40))
* support ens resolution ([#56](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/56)) ([4c9a3f3](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/4c9a3f30cc179684ba3acf6886a9db2b5612d3c3))
* support gateway-like functionality ([5ff3cfe](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/5ff3cfecc8d375664f4e02385432671f16a3944f))
* use @helia/verified-fetch ([#17](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/17)) ([bd38764](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/bd38764b511276d1a57f4b72a5132aa851b69194))


### Bug Fixes

* code cleanup, dep removal, & miscellaneous ([#89](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/89)) ([0a6d2f3](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/0a6d2f3dcc3dc2e421187604b4dbbd3df41cbed0))
* css styles applied & config page collapse ([#112](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/112)) ([47b8af4](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/47b8af4f433454e20c833b45feaebcd2c7b60a2d))
* dnsLinkLabel decode encode ([#34](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/34)) ([306e19b](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/306e19b0910f54c20bac32ffa518aac2d70841f1))
* dynamic subdomain gateway detection ([#53](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/53)) ([333ee9f](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/333ee9ff91f9f4135175b86c720c976cb6d1e5aa))
* enforce origin isolation on subdomain gws ([#60](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/60)) ([3071332](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/30713329938fa2bd32c1de0914266412782d419e))
* first load for new ipns site redirects properly ([4fb8357](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/4fb83575b2c20d61e6c9a0ba3c7d6bda61c4c7a2))
* handle helia-sw query from _redirects ([#67](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/67)) ([cfd70a6](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/cfd70a63e0d4f0ef74e393c81b5d73fb676d26f2))
* infinite loop during redirect parsing ([#10](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/10)) ([19bea1c](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/19bea1ce2acde3395e552681c92a16d7b95917a1))
* load the iframe in the same port as the parent domain ([af68be4](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/af68be4a450fabd3027d4ff41aa4a6d6dec6aee9))
* remove invalid char from the helia fetch url ([#29](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/29)) ([674c69f](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/674c69fc5b24a2a88cb9c2c754e943fe3c261989))


### Miscellaneous Chores

* dist files optimizations (sw asset name changes) ([#97](https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/97)) ([0c81f2a](https://github.com/ipfs-shipyard/helia-service-worker-gateway/commit/0c81f2aa05db6dbdd64aaaef278fdb11b5c0843a))

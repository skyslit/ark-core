# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.12.0](https://github.com/skyslit/ark/compare/v2.11.0...v2.12.0) (2021-04-04)


### Features

* added test utils functions for ark-backend ([4410440](https://github.com/skyslit/ark/commit/4410440d12eeedc3e8d828ac3d46a4650b6ec6e0))





# [2.11.0](https://github.com/skyslit/ark/compare/v2.10.1...v2.11.0) (2021-03-24)


### Features

* added support for useRemoteConfig() ([8827fdd](https://github.com/skyslit/ark/commit/8827fdd81d3d08125834b524b1a3881df170058a))





## [2.10.1](https://github.com/skyslit/ark/compare/v2.10.0...v2.10.1) (2021-03-21)


### Bug Fixes

* hostname is optional in server opts ([32909b5](https://github.com/skyslit/ark/commit/32909b51624337e62871654a5cabba3d35414e67))





# [2.10.0](https://github.com/skyslit/ark/compare/v2.9.0...v2.10.0) (2021-03-18)


### Bug Fixes

* added default table limit to 30 ([72e7877](https://github.com/skyslit/ark/commit/72e7877a2bdfd57c5625b806ad850f9c6b234c4a))
* changed documentQueryToServiceResponse to read from input instead of query ([4ad47e7](https://github.com/skyslit/ark/commit/4ad47e724347aa0bca9ead42151e647d87c59b18))


### Features

* added documentQueryToServiceResponse() fn ([135c4b7](https://github.com/skyslit/ark/commit/135c4b7a4a53d0d7cd3a0412aeefdee9b0fc38d2))
* added useTableService() in frontend ([0a8024d](https://github.com/skyslit/ark/commit/0a8024dc604effda58254fe303b15f95ebfacbd7))





# [2.8.0](https://github.com/skyslit/ark/compare/v2.7.0...v2.8.0) (2021-03-10)


### Features

* useVolumeAccessPoint implemented ([4940f71](https://github.com/skyslit/ark/commit/4940f71b854c37f52cd0e65812bc8f1edca63aed))





# [2.7.0](https://github.com/skyslit/ark/compare/v2.6.0...v2.7.0) (2021-03-07)


### Features

* file upload and fs volume support added ([07263aa](https://github.com/skyslit/ark/commit/07263aaa5a7004d5ed8f093ffd252cad69c8f793))





# [2.5.0](https://github.com/skyslit/ark/compare/v2.4.0...v2.5.0) (2021-02-24)


### Bug Fixes

* issue with uriEncode bearer token ([81c42e1](https://github.com/skyslit/ark/commit/81c42e1d64e21fa12e5ef56ef51de7d517f9a51e))


### Features

* added volume support in backend ([d0f5a09](https://github.com/skyslit/ark/commit/d0f5a0976b41a1b2a7705511bd7e6a513050f132))





# [2.4.0](https://github.com/skyslit/ark/compare/v2.3.0...v2.4.0) (2021-02-21)


### Bug Fixes

* added body parser middleware to support json and url-encoded forms ([81b67f5](https://github.com/skyslit/ark/commit/81b67f5284b3d34c06e9157876892b60e692aa70))
* issue with data model in  useService() ([27bedb1](https://github.com/skyslit/ark/commit/27bedb1de8c7ae762a87080415ade44e99853e68))
* removed less loader + optimised bundler ufs + formatted evaluator error ([0388083](https://github.com/skyslit/ark/commit/03880839acc58111dee22bb48dc3ff0b98214648))
* types issue in web app renderer ([10ea7b1](https://github.com/skyslit/ark/commit/10ea7b1cfe59ed5dcaafe54095bf55483289aa62))
* with multiple web app renderers ([04e4d93](https://github.com/skyslit/ark/commit/04e4d9365cef1d5795ce884fb68bea6702365b1b))





# [2.3.0](https://github.com/skyslit/ark/compare/v2.2.4...v2.3.0) (2021-02-13)

### Features

- useContent hook ([#14](https://github.com/skyslit/ark/issues/14)) ([96a2983](https://github.com/skyslit/ark/commit/96a29835e165074c28fae93f36f1b9d802626e5d))

## [2.2.4](https://github.com/skyslit/ark/compare/v2.2.3...v2.2.4) (2021-02-05)

### Bug Fixes

- issues identified on feb 5 ([#13](https://github.com/skyslit/ark/issues/13)) ([c512cc0](https://github.com/skyslit/ark/commit/c512cc0638ad8599432698f06160aa1bcca7f8bb))

## [2.2.3](https://github.com/skyslit/ark/compare/v2.2.2...v2.2.3) (2021-02-04)

### Bug Fixes

- various bugs identified on or before Feb 3 2021 ([#12](https://github.com/skyslit/ark/issues/12)) ([5c96f24](https://github.com/skyslit/ark/commit/5c96f24609ef1e04aad212e2e47f3b110ed0b8a4))

# [2.2.0](https://github.com/skyslit/ark/compare/v2.1.0...v2.2.0) (2021-01-31)

### Bug Fixes

- downgraded react from 17.x to 16.x ([aa62937](https://github.com/skyslit/ark/commit/aa629374373280f7f8b4787aabc5e2f535889bce))

### Features

- added setupMainService automator ([5966358](https://github.com/skyslit/ark/commit/5966358a694def2d57bb14f5623c6c14c78f3d6a))
- added support for use() in service definition ([7e607ef](https://github.com/skyslit/ark/commit/7e607efff057813de0afd58429547ae8adba1848))

# [2.1.0](https://github.com/skyslit/ark/compare/v2.0.13...v2.1.0) (2021-01-30)

### Bug Fixes

- business service logic added ([5e6c283](https://github.com/skyslit/ark/commit/5e6c2837ffb7748af63a6bfdccb4617214426d71))
- css slow loading in SSR ([5e40dd6](https://github.com/skyslit/ark/commit/5e40dd6b7c90bed317b666048b7fe4a82eb8f409))

### Features

- added defineCapabilities fn in business service ([d54e844](https://github.com/skyslit/ark/commit/d54e844549c658f3a3aa73a4b82f6b8f6883cc5b))
- added definePre support in services ([b7cc3c8](https://github.com/skyslit/ark/commit/b7cc3c8e633b91e6a9ac695f95cd511497843e4d))
- added hypermedia feature to service ([97fc322](https://github.com/skyslit/ark/commit/97fc322d2fafe19f5bc713ca05b18ae65a61f311))
- added Joi schema support for service validation ([a7e1cb4](https://github.com/skyslit/ark/commit/a7e1cb4580027f71eba5636d0a561fec67cc37e6))
- added redux service content in the backend ([2294f3b](https://github.com/skyslit/ark/commit/2294f3bd8c10a5a63aceedd304bf2ba203c6bc9e))
- added server request logger ([53afb0d](https://github.com/skyslit/ark/commit/53afb0db0a82be6bd50bee878936ccd906178937))
- added service support in backend ([49a31b1](https://github.com/skyslit/ark/commit/49a31b1df77716f3e88e7d6da35c101e269f0653))
- added support for policy extractor ([7ee80df](https://github.com/skyslit/ark/commit/7ee80df6cdf39d7a6ae85b12180e2b797288ddf1))
- added support for redux usage in useService hook ([c81c794](https://github.com/skyslit/ark/commit/c81c794c4bf6a86808ec130087a09d0a39e5d5e7))
- authentication flow implemented ([0f9fc25](https://github.com/skyslit/ark/commit/0f9fc25c0d30bbe3c587c7dfae32ab37e2afc56e))
- now invoke() supports force option ([d7354ed](https://github.com/skyslit/ark/commit/d7354ed75fb010e05b6dc61957bd61d96ad86535))
- redux ssr implemented ([96706bd](https://github.com/skyslit/ark/commit/96706bde71e8ea4f7e6aca797897875766cbfccc))
- server side service call implemented ([0a11e1e](https://github.com/skyslit/ark/commit/0a11e1e18f6f6879feba3636c55539187be37901))

## 2.0.13 (2021-01-02)

**Note:** Version bump only for package @skyslit/ark-backend

## 2.0.12 (2021-01-02)

**Note:** Version bump only for package @skyslit/ark-backend

## [2.0.11](https://github.com/skyslit/ark/compare/v2.0.10...v2.0.11) (2021-01-02)

**Note:** Version bump only for package @skyslit/ark-backend

## 2.0.10 (2021-01-02)

**Note:** Version bump only for package @skyslit/ark-backend

## 2.0.9 (2021-01-02)

**Note:** Version bump only for package @skyslit/ark-backend

## 2.0.8 (2021-01-02)

**Note:** Version bump only for package @skyslit/ark-backend

## 2.0.7 (2021-01-02)

**Note:** Version bump only for package @skyslit/ark-backend

## 2.0.6 (2021-01-02)

**Note:** Version bump only for package @skyslit/ark-backend

## 2.0.5 (2021-01-02)

**Note:** Version bump only for package @skyslit/ark-backend

## [2.0.4](https://github.com/skyslit/ark-core/compare/v2.0.3...v2.0.4) (2021-01-02)

### Bug Fixes

- typo fixes ([ba03919](https://github.com/skyslit/ark-core/commit/ba0391951e77bca6efeea83d75395721ce079537))

## [2.0.3](https://github.com/skyslit/ark-core/compare/v2.0.2...v2.0.3) (2021-01-02)

### Bug Fixes

- error ([5972849](https://github.com/skyslit/ark-core/commit/59728494565f0e58ebbdf18f394c42e70ff81931))

## [2.0.2](https://github.com/skyslit/ark-core/compare/v2.0.1...v2.0.2) (2021-01-02)

**Note:** Version bump only for package @skyslit/ark-backend

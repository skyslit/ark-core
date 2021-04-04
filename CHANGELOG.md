# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.12.0](https://github.com/skyslit/ark/compare/v2.11.0...v2.12.0) (2021-04-04)


### Features

* added test utils functions for ark-backend ([4410440](https://github.com/skyslit/ark/commit/4410440d12eeedc3e8d828ac3d46a4650b6ec6e0))
* added test utils functions for ark-frontend ([087a5b9](https://github.com/skyslit/ark/commit/087a5b9bfd654ff7d16ab709ed53d15329d6578c))





# [2.11.0](https://github.com/skyslit/ark/compare/v2.10.1...v2.11.0) (2021-03-24)


### Features

* added support for useRemoteConfig() ([8827fdd](https://github.com/skyslit/ark/commit/8827fdd81d3d08125834b524b1a3881df170058a))





## [2.10.1](https://github.com/skyslit/ark/compare/v2.10.0...v2.10.1) (2021-03-21)


### Bug Fixes

* hostname is optional in server opts ([32909b5](https://github.com/skyslit/ark/commit/32909b51624337e62871654a5cabba3d35414e67))
* NODE_PORT support added to init-project task ([2e9fb21](https://github.com/skyslit/ark/commit/2e9fb21e92769d3ed7a4bf5b8de299193f10f128))





# [2.10.0](https://github.com/skyslit/ark/compare/v2.9.0...v2.10.0) (2021-03-18)


### Bug Fixes

* added default table limit to 30 ([72e7877](https://github.com/skyslit/ark/commit/72e7877a2bdfd57c5625b806ad850f9c6b234c4a))
* changed documentQueryToServiceResponse to read from input instead of query ([4ad47e7](https://github.com/skyslit/ark/commit/4ad47e724347aa0bca9ead42151e647d87c59b18))


### Features

* added documentQueryToServiceResponse() fn ([135c4b7](https://github.com/skyslit/ark/commit/135c4b7a4a53d0d7cd3a0412aeefdee9b0fc38d2))
* added useTableService() in frontend ([0a8024d](https://github.com/skyslit/ark/commit/0a8024dc604effda58254fe303b15f95ebfacbd7))


### Performance Improvements

* moved invoke() inside useCallback ([448f789](https://github.com/skyslit/ark/commit/448f789b4d451a4cb92d48f92a505f17dcfab57b))





# [2.9.0](https://github.com/skyslit/ark/compare/v2.8.0...v2.9.0) (2021-03-14)


### Bug Fixes

* aws cf full-env ecs service takes long time to deploy ([8e439bd](https://github.com/skyslit/ark/commit/8e439bd06b3c199529d0c1ba0feb78d8620cbd86))
* issue with git credential helper ([f57b825](https://github.com/skyslit/ark/commit/f57b825a38f9f8f9b8daeb6bac0f1c905950960f))
* revised cf full-env-template ([cec8d89](https://github.com/skyslit/ark/commit/cec8d895ddc793b2489210cd1d7ab0c3afdc65ec))
* revised cf standard-env-template with improved security ([b25d209](https://github.com/skyslit/ark/commit/b25d209fff462864ede9effe2119f0d96ea9d2fc))


### Features

* added dev-env command in cli ([cb02e0c](https://github.com/skyslit/ark/commit/cb02e0cfba8d0ab9256014da38c3f185f78baff1))
* added stack start and stop feature ([79676f8](https://github.com/skyslit/ark/commit/79676f82d0c7a08871eb3bc719eb8051d733509c))





# [2.8.0](https://github.com/skyslit/ark/compare/v2.7.0...v2.8.0) (2021-03-10)


### Features

* added localstorage feature in useConnect() ([b962a69](https://github.com/skyslit/ark/commit/b962a69d467290db3e6cb84b088e9684de943ad8))
* useVolumeAccessPoint implemented ([4940f71](https://github.com/skyslit/ark/commit/4940f71b854c37f52cd0e65812bc8f1edca63aed))
* useVolumeAccessPoint() implemented on frontend ([44ffde2](https://github.com/skyslit/ark/commit/44ffde23bb28c8fd4eec75fbc13d4c41834c589d))





# [2.7.0](https://github.com/skyslit/ark/compare/v2.6.0...v2.7.0) (2021-03-07)


### Features

* file upload and fs volume support added ([07263aa](https://github.com/skyslit/ark/commit/07263aaa5a7004d5ed8f093ffd252cad69c8f793))





# [2.6.0](https://github.com/skyslit/ark/compare/v2.5.0...v2.6.0) (2021-03-04)


### Bug Fixes

* aws > issue with loadbalancer securitygroup ([9020a89](https://github.com/skyslit/ark/commit/9020a891bd120dd1016b4350c12e972b7bd140fe))
* optimised setup-devops aws command ([a8bf0e2](https://github.com/skyslit/ark/commit/a8bf0e265b90d475e4275d938683fc4ef9626d54))


### Features

* added setup-devops command ([1d82e32](https://github.com/skyslit/ark/commit/1d82e329d461db3ac0516a48e983653b21882e43))





# [2.5.0](https://github.com/skyslit/ark/compare/v2.4.0...v2.5.0) (2021-02-24)


### Bug Fixes

* issue with uriEncode bearer token ([81c42e1](https://github.com/skyslit/ark/commit/81c42e1d64e21fa12e5ef56ef51de7d517f9a51e))
* serviceId cannot be used in refId format ([c272b9f](https://github.com/skyslit/ark/commit/c272b9f03dd109920f17d3b8f70c266125f38f83))
* split chunk size revised to 5mb ([9410c7c](https://github.com/skyslit/ark/commit/9410c7c8a81522471f507c89d3770c442ac3100f))


### Features

* added docker support ([ff9d1cf](https://github.com/skyslit/ark/commit/ff9d1cfda7e5c30041bc3cc4cc6f497db9018554))
* added process automation for module integration ([9e4fc2e](https://github.com/skyslit/ark/commit/9e4fc2ea111d98f96ac313074a500b8e013945e9))
* added useEnv feature to support environment variables ([b8e4af2](https://github.com/skyslit/ark/commit/b8e4af2424f4fb345574b137ba2939a6359c0baa))
* added volume support in backend ([d0f5a09](https://github.com/skyslit/ark/commit/d0f5a0976b41a1b2a7705511bd7e6a513050f132))





# [2.4.0](https://github.com/skyslit/ark/compare/v2.3.0...v2.4.0) (2021-02-21)


### Bug Fixes

* added body parser middleware to support json and url-encoded forms ([81b67f5](https://github.com/skyslit/ark/commit/81b67f5284b3d34c06e9157876892b60e692aa70))
* API error is not visible in redux state ([7d09548](https://github.com/skyslit/ark/commit/7d0954823ec296825656fcc47c4e48dfe9127d7f))
* enabled minimiser in bundler ([7929755](https://github.com/skyslit/ark/commit/79297555b66c9ff38b61a7de80255c3229843944))
* issue that always take to pre-defined login url ([46d7167](https://github.com/skyslit/ark/commit/46d7167e5cc0bc64256667e6283641ad502b8473))
* issue with data model in  useService() ([27bedb1](https://github.com/skyslit/ark/commit/27bedb1de8c7ae762a87080415ade44e99853e68))
* issue with husky hook ([e881139](https://github.com/skyslit/ark/commit/e881139ff1937a5d69792049069405203e31ab8a))
* issue with image (png|jpg) import + scss import issue ([5ce80f8](https://github.com/skyslit/ark/commit/5ce80f83cb8d1a231879525dd5f2972ac1703685))
* issue with typescript version ([c5263d9](https://github.com/skyslit/ark/commit/c5263d9d121f6a0e16f864bdac412865268b5645))
* optimised cli interface and experience ([adbf61b](https://github.com/skyslit/ark/commit/adbf61be5b745ee4e725895516deada93d160b9f))
* removed less loader + optimised bundler ufs + formatted evaluator error ([0388083](https://github.com/skyslit/ark/commit/03880839acc58111dee22bb48dc3ff0b98214648))
* removed unnecessary console.log ([b3c98ec](https://github.com/skyslit/ark/commit/b3c98ec02696012025367c5fb2836e6b624ee4dd))
* removeItemAt is undefined ([4213719](https://github.com/skyslit/ark/commit/421371976b5ac8ec2721e34bf157bee18fe9a1f2))
* sourcemap enabled in webpack ([67c8c8a](https://github.com/skyslit/ark/commit/67c8c8a90567910f74602e08410faf60f9058017))
* types issue in web app renderer ([10ea7b1](https://github.com/skyslit/ark/commit/10ea7b1cfe59ed5dcaafe54095bf55483289aa62))
* typescript init not working on windows ([605a76e](https://github.com/skyslit/ark/commit/605a76e2d8eb83ee355e27d84cabf14b3519cdc6))
* with multiple web app renderers ([04e4d93](https://github.com/skyslit/ark/commit/04e4d9365cef1d5795ce884fb68bea6702365b1b))
* **devtools:** moved execa from dev dep to prod dep ([ab00e41](https://github.com/skyslit/ark/commit/ab00e411f279511ea64f29d8e1c4ee11afd13cd0))


### Features

* added support for code splitting ([91e097b](https://github.com/skyslit/ark/commit/91e097ba6fbb43afdb06b9da73ae370e696b0f08))
* added useContent hook feature ([7adfa7d](https://github.com/skyslit/ark/commit/7adfa7ded6f0bb21b8c2f07d530b85d4ce84a767))





# [2.3.0](https://github.com/skyslit/ark/compare/v2.2.4...v2.3.0) (2021-02-13)

### Features

- useContent hook ([#14](https://github.com/skyslit/ark/issues/14)) ([96a2983](https://github.com/skyslit/ark/commit/96a29835e165074c28fae93f36f1b9d802626e5d))

## [2.2.4](https://github.com/skyslit/ark/compare/v2.2.3...v2.2.4) (2021-02-05)

### Bug Fixes

- issues identified on feb 5 ([#13](https://github.com/skyslit/ark/issues/13)) ([c512cc0](https://github.com/skyslit/ark/commit/c512cc0638ad8599432698f06160aa1bcca7f8bb))

## [2.2.3](https://github.com/skyslit/ark/compare/v2.2.2...v2.2.3) (2021-02-04)

### Bug Fixes

- various bugs identified on or before Feb 3 2021 ([#12](https://github.com/skyslit/ark/issues/12)) ([5c96f24](https://github.com/skyslit/ark/commit/5c96f24609ef1e04aad212e2e47f3b110ed0b8a4))

## [2.2.2](https://github.com/skyslit/ark/compare/v2.2.1...v2.2.2) (2021-01-31)

### Bug Fixes

- added windows compatibility ([#11](https://github.com/skyslit/ark/issues/11)) ([04378f3](https://github.com/skyslit/ark/commit/04378f30b9a08dca67b78cfea6e41f51b3ab0293))

## [2.2.1](https://github.com/skyslit/ark/compare/v2.2.0...v2.2.1) (2021-01-31)

**Note:** Version bump only for package root

# [2.2.0](https://github.com/skyslit/ark/compare/v2.1.0...v2.2.0) (2021-01-31)

### Bug Fixes

- added semver lock to ark packages ([be9237c](https://github.com/skyslit/ark/commit/be9237c1a0a884f0765764f486745f663588b451))
- downgraded react from 17.x to 16.x ([aa62937](https://github.com/skyslit/ark/commit/aa629374373280f7f8b4787aabc5e2f535889bce))

### Features

- added prettier and eslint support ([c11a529](https://github.com/skyslit/ark/commit/c11a52957d27869f2d317b4429a4a3d4d7432c6e))
- added setupMainService automator ([5966358](https://github.com/skyslit/ark/commit/5966358a694def2d57bb14f5623c6c14c78f3d6a))
- added support for use() in service definition ([7e607ef](https://github.com/skyslit/ark/commit/7e607efff057813de0afd58429547ae8adba1848))

# [2.1.0](https://github.com/skyslit/ark/compare/v2.0.13...v2.1.0) (2021-01-30)

### Bug Fixes

- business service logic added ([5e6c283](https://github.com/skyslit/ark/commit/5e6c2837ffb7748af63a6bfdccb4617214426d71))
- css slow loading in SSR ([5e40dd6](https://github.com/skyslit/ark/commit/5e40dd6b7c90bed317b666048b7fe4a82eb8f409))
- plugin registry attached to the context ([1a71f43](https://github.com/skyslit/ark/commit/1a71f4317ad92c1dbc75f4c776ed7c4670dd5035))
- **devtools:** added yaml support for manifest ([d5b7426](https://github.com/skyslit/ark/commit/d5b7426724a51200384b27cff7dbe7fe859f17fc))

### Features

- added defineCapabilities fn in business service ([d54e844](https://github.com/skyslit/ark/commit/d54e844549c658f3a3aa73a4b82f6b8f6883cc5b))
- added definePre support in services ([b7cc3c8](https://github.com/skyslit/ark/commit/b7cc3c8e633b91e6a9ac695f95cd511497843e4d))
- added hypermedia feature to service ([97fc322](https://github.com/skyslit/ark/commit/97fc322d2fafe19f5bc713ca05b18ae65a61f311))
- added Joi schema support for service validation ([a7e1cb4](https://github.com/skyslit/ark/commit/a7e1cb4580027f71eba5636d0a561fec67cc37e6))
- added redux service content in the backend ([2294f3b](https://github.com/skyslit/ark/commit/2294f3bd8c10a5a63aceedd304bf2ba203c6bc9e))
- added server request logger ([53afb0d](https://github.com/skyslit/ark/commit/53afb0db0a82be6bd50bee878936ccd906178937))
- added service support in backend ([49a31b1](https://github.com/skyslit/ark/commit/49a31b1df77716f3e88e7d6da35c101e269f0653))
- added support for file editor ([c6b9087](https://github.com/skyslit/ark/commit/c6b908771e07c6ff40a2c1883cf7064cc5c333b5))
- added support for less pre-processor ([6b0d38c](https://github.com/skyslit/ark/commit/6b0d38c0108c9d583baa50abe886db38ddb7f573))
- added support for policy extractor ([7ee80df](https://github.com/skyslit/ark/commit/7ee80df6cdf39d7a6ae85b12180e2b797288ddf1))
- added support for redux usage in useService hook ([c81c794](https://github.com/skyslit/ark/commit/c81c794c4bf6a86808ec130087a09d0a39e5d5e7))
- added support for restarting application whenever code changes ([77f9f90](https://github.com/skyslit/ark/commit/77f9f90c9681e74a6313a88b052a063a57c6e653))
- added support for sourcecode platform versioning ([15eec30](https://github.com/skyslit/ark/commit/15eec30b39d621a37fe1180587aded2bd79c4ed1))
- authentication flow implemented ([0f9fc25](https://github.com/skyslit/ark/commit/0f9fc25c0d30bbe3c587c7dfae32ab37e2afc56e))
- error handling implemented ([e41fffd](https://github.com/skyslit/ark/commit/e41fffd56a99bba04ac4f3eb638964563439dedb))
- now invoke() supports force option ([d7354ed](https://github.com/skyslit/ark/commit/d7354ed75fb010e05b6dc61957bd61d96ad86535))
- redux ssr implemented ([96706bd](https://github.com/skyslit/ark/commit/96706bde71e8ea4f7e6aca797897875766cbfccc))
- server side service call implemented ([0a11e1e](https://github.com/skyslit/ark/commit/0a11e1e18f6f6879feba3636c55539187be37901))
- **automator:** added context data support ([ce786a6](https://github.com/skyslit/ark/commit/ce786a67fefba8fbad9e25de20c26b35e14af35d))
- **automator:** added observer feature ([b11eac5](https://github.com/skyslit/ark/commit/b11eac5c3977d03166207dbf8ae0129be8983c64))
- **automator:** job runtime modification ([605ac74](https://github.com/skyslit/ark/commit/605ac7447f1f492cea300c4a0cc6c0a22ff86877))
- **cli:** added cli support for automation snapshot ([bd8f3db](https://github.com/skyslit/ark/commit/bd8f3dba3e2a3987e5b0f60133f93153ef48e5ed))
- **cli:** added compiler watch support ([c076439](https://github.com/skyslit/ark/commit/c076439e3f0ea6390dd3407ef4f5908b56daaede))
- **cli:** added panel, automator and prompt ([719ee1c](https://github.com/skyslit/ark/commit/719ee1cd627cdd0fb58955226925333823f5c97a))
- **manifest:** added two step automation ([6c6611c](https://github.com/skyslit/ark/commit/6c6611c7466aef20dbe6b1b22dbcac7720c7df64))
- **manifest:** automation manager implemented ([5ab129e](https://github.com/skyslit/ark/commit/5ab129e87ce2be82364d9201f0b4a8db74e9b291))
- **plugin:** manifest plugin support added ([f4be627](https://github.com/skyslit/ark/commit/f4be627046166a46f73c1acf067c98b50081b4ec))

## 2.0.13 (2021-01-02)

**Note:** Version bump only for package root

## 2.0.12 (2021-01-02)

**Note:** Version bump only for package root

## [2.0.11](https://github.com/skyslit/ark/compare/v2.0.10...v2.0.11) (2021-01-02)

**Note:** Version bump only for package root

## 2.0.10 (2021-01-02)

**Note:** Version bump only for package root

## 2.0.9 (2021-01-02)

**Note:** Version bump only for package root

## 2.0.8 (2021-01-02)

**Note:** Version bump only for package root

## 2.0.7 (2021-01-02)

**Note:** Version bump only for package root

## 2.0.6 (2021-01-02)

**Note:** Version bump only for package root

## 2.0.5 (2021-01-02)

**Note:** Version bump only for package root

## [2.0.4](https://github.com/skyslit/ark-core/compare/v2.0.3...v2.0.4) (2021-01-02)

### Bug Fixes

- typo fixes ([ba03919](https://github.com/skyslit/ark-core/commit/ba0391951e77bca6efeea83d75395721ce079537))

## [2.0.3](https://github.com/skyslit/ark-core/compare/v2.0.2...v2.0.3) (2021-01-02)

### Bug Fixes

- error ([5972849](https://github.com/skyslit/ark-core/commit/59728494565f0e58ebbdf18f394c42e70ff81931))

## [2.0.2](https://github.com/skyslit/ark-core/compare/v2.0.1...v2.0.2) (2021-01-02)

### Bug Fixes

- added global flag ([77306b3](https://github.com/skyslit/ark-core/commit/77306b3226343259282a9c253fef479eb1cba58f))

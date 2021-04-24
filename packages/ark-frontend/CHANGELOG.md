# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.15.0](https://github.com/skyslit/ark/compare/v2.14.0...v2.15.0) (2021-04-24)


### Features

* added navigation menu hook ([a8dc950](https://github.com/skyslit/ark/commit/a8dc9505cb06246224710f76300862bb3dee2f7e))





## [2.12.1](https://github.com/skyslit/ark/compare/v2.12.0...v2.12.1) (2021-04-18)


### Bug Fixes

* issue with code-splitting / lazy loading ([e22cdb6](https://github.com/skyslit/ark/commit/e22cdb6de4bd80588489e94ffe4c235f5774850e))





# [2.12.0](https://github.com/skyslit/ark/compare/v2.11.0...v2.12.0) (2021-04-04)


### Features

* added test utils functions for ark-frontend ([087a5b9](https://github.com/skyslit/ark/commit/087a5b9bfd654ff7d16ab709ed53d15329d6578c))





# [2.10.0](https://github.com/skyslit/ark/compare/v2.9.0...v2.10.0) (2021-03-18)


### Features

* added useTableService() in frontend ([0a8024d](https://github.com/skyslit/ark/commit/0a8024dc604effda58254fe303b15f95ebfacbd7))


### Performance Improvements

* moved invoke() inside useCallback ([448f789](https://github.com/skyslit/ark/commit/448f789b4d451a4cb92d48f92a505f17dcfab57b))





# [2.8.0](https://github.com/skyslit/ark/compare/v2.7.0...v2.8.0) (2021-03-10)


### Features

* added localstorage feature in useConnect() ([b962a69](https://github.com/skyslit/ark/commit/b962a69d467290db3e6cb84b088e9684de943ad8))
* useVolumeAccessPoint() implemented on frontend ([44ffde2](https://github.com/skyslit/ark/commit/44ffde23bb28c8fd4eec75fbc13d4c41834c589d))





# [2.7.0](https://github.com/skyslit/ark/compare/v2.6.0...v2.7.0) (2021-03-07)


### Features

* file upload and fs volume support added ([07263aa](https://github.com/skyslit/ark/commit/07263aaa5a7004d5ed8f093ffd252cad69c8f793))





# [2.5.0](https://github.com/skyslit/ark/compare/v2.4.0...v2.5.0) (2021-02-24)


### Bug Fixes

* serviceId cannot be used in refId format ([c272b9f](https://github.com/skyslit/ark/commit/c272b9f03dd109920f17d3b8f70c266125f38f83))
* split chunk size revised to 5mb ([9410c7c](https://github.com/skyslit/ark/commit/9410c7c8a81522471f507c89d3770c442ac3100f))





# [2.4.0](https://github.com/skyslit/ark/compare/v2.3.0...v2.4.0) (2021-02-21)


### Bug Fixes

* API error is not visible in redux state ([7d09548](https://github.com/skyslit/ark/commit/7d0954823ec296825656fcc47c4e48dfe9127d7f))
* issue that always take to pre-defined login url ([46d7167](https://github.com/skyslit/ark/commit/46d7167e5cc0bc64256667e6283641ad502b8473))
* issue with data model in  useService() ([27bedb1](https://github.com/skyslit/ark/commit/27bedb1de8c7ae762a87080415ade44e99853e68))
* removeItemAt is undefined ([4213719](https://github.com/skyslit/ark/commit/421371976b5ac8ec2721e34bf157bee18fe9a1f2))


### Features

* added useContent hook feature ([7adfa7d](https://github.com/skyslit/ark/commit/7adfa7ded6f0bb21b8c2f07d530b85d4ce84a767))





# [2.3.0](https://github.com/skyslit/ark/compare/v2.2.4...v2.3.0) (2021-02-13)

### Features

- useContent hook ([#14](https://github.com/skyslit/ark/issues/14)) ([96a2983](https://github.com/skyslit/ark/commit/96a29835e165074c28fae93f36f1b9d802626e5d))

## [2.2.3](https://github.com/skyslit/ark/compare/v2.2.2...v2.2.3) (2021-02-04)

### Bug Fixes

- various bugs identified on or before Feb 3 2021 ([#12](https://github.com/skyslit/ark/issues/12)) ([5c96f24](https://github.com/skyslit/ark/commit/5c96f24609ef1e04aad212e2e47f3b110ed0b8a4))

# [2.2.0](https://github.com/skyslit/ark/compare/v2.1.0...v2.2.0) (2021-01-31)

### Bug Fixes

- downgraded react from 17.x to 16.x ([aa62937](https://github.com/skyslit/ark/commit/aa629374373280f7f8b4787aabc5e2f535889bce))

### Features

- added setupMainService automator ([5966358](https://github.com/skyslit/ark/commit/5966358a694def2d57bb14f5623c6c14c78f3d6a))

# [2.1.0](https://github.com/skyslit/ark/compare/v2.0.13...v2.1.0) (2021-01-30)

### Bug Fixes

- business service logic added ([5e6c283](https://github.com/skyslit/ark/commit/5e6c2837ffb7748af63a6bfdccb4617214426d71))

### Features

- added redux service content in the backend ([2294f3b](https://github.com/skyslit/ark/commit/2294f3bd8c10a5a63aceedd304bf2ba203c6bc9e))
- added server request logger ([53afb0d](https://github.com/skyslit/ark/commit/53afb0db0a82be6bd50bee878936ccd906178937))
- added service support in backend ([49a31b1](https://github.com/skyslit/ark/commit/49a31b1df77716f3e88e7d6da35c101e269f0653))
- added support for redux usage in useService hook ([c81c794](https://github.com/skyslit/ark/commit/c81c794c4bf6a86808ec130087a09d0a39e5d5e7))
- now invoke() supports force option ([d7354ed](https://github.com/skyslit/ark/commit/d7354ed75fb010e05b6dc61957bd61d96ad86535))
- redux ssr implemented ([96706bd](https://github.com/skyslit/ark/commit/96706bde71e8ea4f7e6aca797897875766cbfccc))

## 2.0.13 (2021-01-02)

**Note:** Version bump only for package @skyslit/ark-frontend

## 2.0.12 (2021-01-02)

**Note:** Version bump only for package @skyslit/ark-frontend

## [2.0.11](https://github.com/skyslit/ark/compare/v2.0.10...v2.0.11) (2021-01-02)

**Note:** Version bump only for package @skyslit/ark-frontend

## 2.0.10 (2021-01-02)

**Note:** Version bump only for package @skyslit/ark-frontend

## 2.0.9 (2021-01-02)

**Note:** Version bump only for package @skyslit/ark-frontend

## 2.0.8 (2021-01-02)

**Note:** Version bump only for package @skyslit/ark-frontend

## 2.0.7 (2021-01-02)

**Note:** Version bump only for package @skyslit/ark-frontend

## 2.0.6 (2021-01-02)

**Note:** Version bump only for package @skyslit/ark-frontend

## 2.0.5 (2021-01-02)

**Note:** Version bump only for package @skyslit/ark-frontend

## [2.0.2](https://github.com/skyslit/ark-core/compare/v2.0.1...v2.0.2) (2021-01-02)

**Note:** Version bump only for package @skyslit/ark-frontend

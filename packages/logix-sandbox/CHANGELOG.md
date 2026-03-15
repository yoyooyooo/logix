# @logixjs/sandbox

## 1.0.2-beta.1

## 1.0.2-beta.0

### Patch Changes

- e51fb6c: Switch the Effect v4 beta lane to real prerelease semver so future beta publishes use versions like `1.0.2-beta.0` instead of relying on the npm `beta` dist-tag alone.

## 1.0.1

### Patch Changes

- b847c4a: Restore `@logixjs/sandbox` to the Effect v4 beta release lane after fixing the kernel bundle path for browser publishing.

## 1.0.0

### Minor Changes

- 3855d47: Establish the Effect v4 beta release lane for the public Logix packages.

  - treat `effect-v4` as the long-lived branch for ongoing v4 work
  - version the publishable `@logixjs/*` packages as one beta train
  - publish the train to npm under the `beta` dist-tag while upstream Effect v4 remains prerelease

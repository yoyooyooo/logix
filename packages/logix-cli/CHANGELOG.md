# @logixjs/cli

## 1.0.2-beta.1

### Patch Changes

- fb38032: Trigger one additional prerelease cycle to verify that `@logixjs/cli` now publishes through the repository's npm Trusted Publisher path without manual intervention.
  - @logixjs/core@1.0.2-beta.1

## 1.0.2-beta.0

### Patch Changes

- e51fb6c: Switch the Effect v4 beta lane to real prerelease semver so future beta publishes use versions like `1.0.2-beta.0` instead of relying on the npm `beta` dist-tag alone.
- Updated dependencies [e51fb6c]
  - @logixjs/core@1.0.2-beta.0

## 1.0.0

### Minor Changes

- 3855d47: Establish the Effect v4 beta release lane for the public Logix packages.

  - treat `effect-v4` as the long-lived branch for ongoing v4 work
  - version the publishable `@logixjs/*` packages as one beta train
  - publish the train to npm under the `beta` dist-tag while upstream Effect v4 remains prerelease

### Patch Changes

- Updated dependencies [3855d47]
  - @logixjs/core@1.0.0

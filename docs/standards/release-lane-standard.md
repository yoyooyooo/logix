---
title: Release Lane Standard
status: living
version: 2
created: 2026-05-13
updated: 2026-05-13
---

# Release Lane Standard

## Current Lane

`main` is the active development line and the source for release tags. Pull requests and direct main pushes do not publish npm packages.

Release is tag-driven. A release is created by tagging a chosen main commit with `logix-v<semver>` and pushing that tag. The release workflow checks out the tag, stages package versions in the CI workspace, creates the GitHub Release, and publishes npm packages through Trusted Publishing.

Only the Release workflow should run for `logix-v*` tag pushes. Normal push workflows are branch-scoped to `main` so release tags do not re-run PR/main CI lanes or create unrelated tag-only failures.

`main` must not receive release-version commits or cleanup commits. Version changes for publishing are CI staging changes unless a future build target proves it must read a committed version.

## Release Scripts

- `pnpm release:tag` is the local tag helper. With no arguments it plans the next stable patch release.
- `pnpm release:tag --push` creates and pushes that default stable patch tag.
- `pnpm release:tag minor --push` creates and pushes the next stable minor tag.
- `pnpm release:tag beta --bump minor --push` creates and pushes the next beta prerelease for the next minor base.
- `pnpm release:publish` is the CI publish command. It reads `GITHUB_REF_NAME=logix-v*`, temporarily stages package versions, packs public `@logixjs/*` packages, creates the GitHub Release, and publishes to npm.
- `pnpm ci:release` is the release verification gate.

The default release channel is stable. The default version bump is patch.
If no flags are passed, the helper behaves as the default stable patch flow.

When `pnpm release:tag` is run from a clean local `main` checkout, it automatically switches to `release/logix-v<semver>` before creating the tag. This keeps the maintainer's `main` checkout free from local release-only work while preserving the invariant that the release tag still points at the selected main commit. Dirty `main`, non-main branches, and `--dry-run` do not switch branches. Use `--no-release-branch` to tag directly from `main` when that is intentional.

## Tag And Dist-Tag Mapping

```text
logix-v1.2.3                 -> npm dist-tag latest
logix-v1.2.3-alpha.1         -> npm dist-tag alpha
logix-v1.2.3-beta.1          -> npm dist-tag beta
logix-v1.2.3-rc.1            -> npm dist-tag rc
logix-v1.2.3-canary.YYYYMMDD.<sha> -> npm dist-tag canary
```

Prerelease tags must never publish without an explicit non-`latest` npm dist-tag.

## Release Notes

Changesets are no longer the release authority. Release notes are generated from commits between the previous merged `logix-v*` tag and the new tag.

The tag helper stores the generated notes in the annotated tag message. CI uses that tag message as the GitHub Release body.

## Package Version Staging

Package `package.json` files may stay on the development version in main. During release, `pnpm release:publish` temporarily rewrites public `@logixjs/*` package versions to the tag semver and rewrites internal `workspace:*` dependencies to the same version before packing.

The restore step must run after packing/publishing so CI workspace mutations do not become commits.

Release packing must not rerun package lifecycle scripts after publish manifest staging. Build, typecheck, tests, and browser smoke belong to `pnpm ci:release`; `pnpm release:publish` packs the verified workspace artifacts with release-staged package manifests.

## Stable Release Gate

A stable `latest` release is allowed only when the release owner intentionally pushes a stable tag. Before doing so, verify:

```text
release target commit is the intended main commit
release CI passes build, typecheck, test, browser smoke, and required perf gates
public README/package descriptions do not imply a beta-only install path
Effect v4 beta dependency risk is accepted for this release or has been cleared
```

Effect beta dependency does not force npm prerelease semantics by itself. It is a release-risk decision. If the release owner wants a beta channel, use a `logix-vX.Y.Z-beta.N` tag.

## Forbidden Shortcuts

- Do not publish from `main` push.
- Do not reintroduce Changesets as the release authority without replacing this standard.
- Do not let prerelease tags publish under `latest`.
- Do not treat a clean PR CI run as a release gate.
- Do not make release cleanup commits on `main`.
- Do not claim release-safe performance without the required comparable performance artifacts.

## Current Conclusion

Use `main` for development, tag selected main commits for releases, and let CI stage versions from the tag. Default releases are stable `latest`; prerelease channels are explicit tag choices.

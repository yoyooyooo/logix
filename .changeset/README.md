# Changesets In This Repo

- `main` is the active future release-preparation lane.
- Add one changeset for every release-worthy public package change that should reach npm.
- Beta publishes use prerelease semver plus the npm `beta` dist-tag through `.github/workflows/release.yml`.
- Stable npm `latest` publishing requires the explicit stable cutover gate in `docs/standards/release-lane-standard.md`.

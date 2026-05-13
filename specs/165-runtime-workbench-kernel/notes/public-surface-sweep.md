# Public Surface Sweep

Date: 2026-04-28

## Command

```bash
rtk rg -n "Runtime\\.workbench|runtime\\.workbench|Runtime\\.devtools|runtime\\.devtools|Runtime\\.inspect|runtime\\.inspect|Runtime\\.playground|runtime\\.playground|PlaygroundRunResult|SnapshotPreviewWitness" \
  packages/logix-core/src \
  packages/logix-core/package.json \
  packages/logix-sandbox/src \
  packages/logix-sandbox/package.json \
  packages/logix-playground/src \
  packages/logix-devtools-react/src \
  packages/logix-cli/src
```

## Result

No matches.

## Classification

- No public `Runtime.workbench` or `runtime.workbench`.
- No public `Runtime.devtools`, `Runtime.inspect` or `Runtime.playground`.
- No `SnapshotPreviewWitness` production hit.
- No public `PlaygroundRunResult` production hit.
- `packages/logix-core/package.json` keeps `./repo-internal/workbench-api` workspace-visible and `publishConfig.exports["./repo-internal/workbench-api"] = null`.
- `packages/logix-sandbox` has no workbench or playground API addition.

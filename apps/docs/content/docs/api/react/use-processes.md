---
title: useProcesses
description: Install a stable list of Processes for a React UI subtree boundary.
---

`useProcesses` installs a list of long-running programs (Processes / Links) into the current Runtime, scoped to a **React UI subtree boundary**.

It’s useful when you want “feature-level background orchestration” to be mounted/unmounted with a part of the UI tree, while still running inside the Logix Runtime.

## Basic usage

```tsx
import { useMemo } from 'react'
import { useProcesses } from '@logixjs/react'
import * as Logix from '@logixjs/core'
import { Effect } from 'effect'

export function SettingsRoute() {
  const processes = useMemo(() => [Logix.Process.make('settings:boot', Effect.void)], [])
  useProcesses(processes, { subtreeId: 'route:settings' })

  return null
}
```

> Tip: memoize the `processes` array (e.g. `useMemo`) to avoid unnecessary install/uninstall churn.

## Options

- `subtreeId?`: stable identifier for diagnostics/filtering (recommended: route/feature key).
- `gcTime?`: keep-alive time after unmount to absorb StrictMode/Suspense jitter.
- `mode?`: restart semantics for stop → start (`switch` default / `exhaust`).
- `deps?`: additional dependencies that should trigger reinstall.

## See also

- [API: Process](../core/process)
- [API: Link](../core/link)

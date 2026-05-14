---
title: Error handling
description: Expected failures, defects, provider reporting, and state writeback.
---

Errors should stay in the lane that owns them.

## Expected failures

Service failures that affect UI should be caught in logic and written to state or a domain error carrier.

```ts
yield* api.save(input).pipe(
  Effect.catchAll((error) =>
    $.state.mutate((draft) => { draft.error = String(error) }),
  ),
)
```

## Defects

Unexpected defects should reach the runtime/provider reporting path. In React, use `RuntimeProvider.onError` and an Error Boundary for host-level display.

## Form errors

Form validation and submit errors belong to Form rules, submit decode, or Form error selectors. Do not mirror them into a separate React-local error store.

## Control-plane errors

`Runtime.check` and `Runtime.trial` return reports. Use those reports for CI, CLI, and agent verification.

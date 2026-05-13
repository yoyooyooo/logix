# Playground Interaction Evidence Matrix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive test matrix for Playground action, raw dispatch, driver, scenario and host-command triggers so every trigger path proves its state, log, diagnostics and evidence behavior.

**Architecture:** Add a test-only interaction evidence harness under `packages/logix-playground/test/support` and migrate high-value tests to scoped semantic queries. Production code changes are limited to stable test selectors only when existing roles cannot disambiguate inspector tabs, bottom tabs or raw dispatch controls. Runtime truth remains the existing Program session runner and control-plane invoker.

**Tech Stack:** TypeScript, React Testing Library, Vitest, Effect V4, `@logixjs/playground`, pnpm

---

## Bound Inputs

- Proposal: `docs/proposals/playground-interaction-evidence-test-contract.md`
- Spec: `specs/166-playground-driver-scenario-surface/spec.md`
- UI contract: `specs/166-playground-driver-scenario-surface/ui-contract.md`
- Current failing contracts:
  - `packages/logix-playground/test/host-command-output.contract.test.tsx`
  - `packages/logix-playground/test/raw-dispatch-advanced.contract.test.tsx`
- Existing high-value tests:
  - `packages/logix-playground/test/action-panel-dispatch.contract.test.tsx`
  - `packages/logix-playground/src/internal/components/RuntimeInspector.test.tsx`
  - `packages/logix-playground/test/program-session-runner.contract.test.ts`
  - `packages/logix-playground/src/internal/scenario/scenarioRunner.test.ts`
  - `packages/logix-playground/src/internal/summary/workbenchProjection.test.ts`

## File Structure

- Create `packages/logix-playground/test/support/interactionEvidenceHarness.tsx`
  - Test-only render and interaction helpers for `PlaygroundPage`.
  - Test-only runner factories for success, replay, deferred and failure cases.
  - Scoped DOM helpers for console, state, diagnostics, trace and snapshot lanes.
- Create `packages/logix-playground/test/interaction-evidence-matrix.contract.test.tsx`
  - Main table-driven contract for business interaction triggers.
- Modify `packages/logix-playground/test/host-command-output.contract.test.tsx`
  - Replace ambiguous global `Diagnostics` query with bottom-drawer scoped query.
  - Assert Check/Trial evidence path does not produce action dispatch logs.
- Modify `packages/logix-playground/test/raw-dispatch-advanced.contract.test.tsx`
  - Update query path to current raw dispatch advanced location.
  - Assert parse failure does not call runner or increment session operation.
- Modify `packages/logix-playground/src/internal/components/RuntimeInspector.tsx`
  - Add stable `data-playground-inspector-tab` or raw dispatch control selector only if scoped roles are insufficient.
- Modify `packages/logix-playground/src/internal/components/RawDispatchPanel.tsx`
  - Add stable `data-playground-control="raw-dispatch-toggle"` only if current semantic query cannot be made reliable.
- Modify `specs/166-playground-driver-scenario-surface/spec.md`
  - Add accepted Interaction Evidence Matrix contract after `TD-007`.
- Modify `specs/166-playground-driver-scenario-surface/ui-contract.md`
  - Add selector scoping rule to avoid global same-name tab queries.
- Modify `specs/166-playground-driver-scenario-surface/notes/verification.md`
  - Record commands and outcomes.
- Modify `docs/proposals/playground-interaction-evidence-test-contract.md`
  - Change `status` to `consumed` after implementation and list writeback targets.

## Chunk 1: Harness And Runner Evidence Invariants

### Task 1: Create interaction evidence harness skeleton

**Files:**
- Create: `packages/logix-playground/test/support/interactionEvidenceHarness.tsx`
- Test: `packages/logix-playground/test/interaction-evidence-matrix.contract.test.tsx`

- [ ] **Step 1: Write the failing harness import test**

Create `packages/logix-playground/test/interaction-evidence-matrix.contract.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import {
  createInteractionEvidenceHarness,
  makeReplayLogRunner,
} from './support/interactionEvidenceHarness.js'

describe('Playground interaction evidence matrix', () => {
  it('renders a local counter session through the shared evidence harness', async () => {
    const harness = createInteractionEvidenceHarness({
      runner: makeReplayLogRunner(),
    })

    await harness.render()
    await harness.expectReadySession('logix-react.local-counter:r0:s1')

    expect(harness.consoleText()).toContain('session started logix-react.local-counter:r0:s1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/interaction-evidence-matrix.contract.test.tsx
```

Expected: FAIL because `interactionEvidenceHarness.tsx` does not exist.

- [ ] **Step 3: Implement minimal harness**

Create `packages/logix-playground/test/support/interactionEvidenceHarness.tsx`:

```tsx
import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import { PlaygroundPage } from '../../src/Playground.js'
import type { ProgramSessionRunner } from '../../src/internal/runner/programSessionRunner.js'
import { ProgramSessionRunnerProvider } from '../../src/internal/runner/programSessionRunnerContext.js'
import { localCounterProjectFixture } from './projectFixtures.js'

export const makeReplayLogRunner = (): ProgramSessionRunner => ({
  dispatch: async (input) => {
    const count = input.actions.reduce((value, action) => {
      if (action._tag === 'increment') return value + 1
      if (action._tag === 'decrement') return value - 1
      return value
    }, 0)
    return {
      state: { count },
      logs: input.actions.map((action) => ({
        level: 'info',
        message: `dispatch ${action._tag}`,
        source: 'runner',
      })),
      traces: [],
    }
  },
})

export const createInteractionEvidenceHarness = (options: {
  readonly runner: ProgramSessionRunner
}) => {
  return {
    render: async () => {
      render(
        <ProgramSessionRunnerProvider runner={options.runner}>
          <PlaygroundPage
            registry={[localCounterProjectFixture]}
            projectId="logix-react.local-counter"
          />
        </ProgramSessionRunnerProvider>,
      )
    },
    expectReadySession: async (sessionId: string) => {
      await waitFor(() => {
        expect(screen.getAllByText(sessionId).length).toBeGreaterThan(0)
      })
    },
    consoleText: () =>
      screen.getByRole('region', { name: 'Workbench bottom console' }).textContent ?? '',
    stateText: () =>
      screen.getByLabelText('Program state').textContent ?? '',
    bottomDrawer: () =>
      screen.getByRole('region', { name: 'Workbench bottom console' }),
    within,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/interaction-evidence-matrix.contract.test.tsx
```

Expected: PASS, one test.

### Task 2: Prove mixed history replay exposes only current synthetic dispatch log

**Files:**
- Modify: `packages/logix-playground/test/interaction-evidence-matrix.contract.test.tsx`
- Modify: `packages/logix-playground/test/support/interactionEvidenceHarness.tsx`
- Modify if needed: `packages/logix-playground/src/internal/runner/programSessionRunner.ts`

- [ ] **Step 1: Write failing mixed-history test**

Append:

```tsx
it('exposes one current runner dispatch log when action history is replayed', async () => {
  const harness = createInteractionEvidenceHarness({
    runner: makeReplayLogRunner(),
  })

  await harness.render()
  await harness.expectReadySession('logix-react.local-counter:r0:s1')

  await harness.runAction('decrement')
  await harness.expectStateCount(0)
  await harness.runAction('increment')
  await harness.expectStateCount(1)

  expect(harness.currentRunnerDispatchLogs()).toEqual([
    '[info] runner op1: dispatch decrement',
    '[info] runner op2: dispatch increment',
  ])
})
```

- [ ] **Step 2: Add wished-for harness API only**

Add declarations by implementation in the harness:

```tsx
runAction: async (actionTag: string) => {
  fireEvent.click(screen.getByRole('button', { name: `Dispatch ${actionTag}` }))
},
expectStateCount: async (count: number) => {
  await waitFor(() => {
    expect(screen.getByLabelText('Program state').textContent).toContain(`"count": ${count}`)
  })
},
currentRunnerDispatchLogs: () => {
  const text = screen.getByRole('region', { name: 'Workbench bottom console' }).textContent ?? ''
  return text.match(/\[info\] runner op\d+: dispatch \w+/g) ?? []
},
```

Import `fireEvent`.

- [ ] **Step 3: Run test to verify failure**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/interaction-evidence-matrix.contract.test.tsx
```

Expected before production fix: FAIL if replay logs leak. Expected after the previous runner fix exists: PASS. If it passes immediately, keep it as regression coverage and do not change production code.

- [ ] **Step 4: If failing, normalize replay logs at runner boundary**

Modify `packages/logix-playground/src/internal/runner/programSessionRunner.ts`:

```ts
const replayDispatchMessages = new Set(input.actions.map((action) => `dispatch ${action._tag}`))
const nonSyntheticLogs = logs.filter((log) =>
  !(log.source === 'runner' && replayDispatchMessages.has(log.message)),
)
```

Then prepend the current operation synthetic log with `sessionId` and `operationSeq`.

- [ ] **Step 5: Run test to verify pass**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/interaction-evidence-matrix.contract.test.tsx
```

Expected: PASS.

## Chunk 2: Business Trigger Matrix

### Task 3: Cover reflected action and curated driver as equivalent session triggers

**Files:**
- Modify: `packages/logix-playground/test/interaction-evidence-matrix.contract.test.tsx`
- Modify: `packages/logix-playground/test/support/interactionEvidenceHarness.tsx`

- [ ] **Step 1: Write failing driver equivalence test**

Append:

```tsx
it('routes reflected action and curated driver through the same session evidence path', async () => {
  const harness = createInteractionEvidenceHarness({
    runner: makeReplayLogRunner(),
  })

  await harness.render()
  await harness.expectReadySession('logix-react.local-counter:r0:s1')

  await harness.runAction('increment')
  await harness.expectStateCount(1)
  await harness.runDriver('Increase')
  await harness.expectStateCount(2)

  expect(harness.currentRunnerDispatchLogs()).toEqual([
    '[info] runner op1: dispatch increment',
    '[info] runner op2: dispatch increment',
  ])
  expect(harness.consoleText()).toContain('dispatch accepted increment')
  expect(harness.consoleText()).toContain('dispatch completed increment')
})
```

- [ ] **Step 2: Implement harness `runDriver`**

```tsx
runDriver: async (label: string) => {
  fireEvent.click(screen.getByRole('button', { name: `Run driver ${label}` }))
},
```

- [ ] **Step 3: Run test**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/interaction-evidence-matrix.contract.test.tsx
```

Expected: PASS after current runner log normalization.

### Task 4: Cover scenario driver step awaiting dispatch settle

**Files:**
- Modify: `packages/logix-playground/test/interaction-evidence-matrix.contract.test.tsx`
- Modify: `packages/logix-playground/test/support/interactionEvidenceHarness.tsx`

- [ ] **Step 1: Add deferred runner**

In harness:

```tsx
export const makeDeferredReplayLogRunner = (delayMs = 1): ProgramSessionRunner => ({
  dispatch: async (input) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    return makeReplayLogRunner().dispatch(input)
  },
})
```

- [ ] **Step 2: Write scenario test**

```tsx
it('waits for scenario driver dispatch before scenario expectation reads state', async () => {
  const harness = createInteractionEvidenceHarness({
    runner: makeDeferredReplayLogRunner(),
  })

  await harness.render()
  await harness.expectReadySession('logix-react.local-counter:r0:s1')

  await harness.runScenario('Counter demo')
  await harness.expectStateCount(1)

  const scenarioText = await harness.scenarioText()
  expect(scenarioText).toContain('counter-demo')
  expect(scenarioText).toContain('expect-state')
  expect(scenarioText).toContain('passed')
  expect(scenarioText).not.toContain('Expected state to be changed')
})
```

- [ ] **Step 3: Implement harness `runScenario` and `scenarioText`**

```tsx
runScenario: async (label: string) => {
  fireEvent.click(screen.getByRole('button', { name: `Run scenario ${label}` }))
},
scenarioText: async () => {
  await waitFor(() => {
    expect(screen.getByRole('region', { name: 'Scenario detail' })).toBeTruthy()
  })
  return screen.getByRole('region', { name: 'Scenario detail' }).textContent ?? ''
},
```

- [ ] **Step 4: Run test**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/interaction-evidence-matrix.contract.test.tsx
```

Expected: PASS.

## Chunk 3: Raw Dispatch And Failure Evidence

### Task 5: Fix raw dispatch advanced test to current UI

**Files:**
- Modify: `packages/logix-playground/test/raw-dispatch-advanced.contract.test.tsx`
- Modify if needed: `packages/logix-playground/src/internal/components/RawDispatchPanel.tsx`
- Modify if needed: `packages/logix-playground/src/internal/components/RuntimeInspector.tsx`

- [ ] **Step 1: Run current test and capture failure**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/raw-dispatch-advanced.contract.test.tsx
```

Expected current failure: unable to find `Advanced Show`.

- [ ] **Step 2: Update test to open the Actions inspector lane**

Replace global `Advanced Show` query with scoped flow:

```tsx
fireEvent.click(screen.getByRole('button', { name: 'Actions' }))
await waitFor(() => {
  expect(screen.getByRole('region', { name: 'Action workbench' })).toBeTruthy()
})
```

Then query the raw dispatch toggle within Action workbench. Prefer visible button text if stable. If text is still ambiguous, add `data-playground-control="raw-dispatch-toggle"` to `RawDispatchPanel` and query through `container.querySelector`.

- [ ] **Step 3: Add no-runner-call parse failure assertion**

Extend the test runner:

```ts
const dispatched: Array<ReadonlyArray<string>> = []
```

After invalid JSON submit:

```ts
expect(dispatched).toEqual([])
expect(screen.getByRole('region', { name: 'Workbench bottom console' }).textContent).not.toContain('dispatch accepted')
```

- [ ] **Step 4: Run test**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/raw-dispatch-advanced.contract.test.tsx
```

Expected: PASS.

### Task 6: Add runtime failure evidence contract

**Files:**
- Modify: `packages/logix-playground/test/interaction-evidence-matrix.contract.test.tsx`
- Modify: `packages/logix-playground/test/support/interactionEvidenceHarness.tsx`

- [ ] **Step 1: Add failing runner factory**

```tsx
export const makeRuntimeFailureRunner = (message = 'boom'): ProgramSessionRunner => ({
  dispatch: async () => {
    throw { kind: 'runtime', message }
  },
})
```

- [ ] **Step 2: Write failure evidence test**

```tsx
it('records runtime dispatch failure without replacing previous state', async () => {
  const harness = createInteractionEvidenceHarness({
    runner: {
      dispatch: async (input) => {
        if (input.operationSeq === 1) return makeReplayLogRunner().dispatch(input)
        throw { kind: 'runtime', message: 'Missing reducer for action increment' }
      },
    },
  })

  await harness.render()
  await harness.expectReadySession('logix-react.local-counter:r0:s1')

  await harness.runAction('increment')
  await harness.expectStateCount(1)
  await harness.runDriver('Increase')

  await waitFor(() => {
    expect(harness.consoleText()).toContain('dispatch failed increment: Missing reducer for action increment')
  })
  expect(harness.stateText()).toContain('"count": 1')
})
```

- [ ] **Step 3: Run test**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/interaction-evidence-matrix.contract.test.tsx
```

Expected: PASS. If failure state replaces previous state, fix `recordProgramSessionFailure` preserving previous state.

## Chunk 4: Host Command Evidence And Selector Drift

### Task 7: Fix host command diagnostics selector drift

**Files:**
- Modify: `packages/logix-playground/test/host-command-output.contract.test.tsx`
- Modify if needed: `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.tsx`

- [ ] **Step 1: Run current test and capture failure**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/host-command-output.contract.test.tsx
```

Expected current failure: multiple buttons named `Diagnostics`.

- [ ] **Step 2: Scope Diagnostics query to bottom drawer**

Use a stable bottom drawer region:

```tsx
const bottom = screen.getByRole('region', { name: 'Workbench bottom console' })
fireEvent.click(within(bottom).getByRole('button', { name: 'Diagnostics' }))
```

If `within(bottom)` cannot see the tab button because the region label wraps content only, query by `data-playground-tab="diagnostics"` inside the bottom drawer container.

- [ ] **Step 3: Add host command evidence assertions**

After Check and Trial:

```tsx
const consoleText = screen.getByRole('region', { name: 'Workbench bottom console' }).textContent ?? ''
expect(consoleText).not.toContain('dispatch accepted')
expect(consoleText).not.toContain('runner op')
expect(screen.getByLabelText('Diagnostics detail').textContent).toContain('check')
expect(screen.getByLabelText('Diagnostics detail').textContent).toContain('trial')
```

Adjust exact strings to current rendered report labels.

- [ ] **Step 4: Run test**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/host-command-output.contract.test.tsx
```

Expected: PASS.

### Task 8: Add reset evidence clearing contract

**Files:**
- Modify: `packages/logix-playground/test/interaction-evidence-matrix.contract.test.tsx`
- Modify: `packages/logix-playground/test/support/interactionEvidenceHarness.tsx`

- [ ] **Step 1: Write reset test**

```tsx
it('reset clears session action history and old dispatch logs', async () => {
  const harness = createInteractionEvidenceHarness({
    runner: makeReplayLogRunner(),
  })

  await harness.render()
  await harness.expectReadySession('logix-react.local-counter:r0:s1')
  await harness.runDriver('Increase')
  await harness.expectStateCount(1)

  await harness.resetSession()

  await waitFor(() => {
    expect(harness.consoleText()).toContain('session auto restarted from logix-react.local-counter:r0:s1')
  })
  expect(harness.consoleText()).not.toContain('dispatch increment')
})
```

- [ ] **Step 2: Implement `resetSession`**

```tsx
resetSession: async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
},
```

- [ ] **Step 3: Run test**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/interaction-evidence-matrix.contract.test.tsx
```

Expected: PASS.

## Chunk 5: Documentation Writeback And Verification

### Task 9: Write Interaction Evidence Matrix into 166 spec and UI contract

**Files:**
- Modify: `specs/166-playground-driver-scenario-surface/spec.md`
- Modify: `specs/166-playground-driver-scenario-surface/ui-contract.md`

- [ ] **Step 1: Update spec**

Add after `TD-007 - Scenario Playback Remains Product Playback`:

```md
### TD-007A - Interaction Evidence Matrix Is The Playground Test Contract

Every Playground trigger path must prove both UI trigger behavior and evidence behavior.

Required trigger families:

- reflected action
- advanced raw dispatch
- curated driver
- scenario driver step
- Run / Check / Trial / Reset host commands

For session dispatch triggers, acceptance must assert current `sessionId`, monotonic `opSeq`, Program state, Console evidence and current-operation runner log identity. Replay used for state reconstruction must not leak historical synthetic dispatch logs into the current operation evidence.
```

- [ ] **Step 2: Update UI contract selectors**

Add under `Component Selectors For Acceptance`:

```md
When visible labels are reused across regions, tests must scope queries by region or `data-playground-*` selector. Global text or role queries for reused tab names such as `Diagnostics` are forbidden in acceptance tests.
```

- [ ] **Step 3: Run doc grep**

Run:

```bash
rtk rg -n "Interaction Evidence Matrix|current-operation runner log|Global text" specs/166-playground-driver-scenario-surface/spec.md specs/166-playground-driver-scenario-surface/ui-contract.md
```

Expected: new sections are present.

### Task 10: Record verification and consume proposal

**Files:**
- Modify: `specs/166-playground-driver-scenario-surface/notes/verification.md`
- Modify: `docs/proposals/playground-interaction-evidence-test-contract.md`
- Modify: `docs/proposals/README.md`

- [ ] **Step 1: Append verification note**

Add:

```md
## 2026-04-29 Interaction Evidence Matrix

Commands run:

- `pnpm -C packages/logix-playground exec vitest run test/interaction-evidence-matrix.contract.test.tsx`
- `pnpm -C packages/logix-playground exec vitest run test/host-command-output.contract.test.tsx test/raw-dispatch-advanced.contract.test.tsx`
- `pnpm -C packages/logix-playground typecheck`
- `pnpm -C packages/logix-playground typecheck:test`
- `pnpm -C packages/logix-playground test`

Focused checks:

- Reflected action, raw dispatch, curated driver and scenario driver steps share session dispatch evidence invariants.
- Host commands write their own evidence lanes and do not create action dispatch logs.
- Replay synthetic dispatch logs are normalized to current operation evidence.
- Selector drift for `Diagnostics` and raw dispatch advanced control is closed.
```

Record exact pass/fail counts from the actual run.

- [ ] **Step 2: Consume proposal**

Change proposal frontmatter:

```yaml
status: consumed
```

Add:

```md
## Consumption

Consumed by:

- `specs/166-playground-driver-scenario-surface/spec.md`
- `specs/166-playground-driver-scenario-surface/ui-contract.md`
- `packages/logix-playground/test/interaction-evidence-matrix.contract.test.tsx`
- `packages/logix-playground/test/support/interactionEvidenceHarness.tsx`
```

- [ ] **Step 3: Update proposal README**

Move entry from current status to recent consumed if needed:

```md
- [Playground Interaction Evidence Test Contract](./playground-interaction-evidence-test-contract.md)
  - status: `consumed`
  - 去向已写回 166 spec / UI contract 与 playground interaction evidence matrix tests
```

### Task 11: Final verification

**Files:**
- No new file changes unless verification exposes failures.

- [ ] **Step 1: Run focused tests**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/interaction-evidence-matrix.contract.test.tsx test/program-session-runner.contract.test.ts src/internal/components/RuntimeInspector.test.tsx test/action-panel-dispatch.contract.test.tsx test/host-command-output.contract.test.tsx test/raw-dispatch-advanced.contract.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run type checks**

Run:

```bash
rtk pnpm -C packages/logix-playground typecheck
rtk pnpm -C packages/logix-playground typecheck:test
```

Expected: both pass.

- [ ] **Step 3: Run full package tests**

Run:

```bash
rtk pnpm -C packages/logix-playground test
```

Expected: PASS. If unrelated tests fail, classify them in verification notes with exact file names and failure reasons before stopping.

- [ ] **Step 4: Run text sweep**

Run:

```bash
rtk rg -n "Advanced Show|getByRole\\('button', \\{ name: 'Diagnostics' \\}\\)" packages/logix-playground/test
```

Expected: no hits.

- [ ] **Step 5: Run diff check**

Run:

```bash
rtk git diff --check
```

Expected: no whitespace errors.

## Execution Notes

- Use @superpowers:test-driven-development for every production or test behavior change.
- Use @superpowers:verification-before-completion before reporting completion.
- Do not run watch-mode tests.
- Do not commit unless the user explicitly asks.
- The current workspace may contain unrelated modified files. Do not revert them.

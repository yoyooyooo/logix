import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'
import { devtoolsRuntime, devtoolsModuleRuntime, type DevtoolsState } from '../../src/internal/state/index.js'

describe('@logix/devtools-react · DevtoolsModule state', () => {
  it('toggleOpen action flips the `open` flag in DevtoolsState', async () => {
    const getState = () =>
      devtoolsRuntime.runSync(devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>)

    const before = getState()
    expect(before.open).toBe(false)

    await devtoolsRuntime.runPromise(
      devtoolsModuleRuntime.dispatch({ _tag: 'toggleOpen', payload: undefined }) as Effect.Effect<
        unknown,
        unknown,
        any
      >,
    )

    const after = getState()
    expect(after.open).toBe(true)
  })

  it('setMode action updates DevtoolsSettings.mode and derived flags', async () => {
    const getState = () =>
      devtoolsRuntime.runSync(devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>)

    const before = getState()
    expect(before.settings).toBeDefined()

    await devtoolsRuntime.runPromise(
      devtoolsModuleRuntime.dispatch({ _tag: 'setMode', payload: 'basic' }) as Effect.Effect<unknown, unknown, any>,
    )

    const after = getState()
    expect(after.settings.mode).toBe('basic')
    expect(after.settings.showTraitEvents).toBe(false)
    expect(after.settings.showReactRenderEvents).toBe(false)

    await devtoolsRuntime.runPromise(
      devtoolsModuleRuntime.dispatch({ _tag: 'setMode', payload: 'deep' }) as Effect.Effect<unknown, unknown, any>,
    )

    const afterDeep = getState()
    expect(afterDeep.settings.mode).toBe('deep')
    expect(afterDeep.settings.showTraitEvents).toBe(true)
    expect(afterDeep.settings.showReactRenderEvents).toBe(true)
  })
})

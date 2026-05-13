import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'
import { devtoolsRuntime, devtoolsModuleRuntime, type DevtoolsState } from '../../src/internal/state/index.js'

describe('@logixjs/devtools-react · DevtoolsModule state', () => {
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

  it('updateSettings changes evidence display flags without legacy mode state', async () => {
    const getState = () =>
      devtoolsRuntime.runSync(devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>)

    const before = getState()
    expect(before.settings).toBeDefined()

    await devtoolsRuntime.runPromise(
      devtoolsModuleRuntime.dispatch({
        _tag: 'updateSettings',
        payload: { showFieldEvents: false, showReactRenderEvents: false },
      }) as Effect.Effect<unknown, unknown, any>,
    )

    const after = getState()
    expect(after.settings).not.toHaveProperty('mode')
    expect(after.settings.showFieldEvents).toBe(false)
    expect(after.settings.showReactRenderEvents).toBe(false)

    await devtoolsRuntime.runPromise(
      devtoolsModuleRuntime.dispatch({
        _tag: 'updateSettings',
        payload: { showFieldEvents: true, showReactRenderEvents: true },
      }) as Effect.Effect<unknown, unknown, any>,
    )

    const afterDeep = getState()
    expect(afterDeep.settings.showFieldEvents).toBe(true)
    expect(afterDeep.settings.showReactRenderEvents).toBe(true)
  })
})

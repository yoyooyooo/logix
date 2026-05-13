import { describe, expect, it } from 'vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Logic lifecycle authoring surface', () => {
  it('exposes root $.readyAfter as the only public readiness declaration route', () => {
    const Module = Logix.Module.make('LogicLifecycleAuthoringSurface.Readiness', {
      state: Schema.Struct({ ready: Schema.Boolean }),
      actions: {},
    })

    let apiSnapshot: unknown

    Module.logic('readiness', ($) => {
      apiSnapshot = $
      $.readyAfter(Effect.void, { id: 'boot' })
      return Effect.void
    })

    expect(typeof (apiSnapshot as { readyAfter?: unknown }).readyAfter).toBe('function')
    expect('lifecycle' in (apiSnapshot as Record<string, unknown>)).toBe(false)
  })

  it('rejects replacement lifecycle families from the public builder root', () => {
    const Module = Logix.Module.make('LogicLifecycleAuthoringSurface.ForbiddenFamilies', {
      state: Schema.Struct({ value: Schema.Number }),
      actions: {},
    })

    let apiSnapshot: unknown

    Module.logic('forbidden-families', ($) => {
      apiSnapshot = $
      return Effect.void
    })

    const api = apiSnapshot as Record<string, unknown>
    expect(api.lifecycle).toBeUndefined()
    expect(api.startup).toBeUndefined()
    expect(api.ready).toBeUndefined()
    expect(api.resources).toBeUndefined()
    expect(api.signals).toBeUndefined()
    expect(api.beforeReady).toBeUndefined()
    expect(api.afterReady).toBeUndefined()
  })
})

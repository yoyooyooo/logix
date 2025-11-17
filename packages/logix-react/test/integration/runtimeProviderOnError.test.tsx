// @vitest-environment happy-dom

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'

describe('RuntimeProvider.onError (integration)', () => {
  it('should report provider.layer.build failures via onError and keep the tree alive', async () => {
    const Root = Logix.Module.make('RootProviderOnErrorLayerFail.Integration', {
      state: Schema.Void,
      actions: {},
    })

    const runtime = Logix.Runtime.make(Root.implement({ initial: undefined }), {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    let calls = 0
    let lastContext: unknown = null

    const failingLayer = Layer.scopedDiscard(Effect.die(new Error('layer build failed'))) as unknown as Layer.Layer<
      any,
      any,
      never
    >

    render(
      <RuntimeProvider
        runtime={runtime}
        layer={failingLayer}
        fallback={<div data-testid="fallback" />}
        onError={(_cause, context) =>
          Effect.sync(() => {
            calls += 1
            lastContext = context
          })
        }
      >
        <div data-testid="child" />
      </RuntimeProvider>,
    )

    await waitFor(() => expect(calls).toBe(1))
    expect(lastContext).toEqual({
      source: 'provider',
      phase: 'provider.layer.build',
    })
    expect(document.querySelector("[data-testid='fallback']")).toBeTruthy()
    expect(document.querySelector("[data-testid='child']")).toBeFalsy()
  })
})

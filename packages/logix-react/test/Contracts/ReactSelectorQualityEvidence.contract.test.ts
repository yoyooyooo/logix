import { describe, expect, it } from 'vitest'
// @vitest-environment happy-dom
import { renderHook, waitFor } from '@testing-library/react'
import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as Logix from '@logixjs/core'
import { Effect, Layer, Schema } from 'effect'
import React from 'react'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { fieldValue, useModule, useSelector } from '../../src/index.js'

const HostEvidenceCounter = Logix.Module.make('ReactSelectorQualityEvidence.Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {},
})

describe('React selector-quality evidence', () => {
  it('emits host-harness selector-quality evidence through the debug trace payload', async () => {
    const events: CoreDebug.Event[] = []
    const sink: CoreDebug.Sink = {
      record: (event) =>
        Effect.sync(() => {
          events.push(event)
        }),
    }

    const runtime = Logix.Runtime.make(
      Logix.Program.make(HostEvidenceCounter, {
        initial: { count: 1 },
        logics: [],
      }),
      {
        layer: Layer.mergeAll(
          CoreDebug.replace([sink]) as any,
          CoreDebug.diagnosticsLevel('full') as any,
          CoreDebug.traceMode('on') as any,
        ) as any,
      },
    )

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(RuntimeProvider, { runtime, children })

    const useTest = () => {
      const counter = useModule(HostEvidenceCounter.tag)
      return useSelector(counter, fieldValue('count'))
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current).toBe(1)
      expect(events.some((event) => event.type === 'trace:react-selector')).toBe(true)
    })

    const trace = events.find((event) => event.type === 'trace:react-selector') as any
    expect(trace.data.selectorQuality).toMatchObject({
      stage: 'host-harness',
      producer: 'react.useSelector',
      precisionQuality: 'exact',
      routeKind: 'exact',
    })
    expect(trace.data.selectorQuality.selectorFingerprint).toMatch(/^sf_/)
    expect(trace.data.selectorQuality.readQuery).toBeUndefined()
    expect(trace.data.selectorQuality.select).toBeUndefined()
  })

  it('keeps selector-quality host evidence out of public exports', async () => {
    const root = await import('../../src/index.js')

    expect('SelectorQualityArtifact' in root).toBe(false)
    expect('toSelectorQualityArtifact' in root).toBe(false)
  })
})

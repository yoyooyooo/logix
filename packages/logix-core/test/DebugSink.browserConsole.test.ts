// @vitest-environment happy-dom

import { describe, expect, vi } from 'vitest'
import { it } from '@effect/vitest'
import { Effect } from 'effect'
import * as Debug from '../src/Debug.js'

describe('Debug.layer({ mode: dev }) browser console severity', () => {
  it.scoped('should map diagnostic severity to console method', () =>
    Effect.gen(function* () {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const groupSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {})
      const endSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {})

      try {
        const program = Effect.gen(function* () {
          yield* Debug.record({
            type: 'diagnostic',
            moduleId: 'DebugSinkBrowserTest',
            instanceId: 'instance-1',
            runtimeLabel: 'runtime-label',
            code: 'diagnostic::warning-test',
            severity: 'warning',
            message: 'warning',
          })

          yield* Debug.record({
            type: 'diagnostic',
            moduleId: 'DebugSinkBrowserTest',
            instanceId: 'instance-1',
            runtimeLabel: 'runtime-label',
            code: 'diagnostic::info-test',
            severity: 'info',
            message: 'info',
          })

          yield* Debug.record({
            type: 'diagnostic',
            moduleId: 'DebugSinkBrowserTest',
            instanceId: 'instance-1',
            runtimeLabel: 'runtime-label',
            code: 'diagnostic::error-test',
            severity: 'error',
            message: 'error',
          })
        }).pipe(Effect.provide(Debug.layer({ mode: 'dev' })))

        yield* program

        expect(groupSpy).toHaveBeenCalled()
        expect(endSpy).toHaveBeenCalled()
        expect(warnSpy).toHaveBeenCalled()
        expect(infoSpy).toHaveBeenCalled()
        expect(errorSpy).toHaveBeenCalled()
      } finally {
        warnSpy.mockRestore()
        infoSpy.mockRestore()
        errorSpy.mockRestore()
        groupSpy.mockRestore()
        endSpy.mockRestore()
      }
    }),
  )

  it.scoped('should not print trace events when devConsole=diagnostic', () =>
    Effect.gen(function* () {
      const groupSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {})
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const endSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {})

      try {
        const program = Debug.record({
          type: 'trace:test',
          moduleId: 'DebugSinkBrowserTest',
          instanceId: 'instance-1',
          data: { ok: true },
        } as any).pipe(Effect.provide(Debug.layer({ mode: 'dev', devConsole: 'diagnostic' })))

        yield* program

        expect(groupSpy).not.toHaveBeenCalled()
        expect(logSpy).not.toHaveBeenCalled()
        expect(endSpy).not.toHaveBeenCalled()
      } finally {
        groupSpy.mockRestore()
        logSpy.mockRestore()
        endSpy.mockRestore()
      }
    }),
  )
})

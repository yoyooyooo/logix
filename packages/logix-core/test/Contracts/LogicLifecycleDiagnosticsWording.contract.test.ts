import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'
import * as Debug from '../../src/internal/runtime/core/DebugSink.js'
import * as LifecycleDiagnostics from '../../src/internal/runtime/core/LifecycleDiagnostics.js'

describe('Logic lifecycle diagnostics wording', () => {
  it('does not recommend public lifecycle handlers for unhandled runtime errors', async () => {
    const eventTexts: string[] = []
    const sink: Debug.Sink = {
      record: (event: any) =>
        Effect.sync(() => {
          eventTexts.push(`${event.message ?? ''}\n${event.hint ?? ''}`)
        }),
    }

    await Effect.runPromise(
      Effect.provideService(
        LifecycleDiagnostics.emitMissingOnErrorDiagnosticIfNeeded(
          {
            hasOnErrorHandlers: Effect.succeed(false),
          } as any,
          'diagnostic-module',
        ),
        Debug.currentDebugSinks as any,
        [sink],
      ) as any,
    )

    const text = eventTexts.join('\n')
    expect(text).not.toBe('')
    expect(text).not.toContain('$.lifecycle')
    expect(text).not.toContain('lifecycle.onError')
  })
})

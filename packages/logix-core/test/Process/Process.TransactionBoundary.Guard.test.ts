import { describe, it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'
import * as ModuleRuntime from '../../src/internal/runtime/ModuleRuntime.js'
import * as ProcessRuntime from '../../src/internal/runtime/core/process/ProcessRuntime.js'

describe('process: transaction boundary guard', () => {
  it.scoped('should noop + emit diagnostic when platformEvent is delivered inside a transaction', () =>
    Effect.gen(function* () {
      const ring = Debug.makeRingBufferSink(32)

      const Mod = Logix.Module.make('ProcessTxnGuard', {
        state: Schema.Struct({ n: Schema.Number }),
        actions: { inc: Schema.Void },
      })

      const program = Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink])(
        Effect.provide(
          Effect.gen(function* () {
            const rt = yield* ModuleRuntime.make(
              { n: 0 },
              {
                moduleId: 'ProcessTxnGuard',
                tag: Mod.tag,
              },
            )

            yield* Logix.InternalContracts.runWithStateTransaction(rt as any, { kind: 'test', name: 'txn' }, () =>
              Logix.InternalContracts.deliverProcessPlatformEvent({ eventName: 'test' }),
            )
          }),
          ProcessRuntime.layer(),
        ),
      )

      yield* program

      const diagnostics = ring.getSnapshot().filter((e) => e.type === 'diagnostic') as any[]
      const hit = diagnostics.find((e) => e.code === 'process::invalid_usage')
      expect(hit).toBeTruthy()
      expect(hit.kind).toBe('process_platform_event_in_transaction')
    }),
  )
})

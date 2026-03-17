import { describe, expect, it, vi } from 'vitest'
import { Effect } from 'effect'
import * as InternalEffectOp from '../../../../src/internal/effect-op.js'
import { currentOpSeq } from '../../../../src/internal/runtime/core/DebugSink.record.js'
import * as EffectOpCore from '../../../../src/internal/runtime/core/EffectOpCore.js'
import { makeRunSession } from '../../../../src/internal/observability/runSession.js'
import { RunSessionTag } from '../../../../src/internal/observability/runSession.js'
import * as ModuleRuntimeOperation from '../../../../src/internal/runtime/core/ModuleRuntime.operation.js'
import * as StateTransaction from '../../../../src/internal/runtime/core/StateTransaction.js'

const makeTxnContext = () =>
  StateTransaction.makeContext({
    instrumentation: 'light',
    captureSnapshots: false,
    now: () => 0,
  })

describe('ModuleRuntime.operation fast snapshot', () => {
  it('preserves existing linkId and explicit opSeq on empty-default fast path', async () => {
    const runner = ModuleRuntimeOperation.makeRunOperation({
      optionsModuleId: 'M',
      instanceId: 'i-1',
      runtimeLabel: 'Runtime#1',
      txnContext: makeTxnContext(),
      defaultRuntimeServices: {
        middlewareStack: [],
        runSession: undefined,
      },
    })

    const result = await Effect.runPromise(
      Effect.provideService(
        runner(
          'state',
          'state:update',
          {
            meta: {
              opSeq: 7,
            } as any,
          },
          Effect.gen(function* () {
            const opSeq = yield* Effect.service(currentOpSeq).pipe(Effect.orDie)
            const linkId = yield* Effect.service(EffectOpCore.currentLinkId).pipe(Effect.orDie)
            return { opSeq, linkId }
          }),
        ),
        EffectOpCore.currentLinkId,
        'link-existing',
      ),
    )

    expect(result).toEqual({ opSeq: 7, linkId: 'link-existing' })
  })

  it('allocates monotonic currentOpSeq from pre-resolved runSession on empty-middleware fast path', async () => {
    const session = makeRunSession({
      runId: 'run-fast',
      startedAt: 1,
    })

    const makeRunner = (instanceId: string) =>
      ModuleRuntimeOperation.makeRunOperation({
        optionsModuleId: 'M',
        instanceId,
        runtimeLabel: 'Runtime#1',
        txnContext: makeTxnContext(),
        defaultRuntimeServices: {
          middlewareStack: [],
          runSession: session,
        },
      })

    const readCurrent = (runner: ModuleRuntimeOperation.RunOperation) =>
      Effect.runPromise(
        runner(
          'state',
          'state:update',
          {},
          Effect.gen(function* () {
            const opSeq = yield* Effect.service(currentOpSeq).pipe(Effect.orDie)
            const linkId = yield* Effect.service(EffectOpCore.currentLinkId).pipe(Effect.orDie)
            return { opSeq, linkId }
          }),
        ),
      )

    const runnerA = makeRunner('i-1')
    const runnerB = makeRunner('i-2')

    await expect(readCurrent(runnerA)).resolves.toEqual({ opSeq: 1, linkId: 'i-1::o1' })
    await expect(readCurrent(runnerA)).resolves.toEqual({ opSeq: 2, linkId: 'i-1::o2' })
    await expect(readCurrent(runnerB)).resolves.toEqual({ opSeq: 1, linkId: 'i-2::o1' })
  })

  it('preserves existing linkId on pre-resolved runSession fast path', async () => {
    const runner = ModuleRuntimeOperation.makeRunOperation({
      optionsModuleId: 'M',
      instanceId: 'i-1',
      runtimeLabel: 'Runtime#1',
      txnContext: makeTxnContext(),
      defaultRuntimeServices: {
        middlewareStack: [],
        runSession: makeRunSession({
          runId: 'run-link',
          startedAt: 1,
        }),
      },
    })

    const result = await Effect.runPromise(
      Effect.provideService(
        runner(
          'state',
          'state:update',
          {},
          Effect.gen(function* () {
            const opSeq = yield* Effect.service(currentOpSeq).pipe(Effect.orDie)
            const linkId = yield* Effect.service(EffectOpCore.currentLinkId).pipe(Effect.orDie)
            return { opSeq, linkId }
          }),
        ),
        EffectOpCore.currentLinkId,
        'link-existing',
      ),
    )

    expect(result).toEqual({ opSeq: 1, linkId: 'link-existing' })
  })

  it('keeps currentOpSeq undefined and reuses existing linkId without EffectOp.make on empty middleware path', async () => {
    const runner = ModuleRuntimeOperation.makeRunOperation({
      optionsModuleId: 'M',
      instanceId: 'i-1',
      runtimeLabel: 'Runtime#1',
      txnContext: makeTxnContext(),
      defaultRuntimeServices: {
        middlewareStack: [],
        runSession: undefined,
      },
    })

    const makeSpy = vi.spyOn(InternalEffectOp, 'make')

    try {
      const result = await Effect.runPromise(
        Effect.provideService(
          runner(
            'state',
            'state:update',
            {},
            Effect.gen(function* () {
              const opSeq = yield* Effect.service(currentOpSeq).pipe(Effect.orDie)
              const linkId = yield* Effect.service(EffectOpCore.currentLinkId).pipe(Effect.orDie)
              return { opSeq, linkId }
            }),
          ),
          EffectOpCore.currentLinkId,
          'link-existing',
        ),
      )

      expect(result).toEqual({ opSeq: undefined, linkId: 'link-existing' })
      expect(makeSpy).not.toHaveBeenCalled()
    } finally {
      makeSpy.mockRestore()
    }
  })

  it('allocates opSeq from resolved runSession and reuses existing linkId without EffectOp.make', async () => {
    const runner = ModuleRuntimeOperation.makeRunOperation({
      optionsModuleId: 'M',
      instanceId: 'i-1',
      runtimeLabel: 'Runtime#1',
      txnContext: makeTxnContext(),
    })

    const session = makeRunSession({
      runId: 'run-dynamic',
      startedAt: 1,
    })

    const makeSpy = vi.spyOn(InternalEffectOp, 'make')

    try {
      const readCurrent = () =>
        Effect.runPromise(
          Effect.provideService(
            Effect.provideService(
              Effect.provideService(
                runner(
                  'state',
                  'state:update',
                  {},
                  Effect.gen(function* () {
                    const opSeq = yield* Effect.service(currentOpSeq).pipe(Effect.orDie)
                    const linkId = yield* Effect.service(EffectOpCore.currentLinkId).pipe(Effect.orDie)
                    return { opSeq, linkId }
                  }),
                ),
                EffectOpCore.EffectOpMiddlewareTag,
                { stack: [] },
              ),
              RunSessionTag,
              session,
            ),
            EffectOpCore.currentLinkId,
            'link-existing',
          ),
        )

      await expect(readCurrent()).resolves.toEqual({ opSeq: 1, linkId: 'link-existing' })
      await expect(readCurrent()).resolves.toEqual({ opSeq: 2, linkId: 'link-existing' })
      expect(makeSpy).not.toHaveBeenCalled()
    } finally {
      makeSpy.mockRestore()
    }
  })

  it('reuses transaction-captured operation runtime services on empty middleware fast path', async () => {
    const session = makeRunSession({
      runId: 'run-txn-hot',
      startedAt: 1,
    })

    const txnContext = makeTxnContext()
    StateTransaction.beginTransaction(txnContext, { kind: 'test', name: 'txn-hot' }, { value: 0 } as any)
    ;(txnContext.current as any).operationRuntimeServices = {
      middlewareStack: [],
      runSession: session,
    }

    const runner = ModuleRuntimeOperation.makeRunOperation({
      optionsModuleId: 'M',
      instanceId: 'i-1',
      runtimeLabel: 'Runtime#1',
      txnContext,
    })

    const result = await Effect.runPromise(
      Effect.provideService(
        runner(
          'state',
          'state:update',
          {},
          Effect.gen(function* () {
            const opSeq = yield* Effect.service(currentOpSeq).pipe(Effect.orDie)
            const linkId = yield* Effect.service(EffectOpCore.currentLinkId).pipe(Effect.orDie)
            return { opSeq, linkId }
          }),
        ),
        EffectOpCore.currentLinkId,
        'link-existing',
      ),
    )

    expect(result).toEqual({ opSeq: 1, linkId: 'link-existing' })
  })

  it('clears transaction-captured hot operation context when reusing txnContext across beginTransaction', async () => {
    const session = makeRunSession({
      runId: 'run-txn-hot-reuse',
      startedAt: 1,
    })
    const txnContext = makeTxnContext()
    const runner = ModuleRuntimeOperation.makeRunOperation({
      optionsModuleId: 'M',
      instanceId: 'i-1',
      runtimeLabel: 'Runtime#1',
      txnContext,
    })

    const readCurrent = () =>
      Effect.runPromise(
        Effect.provideService(
          runner(
            'state',
            'state:update',
            {},
            Effect.gen(function* () {
              const opSeq = yield* Effect.service(currentOpSeq).pipe(Effect.orDie)
              const linkId = yield* Effect.service(EffectOpCore.currentLinkId).pipe(Effect.orDie)
              return { opSeq, linkId }
            }),
          ),
          EffectOpCore.currentLinkId,
          'link-existing',
        ),
      )

    StateTransaction.beginTransaction(txnContext, { kind: 'test', name: 'txn-hot-1' }, { value: 0 } as any)
    ;(txnContext.current as any).operationRuntimeServices = {
      middlewareStack: [],
      runSession: session,
    }
    ;(txnContext.current as any).operationRuntimeHotContext = ModuleRuntimeOperation.captureOperationRuntimeHotContext(
      (txnContext.current as any).operationRuntimeServices,
    )

    await expect(readCurrent()).resolves.toEqual({ opSeq: 1, linkId: 'link-existing' })

    StateTransaction.beginTransaction(txnContext, { kind: 'test', name: 'txn-hot-2' }, { value: 0 } as any)
    await expect(readCurrent()).resolves.toEqual({ opSeq: undefined, linkId: 'link-existing' })
  })

  it('reuses resolved operation runtime services when middleware/session bindings stay stable', async () => {
    const session = makeRunSession({
      runId: 'run-resolve-cache',
      startedAt: 1,
    })
    const middlewareEnv: EffectOpCore.EffectOpMiddlewareEnv = {
      stack: [],
    }

    const program = Effect.provideService(
      Effect.provideService(
        Effect.gen(function* () {
          const first = yield* ModuleRuntimeOperation.resolveOperationRuntimeServices()
          const second = yield* ModuleRuntimeOperation.resolveOperationRuntimeServices()
          const snapshot = yield* ModuleRuntimeOperation.captureOperationRuntimeSnapshot()
          const fromSnapshot = yield* ModuleRuntimeOperation.resolveOperationRuntimeServices(snapshot)
          return { first, second, fromSnapshot, snapshot }
        }),
        EffectOpCore.EffectOpMiddlewareTag,
        middlewareEnv,
      ),
      RunSessionTag,
      session,
    ) as Effect.Effect<
      {
        readonly first: ModuleRuntimeOperation.OperationRuntimeServices
        readonly second: ModuleRuntimeOperation.OperationRuntimeServices
        readonly fromSnapshot: ModuleRuntimeOperation.OperationRuntimeServices
        readonly snapshot: ModuleRuntimeOperation.OperationRuntimeSnapshot
      },
      never,
      never
    >

    const resolved = await Effect.runPromise(program)

    expect(resolved.snapshot.middlewareEnv).toBe(middlewareEnv)
    expect(resolved.snapshot.runSession).toBe(session)
    expect(resolved.first).toBe(resolved.second)
    expect(resolved.first).toBe(resolved.fromSnapshot)
    expect(resolved.first.middlewareStack).toBe(middlewareEnv.stack)
    expect(resolved.first.runSession).toBe(session)
  })
})

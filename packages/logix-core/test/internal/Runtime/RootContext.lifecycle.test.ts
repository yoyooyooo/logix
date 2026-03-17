import { describe, it, expect } from '@effect/vitest'
import { Cause, Deferred, Effect, Exit, Option, ServiceMap } from 'effect'
import {
  makeRootContext,
  mergeRootContext,
  readyRootContext,
  RootContextLifecycleError,
} from '../../../src/internal/runtime/core/RootContext.js'

describe('RootContext lifecycle', () => {
  it.effect('tracks uninitialized -> merged -> ready transition explicitly', () =>
    Effect.gen(function* () {
      const root = yield* makeRootContext({ appId: 'app.test', appModuleIds: ['A'] })
      const mergedEnv = ServiceMap.empty() as ServiceMap.ServiceMap<any>

      expect(root.lifecycle.state).toBe('uninitialized')

      yield* mergeRootContext(root, mergedEnv)
      expect(root.lifecycle.state).toBe('merged')

      yield* readyRootContext(root)
      expect(root.lifecycle.state).toBe('ready')

      const awaited = yield* Deferred.await(root.ready)
      expect(awaited).toBe(mergedEnv)
    }))

  it.effect('fails with structured lifecycle reason when ready/merge ordering is broken', () =>
    Effect.gen(function* () {
      const root = yield* makeRootContext()

      const readyBeforeMerge = yield* Effect.exit(readyRootContext(root))
      expect(Exit.isFailure(readyBeforeMerge)).toBe(true)
      if (Exit.isFailure(readyBeforeMerge)) {
        const error = Option.getOrUndefined(Cause.findErrorOption(readyBeforeMerge.cause)) as RootContextLifecycleError | undefined
        expect(error?.reasonCode).toBe('root_context::ready_without_merge')
      }
      expect(root.lifecycle.state).toBe('failed')

      const duplicateMerge = yield* Effect.exit(mergeRootContext(root, ServiceMap.empty() as ServiceMap.ServiceMap<any>))
      expect(Exit.isFailure(duplicateMerge)).toBe(true)
      if (Exit.isFailure(duplicateMerge)) {
        const error = Option.getOrUndefined(Cause.findErrorOption(duplicateMerge.cause)) as RootContextLifecycleError | undefined
        expect(error?.reasonCode).toBe('root_context::merge_duplicate')
      }
    }))

  it.effect('forbids ready transition after lifecycle already failed', () =>
    Effect.gen(function* () {
      const root = yield* makeRootContext()
      const mergedEnv = ServiceMap.empty() as ServiceMap.ServiceMap<any>

      yield* mergeRootContext(root, mergedEnv)
      expect(root.lifecycle.state).toBe('merged')

      const duplicateMerge = yield* Effect.exit(mergeRootContext(root, mergedEnv))
      expect(Exit.isFailure(duplicateMerge)).toBe(true)
      expect(root.lifecycle.state).toBe('failed')

      const readyAfterFailed = yield* Effect.exit(readyRootContext(root))
      expect(Exit.isFailure(readyAfterFailed)).toBe(true)
      if (Exit.isFailure(readyAfterFailed)) {
        const error = Option.getOrUndefined(Cause.findErrorOption(readyAfterFailed.cause)) as RootContextLifecycleError | undefined
        expect(error?.reasonCode).toBe('root_context::ready_after_failed')
      }
      expect(root.lifecycle.state).toBe('failed')
    }))
})

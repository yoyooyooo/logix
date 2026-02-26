import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Context, Deferred, Effect, Either } from 'effect'
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
      const mergedEnv = Context.empty() as Context.Context<any>

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

      const readyBeforeMerge = yield* Effect.either(readyRootContext(root))
      expect(Either.isLeft(readyBeforeMerge)).toBe(true)
      if (Either.isLeft(readyBeforeMerge)) {
        const error = readyBeforeMerge.left as RootContextLifecycleError
        expect(error.reasonCode).toBe('root_context::ready_without_merge')
      }
      expect(root.lifecycle.state).toBe('failed')

      const duplicateMerge = yield* Effect.either(mergeRootContext(root, Context.empty() as Context.Context<any>))
      expect(Either.isLeft(duplicateMerge)).toBe(true)
      if (Either.isLeft(duplicateMerge)) {
        const error = duplicateMerge.left as RootContextLifecycleError
        expect(error.reasonCode).toBe('root_context::merge_duplicate')
      }
    }))

  it.effect('forbids ready transition after lifecycle already failed', () =>
    Effect.gen(function* () {
      const root = yield* makeRootContext()
      const mergedEnv = Context.empty() as Context.Context<any>

      yield* mergeRootContext(root, mergedEnv)
      expect(root.lifecycle.state).toBe('merged')

      const duplicateMerge = yield* Effect.either(mergeRootContext(root, mergedEnv))
      expect(Either.isLeft(duplicateMerge)).toBe(true)
      expect(root.lifecycle.state).toBe('failed')

      const readyAfterFailed = yield* Effect.either(readyRootContext(root))
      expect(Either.isLeft(readyAfterFailed)).toBe(true)
      if (Either.isLeft(readyAfterFailed)) {
        const error = readyAfterFailed.left as RootContextLifecycleError
        expect(error.reasonCode).toBe('root_context::ready_after_failed')
      }
      expect(root.lifecycle.state).toBe('failed')
    }))
})

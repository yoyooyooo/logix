import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../src/index.js'
import * as Resource from '../src/Resource.js'
import { internal as ResourceInternal } from '../src/Resource.js'

describe('Resource namespace', () => {
  it('should register specs via Resource.layer and expose them through the registry', async () => {
    const UserProfileKey = Schema.Struct({
      userId: Schema.String,
    })

    const spec = Resource.make({
      id: 'user/profile',
      keySchema: UserProfileKey,
      load: ({ userId }: { userId: string }) => Effect.succeed({ name: `user:${userId}` }),
    })

    const program = Effect.gen(function* () {
      const registry = yield* ResourceInternal.ResourceRegistryTag
      const entry = registry.specs.get('user/profile')

      expect(entry).toBe(spec)
    }).pipe(Effect.provide(Resource.layer([spec]) as Layer.Layer<any, never, never>)) as Effect.Effect<
      void,
      never,
      never
    >

    await Effect.runPromise(Effect.scoped(program))
  })

  it('should detect duplicate ids in dev environment', async () => {
    const Key = Schema.String

    const specA = Resource.make({
      id: 'dup/resource',
      keySchema: Key,
      load: (key: string) => Effect.succeed(key),
    })

    const specB = Resource.make({
      id: 'dup/resource',
      keySchema: Key,
      load: (key: string) => Effect.succeed(key.toUpperCase()),
    })

    expect(() => Resource.layer([specA, specB])).toThrow(/Duplicate resource id "dup\/resource"/)
  })

  it('canonicalizes accepted source keys deterministically', () => {
    expect(Resource.keyHash({ b: 2, a: -0 })).toBe(Resource.keyHash({ a: 0, b: 2 }))
    expect(Resource.keyHash(['x', null, true, { z: 1 }])).toBe('["x",null,true,{"z":1}]')
  })

  it('rejects non-canonical source key domains', () => {
    const sparse: Array<unknown> = []
    sparse[1] = 'x'

    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic

    const shared = { id: 'same' }

    class Box {
      readonly id = 'box'
    }

    const symbolKey = { ok: true } as Record<PropertyKey, unknown>
    symbolKey[Symbol('hidden')] = true

    const rejected: ReadonlyArray<unknown> = [
      NaN,
      Infinity,
      -Infinity,
      { nested: undefined },
      1n,
      Symbol('k'),
      () => undefined,
      new Date(0),
      new Map([['a', 1]]),
      new Set([1]),
      /x/,
      Promise.resolve(1),
      new Uint8Array([1]),
      new Box(),
      cyclic,
      [shared, shared],
      sparse,
      symbolKey,
    ]

    for (const key of rejected) {
      expect(() => Resource.keyHash(key)).toThrow(/rejected non-canonical source key/)
    }
  })
})

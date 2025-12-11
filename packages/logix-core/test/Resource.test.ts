import { describe, it, expect } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"
import * as Logix from "../src/index.js"
import { internal as ResourceInternal } from "../src/Resource.js"

describe("Resource namespace", () => {
  it("should register specs via Resource.layer and expose them through the registry", async () => {
    const UserProfileKey = Schema.Struct({
      userId: Schema.String,
    })

    const spec = Logix.Resource.make({
      id: "user/profile",
      keySchema: UserProfileKey,
      load: ({ userId }: { userId: string }) =>
        Effect.succeed({ name: `user:${userId}` }),
    })

    const program = Effect.gen(function* () {
      const registry = yield* ResourceInternal.ResourceRegistryTag
      const entry = registry.specs.get("user/profile")

      expect(entry).toBe(spec)
    }).pipe(
      Effect.provide(
        Logix.Resource.layer([spec]) as Layer.Layer<any, never, never>,
      ),
    ) as Effect.Effect<void, never, never>

    await Effect.runPromise(Effect.scoped(program))
  })

  it("should detect duplicate ids in dev environment", async () => {
    const Key = Schema.String

    const specA = Logix.Resource.make({
      id: "dup/resource",
      keySchema: Key,
      load: (key: string) => Effect.succeed(key),
    })

    const specB = Logix.Resource.make({
      id: "dup/resource",
      keySchema: Key,
      load: (key: string) => Effect.succeed(key.toUpperCase()),
    })

    expect(() => Logix.Resource.layer([specA, specB])).toThrow(
      /Duplicate resource id "dup\/resource"/,
    )
  })
})

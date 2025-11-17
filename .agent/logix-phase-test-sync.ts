import { Context, Effect, Layer, Schema } from 'effect'
import * as Logix from '@logix/core'

class Svc extends Context.Tag('Svc')<Svc, {}>() {}

const M = Logix.Module.make('TestMod', {
  state: Schema.Struct({ n: Schema.Number }),
  actions: { noop: Schema.Void },
})

let ran = false

const L = M.logic<Svc>(($) => ({
  setup: Effect.void,
  run: Effect.gen(function* () {
    yield* $.use(Svc)
    ran = true
  }),
}))

const layer = M.live({ n: 0 }, L).pipe(Layer.provide(Layer.succeed(Svc, {})))

const program = Effect.scoped(
  Effect.gen(function* () {
    yield* M.tag
  }).pipe(Effect.provide(layer)),
)

try {
  Effect.runSync(program)
} catch (err) {
  console.error(err)
  process.exit(1)
}

setTimeout(() => {
  console.log('ran', ran)
  process.exit(ran ? 0 : 2)
}, 20)

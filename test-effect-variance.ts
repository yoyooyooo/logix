import { Effect } from 'effect'

type Foo = { foo: string }
type Bar = { bar: string }

const eFoo: Effect.Effect<number, never, Foo> = Effect.succeed(1)
const _a: Effect.Effect<number, never, Foo & Bar> = eFoo

const eNever: Effect.Effect<number, never, never> = Effect.succeed(1)
const _b: Effect.Effect<number, never, Foo> = eNever

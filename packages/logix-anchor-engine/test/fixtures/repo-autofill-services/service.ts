import { Context, Effect } from 'effect'

export class SvcA extends Context.Tag('svc/a')<
  SvcA,
  {
    readonly ping: () => Effect.Effect<void, never, any>
  }
>() {}

export class SvcB extends Context.Tag('svc/b')<
  SvcB,
  {
    readonly pong: () => Effect.Effect<void, never, any>
  }
>() {}


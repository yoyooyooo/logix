import { Context, Effect } from 'effect'

export class SvcDyn extends Context.Tag('svc/Dyn')<
  SvcDyn,
  {
    readonly ping: () => Effect.Effect<void, never, any>
  }
>() {}


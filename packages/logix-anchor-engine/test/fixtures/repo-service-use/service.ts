import { Context, Effect } from 'effect'

export class UserApi extends Context.Tag('svc/UserApi')<
  UserApi,
  {
    readonly ping: () => Effect.Effect<void, never, any>
  }
>() {}


import { Effect, Schema, ServiceMap } from 'effect'
import * as Logix from '@logixjs/core'

class BusinessService extends ServiceMap.Service<
  BusinessService,
  { readonly ping: Effect.Effect<void> }
>()('BusinessService') {}

const MissingServiceModule = Logix.Module.make('CliMissingServiceProgram', {
  state: Schema.Struct({ ok: Schema.Boolean }),
  actions: { noop: Schema.Void },
})

export const MissingServiceProgram = Logix.Program.make(MissingServiceModule, {
  initial: { ok: true },
  logics: [
    MissingServiceModule.logic<BusinessService>('missing-service', ($) => {
      $.readyAfter(Effect.asVoid(Effect.service(BusinessService).pipe(Effect.orDie)), { id: 'business-service' })
      return Effect.void
    }),
  ],
})

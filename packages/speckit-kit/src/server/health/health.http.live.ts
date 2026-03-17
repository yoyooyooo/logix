import { HttpApiBuilder } from 'effect/unstable/httpapi'
import { Effect } from 'effect'

import { EffectApi } from '../app/effect-api.js'

export const HealthLive = HttpApiBuilder.group(EffectApi, 'Health', Effect.fn(function* (handlers) {
  return handlers.handle('health', () => Effect.succeed({ ok: true }))
}))

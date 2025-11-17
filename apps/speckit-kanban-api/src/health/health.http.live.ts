import { HttpApiBuilder } from '@effect/platform'
import { Effect } from 'effect'

import { EffectApi } from '../app/effect-api.js'

export const HealthLive = HttpApiBuilder.group(EffectApi, 'Health', (handlers) =>
  handlers.handle('health', () => Effect.succeed({ ok: true })),
)

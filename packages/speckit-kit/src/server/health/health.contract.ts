import { HttpApiEndpoint, HttpApiGroup } from 'effect/unstable/httpapi'
import { Schema } from 'effect'

export const HealthResponse = Schema.Struct({
  ok: Schema.Boolean,
})

export const HealthGroup = HttpApiGroup.make('Health')
  .add(HttpApiEndpoint.get('health', '/health', { success: HealthResponse }))
